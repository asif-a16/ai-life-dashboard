import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CustomFood } from '@/lib/types'

const RecalculateSchema = z.object({
  food_id: z.string().uuid(),
  strategy: z.enum(['keep_weight', 'keep_calories']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await request.json()
    const parsed = RecalculateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { food_id, strategy } = parsed.data

    // Fetch the current food definition
    const { data: food, error: foodError } = await supabase
      .from('custom_foods')
      .select('*')
      .eq('id', food_id)
      .eq('user_id', userId)
      .single()

    if (foodError || !food) {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }

    const typedFood = food as CustomFood

    // Fetch all meal log entries referencing this food
    const { data: entries, error: entriesError } = await supabase
      .from('log_entries')
      .select('id, data')
      .eq('user_id', userId)
      .eq('type', 'meal')
      .contains('data', { food_id })

    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })
    if (!entries || entries.length === 0) {
      return NextResponse.json({ data: { updated_count: 0 } })
    }

    const scale = typedFood.calories_per_100g / 100

    const updates = entries.map((entry) => {
      const d = entry.data as Record<string, unknown>
      const currentCalories = typeof d.calories === 'number' ? d.calories : null
      const currentWeight = typeof d.weight_g === 'number' ? d.weight_g : null

      let newData: Record<string, unknown>

      if (strategy === 'keep_weight' && currentWeight !== null) {
        const newCalories = Math.round(scale * currentWeight)
        newData = {
          ...d,
          calories: newCalories,
          protein_g: typedFood.protein_per_100g !== null ? Math.round(typedFood.protein_per_100g / 100 * currentWeight * 10) / 10 : d.protein_g,
          fat_g: typedFood.fat_per_100g !== null ? Math.round(typedFood.fat_per_100g / 100 * currentWeight * 10) / 10 : d.fat_g,
          carbs_g: typedFood.carbs_per_100g !== null ? Math.round(typedFood.carbs_per_100g / 100 * currentWeight * 10) / 10 : d.carbs_g,
          salt_mg: typedFood.salt_per_100g !== null ? Math.round(typedFood.salt_per_100g / 100 * currentWeight * 1000) : d.salt_mg,
        }
      } else if (strategy === 'keep_calories' && currentCalories !== null && scale > 0) {
        const newWeight = Math.round((currentCalories / scale) * 10) / 10
        newData = {
          ...d,
          weight_g: newWeight,
          protein_g: typedFood.protein_per_100g !== null ? Math.round(typedFood.protein_per_100g / 100 * newWeight * 10) / 10 : d.protein_g,
          fat_g: typedFood.fat_per_100g !== null ? Math.round(typedFood.fat_per_100g / 100 * newWeight * 10) / 10 : d.fat_g,
          carbs_g: typedFood.carbs_per_100g !== null ? Math.round(typedFood.carbs_per_100g / 100 * newWeight * 10) / 10 : d.carbs_g,
          salt_mg: typedFood.salt_per_100g !== null ? Math.round(typedFood.salt_per_100g / 100 * newWeight * 1000) : d.salt_mg,
        }
      } else {
        newData = d
      }

      return { id: entry.id as string, data: newData }
    })

    // Batch update
    const results = await Promise.all(
      updates.map(({ id, data }) =>
        supabase
          .from('log_entries')
          .update({ data })
          .eq('id', id)
          .eq('user_id', userId)
      )
    )

    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Some entries failed to update' }, { status: 500 })
    }

    return NextResponse.json({ data: { updated_count: updates.length } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
