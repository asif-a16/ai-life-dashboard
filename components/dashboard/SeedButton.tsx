'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SeedButton() {
  const router = useRouter()
  const [isSeeding, setIsSeeding] = useState(false)

  async function handleSeed() {
    setIsSeeding(true)
    try {
      await fetch('/api/seed', { method: 'POST' })
      router.refresh()
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
      {isSeeding ? 'Seeding...' : 'Seed Demo Data'}
    </Button>
  )
}
