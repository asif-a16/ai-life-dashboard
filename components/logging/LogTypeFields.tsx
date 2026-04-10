'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LogEntryType } from '@/lib/types'

interface LogTypeFieldsProps {
  type: LogEntryType
  value: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

export function LogTypeFields({ type, value, onChange }: LogTypeFieldsProps) {
  function update(key: string, val: unknown) {
    onChange({ ...value, [key]: val })
  }

  if (type === 'meal') {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="e.g. Grilled chicken with rice"
            value={(value.description as string) ?? ''}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meal_type">Meal Type</Label>
          <Select
            value={(value.meal_type as string) ?? 'lunch'}
            onValueChange={(v) => update('meal_type', v)}
          >
            <SelectTrigger id="meal_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              type="number"
              placeholder="e.g. 450"
              value={(value.calories as number) ?? ''}
              onChange={(e) => update('calories', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="protein_g">Protein (g)</Label>
            <Input
              id="protein_g"
              type="number"
              placeholder="e.g. 35"
              value={(value.protein_g as number) ?? ''}
              onChange={(e) => update('protein_g', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'workout') {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="activity">Activity</Label>
          <Input
            id="activity"
            placeholder="e.g. Running"
            value={(value.activity as string) ?? ''}
            onChange={(e) => update('activity', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="duration_min">Duration (min)</Label>
            <Input
              id="duration_min"
              type="number"
              placeholder="e.g. 30"
              value={(value.duration_min as number) ?? ''}
              onChange={(e) => update('duration_min', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intensity">Intensity</Label>
            <Select
              value={(value.intensity as string) ?? 'moderate'}
              onValueChange={(v) => update('intensity', v)}
            >
              <SelectTrigger id="intensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="distance_km">Distance (km, optional)</Label>
          <Input
            id="distance_km"
            type="number"
            step="0.1"
            placeholder="e.g. 5.0"
            value={(value.distance_km as number) ?? ''}
            onChange={(e) => update('distance_km', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>
    )
  }

  if (type === 'bodyweight') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Weight</Label>
            <Input
              id="weight_kg"
              type="number"
              step="0.1"
              placeholder="e.g. 75.5"
              value={(value.weight_kg as number) ?? ''}
              onChange={(e) => update('weight_kg', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Select
              value={(value.unit as string) ?? 'kg'}
              onValueChange={(v) => update('unit', v)}
            >
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'mood') {
    const score = (value.score as number) ?? 6
    const energyLevel = (value.energy_level as number) ?? 5
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="score">Mood Score: {score}/10</Label>
          <input
            id="score"
            type="range"
            min={1}
            max={10}
            value={score}
            onChange={(e) => update('score', Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (low)</span>
            <span>10 (great)</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="energy_level">Energy Level: {energyLevel}/10</Label>
          <input
            id="energy_level"
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={(e) => update('energy_level', Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (exhausted)</span>
            <span>10 (energized)</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emotions">Emotions (comma-separated)</Label>
          <Input
            id="emotions"
            placeholder="e.g. happy, calm, focused"
            value={((value.emotions as string[]) ?? []).join(', ')}
            onChange={(e) =>
              update(
                'emotions',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      </div>
    )
  }

  if (type === 'reflection') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="content">Reflection</Label>
        <Textarea
          id="content"
          placeholder="What's on your mind today?"
          className="min-h-24 resize-none"
          value={(value.content as string) ?? ''}
          onChange={(e) => update('content', e.target.value)}
        />
      </div>
    )
  }

  return null
}
