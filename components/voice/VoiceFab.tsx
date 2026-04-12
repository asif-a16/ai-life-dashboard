'use client'

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { AssistantConversation } from './AssistantConversation'

export function VoiceFab() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab hover:bg-primary/90"
        aria-label="Voice assistant"
      >
        <Mic className="h-6 w-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background border p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <AssistantConversation onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
