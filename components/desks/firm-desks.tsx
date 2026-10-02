"use client"

import Link from "next/link"
import { useState } from "react"
import { PALETTE, TermHBar, TermLine, TermStacked } from "@/components/charts/charts"
import { AssetDialog, ConfirmDialog, PersonDialog, PostDialog, WikiDialog, WorkDialog } from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { Empty, MiniActions, Num, PageHead, Panel, SpanToggle, TermTable } from "@/components/terminal/kit"
import { pct } from "@/lib/format"
import { projectRows } from "@/lib/grain"
import { shiftPeriod, statementAt, windowPeriods } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"
import type { AssetCategory, Span, WorkStatus } from "@/lib/types"
import { PLATFORMS } from "@/lib/types"
import { seriesFor, snapshotFor } from "@/lib/view"

const COST_SERIES = [
  { key: "Organic", name: "Organic", color: "#3dd68c" },
  { key: "Paid", name: "Paid", color: "#f5a524" },
  { key: "Direct", name: "Direct", color: "#8aa0b4" },
  { key: "Referral", name: "Referral", color: "#6ea8fe" },
  { key: "Social", name: "Social", color: "#d6d3d1" },
]

export function AudienceDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const [span, setSpan] = useState<Span>("12M")
  const [open, setOpen] = useState(false)
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  const series = seriesFor(book, companies, span)
  const periods = windowPeriods([...new Set(book.statements.map((statement) => statement.period))], book.asOf, span)
  const socialAt = (period: string) => {
    const values: Record<string, number> = {}
    for (const platform of PLATFORMS) {
      values[platform] = companies.reduce((sum, company) => sum + (statementAt(book.statements, company.id, period)?.social[platform].followers ?? 0), 0)
    }
    return { period, values }
  }
  const priorPeriod = periods[0] ? shiftPeriod(periods[0], -1) : null
  const prior = priorPeriod && companies.some((company) => statementAt(book.statements, company.id, priorPeriod)) ? socialAt(priorPeriod) : null
  const social = projectRows(periods.map(socialAt), span, book.asOf, { stock: [...PLATFORMS], prior }).map((row) => ({ period: row.period, ...row.values }))
  const snap = snapshotFor(book, companies)
  const channels = series.map((point) => ({
    period: point.period,
    Organic: point.channelOrganic,
    Paid: point.channelPaid,
    Direct: point.channelDirect,
    Referral: point.channelReferral,
    Social: point.channelSocial,
  }))
  const funnel = [
    { name: "Visits", value: snap.sessions },
    { name: "Leads", value: snap.conversions },
    { name: "Customers", value: new Set(book.invoices.filter((invoice) => companies.some((company) => company.id === invoice.companyId) && invoice.issue.startsWith(book.asOf)).map((invoice) => invoice.customerId)).size },
  ]
  const posts = book.posts.filter((post) => companies.some((company) => company.id === post.companyId))
  return (
    <div>
      {embedded ? null : <PageHead kicker="Market" title="Audience" lede="Site traffic, channel mix, and social. The funnel is visits, goal conversions, then customers invoiced that month." actions={<SpanToggle value={span} onChange={setSpan} />} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        <div className="flex justify-end gap-2">
          {embedded ? <SpanToggle value={span} onChange={setSpan} /> : null}
          <Button size="sm" onClick={() => setOpen(true)}>Add post</Button>
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Sessions and users">
            <TermLine data={series.map((point) => ({ period: point.period, Sessions: point.sessions, Users: point.users }))} series={[{ key: "Sessions", name: "Sessions", color: PALETTE[0] }, { key: "Users", name: "Users", color: PALETTE[3] }]} />
          </Panel>
          <Panel title="Channel mix">
            <TermStacked data={channels} series={COST_SERIES} />
          </Panel>
          <Panel title="Funnel">
            <TermHBar data={funnel} moneyAxis={false} color="#6ea8fe" />
          </Panel>
          <Panel title="Followers">
            <TermLine data={social} series={PLATFORMS.map((platform, index) => ({ key: platform, name: platform, color: PALETTE[index] }))} />
          </Panel>
        </div>
        <Panel title="Posts" bodyClassName="p-0">
          <TermTable
            rows={posts}
            empty="No posts yet."
            getKey={(row) => row.id}
            columns={[
              { key: "date", header: "Published", render: (row) => row.published },
              { key: "plat", header: "Platform", render: (row) => row.platform },
              { key: "title", header: "Post", render: (row) => row.title },
              { key: "imp", header: "Impressions", className: "text-right", render: (row) => <Num value={row.impressions} kind="num" /> },
              { key: "eng", header: "Engagement", className: "text-right", render: (row) => pct(row.engagement) },
            ]}
          />
        </Panel>
        {periods.length ? (
          <p className="text-[11px] text-muted-foreground">
            Latest followers {Math.round(snap.followers).toLocaleString()} · bounce is on the company statement.
            {companyId && statementAt(book.statements, companyId, book.asOf) ? ` Bounce ${pct(statementAt(book.statements, companyId, book.asOf)!.bounceRate)}.` : ""}
          </p>
        ) : null}
      </div>
      {open ? <PostDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
    </div>
  )
}

export function PeopleDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const remove = usePortfolio((state) => state.deletePerson)
  const [kind, setKind] = useState<"all" | "person" | "agent">("all")
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const people = book.people.filter((person) => {
    if (kind !== "all" && person.kind !== kind) return false
    if (!companyId) return true
    return book.allocations.some((row) => row.personId === person.id && row.companyId === companyId && row.percent > 0) || person.homeCompanyId === companyId
  })
  const doing = book.work.filter((item) => item.status === "doing" && (!companyId || item.companyId === companyId))
  return (
    <div>
      {embedded ? null : <PageHead kicker="Firm" title="People and agents" lede="Allocation is the assignment. Home company is where they sit." actions={<Button size="sm" onClick={() => setOpen(true)}>Add person or agent</Button>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex border border-border">
            {(["all", "person", "agent"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setKind(value)} className={`px-2 py-1 font-mono text-[10px] tracking-wider uppercase ${kind === value ? "bg-amber text-primary-foreground" : "text-muted-foreground"}`}>
                {value}
              </button>
            ))}
          </div>
          {embedded ? <Button size="sm" onClick={() => setOpen(true)}>Add person or agent</Button> : null}
        </div>
        <Panel title="Roster" bodyClassName="p-0">
          <TermTable
            rows={people}
            empty="Nobody on this roster yet."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "kind", header: "Kind", render: (row) => row.kind },
              { key: "role", header: "Role", render: (row) => row.role },
              { key: "alloc", header: "Allocation", render: (row) => book.allocations.filter((item) => item.personId === row.id).map((item) => `${book.companies.find((company) => company.id === item.companyId)?.name ?? "?"} ${item.percent}%`).join(", ") || "—" },
              { key: "cost", header: "Annual cost", className: "text-right", render: (row) => <Num value={row.annualCost} /> },
              { key: "runs", header: "Runs / mo", render: (row) => row.kind === "agent" ? `${row.runtime} · ${row.monthlyRuns}` : "—" },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm(row.id)} /> },
            ]}
          />
        </Panel>
        <Panel title="In progress">
          {doing.length === 0 ? <Empty>No work in progress.</Empty> : doing.map((item) => (
            <div key={item.id} className="border-b border-border/70 py-1.5 text-xs">
              <div>{item.title}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {book.people.find((person) => person.id === item.assigneeId)?.name ?? "Unassigned"} · {book.companies.find((company) => company.id === item.companyId)?.name}
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Open roles" bodyClassName="p-0">
          <TermTable
            rows={book.roles.filter((role) => !companyId || role.companyId === companyId)}
            empty="No open roles."
            getKey={(row) => row.id}
            columns={[
              { key: "title", header: "Role", render: (row) => row.title },
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "st", header: "Status", render: (row) => row.status },
            ]}
          />
        </Panel>
      </div>
      {open ? <PersonDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
      <ConfirmDialog open={Boolean(confirm)} title="Remove this person?" body="Allocations go with them. Work they owned becomes unassigned." onOpenChange={() => setConfirm(null)} onConfirm={() => confirm && remove(confirm)} />
    </div>
  )
}

const CATEGORIES: AssetCategory[] = ["equity", "ip", "real_estate", "equipment", "domain", "inventory", "other"]

export function AssetsDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const remove = usePortfolio((state) => state.deleteAsset)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>("all")
  const [confirm, setConfirm] = useState<string | null>(null)
  const assets = book.assets.filter((asset) => (!companyId || asset.companyId === companyId) && (category === "all" || asset.category === category))
  const bars = CATEGORIES.map((item) => ({
    name: item.replace("_", " "),
    value: assets.filter((asset) => asset.category === item).reduce((sum, asset) => sum + asset.bookValue, 0),
  })).filter((item) => item.value > 0)
  return (
    <div>
      {embedded ? null : <PageHead kicker="Firm" title="Assets" lede="Book value owned by each company. Cash is on the treasury desk." actions={<Button size="sm" onClick={() => setOpen(true)}>Add asset</Button>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <FilterChip on={category === "all"} onClick={() => setCategory("all")} label="All" />
            {CATEGORIES.map((item) => <FilterChip key={item} on={category === item} onClick={() => setCategory(item)} label={item.replace("_", " ")} />)}
          </div>
          {embedded ? <Button size="sm" onClick={() => setOpen(true)}>Add asset</Button> : null}
        </div>
        <Panel title="Book by category"><TermHBar data={bars} /></Panel>
        <Panel title="Register" bodyClassName="p-0">
          <TermTable
            rows={assets}
            empty="No assets in this filter."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Asset", render: (row) => row.name },
              { key: "co", header: "Company", render: (row) => <Link className="hover:text-amber" href={`/companies/${row.companyId}?tab=assets`}>{book.companies.find((company) => company.id === row.companyId)?.name}</Link> },
              { key: "cat", header: "Category", render: (row) => row.category.replace("_", " ") },
              { key: "loc", header: "Where", render: (row) => row.location },
              { key: "val", header: "Book", className: "text-right", render: (row) => <Num value={row.bookValue} /> },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm(row.id)} /> },
            ]}
          />
        </Panel>
      </div>
      {open ? <AssetDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
      <ConfirmDialog open={Boolean(confirm)} title="Remove this asset?" body="The book value leaves the register." onOpenChange={() => setConfirm(null)} onConfirm={() => confirm && remove(confirm)} />
    </div>
  )
}

function FilterChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`border border-border px-2 py-1 font-mono text-[10px] tracking-wider uppercase ${on ? "bg-amber text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
}

const COLUMNS: WorkStatus[] = ["backlog", "doing", "done"]

export function WorkDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const move = usePortfolio((state) => state.moveWork)
  const remove = usePortfolio((state) => state.deleteWork)
  const [open, setOpen] = useState(false)
  const items = book.work.filter((item) => !companyId || item.companyId === companyId)
  return (
    <div>
      {embedded ? null : <PageHead kicker="Firm" title="Work" lede="The board of who is on what, person or agent." actions={<Button size="sm" onClick={() => setOpen(true)}>Add work</Button>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>Add work</Button></div> : null}
        <div className="grid gap-2 lg:grid-cols-3">
          {COLUMNS.map((status) => (
            <Panel key={status} title={status}>
              {items.filter((item) => item.status === status).length === 0 ? <Empty>Nothing here.</Empty> : null}
              {items.filter((item) => item.status === status).map((item) => {
                const index = COLUMNS.indexOf(status)
                return (
                  <article key={item.id} className="mb-2 border border-border p-2 text-xs">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {book.people.find((person) => person.id === item.assigneeId)?.name ?? "Unassigned"} · {book.companies.find((company) => company.id === item.companyId)?.name}
                      {item.due ? ` · due ${item.due}` : ""}
                    </div>
                    {item.notes ? <p className="mt-1 text-muted-foreground">{item.notes}</p> : null}
                    <div className="mt-2 flex gap-1">
                      {index > 0 ? <Button size="xs" variant="outline" onClick={() => move(item.id, COLUMNS[index - 1])}>Back</Button> : null}
                      {index < 2 ? <Button size="xs" variant="outline" onClick={() => move(item.id, COLUMNS[index + 1])}>Forward</Button> : null}
                      <Button size="xs" variant="ghost" className="text-down" onClick={() => remove(item.id)}>Del</Button>
                    </div>
                  </article>
                )
              })}
            </Panel>
          ))}
        </div>
      </div>
      {open ? <WorkDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
    </div>
  )
}

export function WikiDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const update = usePortfolio((state) => state.updatePage)
  const remove = usePortfolio((state) => state.deletePage)
  const pages = book.pages.filter((page) => !companyId || page.companyId === companyId)
  const [selected, setSelected] = useState(pages[0]?.id ?? "")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const page = pages.find((item) => item.id === selected) ?? pages[0]
  return (
    <div>
      {embedded ? null : <PageHead kicker="Firm" title="Wiki" lede="Briefs, meetings, decisions, and SOPs for each company." actions={<Button size="sm" onClick={() => setOpen(true)}>New page</Button>} />}
      <div className={`${embedded ? "" : "p-2 lg:p-3"} grid gap-2 lg:grid-cols-[16rem_1fr]`}>
        <Panel title="Pages" bodyClassName="p-0" action={embedded ? <Button size="xs" onClick={() => setOpen(true)}>New</Button> : undefined}>
          {pages.length === 0 ? <Empty>No pages yet.</Empty> : pages.map((item) => (
            <button key={item.id} type="button" onClick={() => { setSelected(item.id); setDraft(item.body) }} className={`block w-full border-b border-border/70 px-2 py-1.5 text-left text-xs ${page?.id === item.id ? "bg-amber/10" : ""}`}>
              <div>{item.title}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{item.kind} · {book.companies.find((company) => company.id === item.companyId)?.name}</div>
            </button>
          ))}
        </Panel>
        <Panel title={page ? page.title : "Page"}>
          {page ? (
            <div className="grid gap-2">
              <div className="font-mono text-[10px] text-muted-foreground">{page.kind} · updated {page.updated}</div>
              <textarea
                className="min-h-56 w-full border border-border bg-background p-2 font-mono text-xs"
                value={selected === page.id ? draft || page.body : page.body}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => setDraft(page.body)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => update(page.id, { body: draft || page.body })}>Save</Button>
                <Button size="sm" variant="ghost" className="text-down" onClick={() => remove(page.id)}>Remove</Button>
              </div>
            </div>
          ) : <Empty>Write the first page for this company.</Empty>}
        </Panel>
      </div>
      {open ? <WikiDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
    </div>
  )
}
