'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Download, CheckCircle, XCircle, ArrowLeft, AlertCircle, Clock, Zap, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getWebRTCManager } from '@/lib/webrtc'
import { FileTransfer } from '@/types'
import { logger } from '@/lib/logger'
import { formatFileSize, getFileIcon } from '@/lib/utils'
import SecurityWarning from '@/components/SecurityWarning'
import { SecurityWarning as SecurityWarningType } from '@/lib/security'

// Helper function to calculate transfer speed
const calculateTransferSpeed = (transfer: FileTransfer) => {
  if (!transfer.startTime || transfer.progress === 0) return '0 KB/s'
  
  const elapsedTime = (Date.now() - transfer.startTime.getTime()) / 1000 // in seconds
  const transferredBytes = (transfer.progress / 100) * (transfer.file?.size || 0)
  const speed = transferredBytes / elapsedTime // bytes per second
  
  if (speed < 1024) return `${Math.round(speed)} B/s`
  if (speed < 1024 * 1024) return `${Math.round(speed / 1024)} KB/s`
  return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
}

// Helper function to estimate remaining time
const estimateRemainingTime = (transfer: FileTransfer) => {
  if (!transfer.startTime || transfer.progress === 0 || transfer.progress >= 100) return null
  
  const elapsedTime = (Date.now() - transfer.startTime.getTime()) / 1000
  const remainingProgress = 100 - transfer.progress
  const estimatedTotalTime = (elapsedTime / transfer.progress) * 100
  const remainingSeconds = estimatedTotalTime - elapsedTime
  
  if (remainingSeconds < 60) return `${Math.round(remainingSeconds)}s remaining`
  if (remainingSeconds < 3600) return `${Math.round(remainingSeconds / 60)}m remaining`
  return `${Math.round(remainingSeconds / 3600)}h remaining`
}

// 🚀 CRITICAL PERFORMANCE: Throttled progress display to prevent UI update loop
const useThrottledProgress = (progress: number, interval: number = 100) => {
  const [displayProgress, setDisplayProgress] = useState(progress)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    if (now - lastUpdateRef.current > interval || progress === 0 || progress === 100) {
      lastUpdateRef.current = now
      setDisplayProgress(progress)
    }
  }, [progress, interval])

  return displayProgress
}

