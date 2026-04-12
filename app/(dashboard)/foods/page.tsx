import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/layout/TopNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FoodLibrary } from '@/components/foods/FoodLibrary'
import type { CustomFood } from '@/lib/types'

export default async function FoodsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: foods } = await supabase
    .from('custom_foods')
    .select('*')
    .eq('user_id', user!.id)
    .order('name', { ascending: true })

  return (
    <>
      <TopNav title="Food Library" />
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Custom Foods</CardTitle>
          </CardHeader>
          <CardContent>
            <FoodLibrary foods={(foods ?? []) as CustomFood[]} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
