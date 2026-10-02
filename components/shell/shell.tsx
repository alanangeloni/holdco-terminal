"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NAV, navActive } from "@/lib/nav"
import { deriveAlerts } from "@/lib/alerts"
import { compact, compactMoney, monthLabel, todayISO } from "@/lib/format"
import { usePortfolio } from "@/lib/store"
import { pastDueTotal, snapshotFor } from "@/lib/view"

function RailLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const alerts = usePortfolio((state) => deriveAlerts(state, todayISO()).length)
  return (
    <nav className="flex flex-col gap-3 px-2 py-3">
      {NAV.map((group) => (
        <div key={group.group}>
          <div className="px-2 pb-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{group.group}</div>
          {group.items.map((item) => {
            const on = navActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-2 py-1 text-xs ${on ? "bg-amber/15 text-amber" : "text-foreground/80 hover:bg-white/5"}`}
              >
                <span className="w-8 font-mono text-[10px] text-amber">{item.code}</span>
                <span>{item.label}</span>
                {item.code === "ALR" && alerts > 0 ? (
                  <span className="ml-auto font-mono text-[10px] text-down">{alerts}</span>
                ) : null}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    (notify) => usePortfolio.persist.onFinishHydration(() => notify()),
    () => usePortfolio.persist.hasHydrated(),
    () => false,
  )
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [clock, setClock] = useState("")
  const router = useRouter()
  const book = usePortfolio()
  const reset = usePortfolio((state) => state.reset)
  const setAsOf = usePortfolio((state) => state.setAsOf)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour12: false }))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const periods = useMemo(
    () => [...new Set(book.statements.map((statement) => statement.period))].sort().reverse(),
    [book.statements],
  )
  const snap = useMemo(() => snapshotFor(book, book.companies, "full"), [book])
  const alerts = useMemo(() => deriveAlerts(book, todayISO()), [book])
  const currency = book.holdcos[0]?.currency ?? "USD"
  const tape = [
    `REV ${compactMoney(snap.revenue, currency)}`,
    `NI ${compactMoney(snap.netIncome, currency)}`,
    `COSTS ${compactMoney(snap.totalCosts, currency)}`,
    `CASH ${compactMoney(snap.cash, currency)}`,
    `SESS ${compact(snap.sessions)}`,
    `HC ${snap.headcount}`,
    `AR DUE ${compactMoney(pastDueTotal(book), currency)}`,
    `ALERTS ${alerts.length}`,
  ]

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-background font-mono text-xs tracking-[0.2em] text-amber">
        HOLDCO TERMINAL · LOADING BOOK
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="no-print flex items-center gap-2 border-b border-border bg-card px-2 py-1.5">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Open navigation">
          <Menu />
        </Button>
        <div className="min-w-0">
          <div className="font-mono text-[11px] tracking-[0.18em] text-amber">HOLDCO TERMINAL</div>
          <div className="truncate text-[10px] text-muted-foreground">{book.holdcos[0]?.legalName ?? "Portfolio"}</div>
        </div>
        <div className="ml-2 hidden min-w-0 flex-1 overflow-hidden md:block">
          <div className="tape-track font-mono text-[11px] text-steel">
            {[...tape, ...tape].map((item, index) => (
              <span key={`${item}-${index}`} className="px-4">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">AS OF</span>
          <Select value={book.asOf} onValueChange={setAsOf}>
            <SelectTrigger size="sm" className="font-mono" aria-label="As-of month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(periods.length ? periods : [book.asOf]).map((period) => (
                <SelectItem key={period} value={period}>
                  {monthLabel(period)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setPalette(true)}>
            <Search />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <span className="hidden font-mono text-[11px] text-amber md:inline">{clock}</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="no-print hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-[#0c0f13] lg:block">
          <RailLinks />
        </aside>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <footer className="no-print flex items-center justify-between gap-3 border-t border-border px-3 py-1 text-[10px] text-muted-foreground">
        <button type="button" className="truncate text-left hover:text-foreground" onClick={() => setActivityOpen(true)}>
          {book.activity[0]?.message ?? "No activity yet."}
        </button>
        <button
          type="button"
          className="shrink-0 font-mono tracking-wider uppercase hover:text-amber"
          onClick={() => {
            if (window.confirm("Reset the book to the seeded September close? Local edits will be replaced.")) reset()
          }}
        >
          Reset book
        </button>
      </footer>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-64 bg-[#0c0f13] p-0">
          <SheetHeader className="border-b border-border px-3 py-3">
            <SheetTitle className="font-mono text-xs tracking-[0.16em] text-amber">HOLDCO TERMINAL</SheetTitle>
          </SheetHeader>
          <RailLinks onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-mono text-xs tracking-[0.16em] text-amber">ACTIVITY</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-6">
            {book.activity.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : null}
            {book.activity.map((event) => (
              <div key={event.id} className="border-b border-border py-2">
                <div className="font-mono text-[10px] text-muted-foreground">{event.at.replace("T", " ").slice(0, 19)}</div>
                <div className="text-sm">{event.message}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <CommandDialog open={palette} onOpenChange={setPalette} title="Jump" description="Search the portfolio">
        <CommandInput placeholder="Company, person, customer, invoice, page…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Desks">
            {NAV.flatMap((group) => group.items).map((item) => (
              <CommandItem key={item.href} onSelect={() => { setPalette(false); router.push(item.href) }}>
                <span className="font-mono text-[10px] text-amber">{item.code}</span>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Companies">
            {book.companies.map((company) => (
              <CommandItem key={company.id} onSelect={() => { setPalette(false); router.push(`/companies/${company.id}`) }}>
                {company.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="People and agents">
            {book.people.map((person) => (
              <CommandItem key={person.id} onSelect={() => { setPalette(false); router.push(`/people`) }}>
                {person.name}
                <span className="text-muted-foreground">{person.kind}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Customers">
            {book.customers.map((customer) => (
              <CommandItem key={customer.id} onSelect={() => { setPalette(false); router.push(`/companies/${customer.companyId}?tab=receivables`) }}>
                {customer.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Invoices">
            {book.invoices.map((invoice) => (
              <CommandItem key={invoice.id} onSelect={() => { setPalette(false); router.push(`/companies/${invoice.companyId}?tab=receivables`) }}>
                {invoice.number}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Vendors">
            {book.vendors.map((vendor) => (
              <CommandItem key={vendor.id} onSelect={() => { setPalette(false); router.push(`/companies/${vendor.companyId}?tab=payables`) }}>
                {vendor.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Wiki">
            {book.pages.map((page) => (
              <CommandItem key={page.id} onSelect={() => { setPalette(false); router.push(`/companies/${page.companyId}?tab=wiki`) }}>
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
