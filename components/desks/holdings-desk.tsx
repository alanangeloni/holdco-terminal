"use client"

import Link from "next/link"
import { useState } from "react"
import { Spark, usePalette } from "@/components/charts/charts"
import { CompanyDialog, ConfirmDialog, HoldcoDialog } from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { Empty, PageHead } from "@/components/terminal/kit"
import { deriveAlerts } from "@/lib/alerts"
import { HEALTH_LABEL, HEALTH_ORDER, compareHealth } from "@/lib/capital"
import { pct, todayISO } from "@/lib/format"
import { derivePnl, runway, statementAt } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"
import type { Company, HealthTier, HoldingCompany } from "@/lib/types"
import { sparkline } from "@/lib/view"

function CompanyRow({ company, depth, compact }: { company: Company; depth: number; compact?: boolean }) {
  const book = usePortfolio()
  const statement = statementAt(book.statements, company.id, book.asOf)
  const pnl = statement ? derivePnl(statement) : null
  const months = runway(book.statements, company.id, book.asOf)
  const palette = usePalette()
  const alert = deriveAlerts(book, todayISO()).some((item) => item.companyId === company.id)
  const children = book.companies.filter((item) => item.parentCompanyId === company.id)
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/70 px-2 py-1.5 text-xs" style={{ paddingLeft: 8 + depth * 16 }}>
        {alert ? <span className="size-1.5 shrink-0 rounded-full bg-down" /> : <span className="size-1.5 shrink-0" />}
        <Link href={`/companies/${company.id}`} className="min-w-0 flex-1 truncate hover:text-amber">
          {company.name}
        </Link>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{company.ownershipPct}%</span>
        <span className="hidden font-mono text-[10px] text-muted-foreground md:inline">{HEALTH_LABEL[company.health]}</span>
        {company.marketplace ? (
          <span className="hidden font-mono text-[10px] text-steel lg:inline">{company.marketplace.liveListings}/{company.marketplace.listingGoal} lst</span>
        ) : null}
        {!compact ? <span className="hidden font-mono text-[10px] text-steel xl:inline">{pnl ? pct(pnl.netMargin) : "—"}</span> : null}
        <span className="hidden font-mono text-[10px] text-muted-foreground lg:inline">{months === null ? "n/m" : `${months.toFixed(1)} mo`}</span>
        <Spark data={sparkline(book, company.id)} color={pnl && pnl.netIncome < 0 ? palette[4] : palette[1]} />
      </div>
      {children.map((child) => (
        <CompanyRow key={child.id} company={child} depth={depth + 1} compact={compact} />
      ))}
    </>
  )
}

