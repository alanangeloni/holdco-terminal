"use client"

import Link from "next/link"
import { useState } from "react"
import { AskDialog } from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Empty, MiniActions, PageHead, Panel, TermTable } from "@/components/terminal/kit"
import { CONFIDENCE_LABEL, RECOMMENDATION_LABEL, killAndParkLog, latestDecided, openAsks, stealsPriority } from "@/lib/capital"
import { dayLabel, money } from "@/lib/format"
import { usePortfolio } from "@/lib/store"
import type { CapitalAsk, Company, Idea, Recommendation } from "@/lib/types"

function subjectName(ask: CapitalAsk, companies: Company[], ideas: Idea[]) {
  if (ask.companyId) return companies.find((company) => company.id === ask.companyId)?.name ?? "Former company"
  if (ask.ideaId) return ideas.find((idea) => idea.id === ask.ideaId)?.name ?? "Former idea"
  return "Unassigned"
}

function Subject({ ask, companies, ideas }: { ask: CapitalAsk; companies: Company[]; ideas: Idea[] }) {
  const name = subjectName(ask, companies, ideas)
  const label = (
    <>
      <div>{ask.companyId ? <Link className="hover:text-amber" href={`/companies/${ask.companyId}`}>{name}</Link> : ask.ideaId ? <Link className="hover:text-amber" href="/ideas">{name}</Link> : name}</div>
      <div className="text-muted-foreground">{ask.title}</div>
    </>
  )
  return label
}

function recClass(recommendation: Recommendation) {
  if (recommendation === "do") return "text-up"
  if (recommendation === "dont") return "text-down"
  return "text-amber"
}

function askAmount(ask: CapitalAsk) {
  if (ask.kind === "attention") return "Attention"
  return money(ask.cashAmount ?? 0)
}

