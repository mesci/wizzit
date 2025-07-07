'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Zap } from 'lucide-react'

export default function HowItWorksPage() {
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
              <Zap className="relative w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-500" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
              How It Works
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Wizzit uses cutting-edge WebRTC technology to create direct connections between browsers.
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
              { id: 'process', label: 'Transfer Process' },
              { id: 'security', label: 'Security' },
              { id: 'infrastructure', label: 'Infrastructure' },
              { id: 'performance', label: 'Performance' }
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
        
        {/* Transfer Process */}
        <motion.section
          id="process"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Transfer Process</h2>
            <p className="text-gray-600">How files move from sender to receiver.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Step 1: Select & Share</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Choose your file and get an instant share link. No upload waiting time - the link is generated immediately because we don't need to upload your file to our servers first.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Step 2: Direct Connection</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              When someone clicks your link, their browser establishes a secure peer-to-peer connection with yours. This uses WebRTC technology to create a direct communication channel.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Step 3: Encrypted Transfer</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Files transfer directly between browsers with end-to-end encryption. The data never passes through our servers - it goes straight from your device to theirs.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Real-Time Communication</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Unlike traditional file sharing services that require uploading to a server first, Wizzit enables real-time transfers. As soon as the receiver clicks your link, the transfer can begin immediately.
            </p>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          id="security"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security & Privacy</h2>
            <p className="text-gray-600">How we protect your files and privacy.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">End-to-End Encryption</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Every file transfer is encrypted using DTLS 1.3 protocol with AES-256 encryption. This means your files are encrypted before they leave your device and can only be decrypted by the intended recipient.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">No Server Storage</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Your files never touch our servers. They go directly from your device to the recipient's device. This means we can't access, view, or store your files even if we wanted to.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Perfect Forward Secrecy</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Each transfer uses unique encryption keys that are never stored. Even if someone somehow obtained our servers, they couldn't decrypt past transfers because the keys don't exist anymore.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Minimal Data Collection</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              We only collect the minimal data necessary for the service to function: connection timestamps, file sizes, and transfer status. We don't collect IP addresses, personal information, or file contents.
            </p>
          </div>
        </motion.section>

        {/* Infrastructure */}
        <motion.section
          id="infrastructure"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Network Infrastructure</h2>
            <p className="text-gray-600">The technology that makes it all possible.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">WebRTC Technology</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              WebRTC (Web Real-Time Communication) is an open-source project that enables real-time communication between browsers. It's the same technology used by video calling applications like Google Meet and Zoom.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Connection Types</h3>
            <p className="text-gray-700 leading-relaxed mb-4">Wizzit uses a hybrid approach to ensure reliable connections:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li><strong>Direct P2P:</strong> When possible, files transfer directly between devices (fastest option)</li>
              <li><strong>STUN Servers:</strong> Help devices discover their public IP addresses for connection setup</li>
              <li><strong>TURN Relay:</strong> When direct connection isn't possible, we relay through our TURN server</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Our Infrastructure</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li><strong>TURN Server:</strong> Located in Istanbul, Turkey</li>
              <li><strong>Signaling:</strong> Vercel Edge Network (global)</li>
              <li><strong>File Storage:</strong> Zero - everything is real-time</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">NAT Traversal</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Most devices are behind NAT (Network Address Translation) which makes direct connections challenging. Our system uses ICE (Interactive Connectivity Establishment) to find the best connection path between devices.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">TURN Server Role</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              When direct peer-to-peer connections aren't possible (due to firewalls or strict NATs), our TURN server acts as an encrypted relay. The server only passes through encrypted data packets - it cannot decrypt, read, or store your files. Think of it as a secure tunnel that your encrypted data passes through.
            </p>
          </div>
        </motion.section>

        {/* Performance */}
        <motion.section
          id="performance"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Performance & Limitations</h2>
            <p className="text-gray-600">What to expect when using Wizzit.</p>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Transfer Speeds</h3>
            <p className="text-gray-700 leading-relaxed mb-4">Transfer speed depends on your network conditions and connection type:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li><strong>LAN connection:</strong> Very fast - up to your network capacity</li>
              <li><strong>NAT traversal:</strong> Direct P2P connection, limited by upload/download speeds</li>
              <li><strong>TURN relay:</strong> When NAT traversal fails, routed through our relay server</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Factors Affecting Speed</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li><strong>Upload speed:</strong> Limited by sender's upload bandwidth</li>
              <li><strong>Download speed:</strong> Limited by receiver's download bandwidth</li>
              <li><strong>Network congestion:</strong> Peak hours may affect transfer speeds</li>
              <li><strong>Distance:</strong> International transfers may have different speeds than local ones</li>
              <li><strong>VPN/Proxy:</strong> Additional encryption layers can reduce speed</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Service Limitations</h3>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li><strong>Real-time requirement:</strong> Both sender and receiver must be online simultaneously</li>
              <li><strong>Browser support:</strong> Requires modern browser with WebRTC support</li>
              <li><strong>Mobile limitations:</strong> Large file transfers may fail on mobile browsers due to WebRTC implementation differences</li>
              <li><strong>Network dependent:</strong> Transfer speed depends on both users' internet connection quality</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Browser Compatibility</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Wizzit works on all modern browsers including Chrome, Firefox, Safari, and Edge. Some older browsers or restrictive corporate networks may have limited functionality.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Troubleshooting</h3>
            <p className="text-gray-700 leading-relaxed mb-4">If you're experiencing connection issues:</p>
            <ul className="text-gray-700 leading-relaxed mb-6 space-y-2">
              <li>Try disabling VPN or proxy temporarily</li>
              <li>Check if your firewall is blocking WebRTC</li>
              <li>Ensure both devices have stable internet connections</li>
              <li>Try using a different browser or network</li>
            </ul>
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
            Understanding how Wizzit works helps you make the most of peer-to-peer file sharing.
            <br />
            <span className="text-sm">Questions? Reach out at <a href="mailto:yusuf@mesci.dev" className="text-gray-700 underline hover:no-underline">yusuf@mesci.dev</a></span>
          </p>
        </motion.div>
      </div>
    </div>
  )
} 