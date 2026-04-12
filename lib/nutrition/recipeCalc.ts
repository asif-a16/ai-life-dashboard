import type { CustomFood } from '@/lib/types'

export interface NutritionSnapshot {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  salt_mg: number | null
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
