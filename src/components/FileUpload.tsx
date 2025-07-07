'use client'

import { useCallback, useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Check, ArrowUp } from 'lucide-react'
import { logger } from '@/lib/logger'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

function GlassIcon({ children, className = "", animate = false }: { 
  children: React.ReactNode
  className?: string
  animate?: boolean
}) {
  return (
    <div className={`relative w-20 h-20 mx-auto ${className}`}>
      {/* Main glass container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ 
          scale: animate ? [1, 1.05, 1] : 1, 
          opacity: 1,
          rotateY: animate ? [0, 5, 0] : 0
        }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ 
          duration: animate ? 3 : 0.35, 
          ease: [0.23, 1, 0.32, 1],
          repeat: animate ? Infinity : 0
        }}
        className="w-full h-full rounded-2xl backdrop-blur-md bg-white/80 border border-gray-200/60 flex items-center justify-center shadow-lg shadow-gray-900/5"
      >
        {children}
      </motion.div>
      
      {/* Animated glassy layers for depth */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none"
        style={{ rotate: '6deg' }}
        animate={{ 
          opacity: animate ? [0.3, 0.6, 0.3] : 0.4,
          rotate: animate ? ['6deg', '8deg', '6deg'] : '6deg'
        }}
        transition={{ 
          duration: animate ? 4 : 0,
          repeat: animate ? Infinity : 0,
          ease: [0.23, 1, 0.32, 1]
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl border border-gray-200/30 pointer-events-none"
        style={{ rotate: '-6deg' }}
        animate={{ 
          opacity: animate ? [0.2, 0.4, 0.2] : 0.2,
          rotate: animate ? ['-6deg', '-8deg', '-6deg'] : '-6deg'
        }}
        transition={{ 
          duration: animate ? 4 : 0,
          repeat: animate ? Infinity : 0,
          ease: [0.23, 1, 0.32, 1],
          delay: 0.5
        }}
      />
      
      {/* Subtle glow effect for loading state */}
      {animate && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ 
            boxShadow: [
              '0 0 0px rgba(59, 130, 246, 0)',
              '0 0 20px rgba(59, 130, 246, 0.15)',
              '0 0 0px rgba(59, 130, 246, 0)'
            ]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: [0.23, 1, 0.32, 1]
          }}
        />
      )}
    </div>
  )
}

