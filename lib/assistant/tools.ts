import type { SupabaseClient } from '@supabase/supabase-js'
import { computeDashboardStats } from '@/lib/ai/computeStats'

export async function queryMoodSummary(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    avg_score: stats.mood.avg !== null ? Math.round(stats.mood.avg * 10) / 10 : null,
    avg_energy: stats.mood.energyAvg !== null ? Math.round(stats.mood.energyAvg * 10) / 10 : null,
    entry_count: stats.logCounts.mood,
    period_days: 7,
  }
}

export async function queryWeightTrend(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    first_kg: stats.bodyweight.first,
    last_kg: stats.bodyweight.last,
    delta_kg: stats.bodyweight.delta !== null ? Math.round(stats.bodyweight.delta * 100) / 100 : null,
    entry_count: stats.logCounts.bodyweight,
  }
}

export async function queryWorkoutConsistency(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    workout_count: stats.workout.count,
    total_minutes: stats.workout.totalMinutes,
    period_days: 7,
  }
}

export async function queryHabitsSummary(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    habits: stats.habits.map(h => ({
      name: h.name,
      completed_this_week: h.completedThisWeek,
      current_streak: h.currentStreak,
    })),
  }
}

export async function queryRecentMeals(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    meal_count: stats.logCounts.meal,
    total_calories: stats.calories.totalLogged,
    avg_protein_g: stats.calories.avgProteinPerDay !== null
      ? Math.round(stats.calories.avgProteinPerDay * 10) / 10
      : null,
  }
}

export async function queryCustomFoods(userId: string, supabase: SupabaseClient) {
  const { data: foods } = await supabase
    .from('custom_foods')
    .select('id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
    .eq('user_id', userId)
    .order('name')
  return {
    foods: (foods ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      calories_per_100g: f.calories_per_100g,
      protein_per_100g: f.protein_per_100g,
      fat_per_100g: f.fat_per_100g,
      carbs_per_100g: f.carbs_per_100g,
    })),
  }
}

export async function queryAllSummary(userId: string, supabase: SupabaseClient) {
  const stats = await computeDashboardStats(userId, supabase)
  return {
    period_days: 7,
    mood: {
      avg_score: stats.mood.avg !== null ? Math.round(stats.mood.avg * 10) / 10 : null,
      avg_energy: stats.mood.energyAvg !== null ? Math.round(stats.mood.energyAvg * 10) / 10 : null,
      entry_count: stats.logCounts.mood,
    },
    bodyweight: {
      first_kg: stats.bodyweight.first,
      last_kg: stats.bodyweight.last,
      delta_kg: stats.bodyweight.delta !== null ? Math.round(stats.bodyweight.delta * 100) / 100 : null,
      entry_count: stats.logCounts.bodyweight,
    },
    workout: {
      count: stats.workout.count,
      total_minutes: stats.workout.totalMinutes,
    },
    nutrition: {
      meal_count: stats.logCounts.meal,
      total_calories: stats.calories.totalLogged,
      avg_protein_g: stats.calories.avgProteinPerDay !== null
        ? Math.round(stats.calories.avgProteinPerDay * 10) / 10
        : null,
    },
    habits: stats.habits.map(h => ({
      name: h.name,
      completed_this_week: h.completedThisWeek,
      current_streak: h.currentStreak,
    })),
    reflection_count: stats.reflectionCount,
    upcoming_events: stats.upcomingEvents.map(e => ({
      title: e.title,
      start_at: e.start_at,
      location: e.location,
    })),
  }
}
