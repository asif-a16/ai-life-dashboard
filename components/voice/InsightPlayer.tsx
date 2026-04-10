'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface InsightPlayerProps {
  audioUrl: string | null
}

export function InsightPlayer({ audioUrl }: InsightPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!audioUrl) return null

  function handleToggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl!)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      void audioRef.current.play()
      setIsPlaying(true)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleToggle}>
      {isPlaying ? '⏸ Pause' : '▶ Play Insight'}
    </Button>
  )
}
