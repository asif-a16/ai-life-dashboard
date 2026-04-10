import type { ParsedLogEntry } from '@/lib/types'

function extractActivity(lower: string): string {
  if (/run|ran|jog/.test(lower)) return 'Running'
  if (/gym|lift|weight|strength/.test(lower)) return 'Gym'
  if (/walk|walked/.test(lower)) return 'Walking'
  if (/yoga/.test(lower)) return 'Yoga'
  if (/swim|pool/.test(lower)) return 'Swimming'
  if (/cycl|bike|bicycle/.test(lower)) return 'Cycling'
  return 'Workout'
}

function extractIntensity(lower: string): 'light' | 'moderate' | 'hard' {
  if (/hard|intense|heavy|tough|sprint|max/.test(lower)) return 'hard'
  if (/light|easy|gentle|slow|casual/.test(lower)) return 'light'
  return 'moderate'
}

function extractMealType(lower: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (/breakfast|morning|cereal|oat/.test(lower)) return 'breakfast'
  if (/lunch|midday|noon/.test(lower)) return 'lunch'
  if (/dinner|supper|evening/.test(lower)) return 'dinner'
  return 'snack'
}

export function mockParseTranscript(transcript: string): ParsedLogEntry {
  const lower = transcript.toLowerCase()

  const isBodyweight = /\b(weigh|weight|kg|lbs|pounds|kilos|scale)\b/.test(lower)
  const isWorkout = /\b(workout|exercise|run|ran|gym|walk|walked|yoga|swim|cycl|lifted|training)\b/.test(lower)
  const isMeal = /\b(ate|had|meal|breakfast|lunch|dinner|snack|calories|protein|food|eat)\b/.test(lower)
  const isMood = /\b(feel|feeling|mood|happy|sad|anxious|stressed|tired|energetic|great|awful)\b/.test(lower)

  if (isBodyweight) {
    const numberMatch = transcript.match(/(\d+\.?\d*)\s*(kg|lbs|pounds|kilos)?/)
    return {
      type: 'bodyweight',
      notes: '',
      logged_at: null,
      data: { weight_kg: numberMatch ? parseFloat(numberMatch[1]) : 0, unit: 'kg' },
    }
  }

  if (isWorkout) {
    const minutesMatch = transcript.match(/(\d+)\s*(min|minute)/)
    const kmMatch = transcript.match(/(\d+\.?\d*)\s*k(m|ilometre)?/)
    return {
      type: 'workout',
      notes: '',
      logged_at: null,
      data: {
        activity: extractActivity(lower),
        duration_min: minutesMatch ? parseInt(minutesMatch[1]) : 30,
        intensity: extractIntensity(lower),
        distance_km: kmMatch ? parseFloat(kmMatch[1]) : null,
      },
    }
  }

  if (isMeal) {
    const caloriesMatch = transcript.match(/(\d+)\s*(cal|calorie|kcal)/)
    const proteinMatch = transcript.match(/(\d+)\s*(g|gram).*protein|protein.*?(\d+)\s*(g|gram)/)
    const protein = proteinMatch
      ? parseInt(proteinMatch[1] !== undefined ? proteinMatch[1] : proteinMatch[3])
      : null
    return {
      type: 'meal',
      notes: '',
      logged_at: null,
      data: {
        description: transcript,
        calories: caloriesMatch ? parseInt(caloriesMatch[1]) : null,
        protein_g: protein,
        meal_type: extractMealType(lower),
      },
    }
  }

  if (isMood) {
    const scoreMatch = transcript.match(/(\d+)\s*(out of|\/)\s*10/)
    return {
      type: 'mood',
      notes: '',
      logged_at: null,
      data: {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 6,
        emotions: [],
        energy_level: 5,
      },
    }
  }

  return {
    type: 'reflection',
    notes: '',
    logged_at: null,
    data: { content: transcript },
  }
}
