'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, Sparkles, CalendarDays, Handshake, Tv, FileText, LogOut, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/relatorios/gerar', label: 'Gerar Relatório', icon: Sparkles },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/locais', label: 'Locais', icon: MapPin },
  { href: '/parceiros', label: 'Parceiros', icon: Handshake },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/tv-corporativa', label: 'TV Corporativa', icon: Tv },
  { href: '/contratos', label: 'Contratos', icon: FileText },
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
    <aside className="hidden md:flex w-60 min-h-screen flex-col border-r border-white/[0.07] bg-black/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pulse-logo.png" alt="Pulse" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Pulse</p>
            <p className="text-zinc-500 text-xs mt-0.5">Marketing Indoor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/relatorios' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.12)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-blue-400' : '')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 text-xs transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
        <p className="text-zinc-600 text-xs">© 2025 Pulse</p>
      </div>
    </aside>
  )
}
