import type { Metadata } from "next"
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Inter, Newsreader, Patrick_Hand, Silkscreen } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Shell } from "@/components/shell/shell"
import { STYLE_BOOT } from "@/lib/style"
import "./globals.css"

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
})

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
})

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
})

const patrick = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick",
})

export const metadata: Metadata = {
  title: "Holdco Terminal",
  description: "Bloomberg-style operating picture for a holding company: books, cash, audience, people, and the corporate record.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${inter.variable} ${newsreader.variable} ${silkscreen.variable} ${barlow.variable} ${patrick.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT }} />
        <TooltipProvider>
          <Shell>{children}</Shell>
        </TooltipProvider>
      </body>
    </html>
  )
}
