import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePST } from '@/lib/calendar/parsePST'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const events = parsePST(buffer)

    if (events.length === 0) {
      return NextResponse.json({ data: { imported: 0, skipped: 0 } })
    }

    const rows = events.map((e) => ({
      ...e,
      user_id: session.user.id,
    }))

    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(rows, { onConflict: 'user_id,ics_uid', ignoreDuplicates: false })
      .select('id')

    if (error) {
      console.error('[PST import] Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { imported: (data ?? []).length, skipped: events.length - (data ?? []).length } })
  } catch (e) {
    console.error('[PST import] Unexpected error:', e)
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
