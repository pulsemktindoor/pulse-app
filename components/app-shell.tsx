'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
