'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, File as FileIcon } from 'lucide-react'
import { FileUpload } from '@/components/FileUpload'
import { ShareModal } from '@/components/ShareModal'
import { Header } from '@/components/Header'
// (removed duplicate react import)

import { FileTransfer } from '@/types'
import { getWebRTCManager } from '@/lib/webrtc'
import { getRandomWittyMessage, sha256Hex } from '@/lib/utils'
import { logger } from '@/lib/logger'


// Simple animated text component
function AnimatedText() {
  const words = ['Privately', 'Securely', 'via P2P', 'Carbon-Free', 'Directly']
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-16 flex items-center justify-center max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.3,
            ease: "easeInOut"
          }}
          className="absolute font-black text-4xl md:text-5xl lg:text-6xl tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#F4C015] to-[#FF9822] uppercase leading-none text-center"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [transfers, setTransfers] = useState<FileTransfer[]>([])
  const [shareData, setShareData] = useState<{ transferId: string; url: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connections, setConnections] = useState<any[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [vpnWarning, setVpnWarning] = useState<boolean>(false)
  const [transfersTotal, setTransfersTotal] = useState<number | null>(null)
  const [pin, setPin] = useState<string>('')
  const [pinEnabled, setPinEnabled] = useState<boolean>(false)
  const [linkOpened, setLinkOpened] = useState<boolean>(false)

  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, -30])

  useEffect(() => {
    const webrtcManager = getWebRTCManager()
    
    // Set up VPN warning callback
    webrtcManager.onVpnDetected = (type: 'sender' | 'receiver') => {
      setVpnWarning(true)
      logger.log(`🚨 VPN detected on ${type} side`)
    }
    
    webrtcManager.setCallbacks(
      (transfer) => {
        setTransfers(prev => {
          const index = prev.findIndex(t => t.id === transfer.id)
          if (index >= 0) {
            const newTransfers = [...prev]
            newTransfers[index] = transfer
            return newTransfers
          }
          return [...prev, transfer]
        })
      },
      (connection) => {
        setConnections(prev => {
          const index = prev.findIndex(c => c.id === connection.id)
          if (index >= 0) {
            const newConnections = [...prev]
            newConnections[index] = connection
            return newConnections
          }
          return [...prev, connection]
        })

        // Show generic connection error to the sender if connection fails
        // DISABLED: These errors are triggering on successful transfers  
        // if (connection.type === 'sender' && (connection.status === 'failed' || connection.status === 'disconnected')) {
        //   setUploadError('Connection to receiver failed. They may be offline or have closed their browser. Please try creating a new share link.')
        // }
      }
    )

    return () => {
      webrtcManager.cleanup()
    }
  }, [])

  // Public transfers counter – fetch every 60s
  useEffect(() => {
    let timer: any
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        const data = await res.json()
        if (typeof data?.total === 'number') setTransfersTotal(data.total)
      } catch {}
      timer = setTimeout(fetchStats, 60000)
    }
    fetchStats()
    return () => timer && clearTimeout(timer)
  }, [])

  // Warn on tab close if there are active transfers
  useEffect(() => {
    const hasActiveTransfers = transfers.some(
      (t) => t.status === 'transferring' || t.status === 'connecting' || t.status === 'pending-approval'
    )

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if there are active transfers
      if (hasActiveTransfers) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
      }
    }

    if (hasActiveTransfers) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [transfers])

  // Confirm before closing share modal if transfers are active
  const handleRequestCloseShare = useCallback(() => {
    const hasActiveTransfers = transfers.some(
      (t) => t.status === 'transferring' || t.status === 'connecting' || t.status === 'pending-approval'
    )
    if (hasActiveTransfers) {
      const ok = window.confirm('Closing will stop the ongoing transfer. Do you want to proceed?')
      if (!ok) return
    }
    // Call after declaration via setTimeout to avoid order issues
    setTimeout(() => handleCloseShare(), 0)
  }, [transfers])

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setIsLoading(true)
    
    // Clear any previous transfers and share data
    setTransfers([])
    setShareData(null)
    // Reset PIN/link-open state for new transfer
    setPin('')
    setPinEnabled(false)
    setLinkOpened(false)
    
    try {
      logger.log('⏱️ Starting file upload process...')
      const startTime = Date.now()
      
      const webrtcManager = getWebRTCManager()
      
      // Clean up any previous connections
      webrtcManager.cleanup()
      
      const { transferId, offer } = await webrtcManager.createSender(file)
      
      logger.log(`⏱️ WebRTC createSender took: ${Date.now() - startTime}ms`)
      const apiStartTime = Date.now()
      
      const transferData: any = {
        transferId,
        offer: JSON.stringify(offer),
        fileName: file.name,
        fileSize: file.size,
        senderHasVpn: vpnWarning // Include VPN info for receiver
      }

      // Optional PIN
      if (pinEnabled && pin && pin.length > 0) {
        try {
          transferData.pinHash = await sha256Hex(pin)
        } catch {}
      }
      
      logger.log('📡 Sending transfer data to API:', {
        transferId: transferData.transferId,
        fileName: transferData.fileName,
        fileSize: transferData.fileSize,
        senderHasVpn: transferData.senderHasVpn,
        vpnWarningState: vpnWarning
      })
      
      // Store transfer data on server and get short ID
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData)
      })
      
      logger.log(`⏱️ API call took: ${Date.now() - apiStartTime}ms`)
      
      if (!response.ok) {
        throw new Error('Failed to create share link')
      }
      
      const { shortId } = await response.json()
      const shareUrl = `${window.location.origin}/s/${shortId}`
      
      logger.log(`⏱️ Total process took: ${Date.now() - startTime}ms, shortId: ${shortId}`)
      
      setShareData({ transferId, url: shareUrl })
      setLinkOpened(false)
      
      // Start listening for answers from receivers
      startSignalingPolling(transferId, webrtcManager)
      
    } catch (error) {
      logger.error('Error creating transfer:', error)
      
      // Enhanced error handling for WARP/VPN users
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('timeout') || errorMessage.includes('gathering')) {
        setUploadError('Connection setup is taking longer than usual. This may happen with VPN or WARP enabled. Please wait a moment and try again.')
      } else if (errorMessage.includes('ice') || errorMessage.includes('ICE')) {
        setUploadError('Network connectivity issue detected. If you\'re using VPN or WARP, try disabling it temporarily.')
      } else {
        setUploadError('Connection failed. If you\'re using VPN/WARP, please try again or disable it temporarily.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Function to poll for signaling messages
  const startSignalingPolling = useCallback(async (transferId: string, webrtcManager: any) => {
    logger.log('🚀 Starting optimized signaling polling for transfer:', transferId)
    let pollCount = 0
    let isPolling = true
    
    // 🚀 CRITICAL PERFORMANCE: Exponential backoff to reduce server load
    const getPollingInterval = (attempt: number) => {
      if (attempt < 5) return 1000 // First 5 attempts: 1 second
      if (attempt < 15) return 2000 // Next 10 attempts: 2 seconds  
      return 5000 // After that: 5 seconds
    }
    
    const pollForSignals = async () => {
      if (!isPolling) return
      
      pollCount++
      
      try {
        const response = await fetch('/api/signal', {
          method: 'GET',
          headers: {
            'X-Transfer-Id': transferId,
          },
        })
        
        if (!response.ok) {
          logger.log('📭 No signals available, continuing...')
          scheduleNextPoll()
          return
        }
        
        const { signals } = await response.json()
        // Detect receiver link open (first access) via heartbeat signal (peer-info or first candidate)
        if (!linkOpened && Array.isArray(signals) && signals.length > 0) {
          setLinkOpened(true)
        }
        
        if (signals && signals.length > 0) {
          logger.log('📮 Processing signals:', signals)
          
          for (const signal of signals) {
            logger.log('🔍 Processing signal:', signal)
            
            if (signal.type === 'answer') {
              logger.log('✅ Found answer! Processing answer from receiver:', signal.data)
              
              try {
                // Handle the answer to complete the connection
                await webrtcManager.handleAnswer(transferId, signal.data)
                logger.log('🎉 Answer processed successfully! Connection established (continuing to poll for ICE candidates).')
              } catch (answerError) {
                logger.error('💥 Error processing answer:', answerError)
              }
            } else if (signal.type === 'peer-info') {
              try {
                const remoteId = signal.data?.receiverConnectionId
                if (remoteId) {
                  logger.log('🔗 Registering receiver connection id for trickle ICE:', remoteId)
                  await webrtcManager.registerRemotePeer(transferId, remoteId)
                }
              } catch (e) {
                logger.error('❌ Failed to register remote peer id:', e)
              }
            } else if (signal.type === 'ice-candidate') {
              try {
                logger.log('🧊 Adding remote ICE candidate from receiver')
                await webrtcManager.addIceCandidate(transferId, signal.data)
              } catch (candErr) {
                logger.error('❌ Failed to add ICE candidate:', candErr)
              }
            }
          }
        } else {
          logger.log('📭 No signals received, continuing...')
        }
        
        scheduleNextPoll()
        
      } catch (error) {
        logger.error('💥 Error polling for signals:', error)
        scheduleNextPoll()
      }
    }
    
    const scheduleNextPoll = () => {
      if (!isPolling) return
      
      const interval = getPollingInterval(pollCount)
      logger.log(`⏰ Scheduling next poll in ${interval}ms (attempt ${pollCount})`)
      
      setTimeout(pollForSignals, interval)
    }
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      isPolling = false
      logger.log('⏰ Signaling polling stopped after 5 minute timeout')
    }, 300000)
    
    // Start first poll immediately
    logger.log('⚡ Starting first poll immediately')
    pollForSignals()
    
    // Return cleanup function
    return () => {
      isPolling = false
      logger.log('🧹 Signaling polling manually stopped')
    }
  }, [])

  const handleCloseShare = useCallback(() => {
    setShareData(null)
    setSelectedFile(null)
    setTransfers([]) // Clear transfers state
    setConnections([]) // Clear connections state
    setUploadError(null)
    // Reset PIN/link-open state when closing modal
    setPin('')
    setPinEnabled(false)
    setLinkOpened(false)
    
    // Clean up WebRTC connections
    const webrtcManager = getWebRTCManager()
    webrtcManager.cleanup()
    
    logger.log('🧹 Cleaned up all state and connections on modal close')
  }, [])

  return (
    <div className="min-h-screen bg-white">
      
      {/* Minimal grid pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <Header />
      
      {/* Main Content */}
      <main className="relative z-10">
        
        {/* Minimal Hero Section */}
        <motion.section 
          style={{ y: heroY }}
          className="min-h-screen flex flex-col justify-center items-center text-center px-6 pt-20 pb-16 relative overflow-hidden"
        >
          {/* Modern Grid Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  conic-gradient(from 0deg at 50% 50%, rgba(0,0,0,0.06) 0deg, transparent 45deg, rgba(0,0,0,0.04) 90deg, transparent 135deg, rgba(0,0,0,0.03) 180deg, transparent 225deg, rgba(0,0,0,0.05) 270deg, transparent 315deg),
                  radial-gradient(ellipse 120px 60px at 30% 70%, rgba(0,0,0,0.02) 0%, transparent 70%),
                  radial-gradient(ellipse 80px 40px at 70% 30%, rgba(0,0,0,0.03) 0%, transparent 60%),
                  linear-gradient(127deg, transparent 48%, rgba(0,0,0,0.01) 49%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.01) 51%, transparent 52%)
                `,
                backgroundSize: '120px 120px, 200px 200px, 150px 150px, 80px 80px',
                backgroundPosition: '0 0, 40px 20px, -30px 60px, 0 0',
                maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 15%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0) 85%)',
                WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 15%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0) 85%)'
              }}
            />
          </div>

          {/* Soft Mesh Gradient Background with Fade */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              opacity: [0.4, 0.6, 0.4],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: [0.23, 1, 0.32, 1]
            }}
            style={{
              background: `
                radial-gradient(ellipse 1200px 800px at 30% 20%, rgba(244, 192, 21, 0.15) 0%, rgba(244, 192, 21, 0.05) 40%, transparent 70%),
                radial-gradient(ellipse 800px 1000px at 70% 80%, rgba(255, 152, 34, 0.12) 0%, rgba(255, 152, 34, 0.04) 40%, transparent 70%),
                radial-gradient(ellipse 1000px 600px at 50% 50%, rgba(244, 192, 21, 0.08) 0%, rgba(244, 192, 21, 0.02) 50%, transparent 80%)
              `,
              filter: 'blur(60px)',
              maskImage: 'radial-gradient(ellipse 100% 80% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0) 100%)'
            }}
          />

          <div className="max-w-2xl mx-auto w-full relative z-10">
            
            {/* Spacer to maintain header distance */}
            <div className="mb-24" />

            {/* Modern Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-12"
            >
              <div className="text-center mb-2 md:mb-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-0 md:mb-1 uppercase" style={{ lineHeight: '0.8' }}>
                  Share Files
                </h1>
                <AnimatedText />
              </div>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Experience true peer-to-peer file sharing. No cloud storage, no data collection, no compromises on your privacy.
              </p>
            </motion.div>

            {/* Minimal upload component */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-16"
            >
              {!selectedFile && !isLoading && (
                <FileUpload onFileSelect={handleFileSelect} />
              )}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="w-full max-w-md mx-auto"
                >
                  {/* Main glassmorphism container */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-orange-200/40 backdrop-blur-md bg-white/80 shadow-xl shadow-orange-500/10">
                    
                    {/* Animated gradient background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-[#F4C015]/5 via-transparent to-[#FF9822]/5"
                      animate={{ 
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.02, 1],
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: [0.23, 1, 0.32, 1]
                      }}
                    />
                    
                    {/* Subtle animated mesh pattern */}
                    <motion.div
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(244, 192, 21, 0.4) 1px, transparent 0)`,
                        backgroundSize: '20px 20px'
                      }}
                      animate={{
                        backgroundPosition: ['0px 0px', '20px 20px']
                      }}
                      transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                    
                    {/* Content */}
                    <div className="relative p-10 min-h-[280px] flex flex-col items-center justify-center">
                      
                      {/* Glass Icon with Connection Animation */}
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        {/* Main glass container */}
                        <motion.div
                          animate={{ 
                            scale: [1, 1.05, 1],
                            rotateY: [0, 2, 0]
                          }}
                          transition={{ 
                            duration: 3,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                          className="w-full h-full rounded-2xl backdrop-blur-md bg-white/80 border border-gray-200/60 flex items-center justify-center shadow-lg shadow-gray-900/5"
                        >
                          {/* Connection icon with signal pulse animation */}
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                          >
                            <svg className="w-8 h-8 text-[#F4C015]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <motion.path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2.5} 
                                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                                animate={{
                                  opacity: [0.4, 1, 0.4],
                                  pathLength: [0.8, 1, 0.8]
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: [0.23, 1, 0.32, 1]
                                }}
                              />
                            </svg>
                          </motion.div>
                        </motion.div>

                        {/* Animated glassy layers for depth */}
                            <motion.div
                          className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none"
                          style={{ rotate: '6deg' }}
                          animate={{ 
                            opacity: [0.3, 0.6, 0.3],
                            rotate: ['6deg', '8deg', '6deg']
                          }}
                              transition={{ 
                            duration: 4,
                                repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-2xl border border-gray-200/30 pointer-events-none"
                          style={{ rotate: '-6deg' }}
                          animate={{ 
                            opacity: [0.2, 0.4, 0.2],
                            rotate: ['-6deg', '-8deg', '-6deg']
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1],
                            delay: 0.5
                          }}
                        />
                        
                        {/* Glow effect */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          animate={{ 
                            boxShadow: [
                              '0 0 0px rgba(244, 192, 21, 0)',
                              '0 0 8px rgba(244, 192, 21, 0.05)',
                              '0 0 0px rgba(244, 192, 21, 0)'
                            ]
                          }}
                          transition={{ 
                            duration: 3,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                            />
                          </div>
                          
                      {/* Text content */}
                      <div className="space-y-4 text-center">
                        <motion.h3 
                          className="text-xl font-semibold text-gray-900"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                        >
                          Creating Secure Connection
                        </motion.h3>
                        
                        {/* Witty message with fade animation */}
                        <motion.p 
                          className="text-sm text-gray-600 font-medium"
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ 
                            duration: 1.5,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                        >
                          {getRandomWittyMessage()}
                        </motion.p>
                        
                        {/* Enhanced progress dots */}
                        <div className="flex items-center justify-center gap-2 pt-2">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-gradient-to-r from-[#F4C015] to-[#FF9822] rounded-full"
                              animate={{ 
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.4, 1]
                              }}
                              transition={{ 
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                            />
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden mt-4">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#F4C015] to-[#FF9822] rounded-full"
                            animate={{ 
                              x: ['-100%', '100%']
                            }}
                            transition={{ 
                              duration: 2.5,
                              repeat: Infinity,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                          />
                        </div>
                        
                        {/* Subtle hint text */}
                        <motion.p 
                          className="text-xs text-gray-500 mt-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.5, duration: 0.5 }}
                        >
                          Setting up peer-to-peer connection...
                        </motion.p>
                      </div>
                    </div>

                    {/* Enhanced bottom indicator */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F4C015]/60 to-transparent rounded-b-2xl backdrop-blur-sm"
                      animate={{ 
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: [0.23, 1, 0.32, 1]
                      }}
                    />
                    
                    {/* Glow effect around container */}
                          <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                            animate={{ 
                        boxShadow: [
                          '0 0 0 1px rgba(244, 192, 21, 0.1), 0 0 30px rgba(244, 192, 21, 0.05)',
                          '0 0 0 1px rgba(255, 152, 34, 0.2), 0 0 30px rgba(255, 152, 34, 0.1)',
                          '0 0 0 1px rgba(244, 192, 21, 0.1), 0 0 30px rgba(244, 192, 21, 0.05)'
                        ]
                            }}
                            transition={{ 
                        duration: 3,
                              repeat: Infinity,
                        ease: [0.23, 1, 0.32, 1]
                            }}
                          />
                   </div>
                </motion.div>
              )}
              
              {/* VPN Warning */}
              <AnimatePresence>
                {vpnWarning && isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="mt-6 w-full max-w-md mx-auto"
                  >
                    {/* Glassmorphism warning container */}
                    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200/40 backdrop-blur-md bg-white/80 shadow-lg shadow-amber-500/10">
                      
                      {/* Animated gradient background */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-orange-400/5"
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.01, 1],
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                      />
                      
                      {/* Content */}
                      <div className="relative p-4 flex items-start gap-3">
                        
                        {/* Warning icon container */}
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.05, 1],
                              rotate: [0, 1, 0]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                            className="w-full h-full rounded-xl backdrop-blur-md bg-amber-100/80 border border-amber-200/60 flex items-center justify-center shadow-sm"
                          >
                            <motion.div
                              animate={{ 
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ 
                                duration: 1.5,
                                repeat: Infinity,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                            >
                              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                            </motion.div>
                          </motion.div>
                      </div>
                        
                        {/* Text content */}
                        <div className="flex-1 min-w-0">
                          <motion.h4 
                            className="text-sm font-semibold text-amber-800 mb-1"
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                          >
                            Network Optimization
                          </motion.h4>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          VPN detected. This may slightly slow down the link generation process, but transfers will work normally.
                        </p>
                      </div>
                        
                        {/* Close button */}
                        <motion.button
                        onClick={() => setVpnWarning(false)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-shrink-0 w-6 h-6 rounded-lg bg-amber-100/50 hover:bg-amber-200/50 flex items-center justify-center text-amber-500 hover:text-amber-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        </motion.button>
                    </div>

                      {/* Bottom indicator */}
            <motion.div
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent rounded-b-2xl"
                        animate={{ 
                          opacity: [0.4, 0.8, 0.4]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                      />
                  </div>
                </motion.div>
                )}
              </AnimatePresence>
            </motion.div>



          </div>
        </motion.section>

        {/* Active Transfers removed per request */}

        {/* Why choose Wizzit */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="mb-6">
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Why choose Wizzit?</span>
              </div>
              
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
                True peer-to-peer transfers with zero server storage. Your files go directly from you to your recipient. Private, fast, and limitless.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="/how-it-works" 
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Learn How It Works
                  <ArrowUpRight className="w-4 h-4" />
                </a>
                <a 
                  href="/about" 
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors duration-200"
                >
                  Our Mission
                </a>
              </div>
            </motion.div>

            {/* Top Row - Two Rectangular Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              
              {/* Other Services Card */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-[#FBFBFB] rounded-xl p-12 h-[400px] lg:h-[480px] flex flex-col items-center text-center"
              >
                <div className="flex-1"></div>
                
                <div className="mb-0">
                  <h3 className="text-base font-medium text-gray-900 mb-3 tracking-tight">
                    TRADITIONAL SERVICES
                  </h3>
                  <p className="text-gray-600 text-xs leading-relaxed font-normal max-w-[85%] mx-auto">
                    Upload files to someone else's servers. Hope they don't get hacked. 
                    Pay for storage. Wonder who else can see your files.
                  </p>
                </div>
                
                {/* Third Party Image */}
                <div className="flex items-center justify-center mb-2 -mt-4 lg:mt-0">
                  <img 
                    src="/third-party.png" 
                    alt="Traditional file sharing services upload files to servers - security and privacy concerns" 
                    className="w-72 h-72 lg:w-96 lg:h-96 object-contain"
                  />
                </div>
              </motion.div>

              {/* Wizzit Card */}
                  <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-[#FBFBFB] rounded-xl p-12 h-[400px] lg:h-[480px] flex flex-col items-center text-center"
              >
                <div className="flex-1"></div>
                
                <div className="mb-0">
                  <h3 className="text-base font-medium text-gray-900 mb-3 tracking-tight">
                    WIZZIT EXPERIENCE
                    </h3>
                  <p className="text-gray-600 text-xs leading-relaxed font-normal max-w-[85%] mx-auto">
                    Select file. Share link instantly. Your friend downloads directly from you. 
                    No servers, no limits. Just works.
                    </p>
            </div>
                
                {/* P2P Image */}
                <div className="flex items-center justify-center mb-2 -mt-4 lg:mt-0">
                  <img 
                    src="/f_p2p.png" 
                    alt="Wizzit peer-to-peer file transfer - direct device to device sharing without servers" 
                    className="w-72 h-72 lg:w-96 lg:h-96 object-contain"
                  />
          </div>
              </motion.div>
            </div>

            {/* Bottom Row - Horizontal Rectangle */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-[#FBFBFB] rounded-xl p-14 min-h-[280px]"
            >
                              <div className="flex flex-col lg:flex-row items-center justify-center gap-16 h-full">
                                <div className="lg:w-1/2 flex flex-col justify-center text-center lg:text-left">
                  <h3 className="text-base font-medium text-gray-900 mb-3 tracking-tight">
                    BANK-LEVEL SECURITY
                  </h3>
                    <p className="text-gray-600 text-xs leading-relaxed font-normal mb-4 max-w-[90%] mx-auto lg:mx-0">
                    Your files are protected with DTLS 1.3 encryption - the same technology banks use. 
                    Even we can't see what you're sending. True privacy by design.
                  </p>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-green-600 font-normal">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    No server storage
                  </div>
                </div>
                
                {/* E2E Encryption Image */}
                  <div className="lg:w-1/2 flex justify-center items-center">
                    <img 
                      src="/e2e-code.png" 
                      alt="DTLS 1.3 end-to-end encryption - bank-level security for P2P file transfers" 
                      className="w-88 h-88 object-contain"
                    />
                  </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Minimal footer */}
        <footer className="py-6 px-6">
          <div className="max-w-6xl mx-auto border-t border-gray-100 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              
              {/* Left - Turkiye, email, legal with modern separators */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-gray-500 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <img src="/flag-of-turkey.svg" alt="Turkish Flag" className="w-4 h-3" />
                  <span>Built in Turkiye</span>
                </div>
                
                <span className="text-gray-300">|</span>
                
                <span className="text-gray-500">
                  yusuf(@)mesci.dev
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                {/* Public Transfers counter */}
                {typeof transfersTotal === 'number' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#F4C015]/50 bg-[#F4C015]/10 text-[#A87800] sm:ml-2 mt-1 sm:mt-0">
                    <FileIcon className="w-3.5 h-3.5" />
                    <span className="font-medium">Total Transfers:</span>
                    <span className="tabular-nums">{new Intl.NumberFormat('en-US').format(transfersTotal)}</span>
                  </span>
                )}
              </div>
              
              {/* Right - Carbon footprint image */}
              <div className="order-first sm:order-last">
                <img 
                  src="/carbon-footprint.png" 
                  alt="Lower Carbon Footprint - With No Cloud-Storage"
                  className="h-10"
                />
              </div>
              
            </div>
          </div>
        </footer>

      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {shareData && (
          <ShareModal
            url={shareData.url}
            fileName={selectedFile?.name || 'Unknown File'}
            fileSize={selectedFile?.size}
            transfers={transfers}
            vpnDetected={vpnWarning}
            onClose={handleRequestCloseShare}
            pinEnabled={pinEnabled}
            onTogglePin={setPinEnabled}
            pinValue={pin}
            onPinChange={setPin}
            linkOpened={linkOpened}
          />
        )}
      </AnimatePresence>

      {/* Sender-side error banner */}
      {uploadError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-sm py-3 px-4 text-center">
          {uploadError}
        </div>
      )}
    </div>
  )
} 