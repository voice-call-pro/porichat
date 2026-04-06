'use client'

import { motion } from 'framer-motion'

interface AnimatedMascotProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AnimatedMascot({ size = 'md', className = '' }: AnimatedMascotProps) {
  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 80, height: 80 },
    lg: { width: 160, height: 160 },
  }

  const { width, height } = sizes[size]

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <motion.svg
        width={width}
        height={height}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          filter: [
            'drop-shadow(0 0 6px rgba(239, 68, 68, 0.3))',
            'drop-shadow(0 0 16px rgba(239, 68, 68, 0.6))',
            'drop-shadow(0 0 6px rgba(239, 68, 68, 0.3))',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Wings */}
        <motion.ellipse
          cx="38"
          cy="52"
          rx="18"
          ry="28"
          fill="rgba(252, 165, 165, 0.5)"
          stroke="#fca5a5"
          strokeWidth="1"
          animate={{
            rx: [18, 22, 18],
            ry: [28, 32, 28],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.ellipse
          cx="82"
          cy="52"
          rx="18"
          ry="28"
          fill="rgba(252, 165, 165, 0.5)"
          stroke="#fca5a5"
          strokeWidth="1"
          animate={{
            rx: [18, 22, 18],
            ry: [28, 32, 28],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.1,
          }}
        />

        {/* Body */}
        <ellipse cx="60" cy="70" rx="18" ry="30" fill="#fee2e2" stroke="#fca5a5" strokeWidth="1.5" />

        {/* Head */}
        <circle cx="60" cy="32" r="16" fill="#fff1f2" stroke="#fca5a5" strokeWidth="1.5" />

        {/* Crown / Tiara */}
        <path
          d="M48 20 L52 12 L56 18 L60 8 L64 18 L68 12 L72 20"
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Eyes */}
        <circle cx="54" cy="30" r="2.5" fill="#1f2937" />
        <circle cx="66" cy="30" r="2.5" fill="#1f2937" />
        <circle cx="55" cy="29" r="1" fill="white" />
        <circle cx="67" cy="29" r="1" fill="white" />

        {/* Blush */}
        <ellipse cx="49" cy="35" rx="4" ry="2" fill="rgba(252, 165, 165, 0.6)" />
        <ellipse cx="71" cy="35" rx="4" ry="2" fill="rgba(252, 165, 165, 0.6)" />

        {/* Smile */}
        <path d="M56 36 Q60 40 64 36" stroke="#ef4444" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Dress bottom */}
        <path
          d="M42 85 Q44 100 35 110 L60 105 L85 110 Q76 100 78 85"
          fill="rgba(239, 68, 68, 0.2)"
          stroke="#fca5a5"
          strokeWidth="1"
        />

        {/* Sparkles */}
        <motion.g
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <path d="M30 15 L32 12 L34 15 L32 18 Z" fill="#fbbf24" />
        </motion.g>
        <motion.g
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.7,
          }}
        >
          <path d="M88 20 L90 17 L92 20 L90 23 Z" fill="#fbbf24" />
        </motion.g>
        <motion.g
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.4,
          }}
        >
          <path d="M25 45 L27 42 L29 45 L27 48 Z" fill="#fbbf24" />
        </motion.g>
        <motion.g
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.4,
          }}
        >
          <path d="M95 40 L97 37 L99 40 L97 43 Z" fill="#fbbf24" />
        </motion.g>

        {/* Star wand */}
        <line x1="78" y1="55" x2="100" y2="35" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <motion.path
          d="M100 28 L103 34 L110 35 L105 40 L106 47 L100 43 L94 47 L95 40 L90 35 L97 34 Z"
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="0.5"
          animate={{
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '100px 37.5px' }}
        />
      </motion.svg>
    </motion.div>
  )
}
