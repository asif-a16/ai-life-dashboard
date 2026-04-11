'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function PSTUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/calendar/import/pst', { method: 'POST', body: formData })

      let json: { data?: { imported: number; skipped: number }; error?: string }
      try {
        json = await res.json() as typeof json
      } catch {
        const text = await res.text().catch(() => `HTTP ${res.status}`)
        setError(`Import failed (${res.status}): ${text.slice(0, 120)}`)
        return
      }

      if (!res.ok) {
        setError(json.error ?? 'Import failed')
        return
      }

      toast(`Imported ${json.data?.imported ?? 0} events from Outlook`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import PST file. Please try again.')
    } finally {
      setIsLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pst"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? 'Importing...' : 'Import Outlook (.pst)'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
