'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, Sparkles, CalendarDays, Handshake, Tv, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/relatorios/gerar', label: 'Gerar Relatório', icon: Sparkles },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/parceiros', label: 'Parceiros', icon: Handshake },
  { href: '/tv-corporativa', label: 'TV Corporativa', icon: Tv },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-zinc-900 flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pulse-logo.png" alt="Pulse" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Pulse</p>
            <p className="text-zinc-400 text-xs">Marketing Indoor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/relatorios' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-800 space-y-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
        <p className="text-zinc-500 text-xs">© 2025 Pulse</p>
      </div>
    </aside>
  )
}
