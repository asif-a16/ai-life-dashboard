-- Recipes: named collections of ingredients with a total yield weight

CREATE TABLE public.recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  total_weight_g  numeric(8,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON public.recipes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- Recipe ingredients: each row is one food or one sub-recipe at a given weight

CREATE TABLE public.recipe_ingredients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id      uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id        uuid REFERENCES public.custom_foods(id) ON DELETE RESTRICT,
  sub_recipe_id  uuid REFERENCES public.recipes(id) ON DELETE RESTRICT,
  weight_g       numeric(8,2) NOT NULL,
  CONSTRAINT exactly_one_source CHECK (
    (food_id IS NOT NULL AND sub_recipe_id IS NULL) OR
    (food_id IS NULL AND sub_recipe_id IS NOT NULL)
  )
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own" ON public.recipe_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
CREATE POLICY "insert_own" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
CREATE POLICY "update_own" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
CREATE POLICY "delete_own" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
);
