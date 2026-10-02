"use client"

import Link from "next/link"
import { Fragment, useState } from "react"
import { TermHBar, TermLine, usePalette } from "@/components/charts/charts"
import { EventDialog, KpiDialog, RiskDialog } from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { Empty, Num, PageHead, Panel, SpanToggle, TermTable } from "@/components/terminal/kit"
import { Lattice } from "@/components/desks/shared"
import { deriveAlerts, kpiMiss } from "@/lib/alerts"
import { monthLabel, pct, todayISO } from "@/lib/format"
import { projectRows } from "@/lib/grain"
import { consolidatedStatement, derivePnl, runway, statementAt, windowPeriods } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"
import type { ConsolidationMode, Span } from "@/lib/types"
import { holdcoCompanies, seriesFor, snapshotFor } from "@/lib/view"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CorporateDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const [eventOpen, setEventOpen] = useState(false)
  const [riskOpen, setRiskOpen] = useState(false)
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  const ids = new Set(companies.map((company) => company.id))
  const events = book.events.filter((event) => ids.has(event.companyId)).sort((a, b) => a.due.localeCompare(b.due))
  const risks = book.risks.filter((risk) => ids.has(risk.companyId))
  const caps = book.capTable.filter((row) => ids.has(row.companyId))
  return (
    <div>
      {embedded ? null : <PageHead kicker="Record" title="Corporate" lede="Officers, cap table, filings, and the risk matrix." actions={<><Button size="sm" variant="outline" onClick={() => setEventOpen(true)}>Add date</Button><Button size="sm" onClick={() => setRiskOpen(true)}>Add risk</Button></>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEventOpen(true)}>Add date</Button><Button size="sm" onClick={() => setRiskOpen(true)}>Add risk</Button></div> : null}
        <Panel title="Officers">
          {companies.flatMap((company) => company.officers.map((officer) => ({ company, officer }))).length === 0 ? <Empty>No officers listed.</Empty> : null}
          {companies.flatMap((company) => company.officers.map((officer) => (
            <div key={`${company.id}-${officer.name}`} className="flex justify-between border-b border-border/70 py-1 text-xs">
              <span>{officer.name} · {officer.title}</span>
              <span className="text-muted-foreground">{company.name}</span>
            </div>
          )))}
        </Panel>
        <Panel title="Cap table" bodyClassName="p-0">
          <TermTable
            rows={caps}
            empty="No cap table entries."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "holder", header: "Holder", render: (row) => row.holder },
              { key: "class", header: "Class", render: (row) => row.shareClass },
              { key: "shares", header: "Shares", className: "text-right", render: (row) => row.shares.toLocaleString() },
              { key: "pct", header: "%", className: "text-right", render: (row) => `${row.percent}%` },
            ]}
          />
        </Panel>
        <Panel title="Calendar" bodyClassName="p-0">
          <TermTable
            rows={events}
            empty="No corporate dates."
            getKey={(row) => row.id}
            columns={[
              { key: "due", header: "Due", render: (row) => row.due },
              { key: "kind", header: "Kind", render: (row) => row.kind },
              { key: "title", header: "Item", render: (row) => row.title },
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "st", header: "Status", render: (row) => row.status },
            ]}
          />
        </Panel>
        <Panel title="Risk matrix · likelihood down, severity across">
          <div className="overflow-x-auto">
            <div className="grid min-w-[36rem] grid-cols-6 gap-px bg-border text-[10px]">
              <div className="bg-card p-1 text-muted-foreground"> </div>
              {[1, 2, 3, 4, 5].map((severity) => <div key={severity} className="bg-card p-1 text-center text-amber">SEV {severity}</div>)}
              {[5, 4, 3, 2, 1].map((likelihood) => (
                <Fragment key={likelihood}>
                  <div className="bg-card p-1 text-amber">L {likelihood}</div>
                  {[1, 2, 3, 4, 5].map((severity) => {
                    const cell = risks.filter((risk) => risk.likelihood === likelihood && risk.severity === severity && risk.status !== "closed")
                    return (
                      <div key={`${likelihood}-${severity}`} className="min-h-14 bg-card p-1">
                        {cell.map((risk) => <div key={risk.id} className="mb-1 text-[10px] leading-tight">{risk.title}</div>)}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      {eventOpen ? <EventDialog open companyId={companyId} onOpenChange={setEventOpen} /> : null}
      {riskOpen ? <RiskDialog open companyId={companyId} onOpenChange={setRiskOpen} /> : null}
    </div>
  )
}

export function ScorecardDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const [open, setOpen] = useState(false)
  const kpis = book.kpis.filter((kpi) => !companyId || kpi.companyId === companyId)
  const objectives = book.objectives.filter((objective) => !companyId || objective.companyId === companyId)
  return (
    <div>
      {embedded ? null : <PageHead kicker="Record" title="Scorecard" lede="Red means the KPI is off the side that matters." actions={<Button size="sm" onClick={() => setOpen(true)}>Add KPI</Button>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>Add KPI</Button></div> : null}
        <Panel title="KPIs" bodyClassName="p-0">
          <TermTable
            rows={kpis}
            empty="No KPIs yet."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "name", header: "KPI", render: (row) => row.name },
              { key: "actual", header: "Actual", render: (row) => <span className={kpiMiss(row.direction, row.actual, row.target) ? "font-mono text-down" : "font-mono text-up"}>{row.actual} {row.unit}</span> },
              { key: "target", header: "Target", render: (row) => <span className="font-mono">{row.target} {row.unit}</span> },
              { key: "dir", header: "Better", render: (row) => row.direction === "up" ? "Higher" : "Lower" },
            ]}
          />
        </Panel>
        <div className="grid gap-2 md:grid-cols-2">
          {objectives.map((objective) => (
            <Panel key={objective.id} title={`${objective.quarter} · ${book.companies.find((company) => company.id === objective.companyId)?.name ?? ""}`}>
              <div className="text-sm">{objective.title}</div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {book.people.find((person) => person.id === objective.ownerId)?.name ?? "Unassigned"} · {pct(objective.progress)}
              </div>
              <div className="mt-2 h-1.5 bg-border"><div className="h-full bg-amber" style={{ width: `${Math.min(100, objective.progress * 100)}%` }} /></div>
              <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                {objective.keyResults.map((result) => <li key={result}>{result}</li>)}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
      {open ? <KpiDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
    </div>
  )
}

export function AlertsDesk() {
  const book = usePortfolio()
  const alerts = deriveAlerts(book, todayISO())
  const groups = [...new Set(alerts.map((alert) => alert.companyId))]
  return (
    <div>
      <PageHead kicker={`As of ${monthLabel(book.asOf)}`} title="Alerts" lede="Derived from the close: runway, margin, revenue, receivables, filings, and KPIs." />
      <div className="grid gap-2 p-2 lg:p-3">
        {alerts.length === 0 ? <Panel title="Clear"><Empty>Nothing is firing on this close.</Empty></Panel> : null}
        {groups.map((companyId) => (
          <Panel key={companyId} title={book.companies.find((company) => company.id === companyId)?.name ?? "Company"}>
            {alerts.filter((alert) => alert.companyId === companyId).map((alert) => (
              <Link key={alert.id} href={alert.href} className="block border-b border-border/70 py-2 text-xs hover:bg-muted">
                <div className={alert.severity === "high" ? "text-down" : "text-amber"}>{alert.severity.toUpperCase()} · {alert.title}</div>
                <div className="text-muted-foreground">{alert.detail}</div>
              </Link>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  )
}

export function ReportsDesk() {
  const book = usePortfolio()
  const [holdcoId, setHoldcoId] = useState(book.holdcos[0]?.id ?? "")
  const [month, setMonth] = useState(book.asOf)
  const holdco = book.holdcos.find((item) => item.id === holdcoId) ?? book.holdcos[0]
  const companies = holdco ? holdcoCompanies(book, holdco.id) : []
  const view = { ...book, asOf: month }
  const snap = snapshotFor(view, companies, "full")
  const statement = consolidatedStatement(book.statements, companies, month, "full")
  const pnl = statement ? derivePnl(statement) : null
  const budget = statement ? derivePnl({
    revenue: statement.budgetRevenue,
    cogs: statement.budgetCogs,
    payroll: statement.budgetPayroll,
    marketing: statement.budgetMarketing,
    ga: statement.budgetGa,
    otherOpex: statement.budgetOtherOpex,
    interest: statement.budgetInterest,
    tax: statement.budgetTax,
  }) : null
  const alerts = deriveAlerts(view, todayISO()).filter((alert) => companies.some((company) => company.id === alert.companyId))
  const decisions = book.pages.filter((page) => page.kind === "decision" && companies.some((company) => company.id === page.companyId))
  const doing = book.work.filter((item) => item.status === "doing" && companies.some((company) => company.id === item.companyId))
  const periods = [...new Set(book.statements.map((row) => row.period))].sort().reverse()
  return (
    <div>
      <PageHead
        kicker="Record"
        title="Board pack"
        lede="One holdco, one month. Print this page for the pack."
        actions={
          <>
            <Select value={holdco?.id ?? "none"} onValueChange={setHoldcoId}>
              <SelectTrigger className="font-mono" aria-label="Holding company"><SelectValue /></SelectTrigger>
              <SelectContent>
                {book.holdcos.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="font-mono" aria-label="Pack month"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((period) => <SelectItem key={period} value={period}>{monthLabel(period)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="no-print" onClick={() => window.print()}>Print</Button>
          </>
        }
      />
      <div className="print-pack grid gap-2 p-2 lg:p-3">
        {!holdco ? <Empty>Open a holding company before building a pack.</Empty> : null}
        {holdco ? (
          <>
            <div>
              <div className="text-[10px] tracking-[0.18em] text-amber uppercase">{holdco.legalName}</div>
              <h2 className="text-xl">{monthLabel(month)} operating pack</h2>
              <p className="text-xs text-muted-foreground">Uneliminated full consolidation of {companies.length} companies. {holdco.description}</p>
            </div>
            <Lattice snap={snap} />
            <Panel title="P&L versus budget" bodyClassName="p-0">
              {pnl && budget ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] tracking-wider text-amber uppercase">
                      {["Line", "Actual", "Budget"].map((header) => <th key={header} className="border-b border-border px-2 py-1">{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["Revenue", pnl.revenue, budget.revenue],
                      ["Gross profit", pnl.grossProfit, budget.grossProfit],
                      ["Operating income", pnl.operatingIncome, budget.operatingIncome],
                      ["Net income", pnl.netIncome, budget.netIncome],
                    ] as [string, number, number][]).map(([label, actual, plan]) => (
                      <tr key={label} className="border-b border-border/70">
                        <td className="px-2 py-1">{label}</td>
                        <td className="px-2 py-1"><Num value={actual} signed /></td>
                        <td className="px-2 py-1"><Num value={plan} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty>No consolidated month for {month}.</Empty>}
            </Panel>
            <Panel title="Cash and runway" bodyClassName="p-0">
              <TermTable
                rows={companies}
                empty="No companies."
                getKey={(row) => row.id}
                columns={[
                  { key: "name", header: "Company", render: (row) => row.name },
                  { key: "cash", header: "Cash", className: "text-right", render: (row) => <Num value={statementAt(book.statements, row.id, month)?.cash ?? 0} /> },
                  { key: "run", header: "Runway", render: (row) => {
                    const months = runway(book.statements, row.id, month)
                    return months === null ? "n/m" : `${months.toFixed(1)} mo`
                  } },
                  { key: "sess", header: "Sessions", className: "text-right", render: (row) => <Num value={statementAt(book.statements, row.id, month)?.sessions ?? 0} kind="num" /> },
                ]}
              />
            </Panel>
            <div className="grid gap-2 lg:grid-cols-2">
              <Panel title="Alerts">
                {alerts.length === 0 ? <Empty>No alerts.</Empty> : alerts.map((alert) => (
                  <div key={alert.id} className="border-b border-border/70 py-1 text-xs">
                    <span className={alert.severity === "high" ? "text-down" : "text-amber"}>{alert.title}</span>
                    <div className="text-muted-foreground">{alert.detail}</div>
                  </div>
                ))}
              </Panel>
              <Panel title="Decisions">
                {decisions.length === 0 ? <Empty>No decision notes.</Empty> : decisions.map((page) => (
                  <div key={page.id} className="border-b border-border/70 py-1 text-xs">
                    <div>{page.title}</div>
                    <p className="text-muted-foreground">{page.body}</p>
                  </div>
                ))}
              </Panel>
            </div>
            <Panel title="In progress">
              {doing.length === 0 ? <Empty>Nothing in progress.</Empty> : doing.map((item) => (
                <div key={item.id} className="border-b border-border/70 py-1 text-xs">
                  {item.title}
                  <span className="text-muted-foreground"> · {book.people.find((person) => person.id === item.assigneeId)?.name ?? "Unassigned"}</span>
                </div>
              ))}
            </Panel>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function HoldcoDesk({ id }: { id: string }) {
  const book = usePortfolio()
  const palette = usePalette()
  const [mode, setMode] = useState<ConsolidationMode>("full")
  const [span, setSpan] = useState<Span>("12M")
  const holdco = book.holdcos.find((item) => item.id === id)
  const companies = holdco ? holdcoCompanies(book, holdco.id) : []
  const snap = snapshotFor(book, companies, mode)
  const series = seriesFor(book, companies, span, mode)
  const periods = windowPeriods([...new Set(book.statements.map((statement) => statement.period))], book.asOf, span)
  const lines = projectRows(
    periods.map((period) => {
      const values: Record<string, number> = {}
      for (const company of companies) {
        const statement = statementAt(book.statements, company.id, period)
        values[company.name] = statement ? derivePnl(statement).netIncome * (mode === "weighted" ? company.ownershipPct / 100 : 1) : 0
      }
      return { period, values }
    }),
    span,
    book.asOf,
  ).map((row) => ({ period: row.period, ...row.values }))
  if (!holdco) {
    return <div className="p-6 text-sm text-muted-foreground">That holding company is not in the book.</div>
  }
  return (
    <div>
      <PageHead
        kicker={`${holdco.jurisdiction} · ${holdco.entityType} · FYE ${holdco.fiscalYearEnd}`}
        title={holdco.name}
        lede={`${holdco.description} Rollup is uneliminated.`}
        actions={
          <>
            <SpanToggle value={span} onChange={setSpan} />
            <div className="flex border border-border">
              {(["full", "weighted"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setMode(value)} className={`px-2 py-1 font-mono text-[10px] tracking-wider uppercase ${mode === value ? "bg-amber text-primary-foreground" : "text-muted-foreground"}`}>
                  {value === "full" ? "Full" : "Ownership weighted"}
                </button>
              ))}
            </div>
          </>
        }
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <Lattice snap={snap} />
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Consolidated revenue and net income">
            <TermLine dual data={series.map((point) => ({ period: point.period, Revenue: point.revenue, "Net income": point.netIncome }))} series={[{ key: "Revenue", name: "Revenue", color: palette[0] }, { key: "Net income", name: "Net income", color: palette[1] }]} />
          </Panel>
          <Panel title="Net income by company">
            <TermLine data={lines} series={companies.map((company, index) => ({ key: company.name, name: company.name, color: palette[index % palette.length] }))} />
          </Panel>
          <Panel title="Revenue contribution">
            <TermHBar data={companies.map((company) => ({ name: company.name, value: (statementAt(book.statements, company.id, book.asOf)?.revenue ?? 0) * (mode === "weighted" ? company.ownershipPct / 100 : 1) }))} />
          </Panel>
          <Panel title="Asset book">
            <TermHBar data={Object.entries(book.assets.filter((asset) => companies.some((company) => company.id === asset.companyId)).reduce<Record<string, number>>((acc, asset) => {
              acc[asset.category] = (acc[asset.category] ?? 0) + asset.bookValue
              return acc
            }, {})).map(([name, value]) => ({ name: name.replace("_", " "), value }))} color={palette[2]} />
          </Panel>
        </div>
        <Panel title="Ownership" bodyClassName="p-0">
          <TermTable
            rows={companies}
            empty="No subsidiaries."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Company", render: (row) => <Link className="hover:text-amber" href={`/companies/${row.id}`}>{row.name}</Link> },
              { key: "own", header: "Owned", render: (row) => `${row.ownershipPct}%` },
              { key: "parent", header: "Parent", render: (row) => book.companies.find((company) => company.id === row.parentCompanyId)?.name ?? holdco.name },
              { key: "model", header: "Model", render: (row) => row.businessModel },
            ]}
          />
        </Panel>
        <Panel title="Stakes on the cap table" bodyClassName="p-0">
          <TermTable
            rows={book.capTable.filter((row) => companies.some((company) => company.id === row.companyId))}
            empty="No cap table rows."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "holder", header: "Holder", render: (row) => row.holder },
              { key: "pct", header: "%", render: (row) => `${row.percent}%` },
              { key: "class", header: "Class", render: (row) => row.shareClass },
            ]}
          />
        </Panel>
        <Panel title="Intercompany" bodyClassName="p-0">
          <TermTable
            rows={book.loans.filter((loan) => companies.some((company) => company.id === loan.lenderCompanyId || company.id === loan.borrowerCompanyId))}
            empty="No intercompany loans inside this holdco."
            getKey={(row) => row.id}
            columns={[
              { key: "from", header: "Lender", render: (row) => book.companies.find((company) => company.id === row.lenderCompanyId)?.name ?? "—" },
              { key: "to", header: "Borrower", render: (row) => book.companies.find((company) => company.id === row.borrowerCompanyId)?.name ?? "—" },
              { key: "bal", header: "Balance", className: "text-right", render: (row) => <Num value={row.balance} /> },
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}
