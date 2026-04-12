import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeSchema, RecipeUpdateSchema } from '@/lib/types'
import { evaluateRecipePer100g } from '@/lib/nutrition/recipeCalc'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name, total_weight_g, created_at, updated_at')
      .eq('user_id', userId)
      .order('name')

    if (recipesError) return NextResponse.json({ error: recipesError.message }, { status: 500 })
    if (!recipes || recipes.length === 0) return NextResponse.json({ data: [] })

    const recipeIds = recipes.map((r) => r.id as string)

    // Fetch all ingredients for all recipes in one query
    const { data: allIngredients } = await supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, weight_g, food_id, sub_recipe_id')
      .in('recipe_id', recipeIds)

    // Collect referenced food and sub-recipe IDs
    const foodIds = [...new Set((allIngredients ?? []).filter((i) => i.food_id).map((i) => i.food_id as string))]
    const subRecipeIds = [...new Set((allIngredients ?? []).filter((i) => i.sub_recipe_id).map((i) => i.sub_recipe_id as string))]

    const [{ data: foods }, { data: subRecipeNames }] = await Promise.all([
      foodIds.length > 0
        ? supabase.from('custom_foods').select('id, name, calories_per_100g').in('id', foodIds)
        : Promise.resolve({ data: [] }),
      subRecipeIds.length > 0
        ? supabase.from('recipes').select('id, name').in('id', subRecipeIds)
        : Promise.resolve({ data: [] }),
    ])

    const foodMap = new Map((foods ?? []).map((f) => [f.id as string, f]))
    const subRecipeMap = new Map((subRecipeNames ?? []).map((r) => [r.id as string, r]))

    // Evaluate nutrition for each recipe
    const result = await Promise.all(
      recipes.map(async (recipe) => {
        const recipeIngredients = (allIngredients ?? [])
          .filter((i) => i.recipe_id === recipe.id)
          .map((ing) => ({
            id: ing.id as string,
            weight_g: Number(ing.weight_g),
            food_id: (ing.food_id as string | null) ?? null,
            sub_recipe_id: (ing.sub_recipe_id as string | null) ?? null,
            food: ing.food_id ? (foodMap.get(ing.food_id as string) ?? null) : null,
            sub_recipe: ing.sub_recipe_id ? (subRecipeMap.get(ing.sub_recipe_id as string) ?? null) : null,
          }))

        const nutrition = await evaluateRecipePer100g(recipe.id as string, Number(recipe.total_weight_g), supabase)

        return {
          id: recipe.id as string,
          name: recipe.name as string,
          total_weight_g: Number(recipe.total_weight_g),
          created_at: recipe.created_at as string,
          updated_at: recipe.updated_at as string,
          nutrition_per_100g: nutrition,
          ingredients: recipeIngredients,
        }
      })
    )

    return NextResponse.json({ data: result })
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

    const body = await request.json()
    const parsed = RecipeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...parsed.data, user_id: session.user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { ...data, nutrition_per_100g: null, ingredients: [] } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await request.json()
    const parsed = RecipeUpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { id, ...fields } = parsed.data
    const { data, error } = await supabase
      .from('recipes')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Count affected meal log entries referencing this recipe
    const { count } = await supabase
      .from('log_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'meal')
      .contains('data', { recipe_id: id })

    return NextResponse.json({ data, affected_count: count ?? 0 })
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

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
