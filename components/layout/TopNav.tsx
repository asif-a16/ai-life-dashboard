'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, Mic } from 'lucide-react'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'

interface TopNavProps {
  title: string
}

export function TopNav({ title }: TopNavProps) {
  const router = useRouter()
  const [voiceOpen, setVoiceOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <h1 className="font-semibold text-base">{title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceOpen(true)}
            className="text-muted-foreground"
            aria-label="Voice log"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </header>

      {voiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVoiceOpen(false)
          }}
        >
          <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="font-semibold text-sm mb-4">Voice Log</h2>
            <VoiceRecorder onClose={() => setVoiceOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
