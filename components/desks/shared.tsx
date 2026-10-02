"use client"

import type { ReactNode } from "react"
import { Num } from "@/components/terminal/kit"
import { pct } from "@/lib/format"
import type { Snapshot } from "@/lib/view"

export function Lattice({ snap }: { snap: Snapshot }) {
  const cells: { label: string; value: ReactNode; sub?: ReactNode }[] = [
    { label: "REV", value: <Num value={snap.revenue} />, sub: <Num value={snap.momRevenue} kind="pct" signed /> },
    { label: "GP", value: <Num value={snap.grossProfit} /> },
    { label: "GM%", value: <Num value={snap.grossMargin} kind="pct" /> },
    { label: "OI", value: <Num value={snap.operatingIncome} signed /> },
    { label: "NI", value: <Num value={snap.netIncome} signed />, sub: <Num value={snap.momNetIncome} kind="pct" signed /> },
    { label: "NM%", value: <Num value={snap.netMargin} kind="pct" /> },
    { label: "CASH", value: <Num value={snap.cash} /> },
    { label: "RUNWAY", value: <span className="font-mono">{snap.runway === null ? "n/m" : `${snap.runway.toFixed(1)} mo`}</span> },
    { label: "AR", value: <Num value={snap.ar} /> },
    { label: "AP", value: <Num value={snap.ap} /> },
    { label: "SESS", value: <Num value={snap.sessions} kind="num" /> },
    { label: "CONV", value: <span className="font-mono">{pct(snap.convRate)}</span> },
    { label: "FOLLOWERS", value: <Num value={snap.followers} kind="num" /> },
    { label: "BOOK", value: <Num value={snap.book} /> },
    { label: "HEADCOUNT", value: <span className="font-mono">{snap.headcount}</span> },
  ]
  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-card px-2.5 py-2">
          <div className="text-[10px] tracking-[0.14em] text-amber uppercase">{cell.label}</div>
          <div className="mt-1 text-sm">{cell.value}</div>
          {cell.sub ? <div className="text-[10px] text-muted-foreground">{cell.sub}</div> : <div className="h-3" />}
        </div>
      ))}
    </div>
  )
}
