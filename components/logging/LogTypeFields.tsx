'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LogEntryType, CustomFood } from '@/lib/types'
import { calcFoodNutrition, calcRecipeNutrition } from '@/lib/nutrition/recipeCalc'
import type { NutritionPer100g } from '@/lib/nutrition/recipeCalc'

interface LogTypeFieldsProps {
  type: LogEntryType
  value: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

interface RecipeSearchResult {
  id: string
  name: string
  nutrition_per_100g: NutritionPer100g | null
}

function FoodSearch({ value, onChange }: { value: Record<string, unknown>; onChange: (data: Record<string, unknown>) => void }) {
  const [foods, setFoods] = useState<CustomFood[]>([])
  const [recipes, setRecipes] = useState<RecipeSearchResult[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedFoodId = value.food_id as string | null | undefined
  const selectedRecipeId = value.recipe_id as string | null | undefined

  useEffect(() => {
    if (loaded) return
    Promise.all([
      fetch('/api/foods').then((r) => r.json()).then((j: { data?: CustomFood[] }) => j.data ?? []),
      fetch('/api/recipes').then((r) => r.json()).then((j: { data?: RecipeSearchResult[] }) => j.data ?? []),
    ])
      .then(([f, r]) => { setFoods(f); setRecipes(r); setLoaded(true) })
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

  const filteredFoods = foods.filter((f) =>
    query.length === 0 ? true : f.name.toLowerCase().includes(query.toLowerCase())
  )
  const filteredRecipes = recipes.filter((r) =>
    query.length === 0 ? true : r.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectFood(food: CustomFood) {
    const weight = typeof value.weight_g === 'number' && value.weight_g > 0
      ? (value.weight_g as number)
      : 100
    const nutrition = calcFoodNutrition(food, weight)
    onChange({
      ...value,
      food_id: food.id,
      recipe_id: null,
      description: food.name,
      weight_g: weight,
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
      fat_g: nutrition.fat_g,
      carbs_g: nutrition.carbs_g,
      salt_mg: nutrition.salt_mg,
    })
    setQuery('')
    setOpen(false)
  }

  function selectRecipe(recipe: RecipeSearchResult) {
    const weight = typeof value.weight_g === 'number' && value.weight_g > 0
      ? (value.weight_g as number)
      : 100
    const nutrition = recipe.nutrition_per_100g
      ? calcRecipeNutrition(recipe.nutrition_per_100g, weight)
      : { calories: null, protein_g: null, fat_g: null, carbs_g: null, salt_mg: null }
    onChange({
      ...value,
      recipe_id: recipe.id,
      food_id: null,
      description: recipe.name,
      weight_g: weight,
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
      fat_g: nutrition.fat_g,
      carbs_g: nutrition.carbs_g,
      salt_mg: nutrition.salt_mg,
    })
    setQuery('')
    setOpen(false)
  }

  function clearSelection() {
    onChange({ ...value, food_id: null, recipe_id: null, weight_g: null })
  }

  const selectedFood = foods.find((f) => f.id === selectedFoodId)
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId)
  const selectedName = selectedFood?.name ?? selectedRecipe?.name

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>Food or recipe (optional)</Label>
      {selectedName ? (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/40">
          <span className="text-sm flex-1">{selectedName}</span>
          {selectedRecipe && <Badge variant="secondary" className="text-xs shrink-0">Recipe</Badge>}
          <button
            type="button"
            onClick={clearSelection}
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
            <ul className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
              {filteredFoods.length === 0 && filteredRecipes.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {foods.length === 0 && recipes.length === 0 ? 'No saved foods or recipes yet' : 'No matches'}
                </li>
              ) : (
                <>
                  {filteredFoods.map((food) => (
                    <li key={`food-${food.id}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => selectFood(food)}
                      >
                        <span className="font-medium">{food.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{food.calories_per_100g} kcal/100g</span>
                      </button>
                    </li>
                  ))}
                  {filteredRecipes.map((recipe) => (
                    <li key={`recipe-${recipe.id}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                        onClick={() => selectRecipe(recipe)}
                      >
                        <span className="font-medium flex-1">{recipe.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">Recipe</Badge>
                        {recipe.nutrition_per_100g && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {recipe.nutrition_per_100g.calories_per_100g} kcal/100g
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function LogTypeFields({ type, value, onChange }: LogTypeFieldsProps) {
  function update(key: string, val: unknown) {
    onChange({ ...value, [key]: val })
  }

  function updateWeight(weight_g: number | null) {
    const food_id = value.food_id as string | null | undefined
    const recipe_id = value.recipe_id as string | null | undefined

    if (weight_g === null) {
      onChange({ ...value, weight_g })
      return
    }

    if (food_id) {
      fetch('/api/foods')
        .then((r) => r.json())
        .then((j: { data?: CustomFood[] }) => {
          const food = (j.data ?? []).find((f) => f.id === food_id)
          if (!food) { onChange({ ...value, weight_g }); return }
          const nutrition = calcFoodNutrition(food, weight_g)
          onChange({ ...value, weight_g, calories: nutrition.calories, protein_g: nutrition.protein_g, fat_g: nutrition.fat_g, carbs_g: nutrition.carbs_g, salt_mg: nutrition.salt_mg })
        })
        .catch(() => onChange({ ...value, weight_g }))
    } else if (recipe_id) {
      fetch('/api/recipes')
        .then((r) => r.json())
        .then((j: { data?: RecipeSearchResult[] }) => {
          const recipe = (j.data ?? []).find((r) => r.id === recipe_id)
          if (!recipe?.nutrition_per_100g) { onChange({ ...value, weight_g }); return }
          const nutrition = calcRecipeNutrition(recipe.nutrition_per_100g, weight_g)
          onChange({ ...value, weight_g, calories: nutrition.calories, protein_g: nutrition.protein_g, fat_g: nutrition.fat_g, carbs_g: nutrition.carbs_g, salt_mg: nutrition.salt_mg })
        })
        .catch(() => onChange({ ...value, weight_g }))
    } else {
      onChange({ ...value, weight_g })
    }
  }

  if (type === 'meal') {
    const hasSelection = !!(value.food_id as string | null | undefined) || !!(value.recipe_id as string | null | undefined)

    return (
      <div className="space-y-4">
        <FoodSearch value={value} onChange={onChange} />

        {hasSelection && (
          <div className="space-y-1.5">
            <Label htmlFor="weight_g">Weight (g)</Label>
            <Input
              id="weight_g"
              type="number"
              min={1}
              placeholder="e.g. 150"
              value={(value.weight_g as number) ?? ''}
              onChange={(e) => updateWeight(e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        )}

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
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fat_g">Fat (g)</Label>
            <Input
              id="fat_g"
              type="number"
              placeholder="e.g. 15"
              value={(value.fat_g as number) ?? ''}
              onChange={(e) => update('fat_g', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="carbs_g">Carbs (g)</Label>
            <Input
              id="carbs_g"
              type="number"
              placeholder="e.g. 45"
              value={(value.carbs_g as number) ?? ''}
              onChange={(e) => update('carbs_g', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salt_mg">Salt (mg)</Label>
            <Input
              id="salt_mg"
              type="number"
              placeholder="e.g. 800"
              value={(value.salt_mg as number) ?? ''}
              onChange={(e) => update('salt_mg', e.target.value ? Number(e.target.value) : null)}
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
