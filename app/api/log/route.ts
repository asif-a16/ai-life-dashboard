import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  LogEntrySchema,
  LogEntryUpdateSchema,
  MealDataSchema,
  WorkoutDataSchema,
  BodyweightDataSchema,
  MoodDataSchema,
  ReflectionDataSchema,
} from '@/lib/types'
import type { LogEntryType } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user

    const body = await request.json()
    const parsed = LogEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { type, data, notes, logged_at, voice_transcript } = parsed.data
    const { data: row, error } = await supabase
      .from('log_entries')
      .insert({
        user_id: user.id,
        type,
        data,
        notes: notes ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
        voice_transcript: voice_transcript ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const DATA_SCHEMAS = {
  meal: MealDataSchema,
  workout: WorkoutDataSchema,
  bodyweight: BodyweightDataSchema,
  mood: MoodDataSchema,
  reflection: ReflectionDataSchema,
} satisfies Record<LogEntryType, { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: unknown } }>

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await request.json()
    const parsed = LogEntryUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { id, data, notes, logged_at } = parsed.data

    // Verify ownership and get the entry type
    const { data: existing, error: fetchError } = await supabase
      .from('log_entries')
      .select('id, user_id, type')
      .eq('id', id)
      .single()

    if (fetchError || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Validate the data against the correct type schema
    const schema = DATA_SCHEMAS[existing.type as LogEntryType]
    const dataValidation = schema.safeParse(data)
    if (!dataValidation.success) {
      return NextResponse.json({ error: dataValidation.error.message }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { data: dataValidation.data }
    if (notes !== undefined) updatePayload.notes = notes ?? null
    if (logged_at !== undefined) updatePayload.logged_at = logged_at

    const { data: row, error } = await supabase
      .from('log_entries')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('log_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
