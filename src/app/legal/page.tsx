'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Scale } from 'lucide-react'

export default function LegalPage() {
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
              <Scale className="relative w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-500" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
              Legal Information
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Transparency and trust are fundamental to Wizzit. Here's everything you need to know about our legal framework.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="py-8 px-6 bg-gray-50 border-y border-gray-200"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { id: 'terms', label: 'Terms of Service' },
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'dmca', label: 'DMCA Policy' },
              { id: 'abuse', label: 'Abuse Reporting' }
            ].map((item, index) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                className="px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200 text-sm font-medium text-gray-700 hover:text-gray-900"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                {item.label}
              </motion.a>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Terms of Service */}
        <motion.section
          id="terms"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h2>
            <p className="text-gray-600">By using Wizzit, you agree to these terms.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Service Description</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit is a peer-to-peer file transfer platform that enables direct file sharing between users. We provide the technical infrastructure to facilitate these transfers without storing files on our servers.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">User Responsibilities</h3>
            <p className="text-gray-700 leading-relaxed mb-4">By using Wizzit, you agree to:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>Share only legal content that you have the right to distribute</li>
              <li>Not violate any copyright or intellectual property rights</li>
              <li>Not share malicious software or harmful code</li>
              <li>Not share personal data without proper consent</li>
              <li>Not use the service for illegal activities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Service Limitations</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>No file storage - transfers are real-time only</li>
              <li>Both users must be online during transfer</li>
              <li>Requires modern browser with WebRTC support</li>
              <li>Network dependent - speed varies by connection quality</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Privacy & Security</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              All file transfers are encrypted end-to-end. We cannot access, view, or store your files. Files are transferred directly between users through peer-to-peer connections.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Disclaimer</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit operates as a technical conduit and does not accept responsibility for user-generated content. Users are solely responsible for the content they share and receive.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Contact</h3>
            <p className="text-gray-700 leading-relaxed">
              For questions about these terms: <a href="mailto:yusuf@mesci.dev" className="text-gray-900 underline hover:no-underline">yusuf@mesci.dev</a>
            </p>
          </div>
        </motion.section>

        {/* Privacy Policy */}
        <motion.section
          id="privacy"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h2>
            <p className="text-gray-600">How we handle your data and protect your privacy.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Data We Collect</h3>
            <p className="text-gray-700 leading-relaxed mb-4">We collect minimal data necessary for service operation:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>Connection timestamps</li>
              <li>File sizes (not content)</li>
              <li>Transfer status (success/failure)</li>
              <li>Total transfers counter (aggregate only, no personal data)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Data We Do NOT Collect</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>File contents (end-to-end encrypted)</li>
              <li>User profiles or personal information</li>
              <li>IP addresses or location data</li>
              <li>Behavioral tracking data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Data Usage</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              The minimal data we collect is used solely for providing technical service functionality and ensuring system reliability. We do not share this data with third parties.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Security</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>End-to-end encryption for all transfers</li>
              <li>No file storage on our servers</li>
              <li>Secure peer-to-peer connections</li>
              <li>No cookies or tracking technologies</li>
              <li>No personal identifiers linked to the public transfer counter</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Contact</h3>
            <p className="text-gray-700 leading-relaxed">
              Privacy questions: <a href="mailto:yusuf@mesci.dev" className="text-gray-900 underline hover:no-underline">yusuf@mesci.dev</a>
            </p>
          </div>
        </motion.section>

        {/* DMCA Policy */}
        <motion.section
          id="dmca"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">DMCA Policy</h2>
            <p className="text-gray-600">Copyright compliance and protection.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Safe Harbor Protection</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit operates as a technical conduit for peer-to-peer file transfers. We qualify for DMCA Safe Harbor protection as we do not store, modify, or have access to transferred content.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Copyright Infringement Notice</h3>
            <p className="text-gray-700 leading-relaxed mb-4">To file a DMCA notice, please provide:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>Your contact information</li>
              <li>Description of the copyrighted work</li>
              <li>Description of the infringing material</li>
              <li>Good faith statement</li>
              <li>Accuracy statement and signature</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Contact</h3>
            <p className="text-gray-700 leading-relaxed">
              DMCA notices: <a href="mailto:yusuf@mesci.dev" className="text-gray-900 underline hover:no-underline">yusuf@mesci.dev</a>
            </p>
          </div>
        </motion.section>

        {/* Abuse Reporting */}
        <motion.section
          id="abuse"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Abuse Reporting</h2>
            <p className="text-gray-600">Help us maintain a safe and legal platform.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">How to Report</h3>
            <p className="text-gray-700 leading-relaxed mb-4">If you encounter inappropriate content or behavior:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>Email us at <a href="mailto:yusuf@mesci.dev" className="text-gray-900 underline hover:no-underline">yusuf@mesci.dev</a></li>
              <li>Include the share link if available</li>
              <li>Describe the type of violation</li>
              <li>Provide evidence if possible</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Response</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              We will review all reports promptly and take appropriate action, which may include disabling transfer links or blocking access as necessary.
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
            This legal framework ensures Wizzit operates transparently and in compliance with applicable laws.
          </p>
        </motion.div>
      </div>
    </div>
  )
} 