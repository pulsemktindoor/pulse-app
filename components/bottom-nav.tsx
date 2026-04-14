'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, Sparkles, Handshake, CalendarDays, Tv, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/contratos', label: 'Contratos', icon: FileText },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/relatorios/gerar', label: 'Gerar', icon: Sparkles },
  { href: '/parceiros', label: 'Parceiros', icon: Handshake },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/tv-corporativa', label: 'TV Corp.', icon: Tv },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-zinc-900 border-t border-zinc-800 pb-2 overflow-x-auto scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || (item.href !== '/relatorios' && pathname.startsWith(item.href + '/'))
          || (item.href === '/relatorios' && pathname === '/relatorios')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[72px] text-xs font-medium transition-colors',
              active ? 'text-blue-400' : 'text-zinc-500'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'text-blue-400')} />
            <span className="whitespace-nowrap text-center">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
