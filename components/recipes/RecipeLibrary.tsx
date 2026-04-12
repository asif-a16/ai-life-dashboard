'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronRight, Pencil, Trash2, Check, Plus,
  X, ChefHat, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { NutritionPer100g } from '@/lib/nutrition/recipeCalc'
import type { CustomFood } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientDetail {
  id: string
  weight_g: number
  food_id: string | null
  sub_recipe_id: string | null
  food: { id: string; name: string; calories_per_100g: number } | null
  sub_recipe: { id: string; name: string } | null
}

interface RecipeDetail {
  id: string
  name: string
  total_weight_g: number
  nutrition_per_100g: NutritionPer100g | null
  ingredients: IngredientDetail[]
}

interface RecipeFormData {
  name: string
  total_weight_g: string
}

const EMPTY_RECIPE_FORM: RecipeFormData = { name: '', total_weight_g: '' }

// ─── Nutrition summary row ────────────────────────────────────────────────────

function NutritionRow({ nutrition, totalWeight }: { nutrition: NutritionPer100g; totalWeight: number }) {
  const scale = totalWeight / 100
  const cal = Math.round(nutrition.calories_per_100g * scale)
  const pro = nutrition.protein_per_100g !== null ? Math.round(nutrition.protein_per_100g * scale * 10) / 10 : null
  const fat = nutrition.fat_per_100g !== null ? Math.round(nutrition.fat_per_100g * scale * 10) / 10 : null
  const carb = nutrition.carbs_per_100g !== null ? Math.round(nutrition.carbs_per_100g * scale * 10) / 10 : null

  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      <p>
        <span className="font-medium text-foreground">{cal} kcal</span> total
        {' · '}{nutrition.calories_per_100g} kcal/100g
      </p>
      {(pro !== null || fat !== null || carb !== null) && (
        <p>
          {pro !== null && `${pro}g protein`}
          {fat !== null && `${pro !== null ? ' · ' : ''}${fat}g fat`}
          {carb !== null && `${(pro !== null || fat !== null) ? ' · ' : ''}${carb}g carbs`}
        </p>
      )}
    </div>
  )
}

// ─── RecalculatePrompt ────────────────────────────────────────────────────────

