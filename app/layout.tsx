import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter, Newsreader } from "next/font/google"
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

export const metadata: Metadata = {
  title: "Holdco Terminal",
  description: "Bloomberg-style operating picture for a holding company: books, cash, audience, people, and the corporate record.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${inter.variable} ${newsreader.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT }} />
        <TooltipProvider>
          <Shell>{children}</Shell>
        </TooltipProvider>
      </body>
    </html>
  )
}
