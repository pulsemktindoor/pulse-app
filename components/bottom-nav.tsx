'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, Sparkles, Handshake, CalendarDays, Tv, FileText, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/relatorios/gerar', label: 'Gerar', icon: Sparkles },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/locais', label: 'Locais', icon: MapPin },
  { href: '/parceiros', label: 'Parceiros', icon: Handshake },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/tv-corporativa', label: 'TV Corp.', icon: Tv },
  { href: '/contratos', label: 'Contratos', icon: FileText },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-blue-100 dark:border-white/[0.08] bg-white/85 dark:bg-black/70 backdrop-blur-xl shadow-[0_-1px_3px_rgba(0,0,80,0.06)] dark:shadow-none pb-2 overflow-x-auto scrollbar-none">
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
              active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-400'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'text-blue-600 dark:text-blue-400')} />
            <span className="whitespace-nowrap text-center">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
