import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const { data: entries, error } = await supabase
      .from('log_entries')
      .select('data, logged_at')
      .eq('user_id', userId)
      .eq('type', 'bodyweight')
      .order('logged_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (entries ?? []).map((e) => {
      const date = (e.logged_at as string).split('T')[0]
      const weight = Number(e.data?.weight_kg).toFixed(2)
      return `${date},${weight}`
    })

    const csv = ['date,weight_kg', ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="weights.csv"',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
