import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { VoiceFab } from '@/components/voice/VoiceFab'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', session.user.id)
    .single()

  if (!profile?.onboarded_at) redirect('/onboarding')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-24">
          {children}
        </main>
        <VoiceFab />
      </div>
    </div>
  )
}
