import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CheckSchema = z.object({
  habit_id: z.string().uuid(),
  completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(['complete', 'undo']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user

    const body = await request.json()
    const parsed = CheckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { habit_id, completed_on, action } = parsed.data

    if (action === 'complete') {
      const { error } = await supabase
        .from('habit_logs')
        .upsert(
          { habit_id, user_id: user.id, completed_on },
          { onConflict: 'habit_id,completed_on', ignoreDuplicates: true }
        )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habit_id)
        .eq('completed_on', completed_on)
        .eq('user_id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
