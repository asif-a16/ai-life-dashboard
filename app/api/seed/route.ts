import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function daysAgo(n: number, hour = 12, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    // Delete last 8 days of entries for this user
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    await supabase
      .from('log_entries')
      .delete()
      .eq('user_id', userId)
      .gte('logged_at', eightDaysAgo.toISOString())

    const entries = [
      // Day 7 ago
      { type: 'meal', logged_at: daysAgo(7, 8, 0), data: { description: 'Oatmeal with berries', calories: 320, protein_g: 10, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(7, 12, 30), data: { description: 'Grilled chicken salad', calories: 450, protein_g: 38, meal_type: 'lunch' } },
      { type: 'workout', logged_at: daysAgo(7, 17, 0), data: { activity: 'Running', duration_min: 35, intensity: 'moderate', distance_km: 5.2 } },
      { type: 'mood', logged_at: daysAgo(7, 20, 0), data: { score: 7, emotions: ['motivated', 'energetic'], energy_level: 7 } },

      // Day 6 ago
      { type: 'meal', logged_at: daysAgo(6, 7, 30), data: { description: 'Greek yogurt and granola', calories: 280, protein_g: 18, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(6, 13, 0), data: { description: 'Turkey sandwich with avocado', calories: 520, protein_g: 32, meal_type: 'lunch' } },
      { type: 'bodyweight', logged_at: daysAgo(6, 9, 0), data: { weight_kg: 75.2, unit: 'kg' } },
      { type: 'mood', logged_at: daysAgo(6, 21, 0), data: { score: 5, emotions: ['tired', 'okay'], energy_level: 4 } },

      // Day 5 ago
      { type: 'meal', logged_at: daysAgo(5, 8, 0), data: { description: 'Scrambled eggs and toast', calories: 380, protein_g: 22, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(5, 12, 0), data: { description: 'Caesar salad with grilled salmon', calories: 490, protein_g: 42, meal_type: 'lunch' } },
      { type: 'meal', logged_at: daysAgo(5, 19, 0), data: { description: 'Pasta with marinara and meatballs', calories: 680, protein_g: 34, meal_type: 'dinner' } },
      { type: 'workout', logged_at: daysAgo(5, 7, 0), data: { activity: 'Gym — upper body', duration_min: 50, intensity: 'hard', distance_km: null } },

      // Day 4 ago
      { type: 'meal', logged_at: daysAgo(4, 9, 0), data: { description: 'Smoothie with protein powder', calories: 350, protein_g: 28, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(4, 13, 30), data: { description: 'Quinoa bowl with roasted vegetables', calories: 420, protein_g: 16, meal_type: 'lunch' } },
      { type: 'reflection', logged_at: daysAgo(4, 22, 0), data: { content: 'Feeling good about this week. The morning runs are becoming a habit. Want to focus on getting to bed earlier so I have more energy for workouts.' } },
      { type: 'mood', logged_at: daysAgo(4, 20, 0), data: { score: 8, emotions: ['happy', 'focused', 'calm'], energy_level: 8 } },

      // Day 3 ago
      { type: 'meal', logged_at: daysAgo(3, 7, 45), data: { description: 'Banana and peanut butter on toast', calories: 310, protein_g: 12, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(3, 12, 30), data: { description: 'Chicken rice bowl with broccoli', calories: 580, protein_g: 45, meal_type: 'lunch' } },
      { type: 'bodyweight', logged_at: daysAgo(3, 8, 0), data: { weight_kg: 74.8, unit: 'kg' } },
      { type: 'workout', logged_at: daysAgo(3, 18, 0), data: { activity: 'Yoga', duration_min: 30, intensity: 'light', distance_km: null } },

      // Day 2 ago
      { type: 'meal', logged_at: daysAgo(2, 8, 30), data: { description: 'Avocado toast with poached eggs', calories: 420, protein_g: 20, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(2, 13, 0), data: { description: 'Lentil soup with bread', calories: 380, protein_g: 18, meal_type: 'lunch' } },
      { type: 'meal', logged_at: daysAgo(2, 19, 30), data: { description: 'Grilled steak with sweet potato', calories: 650, protein_g: 52, meal_type: 'dinner' } },
      { type: 'mood', logged_at: daysAgo(2, 21, 0), data: { score: 6, emotions: ['content', 'relaxed'], energy_level: 5 } },

      // Yesterday
      { type: 'meal', logged_at: daysAgo(1, 8, 0), data: { description: 'Overnight oats with chia seeds', calories: 340, protein_g: 14, meal_type: 'breakfast' } },
      { type: 'meal', logged_at: daysAgo(1, 12, 0), data: { description: 'Tuna salad wrap', calories: 460, protein_g: 36, meal_type: 'lunch' } },
      { type: 'reflection', logged_at: daysAgo(1, 21, 30), data: { content: 'Solid week overall. Hit my workout targets and kept calories in a good range. Next week I want to try adding a second run day and tracking hydration more consistently.' } },
    ].map((e) => ({ ...e, user_id: userId, notes: null, voice_transcript: null }))

    const { data: inserted, error } = await supabase
      .from('log_entries')
      .insert(entries)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { seeded: inserted?.length ?? 0 } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
