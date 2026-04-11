import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseICS } from '@/lib/calendar/parseICS'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gt('start_at', now)
      .order('start_at', { ascending: true })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const icsString = await (file as File).text()
    const events = parseICS(icsString)

    if (events.length === 0) {
      return NextResponse.json({ data: { imported: 0, skipped: 0 } })
    }

    const eventsToUpsert = events.map((e) => ({ ...e, user_id: userId }))

    const { data: upserted, error } = await supabase
      .from('calendar_events')
      .upsert(eventsToUpsert, { onConflict: 'user_id,ics_uid', ignoreDuplicates: false })
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const imported = upserted?.length ?? 0
    const skipped = events.length - imported

    return NextResponse.json({ data: { imported, skipped } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
