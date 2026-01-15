import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Companion AI - Empathetic Healthcare Support',
  description: 'A companion that listens and responds with empathy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