function RecalculatePrompt({
  count,
  onChoice,
}: {
  count: number
  onChoice: (strategy: 'keep_weight' | 'keep_calories' | 'leave') => void
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-3">
      <p className="text-sm font-medium">
        {count} past {count === 1 ? 'entry' : 'entries'} used this recipe. How should they be updated?
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

// ─── Ingredient search (foods + sub-recipes) ──────────────────────────────────

interface IngredientSearchProps {
  recipeId: string
  allRecipes: RecipeDetail[]
  onAdded: () => void
  onCancel: () => void
}

function IngredientForm({ recipeId, allRecipes, onAdded, onCancel }: IngredientSearchProps) {
  const [foods, setFoods] = useState<CustomFood[]>([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<
    | { kind: 'food'; id: string; name: string; kcal: number }
    | { kind: 'recipe'; id: string; name: string }
    | null
  >(null)
  const [weightStr, setWeightStr] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loaded) return
    fetch('/api/foods')
      .then((r) => r.json())
      .then((j: { data?: CustomFood[] }) => { setFoods(j.data ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [loaded])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Other recipes (exclude self)
  const otherRecipes = allRecipes.filter((r) => r.id !== recipeId)

  const foodResults = foods.filter((f) =>
    query.length === 0 ? true : f.name.toLowerCase().includes(query.toLowerCase())
  )
  const recipeResults = otherRecipes.filter((r) =>
    query.length === 0 ? true : r.name.toLowerCase().includes(query.toLowerCase())
  )

  async function handleSave() {
    if (!selected || !weightStr) return
    const weight_g = Number(weightStr)
    if (weight_g <= 0) { setError('Weight must be greater than 0'); return }

    setIsSaving(true)
    setError(null)

    try {
      const body =
        selected.kind === 'food'
          ? { recipe_id: recipeId, food_id: selected.id, weight_g }
          : { recipe_id: recipeId, sub_recipe_id: selected.id, weight_g }

      const res = await fetch('/api/recipes/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { data?: { id: string; food_id: string | null; sub_recipe_id: string | null; weight_g: number }; error?: string }

      if (!res.ok) { setError(json.error ?? 'Failed to add ingredient'); return }

      onAdded()
    } catch {
      setError('Failed to add ingredient')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3" ref={containerRef}>
      <p className="text-sm font-medium">Add ingredient</p>

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-background">
          <span className="text-sm flex-1">{selected.name}</span>
          {selected.kind === 'recipe' && <Badge variant="secondary" className="text-xs">Recipe</Badge>}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder="Search foods and recipes..."
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            autoComplete="off"
          />
          {open && loaded && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-56 overflow-y-auto">
              {foodResults.length === 0 && recipeResults.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
              ) : (
                <>
                  {foodResults.map((food) => (
                    <li key={`food-${food.id}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setSelected({ kind: 'food', id: food.id, name: food.name, kcal: food.calories_per_100g }); setOpen(false); setQuery('') }}
                      >
                        <span className="font-medium">{food.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{food.calories_per_100g} kcal/100g</span>
                      </button>
                    </li>
                  ))}
                  {recipeResults.map((recipe) => (
                    <li key={`recipe-${recipe.id}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                        onClick={() => { setSelected({ kind: 'recipe', id: recipe.id, name: recipe.name }); setOpen(false); setQuery('') }}
                      >
                        <span className="font-medium flex-1">{recipe.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">Recipe</Badge>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ing-weight">Weight (g)</Label>
        <Input
          id="ing-weight"
          type="number"
          min={1}
          placeholder="e.g. 150"
          value={weightStr}
          onChange={(e) => setWeightStr(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !selected || !weightStr}
          className="flex-1"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          Add
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RecipeLibraryProps {
  initialRecipes: RecipeDetail[]
}

export function RecipeLibrary({ initialRecipes }: RecipeLibraryProps) {
  const router = useRouter()
  const [recipes, setRecipes] = useState<RecipeDetail[]>(initialRecipes)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RecipeFormData>(EMPTY_RECIPE_FORM)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<RecipeFormData>(EMPTY_RECIPE_FORM)
  const [showAddIngredient, setShowAddIngredient] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingIngredientId, setDeletingIngredientId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recalculate, setRecalculate] = useState<{ recipe_id: string; count: number } | null>(null)

  // Re-fetch a single recipe's data (nutrition recalculates server-side)
  async function refreshRecipe(id: string) {
    const res = await fetch('/api/recipes')
    const json = await res.json() as { data?: RecipeDetail[] }
    if (json.data) {
      const updated = json.data.find((r) => r.id === id)
      if (updated) {
        setRecipes((prev) => prev.map((r) => r.id === id ? updated : r))
      }
    }
  }

  async function handleCreate() {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name.trim(), total_weight_g: Number(addForm.total_weight_g) }),
      })
      const json = await res.json() as { data?: RecipeDetail; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to create'); return }
      setRecipes((prev) => [...prev, json.data!].sort((a, b) => a.name.localeCompare(b.name)))
      setAddForm(EMPTY_RECIPE_FORM)
      setShowAddForm(false)
      router.refresh()
    } catch {
      setError('Failed to create. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEditSave(id: string) {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editForm.name.trim(), total_weight_g: Number(editForm.total_weight_g) }),
      })
      const json = await res.json() as { data?: RecipeDetail; affected_count?: number; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, name: editForm.name.trim(), total_weight_g: Number(editForm.total_weight_g) } : r).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingId(null)
      if ((json.affected_count ?? 0) > 0) {
        setRecalculate({ recipe_id: id, count: json.affected_count! })
      }
      router.refresh()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' })
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      if (expandedId === id) setExpandedId(null)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteIngredient(recipeId: string, ingredientId: string) {
    setDeletingIngredientId(ingredientId)
    try {
      await fetch(`/api/recipes/ingredients?id=${ingredientId}`, { method: 'DELETE' })
      await refreshRecipe(recipeId)
      router.refresh()
    } finally {
      setDeletingIngredientId(null)
    }
  }

  async function handleIngredientAdded(recipeId: string) {
    setShowAddIngredient(null)
    await refreshRecipe(recipeId)
    router.refresh()
  }

  async function handleRecalculate(strategy: 'keep_weight' | 'keep_calories' | 'leave') {
    if (!recalculate) return
    setRecalculate(null)
    if (strategy === 'leave') return
    try {
      await fetch('/api/recipes/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recalculate.recipe_id, strategy }),
      })
      router.refresh()
    } catch {
      // non-fatal
    }
  }

  return (
    <div className="space-y-4">
      {recipes.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <ChefHat className="h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No recipes yet</p>
          <p className="text-xs text-muted-foreground/60">
            Build recipes from your saved foods. Use them when logging meals to automatically fill in macros.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {recipes.map((recipe) => {
          const isExpanded = expandedId === recipe.id
          const isEditing = editingId === recipe.id

          return (
            <li key={recipe.id} className="rounded-xl border">
              {/* Recipe header */}
              <div className="px-4 py-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`recipe-name-${recipe.id}`}>Name</Label>
                      <Input
                        id={`recipe-name-${recipe.id}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Chicken Salad"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`recipe-weight-${recipe.id}`}>Total yield (g)</Label>
                      <Input
                        id={`recipe-weight-${recipe.id}`}
                        type="number"
                        min={1}
                        value={editForm.total_weight_g}
                        onChange={(e) => setEditForm((f) => ({ ...f, total_weight_g: e.target.value }))}
                        placeholder="e.g. 400"
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditSave(recipe.id)}
                        disabled={isSaving || !editForm.name.trim() || !editForm.total_weight_g}
                        className="flex-1"
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setError(null) }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{recipe.name}</p>
                        <p className="text-xs text-muted-foreground">{recipe.total_weight_g}g yield</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditingId(recipe.id); setEditForm({ name: recipe.name, total_weight_g: String(recipe.total_weight_g) }); setError(null) }}
                        aria-label="Edit recipe"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(recipe.id)}
                        disabled={deletingId === recipe.id}
                        aria-label="Delete recipe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded: ingredients + nutrition */}
              {isExpanded && !isEditing && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  {recipe.nutrition_per_100g && (
                    <NutritionRow nutrition={recipe.nutrition_per_100g} totalWeight={recipe.total_weight_g} />
                  )}

                  {/* Ingredient list */}
                  {recipe.ingredients.length > 0 && (
                    <ul className="space-y-1.5">
                      {recipe.ingredients.map((ing) => {
                        const label = ing.food ? ing.food.name : (ing.sub_recipe ? ing.sub_recipe.name : '—')
                        const isSubRecipe = !!ing.sub_recipe_id
                        return (
                          <li key={ing.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{label}</span>
                              {isSubRecipe && <Badge variant="secondary" className="text-xs shrink-0">Recipe</Badge>}
                            </span>
                            <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
                              <span className="text-xs">{ing.weight_g}g</span>
                              <button
                                onClick={() => handleDeleteIngredient(recipe.id, ing.id)}
                                disabled={deletingIngredientId === ing.id}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Remove ingredient"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {recipe.ingredients.length === 0 && !showAddIngredient && (
                    <p className="text-xs text-muted-foreground">No ingredients yet.</p>
                  )}

                  {showAddIngredient === recipe.id ? (
                    <IngredientForm
                      recipeId={recipe.id}
                      allRecipes={recipes}
                      onAdded={() => handleIngredientAdded(recipe.id)}
                      onCancel={() => setShowAddIngredient(null)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAddIngredient(recipe.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add ingredient
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {recalculate && (
        <RecalculatePrompt count={recalculate.count} onChoice={handleRecalculate} />
      )}

      {showAddForm ? (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">New recipe</p>
          <div className="space-y-1.5">
            <Label htmlFor="new-recipe-name">Name</Label>
            <Input
              id="new-recipe-name"
              placeholder="e.g. Chicken Salad"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-recipe-weight">Total yield (g)</Label>
            <Input
              id="new-recipe-weight"
              type="number"
              min={1}
              placeholder="e.g. 400"
              value={addForm.total_weight_g}
              onChange={(e) => setAddForm((f) => ({ ...f, total_weight_g: e.target.value }))}
            />
          </div>
          {error && !editingId && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isSaving || !addForm.name.trim() || !addForm.total_weight_g}
              className="flex-1"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Create recipe'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_RECIPE_FORM); setError(null) }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowAddForm(true); setError(null) }}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New recipe
        </Button>
      )}
    </div>
  )
}
