import type { Metadata } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import { ViewTransitions } from 'next-view-transitions'
import { QueryProvider } from '@/providers/QueryProvider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Probicket — IPL Player Guessing Game',
  description: "Probicket: GDG hackathon AI-powered IPL player guessing game. Think of any IPL cricketer and I'll figure out who it is.",
}

// Runs before paint to apply saved theme without flash
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light') document.documentElement.classList.add('light');
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
        <head>
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body>
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ViewTransitions>
  )
}
