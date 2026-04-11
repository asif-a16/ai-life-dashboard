'use client'

import { useState, useEffect } from 'react'
import { Mic, X } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'

export function VoiceFab() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Voice log"
      >
        <Mic className="h-6 w-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background border-t shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-semibold text-base">Voice Log</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 pb-8">
              <VoiceRecorder onDone={() => setIsOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
