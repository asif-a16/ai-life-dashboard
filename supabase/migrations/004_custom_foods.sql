-- CUSTOM FOODS
CREATE TABLE public.custom_foods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  calories_per_100g   numeric(8,2) NOT NULL,
  protein_per_100g    numeric(8,2),
  fat_per_100g        numeric(8,2),
  carbs_per_100g      numeric(8,2),
  salt_per_100g       numeric(8,2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_foods_select_own" ON public.custom_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "custom_foods_insert_own" ON public.custom_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "custom_foods_update_own" ON public.custom_foods FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "custom_foods_delete_own" ON public.custom_foods FOR DELETE USING (auth.uid() = user_id);
