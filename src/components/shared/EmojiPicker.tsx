'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  isOpen: boolean
  onClose: () => void
}

const emojiCategories = [
  {
    name: '😀 Smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉',
      '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌',
    ],
  },
  {
    name: '👋 Gestures',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
      '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐',
      '🤲', '🤝', '🙏', '💪', '🦾', '🫡', '🫠', '🥳', '🥸', '😈',
    ],
  },
  {
    name: '❤️ Hearts',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
      '🫀', '💋', '🫂', '💞', ' (◕‿◕)', '( ˘ ɜ˘) ♬♪♫', '╰(*°▽°*)╯', '(づ￣ 3￣)づ', '(ノ◕ヮ◕)ノ*:・゚✧',
    ],
  },
  {
    name: '🎁 Objects',
    emojis: [
      '🎁', '🎀', '🎉', '🎊', '🎈', '🕯️', '🔥', '⭐', '🌟', '✨',
      '💫', '🌈', '☀️', '🌙', '💭', '💬', '🎵', '🎶', '🎮', '💻',
      '📱', '☎️', '📷', '🎬', '🎨', '✏️', '📚', '🌟', '🍀', '🌸',
      '🍕', '🍔', '🍟', '🍦', '🧁', '🎂', '☕', '🍵', '🧃', '🍺',
    ],
  },
]

export default function EmojiPicker({ onSelect, isOpen, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0)

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji)
    },
    [onSelect]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="neo-card-inset-sm absolute bottom-full right-0 mb-2 z-50 w-[300px] sm:w-[340px]"
        >
          {/* Category tabs */}
          <div className="flex gap-1 p-2 border-b border-border/50 overflow-x-auto">
            {emojiCategories.map((cat, idx) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(idx)}
                className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                  idx === activeCategory
                    ? 'neo-accent-red text-white'
                    : 'hover:bg-muted'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {emojiCategories[activeCategory].emojis.map((emoji, idx) => (
                <motion.button
                  key={`${emoji}-${idx}`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelect(emoji)}
                  className="text-xl sm:text-2xl p-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
