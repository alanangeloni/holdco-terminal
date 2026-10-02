"use client"

import Link from "next/link"
import { TermArea, TermHBar, usePalette } from "@/components/charts/charts"
import { Button } from "@/components/ui/button"
import { Num, PageHead, Panel, TermTable } from "@/components/terminal/kit"
import { pct, todayISO } from "@/lib/format"
import {
  audienceYield,
  companyRanks,
  dailyCashSeries,
  doublingCase,
  fridayOf,
  myWeek,
  overheadRatio,
  sharedNames,
  sharedPeople,
} from "@/lib/additions"
import { statementAt } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"

export function OperatorDesk() {
  const book = usePortfolio()
  const palette = usePalette()
  const draftMonth = usePortfolio((state) => state.draftMonth)
  const today = todayISO()
  const queue = myWeek(book, today)
  const overhead = overheadRatio(book)
  const yieldLine = audienceYield(book, book.companies.map((company) => company.id))
  const daily = dailyCashSeries(book, book.companies.map((company) => company.id))
  const ranks = companyRanks(book)
  const people = sharedPeople(book)
  const customers = sharedNames(book.customers)
  const vendors = sharedNames(book.vendors)

  return (
    <div>
      <PageHead
        kicker={`Due by ${fridayOf(today)}`}
        title="My week"
        job="See what is due, what is blocked, and which bet each product is."
        lede="The queue, the bottleneck, and the product-line bets. Command still has the full picture above this."
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <div className="grid gap-2 lg:grid-cols-3">
          <Panel title="Holdco overhead">
            <Num value={overhead.monthly} />
            <div className="font-mono text-xs text-muted-foreground">{overhead.ratio === null ? "—" : pct(overhead.ratio)} of owner earnings</div>
          </Panel>
          <Panel title="Audience into revenue">
            <div className="text-xs">Sessions <Num value={yieldLine.sessions} kind="num" /></div>
            <div className="text-xs">Revenue per 1,000 sessions <Num value={yieldLine.perThousand} /></div>
            <div className="text-xs text-muted-foreground">Followers <Num value={yieldLine.followers} kind="num" /></div>
          </Panel>
          <Panel title="Open roles beside the load">
            {book.companies.map((company) => {
              const roles = book.roles.filter((role) => role.companyId === company.id && role.status !== "filled")
              const load = book.work.filter((item) => item.companyId === company.id && item.status !== "done").length
              if (!roles.length) return null
              return (
                <div key={company.id} className="border-b border-border/70 py-1 text-xs">
                  {company.name}: {roles.length} open · {load} items in the queue
                </div>
              )
            })}
          </Panel>
        </div>
        <Panel title="Due or blocked" bodyClassName="p-0">
          <TermTable
            rows={queue}
            empty="Nothing is due or blocked this week."
            getKey={(row) => row.id}
            columns={[
              { key: "p", header: "P", render: (row) => row.priority ?? "—" },
              { key: "title", header: "Work", render: (row) => row.title },
              { key: "st", header: "State", render: (row) => row.status },
              { key: "due", header: "Due", render: (row) => row.due ?? "—" },
              { key: "who", header: "Who", render: (row) => book.people.find((person) => person.id === row.assigneeId)?.name ?? "Unassigned" },
              { key: "wait", header: "Waits on", render: (row) => book.work.find((item) => item.id === row.dependsOnId)?.title ?? "—" },
              { key: "stuck", header: "Status", render: (row) => row.stuckNote || row.nextNote || row.doneNote || row.notes },
            ]}
          />
        </Panel>
        <Panel title="Bottleneck and a doubled month" bodyClassName="p-0">
          <TermTable
            rows={book.companies}
            empty="No companies."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => <Link className="hover:text-amber" href={`/companies/${row.id}`}>{row.name}</Link> },
              { key: "bot", header: "Bottleneck", render: (row) => row.bottleneck ?? "—" },
              { key: "cash", header: "Cash after doubling", className: "text-right", render: (row) => {
                const statement = statementAt(book.statements, row.id, book.asOf)
                if (!statement) return "—"
                return <Num value={doublingCase(statement, row.bottleneck ?? "cash").cashAfter} signed />
              } },
              { key: "note", header: "What breaks", render: (row) => {
                const statement = statementAt(book.statements, row.id, book.asOf)
                return statement ? doublingCase(statement, row.bottleneck ?? "cash").note : "—"
              } },
              { key: "draft", header: "", render: (row) => <Button size="xs" variant="outline" onClick={() => draftMonth(row.id)}>Draft next month</Button> },
            ]}
          />
        </Panel>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Daily cash beside the monthly close">
            <TermArea data={daily} dataKey="cash" name="Cash" color={palette[3]} />
          </Panel>
          <Panel title="Ranks">
            <div className="grid gap-2 text-xs">
              <Rank label="Margin" rows={[...ranks].sort((a, b) => (b.margin ?? -1) - (a.margin ?? -1))} field="margin" />
              <Rank label="Growth" rows={[...ranks].sort((a, b) => (b.growth ?? -1) - (a.growth ?? -1))} field="growth" />
              <Rank label="Cash conversion" rows={[...ranks].sort((a, b) => (b.conversion ?? -1) - (a.conversion ?? -1))} field="conversion" />
            </div>
          </Panel>
        </div>
        <Panel title="Portfolio graph">
          <GraphLine label="Shared customers" rows={customers} />
          <GraphLine label="Shared vendors" rows={vendors} />
          <GraphLine label="Shared people" rows={people} />
        </Panel>
        <Panel title="Product bets">
          <div className="grid gap-2 md:grid-cols-2">
            {book.productLines.map((line) => (
              <div key={line.id} className="border border-border p-2 text-xs">
                <div className="font-medium">{line.name}</div>
                <div className="text-muted-foreground">{book.companies.find((company) => company.id === line.companyId)?.name}</div>
                <p className="mt-1">{line.user}</p>
                <p className="text-muted-foreground">{line.problem}</p>
                <p>{line.bet}</p>
                <p className="text-muted-foreground">{line.killCriterion}</p>
                <div className="mt-2 h-1.5 bg-border">
                  <div className="h-full bg-amber" style={{ width: `${Math.min(100, (line.retention ?? 0) * 100)}%` }} />
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">Retention {pct(line.retention ?? 0)} · price <Num value={line.price} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Rank({ label, rows, field }: { label: string; rows: { name: string; margin: number | null; growth: number | null; conversion: number | null }[]; field: "margin" | "growth" | "conversion" }) {
  const palette = usePalette()
  return (
    <div>
      <div className="mb-1 text-[10px] tracking-wider text-amber uppercase">{label}</div>
      <TermHBar moneyAxis={false} color={palette[0]} data={rows.slice(0, 6).map((row) => ({ name: row.name, value: row[field] ?? 0 }))} />
    </div>
  )
}

function GraphLine({ label, rows }: { label: string; rows: { name: string; count: number }[] }) {
  return (
    <div className="border-b border-border/70 py-1 text-xs">
      <span className="text-amber">{label}</span>
      {rows.length === 0 ? <span className="text-muted-foreground"> · none yet</span> : rows.map((row) => (
        <span key={row.name} className="ml-2">{row.name} ({row.count})</span>
      ))}
    </div>
  )
}
