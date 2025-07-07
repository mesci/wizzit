'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="pt-32 md:pt-40 pb-12 md:pb-16 px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gray-100 rounded-full blur-xl opacity-60"></div>
              <Users className="relative w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-500" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
              About Wizzit
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We&apos;re building a more private, efficient, and sustainable way to share files. No servers, no storage, just direct transfers.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Separator */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="max-w-4xl mx-auto px-6 py-4"
      >
        <div className="h-px bg-gray-300"></div>
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Our Mission */}
        <motion.section
          id="mission"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600">Building a better way to share files.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Why We Built Wizzit</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Traditional file sharing services force you to upload your files to their servers, wait for the upload to complete, then share a link for others to download. This creates unnecessary delays, privacy concerns, and environmental impact.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit is different. We enable direct peer-to-peer file transfers between browsers. Your files never touch our servers - they go directly from you to your recipient.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Non-Profit Philosophy</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit is built as a public service, not a profit-driven business. We don't sell your data, show ads, or charge subscription fees. Our goal is to provide a better alternative to traditional file sharing services.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Our Values</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-3">
              <li><strong>Privacy:</strong> Your files are yours. We can't see them, store them, or share them.</li>
              <li><strong>Transparency:</strong> Open about our technology, limitations, and legal framework.</li>
              <li><strong>Sustainability:</strong> Direct peer-to-peer transfers, maximum efficiency.</li>
              <li><strong>Accessibility:</strong> Free for everyone, no registration required.</li>
              <li><strong>Innovation:</strong> Pushing the boundaries of what's possible with web technologies.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Environmental Impact</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              By eliminating the need for massive data centers to store files, peer-to-peer transfers use significantly less energy than traditional cloud storage solutions. Every file shared through Wizzit is a small step toward a more sustainable internet.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Privacy by Design</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              End-to-end encryption ensures that even if someone intercepts your transfer, they can't read your files. Not even we can see what you're sharing. This isn't just a feature - it's the foundation of how Wizzit works.
            </p>
          </div>
        </motion.section>



        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center py-16 border-t border-gray-200"
        >
          <p className="text-gray-500">
            Built with care for a more private and sustainable internet.
            <br />
            <span className="text-sm">Questions? Reach out at <a href="mailto:yusuf@mesci.dev" className="text-gray-700 underline hover:no-underline">yusuf@mesci.dev</a></span>
          </p>
        </motion.div>
      </div>
    </div>
  )
} 