"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { CompanyDialog } from "@/components/dialogs/editors"
import { AssetsDesk, AudienceDesk, PeopleDesk, WikiDesk, WorkDesk } from "@/components/desks/firm-desks"
import { PayablesDesk, ReceivablesDesk, RevenueDesk, StatementsDesk, TreasuryDesk } from "@/components/desks/finance-desks"
import { CorporateDesk, ScorecardDesk } from "@/components/desks/record-desks"
import { Lattice } from "@/components/desks/shared"
import { Spark } from "@/components/charts/charts"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, PageHead, Panel } from "@/components/terminal/kit"
import { deriveAlerts } from "@/lib/alerts"
import { todayISO } from "@/lib/format"
import { usePortfolio } from "@/lib/store"
import { snapshotFor, sparkline } from "@/lib/view"

const TABS = [
  ["overview", "Overview"],
  ["statements", "Statements"],
  ["revenue", "Revenue"],
  ["receivables", "Receivables"],
  ["payables", "Payables"],
  ["treasury", "Treasury"],
  ["audience", "Audience"],
  ["people", "People"],
  ["assets", "Assets"],
  ["work", "Work"],
  ["wiki", "Wiki"],
  ["corporate", "Corporate"],
  ["scorecard", "Scorecard"],
] as const

export function Cockpit({ id }: { id: string }) {
  const book = usePortfolio()
  const router = useRouter()
  const params = useSearchParams()
  const tab = TABS.some((item) => item[0] === params.get("tab")) ? (params.get("tab") as (typeof TABS)[number][0]) : "overview"
  const company = book.companies.find((item) => item.id === id)
  const [edit, setEdit] = useState(false)
  if (!company) {
    return <div className="p-6 text-sm text-muted-foreground">That company is not in the book.</div>
  }
  const snap = snapshotFor(book, [company], "full")
  const alerts = deriveAlerts(book, todayISO()).filter((alert) => alert.companyId === company.id)
  const doing = book.work.filter((item) => item.companyId === company.id && item.status === "doing")
  const holdco = book.holdcos.find((item) => item.id === company.holdcoId)
  return (
    <div>
      <PageHead
        kicker={`${company.status} · ${company.businessModel} · ${company.ownershipPct}% owned${holdco ? ` · ${holdco.name}` : " · standalone"}`}
        title={company.name}
        lede={company.description}
        actions={<Button size="sm" variant="outline" onClick={() => setEdit(true)}>Edit company</Button>}
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
          <span>{company.legalName}</span>
          <span>{company.hq}</span>
          <span>{company.website}</span>
          <span>{company.entityType}</span>
        </div>
        <Lattice snap={snap} />
        <Tabs
          value={tab}
          onValueChange={(value) => router.replace(`/companies/${company.id}?tab=${value}`)}
        >
          <div className="overflow-x-auto">
            <TabsList className="h-auto w-max">
              {TABS.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="font-mono text-[10px] tracking-wider uppercase">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="overview" className="grid gap-2 lg:grid-cols-2">
            <Panel title="Revenue, twelve months">
              <div className="flex items-center gap-3">
                <Spark data={sparkline(book, company.id)} />
                <span className="text-xs text-muted-foreground">Sparkline through the as-of month.</span>
              </div>
            </Panel>
            <Panel title="Alerts">
              {alerts.length === 0 ? <Empty>No alerts on this company.</Empty> : alerts.slice(0, 5).map((alert) => (
                <button key={alert.id} type="button" className="block w-full border-b border-border/70 py-1 text-left text-xs" onClick={() => router.push(alert.href)}>
                  <span className={alert.severity === "high" ? "text-down" : "text-amber"}>{alert.title}</span>
                  <div className="text-muted-foreground">{alert.detail}</div>
                </button>
              ))}
            </Panel>
            <Panel title="Who is on what">
              {doing.length === 0 ? <Empty>Nothing in progress.</Empty> : doing.map((item) => (
                <div key={item.id} className="border-b border-border/70 py-1 text-xs">
                  {item.title}
                  <div className="font-mono text-[10px] text-muted-foreground">{book.people.find((person) => person.id === item.assigneeId)?.name ?? "Unassigned"} · {book.people.find((person) => person.id === item.assigneeId)?.kind ?? ""}</div>
                </div>
              ))}
            </Panel>
            <Panel title="Officers">
              {company.officers.length === 0 ? <Empty>No officers listed.</Empty> : company.officers.map((officer) => (
                <div key={officer.name} className="border-b border-border/70 py-1 text-xs">{officer.name} · {officer.title}</div>
              ))}
            </Panel>
          </TabsContent>
          <TabsContent value="statements"><StatementsDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="revenue"><RevenueDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="receivables"><ReceivablesDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="payables"><PayablesDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="treasury"><TreasuryDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="audience"><AudienceDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="people"><PeopleDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="assets"><AssetsDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="work"><WorkDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="wiki"><WikiDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="corporate"><CorporateDesk companyId={company.id} embedded /></TabsContent>
          <TabsContent value="scorecard"><ScorecardDesk companyId={company.id} embedded /></TabsContent>
        </Tabs>
      </div>
      {edit ? <CompanyDialog open onOpenChange={setEdit} initial={company} /> : null}
    </div>
  )
}
