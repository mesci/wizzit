'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Link, AlertCircle, Clock, Zap } from 'lucide-react'
import { copyToClipboard, formatFileSize } from '@/lib/utils'
import { FileTransfer } from '@/types'

interface ShareModalProps {
  url: string
  fileName: string
  fileSize?: number
  transfers?: FileTransfer[]
  vpnDetected?: boolean
  onClose: () => void
}

// Helper function to calculate transfer speed with throttling
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
  const timePerPercent = elapsedTime / transfer.progress
  const remainingSeconds = Math.round(remainingProgress * timePerPercent)
  
  if (remainingSeconds < 60) return `${remainingSeconds}s remaining`
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

export function ShareModal({ url, fileName, fileSize, transfers = [], vpnDetected = false, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showNFC, setShowNFC] = useState(false)
  
  // 🚀 PERFORMANCE: Use throttled progress for smooth UI
  const activeTransfer = transfers.find(t => t.status === 'transferring' || t.status === 'connecting')
  const throttledProgress = useThrottledProgress(activeTransfer?.progress || 0)

  const handleCopyLink = async () => {
    const success = await copyToClipboard(url)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasActiveTransfers = transfers.length > 0

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" 
        onClick={onClose}
      >
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md border border-gray-200 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="gr-check" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F4C015" />
                        <stop offset="100%" stopColor="#FF9822" />
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" fill="url(#gr-check)" />
                    <path d="M7.5 12.5l3 3L16.5 9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-medium text-gray-900">File ready</h2>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span className="truncate max-w-32 sm:max-w-40">{fileName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="flex-shrink-0">{formatFileSize(fileSize || 0)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VPN Warning */}
          <AnimatePresence>
            {vpnDetected && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="border-b border-amber-200 bg-amber-50 p-4 sm:p-6 flex-shrink-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-amber-800 mb-1">
                      VPN optimization active
                    </h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Your VPN connection has been detected. Link generation may be slightly slower, but transfers will work normally.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transfer Progress - Moved to top */}
          {hasActiveTransfers && (
            <div className="border-b border-gray-200 bg-gray-50 p-4 sm:p-6 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-sm font-medium text-gray-900 mb-3">Transfer Progress</h3>
                <div className="space-y-3">
                  {transfers.map(transfer => {
                    const transferSpeed = calculateTransferSpeed(transfer)
                    const remainingTime = estimateRemainingTime(transfer)
                    const transferredBytes = (transfer.progress / 100) * (transfer.file?.size || 0)
                    
                    return (
                      <div key={transfer.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              transfer.status === 'completed' ? 'bg-green-500' : 
                              transfer.status === 'transferring' ? 'bg-blue-500 animate-pulse' :
                              transfer.status === 'pending-approval' ? 'bg-amber-500 animate-pulse' :
                              transfer.status === 'cancelled' ? 'bg-red-500' :
                              transfer.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                              {transfer.status === 'completed' ? 'Complete' : 
                               transfer.status === 'transferring' ? 'Transferring...' :
                               transfer.status === 'pending-approval' ? 'Waiting for recipient approval...' :
                               transfer.status === 'cancelled' ? 'Recipient cancelled transfer' :
                               transfer.status === 'failed' ? 'Transfer failed' :
                               'Connecting...'}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 font-medium">
                            {Math.round(activeTransfer?.id === transfer.id ? throttledProgress : (transfer.progress || 0))}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-2">
                          <motion.div 
                            className={`h-1.5 sm:h-2 rounded-full ${
                              transfer.status === 'completed' ? 'bg-green-500' : 
                              transfer.status === 'cancelled' || transfer.status === 'failed' ? 'bg-red-500' :
                              transfer.status === 'pending-approval' ? 'bg-amber-500' : 
                              'bg-gray-900'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${activeTransfer?.id === transfer.id ? throttledProgress : (transfer.progress || 0)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        {/* Transfer Details */}
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {formatFileSize(transferredBytes)} / {formatFileSize(transfer.file?.size || 0)}
                          </span>
                          {transfer.status === 'transferring' && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-blue-500" />
                              <span>{transferSpeed}</span>
                            </div>
                          )}
                        </div>

                        {remainingTime && transfer.status === 'transferring' && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{remainingTime}</span>
                          </div>
                        )}

                        {transfer.status === 'completed' && (
                          <div className="flex items-center gap-1 text-xs text-green-700 mt-1">
                            <Check className="w-3 h-3" />
                            <span>Transfer complete</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Important UX Warning */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">Keep this tab open</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Don't close this tab until transfer completes.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

              {/* Share Link Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-sm font-medium text-gray-900 mb-3">Share link</h3>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-xs text-gray-600 font-mono break-all">
                      {url}
                    </p>
                  </div>
                  
                  {/* Copy Button - Light */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className={`px-2 sm:px-3 py-2 sm:py-3 rounded-md transition-all duration-200 flex items-center justify-center ${
                      copied 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Share Button */}
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        try {
                          await navigator.share({
                            title: `File: ${fileName}`,
                            text: `Check out this file: ${fileName}`,
                            url: url
                          })
                        } catch (err) {
                          if (err instanceof Error && err.name !== 'AbortError') {
                            handleCopyLink()
                          }
                        }
                      }}
                      className="px-2 sm:px-3 py-2 sm:py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-all duration-200 flex items-center justify-center"
                      title="Share with apps"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </motion.button>
                  )}
                </div>
                {copied && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-600 mt-2"
                  >
                    Link copied to clipboard
                  </motion.p>
                )}
              </motion.div>

              {/* QR Code Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h3 className="text-sm font-medium text-gray-900 mb-3">QR Code</h3>
                <div className="inline-block p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
                  <QRCode 
                    value={url} 
                    size={100} 
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ display: 'block' }}
                    className="sm:w-[120px] sm:h-[120px]"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan with phone camera</p>
              </motion.div>

              {/* Status when no transfers - Simple message, no spinner */}
              {!hasActiveTransfers && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 border border-gray-200">
                    <Link className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-900 font-medium mb-1">Ready to share</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Share the link or QR code above to start transfer
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 pt-0 flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <img 
                  src="/icon.svg" 
                  alt="Wizzit" 
                  className="w-4 h-4 flex-shrink-0"
                />
                <span>Direct peer-to-peer transfer with zero server storage</span>
              </div>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 