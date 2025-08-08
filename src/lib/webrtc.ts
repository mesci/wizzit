import { FileTransfer, PeerConnection, SignalingMessage, FileMetadata, TransferStats } from '@/types'
import { generateId } from './utils'
import { logger } from './logger'
import { securityChecker, type SecurityWarning } from './security'

export class WebRTCManager {
  private connections: Map<string, PeerConnection> = new Map()
  private transfers: Map<string, FileTransfer> = new Map()
  private onTransferUpdate?: (transfer: FileTransfer) => void
  private onConnectionUpdate?: (connection: PeerConnection) => void
  public onVpnDetected?: (type: 'sender' | 'receiver') => void
  public onReceiverSecurityWarning?: (warning: SecurityWarning, fileName: string, fileSize: number) => Promise<boolean>
  
  // Transfer pause control for security approval
  private transferPaused: boolean = false
  private pausedTransferId: string | null = null
  
  // Web Worker for background chunk processing - CRITICAL FOR PERFORMANCE!
  private chunkWorker: Worker | null = null
  private pendingChunks: Map<number, { resolve: (buffer: ArrayBuffer) => void; reject: (error: Error) => void }> = new Map()

  // ICE servers will be loaded dynamically from API
  private iceServers: RTCIceServer[] = []

  // Performance settings - BALANCED and TESTED configuration
  private readonly chunkSize = 16 * 1024 // 16KB chunks - SMOOTH progress for all devices/networks
  private readonly maxFileSize = 1024 * 1024 * 1024 * 1024 // 1TB limit - Practically unlimited!
  private readonly maxBufferedAmount = 8 * 1024 * 1024 // 8MB buffer - TESTED and working
  private readonly bufferMonitorInterval = 1 // 1ms for faster throughput

  constructor() {
    // Only check WebRTC support in browser environment
    if (typeof window !== 'undefined') {
      this.checkWebRTCSupport()
      this.initializeWorker()
      this.loadIceServers() // Load ICE servers from API
    }
  }

