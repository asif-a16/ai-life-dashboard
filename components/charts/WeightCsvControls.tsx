'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function WeightCsvControls() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/log/import/weight', { method: 'POST', body: formData })
      const json = await res.json() as { data?: { imported: number; skipped: number }; error?: string }

      if (!res.ok) {
        setImportError(json.error ?? 'Import failed')
        return
      }

      const { imported, skipped } = json.data!
      toast(`Imported ${imported} entr${imported === 1 ? 'y' : 'ies'}${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
      router.refresh()
    } catch {
      setImportError('Import failed. Please try again.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <a href="/api/log/export/weight" download>
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import CSV'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {importError && <p className="text-xs text-destructive">{importError}</p>}
    </div>
  )
}