export default function ReceivePage() {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<{ fileName: string; fileSize: number } | null>(null)
  const [transfer, setTransfer] = useState<FileTransfer | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [hintTimeout, setHintTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showConnectingHint, setShowConnectingHint] = useState(false)
  const [failTimeout, setFailTimeout] = useState<NodeJS.Timeout | null>(null)
  const [vpnWarning, setVpnWarning] = useState<{ show: boolean; type: 'sender' | 'receiver' | 'both' }>({ show: false, type: 'sender' })
  const [securityWarning, setSecurityWarning] = useState<{
    warning: SecurityWarningType
    fileName: string
    fileSize: number
    resolve: (approved: boolean) => void
  } | null>(null)
  const [pinRequired, setPinRequired] = useState<boolean>(false)
  const [pinValid, setPinValid] = useState<boolean>(false)
  const [pinInput, setPinInput] = useState<string>('')
  const [pinError, setPinError] = useState<string>('')
  
  // 📱 Mobile Warning System for Large Files  
  const [showMobileWarning, setShowMobileWarning] = useState(false)
  
  // 📱 Mobile detection
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    
    // Multiple detection methods for accuracy
    const isSmallScreen = window.innerWidth <= 768
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    return isSmallScreen || isMobileUA || (hasTouch && window.innerWidth <= 1024)
  }, [])
  
  // 🚀 PERFORMANCE: Use throttled progress for smooth UI
  const throttledProgress = useThrottledProgress(transfer?.progress || 0)

  // Warn on tab close if there is an active transfer or connecting
  useEffect(() => {
    const active = !!transfer && (transfer.status === 'transferring' || transfer.status === 'connecting')
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (active) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    if (active) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [transfer])

  useEffect(() => {
    const fetchTransferData = async () => {
      try {
        const shortId = params.data as string
        logger.log('🔍 Fetching transfer data for ID:', shortId)
        logger.log('🕐 Current time:', new Date().toISOString())
        logger.log('🌐 Current URL:', window.location.href)
        logger.log('📱 User agent:', navigator.userAgent)
        
        // Fetch transfer data from server
        const response = await fetch(`/api/share?id=${shortId}`)
        
        logger.log('📡 Response status:', response.status)
        logger.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          // Try to get specific error message from API
          let errorMessage = 'Failed to load transfer data'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            logger.log('❌ Server error response:', errorData)
          } catch (e) {
            logger.log('❌ Could not parse error response as JSON')
            // Ignore JSON parsing errors, use default message
          }
          
          if (response.status === 404) {
            logger.log('❌ 404 Error - Transfer not found:', shortId)
            logger.log('❌ Server error message:', errorMessage)
            logger.log('🕐 Request timestamp:', new Date().toISOString())
            
            // Softer wording: may have expired OR be temporarily unavailable
            throw new Error('This link is currently unavailable. It may have expired (links are valid for 15 minutes) or be temporarily unavailable.')
          }
          
          throw new Error(errorMessage)
        }
        
        const transferData = await response.json()
        logger.log('✅ Transfer data loaded:', { 
          fileName: transferData.fileName, 
          fileSize: transferData.fileSize,
          senderHasVpn: transferData.senderHasVpn,
          createdAt: transferData.createdAt ? new Date(transferData.createdAt).toISOString() : 'unknown',
          transferId: transferData.transferId,
          hasOffer: !!transferData.offer
        })
        
        // Validate required fields
        if (!transferData.fileName || !transferData.fileSize) {
          logger.log('❌ Invalid transfer data - missing fields:', {
            hasFileName: !!transferData.fileName,
            hasFileSize: !!transferData.fileSize,
            hasTransferId: !!transferData.transferId,
            hasOffer: !!transferData.offer
          })
          throw new Error('Invalid transfer data')
        }
        
        setFileInfo({
          fileName: transferData.fileName,
          fileSize: transferData.fileSize
        })

        // If sender set a PIN, require it before connecting
        if (transferData.pinHash) {
          setPinRequired(true)
        }
        
        // Check if sender has VPN
        if (transferData.senderHasVpn) {
          logger.log('🚨 Sender has VPN - showing warning to receiver')
          setVpnWarning(prev => ({ 
            show: true, 
            type: prev.show && prev.type !== 'sender' ? 'both' : 'sender' 
          }))
        }
        
        // Store the full transfer data for download
        ;(window as any).transferData = transferData
        logger.log('💾 Transfer data stored in window object')
        
        setIsLoading(false)
      } catch (err) {
        logger.error('💥 Failed to load transfer data:', err)
        logger.log('🕐 Error timestamp:', new Date().toISOString())
        setError(err instanceof Error ? err.message : 'Something went wrong loading this link. Please check the URL and try again.')
        setIsLoading(false)
      }
    }

    fetchTransferData()
  }, [params.data])

  useEffect(() => {
    logger.log('🔧 RECEIVER: Setting up WebRTC callbacks...')
    const webrtcManager = getWebRTCManager()
    
    // Set up VPN warning callback for receiver
    webrtcManager.onVpnDetected = (type: 'sender' | 'receiver') => {
      logger.log(`🚨 RECEIVER: VPN detected on ${type} side!`)
      setVpnWarning(prev => ({ 
        show: true, 
        type: prev.show && prev.type !== type ? 'both' : type 
      }))
    }
    
    // Set up security warning callback for receiver (where it makes sense!)
    webrtcManager.onReceiverSecurityWarning = async (warning: SecurityWarningType, fileName: string, fileSize: number): Promise<boolean> => {
      return new Promise((resolve) => {
        setSecurityWarning({ warning, fileName, fileSize, resolve })
      })
    }
    
    const throttledUpdateTransfer = (transfer: FileTransfer) => {
      logger.log('🔄 RECEIVER: Direct transfer update:', {
        progress: transfer.progress.toFixed(1),
        status: transfer.status
      })

      setTransfer(prevTransfer => {
        // Update immediately for smooth progress - match sender behavior
        if (!prevTransfer ||
            prevTransfer.id !== transfer.id ||
            prevTransfer.progress !== transfer.progress || // Update on ANY progress change
            prevTransfer.status !== transfer.status) {

          logger.log('✨ RECEIVER: Updating UI with transfer progress:', transfer.progress.toFixed(1) + '%')

          // Get stored transfer data for file info
          const storedData = (window as any).transferData

          // Create optimized transfer object
          const updatedTransfer: FileTransfer = {
            ...transfer,
            file: {
              ...transfer.file,
              name: transfer.file?.name || storedData?.fileName || fileInfo?.fileName || 'Unknown File',
              size: transfer.file?.size || storedData?.fileSize || fileInfo?.fileSize || 0
            }
          }

          return updatedTransfer
        }

        return prevTransfer // No change, keep current state
      })
    }
    
    webrtcManager.setCallbacks(
      throttledUpdateTransfer, // Use throttled version
      (connection) => {
        logger.log('🔗 RECEIVER: Connection update:', {
          id: connection.id,
          status: connection.status,
          type: connection.type
        })

        // Surface user-friendly error when connection fails or disconnects
        // DISABLED: These errors are triggering on successful transfers
        // if (connection.type === 'receiver' && (connection.status === 'failed' || connection.status === 'disconnected')) {
        //   setError('Connection to sender failed. The sender may be offline or have closed their browser. Ask them to refresh their page and try again.')
        //   setIsConnecting(false)
        //   if (hintTimeout) {
        //     clearTimeout(hintTimeout)
        //     setHintTimeout(null)
        //   }
        //   if (failTimeout) {
        //     clearTimeout(failTimeout)
        //     setFailTimeout(null)
        //   }
        //   setShowConnectingHint(false)
        // }
      }
    )

    logger.log('✅ RECEIVER: Optimized callbacks set up successfully')

    return () => {
      logger.log('🧹 RECEIVER: Cleaning up WebRTC manager')
      webrtcManager.cleanup()
    }
  }, [fileInfo])

  const handleDownload = async () => {
    if (!fileInfo) return
    
    // 📱 Check for mobile device + large file (>100MB) - Show warning first
    const isLargeFile = fileInfo.fileSize > 100 * 1024 * 1024 // 100MB threshold
    
    if (isMobile && isLargeFile) {
      logger.log('📱 Mobile device detected with large file, showing warning...')
      setShowMobileWarning(true)
      return
    }
    
    // If PIN required, ensure user provided something; actual validation happens below
    if (pinRequired && !pinInput) {
      setPinError('PIN is required')
      return
    }
    await proceedWithDownload()
  }

  // 📱 Handle mobile warning responses
  const handleMobileWarningContinue = async () => {
    logger.log('📱 User chose to continue with mobile download')
    
    // Close modal immediately and start download process
    setShowMobileWarning(false)
    setIsConnecting(true) // Show loading state immediately
    
    // Proceed with download (call original logic without mobile check)
    await proceedWithDownload()
  }

  const handleMobileWarningCancel = () => {
    logger.log('📱 User cancelled mobile download')
    setShowMobileWarning(false)
  }

  // Original download logic without mobile check
  const proceedWithDownload = async () => {
    if (!fileInfo) return
    
    // Clear any existing timers / hints
    if (hintTimeout) {
      clearTimeout(hintTimeout)
      setHintTimeout(null)
    }
    if (failTimeout) {
      clearTimeout(failTimeout)
      setFailTimeout(null)
    }
    setShowConnectingHint(false)
    
    try {
      setIsConnecting(true)
      setError(null)
      
      // Get transfer data from window object
      const transferData = (window as any).transferData
      if (!transferData) {
        throw new Error('Transfer data not found')
      }
      
      const offer = JSON.parse(transferData.offer)
      // Verify PIN if required
      if (transferData.pinHash) {
        if (!pinInput) {
          setPinError('PIN is required')
          setIsConnecting(false)
          return
        }
        try {
          const hash = await (await import('@/lib/utils')).sha256Hex(pinInput)
          if (hash !== transferData.pinHash) {
            setPinError('Incorrect PIN')
            setIsConnecting(false)
            return
          }
          setPinValid(true)
          setPinError('')
        } catch {
          setPinError('Failed to validate PIN')
          setIsConnecting(false)
          return
        }
      }
      
      logger.log('🚀 Starting download process...')
      logger.log('📋 Transfer data:', { fileName: transferData.fileName, fileSize: transferData.fileSize })
      logger.log('🎯 Offer preview:', JSON.stringify(offer).substring(0, 200) + '...')
      
      // Create receiver connection
      const webrtcManager = getWebRTCManager()
      logger.log('🔧 Creating receiver connection...')
      const { connectionId, pc } = await webrtcManager.createReceiver()
      logger.log('✅ Receiver connection created:', connectionId)
      
      // Handle the offer and create answer (senderTransferId used for trickle ICE)
      logger.log('🤝 Processing offer and creating answer...')
      const answer = await webrtcManager.handleOffer(connectionId, offer, transferData.transferId)
      logger.log('📝 Answer created successfully:', answer ? 'YES' : 'NO')
      logger.log('📋 Answer preview:', JSON.stringify(answer).substring(0, 200) + '...')
      
      // Send answer back to sender via signaling API
      const signalingMessage = {
        type: 'answer' as const,
        senderId: connectionId, // receiver's ID
        receiverId: transferData.transferId, // sender's transfer ID
        data: answer
      }
      
      logger.log('📤 Sending answer to sender via signaling API...')
      logger.log('📡 Signaling message:', {
        type: signalingMessage.type,
        senderId: signalingMessage.senderId,
        receiverId: signalingMessage.receiverId,
        hasData: !!signalingMessage.data
      })
      
      const response = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signalingMessage)
      })
      
      logger.log('📡 Signaling response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        logger.error('❌ Signaling failed:', response.status, errorText)
        throw new Error(`Failed to send answer to sender: ${response.status} ${errorText}`)
      }
      
      const responseData = await response.json()
      logger.log('✅ Answer sent successfully to sender:', responseData)
      
      // Send peer info to sender so it can flush buffered candidates (out-of-band, not in SDP)
      try {
        await fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'peer-info',
            senderId: connectionId,
            receiverId: transferData.transferId,
            data: { receiverConnectionId: connectionId }
          })
        })
      } catch {}
      
      // Start polling for incoming ICE candidates from sender (trickle ICE)
      let icePolling = true
      const getInterval = (attempt: number) => (attempt < 10 ? 1000 : attempt < 30 ? 2000 : 5000)
      let attempts = 0
      const poll = async () => {
        if (!icePolling) return
        attempts++
        try {
          const res = await fetch(`/api/signal?receiverId=${connectionId}`)
          if (res.ok) {
            const { signals } = await res.json()
            if (signals && signals.length) {
              for (const signal of signals) {
                if (signal.type === 'ice-candidate') {
                  try {
                    logger.log('🧊 RECEIVER: Adding ICE candidate from sender')
                    await webrtcManager.addIceCandidate(connectionId, signal.data)
                  } catch (e) {
                    logger.error('❌ RECEIVER: Failed to add ICE candidate', e)
                  }
                }
              }
            }
          }
        } catch (e) {
          logger.error('❌ RECEIVER: ICE polling error', e)
        }
        setTimeout(poll, getInterval(attempts))
      }
      // Stop after 5 minutes
      setTimeout(() => { icePolling = false }, 300000)
      poll()
      
    } catch (err) {
      logger.error('Download failed:', err)
      setError('Failed to connect to sender. They might be offline or have closed their browser. Ask them to refresh their page and try again.')
    } finally {
      setIsConnecting(false)
      if (hintTimeout) {
        clearTimeout(hintTimeout)
        setHintTimeout(null)
      }
      if (failTimeout) {
        clearTimeout(failTimeout)
        setFailTimeout(null)
      }
      setShowConnectingHint(false)
    }
  }

  // Security warning handlers for receiver
  const handleReceiverSecurityApprove = () => {
    if (securityWarning) {
      securityWarning.resolve(true)
      setSecurityWarning(null)
    }
  }

  const handleReceiverSecurityCancel = () => {
    if (securityWarning) {
      securityWarning.resolve(false)
      setSecurityWarning(null)
      setIsConnecting(false) // Stop loading state
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading file information...</p>
        </motion.div>
      </div>
    )
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
          <h1 className="text-xl font-medium mb-2 text-gray-900">Oops! Link unavailable</h1>
          <p className="text-gray-600 mb-5 text-sm leading-relaxed">
            {error || 'This link may have expired or is temporarily unavailable.'}
            <span className="block mt-1">Try refreshing the page and try again. If it still fails, ask the sender to create a new transfer.</span>
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Create new transfer</span>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-medium mb-2 text-gray-900">File received</h1>
          <p className="text-gray-600 text-sm">
            Someone shared a file with you via Wizzit
            </p>
        </motion.div>

          {/* File Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-gray-200 rounded-lg p-6 mb-6 bg-white"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                {fileInfo && getFileIcon(fileInfo.fileName)}
              </div>
              <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-gray-900" title={fileInfo?.fileName}>
                  {fileInfo?.fileName}
                </h3>
                <p className="text-sm text-gray-600">
                  {fileInfo && formatFileSize(fileInfo.fileSize)}
                </p>
              </div>
            </div>

          {/* PIN gate (if required and not validated yet) */}
          {pinRequired && !pinValid && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter PIN</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="flex-1 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError('') }}
                  placeholder="Required to start download"
                />
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium"
                >
                  Verify
                </button>
              </div>
              {pinError && (
                <p className="text-xs text-red-600 mt-2">{pinError}</p>
              )}
            </div>
          )}

          {!transfer && !isConnecting && (!pinRequired || pinValid) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
              className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
                    <Download className="w-4 h-4" />
              <span>Download file</span>
            </motion.button>
          )}

          {isConnecting && (
            <div className="space-y-3">
              <div className="w-full py-3 bg-gray-50 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span>Connecting to sender...</span>
              </div>
              
              {/* VPN Warning during connection */}
              <AnimatePresence>
                {vpnWarning.show && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-amber-600 mt-0.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-medium text-amber-800 mb-1">
                          VPN/Proxy Detected
                        </h4>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          {vpnWarning.type === 'sender' ? 
                            'Sender has VPN enabled. If download fails, ask them to disable VPN and try again.' :
                            vpnWarning.type === 'receiver' ?
                            'VPN detected. Download may take slightly longer, but will work normally.' :
                            'Both sender and receiver have VPN. This may cause connection issues. Try disabling VPN if download fails.'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setVpnWarning({ show: false, type: 'sender' })}
                        className="text-amber-500 hover:text-amber-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Important UX Warning - Only show during active transfer */}
        {(transfer || isConnecting) && transfer?.status !== 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Keep this tab open</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your file downloads directly from the sender's browser. Don't close this tab until complete.
                </p>
              </div>
          </div>
          </motion.div>
        )}

        {/* Enhanced Transfer Progress */}
        <AnimatePresence>
          {transfer && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      transfer.status === 'completed' ? 'bg-green-500' : 
                      transfer.status === 'transferring' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">
                      {transfer.status === 'completed' ? 'Download Complete' : 
                       transfer.status === 'transferring' ? 'Downloading...' :
                       'Connecting...'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round(throttledProgress)}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <motion.div 
                    className={`h-2 rounded-full ${
                      transfer.status === 'completed' ? 'bg-green-500' : 'bg-gray-900'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${throttledProgress}%` }}
                    transition={{ duration: 0.5 }}
              />
            </div>

                {/* Enhanced Transfer Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-300 rounded flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-gray-600 rounded" />
                      </div>
                      <span>
                        {formatFileSize((throttledProgress / 100) * (transfer.file?.size || 0))} / {formatFileSize(transfer.file?.size || 0)}
                      </span>
                    </div>
                    {transfer.status === 'transferring' && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span>{calculateTransferSpeed(transfer)}</span>
                      </div>
                    )}
                  </div>

                  {estimateRemainingTime(transfer) && transfer.status === 'transferring' && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>{estimateRemainingTime(transfer)}</span>
                    </div>
                  )}

          
                  <div className="text-xs text-gray-400">
                    Status: {transfer.status} | Progress: {Math.round(throttledProgress)}%
                  </div>

                  {/* ALWAYS show download section when transfer is completed */}
                  {transfer.status === 'completed' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>Transfer Complete!</span>
                      </div>
                      
                      {/* Improved Download Button with better UX messaging */}
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 text-center">
                          Download didn't start automatically?
                        </p>
                        <button
                          onClick={() => {
                            const webrtcManager = getWebRTCManager()
                            const success = webrtcManager.triggerManualDownload()
                            if (!success) {
                              // Fallback: try to download the transfer file directly
                              if (transfer?.file) {
                                const url = URL.createObjectURL(transfer.file)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = transfer.file.name
                                a.click()
                                setTimeout(() => URL.revokeObjectURL(url), 1000)
                              } else {
                                alert('Download failed. Please refresh and try again.')
                              }
                            }
                          }}
                          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download File</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {transfer.status === 'transferring' && (
                    <p className="text-xs text-gray-500">
                      Downloading directly from sender's device
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && fileInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Connection failed</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
          )}

        {/* Connecting hint (same position) */}
        {showConnectingHint && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Connecting to sender</p>
                <p className="text-xs text-amber-700 mt-1">
                  If this takes longer than expected, the sender may be offline or their connection may be unstable.
                </p>
              </div>
            </div>
          </motion.div>
        )}

          {/* How It Works */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 mb-6"
        >
          <h4 className="font-medium mb-2 text-gray-900 text-sm">How this works</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Files transfer directly from sender to receiver using peer-to-peer technology. 
            No servers involved, completely private.
            </p>
        </motion.div>

          {/* Back to Home */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
            <Link
              href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            <span>Share your own files</span>
            </Link>
        </motion.div>

        {/* 📱 Mobile Warning Modal - Consistent with site design */}
        <AnimatePresence>
          {showMobileWarning && fileInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={handleMobileWarningCancel}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Clean and centered */}
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Download on mobile?</h3>
                </div>

                {/* Content - File info and explanation */}
                <div className="px-6 pb-6">
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        {fileInfo.fileName.includes('.') ? 
                          <span className="text-xs font-medium text-gray-600">
                            {fileInfo.fileName.split('.').pop()?.toUpperCase()}
                          </span> :
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fileInfo.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {(fileInfo.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-600 mb-5">
                    <p className="mb-3">This file transfers directly between devices. Mobile browsers may struggle with larger files due to memory and connection limitations.</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Try desktop for best results or ask sender to split large files</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Compact button style */}
                <div className="px-6 pb-6 space-y-2.5">
                  <button
                    onClick={handleMobileWarningContinue}
                    disabled={isConnecting}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Starting Download...</span>
                      </>
                    ) : (
                      'Download Anyway'
                    )}
                  </button>
                  <button
                    onClick={handleMobileWarningCancel}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Warning Modal for Receiver */}
        {securityWarning && (
          <SecurityWarning
            warning={securityWarning.warning}
            file={{ name: securityWarning.fileName, size: securityWarning.fileSize } as File}
            onApprove={handleReceiverSecurityApprove}
            onCancel={handleReceiverSecurityCancel}
          />
        )}
      </div>
    </div>
  )
} 