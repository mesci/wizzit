'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, AlertTriangle, Info, CheckCircle, X } from 'lucide-react'
import { SecurityWarning as SecurityWarningType } from '@/lib/security'
import { formatFileSize } from '@/lib/utils'

interface SecurityWarningProps {
  warning: SecurityWarningType
  file: File
  onApprove: () => void
  onCancel: () => void
}

export default function SecurityWarning({ 
  warning, 
  file, 
  onApprove, 
  onCancel 
}: SecurityWarningProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleApprove = () => {
    setIsVisible(false)
    setTimeout(onApprove, 150) // Wait for exit animation
  }

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(onCancel, 150) // Wait for exit animation
  }

  const getIcon = () => {
    switch (warning.type) {
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <Shield className="w-5 h-5 text-gray-500" />
    }
  }

  const getBorderColor = () => {
    switch (warning.type) {
      case 'caution':
        return 'border-amber-200'
      case 'info':
        return 'border-blue-200'
      default:
        return 'border-gray-200'
    }
  }

  const getBackgroundColor = () => {
    switch (warning.type) {
      case 'caution':
        return 'bg-amber-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200"
          >
            {/* Header */}
            <div className={`flex items-center gap-3 p-6 pb-4 border-b ${getBorderColor()}`}>
              <div className={`p-2 rounded-lg ${getBackgroundColor()}`}>
                {getIcon()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {warning.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Security notice for your file transfer
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {warning.message}
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <p className="text-xs text-gray-600">
                      This is an informational notice. You can choose to continue or cancel the transfer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel Transfer
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Continue Anyway
                </button>
              </div>
            </div>

            {/* Subtle close button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}