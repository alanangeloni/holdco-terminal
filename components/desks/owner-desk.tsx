"use client"

import { useState } from "react"
import Link from "next/link"
import { TermHBar, usePalette } from "@/components/charts/charts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, Num, PageHead, Panel, TermTable } from "@/components/terminal/kit"
import { pct } from "@/lib/format"
import {
  capitalEmployed,
  cashTie,
  covenantBreach,
  eliminatedPosition,
  hurdleRate,
  internalLoans,
  largestShare,
  lookThroughEarnings,
  maturityWall,
  ownerEarnings,
  periodCost,
  periodRevenue,
  returnOnCapital,
  stressClose,
  unitCost,
  customerShares,
  vendorShares,
} from "@/lib/additions"
import { consolidatedStatement, derivePnl, descendants, statementAt } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"

export function OwnerDesk() {
  const book = usePortfolio()
  const palette = usePalette()
  const updateHoldco = usePortfolio((state) => state.updateHoldco)
  const toggleCheck = usePortfolio((state) => state.toggleCheck)
  const signClose = usePortfolio((state) => state.signClose)
  const holdco = book.holdcos[0]
  const [hurdle, setHurdle] = useState(String((hurdleRate(holdco) * 100).toFixed(1)))
  const [signer, setSigner] = useState(book.memos.find((memo) => memo.period === book.asOf)?.signedBy ?? "")
  const owned = holdco ? descendants(book.companies, holdco.id) : book.companies
  const ids = new Set(owned.map((company) => company.id))
  const consolidated = consolidatedStatement(book.statements, owned, book.asOf, "full")
  const eliminated = consolidated ? eliminatedPosition(consolidated, book.loans, ids) : null
  const loans = internalLoans(book.loans, ids)
  const rate = hurdleRate(holdco)
  const stress = stressClose({ ...book, companies: owned })
  const revenue = periodRevenue(book, undefined)
  const cost = periodCost(book)
  const topCustomer = largestShare(customerShares(book), revenue)
  const topVendor = largestShare(vendorShares(book), cost)
  const checks = book.checks.filter((check) => check.period === book.asOf)
  const wall = maturityWall(book.debt)
  const rows = book.companies.flatMap((company) => {
    const statement = statementAt(book.statements, company.id, book.asOf)
    if (!statement) return []
    const roc = returnOnCapital(statement)
    return [{ company, statement, roc, earnings: ownerEarnings(statement), capital: capitalEmployed(statement), net: derivePnl(statement).netIncome }]
  })

  return (
    <div>
      <PageHead
        kicker="Owner"
        title="Owner's math"
        job="See what the owner earns on the capital employed."
        lede="Owner earnings sit beside net income. Eliminated loans, the cash tie, the maturity wall, and two stresses sit on this page. The other desks stay as they are."
        actions={
          holdco ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const next = Number(hurdle) / 100
                if (Number.isFinite(next)) updateHoldco(holdco.id, { hurdleRate: next })
              }}
            >
              <label className="font-mono text-[10px] tracking-wider text-amber uppercase">Hurdle %</label>
              <Input value={hurdle} onChange={(event) => setHurdle(event.target.value)} className="h-8 w-20 font-mono text-xs" />
              <Button size="sm" type="submit">Save hurdle</Button>
            </form>
          ) : null
        }
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <Panel title="Look-through owner earnings">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-[10px] tracking-wider text-amber uppercase">Owned companies</div>
              <Num value={lookThroughEarnings(book.statements, owned, book.asOf)} />
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-amber uppercase">Hurdle</div>
              <span className="font-mono">{pct(rate)}</span>
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-amber uppercase">Loans eliminated</div>
              <Num value={eliminated?.balance ?? 0} />
            </div>
          </div>
        </Panel>
        <Panel title="Earnings and return" bodyClassName="p-0">
          <TermTable
            rows={rows}
            empty="No closed month."
            getKey={(row) => row.company.id}
            columns={[
              { key: "co", header: "Company", render: (row) => <Link className="hover:text-amber" href={`/companies/${row.company.id}`}>{row.company.name}</Link> },
              { key: "ni", header: "Net income", className: "text-right", render: (row) => <Num value={row.net} signed /> },
              { key: "oe", header: "Owner earnings", className: "text-right", render: (row) => <Num value={row.earnings} signed /> },
              { key: "cap", header: "Capital", className: "text-right", render: (row) => <Num value={row.capital} /> },
              { key: "roc", header: "Return", className: "text-right", render: (row) => <span className={row.roc !== null && row.roc < rate ? "text-down" : "text-up"}><Num value={row.roc} kind="pct" /></span> },
              { key: "moat", header: "Why customers stay", render: (row) => <span className="text-muted-foreground">{row.company.moatNote || "—"}</span> },
            ]}
          />
        </Panel>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Eliminated intercompany">
            {consolidated && eliminated ? (
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span>Uneliminated cash</span><Num value={consolidated.cash} /></div>
                <div className="flex justify-between"><span>Cash after elimination</span><Num value={eliminated.cash} /></div>
                <div className="flex justify-between"><span>Uneliminated debt</span><Num value={consolidated.shortDebt + consolidated.longDebt} /></div>
                <div className="flex justify-between"><span>Debt after elimination</span><Num value={eliminated.debt} /></div>
                {loans.map((loan) => (
                  <div key={loan.id} className="text-muted-foreground">
                    {book.companies.find((company) => company.id === loan.lenderCompanyId)?.name} to {book.companies.find((company) => company.id === loan.borrowerCompanyId)?.name}: <Num value={loan.balance} />
                  </div>
                ))}
              </div>
            ) : <Empty>No consolidated month.</Empty>}
          </Panel>
          <Panel title="Concentration">
            <div className="grid gap-2 text-xs">
              <div>Largest customer {topCustomer.name} is {pct(topCustomer.share)} of revenue.</div>
              <div>Largest vendor {topVendor.name} is {pct(topVendor.share)} of cost.</div>
            </div>
          </Panel>
          <Panel title="Maturity wall">
            {wall.length === 0 ? <Empty>No debt.</Empty> : <TermHBar data={wall} color={palette[4]} />}
          </Panel>
          <Panel title="Two stresses">
            {stress ? (
              <div className="grid gap-1 text-xs">
                <div className="flex justify-between"><span>Net income</span><Num value={stress.base.netIncome} signed /></div>
                <div className="flex justify-between"><span>Revenue down 20%</span><Num value={stress.revenueDown.netIncome} signed /></div>
                <div className="flex justify-between"><span>Rates up 200 bps</span><Num value={stress.ratesUp.netIncome} signed /></div>
                <div className="text-muted-foreground">Extra monthly interest <Num value={stress.extraInterest} />.</div>
              </div>
            ) : <Empty>No close to stress.</Empty>}
          </Panel>
        </div>
        <Panel title="Cash tie" bodyClassName="p-0">
          <TermTable
            rows={book.companies.flatMap((company) => {
              const tie = cashTie(book, company.id)
              return tie ? [{ company, tie }] : []
            })}
            empty="No cash to tie."
            getKey={(row) => row.company.id}
            columns={[
              { key: "co", header: "Company", render: (row) => row.company.name },
              { key: "bank", header: "Banks", className: "text-right", render: (row) => <Num value={row.tie.banks} /> },
              { key: "stmt", header: "Statement", className: "text-right", render: (row) => <Num value={row.tie.statement} /> },
              { key: "roll", header: "Rolled", className: "text-right", render: (row) => <Num value={row.tie.rolled} /> },
              { key: "gap", header: "Bank gap", className: "text-right", render: (row) => <span className={row.tie.bankGap ? "text-down" : ""}><Num value={row.tie.bankGap} signed /></span> },
            ]}
          />
        </Panel>
        <Panel title="Covenants" bodyClassName="p-0">
          <TermTable
            rows={book.debt}
            empty="No facilities."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "name", header: "Covenant", render: (row) => row.covenantName ?? "—" },
              { key: "floor", header: "Floor", className: "text-right", render: (row) => <Num value={row.covenantLimit} /> },
              { key: "act", header: "Actual", className: "text-right", render: (row) => <span className={covenantBreach(row) ? "text-down" : ""}><Num value={row.covenantActual} /></span> },
              { key: "mat", header: "Maturity", render: (row) => row.maturity },
            ]}
          />
        </Panel>
        <Panel title="Cost template" bodyClassName="p-0">
          <TermTable
            rows={book.costLines.filter((line) => line.period === book.asOf)}
            empty="No unit costs for this close."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => book.companies.find((company) => company.id === row.companyId)?.name ?? "—" },
              { key: "name", header: "Line", render: (row) => row.name },
              { key: "unit", header: "Unit cost", className: "text-right", render: (row) => <Num value={row.unitCost} /> },
              { key: "vol", header: "Volume", className: "text-right", render: (row) => <Num value={row.volume} kind="num" /> },
              { key: "ext", header: "Extended", className: "text-right", render: (row) => <Num value={unitCost(row)} /> },
            ]}
          />
        </Panel>
        <Panel title="Close checklist">
          {checks.length === 0 ? <Empty>No checklist for this month.</Empty> : checks.map((check) => (
            <label key={check.id} className="flex items-center justify-between gap-3 border-b border-border/70 py-1 text-xs">
              <span>
                <input type="checkbox" className="mr-2" checked={check.done} onChange={() => toggleCheck(check.id)} />
                {check.label}
              </span>
              <span className="text-muted-foreground">{check.owner}</span>
            </label>
          ))}
          <form
            className="mt-2 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (signer.trim()) signClose(book.asOf, signer.trim())
            }}
          >
            <Input value={signer} onChange={(event) => setSigner(event.target.value)} placeholder="Name on the sign-off" className="h-8 max-w-xs font-mono text-xs" />
            <Button size="sm" type="submit">Sign the close</Button>
          </form>
        </Panel>
      </div>
    </div>
  )
}
