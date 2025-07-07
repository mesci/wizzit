'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto"
      >
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-xl font-medium mb-2 text-gray-900">Page not found</h1>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          The page you're looking for doesn't exist. It might have been moved, deleted, or you may have typed the wrong URL.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to homepage</span>
        </Link>
      </motion.div>
    </div>
  )
} 