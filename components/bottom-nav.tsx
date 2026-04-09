'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/relatorios/gerar', label: 'Gerar', icon: Sparkles },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-zinc-900 border-t border-zinc-800 pb-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || (item.href !== '/relatorios' && pathname.startsWith(item.href + '/'))
          || (item.href === '/relatorios' && pathname === '/relatorios')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
              active ? 'text-purple-400' : 'text-zinc-500'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'text-purple-400')} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