export function FileUpload({ onFileSelect, disabled = false }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // 🚀 CRITICAL PERFORMANCE: Memoize file validation to prevent re-computation
  const fileValidator = useMemo(() => (file: File) => {
    // Basic validation - using 1TB limit from webrtc.ts
    const maxSize = 1024 * 1024 * 1024 * 1024 // 1TB - Practically unlimited
    if (file.size > maxSize) {
      return {
        code: 'file-too-large',
        message: 'File is too large (max 1TB)'
      }
    }
    return null
  }, [])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      logger.warn('🚫 File rejected:', rejectedFiles[0].errors)
      alert('File rejected: ' + rejectedFiles[0].errors[0].message)
      return
    }
    
    if (acceptedFiles.length > 0 && !disabled) {
      logger.log('📁 File selected:', acceptedFiles[0].name, 'Size:', acceptedFiles[0].size)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 2000)
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, disabled])

  // 🚀 PERFORMANCE: Memoize dropzone config to prevent re-creation
  const dropzoneConfig = useMemo(() => ({
    onDrop,
    disabled,
    multiple: false,
    validator: fileValidator,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    // Performance optimization - don't read file contents until needed
    noClick: false,
    noKeyboard: false,
    preventDropOnDocument: true
  }), [onDrop, disabled, fileValidator])

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone(dropzoneConfig)

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative cursor-pointer
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <motion.div
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: disabled ? 1 : 1.01 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative"
        >
          {/* Main Container - Enhanced glassmorphism design */}
          <div className={`
            relative overflow-hidden rounded-2xl border-2 transition-all duration-300
            ${dragActive || dropzoneActive 
              ? 'bg-white/95 border-orange-300/50 text-gray-900 shadow-xl shadow-orange-500/10' 
              : isHovered 
                ? 'bg-white/90 border-gray-300/60 shadow-lg shadow-gray-900/5' 
                : 'bg-white/80 border-gray-200/40 shadow-md shadow-gray-900/5'
            }
            backdrop-blur-md
          `}>
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-[#F4C015]/5 via-transparent to-[#FF9822]/5"
              animate={{
                opacity: isHovered || dragActive || dropzoneActive ? 1 : 0,
                scale: isHovered || dragActive || dropzoneActive ? 1.05 : 1,
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
            
            {/* Subtle animated mesh pattern */}
            <motion.div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(244, 192, 21, 0.2) 1px, transparent 0)`,
                backgroundSize: '20px 20px'
              }}
              animate={{
                backgroundPosition: isHovered ? ['0px 0px', '20px 20px'] : '0px 0px'
              }}
              transition={{
                duration: 20,
                repeat: isHovered ? Infinity : 0,
                ease: "linear"
              }}
            />
            
            {/* Content (fixed height for visual consistency) */}
            <div className="relative p-10 min-h-[280px] flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {uploadSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-6 text-center"
                  >
                    {/* Success Icon Container - Animated glass icon */}
                    <GlassIcon animate>
                      <motion.div
                        animate={{ 
                          rotate: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity, ease: [0.23, 1, 0.32, 1] }
                        }}
                      >
                        <Check className="w-8 h-8 text-[#F4C015]" strokeWidth={2.5} />
                      </motion.div>
                    </GlassIcon>
                    
                    <div className="space-y-3">
                      <motion.h3 
                        className="text-xl font-semibold text-gray-900"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: [0.23, 1, 0.32, 1] }}
                      >
                        Ready to Share
                      </motion.h3>
                      
                      {/* Enhanced loading text with dots animation */}
                      <div className="flex items-center justify-center gap-2">
                        <motion.p 
                          className="text-sm text-gray-600 font-medium"
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: [0.23, 1, 0.32, 1] }}
                        >
                          Creating secure connection
                        </motion.p>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1 h-1 bg-[#F4C015] rounded-full"
                              animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Progress indicator */}
                      <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#F4C015] to-[#FF9822] rounded-full"
                          animate={{ 
                            x: ['-100%', '100%']
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                        />
                      </div>
                      
                      {/* Subtle hint text */}
                      <motion.p 
                        className="text-xs text-gray-500 mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                      >
                        This usually takes a few seconds...
                      </motion.p>
                    </div>
                  </motion.div>
                ) : dragActive || dropzoneActive ? (
                  <motion.div
                    key="drag-active"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-6 text-center"
                  >
                    {/* Drop Icon Container - Animated */}
                    <GlassIcon animate>
                      <motion.div
                        animate={{ 
                          y: [-2, 2, -2],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                      >
                        <ArrowUp className="w-8 h-8 text-[#F4C015]" strokeWidth={2.5} />
                      </motion.div>
                    </GlassIcon>
                    
                    <div className="space-y-2">
                      <motion.h3 
                        className="text-xl font-semibold text-gray-900"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: [0.23, 1, 0.32, 1] }}
                      >
                        Drop to Upload
                      </motion.h3>
                      <p className="text-sm text-gray-600 font-medium">
                        Release your file to begin transfer
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 text-center"
                  >
                    {/* Upload Icon Container */}
                    <GlassIcon>
                      <motion.div
                        animate={{ 
                          y: isHovered ? [-1, 1, -1] : 0,
                          scale: isHovered ? [1, 1.05, 1] : 1
                        }}
                        transition={{ 
                          duration: isHovered ? 2 : 0.3,
                          repeat: isHovered ? Infinity : 0,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                      >
                      <Upload
                        className={`w-8 h-8 transition-all duration-300 ${
                            isHovered ? 'text-[#F4C015]' : 'text-gray-500'
                        }`}
                          strokeWidth={2.5}
                      />
                      </motion.div>
                    </GlassIcon>
                    
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Upload Files
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        Drag & drop or click to browse
                      </p>
                    </div>
                    
                    {/* Enhanced Feature indicators */}
                    <div className="pt-2">
                      {/* Mobile: 2 rows, Desktop: 1 row */}
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-center md:gap-8">
                        
                        {/* First row on mobile: No Limit + All Formats */}
                        <div className="flex items-center justify-center gap-6 md:contents">
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: 0.1,
                              duration: 0.3,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                            className="group flex items-center gap-2"
                          >
                            <motion.div 
                              animate={{ 
                                scale: isHovered ? [1, 1.2, 1] : 1
                              }}
                              transition={{
                                duration: 2,
                                repeat: isHovered ? Infinity : 0,
                                delay: 0.1,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                              className="text-gray-500 group-hover:text-gray-700 transition-colors duration-300"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </motion.div>
                            <span className="text-xs font-medium text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                              No Limit
                            </span>
                          </motion.div>

                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                              delay: 0.15,
                            duration: 0.3,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                          className="group flex items-center gap-2"
                        >
                          <motion.div 
                            animate={{ 
                                scale: isHovered ? [1, 1.2, 1] : 1
                              }}
                              transition={{
                                duration: 2,
                                repeat: isHovered ? Infinity : 0,
                                delay: 0.15,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                              className="text-gray-500 group-hover:text-gray-700 transition-colors duration-300"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </motion.div>
                            <span className="text-xs font-medium text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                              All Formats
                            </span>
                          </motion.div>
                        </div>

                        {/* Second row on mobile: Encrypted centered */}
                        <div className="flex items-center justify-center md:contents">
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: 0.2,
                              duration: 0.3,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                            className="group flex items-center gap-2"
                          >
                            <motion.div 
                              animate={{ 
                                scale: isHovered ? [1, 1.2, 1] : 1
                              }}
                              transition={{
                                duration: 2,
                                repeat: isHovered ? Infinity : 0,
                                delay: 0.2,
                                ease: [0.23, 1, 0.32, 1]
                              }}
                              className="text-gray-500 group-hover:text-gray-700 transition-colors duration-300"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </motion.div>
                            <span className="text-xs font-medium text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                              Encrypted
                          </span>
                        </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Enhanced hover indicator with glassmorphism effect */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F4C015]/60 to-transparent rounded-b-2xl backdrop-blur-sm"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ 
                scaleX: isHovered || dragActive || dropzoneActive ? 1 : 0, 
                opacity: isHovered || dragActive || dropzoneActive ? 1 : 0 
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
            
            {/* Additional glow effect on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ 
                boxShadow: isHovered || dragActive || dropzoneActive
                  ? '0 0 0 1px rgba(244, 192, 21, 0.1), 0 0 30px rgba(244, 192, 21, 0.1)' 
                  : '0 0 0 0px rgba(244, 192, 21, 0)'
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
} 