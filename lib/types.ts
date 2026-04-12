import { z } from 'zod'

// ─── Log Entry Types ──────────────────────────────────────────────────────────

export const MealDataSchema = z.object({
  description: z.string().min(1),
  calories: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  salt_mg: z.number().nullable().optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_id: z.string().uuid().nullable().optional(),
  recipe_id: z.string().uuid().nullable().optional(),
  weight_g: z.number().positive().nullable().optional(),
})

export const WorkoutDataSchema = z.object({
  activity: z.string().min(1),
  duration_min: z.number().int().positive(),
  intensity: z.enum(['light', 'moderate', 'hard']),
  distance_km: z.number().nullable(),
})

export const BodyweightDataSchema = z.object({
  weight_kg: z.number().positive(),
  unit: z.enum(['kg', 'lbs']),
})

export const MoodDataSchema = z.object({
  score: z.number().int().min(1).max(10),
  emotions: z.array(z.string()),
  energy_level: z.number().int().min(1).max(10),
})

export const ReflectionDataSchema = z.object({
  content: z.string().min(1),
})

export const LogEntryTypeSchema = z.enum([
  'meal',
  'workout',
  'bodyweight',
  'mood',
  'reflection',
])
export type LogEntryType = z.infer<typeof LogEntryTypeSchema>

export const LogEntrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meal'), data: MealDataSchema, notes: z.string().optional(), logged_at: z.string().nullable().optional(), voice_transcript: z.string().optional() }),
  z.object({ type: z.literal('workout'), data: WorkoutDataSchema, notes: z.string().optional(), logged_at: z.string().nullable().optional(), voice_transcript: z.string().optional() }),
  z.object({ type: z.literal('bodyweight'), data: BodyweightDataSchema, notes: z.string().optional(), logged_at: z.string().nullable().optional(), voice_transcript: z.string().optional() }),
  z.object({ type: z.literal('mood'), data: MoodDataSchema, notes: z.string().optional(), logged_at: z.string().nullable().optional(), voice_transcript: z.string().optional() }),
  z.object({ type: z.literal('reflection'), data: ReflectionDataSchema, notes: z.string().optional(), logged_at: z.string().nullable().optional(), voice_transcript: z.string().optional() }),
])
export type LogEntry = z.infer<typeof LogEntrySchema>

export const LogEntryUpdateSchema = z.object({
  id: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
  logged_at: z.string().optional(),
})

export type MealData = z.infer<typeof MealDataSchema>
export type WorkoutData = z.infer<typeof WorkoutDataSchema>
export type BodyweightData = z.infer<typeof BodyweightDataSchema>
export type MoodData = z.infer<typeof MoodDataSchema>
export type ReflectionData = z.infer<typeof ReflectionDataSchema>

// DB row shape returned from Supabase
export interface LogEntryRow {
  id: string
  user_id: string
  type: LogEntryType
  logged_at: string
  notes: string | null
  data: Record<string, unknown>
  voice_transcript: string | null
  created_at: string
}

// ─── Parsed Log Entry (from voice pipeline) ───────────────────────────────────

export const ParsedLogEntrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meal'), notes: z.string(), logged_at: z.string().nullable(), data: MealDataSchema }),
  z.object({ type: z.literal('workout'), notes: z.string(), logged_at: z.string().nullable(), data: WorkoutDataSchema }),
  z.object({ type: z.literal('bodyweight'), notes: z.string(), logged_at: z.string().nullable(), data: BodyweightDataSchema }),
  z.object({ type: z.literal('mood'), notes: z.string(), logged_at: z.string().nullable(), data: MoodDataSchema }),
  z.object({ type: z.literal('reflection'), notes: z.string(), logged_at: z.string().nullable(), data: ReflectionDataSchema }),
])
export type ParsedLogEntry = z.infer<typeof ParsedLogEntrySchema>

// ─── Habits ───────────────────────────────────────────────────────────────────

export interface Habit {
  id: string
  user_id: string
  name: string
  color: string
  is_active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_on: string
  created_at: string
}

export interface HabitWithLog extends Habit {
  completedToday: boolean
  currentStreak: number
  completedThisWeek: number
}

// ─── Calendar Events ─────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
  ics_uid: string | null
  created_at: string
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export type InsightMode = 'mock' | 'llm'

export interface InsightCache {
  id: string
  user_id: string
  period_end: string
  stats_json: DashboardStats
  narrative: string
  audio_url: string | null
  insight_mode: InsightMode
  created_at: string
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  periodDays: 7
  logCounts: Record<LogEntryType, number>
  mood: {
    avg: number | null
    energyAvg: number | null
  }
  workout: {
    count: number
    totalMinutes: number
  }
  bodyweight: {
    first: number | null
    last: number | null
    delta: number | null
  }
  calories: {
    totalLogged: number
    avgProteinPerDay: number | null
  }
  habits: Array<{
    id: string
    name: string
    color: string
    completedThisWeek: number
    currentStreak: number
  }>
  reflectionCount: number
  upcomingEvents: Array<{
    title: string
    start_at: string
    location: string | null
  }>
}

// ─── Recent Entries Context (for LLM insight prompt) ─────────────────────────

export interface RecentEntriesContext {
  recentMoods: Array<{ score: number; energy_level: number; logged_at: string; emotions: string[] }>
  recentWorkouts: Array<{ activity: string; duration_min: number; intensity: string; logged_at: string }>
}

// ─── Voice Intent ─────────────────────────────────────────────────────────────

export type VoiceIntent = 'log' | 'question'

export interface VoiceQuestionResult {
  text: string
  audioUrl: string | null
  transcript: string
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  display_name: string
  timezone: string
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

// ─── Assistant (Conversational AI) ───────────────────────────────────────────

export interface AssistantMessage {
  source: 'user' | 'agent'
  text: string
}

export interface AssistantDraft {
  entry: { type: LogEntryType; data: Record<string, unknown> }
  resolve: (result: { status: 'saved' | 'discarded' | 'error'; message?: string }) => void
}

// ─── Custom Foods ─────────────────────────────────────────────────────────────

export const CustomFoodSchema = z.object({
  name: z.string().min(1),
  calories_per_100g: z.number().nonnegative(),
  protein_per_100g: z.number().nonnegative().nullable().optional(),
  fat_per_100g: z.number().nonnegative().nullable().optional(),
  carbs_per_100g: z.number().nonnegative().nullable().optional(),
  salt_per_100g: z.number().nonnegative().nullable().optional(),
})

export const CustomFoodUpdateSchema = CustomFoodSchema.extend({
  id: z.string().uuid(),
})

export interface CustomFood {
  id: string
  user_id: string
  name: string
  calories_per_100g: number
  protein_per_100g: number | null
  fat_per_100g: number | null
  carbs_per_100g: number | null
  salt_per_100g: number | null
  created_at: string
  updated_at: string
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const RecipeSchema = z.object({
  name: z.string().min(1),
  total_weight_g: z.number().positive(),
})

export const RecipeUpdateSchema = RecipeSchema.extend({
  id: z.string().uuid(),
})

export const RecipeIngredientCreateSchema = z.object({
  recipe_id: z.string().uuid(),
  food_id: z.string().uuid().nullable().optional(),
  sub_recipe_id: z.string().uuid().nullable().optional(),
  weight_g: z.number().positive(),
})

export interface Recipe {
  id: string
  user_id: string
  name: string
  total_weight_g: number
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  food_id: string | null
  sub_recipe_id: string | null
  weight_g: number
}