export function HoldingsTree({ compact = false }: { compact?: boolean }) {
  const book = usePortfolio()
  if (!book.holdcos.length && !book.companies.length) {
    return <Empty>No holdings yet. Open a holding company or add a standalone.</Empty>
  }
  return (
    <div>
      {book.holdcos.map((holdco) => {
        const roots = book.companies.filter((company) => company.holdcoId === holdco.id && !company.parentCompanyId)
        return (
          <div key={holdco.id}>
            <Link href={`/holdings/${holdco.id}`} className="flex items-center justify-between border-b border-border bg-muted px-2 py-1.5 text-xs hover:text-amber">
              <span className="font-medium tracking-wide uppercase">{holdco.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{roots.length} companies</span>
            </Link>
            {roots.length === 0 ? <Empty>No subsidiaries under {holdco.name}.</Empty> : null}
            {roots.map((company) => (
              <CompanyRow key={company.id} company={company} depth={0} compact={compact} />
            ))}
          </div>
        )
      })}
      <div className="border-b border-border bg-muted px-2 py-1.5 text-xs tracking-wide uppercase">Standalone</div>
      {book.companies.filter((company) => !company.holdcoId).length === 0 ? <Empty>No standalone companies.</Empty> : null}
      {book.companies
        .filter((company) => !company.holdcoId && !company.parentCompanyId)
        .map((company) => (
          <CompanyRow key={company.id} company={company} depth={0} compact={compact} />
        ))}
    </div>
  )
}

export function HoldingsDesk() {
  const book = usePortfolio()
  const removeHoldco = usePortfolio((state) => state.deleteHoldco)
  const removeCompany = usePortfolio((state) => state.deleteCompany)
  const [holdcoOpen, setHoldcoOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [preset, setPreset] = useState<Partial<Company> | null>(null)
  const [editHoldco, setEditHoldco] = useState<HoldingCompany | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null)
  const [health, setHealth] = useState<HealthTier | "all">("all")
  const matches = (company: Company) => health === "all" || company.health === health
  const listed = book.companies.filter(matches).sort((a, b) => compareHealth(a.health, b.health) || a.name.localeCompare(b.name))

  return (
    <div>
      <PageHead
        kicker="Structure"
        title="Holdings"
        lede="Holding companies, the subsidiaries under them, and companies that stand alone."
        actions={
          <>
            <Button size="sm" onClick={() => { setEditHoldco(null); setHoldcoOpen(true) }}>New holding company</Button>
            <Button size="sm" variant="outline" onClick={() => { setPreset({ holdcoId: null, ownershipPct: 100 }); setCompanyOpen(true) }}>
              New standalone
            </Button>
          </>
        }
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <div className="flex flex-wrap gap-1">
          <FilterChip on={health === "all"} onClick={() => setHealth("all")} label="All" />
          {HEALTH_ORDER.map((tier) => (
            <FilterChip key={tier} on={health === tier} onClick={() => setHealth(tier)} label={HEALTH_LABEL[tier]} />
          ))}
        </div>
        {book.holdcos.map((holdco) => (
          <section key={holdco.id} className="border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
              <div>
                <Link href={`/holdings/${holdco.id}`} className="text-sm hover:text-amber">{holdco.name}</Link>
                <div className="text-[10px] text-muted-foreground">{holdco.legalName} · {holdco.jurisdiction} · FYE {holdco.fiscalYearEnd}</div>
              </div>
              <div className="flex gap-1">
                <Button size="xs" variant="outline" onClick={() => { setPreset({ holdcoId: holdco.id, ownershipPct: 100, status: "operating" }); setCompanyOpen(true) }}>
                  Add subsidiary
                </Button>
                <Button size="xs" variant="ghost" onClick={() => { setEditHoldco(holdco); setHoldcoOpen(true) }}>Edit</Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-down"
                  onClick={() => setConfirm({
                    title: `Remove ${holdco.name}?`,
                    body: "Subsidiaries stay in the book as standalone companies.",
                    run: () => removeHoldco(holdco.id),
                  })}
                >
                  Del
                </Button>
              </div>
            </header>
            {book.companies.filter((company) => company.holdcoId === holdco.id && !company.parentCompanyId && matches(company)).length === 0 ? (
              <Empty>{health === "all" ? "No subsidiaries yet." : "No companies in this tier."}</Empty>
            ) : null}
            {book.companies
              .filter((company) => company.holdcoId === holdco.id && !company.parentCompanyId && matches(company))
              .map((company) => (
                <CompanyRow key={company.id} company={company} depth={0} />
              ))}
          </section>
        ))}
        {book.holdcos.length === 0 ? (
          <section className="border border-border bg-card p-4 text-sm text-muted-foreground">
            No holding company yet. Open one, then add the companies it owns.
          </section>
        ) : null}
        <section className="border border-border bg-card">
          <header className="border-b border-border px-2.5 py-1.5 text-[11px] tracking-[0.16em] text-amber uppercase">Standalone</header>
          {book.companies.filter((company) => !company.holdcoId && !company.parentCompanyId && matches(company)).length === 0 ? <Empty>{health === "all" ? "No standalone companies." : "No companies in this tier."}</Empty> : null}
          {book.companies
            .filter((company) => !company.holdcoId && !company.parentCompanyId && matches(company))
            .map((company) => (
              <CompanyRow key={company.id} company={company} depth={0} />
            ))}
        </section>
        <section className="border border-border">
          <header className="flex items-center justify-between border-b border-border px-2.5 py-1.5 text-[11px] tracking-[0.16em] text-amber uppercase">
            All companies
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] tracking-wider text-amber uppercase">
                  {["Company", "Health", "Holdco", "Model", "Own", ""].map((header) => (
                    <th key={header || "act"} className="border-b border-border px-2 py-1.5 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listed.map((company) => (
                  <tr key={company.id} className="border-b border-border/70">
                    <td className="px-2 py-1.5"><Link className="hover:text-amber" href={`/companies/${company.id}`}>{company.name}</Link></td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{HEALTH_LABEL[company.health]}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{book.holdcos.find((holdco) => holdco.id === company.holdcoId)?.name ?? "Standalone"}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{company.businessModel}</td>
                    <td className="px-2 py-1.5 font-mono">{company.ownershipPct}%</td>
                    <td className="px-2 py-1.5 text-right">
                      <Button size="xs" variant="ghost" onClick={() => { setPreset(company); setCompanyOpen(true) }}>Edit</Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-down"
                        onClick={() => setConfirm({
                          title: `Remove ${company.name}?`,
                          body: "Statements, invoices, people homed here, and the rest of its records go with it.",
                          run: () => removeCompany(company.id),
                        })}
                      >
                        Del
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <HoldcoDialog open={holdcoOpen} onOpenChange={setHoldcoOpen} initial={editHoldco} />
      {companyOpen ? <CompanyDialog open onOpenChange={setCompanyOpen} initial={preset} /> : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        onOpenChange={(open) => { if (!open) setConfirm(null) }}
        onConfirm={() => confirm?.run()}
      />
    </div>
  )
}

function FilterChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`border border-border px-2 py-1 font-mono text-[10px] tracking-wider uppercase ${on ? "bg-amber text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
}
