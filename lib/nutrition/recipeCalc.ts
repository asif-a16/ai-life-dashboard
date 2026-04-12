import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomFood } from '@/lib/types'

export interface NutritionSnapshot {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  salt_mg: number | null
}

export interface NutritionPer100g {
  calories_per_100g: number
  protein_per_100g: number | null
  fat_per_100g: number | null
  carbs_per_100g: number | null
  salt_per_100g: number | null
}

export function calcFoodNutrition(food: CustomFood, weight_g: number): NutritionSnapshot {
  const scale = weight_g / 100
  return {
    calories: Math.round(food.calories_per_100g * scale),
    protein_g: food.protein_per_100g !== null ? Math.round(food.protein_per_100g * scale * 10) / 10 : null,
    fat_g: food.fat_per_100g !== null ? Math.round(food.fat_per_100g * scale * 10) / 10 : null,
    carbs_g: food.carbs_per_100g !== null ? Math.round(food.carbs_per_100g * scale * 10) / 10 : null,
    salt_mg: food.salt_per_100g !== null ? Math.round(food.salt_per_100g * scale * 1000) : null,
  }
}

export function calcRecipeNutrition(nutrition: NutritionPer100g, weight_g: number): NutritionSnapshot {
  const scale = weight_g / 100
  return {
    calories: Math.round(nutrition.calories_per_100g * scale),
    protein_g: nutrition.protein_per_100g !== null ? Math.round(nutrition.protein_per_100g * scale * 10) / 10 : null,
    fat_g: nutrition.fat_per_100g !== null ? Math.round(nutrition.fat_per_100g * scale * 10) / 10 : null,
    carbs_g: nutrition.carbs_per_100g !== null ? Math.round(nutrition.carbs_per_100g * scale * 10) / 10 : null,
    salt_mg: nutrition.salt_per_100g !== null ? Math.round(nutrition.salt_per_100g * scale * 1000) : null,
  }
}

// Recursively evaluate a recipe's nutrition per 100g of yield.
// Returns null if the recipe has no ingredients, depth is exceeded, or data is missing.
export async function evaluateRecipePer100g(
  recipeId: string,
  totalWeightG: number,
  supabase: SupabaseClient,
  depth = 0
): Promise<NutritionPer100g | null> {
  if (depth > 10 || totalWeightG <= 0) return null

  type IngredientRow = {
    weight_g: number
    food_id: string | null
    sub_recipe_id: string | null
    custom_foods: {
      calories_per_100g: number
      protein_per_100g: number | null
      fat_per_100g: number | null
      carbs_per_100g: number | null
      salt_per_100g: number | null
    } | null
  }

  const { data: ingredients, error } = await supabase
    .from('recipe_ingredients')
    .select('weight_g, food_id, sub_recipe_id, custom_foods(calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, salt_per_100g)')
    .eq('recipe_id', recipeId)

  if (error || !ingredients || ingredients.length === 0) return null

  let totalCalories = 0
  let totalProtein: number | null = null
  let totalFat: number | null = null
  let totalCarbs: number | null = null
  let totalSaltG: number | null = null

  for (const rawIng of ingredients) {
    const ing = rawIng as unknown as IngredientRow
    const weightG = Number(ing.weight_g)

    if (ing.food_id && ing.custom_foods) {
      const food = ing.custom_foods
      const scale = weightG / 100
      totalCalories += food.calories_per_100g * scale
      if (food.protein_per_100g !== null) totalProtein = (totalProtein ?? 0) + food.protein_per_100g * scale
      if (food.fat_per_100g !== null) totalFat = (totalFat ?? 0) + food.fat_per_100g * scale
      if (food.carbs_per_100g !== null) totalCarbs = (totalCarbs ?? 0) + food.carbs_per_100g * scale
      if (food.salt_per_100g !== null) totalSaltG = (totalSaltG ?? 0) + food.salt_per_100g * scale
    } else if (ing.sub_recipe_id) {
      const { data: subRecipe } = await supabase
        .from('recipes')
        .select('total_weight_g')
        .eq('id', ing.sub_recipe_id)
        .single()

      if (!subRecipe) continue

      const subNutrition = await evaluateRecipePer100g(
        ing.sub_recipe_id,
        Number(subRecipe.total_weight_g),
        supabase,
        depth + 1
      )
      if (!subNutrition) continue

      const scale = weightG / 100
      totalCalories += subNutrition.calories_per_100g * scale
      if (subNutrition.protein_per_100g !== null) totalProtein = (totalProtein ?? 0) + subNutrition.protein_per_100g * scale
      if (subNutrition.fat_per_100g !== null) totalFat = (totalFat ?? 0) + subNutrition.fat_per_100g * scale
      if (subNutrition.carbs_per_100g !== null) totalCarbs = (totalCarbs ?? 0) + subNutrition.carbs_per_100g * scale
      if (subNutrition.salt_per_100g !== null) totalSaltG = (totalSaltG ?? 0) + subNutrition.salt_per_100g * scale
    }
  }

  const factor = 100 / totalWeightG
  return {
    calories_per_100g: Math.round(totalCalories * factor * 10) / 10,
    protein_per_100g: totalProtein !== null ? Math.round(totalProtein * factor * 10) / 10 : null,
    fat_per_100g: totalFat !== null ? Math.round(totalFat * factor * 10) / 10 : null,
    carbs_per_100g: totalCarbs !== null ? Math.round(totalCarbs * factor * 10) / 10 : null,
    salt_per_100g: totalSaltG !== null ? Math.round(totalSaltG * factor * 10) / 10 : null,
  }
}

// Returns true if adding candidateSubId as an ingredient of recipeId would create a cycle.
export async function wouldCreateCycle(
  recipeId: string,
  candidateSubId: string,
  supabase: SupabaseClient,
  depth = 0
): Promise<boolean> {
  if (depth > 10) return true
  if (candidateSubId === recipeId) return true

  const { data: subIngredients } = await supabase
    .from('recipe_ingredients')
    .select('sub_recipe_id')
    .eq('recipe_id', candidateSubId)
    .not('sub_recipe_id', 'is', null)

  for (const ing of subIngredients ?? []) {
    if (ing.sub_recipe_id && await wouldCreateCycle(recipeId, ing.sub_recipe_id as string, supabase, depth + 1)) {
      return true
    }
  }

  return false
}
