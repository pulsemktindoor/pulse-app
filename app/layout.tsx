import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pulse Marketing Indoor',
  description: 'Gestão de clientes e contratos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-zinc-50`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
