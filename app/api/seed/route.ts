import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_PREFIX = 'Demo '

type SeedLogType = 'meal' | 'workout' | 'bodyweight' | 'mood' | 'reflection'

interface SeedLogEntry {
  user_id: string
  type: SeedLogType
  logged_at: string
  notes: string | null
  voice_transcript: string | null
  data: Record<string, unknown>
}

function daysAgo(n: number, hour = 12, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function daysAhead(n: number, hour = 9, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function dayOnlyAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    await supabase
      .from('log_entries')
      .delete()
      .eq('user_id', userId)
      .gte('logged_at', fourteenDaysAgo.toISOString())

    await supabase
      .from('insights_cache')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .like('ics_uid', 'demo-%')

    const { data: existingHabits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `${DEMO_PREFIX}%`)

    const habitIds = (existingHabits ?? []).map((h) => h.id as string)
    if (habitIds.length > 0) {
      await supabase
        .from('habit_logs')
        .delete()
        .eq('user_id', userId)
        .in('habit_id', habitIds)

      await supabase
        .from('habits')
        .delete()
        .eq('user_id', userId)
        .in('id', habitIds)
    }

    const { data: existingRecipes } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `${DEMO_PREFIX}%`)

    const recipeIds = (existingRecipes ?? []).map((r) => r.id as string)
    if (recipeIds.length > 0) {
      await supabase
        .from('recipe_ingredients')
        .delete()
        .in('recipe_id', recipeIds)

      await supabase
        .from('recipe_ingredients')
        .delete()
        .in('sub_recipe_id', recipeIds)

      await supabase
        .from('recipes')
        .delete()
        .eq('user_id', userId)
        .in('id', recipeIds)
    }

    await supabase
      .from('custom_foods')
      .delete()
      .eq('user_id', userId)
      .ilike('name', `${DEMO_PREFIX}%`)

    const foodsToInsert = [
      { name: `${DEMO_PREFIX}Chicken Breast`, calories_per_100g: 165, protein_per_100g: 31, fat_per_100g: 3.6, carbs_per_100g: 0, salt_per_100g: 180 },
      { name: `${DEMO_PREFIX}Brown Rice Cooked`, calories_per_100g: 111, protein_per_100g: 2.6, fat_per_100g: 0.9, carbs_per_100g: 23, salt_per_100g: 5 },
      { name: `${DEMO_PREFIX}Broccoli`, calories_per_100g: 35, protein_per_100g: 2.8, fat_per_100g: 0.4, carbs_per_100g: 7.2, salt_per_100g: 35 },
      { name: `${DEMO_PREFIX}Greek Yogurt 2%`, calories_per_100g: 73, protein_per_100g: 9.9, fat_per_100g: 2, carbs_per_100g: 3.9, salt_per_100g: 50 },
      { name: `${DEMO_PREFIX}Rolled Oats`, calories_per_100g: 389, protein_per_100g: 16.9, fat_per_100g: 6.9, carbs_per_100g: 66.3, salt_per_100g: 4 },
      { name: `${DEMO_PREFIX}Banana`, calories_per_100g: 89, protein_per_100g: 1.1, fat_per_100g: 0.3, carbs_per_100g: 22.8, salt_per_100g: 1 },
      { name: `${DEMO_PREFIX}Peanut Butter`, calories_per_100g: 588, protein_per_100g: 25, fat_per_100g: 50, carbs_per_100g: 20, salt_per_100g: 420 },
      { name: `${DEMO_PREFIX}Olive Oil`, calories_per_100g: 884, protein_per_100g: 0, fat_per_100g: 100, carbs_per_100g: 0, salt_per_100g: 0 },
      { name: `${DEMO_PREFIX}Eggs`, calories_per_100g: 143, protein_per_100g: 13, fat_per_100g: 10, carbs_per_100g: 1.1, salt_per_100g: 140 },
      { name: `${DEMO_PREFIX}Mixed Berries`, calories_per_100g: 50, protein_per_100g: 0.8, fat_per_100g: 0.4, carbs_per_100g: 12, salt_per_100g: 1 },
      { name: `${DEMO_PREFIX}Baby Spinach`, calories_per_100g: 23, protein_per_100g: 2.9, fat_per_100g: 0.4, carbs_per_100g: 3.6, salt_per_100g: 75 },
      { name: `${DEMO_PREFIX}Salmon Fillet`, calories_per_100g: 208, protein_per_100g: 20, fat_per_100g: 13, carbs_per_100g: 0, salt_per_100g: 95 },
    ]

    const { data: insertedFoods, error: foodsError } = await supabase
      .from('custom_foods')
      .insert(foodsToInsert.map((food) => ({ ...food, user_id: userId })))
      .select('id, name')

    if (foodsError) return NextResponse.json({ error: foodsError.message }, { status: 500 })

    const foodIdByName = new Map((insertedFoods ?? []).map((food) => [food.name as string, food.id as string]))
    const requireFoodId = (name: string): string => {
      const id = foodIdByName.get(name)
      if (!id) throw new Error(`Missing seeded food id for ${name}`)
      return id
    }

    const recipesToInsert = [
      { name: `${DEMO_PREFIX}Green Yogurt Sauce`, total_weight_g: 220 },
      { name: `${DEMO_PREFIX}Berry Protein Oats`, total_weight_g: 420 },
      { name: `${DEMO_PREFIX}Chicken Power Bowl`, total_weight_g: 650 },
    ]

    const { data: insertedRecipes, error: recipesError } = await supabase
      .from('recipes')
      .insert(recipesToInsert.map((recipe) => ({ ...recipe, user_id: userId })))
      .select('id, name')

    if (recipesError) return NextResponse.json({ error: recipesError.message }, { status: 500 })

    const recipeIdByName = new Map((insertedRecipes ?? []).map((recipe) => [recipe.name as string, recipe.id as string]))
    const requireRecipeId = (name: string): string => {
      const id = recipeIdByName.get(name)
      if (!id) throw new Error(`Missing seeded recipe id for ${name}`)
      return id
    }

    const greenSauceId = requireRecipeId(`${DEMO_PREFIX}Green Yogurt Sauce`)
    const berryOatsId = requireRecipeId(`${DEMO_PREFIX}Berry Protein Oats`)
    const chickenBowlId = requireRecipeId(`${DEMO_PREFIX}Chicken Power Bowl`)

    const recipeIngredients = [
      { recipe_id: greenSauceId, food_id: requireFoodId(`${DEMO_PREFIX}Greek Yogurt 2%`), sub_recipe_id: null, weight_g: 140 },
      { recipe_id: greenSauceId, food_id: requireFoodId(`${DEMO_PREFIX}Baby Spinach`), sub_recipe_id: null, weight_g: 60 },
      { recipe_id: greenSauceId, food_id: requireFoodId(`${DEMO_PREFIX}Olive Oil`), sub_recipe_id: null, weight_g: 20 },

      { recipe_id: berryOatsId, food_id: requireFoodId(`${DEMO_PREFIX}Rolled Oats`), sub_recipe_id: null, weight_g: 70 },
      { recipe_id: berryOatsId, food_id: requireFoodId(`${DEMO_PREFIX}Greek Yogurt 2%`), sub_recipe_id: null, weight_g: 180 },
      { recipe_id: berryOatsId, food_id: requireFoodId(`${DEMO_PREFIX}Mixed Berries`), sub_recipe_id: null, weight_g: 130 },
      { recipe_id: berryOatsId, food_id: requireFoodId(`${DEMO_PREFIX}Peanut Butter`), sub_recipe_id: null, weight_g: 40 },

      { recipe_id: chickenBowlId, food_id: requireFoodId(`${DEMO_PREFIX}Chicken Breast`), sub_recipe_id: null, weight_g: 220 },
      { recipe_id: chickenBowlId, food_id: requireFoodId(`${DEMO_PREFIX}Brown Rice Cooked`), sub_recipe_id: null, weight_g: 250 },
      { recipe_id: chickenBowlId, food_id: requireFoodId(`${DEMO_PREFIX}Broccoli`), sub_recipe_id: null, weight_g: 150 },
      { recipe_id: chickenBowlId, food_id: null, sub_recipe_id: greenSauceId, weight_g: 30 },
    ]

    const { error: recipeIngredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(recipeIngredients)

    if (recipeIngredientsError) return NextResponse.json({ error: recipeIngredientsError.message }, { status: 500 })

    const habitsToInsert = [
      { user_id: userId, name: `${DEMO_PREFIX}Morning Mobility`, color: '#10b981' },
      { user_id: userId, name: `${DEMO_PREFIX}Hit Protein Goal`, color: '#f59e0b' },
      { user_id: userId, name: `${DEMO_PREFIX}Lights Out by 11 PM`, color: '#6366f1' },
    ]

    const { data: insertedHabits, error: habitsError } = await supabase
      .from('habits')
      .insert(habitsToInsert)
      .select('id, name')

    if (habitsError) return NextResponse.json({ error: habitsError.message }, { status: 500 })

    const habitIdByName = new Map((insertedHabits ?? []).map((habit) => [habit.name as string, habit.id as string]))
    const habitCompletionMap: Record<string, number[]> = {
      [`${DEMO_PREFIX}Morning Mobility`]: [6, 5, 4, 2, 1, 0],
      [`${DEMO_PREFIX}Hit Protein Goal`]: [6, 5, 4, 3, 2, 1, 0],
      [`${DEMO_PREFIX}Lights Out by 11 PM`]: [5, 4, 2, 1],
    }

    const habitLogsToInsert = Object.entries(habitCompletionMap).flatMap(([name, offsets]) => {
      const habitId = habitIdByName.get(name)
      if (!habitId) return []
      return offsets.map((offset) => ({
        user_id: userId,
        habit_id: habitId,
        completed_on: dayOnlyAgo(offset),
      }))
    })

    const { error: habitLogsError } = await supabase
      .from('habit_logs')
      .insert(habitLogsToInsert)

    if (habitLogsError) return NextResponse.json({ error: habitLogsError.message }, { status: 500 })

    const calendarEventsToInsert = [
      {
        user_id: userId,
        title: 'Demo Team Workout Class',
        description: '45 minute interval class with coworkers.',
        location: 'Downtown Studio',
        start_at: daysAhead(1, 18, 0),
        end_at: daysAhead(1, 18, 45),
        ics_uid: 'demo-workout-class',
      },
      {
        user_id: userId,
        title: 'Demo Grocery Run',
        description: 'Restock weekly meal prep ingredients.',
        location: 'Green Market',
        start_at: daysAhead(2, 17, 30),
        end_at: daysAhead(2, 18, 30),
        ics_uid: 'demo-grocery-run',
      },
      {
        user_id: userId,
        title: 'Demo 5K Community Run',
        description: 'Easy pace run with friends.',
        location: 'River Park',
        start_at: daysAhead(5, 8, 0),
        end_at: daysAhead(5, 9, 0),
        ics_uid: 'demo-5k-community-run',
      },
    ]

    const { error: calendarError } = await supabase
      .from('calendar_events')
      .insert(calendarEventsToInsert)

    if (calendarError) return NextResponse.json({ error: calendarError.message }, { status: 500 })

    const logs: SeedLogEntry[] = []

    const dailyWeights = [75.4, 75.2, 75.1, 74.9, 74.8, 74.7, 74.6]
    for (let idx = 0; idx < dailyWeights.length; idx++) {
      const offset = dailyWeights.length - 1 - idx
      logs.push({
        user_id: userId,
        type: 'bodyweight',
        logged_at: daysAgo(offset, 7, 10),
        notes: null,
        voice_transcript: null,
        data: { weight_kg: dailyWeights[idx], unit: 'kg' },
      })
    }

    logs.push(
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(6, 8, 5),
        notes: 'Prep from recipe library',
        voice_transcript: 'Logged berry protein oats for breakfast',
        data: {
          description: `${DEMO_PREFIX}Berry Protein Oats`,
          calories: 465,
          protein_g: 23,
          fat_g: 18,
          carbs_g: 56,
          salt_mg: 165,
          meal_type: 'breakfast',
          recipe_id: berryOatsId,
          weight_g: 260,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(6, 12, 35),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Chicken Power Bowl`,
          calories: 620,
          protein_g: 54,
          fat_g: 16,
          carbs_g: 58,
          salt_mg: 590,
          meal_type: 'lunch',
          recipe_id: chickenBowlId,
          weight_g: 360,
        },
      },
      {
        user_id: userId,
        type: 'workout',
        logged_at: daysAgo(6, 18, 0),
        notes: 'Felt strong in the final interval',
        voice_transcript: null,
        data: { activity: 'Intervals run', duration_min: 42, intensity: 'hard', distance_km: 6.1 },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(6, 21, 15),
        notes: null,
        voice_transcript: null,
        data: { score: 8, emotions: ['focused', 'optimistic'], energy_level: 7 },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(5, 7, 50),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Egg scramble with spinach`,
          calories: 340,
          protein_g: 25,
          fat_g: 20,
          carbs_g: 8,
          salt_mg: 430,
          meal_type: 'breakfast',
          food_id: requireFoodId(`${DEMO_PREFIX}Eggs`),
          weight_g: 170,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(5, 13, 10),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Salmon and rice plate`,
          calories: 590,
          protein_g: 45,
          fat_g: 24,
          carbs_g: 46,
          salt_mg: 420,
          meal_type: 'lunch',
          food_id: requireFoodId(`${DEMO_PREFIX}Salmon Fillet`),
          weight_g: 180,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(5, 19, 30),
        notes: 'Light dinner after training',
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Yogurt and berries`,
          calories: 255,
          protein_g: 20,
          fat_g: 5,
          carbs_g: 31,
          salt_mg: 95,
          meal_type: 'dinner',
          food_id: requireFoodId(`${DEMO_PREFIX}Greek Yogurt 2%`),
          weight_g: 250,
        },
      },
      {
        user_id: userId,
        type: 'workout',
        logged_at: daysAgo(5, 17, 40),
        notes: null,
        voice_transcript: null,
        data: { activity: 'Upper body strength', duration_min: 48, intensity: 'moderate', distance_km: null },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(5, 21, 20),
        notes: null,
        voice_transcript: null,
        data: { score: 6, emotions: ['busy', 'steady'], energy_level: 6 },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(4, 8, 0),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Berry Protein Oats`,
          calories: 430,
          protein_g: 21,
          fat_g: 16,
          carbs_g: 51,
          salt_mg: 155,
          meal_type: 'breakfast',
          recipe_id: berryOatsId,
          weight_g: 240,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(4, 12, 20),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Chicken Power Bowl`,
          calories: 640,
          protein_g: 56,
          fat_g: 17,
          carbs_g: 61,
          salt_mg: 620,
          meal_type: 'lunch',
          recipe_id: chickenBowlId,
          weight_g: 375,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(4, 16, 45),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Banana with peanut butter`,
          calories: 245,
          protein_g: 7,
          fat_g: 13,
          carbs_g: 29,
          salt_mg: 115,
          meal_type: 'snack',
          food_id: requireFoodId(`${DEMO_PREFIX}Banana`),
          weight_g: 155,
        },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(4, 21, 0),
        notes: null,
        voice_transcript: null,
        data: { score: 7, emotions: ['calm', 'productive'], energy_level: 7 },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(3, 8, 15),
        notes: null,
        voice_transcript: 'Two eggs and spinach for breakfast',
        data: {
          description: `${DEMO_PREFIX}Eggs and spinach`,
          calories: 305,
          protein_g: 23,
          fat_g: 19,
          carbs_g: 7,
          salt_mg: 360,
          meal_type: 'breakfast',
          food_id: requireFoodId(`${DEMO_PREFIX}Eggs`),
          weight_g: 150,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(3, 13, 5),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Salmon bowl`,
          calories: 610,
          protein_g: 44,
          fat_g: 25,
          carbs_g: 52,
          salt_mg: 510,
          meal_type: 'lunch',
          food_id: requireFoodId(`${DEMO_PREFIX}Salmon Fillet`),
          weight_g: 190,
        },
      },
      {
        user_id: userId,
        type: 'workout',
        logged_at: daysAgo(3, 18, 10),
        notes: null,
        voice_transcript: null,
        data: { activity: 'Mobility and core', duration_min: 32, intensity: 'light', distance_km: null },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(3, 21, 10),
        notes: null,
        voice_transcript: null,
        data: { score: 5, emotions: ['drained', 'hopeful'], energy_level: 4 },
      },
      {
        user_id: userId,
        type: 'reflection',
        logged_at: daysAgo(3, 22, 0),
        notes: null,
        voice_transcript: null,
        data: {
          content: 'Midweek dip in energy, but nutrition has been consistent. I should move one workout earlier in the day.',
        },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(2, 7, 55),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Berry Protein Oats`,
          calories: 455,
          protein_g: 22,
          fat_g: 17,
          carbs_g: 55,
          salt_mg: 160,
          meal_type: 'breakfast',
          recipe_id: berryOatsId,
          weight_g: 255,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(2, 12, 40),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Chicken Power Bowl`,
          calories: 635,
          protein_g: 55,
          fat_g: 16,
          carbs_g: 60,
          salt_mg: 605,
          meal_type: 'lunch',
          recipe_id: chickenBowlId,
          weight_g: 370,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(2, 18, 50),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Yogurt bowl with berries`,
          calories: 235,
          protein_g: 19,
          fat_g: 4,
          carbs_g: 29,
          salt_mg: 92,
          meal_type: 'dinner',
          food_id: requireFoodId(`${DEMO_PREFIX}Greek Yogurt 2%`),
          weight_g: 230,
        },
      },
      {
        user_id: userId,
        type: 'workout',
        logged_at: daysAgo(2, 17, 30),
        notes: 'Kept heart rate in zone 2',
        voice_transcript: null,
        data: { activity: 'Steady run', duration_min: 36, intensity: 'moderate', distance_km: 5.4 },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(2, 21, 5),
        notes: null,
        voice_transcript: null,
        data: { score: 8, emotions: ['confident', 'balanced'], energy_level: 8 },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(1, 8, 10),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Egg scramble with spinach`,
          calories: 325,
          protein_g: 24,
          fat_g: 19,
          carbs_g: 6,
          salt_mg: 345,
          meal_type: 'breakfast',
          food_id: requireFoodId(`${DEMO_PREFIX}Eggs`),
          weight_g: 160,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(1, 13, 0),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Chicken Power Bowl`,
          calories: 625,
          protein_g: 54,
          fat_g: 16,
          carbs_g: 59,
          salt_mg: 600,
          meal_type: 'lunch',
          recipe_id: chickenBowlId,
          weight_g: 365,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(1, 16, 30),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Peanut butter snack`,
          calories: 190,
          protein_g: 8,
          fat_g: 15,
          carbs_g: 7,
          salt_mg: 96,
          meal_type: 'snack',
          food_id: requireFoodId(`${DEMO_PREFIX}Peanut Butter`),
          weight_g: 32,
        },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(1, 21, 30),
        notes: null,
        voice_transcript: null,
        data: { score: 7, emotions: ['settled', 'satisfied'], energy_level: 7 },
      },
      {
        user_id: userId,
        type: 'reflection',
        logged_at: daysAgo(1, 22, 5),
        notes: null,
        voice_transcript: null,
        data: {
          content: 'Consistency felt easier once meals were prepped from saved foods and recipes. Sleep still needs work on busy days.',
        },
      },

      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(0, 8, 20),
        notes: null,
        voice_transcript: null,
        data: {
          description: `${DEMO_PREFIX}Berry Protein Oats`,
          calories: 440,
          protein_g: 22,
          fat_g: 16,
          carbs_g: 53,
          salt_mg: 158,
          meal_type: 'breakfast',
          recipe_id: berryOatsId,
          weight_g: 248,
        },
      },
      {
        user_id: userId,
        type: 'meal',
        logged_at: daysAgo(0, 12, 45),
        notes: 'Post-workout meal',
        voice_transcript: 'Lunch was my chicken power bowl from recipes',
        data: {
          description: `${DEMO_PREFIX}Chicken Power Bowl`,
          calories: 645,
          protein_g: 56,
          fat_g: 17,
          carbs_g: 61,
          salt_mg: 620,
          meal_type: 'lunch',
          recipe_id: chickenBowlId,
          weight_g: 378,
        },
      },
      {
        user_id: userId,
        type: 'workout',
        logged_at: daysAgo(0, 17, 20),
        notes: null,
        voice_transcript: null,
        data: { activity: 'Tempo run', duration_min: 34, intensity: 'moderate', distance_km: 5.1 },
      },
      {
        user_id: userId,
        type: 'mood',
        logged_at: daysAgo(0, 21, 0),
        notes: null,
        voice_transcript: null,
        data: { score: 9, emotions: ['proud', 'energized', 'calm'], energy_level: 8 },
      },
      {
        user_id: userId,
        type: 'reflection',
        logged_at: daysAgo(0, 21, 45),
        notes: null,
        voice_transcript: null,
        data: {
          content: 'Great finish to the week. Weight trend is moving in the right direction and workouts are consistent.',
        },
      },
    )

    const { data: insertedLogs, error: logsError } = await supabase
      .from('log_entries')
      .insert(logs)
      .select('id')

    if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })

    return NextResponse.json({
      data: {
        seeded: insertedLogs?.length ?? 0,
        details: {
          foods: insertedFoods?.length ?? 0,
          recipes: insertedRecipes?.length ?? 0,
          habits: insertedHabits?.length ?? 0,
          habit_logs: habitLogsToInsert.length,
          calendar_events: calendarEventsToInsert.length,
          bodyweight_entries: dailyWeights.length,
        },
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
