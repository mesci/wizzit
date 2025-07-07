'use client'

import { motion } from 'framer-motion'
import { FileTransfer } from '@/types'
import { formatFileSize, getFileIcon, getProgressMessage } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'

interface TransferProgressProps {
  transfer: FileTransfer
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export function TransferProgress({ 
  transfer, 
  onPause, 
  onResume, 
  onCancel 
}: TransferProgressProps) {


  const getStatusIcon = () => {
    switch (transfer.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'transferring':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (transfer.status) {
      case 'pending':
        return 'Waiting for connection...'
      case 'connecting':
        return 'Establishing connection...'
      case 'transferring':
        return getProgressMessage(transfer.progress)
      case 'completed':
        return 'Transfer completed'
      case 'failed':
        return 'Transfer failed'
      default:
        return 'Unknown status'
    }
  }

  const calculateSpeed = () => {
    if (transfer.status !== 'transferring' || transfer.progress === 0) return null
    
    let elapsed: number
    
    if (transfer.startTime) {
      elapsed = (Date.now() - transfer.startTime.getTime()) / 1000
    } else {
      // Fallback: estimate based on lastUpdated timestamp
      const now = Date.now()
      const lastUpdate = (transfer as any).lastUpdated || now
      elapsed = Math.max((now - lastUpdate) / 1000, 1) // At least 1 second
      
      // For receivers, use a reasonable estimate based on progress
      if (elapsed < 5) {
        elapsed = (transfer.progress / 100) * 30 // Assume 30 seconds for full transfer
      }
    }
    
    if (elapsed === 0) return null
    
    const bytesTransferred = (transfer.progress / 100) * transfer.file.size
    const bytesPerSecond = bytesTransferred / elapsed
    
    return formatFileSize(bytesPerSecond) + '/s'
  }

  const calculateTimeRemaining = () => {
    if (transfer.status !== 'transferring' || transfer.progress === 0 || transfer.progress >= 100) {
      return null
    }
    
    let elapsed: number
    
    if (transfer.startTime) {
      elapsed = (Date.now() - transfer.startTime.getTime()) / 1000
    } else {
      // Use same fallback as calculateSpeed
      const now = Date.now()
      const lastUpdate = (transfer as any).lastUpdated || now
      elapsed = Math.max((now - lastUpdate) / 1000, 1)
      
      if (elapsed < 5) {
        elapsed = (transfer.progress / 100) * 30
      }
    }
    
    if (elapsed === 0) return null
    
    const bytesTransferred = (transfer.progress / 100) * transfer.file.size
    const bytesRemaining = transfer.file.size - bytesTransferred
    const speed = bytesTransferred / elapsed
    
    if (speed === 0) return null
    
    const secondsRemaining = bytesRemaining / speed
    
    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s remaining`
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m remaining`
    } else {
      return `${Math.round(secondsRemaining / 3600)}h remaining`
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-center gap-4">
        
        {/* File Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative flex-shrink-0"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center shadow-sm">
            <div className="text-xl">{getFileIcon(transfer.file.name)}</div>
          </div>
          
          {/* Progress ring */}
          <div className="absolute -inset-1">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="2"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke={transfer.status === 'completed' ? '#10b981' : '#3b82f6'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 26 * (1 - transfer.progress / 100) 
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          
          {/* File info */}
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {transfer.file.name}
              </h3>
              <p className="text-sm text-gray-500">
                {formatFileSize(transfer.file.size)}
              </p>
            </div>
            
            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              transfer.status === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : transfer.status === 'failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {transfer.status === 'completed' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {transfer.status === 'failed' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {transfer.status !== 'completed' && transfer.status !== 'failed' && (
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              )}
              <span className="capitalize">
                {transfer.status === 'completed' ? 'Complete' : transfer.status}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{Math.round(transfer.progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  transfer.status === 'completed' 
                    ? 'bg-green-500' 
                    : transfer.status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${transfer.progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            {transfer.speed && transfer.speed > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-gray-600">{formatFileSize(transfer.speed)}/s</span>
              </div>
            )}
            
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-600">P2P</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 