export function CapitalDesk() {
  const book = usePortfolio()
  const updateCapital = usePortfolio((state) => state.updateCapital)
  const deleteAsk = usePortfolio((state) => state.deleteAsk)
  const capital = book.capital
  const [cash, setCash] = useState(String(capital.deployableCash))
  const [priorityId, setPriorityId] = useState(capital.priorityCompanyId ?? "none")
  const [callNote, setCallNote] = useState(capital.callNote)
  const [callDate, setCallDate] = useState(capital.callDate)
  const [seen, setSeen] = useState(capital)
  const [askOpen, setAskOpen] = useState(false)
  const [editing, setEditing] = useState<CapitalAsk | null>(null)
  if (capital !== seen) {
    setSeen(capital)
    setCash(String(capital.deployableCash))
    setPriorityId(capital.priorityCompanyId ?? "none")
    setCallNote(capital.callNote)
    setCallDate(capital.callDate)
  }
  const priority = book.companies.find((company) => company.id === capital.priorityCompanyId)
  const openRows = openAsks(book.asks)
  const log = killAndParkLog(book.asks)
  const latest = latestDecided(book.asks)
  const saveCall = () => {
    const amount = Number(String(cash).replace(/,/g, ""))
    updateCapital({
      deployableCash: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      priorityCompanyId: priorityId === "none" ? null : priorityId,
      callNote: callNote.trim(),
      callDate,
    })
  }

  return (
    <div>
      <PageHead
        kicker={`#1 ${priority?.name ?? "None set"}`}
        title="Capital"
        job="See which ask gets the next dollar."
        lede="Open asks, the latest call, and the log of kills and parks. Dry powder is cash you can deploy. It is separate from operating cash, and it can be zero."
        actions={<Button size="sm" onClick={() => { setEditing(null); setAskOpen(true) }}>New ask</Button>}
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <section className="grid gap-3 border border-border bg-card px-2.5 py-2 md:grid-cols-[180px_240px_1fr_auto] md:items-end">
          <label className="grid gap-1">
            <span className="text-[10px] tracking-wider text-amber uppercase">Dry powder</span>
            <Input value={cash} type="number" min={0} onChange={(event) => setCash(event.target.value)} className="h-8 font-mono text-xs" />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] tracking-wider text-amber uppercase">#1 priority</span>
            <Select value={priorityId} onValueChange={setPriorityId}>
              <SelectTrigger className="w-full font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {book.companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="text-[11px] text-muted-foreground">Available to buy or fund things. Operating cash stays on the treasury desk.</p>
          <Button size="sm" variant="outline" onClick={saveCall}>Save call</Button>
        </section>
        <Panel title="Latest call">
          <div className="grid gap-2">
            <label className="grid max-w-xs gap-1">
              <span className="text-[10px] tracking-wider text-amber uppercase">Call date</span>
              <Input value={callDate} type="date" onChange={(event) => setCallDate(event.target.value)} className="h-8 font-mono text-xs" />
            </label>
            <Textarea value={callNote} onChange={(event) => setCallNote(event.target.value)} className="min-h-16 text-xs" />
            {latest ? (
              <div className="border-t border-border pt-2 text-xs">
                <div className={`font-mono text-[10px] tracking-wider uppercase ${recClass(latest.recommendation)}`}>
                  {latest.decidedAt ? dayLabel(latest.decidedAt) : "Decided"} · {RECOMMENDATION_LABEL[latest.recommendation]}
                </div>
                <div className="mt-1">{subjectName(latest, book.companies, book.ideas)} · {latest.title}</div>
                <div className="text-muted-foreground">{latest.why}</div>
              </div>
            ) : (
              <Empty>No decided ask yet.</Empty>
            )}
          </div>
        </Panel>
        <Panel title={`Open asks · ${openRows.length}`} bodyClassName="p-0">
          <TermTable
            rows={openRows}
            empty="No open asks."
            getKey={(row) => row.id}
            columns={[
              { key: "for", header: "For", render: (row) => <Subject ask={row} companies={book.companies} ideas={book.ideas} /> },
              { key: "ask", header: "Ask", render: (row) => <span className="font-mono">{askAmount(row)}</span> },
              {
                key: "call",
                header: "Call",
                render: (row) => (
                  <div>
                    <div className={recClass(row.recommendation)}>{RECOMMENDATION_LABEL[row.recommendation]}</div>
                    {row.recommendation === "soft_yes" && row.conditions ? <div className="text-muted-foreground">{row.conditions}</div> : null}
                  </div>
                ),
              },
              { key: "why", header: "Why", render: (row) => row.why },
              { key: "instead", header: "Instead", render: (row) => row.alternatives },
              { key: "confidence", header: "Confidence", render: (row) => <span className="font-mono text-[10px] uppercase">{CONFIDENCE_LABEL[row.confidence]}</span> },
              {
                key: "focus",
                header: "Focus",
                render: (row) => stealsPriority(row) ? (
                  <div>
                    <div className="font-mono text-[10px] text-down">STEALS #1</div>
                    {row.focusNote ? <div className="text-muted-foreground">{row.focusNote}</div> : null}
                  </div>
                ) : <span className="text-muted-foreground">—</span>,
              },
              {
                key: "act",
                header: "",
                className: "text-right",
                render: (row) => (
                  <MiniActions
                    onEdit={() => { setEditing(row); setAskOpen(true) }}
                    onDelete={() => deleteAsk(row.id)}
                  />
                ),
              },
            ]}
          />
        </Panel>
        <Panel title="Kills and parks" bodyClassName="p-0">
          <TermTable
            rows={log}
            empty="No kills or parks yet."
            getKey={(row) => row.id}
            columns={[
              { key: "date", header: "Date", render: (row) => <span className="font-mono">{row.decidedAt ? dayLabel(row.decidedAt) : "—"}</span> },
              { key: "for", header: "For", render: (row) => <Subject ask={row} companies={book.companies} ideas={book.ideas} /> },
              {
                key: "call",
                header: "Call",
                render: (row) => <span className={recClass(row.recommendation)}>{row.status === "parked" ? "Park it" : "Don't"}</span>,
              },
              { key: "why", header: "Why", render: (row) => row.why },
              { key: "instead", header: "Instead", render: (row) => row.alternatives },
              {
                key: "act",
                header: "",
                className: "text-right",
                render: (row) => <MiniActions onEdit={() => { setEditing(row); setAskOpen(true) }} />,
              },
            ]}
          />
        </Panel>
      </div>
      <AskDialog open={askOpen} onOpenChange={setAskOpen} initial={editing} />
    </div>
  )
}
