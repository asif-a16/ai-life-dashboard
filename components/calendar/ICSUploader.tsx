'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ICSUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/calendar', { method: 'POST', body: formData })
      const json = await res.json() as { data?: { imported: number; skipped: number }; error?: string }

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      const { imported, skipped } = json.data!
      setResult(`Imported ${imported} event${imported !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".ics"
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer cursor-pointer text-muted-foreground"
      />
      <Button type="submit" disabled={isUploading} size="sm">
        {isUploading ? 'Importing...' : 'Import Calendar'}
      </Button>
      {result && <p className="text-sm text-green-600 dark:text-green-400">{result}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
