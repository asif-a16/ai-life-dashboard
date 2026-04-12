'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, Plus, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CustomFood } from '@/lib/types'

interface FoodFormData {
  name: string
  calories_per_100g: string
  protein_per_100g: string
  fat_per_100g: string
  carbs_per_100g: string
  salt_per_100g: string
}

const EMPTY_FORM: FoodFormData = {
  name: '',
  calories_per_100g: '',
  protein_per_100g: '',
  fat_per_100g: '',
  carbs_per_100g: '',
  salt_per_100g: '',
}

function foodToForm(food: CustomFood): FoodFormData {
  return {
    name: food.name,
    calories_per_100g: String(food.calories_per_100g),
    protein_per_100g: food.protein_per_100g !== null ? String(food.protein_per_100g) : '',
    fat_per_100g: food.fat_per_100g !== null ? String(food.fat_per_100g) : '',
    carbs_per_100g: food.carbs_per_100g !== null ? String(food.carbs_per_100g) : '',
    salt_per_100g: food.salt_per_100g !== null ? String(food.salt_per_100g) : '',
  }
}

function formToPayload(form: FoodFormData) {
  return {
    name: form.name.trim(),
    calories_per_100g: Number(form.calories_per_100g),
    protein_per_100g: form.protein_per_100g !== '' ? Number(form.protein_per_100g) : null,
    fat_per_100g: form.fat_per_100g !== '' ? Number(form.fat_per_100g) : null,
    carbs_per_100g: form.carbs_per_100g !== '' ? Number(form.carbs_per_100g) : null,
    salt_per_100g: form.salt_per_100g !== '' ? Number(form.salt_per_100g) : null,
  }
}

function FoodForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  error,
  submitLabel,
}: {
  form: FoodFormData
  onChange: (form: FoodFormData) => void
  onSubmit: () => void
  onCancel: () => void
  isSaving: boolean
  error: string | null
  submitLabel: string
}) {
  function set(key: keyof FoodFormData, val: string) {
    onChange({ ...form, [key]: val })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="food-name">Name</Label>
        <Input
          id="food-name"
          placeholder="e.g. Chicken Breast"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="calories">Calories / 100g</Label>
          <Input
            id="calories"
            type="number"
            min={0}
            placeholder="e.g. 165"
            value={form.calories_per_100g}
            onChange={(e) => set('calories_per_100g', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="protein">Protein (g) / 100g</Label>
          <Input
            id="protein"
            type="number"
            min={0}
            placeholder="e.g. 31"
            value={form.protein_per_100g}
            onChange={(e) => set('protein_per_100g', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fat">Fat (g) / 100g</Label>
          <Input
            id="fat"
            type="number"
            min={0}
            placeholder="e.g. 3.6"
            value={form.fat_per_100g}
            onChange={(e) => set('fat_per_100g', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="carbs">Carbs (g) / 100g</Label>
          <Input
            id="carbs"
            type="number"
            min={0}
            placeholder="e.g. 0"
            value={form.carbs_per_100g}
            onChange={(e) => set('carbs_per_100g', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salt">Salt (g) / 100g</Label>
          <Input
            id="salt"
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 0.07"
            value={form.salt_per_100g}
            onChange={(e) => set('salt_per_100g', e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={isSaving || !form.name.trim() || !form.calories_per_100g}
          className="flex-1"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {isSaving ? 'Saving...' : submitLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface RecalculatePromptProps {
  count: number
  onChoice: (strategy: 'keep_weight' | 'keep_calories' | 'leave') => void
}

function RecalculatePrompt({ count, onChoice }: RecalculatePromptProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-3">
      <p className="text-sm font-medium">
        {count} past {count === 1 ? 'entry' : 'entries'} used this food. How should they be updated?
      </p>
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={() => onChoice('keep_weight')}>
          Keep weight — recalculate calories
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChoice('keep_calories')}>
          Keep calories — adjust weight
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChoice('leave')} className="text-muted-foreground">
          Leave past entries unchanged
        </Button>
      </div>
    </div>
  )
}

interface FoodLibraryProps {
  foods: CustomFood[]
}

export function FoodLibrary({ foods: initialFoods }: FoodLibraryProps) {
  const router = useRouter()
  const [foods, setFoods] = useState<CustomFood[]>(initialFoods)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FoodFormData>(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<FoodFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recalculate, setRecalculate] = useState<{ food_id: string; count: number } | null>(null)

  async function handleAdd() {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(addForm)),
      })
      const json = await res.json() as { data?: CustomFood; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to add'); return }
      setFoods((prev) => [...prev, json.data!].sort((a, b) => a.name.localeCompare(b.name)))
      setAddForm(EMPTY_FORM)
      setShowAddForm(false)
      router.refresh()
    } catch {
      setError('Failed to add. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEditSave(id: string) {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/foods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formToPayload(editForm) }),
      })
      const json = await res.json() as { data?: CustomFood; affected_count?: number; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      setFoods((prev) => prev.map((f) => f.id === id ? json.data! : f).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingId(null)
      if ((json.affected_count ?? 0) > 0) {
        setRecalculate({ food_id: id, count: json.affected_count! })
      }
      router.refresh()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRecalculate(strategy: 'keep_weight' | 'keep_calories' | 'leave') {
    if (!recalculate) return
    setRecalculate(null)
    if (strategy === 'leave') return
    try {
      await fetch('/api/foods/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_id: recalculate.food_id, strategy }),
      })
      router.refresh()
    } catch {
      // non-fatal: past entries stay unchanged
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/foods?id=${id}`, { method: 'DELETE' })
      setFoods((prev) => prev.filter((f) => f.id !== id))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {foods.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <UtensilsCrossed className="h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No custom foods yet</p>
          <p className="text-xs text-muted-foreground/60">
            Save foods with their nutritional values so you can quickly reuse them when logging meals.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {foods.map((food) => (
          <li key={food.id} className="rounded-xl border px-4 py-3 space-y-3">
            {editingId === food.id ? (
              <FoodForm
                form={editForm}
                onChange={setEditForm}
                onSubmit={() => handleEditSave(food.id)}
                onCancel={() => { setEditingId(null); setError(null) }}
                isSaving={isSaving}
                error={error}
                submitLabel="Save"
              />
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.calories_per_100g} kcal
                    {food.protein_per_100g !== null && ` · ${food.protein_per_100g}g protein`}
                    {food.fat_per_100g !== null && ` · ${food.fat_per_100g}g fat`}
                    {food.carbs_per_100g !== null && ` · ${food.carbs_per_100g}g carbs`}
                    {' '}per 100g
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingId(food.id); setEditForm(foodToForm(food)); setError(null) }}
                    aria-label="Edit food"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(food.id)}
                    disabled={deletingId === food.id}
                    aria-label="Delete food"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {recalculate && (
        <RecalculatePrompt count={recalculate.count} onChoice={handleRecalculate} />
      )}

      {showAddForm ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-3">New food</p>
          <FoodForm
            form={addForm}
            onChange={setAddForm}
            onSubmit={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); setError(null) }}
            isSaving={isSaving}
            error={error}
            submitLabel="Add food"
          />
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowAddForm(true); setError(null) }}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add food
        </Button>
      )}

      {!showAddForm && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
