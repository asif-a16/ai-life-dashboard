'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, CheckSquare, Calendar, History, Utensils, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Log', icon: ClipboardList },
  { href: '/history', label: 'History', icon: History },
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/foods', label: 'Foods', icon: Utensils },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r bg-sidebar transition-[width] duration-200 ease-in-out shrink-0',
        isCollapsed ? 'w-14' : 'w-52'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b h-14">
        {!isCollapsed && (
          <span className="font-semibold text-sm tracking-tight truncate text-sidebar-foreground">
            AI Life Dashboard
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground ml-auto"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
