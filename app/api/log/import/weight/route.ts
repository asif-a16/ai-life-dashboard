import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    // Skip header row
    const dataLines = lines[0]?.toLowerCase().startsWith('date') ? lines.slice(1) : lines

    const toInsert: Array<{
      user_id: string
      type: string
      data: { weight_kg: number; unit: string }
      logged_at: string
    }> = []
    let skipped = 0

    for (const line of dataLines) {
      const [dateStr, weightStr] = line.split(',')
      if (!dateStr || !weightStr) { skipped++; continue }

      const date = dateStr.trim()
      const weight = parseFloat(weightStr.trim())

      if (!ISO_DATE_RE.test(date) || isNaN(weight) || weight <= 0) {
        skipped++
        continue
      }

      toInsert.push({
        user_id: userId,
        type: 'bodyweight',
        data: { weight_kg: weight, unit: 'kg' },
        logged_at: `${date}T00:00:00.000Z`,
      })
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('log_entries').insert(toInsert)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { imported: toInsert.length, skipped } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
