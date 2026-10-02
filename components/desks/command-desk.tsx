"use client"

import Link from "next/link"
import { useState } from "react"
import { PALETTE, Spark, TermArea, TermBars, TermHBar, TermLine, TermStacked } from "@/components/charts/charts"
import { Empty, PageHead, Panel } from "@/components/terminal/kit"
import { Lattice } from "@/components/desks/shared"
import { deriveAlerts } from "@/lib/alerts"
import { derivePnl, statementAt } from "@/lib/metrics"
import { monthLabel, pct, todayISO } from "@/lib/format"
import { usePortfolio } from "@/lib/store"
import type { Span } from "@/lib/types"
import { seriesFor, snapshotFor, sparkline } from "@/lib/view"
import { HoldingsTree } from "@/components/desks/holdings-desk"
import { SpanToggle } from "@/components/terminal/kit"

export function CommandDesk() {
  const book = usePortfolio()
  const [span, setSpan] = useState<Span>("12M")
  const companies = book.companies
  const snap = snapshotFor(book, companies, "full")
  const series = seriesFor(book, companies, span, "full")
  const alerts = deriveAlerts(book, todayISO())
  const doing = book.work.filter((item) => item.status === "doing")
  const contribution = companies
    .map((company) => ({
      name: company.name,
      value: statementAt(book.statements, company.id, book.asOf)?.revenue ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
  const line = series.map((point) => ({ period: point.period, Revenue: point.revenue, "Net income": point.netIncome }))
  const budget = series.map((point) => ({ period: point.period, Actual: point.revenue, Budget: point.budgetRevenue }))
  const costs = series.map((point) => ({
    period: point.period,
    COGS: point.cogs,
    Payroll: point.payroll,
    Marketing: point.marketing,
    "G&A": point.ga,
    Other: point.otherOpex,
  }))

  return (
    <div>
      <PageHead
        kicker={`Close ${monthLabel(book.asOf)} · uneliminated`}
        title="Command"
        lede="Consolidated picture across every company in the book. Subsidiary math rolls up at 100%."
        actions={<SpanToggle value={span} onChange={setSpan} />}
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <Lattice snap={snap} />
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Revenue and net income">
            <TermLine
              data={line}
              series={[
                { key: "Revenue", name: "Revenue", color: PALETTE[0] },
                { key: "Net income", name: "Net income", color: PALETTE[1] },
              ]}
            />
          </Panel>
          <Panel title="Cash">
            <TermArea data={series.map((point) => ({ period: point.period, cash: point.cash }))} dataKey="cash" name="Cash" color="#6ea8fe" />
          </Panel>
          <Panel title="Revenue versus budget">
            <TermBars
              data={budget}
              series={[
                { key: "Actual", name: "Actual", color: PALETTE[0] },
                { key: "Budget", name: "Budget", color: PALETTE[2] },
              ]}
            />
          </Panel>
          <Panel title="Cost mix">
            <TermStacked
              data={costs}
              series={[
                { key: "COGS", name: "COGS", color: "#8aa0b4" },
                { key: "Payroll", name: "Payroll", color: "#f5a524" },
                { key: "Marketing", name: "Marketing", color: "#6ea8fe" },
                { key: "G&A", name: "G&A", color: "#d6d3d1" },
                { key: "Other", name: "Other", color: "#5c6b7a" },
              ]}
            />
          </Panel>
          <Panel title="Revenue by company">
            <TermHBar data={contribution} />
          </Panel>
          <Panel title={`Alerts · ${alerts.length}`}>
            {alerts.length === 0 ? <Empty>No alerts on this close.</Empty> : null}
            <div className="flex flex-col">
              {alerts.slice(0, 6).map((alert) => (
                <Link key={alert.id} href={alert.href} className="flex items-start justify-between gap-3 border-b border-border/70 py-1.5 text-xs hover:bg-white/3">
                  <span>
                    <span className={alert.severity === "high" ? "text-down" : "text-amber"}>{alert.severity === "high" ? "HIGH" : "WATCH"}</span>
                    <span className="mx-2 text-muted-foreground">{alert.companyName}</span>
                    {alert.title}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
        <div className="grid gap-2 lg:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Holdings" bodyClassName="p-0">
            <HoldingsTree compact />
          </Panel>
          <Panel title="Who is on what">
            {doing.length === 0 ? <Empty>Nothing is in progress.</Empty> : null}
            {doing.slice(0, 8).map((item) => {
              const person = book.people.find((worker) => worker.id === item.assigneeId)
              const company = book.companies.find((row) => row.id === item.companyId)
              return (
                <div key={item.id} className="border-b border-border/70 py-1.5 text-xs">
                  <div>{item.title}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {person?.name ?? "Unassigned"} · {person?.kind ?? "—"} · {company?.name}
                  </div>
                </div>
              )
            })}
          </Panel>
        </div>
        <Panel title="Latest month, by company" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] tracking-wider text-amber uppercase">
                  {["Company", "Revenue", "Margin", "Net", "12M"].map((header) => (
                    <th key={header} className="border-b border-border px-2 py-1.5 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const statement = statementAt(book.statements, company.id, book.asOf)
                  const pnl = statement ? derivePnl(statement) : null
                  return (
                    <tr key={company.id} className="border-b border-border/70">
                      <td className="px-2 py-1.5"><Link className="hover:text-amber" href={`/companies/${company.id}`}>{company.name}</Link></td>
                      <td className="px-2 py-1.5 font-mono">{pnl ? pnl.revenue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—"}</td>
                      <td className="px-2 py-1.5 font-mono">{pnl ? pct(pnl.grossMargin) : "—"}</td>
                      <td className={`px-2 py-1.5 font-mono ${pnl && pnl.netIncome < 0 ? "text-down" : "text-up"}`}>{pnl ? pnl.netIncome.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—"}</td>
                      <td className="px-2 py-1.5"><Spark data={sparkline(book, company.id)} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
