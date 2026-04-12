import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeIngredientCreateSchema } from '@/lib/types'
import { wouldCreateCycle } from '@/lib/nutrition/recipeCalc'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await request.json()
    const parsed = RecipeIngredientCreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { recipe_id, food_id, sub_recipe_id, weight_g } = parsed.data

    // Exactly one of food_id / sub_recipe_id must be set
    if (!food_id && !sub_recipe_id) {
      return NextResponse.json({ error: 'Either food_id or sub_recipe_id is required' }, { status: 400 })
    }
    if (food_id && sub_recipe_id) {
      return NextResponse.json({ error: 'Only one of food_id or sub_recipe_id may be set' }, { status: 400 })
    }

    // Verify the recipe belongs to this user
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipe_id)
      .eq('user_id', userId)
      .single()

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

    // Cycle check for sub-recipes
    if (sub_recipe_id) {
      const cycle = await wouldCreateCycle(recipe_id, sub_recipe_id, supabase)
      if (cycle) {
        return NextResponse.json({ error: 'Adding this sub-recipe would create a circular reference' }, { status: 422 })
      }
    }

    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id,
        food_id: food_id ?? null,
        sub_recipe_id: sub_recipe_id ?? null,
        weight_g,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
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

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // RLS ensures only the recipe owner can delete ingredients
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
