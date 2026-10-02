"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Empty, Num, PageHead, Panel, TermTable } from "@/components/terminal/kit"
import { pct } from "@/lib/format"
import { kpiMiss } from "@/lib/alerts"
import {
  customerShares,
  periodRevenue,
  retainedRevenue,
  stageProbability,
  vendorShares,
  periodCost,
  largestShare,
  weightedPipeline,
} from "@/lib/additions"
import { usePortfolio } from "@/lib/store"

export function CustomerDesk() {
  const book = usePortfolio()
  const saveMemo = usePortfolio((state) => state.saveMemo)
  const memo = book.memos.find((item) => item.period === book.asOf)
  const [changed, setChanged] = useState(memo?.changed ?? "")
  const [doing, setDoing] = useState(memo?.doing ?? "")
  const [notDoing, setNotDoing] = useState(memo?.notDoing ?? "")
  const revenue = periodRevenue(book)
  const cost = periodCost(book)
  const customers = customerShares(book).slice(0, 8)
  const vendors = vendorShares(book).slice(0, 8)
  const retained = retainedRevenue(book)
  const inputs = book.kpis.filter((kpi) => (kpi.kind ?? "output") === "input")
  const outputs = book.kpis.filter((kpi) => (kpi.kind ?? "output") === "output")
  const decisions = book.pages.filter((page) => page.kind === "decision")

  return (
    <div>
      <PageHead
        kicker={`Close ${book.asOf}`}
        title="Customer's math"
        job="See who the revenue depends on, and write the memo for the close."
        lede="Concentration, retention, input metrics, and the note of what changed. The board pack still prints beside this."
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Largest customer">
            <div className="text-sm">{largestShare(customers, revenue).name}</div>
            <div className="font-mono text-xs text-muted-foreground">{pct(largestShare(customerShares(book), revenue).share)} of revenue</div>
          </Panel>
          <Panel title="Largest vendor">
            <div className="text-sm">{largestShare(vendors, cost).name}</div>
            <div className="font-mono text-xs text-muted-foreground">{pct(largestShare(vendorShares(book), cost).share)} of cost</div>
          </Panel>
          <Panel title="Retained from last year's customers">
            <Num value={retained.invoiced} />
            <div className="font-mono text-xs text-muted-foreground">{pct(retained.share)} of this close · {retained.customers} customers</div>
          </Panel>
        </div>
        <Panel title="Customer concentration" bodyClassName="p-0">
          <TermTable
            rows={customers}
            empty="No invoices."
            getKey={(row) => row.name}
            columns={[
              { key: "name", header: "Customer", render: (row) => row.name },
              { key: "amt", header: "Invoiced", className: "text-right", render: (row) => <Num value={row.amount} /> },
              { key: "share", header: "Share", className: "text-right", render: (row) => pct(revenue ? row.amount / revenue : 0) },
            ]}
          />
        </Panel>
        <div className="grid gap-2 lg:grid-cols-2">
          <Panel title="Inputs the team controls" bodyClassName="p-0">
            <KpiList rows={inputs} />
          </Panel>
          <Panel title="Outputs that follow" bodyClassName="p-0">
            <KpiList rows={outputs} />
          </Panel>
        </div>
        <Panel title="Close memo">
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              saveMemo(book.asOf, { changed, doing, notDoing })
            }}
          >
            <MemoField label="What changed" value={changed} onChange={setChanged} />
            <MemoField label="What we are doing" value={doing} onChange={setDoing} />
            <MemoField label="What we are not doing" value={notDoing} onChange={setNotDoing} />
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {memo?.signedBy ? `Signed by ${memo.signedBy}${memo.signedAt ? ` on ${memo.signedAt}` : ""}` : "Not signed"}
              </span>
              <Button size="sm" type="submit">Save memo</Button>
            </div>
          </form>
        </Panel>
        <Panel title="Pipeline, probability weighted">
          <div className="text-sm"><Num value={weightedPipeline(book)} /></div>
          <div className="mt-2 grid gap-1 text-xs">
            {book.deals.filter((deal) => deal.stage !== "lost").map((deal) => (
              <div key={deal.id} className="flex justify-between gap-3 border-b border-border/70 py-1">
                <span>{deal.name}</span>
                <span className="font-mono text-muted-foreground">{pct(deal.probability ?? stageProbability(deal.stage))} · <Num value={deal.amount * (deal.probability ?? stageProbability(deal.stage))} /></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Decisions">
          {decisions.length === 0 ? <Empty>No decisions yet.</Empty> : decisions.map((page) => (
            <div key={page.id} className="border-b border-border/70 py-2 text-xs">
              <Link className="hover:text-amber" href={`/companies/${page.companyId}?tab=wiki`}>{page.title}</Link>
              <div className="text-muted-foreground">
                {page.reversible === undefined ? "Reversibility not set" : page.reversible ? "Reversible" : "One way"}
                {page.reviewDate ? ` · review ${page.reviewDate}` : ""}
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function MemoField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] tracking-wider text-amber uppercase">{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-16 font-mono text-xs" />
    </label>
  )
}

function KpiList({ rows }: { rows: { id: string; companyId: string; name: string; actual: number; target: number; unit: string; direction: "up" | "down" }[] }) {
  const book = usePortfolio()
  if (!rows.length) return <Empty>None tagged.</Empty>
  return (
    <div>
      {rows.map((kpi) => (
        <div key={kpi.id} className="flex justify-between gap-3 border-b border-border/70 px-2 py-1 text-xs">
          <span>{book.companies.find((company) => company.id === kpi.companyId)?.name} · {kpi.name}</span>
          <span className={kpiMiss(kpi.direction, kpi.actual, kpi.target) ? "font-mono text-down" : "font-mono text-up"}>{kpi.actual} {kpi.unit}</span>
        </div>
      ))}
    </div>
  )
}
