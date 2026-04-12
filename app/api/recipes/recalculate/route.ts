import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { evaluateRecipePer100g } from '@/lib/nutrition/recipeCalc'

const RecalculateSchema = z.object({
  recipe_id: z.string().uuid(),
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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { recipe_id, strategy } = parsed.data

    // Fetch the recipe to get total_weight_g
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, total_weight_g')
      .eq('id', recipe_id)
      .eq('user_id', userId)
      .single()

    if (recipeError || !recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

    // Evaluate current nutrition
    const nutrition = await evaluateRecipePer100g(recipe_id, Number(recipe.total_weight_g), supabase)
    if (!nutrition) return NextResponse.json({ data: { updated_count: 0 } })

    const caloriesPerG = nutrition.calories_per_100g / 100

    // Fetch all meal log entries referencing this recipe
    const { data: entries, error: entriesError } = await supabase
      .from('log_entries')
      .select('id, data')
      .eq('user_id', userId)
      .eq('type', 'meal')
      .contains('data', { recipe_id })

    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })
    if (!entries || entries.length === 0) return NextResponse.json({ data: { updated_count: 0 } })

    const updates = entries.map((entry) => {
      const d = entry.data as Record<string, unknown>
      const currentCalories = typeof d.calories === 'number' ? d.calories : null
      const currentWeight = typeof d.weight_g === 'number' ? d.weight_g : null

      let newData: Record<string, unknown>

      if (strategy === 'keep_weight' && currentWeight !== null) {
        const scale = currentWeight / 100
        newData = {
          ...d,
          calories: Math.round(nutrition.calories_per_100g * scale),
          protein_g: nutrition.protein_per_100g !== null ? Math.round(nutrition.protein_per_100g * scale * 10) / 10 : d.protein_g,
          fat_g: nutrition.fat_per_100g !== null ? Math.round(nutrition.fat_per_100g * scale * 10) / 10 : d.fat_g,
          carbs_g: nutrition.carbs_per_100g !== null ? Math.round(nutrition.carbs_per_100g * scale * 10) / 10 : d.carbs_g,
          salt_mg: nutrition.salt_per_100g !== null ? Math.round(nutrition.salt_per_100g * scale * 1000) : d.salt_mg,
        }
      } else if (strategy === 'keep_calories' && currentCalories !== null && caloriesPerG > 0) {
        const newWeight = Math.round((currentCalories / caloriesPerG) * 10) / 10
        const scale = newWeight / 100
        newData = {
          ...d,
          weight_g: newWeight,
          protein_g: nutrition.protein_per_100g !== null ? Math.round(nutrition.protein_per_100g * scale * 10) / 10 : d.protein_g,
          fat_g: nutrition.fat_per_100g !== null ? Math.round(nutrition.fat_per_100g * scale * 10) / 10 : d.fat_g,
          carbs_g: nutrition.carbs_per_100g !== null ? Math.round(nutrition.carbs_per_100g * scale * 10) / 10 : d.carbs_g,
          salt_mg: nutrition.salt_per_100g !== null ? Math.round(nutrition.salt_per_100g * scale * 1000) : d.salt_mg,
        }
      } else {
        newData = d
      }

      return { id: entry.id as string, data: newData }
    })

    const results = await Promise.all(
      updates.map(({ id, data }) =>
        supabase.from('log_entries').update({ data }).eq('id', id).eq('user_id', userId)
      )
    )

    const errors = results.filter((r) => r.error)
    if (errors.length > 0) return NextResponse.json({ error: 'Some entries failed to update' }, { status: 500 })

    return NextResponse.json({ data: { updated_count: updates.length } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
