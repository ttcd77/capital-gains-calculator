import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import LiquidGlassFilters from '@/components/LiquidGlassFilters'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UK Capital Gains Tax Calculator',
  description:
    'Calculate UK capital gains tax on share disposals using HMRC share matching rules: Same Day, 30-Day Bed & Breakfast, and Section 104 Pooling.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <LiquidGlassFilters />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
