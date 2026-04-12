'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogOut } from 'lucide-react'

interface TopNavProps {
  title: string
}

export function TopNav({ title }: TopNavProps) {
  const router = useRouter()

  useEffect(() => {
    document.documentElement.setAttribute('data-topnav-hydrated', 'true')
    return () => {
      document.documentElement.removeAttribute('data-topnav-hydrated')
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await fetch('/api/auth/signout', { method: 'POST' })
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md shadow-card z-10 sticky top-0">
      <h1 className="font-semibold text-base tracking-tight">{title}</h1>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          data-testid="topnav-signout"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
