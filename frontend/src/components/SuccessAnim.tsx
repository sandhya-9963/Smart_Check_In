import React from 'react'
import { motion } from 'framer-motion'

interface SuccessAnimProps {
  message?: string
  tokenNumber?: string
  onClose?: () => void
}

export const SuccessAnim: React.FC<SuccessAnimProps> = ({ 
  message = "Check-In Confirmed!", 
  tokenNumber,
  onClose 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: 'spring', damping: 15 }}
        className="glass-panel glow-green w-full max-w-md p-8 rounded-3xl text-center flex flex-col items-center"
      >
        {/* Animated Checkmark Circle */}
        <div className="relative w-24 h-24 mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="absolute inset-0 bg-emerald-500/20 rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            className="absolute inset-2 bg-emerald-500/30 rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
            className="absolute inset-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
          >
            {/* SVG Checkmark path drawing */}
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        </div>

        {/* Text Details */}
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-2xl font-bold text-white mb-2"
        >
          {message}
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-slate-400 text-sm mb-6"
        >
          Your check-in has been registered and broadcasted to the medical team in real-time.
        </motion.p>

        {tokenNumber && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.9 }}
            className="bg-brand-950/40 border border-brand-500/30 rounded-2xl px-6 py-3 mb-6"
          >
            <span className="text-xs uppercase tracking-widest text-brand-300 font-semibold">Queue Token</span>
            <div className="text-3xl font-extrabold text-brand-400 font-mono mt-1">{tokenNumber}</div>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          onClick={onClose}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
        >
          View Live Queue
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
