'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, CheckSquare, Calendar, History, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Log', icon: ClipboardList },
  { href: '/history', label: 'History', icon: History },
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r bg-card transition-all duration-200',
        isCollapsed ? 'w-14' : 'w-52'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b h-14">
        {!isCollapsed && (
          <span className="font-semibold text-sm truncate">AI Life Dashboard</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-accent ml-auto"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
