import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecipeLibrary } from '@/components/recipes/RecipeLibrary'
import { evaluateRecipePer100g } from '@/lib/nutrition/recipeCalc'
import type { NutritionPer100g } from '@/lib/nutrition/recipeCalc'

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, total_weight_g, created_at, updated_at')
    .eq('user_id', user!.id)
    .order('name')

  const recipeList = recipes ?? []
  const recipeIds = recipeList.map((r) => r.id as string)

  const { data: allIngredients } = recipeIds.length > 0
    ? await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id, weight_g, food_id, sub_recipe_id')
        .in('recipe_id', recipeIds)
    : { data: [] }

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

  const initialRecipes = await Promise.all(
    recipeList.map(async (recipe) => {
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
        nutrition_per_100g: nutrition as NutritionPer100g | null,
        ingredients: recipeIngredients,
      }
    })
  )

  return (
    <>
      <TopNav title="Recipes" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeLibrary initialRecipes={initialRecipes} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