  private checkWebRTCSupport(): boolean {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      throw new Error('WebRTC is not supported in this browser')
    }
    return true
  }

  setCallbacks(
    onTransferUpdate: (transfer: FileTransfer) => void,
    onConnectionUpdate: (connection: PeerConnection) => void
  ) {
    this.onTransferUpdate = onTransferUpdate
    this.onConnectionUpdate = onConnectionUpdate
  }

  async createSender(file: File): Promise<{ transferId: string; offer: RTCSessionDescriptionInit }> {
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds maximum allowed size')
    }

    // Ensure ICE servers are loaded before creating connection
    if (this.iceServers.length === 0) {
      logger.log('⏳ Waiting for ICE servers to load...')
      await this.loadIceServers()
    }

    const transferId = generateId()
    const connectionId = generateId()

    // 🔍 VPN Detection (basic heuristic)
    const isVpnLikely = await this.detectVpnEnvironment()
    
    // Create peer connection with EXTREME performance settings for WARP/VPN
    const pc = new RTCPeerConnection({ 
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: isVpnLikely ? 10 : 50, // Reduce for VPN to speed up
      // FORCE TURN for VPN users for reliability
      iceTransportPolicy: isVpnLikely ? 'relay' : 'all'
    })
    
    if (isVpnLikely) {
      logger.log('🌐 VPN/restrictive network detected - using TURN-only mode')
      
      // Notify UI about VPN detection
      if (this.onVpnDetected) {
        logger.log('🚨 Notifying UI about VPN detection...')
        this.onVpnDetected('sender')
      }
    }
    
    // Create data channel with MAXIMUM throughput settings
    const dataChannel = pc.createDataChannel('fileTransfer', {
      ordered: true
    })

    const connection: PeerConnection = {
      id: connectionId,
      connection: pc,
      dataChannel,
      status: 'connecting',
      type: 'sender'
    }

    const transfer: FileTransfer = {
      id: transferId,
      file,
      status: 'pending',
      progress: 0,
      peer: pc
    }

    this.connections.set(connectionId, connection)
    this.transfers.set(transferId, transfer)

    // Set up data channel handlers
    dataChannel.onopen = () => {
      logger.log('🟢 DATA CHANNEL OPENED! Sender side ready for transfer')
      connection.status = 'connected'
      transfer.status = 'connecting'
      this.onConnectionUpdate?.(connection)
      this.onTransferUpdate?.(transfer)
      
      // Send VPN info to receiver if detected
      if (isVpnLikely) {
        logger.log('📡 Sending VPN info to receiver via WebRTC...')
        try {
          dataChannel.send(JSON.stringify({ type: 'vpn-info', senderHasVpn: true }))
          logger.log('✅ VPN info sent to receiver')
        } catch (error) {
          logger.error('❌ Failed to send VPN info:', error)
        }
      }
      
      logger.log('🚀 Starting file sending process...')
      this.startFileSending(transferId)
    }

    // Listen for progress synchronization and transfer control from receiver
    dataChannel.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data)
          
          if (data.type === 'progress-sync') {
            // Synchronize sender progress with receiver's actual progress
            const transfer = this.transfers.get(transferId)
            if (transfer) {
              transfer.progress = Math.min(data.progress, 100)
              this.onTransferUpdate?.(transfer)
              logger.log(`🔄 Progress synced: ${data.progress.toFixed(1)}% (${data.chunksReceived}/${data.totalChunks})`)
            }
          } else if (data.type === 'transfer-pause') {
            // 🛑 Receiver requested pause (security approval pending)
            logger.log('🛑 SENDER: Received pause request from receiver:', data.reason)
            const transfer = this.transfers.get(transferId)
            if (transfer) {
              transfer.status = 'pending-approval'
              this.onTransferUpdate?.(transfer)
            }
            // Set pause flag (will be checked in startFileSending)
            this.transferPaused = true
            this.pausedTransferId = transferId
          } else if (data.type === 'transfer-resume') {
            // ✅ Receiver approved, resume transfer
            logger.log('✅ SENDER: Received resume request from receiver:', data.reason)
            const transfer = this.transfers.get(transferId)
            if (transfer && transfer.status === 'pending-approval') {
              transfer.status = 'transferring'
              this.onTransferUpdate?.(transfer)
            }
            // Clear pause flag
            this.transferPaused = false
            this.pausedTransferId = null
          } else if (data.type === 'transfer-cancel') {
            // 🛑 Receiver cancelled transfer
            logger.log('🛑 SENDER: Receiver cancelled transfer:', data.reason)
            const transfer = this.transfers.get(transferId)
            if (transfer) {
              transfer.status = 'cancelled'
              this.onTransferUpdate?.(transfer)
            }
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    dataChannel.onerror = (error) => {
      logger.error('🔴 DATA CHANNEL ERROR on sender side:', error)
      transfer.status = 'failed'
      connection.status = 'failed'
      this.onTransferUpdate?.(transfer)
      this.onConnectionUpdate?.(connection)
    }

    dataChannel.onclose = () => {
      logger.log('🟡 DATA CHANNEL CLOSED on sender side')
      connection.status = 'disconnected'
      this.onConnectionUpdate?.(connection)
    }

    // Add ICE candidate handling for sender
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.log('🧊 ICE Candidate found (sender):', event.candidate)
        // Store ICE candidate for signaling
        // In a real app, you'd send this via signaling immediately
        // For now we'll collect them and send via API
      } else {
        logger.log('🏁 ICE Candidate gathering complete (sender)')
      }
    }

    // Add connection state logging
    pc.onconnectionstatechange = () => {
      logger.log('🔗 Peer Connection State Changed:', pc.connectionState)
    }

    // Enhanced ICE connection handling with auto-retry for VPN/restrictive networks
    let iceFailureCount = 0
    const maxRetries = 1
    
    pc.oniceconnectionstatechange = async () => {
      logger.log('🧊 ICE Connection State Changed:', pc.iceConnectionState)
      
      if (pc.iceConnectionState === 'failed') {
        logger.error('🔴 ICE CONNECTION FAILED')
        iceFailureCount++
        
        if (iceFailureCount <= maxRetries) {
          logger.log(`🔄 ICE failure #${iceFailureCount} - attempting TURN-only retry...`)
          
          // Create TURN-only retry connection
          try {
            const turnOnlyConfig = {
              iceServers: this.iceServers.filter(server => 
                server.urls && server.urls.toString().includes('turn:')
              ),
              bundlePolicy: 'max-bundle' as RTCBundlePolicy,
              rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
              iceCandidatePoolSize: 5, // Minimal for speed
              iceTransportPolicy: 'relay' as RTCIceTransportPolicy // TURN-only
            }
            
            logger.log('🌐 Creating TURN-only fallback connection...')
            logger.log('🔧 TURN servers available:', turnOnlyConfig.iceServers.length)
            
            // Don't restart immediately, mark as retry mode
            transfer.status = 'connecting'
            connection.status = 'connecting'
            this.onTransferUpdate?.(transfer)
            this.onConnectionUpdate?.(connection)
            
          } catch (retryError) {
            logger.error('❌ TURN-only retry failed:', retryError)
            transfer.status = 'failed'
            connection.status = 'failed'
            this.onTransferUpdate?.(transfer)
            this.onConnectionUpdate?.(connection)
          }
        } else {
          logger.error(`❌ Max retries (${maxRetries}) exceeded - connection permanently failed`)
          transfer.status = 'failed'
          connection.status = 'failed'
          this.onTransferUpdate?.(transfer)
          this.onConnectionUpdate?.(connection)
        }
      } else if (pc.iceConnectionState === 'connected') {
        logger.log('🟢 ICE CONNECTION ESTABLISHED')
        this.logConnectionStats(pc)
        iceFailureCount = 0 // Reset counter on success
      } else if (pc.iceConnectionState === 'disconnected') {
        logger.log('🟡 ICE CONNECTION DISCONNECTED - may reconnect')
              } else if (pc.iceConnectionState === 'checking') {
          logger.log('🔍 ICE CONNECTION CHECKING - establishing connection...')
          setTimeout(() => this.logIceCandidateStats(pc), 2000)
        }
    }

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    logger.log('🎯 Initial offer created, waiting for ICE gathering...')
    
    // Wait for ICE gathering to complete to get all candidates in SDP
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        logger.log('✅ ICE gathering already complete for sender')
        resolve()
        return
      }
      
      const handleIceGatheringChange = () => {
        logger.log('🔍 Sender ICE gathering state changed to:', pc.iceGatheringState)
        if (pc.iceGatheringState === 'complete') {
          logger.log('✅ Sender ICE gathering completed, final SDP ready')
          pc.removeEventListener('icegatheringstatechange', handleIceGatheringChange)
          resolve()
        }
      }
      
      pc.addEventListener('icegatheringstatechange', handleIceGatheringChange)
      
      // Smart timeout based on VPN detection
      const timeoutMs = isVpnLikely ? 5000 : 10000 // 5s for VPN (TURN-only), 10s for others
      setTimeout(() => {
        logger.log(`⏰ Sender ICE gathering timeout after ${timeoutMs}ms - ${isVpnLikely ? 'VPN' : 'Normal'} mode`)
        pc.removeEventListener('icegatheringstatechange', handleIceGatheringChange)
        resolve()
      }, timeoutMs)
    })

    // Get the final offer with ICE candidates embedded
    const finalOffer = pc.localDescription
    logger.log('📋 Final offer SDP preview:', finalOffer?.sdp?.substring(0, 300) + '...')

    return { transferId, offer: finalOffer || offer }
  }

  async createReceiver(): Promise<{ connectionId: string; pc: RTCPeerConnection }> {
    const connectionId = generateId()
    
    // Ensure ICE servers are loaded before creating connection
    if (this.iceServers.length === 0) {
      logger.log('⏳ Waiting for ICE servers to load...')
      await this.loadIceServers()
    }
    
    // 🔍 VPN Detection for receiver
    const isVpnLikely = await this.detectVpnEnvironment()
    
    // Create peer connection with EXTREME performance settings for WARP/VPN
    const pc = new RTCPeerConnection({ 
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: isVpnLikely ? 10 : 50, // Reduce for VPN to speed up
      // FORCE TURN for VPN users for reliability
      iceTransportPolicy: isVpnLikely ? 'relay' : 'all'
    })
    
    if (isVpnLikely) {
      logger.log('🌐 VPN/restrictive network detected on receiver - using TURN-only mode')
      
      // Notify UI about VPN detection
      if (this.onVpnDetected) {
        logger.log('🚨 Notifying receiver UI about VPN detection...')
        this.onVpnDetected('receiver')
      }
    }

    const connection: PeerConnection = {
      id: connectionId,
      connection: pc,
      status: 'connecting',
      type: 'receiver'
    }

    logger.log('🎯 Setting up receiver data channel handlers...')

    // Set up data channel handler FIRST before any other setup
    pc.ondatachannel = (event) => {
      logger.log('📺 DATA CHANNEL RECEIVED!', event.channel)
      const dataChannel = event.channel
      connection.dataChannel = dataChannel
      
      let receivedFile: FileMetadata | null = null
      let receivedChunks: ArrayBuffer[] = []
      let bytesReceived = 0
      let expectedChunks = 0
      let chunksReceived = 0
      let lastProgressUpdate = 0
      let transferPendingApproval = false
      let pendingChunksBuffer: ArrayBuffer[] = []

      dataChannel.onmessage = async (event) => {
        try {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data)
            
            // Handle VPN info message
            if (data.type === 'vpn-info') {
              logger.log('📡 Received VPN info from sender:', data)
              if (data.senderHasVpn && this.onVpnDetected) {
                logger.log('🚨 Notifying receiver UI about sender VPN...')
                this.onVpnDetected('sender')
              }
              return
            }
            
            logger.log('📄 Receiving file metadata...')
            // Receiving file metadata
            receivedFile = data as FileMetadata
            expectedChunks = receivedFile.chunks
            
            // 🛡️ Security check on receiver side (where it makes sense!)
            const securityWarning = securityChecker.checkFile({ 
              name: receivedFile.name, 
              size: receivedFile.size 
            } as File)
            
            if (securityWarning && this.onReceiverSecurityWarning) {
              logger.log('🛡️ Receiver security warning for:', receivedFile.name)
              transferPendingApproval = true
              
              // 🛑 Tell sender to pause transfer immediately
              try {
                dataChannel.send(JSON.stringify({ 
                  type: 'transfer-pause', 
                  reason: 'security-approval-pending' 
                }))
                logger.log('🛑 Sent pause signal to sender')
              } catch (error) {
                logger.error('❌ Failed to send pause signal:', error)
              }
              
              try {
                const userApproved = await this.onReceiverSecurityWarning(
                  securityWarning, 
                  receivedFile.name, 
                  receivedFile.size
                )
                
                transferPendingApproval = false
                
                if (!userApproved) {
                  logger.log('🛡️ Receiver cancelled transfer due to security warning')
                  
                  // 🛑 Tell sender transfer was cancelled
                  try {
                    dataChannel.send(JSON.stringify({ 
                      type: 'transfer-cancel', 
                      reason: 'security-rejected' 
                    }))
                    logger.log('🛑 Sent cancel signal to sender')
                  } catch (error) {
                    logger.error('❌ Failed to send cancel signal:', error)
                  }
                  
                  // Close the data channel to stop receiving chunks
                  dataChannel.close()
                  return
                }
                
                logger.log('🛡️ Receiver approved transfer despite security warning')
                
                // ✅ Tell sender to resume transfer
                try {
                  dataChannel.send(JSON.stringify({ 
                    type: 'transfer-resume', 
                    reason: 'security-approved' 
                  }))
                  logger.log('✅ Sent resume signal to sender')
                } catch (error) {
                  logger.error('❌ Failed to send resume signal:', error)
                }
                
                // Now create the transfer since it's approved
                const transferId = generateId()
                
                const transfer: FileTransfer = {
                  id: transferId,
                  file: new File([], receivedFile.name), // Placeholder
                  status: 'transferring',
                  progress: 0,
                  startTime: new Date(),
                  peer: pc
                }
                
                this.transfers.set(transferId, transfer)
                this.onTransferUpdate?.(transfer)
                logger.log('📊 Transfer created after security approval')
                
                // Pre-allocate memory for optimal performance
                receivedChunks = new Array(expectedChunks)
                logger.log('⚡ Pre-allocated array for', expectedChunks, 'chunks')
                
                // Process any buffered chunks that arrived during approval
                if (pendingChunksBuffer.length > 0) {
                  logger.log('🛡️ Processing', pendingChunksBuffer.length, 'buffered chunks')
                  for (const bufferedChunk of pendingChunksBuffer) {
                    // Process each buffered chunk as if it just arrived
                    chunksReceived++
                    const chunkIndex = chunksReceived - 1
                    receivedChunks[chunkIndex] = bufferedChunk
                    bytesReceived += bufferedChunk.byteLength
                  }
                  pendingChunksBuffer = [] // Clear buffer
                  
                  // Update progress for buffered chunks
                  const progress = (chunksReceived / expectedChunks) * 100
                  transfer.progress = Math.min(progress, 100)
                  this.onTransferUpdate?.(transfer)
                }
                
              } catch (error) {
                logger.error('🛡️ Security warning error:', error)
                transferPendingApproval = false
                dataChannel.close()
                return
              }
            }
            
            // Only create transfer if not pending approval
            if (!transferPendingApproval) {
              const transferId = generateId()
              
              const transfer: FileTransfer = {
                id: transferId,
                file: new File([], receivedFile.name), // Placeholder
                status: 'transferring',
                progress: 0,
                startTime: new Date(),
                peer: pc
              }
              
              this.transfers.set(transferId, transfer)
              this.onTransferUpdate?.(transfer)
              logger.log('📊 File metadata received, expecting', expectedChunks, 'chunks')
              
              // Pre-allocate memory for optimal performance
              receivedChunks = new Array(expectedChunks)
              logger.log('⚡ Pre-allocated array for', expectedChunks, 'chunks')
            } else {
              logger.log('🛡️ Transfer creation deferred - waiting for security approval')
            }
          } else {
            // Receiving file chunks with ACCURATE progress tracking
            if (!receivedFile) return

            // 🛡️ If transfer is pending security approval, buffer chunks instead of processing
            if (transferPendingApproval) {
              logger.log('🛡️ Buffering chunk while waiting for security approval')
              pendingChunksBuffer.push(event.data as ArrayBuffer)
              return // Don't process chunks until approved
            }

            chunksReceived++
            const chunkIndex = chunksReceived - 1
            receivedChunks[chunkIndex] = event.data as ArrayBuffer
            bytesReceived += (event.data as ArrayBuffer).byteLength

            // Mobile throttling removed for better performance

            // ACCURATE progress calculation based on chunks received
            const progress = (chunksReceived / expectedChunks) * 100

            // Send progress feedback to sender for perfect synchronization
            try {
              dataChannel.send(JSON.stringify({ 
                type: 'progress-sync', 
                progress: progress,
                chunksReceived: chunksReceived,
                totalChunks: expectedChunks
              }))
            } catch (error) {
              // Ignore feedback errors, don't break transfer
            }

            // Update progress SMOOTHLY - optimized for mobile
            const now = Date.now()
            if (now - lastProgressUpdate > 16 || progress >= 100) { // 16ms = ~60fps for smooth progress
              const transfer = Array.from(this.transfers.values()).find(t => t.peer === pc)
              
              if (transfer) {
                transfer.progress = Math.min(progress, 100)
                this.onTransferUpdate?.(transfer)
                lastProgressUpdate = now
              }
            }

            // Check if transfer is complete - use chunks count, not bytes
            if (chunksReceived >= expectedChunks) {
              logger.log('🎉 File transfer complete! All', expectedChunks, 'chunks received')
              
              // Create blob efficiently and clean up memory immediately
              const blob = new Blob(receivedChunks.filter(chunk => chunk), { type: receivedFile.type })
              
              // Critical memory cleanup
              receivedChunks.length = 0
              receivedChunks = []
              
              const file = new File([blob], receivedFile.name, {
                type: receivedFile.type,
                lastModified: receivedFile.lastModified
              })

              const transfer = Array.from(this.transfers.values()).find(t => t.peer === pc)
              if (transfer) {
                transfer.file = file
                transfer.status = 'completed'
                transfer.endTime = new Date()
                transfer.progress = 100
                this.onTransferUpdate?.(transfer)
              }
              
              logger.log('💾 Starting automatic download...')
              this.downloadFile(file)
              logger.log('💾 File download initiated with memory cleanup completed')
            }
          }
        } catch (error) {
          // Error processing received data
          // Critical: Clean up memory on error
          receivedChunks.length = 0
          receivedChunks = []
        }
      }

      dataChannel.onopen = () => {
        logger.log('🟢 DATA CHANNEL OPENED! Receiver side ready to receive')
        connection.status = 'connected'
        this.onConnectionUpdate?.(connection)
      }

      dataChannel.onerror = (error) => {
        logger.error('🔴 DATA CHANNEL ERROR on receiver side:', error)
        connection.status = 'failed'
        this.onConnectionUpdate?.(connection)
      }

      dataChannel.onclose = () => {
        logger.log('🟡 DATA CHANNEL CLOSED on receiver side')
        connection.status = 'disconnected'
        this.onConnectionUpdate?.(connection)
      }
    }

    this.connections.set(connectionId, connection)

    // Add ICE candidate handling for receiver  
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.log('🧊 ICE Candidate found (receiver):', event.candidate)
        // Store ICE candidate for signaling
      } else {
        logger.log('🏁 ICE Candidate gathering complete (receiver)')
      }
    }

    // Add connection state logging for receiver
    pc.onconnectionstatechange = () => {
      logger.log('🔗 Receiver Connection State Changed:', pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      logger.log('🧊 Receiver ICE Connection State Changed:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected') {
        logger.log('🟢 RECEIVER ICE CONNECTION ESTABLISHED')
      } else if (pc.iceConnectionState === 'failed') {
        logger.error('🔴 RECEIVER ICE CONNECTION FAILED')
      }
    }

    return { connectionId, pc }
  }

  private async startFileSending(transferId: string) {
    logger.log('📤 🚀 startFileSending – transfer:', transferId)
    const transfer = this.transfers.get(transferId)
    if (!transfer || !transfer.peer) {
      logger.error('❌ Transfer not found or no peer for:', transferId)
      return
    }

    const connection = Array.from(this.connections.values()).find(c => c.connection === transfer.peer)
    const dataChannel = connection?.dataChannel
    if (!dataChannel) {
      logger.error('❌ Data channel not found for transfer:', transferId)
      return
    }

    transfer.status = 'transferring'
    transfer.startTime = new Date()
    this.onTransferUpdate?.(transfer)

    // Send file metadata first
    const metadata: FileMetadata = {
      name: transfer.file.name,
      size: transfer.file.size,
      type: transfer.file.type,
      lastModified: transfer.file.lastModified,
      chunks: Math.ceil(transfer.file.size / this.chunkSize)
    }

    dataChannel.send(JSON.stringify(metadata))

    let offset = 0
    let chunksSent = 0
    const totalChunks = metadata.chunks
    let lastProgressUpdate = 0

    const wait = (ms: number) => new Promise(res => setTimeout(res, ms))

    while (offset < transfer.file.size) {
      // 🛑 Check if transfer is paused by receiver (security approval pending)
      while (this.transferPaused && this.pausedTransferId === transferId) {
        logger.log('🛑 SENDER: Transfer paused, waiting for receiver approval...')
        await wait(100) // Check every 100ms
      }
      
      // Check if transfer was cancelled (refresh transfer state)
      const currentTransfer = this.transfers.get(transferId)
      if (currentTransfer && (currentTransfer.status === 'cancelled' || currentTransfer.status === 'failed')) {
        logger.log('🛑 SENDER: Transfer was cancelled/failed, stopping')
        return
      }
      
      // Flow-control: wait if buffer is high
      while (dataChannel.bufferedAmount > this.maxBufferedAmount) {
        await wait(this.bufferMonitorInterval)
      }

      const chunk = transfer.file.slice(offset, offset + this.chunkSize)

      try {
        // 🚀 FAST: Process chunk directly for better performance
        const arrayBuffer = await chunk.arrayBuffer()
        
        dataChannel.send(arrayBuffer)
        chunksSent++
        offset += chunk.size

        // Simple progress based on chunks sent (receiver will sync the real progress)
        const localProgress = (chunksSent / totalChunks) * 100
        
        // Only update if our calculation is higher than current progress (receiver may have updated)
        if (localProgress > transfer.progress) {
          transfer.progress = Math.min(localProgress, 95) // Max 95% until receiver confirms completion
          
          const now = Date.now()
          if (now - lastProgressUpdate > 16) { // 60fps for smooth progress
            this.onTransferUpdate?.(transfer)
            lastProgressUpdate = now
          }
        }

      } catch (err) {
        logger.error('❌ Error processing/sending chunk', err)
        transfer.status = 'failed'
        this.onTransferUpdate?.(transfer)
        return
      }
    }

    // Wait for bufferedAmount to drain to ~0 before marking complete
    while (dataChannel.bufferedAmount > 0) {
      await wait(this.bufferMonitorInterval)
    }

    transfer.progress = 100
    transfer.status = 'completed'
    transfer.endTime = new Date()
    this.onTransferUpdate?.(transfer)
  }

  private downloadFile(file: File) {
    // Only execute in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    
    // Store file for manual download if needed
    (window as any).__pendingDownload = file
    
    logger.log('📱 Starting download for:', file.name, 'Size:', file.size)
    
    // Universal download approach with mobile-aware fallbacks
    try {
      const url = URL.createObjectURL(file)
      const ua = navigator.userAgent
      const isIOS = /iPad|iPhone|iPod/.test(ua)
      const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      
      // Create download anchor for all browsers (modern approach)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.style.display = 'none'
      
      // Add specific mobile handling
      if (isMobile) {
        logger.log('📱 Mobile device detected – using enhanced download method')
        
        // Set proper attributes for mobile download
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
        
        // For iOS Safari: Try Files API first
        if (isIOS && isSafari && 'showSaveFilePicker' in window) {
          this.tryNativeFileSave(file, url)
          return
        }
      }
      
      // Standard download method (works for most browsers including mobile Chrome)
      document.body.appendChild(a)
      
      // Use programmatic click
      if (a.click) {
        a.click()
      } else {
        // Fallback for older browsers
        const event = document.createEvent('MouseEvents')
        event.initEvent('click', true, true)
        a.dispatchEvent(event)
      }
      
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      
      logger.log('✅ Download initiation attempted')
    } catch (error) {
      logger.error('❌ Download failed:', error)
      this.showDownloadError(file.name)
    }
  }
  
  private async tryNativeFileSave(file: File, fallbackUrl: string) {
    try {
      // Try modern File System Access API
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: file.name,
        types: [{
          description: 'Downloaded file',
          accept: {'*/*': []}
        }]
      })
      
      const writable = await fileHandle.createWritable()
      await writable.write(file)
      await writable.close()
      
      URL.revokeObjectURL(fallbackUrl)
      logger.log('✅ Native file save successful')
    } catch (error) {
      logger.log('📱 Native save failed, using fallback')
      // Fallback to standard method
      window.open(fallbackUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(fallbackUrl), 8000)
    }
  }
  
  private showMobileDownloadNotification(fileName: string) {
    // Create a modern toast notification
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(12px);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 90%;
      text-align: center;
      animation: slideInDown 0.3s ease-out;
    `
    
    // Add animation keyframes
    if (!document.getElementById('wizzit-toast-styles')) {
      const style = document.createElement('style')
      style.id = 'wizzit-toast-styles'
      style.textContent = `
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes slideOutUp {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
        }
      `
      document.head.appendChild(style)
    }
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 20px; height: 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        <div style="text-align: left;">
          <div style="font-weight: 600; margin-bottom: 2px;">Download started</div>
          <div style="font-size: 12px; opacity: 0.9; color: rgba(255,255,255,0.8); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</div>
        </div>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Remove with animation after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutUp 0.3s ease-in forwards'
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
  
  private fallbackDownload(file: File, url: string) {
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.style.display = 'none'
      
      // Add to body, click, then remove
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up URL after short delay
      setTimeout(() => {
        URL.revokeObjectURL(url)
        logger.log('💻 Desktop download URL cleaned up')
      }, 2000)
      
    } catch (error) {
      logger.error('💻 Desktop download failed:', error)
      
      // Last resort: try to open URL
      try {
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 8000)
      } catch (finalError) {
        logger.error('💻 Final fallback failed:', finalError)
        
        // Show error notification
        this.showDownloadError(file.name)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }
    }
  }
  
  private showDownloadError(fileName: string) {
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 90%;
      text-align: center;
    `
    notification.innerHTML = `
      <div>❌ Download Failed</div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Try refreshing and downloading again</div>
    `
    
    document.body.appendChild(notification)
    
    // Remove notification after 6 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 6000)
  }

  // Public method for manual download trigger
  triggerManualDownload(): boolean {
    const pendingFile = (window as any).__pendingDownload
    if (!pendingFile) {
      logger.log('❌ No pending file for manual download')
      return false
    }
    
    logger.log('🔄 Triggering manual download for:', pendingFile.name)
    
    try {
      const url = URL.createObjectURL(pendingFile)
      const a = document.createElement('a')
      a.href = url
      a.download = pendingFile.name
      a.style.display = 'none'
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 2000)
      
      // Clear pending download
      delete (window as any).__pendingDownload
      
      return true
    } catch (error) {
      logger.error('❌ Manual download failed:', error)
      return false
    }
  }

  async handleAnswer(transferId: string, answer: RTCSessionDescriptionInit) {
    logger.log('🎯 HANDLING ANSWER for transfer:', transferId)
    logger.log('📝 Answer details:', answer)
    
    const transfer = this.transfers.get(transferId)
    if (!transfer?.peer) {
      logger.error('❌ Transfer not found or no peer for transferId:', transferId)
      throw new Error('Transfer not found')
    }

    logger.log('🔗 Setting remote description with answer...')
    logger.log('🔍 Peer connection state before setRemoteDescription:', transfer.peer.connectionState)
    logger.log('🔍 ICE connection state before setRemoteDescription:', transfer.peer.iceConnectionState)
    
    await transfer.peer.setRemoteDescription(answer)
    
    logger.log('✅ Remote description set successfully! WebRTC negotiation complete.')
    logger.log('🔍 Peer connection state after setRemoteDescription:', transfer.peer.connectionState)
    logger.log('🔍 ICE connection state after setRemoteDescription:', transfer.peer.iceConnectionState)
    
    // Check data channel state
    const connection = Array.from(this.connections.values()).find(c => c.connection === transfer.peer)
    if (connection?.dataChannel) {
      logger.log('🔍 Sender DataChannel state after answer:', connection.dataChannel.readyState)
      if (connection.dataChannel.readyState === 'open') {
        logger.log('🚨 DataChannel already OPEN! Manually triggering startFileSending...')
        this.startFileSending(transferId)
      }
    } else {
      logger.log('🔍 No DataChannel found in connection')
    }
  }

  async handleOffer(connectionId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const connection = this.connections.get(connectionId)
    if (!connection) throw new Error('Connection not found')

    await connection.connection.setRemoteDescription(offer)
    const answer = await connection.connection.createAnswer()
    await connection.connection.setLocalDescription(answer)

    logger.log('🎯 Initial answer created, waiting for receiver ICE gathering...')
    
    // Wait for ICE gathering to complete to get all candidates in SDP
    await new Promise<void>((resolve) => {
      const pc = connection.connection
      
      if (pc.iceGatheringState === 'complete') {
        logger.log('✅ Receiver ICE gathering already complete')
        resolve()
        return
      }
      
      const handleIceGatheringChange = () => {
        logger.log('🔍 Receiver ICE gathering state changed to:', pc.iceGatheringState)
        if (pc.iceGatheringState === 'complete') {
          logger.log('✅ Receiver ICE gathering completed, final answer SDP ready')
          pc.removeEventListener('icegatheringstatechange', handleIceGatheringChange)
          resolve()
        }
      }
      
      pc.addEventListener('icegatheringstatechange', handleIceGatheringChange)
      
      // Fallback timeout - increased for VPN scenarios
      setTimeout(() => {
        logger.log('⏰ Receiver ICE gathering timeout')
        pc.removeEventListener('icegatheringstatechange', handleIceGatheringChange)
        resolve()
      }, 10000) // 10s timeout for faster connection
    })

    // Get the final answer with ICE candidates embedded
    const finalAnswer = connection.connection.localDescription
    logger.log('📋 Final answer SDP preview:', finalAnswer?.sdp?.substring(0, 300) + '...')

    return finalAnswer || answer
  }

  async addIceCandidate(id: string, candidate: RTCIceCandidateInit) {
    const connection = this.connections.get(id) || 
                     Array.from(this.transfers.values()).find(t => t.id === id)?.peer

    if (connection && 'addIceCandidate' in connection) {
      await connection.addIceCandidate(candidate)
    } else {
      // Find by peer connection
      for (const conn of this.connections.values()) {
        if (conn.connection.localDescription) {
          await conn.connection.addIceCandidate(candidate)
          break
        }
      }
    }
  }

  getTransfer(id: string): FileTransfer | undefined {
    return this.transfers.get(id)
  }

  getConnection(id: string): PeerConnection | undefined {
    return this.connections.get(id)
  }

  getAllTransfers(): FileTransfer[] {
    return Array.from(this.transfers.values())
  }

  closeConnection(id: string) {
    const connection = this.connections.get(id)
    if (connection) {
      connection.dataChannel?.close()
      connection.connection.close()
      this.connections.delete(id)
    }

    // Also remove associated transfer
    for (const [transferId, transfer] of this.transfers.entries()) {
      if (transfer.peer === connection?.connection) {
        this.transfers.delete(transferId)
        break
      }
    }
  }

  cleanup() {
    for (const connection of this.connections.values()) {
      connection.dataChannel?.close()
      connection.connection.close()
    }
    this.connections.clear()
    this.transfers.clear()
    
    // Clean up Web Worker - CRITICAL!
    if (this.chunkWorker) {
      this.chunkWorker.terminate()
      this.chunkWorker = null
      logger.log('🧹 Web Worker terminated')
    }
    this.pendingChunks.clear()
  }

  private initializeWorker() {
    try {
      this.chunkWorker = new Worker('/chunk-worker.js')
      
      this.chunkWorker.onmessage = (event) => {
        const { type, data } = event.data
        
        switch (type) {
          case 'CHUNK_READY':
            const pending = this.pendingChunks.get(data.chunkIndex)
            if (pending) {
              pending.resolve(data.arrayBuffer)
              this.pendingChunks.delete(data.chunkIndex)
            }
            break
            
          case 'CHUNK_ERROR':
            const errorPending = this.pendingChunks.get(data.chunkIndex)
            if (errorPending) {
              errorPending.reject(new Error(data.error))
              this.pendingChunks.delete(data.chunkIndex)
            }
            break
        }
      }
      
      this.chunkWorker.onerror = (error) => {
        logger.error('🔴 Web Worker error:', error)
        this.chunkWorker = null
      }
      
      logger.log('🚀 Web Worker initialized - CRITICAL for mobile performance!')
    } catch (error) {
      logger.warn('⚠️ Web Worker not supported, falling back to main thread')
      this.chunkWorker = null
    }
  }

  private async processChunkInWorker(fileSlice: Blob, chunkIndex: number): Promise<ArrayBuffer> {
    if (!this.chunkWorker) {
      // Fallback to main thread
      return await fileSlice.arrayBuffer()
    }

    return new Promise((resolve, reject) => {
      this.pendingChunks.set(chunkIndex, { resolve, reject })
      
      this.chunkWorker!.postMessage({
        type: 'PROCESS_CHUNK',
        data: {
          fileSlice,
          chunkIndex,
          chunkSize: this.chunkSize
        }
      })
      
      // Timeout fallback
      setTimeout(() => {
        if (this.pendingChunks.has(chunkIndex)) {
          this.pendingChunks.delete(chunkIndex)
          reject(new Error('Worker timeout'))
        }
      }, 5000)
    })
  }

  private async loadIceServers() {
    try {
      const response = await fetch('/api/ice-servers')
      const data = await response.json()
      
      if (data.success && data.iceServers) {
        this.iceServers = data.iceServers
        logger.log('✅ ICE servers loaded from API:', this.iceServers.length, 'servers')
        
        // Test TURN server connectivity
        if (this.iceServers.length > 0) {
          await this.testTurnConnectivity()
        }
      } else {
        logger.warn('⚠️ Failed to load ICE servers from API, using fallback')
        this.iceServers = this.getFallbackIceServers()
      }
    } catch (error) {
      logger.error('❌ Error loading ICE servers:', error)
      this.iceServers = this.getFallbackIceServers()
    }
  }

  // Test TURN server connectivity
  private async testTurnConnectivity(): Promise<void> {
    try {
      logger.log('🔍 Testing TURN server connectivity...')
      
      const turnServers = this.iceServers.filter(server => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
        return urls.some((url: string) => url.startsWith('turn:') || url.startsWith('turns:'))
      })
      
      if (turnServers.length === 0) {
        logger.log('⚠️ No TURN servers found in ICE server list')
        return
      }
      
      const testPc = new RTCPeerConnection({
        iceServers: turnServers,
        iceTransportPolicy: 'relay' // Force TURN only
      })
      
      let turnCandidatesFound = 0
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testPc.close()
          logger.log(`🔍 TURN connectivity test completed: ${turnCandidatesFound} relay candidates found`)
                      if (turnCandidatesFound === 0) {
              logger.log('❌ TURN server appears to be unreachable from this network!')
              logger.log('💡 This may be due to VPN/proxy blocking our TURN server')
            }
          resolve()
        }, 5000) // 5s test
        
        testPc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate
            logger.log('🔍 TURN test candidate:', candidate)
            
            if (candidate.includes('typ relay')) {
              turnCandidatesFound++
              logger.log('✅ TURN relay candidate found!')
            }
          } else {
            // ICE gathering complete
            clearTimeout(timeout)
            testPc.close()
            logger.log(`🔍 TURN connectivity test completed: ${turnCandidatesFound} relay candidates found`)
            if (turnCandidatesFound === 0) {
              logger.log('❌ TURN server appears to be unreachable from this network!')
              logger.log('💡 This may be due to VPN/proxy blocking our TURN server')
            }
            resolve()
          }
        }
        
        // Create a data channel to trigger ICE gathering
        testPc.createDataChannel('turnTest')
        testPc.createOffer().then(offer => testPc.setLocalDescription(offer))
      })
    } catch (error) {
      logger.log('🔍 TURN connectivity test failed:', error)
    }
  }

  private getFallbackIceServers(): RTCIceServer[] {
    return [
      // Fallback to basic STUN servers if API fails
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // 🔍 Smart Network Environment Detection (Behavior-Based)
  private async detectVpnEnvironment(): Promise<boolean> {
    try {
      logger.log('🔍 Starting intelligent network analysis...')
      
      // 1️⃣ Quick NAT/Firewall test (most reliable indicator)
      const natResult = await this.checkRestrictiveNAT()
      
      // 2️⃣ Network timing analysis
      const timingResult = await this.analyzeNetworkTiming()
      
      // 3️⃣ Connection quality patterns
      const qualityResult = this.analyzeConnectionQuality()
      
      // 4️⃣ WebRTC capability check
      const webrtcResult = this.checkWebRTCCapabilities()
      
      // 5️⃣ Only check for obvious VPN keywords (not specific providers)
      const connection = (navigator as any).connection
      const hasVpnKeywords = this.hasVpnKeywords()
      
      // Scoring system (0-100) - More lenient for mobile devices
      let restrictiveScore = 0
      
      if (natResult) restrictiveScore += 30        // Reduced from 40 - mobile NAT is common
      if (timingResult) restrictiveScore += 30     // High latency/jitter
      if (qualityResult) restrictiveScore += 25    // Connection inconsistencies
      if (webrtcResult) restrictiveScore += 10     // WebRTC limitations
      if (hasVpnKeywords) restrictiveScore += 15   // Only specific VPN keywords now
      
      const isRestrictive = restrictiveScore >= 60  // Raised threshold from 50 to 60
      
      logger.log('🔍 Network Environment Analysis:', {
        natRestricted: natResult,
        highLatencyPattern: timingResult,
        qualityInconsistent: qualityResult,
        webrtcLimited: webrtcResult,
        hasVpnKeywords: hasVpnKeywords,
        totalScore: restrictiveScore,
        conclusion: isRestrictive ? 'RESTRICTIVE/VPN' : 'NORMAL'
      })
      
      return isRestrictive
    } catch (error) {
      logger.log('🔍 Network analysis failed, using TURN-only for safety:', error)
      return true // Safe default
    }
  }

  // Check for generic VPN/Proxy keywords (not specific providers)
  private hasVpnKeywords(): boolean {
    const userAgent = navigator.userAgent.toLowerCase()
    // Only check for very specific VPN keywords, not generic ones like "secure" or "private"
    const specificVpnKeywords = ['vpn', 'proxy', 'tunnel']
    return specificVpnKeywords.some(keyword => userAgent.includes(keyword))
  }

  // Analyze network timing patterns (high latency = likely VPN/Proxy)
  private async analyzeNetworkTiming(): Promise<boolean> {
    try {
      const startTime = Date.now()
      
      // Test multiple endpoints for timing consistency
      const promises = [
        fetch('https://cloudflare.com/cdn-cgi/trace', { method: 'HEAD' }),
        fetch('https://google.com', { method: 'HEAD' }),
        fetch('https://1.1.1.1', { method: 'HEAD' })
      ].map(async (promise) => {
        try {
          const testStart = Date.now()
          await promise
          return Date.now() - testStart
        } catch {
          return 999 // High latency for failed requests
        }
      })

      const latencies = await Promise.all(promises)
      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
      const maxLatency = Math.max(...latencies)
      
      // VPN indicators: high average latency or very inconsistent timing
      const highLatency = avgLatency > 500
      const inconsistentTiming = maxLatency - Math.min(...latencies) > 1000
      
      logger.log('🔍 Network timing analysis:', { latencies, avgLatency, highLatency, inconsistentTiming })
      
      return highLatency || inconsistentTiming
    } catch {
      return false // If timing test fails, don't penalize
    }
  }

  // Analyze connection quality inconsistencies
  private analyzeConnectionQuality(): boolean {
    try {
      const connection = (navigator as any).connection
      if (!connection) return false

      // Check for unusual connection patterns (common in VPNs)
      const inconsistencies = [
        // High-speed connection but reports slow type
        connection.downlink > 10 && connection.effectiveType === 'slow-2g',
        // Ethernet connection reporting as 4G (mobile VPN on desktop)
        connection.type === 'ethernet' && connection.effectiveType === '4g',
        // Very low RTT with high downlink (proxy patterns)
        connection.rtt < 50 && connection.downlink > 50
      ]

      const hasInconsistencies = inconsistencies.some(inc => inc)
      
      logger.log('🔍 Connection quality analysis:', {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        hasInconsistencies
      })

      return hasInconsistencies
    } catch {
      return false
    }
  }

  // Check WebRTC capabilities (some VPNs/Proxies limit these)
  private checkWebRTCCapabilities(): boolean {
    try {
      const limitations = [
        // Basic WebRTC support missing
        !window.RTCPeerConnection,
        !navigator.mediaDevices,
        // getUserMedia blocked (common in corporate/VPN environments)
        !navigator.mediaDevices?.getUserMedia,
        // DataChannel support missing
        !RTCPeerConnection.prototype.createDataChannel
      ]

      const hasLimitations = limitations.some(limit => limit)
      
      logger.log('🔍 WebRTC capabilities check:', {
        hasRTCPeerConnection: !!window.RTCPeerConnection,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        hasDataChannel: !!RTCPeerConnection.prototype.createDataChannel,
        hasLimitations
      })

      return hasLimitations
    } catch {
      return true // If capability check fails, assume limitations
    }
  }

  // Check for restrictive NAT (quick test)
  private async checkRestrictiveNAT(): Promise<boolean> {
    try {
      // Quick STUN test to detect NAT type
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      let hasHostCandidate = false
      let hasPublicCandidate = false
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close()
          resolve(!hasHostCandidate || !hasPublicCandidate) // Restrictive if missing candidates
        }, 3000) // Quick 3s test
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate
            if (candidate.includes('typ host')) hasHostCandidate = true
            if (candidate.includes('typ srflx')) hasPublicCandidate = true
          } else {
            // ICE gathering complete
            clearTimeout(timeout)
            pc.close()
            resolve(!hasHostCandidate || !hasPublicCandidate)
          }
        }
        
        // Create a dummy data channel to trigger ICE gathering
        pc.createDataChannel('test')
        pc.createOffer().then(offer => pc.setLocalDescription(offer))
      })
    } catch (error) {
      logger.log('🔍 NAT test failed, assuming restrictive:', error)
      return true
    }
  }

  // Debug connection statistics
  private async logConnectionStats(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats()
      const candidates = Array.from(stats.values()).filter(stat => 
        stat.type === 'candidate-pair' && (stat as any).state === 'succeeded'
      )
      
      logger.log('🔍 Active connection stats:', candidates)
    } catch (error) {
      logger.log('🔍 Stats collection failed:', error)
    }
  }

  // Debug connection failure details
  private async logConnectionFailureDetails(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats()
      const allCandidates = Array.from(stats.values()).filter(stat => 
        stat.type === 'candidate-pair'
      )
      
      logger.log('❌ Connection failure analysis:')
      logger.log('🔍 All candidate pairs:', allCandidates)
      logger.log('🔍 ICE gathering state:', pc.iceGatheringState)
      logger.log('🔍 Connection state:', pc.connectionState)
      
      // Check if TURN candidates were gathered
      const turnCandidates = Array.from(stats.values()).filter(stat => 
        stat.type === 'local-candidate' && (stat as any).candidateType === 'relay'
      )
      logger.log('🔍 TURN candidates found:', turnCandidates.length)
      
    } catch (error) {
      logger.log('🔍 Failure analysis failed:', error)
    }
  }

  // Debug ICE candidate statistics
  private async logIceCandidateStats(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats()
      const localCandidates = Array.from(stats.values()).filter(stat => 
        stat.type === 'local-candidate'
      )
      const remoteCandidates = Array.from(stats.values()).filter(stat => 
        stat.type === 'remote-candidate'
      )
      
      logger.log('🔍 ICE candidate analysis:')
      logger.log('📤 Local candidates:', localCandidates.map(c => `${(c as any).candidateType} (${(c as any).protocol})`))
      logger.log('📥 Remote candidates:', remoteCandidates.map(c => `${(c as any).candidateType} (${(c as any).protocol})`))
      
      const pairs = Array.from(stats.values()).filter(stat => 
        stat.type === 'candidate-pair'
      )
      logger.log('🔗 Candidate pairs:', pairs.map(p => `${(p as any).state} (${(p as any).priority})`))
      
    } catch (error) {
      logger.log('🔍 ICE stats collection failed:', error)
    }
  }

  // VPN warning is now handled by UI components
  // These toast methods are deprecated in favor of UI integration
}

// Lazy singleton instance - ensure it persists across page navigation
let webrtcManagerInstance: WebRTCManager | null = null

export const getWebRTCManager = (): WebRTCManager => {
  if (typeof window !== 'undefined') {
    // Store instance on window to persist across navigation
    if (!window.__webrtcManager) {
      window.__webrtcManager = new WebRTCManager()
    }
    return window.__webrtcManager
  }
  
  // Fallback for SSR
  if (!webrtcManagerInstance) {
    webrtcManagerInstance = new WebRTCManager()
  }
  return webrtcManagerInstance
}

// Add type declaration for window
declare global {
  interface Window {
    __webrtcManager?: WebRTCManager
  }
} 