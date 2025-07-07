'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Github, X } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  const { scrollY } = useScroll()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  const headerBackground = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.95)']
  )
  
  const headerBlur = useTransform(
    scrollY,
    [0, 100],
    ['blur(0px)', 'blur(12px)']
  )

  const borderOpacity = useTransform(
    scrollY,
    [0, 100],
    [0, 0.1]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  if (!mounted) return null

  return (
    <>
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4"
      >
        {/* Floating container */}
        <motion.div
          className="max-w-6xl mx-auto bg-white backdrop-blur-md rounded-xl border border-gray-200/60 shadow-lg shadow-gray-900/5 transition-all duration-300"
        >
                      <motion.div
              style={{ opacity: borderOpacity }}
              className="absolute bottom-0 left-0 right-0 h-px bg-gray-200/50 rounded-b-xl"
            />
          
          <div className="px-6 py-3">
            <div className="flex items-center justify-between h-10">
            
            {/* Minimal Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center"
            >
              <Link href="/" className="group">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2"
                >
                  {/* Wizzit Logo */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center"
                  >
                    <Image
                      src="/logo.svg"
                      alt="Wizzit Logo"
                      width={80}
                      height={29}
                      className="h-7 w-auto"
                      priority
                    />
                  </motion.div>
                </motion.div>
              </Link>
            </motion.div>

            {/* Minimal Navigation - Desktop */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="hidden md:flex items-center gap-6"
            >
              {[
                { label: 'About', href: '/about' },
                { label: 'How it Works', href: '/how-it-works' },
                { label: 'Legal', href: '/legal' }
              ].map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.05, duration: 0.3 }}
                    whileHover={{ y: -1 }}
                    className={`text-sm transition-colors duration-200 ${
                      isActive 
                        ? 'text-gray-900 font-semibold' 
                        : 'text-gray-600 hover:text-gray-900 font-medium'
                    }`}
                  >
                    {item.label}
                  </motion.a>
                )
              })}
            </motion.nav>

            {/* GitHub Link - Desktop only */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="hidden md:block"
            >
              <motion.a
                href="https://github.com/mesci/wizzit"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium hover:brightness-110 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
                  borderRadius: '11px',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </motion.a>
            </motion.div>

            {/* Mobile menu button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMobileMenu}
              className="md:hidden w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors duration-200"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1"
                  >
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        className="w-3 h-px bg-gray-600"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.1 + index * 0.05, duration: 0.2 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 md:hidden"
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className="fixed top-24 left-4 right-4 bg-white/98 backdrop-blur-xl border border-gray-200/80 rounded-xl shadow-2xl z-50 md:hidden overflow-hidden"
            >
              <div className="p-6 space-y-4">
                
                {/* Mobile Navigation Links */}
                <div className="space-y-3">
                  {[
                    { label: 'About', href: '/about' },
                    { label: 'How it Works', href: '/how-it-works' },
                    { label: 'Legal', href: '/legal' }
                  ].map((item, index) => {
                    const isActive = pathname === item.href
                    return (
                      <motion.a
                        key={item.label}
                        href={item.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block py-2 transition-colors duration-200 ${
                          isActive 
                            ? 'text-gray-900 font-semibold' 
                            : 'text-gray-600 hover:text-gray-900 font-medium'
                        }`}
                      >
                        {item.label}
                      </motion.a>
                    )
                  })}
                </div>

                {/* Divider */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="h-px bg-gray-200"
                />

                {/* GitHub Link - Mobile */}
                <motion.a
                  href="https://github.com/mesci/wizzit"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-white text-sm font-medium hover:brightness-110 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
                    borderRadius: '11px',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <Github className="w-4 h-4" />
                  <span>View on GitHub</span>
                </motion.a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
} 