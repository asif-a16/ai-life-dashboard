import type { ParsedLogEntry } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Extract a calorie number from text that handles:
 * - "450 calories" / "450 cal" / "450 kcal"
 * - "around 450 calories" / "about 500 cal"
 * - "450" immediately before "calorie/cal/kcal" with optional filler words
 */
function extractCalories(text: string): number | null {
  // Match: optional filler, number, optional whitespace/filler, calorie word
  const match = text.match(/(?:around|about|approximately|roughly)?\s*(\d+)\s*(?:or so)?\s*(cal(?:orie)?s?|kcal)/i)
  if (match) return parseInt(match[1])
  // Also match bare number followed by "calories" anywhere in sentence
  const loose = text.match(/(\d+)\s+calories/i)
  if (loose) return parseInt(loose[1])
  return null
}

/**
 * Extract a description from a meal transcript by stripping action words and
 * calorie/protein phrases, leaving the food name.
 */
function extractMealDescription(transcript: string): string {
  return transcript
    .replace(/^(log|logged|logging|i had|had|i ate|ate|i just had|just had|i ate|add|adding)\s+/i, '')
    .replace(/\s*(which is|that('s| is)|with)\s+(around|about|approximately|roughly)?\s*\d+\s*(cal(?:orie)?s?|kcal|g|grams? of protein|protein)/gi, '')
    .replace(/\s*(around|about|approximately|roughly)?\s*\d+\s*(cal(?:orie)?s?|kcal)/gi, '')
    .replace(/\s*(around|about|approximately|roughly)?\s*\d+\s*(g|grams?)\s*(of\s*)?protein/gi, '')
    .trim()
    || transcript
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function mockParseTranscript(transcript: string): ParsedLogEntry {
  const lower = transcript.toLowerCase().trim()

  // --- Detection signals ---

  const isBodyweight = /\b(weigh|weight|kg|lbs|pounds|kilos|scale)\b/.test(lower)

  const isWorkout = /\b(workout|exercise|run|ran|gym|walk|walked|yoga|swim|cycl|lifted|training)\b/.test(lower)

  // Meal: action words ("log", "had", "ate") OR food keywords OR calorie mention
  const hasMealAction = /\b(log|logged|logging|had|ate|eat|eating|meal|food)\b/.test(lower)
  const hasFoodKeyword = /\b(chicken|beef|fish|salmon|tuna|steak|pork|turkey|egg|rice|pasta|bread|salad|soup|sandwich|wrap|bowl|oat|yogurt|smoothie|shake|protein|fruit|vegetable|veggie|pizza|burger|fries|sushi|noodle|cereal|granola|avocado|banana|apple|toast|pancake|waffle|coffee|juice)\b/.test(lower)
  const hasCalorieWord = /\b(cal(?:orie)?s?|kcal)\b/.test(lower)
  const isMeal = hasMealAction || hasFoodKeyword || hasCalorieWord

  const isMood = /\b(feel|feeling|mood|happy|sad|anxious|stressed|tired|energetic|great|awful)\b/.test(lower)

  // --- Priority: bodyweight > workout > meal > mood > reflection ---

  if (isBodyweight) {
    const numberMatch = transcript.match(/(\d+\.?\d*)\s*(kg|lbs|pounds|kilos)?/)
    console.log('[parser] classified as bodyweight')
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
    console.log('[parser] classified as workout')
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
    const calories = extractCalories(transcript)
    const proteinMatch = transcript.match(/(\d+)\s*(g|gram).*protein|protein.*?(\d+)\s*(g|gram)/i)
    const protein = proteinMatch
      ? parseInt(proteinMatch[1] !== undefined ? proteinMatch[1] : proteinMatch[3])
      : null
    const fatMatch = transcript.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?fat/i)
    const carbsMatch = transcript.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?carbs?/i)
    const saltMatch = transcript.match(/(\d+(?:\.\d+)?)\s*mg?\s*(?:of\s+)?salt/i)
    const description = extractMealDescription(transcript)
    console.log('[parser] classified as meal — description:', description, 'calories:', calories)
    return {
      type: 'meal',
      notes: '',
      logged_at: null,
      data: {
        description,
        calories,
        protein_g: protein,
        fat_g: fatMatch ? parseFloat(fatMatch[1]) : null,
        carbs_g: carbsMatch ? parseFloat(carbsMatch[1]) : null,
        salt_mg: saltMatch ? parseFloat(saltMatch[1]) : null,
        meal_type: extractMealType(lower),
      },
    }
  }

  if (isMood) {
    const scoreMatch = transcript.match(/(\d+)\s*(out of|\/)\s*10/)
    console.log('[parser] classified as mood')
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

  console.log('[parser] fallback to reflection — no keywords matched for:', transcript)
  return {
    type: 'reflection',
    notes: '',
    logged_at: null,
    data: { content: transcript },
  }
}
