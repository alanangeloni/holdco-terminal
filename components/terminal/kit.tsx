"use client"

import type { ReactNode } from "react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { grainLabel } from "@/lib/grain"
import type { Span } from "@/lib/types"
import { compactMoney, money, pct, signedPct } from "@/lib/format"

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("min-w-0 border border-border bg-card", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-amber uppercase">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={cn("p-2", bodyClassName)}>{children}</div>
    </section>
  )
}

export function PageHead({
  kicker,
  title,
  job,
  lede,
  actions,
}: {
  kicker: string
  title: string
  job?: string
  lede?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.18em] text-amber uppercase">{kicker}</div>
        <h1 className="truncate text-lg font-medium tracking-tight">{title}</h1>
        {job ? <p className="max-w-3xl text-xs">{job}</p> : null}
        {lede ? <p className="max-w-3xl text-xs text-muted-foreground">{lede}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-2 py-6 text-sm text-muted-foreground">{children}</p>
}

export function Num({
  value,
  kind = "money",
  signed = false,
  currency = "USD",
}: {
  value: number | null | undefined
  kind?: "money" | "compact" | "pct" | "num"
  signed?: boolean
  currency?: string
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="font-mono text-muted-foreground">—</span>
  }
  const text = kind === "pct" ? (signed ? signedPct(value) : pct(value)) : kind === "compact" ? compactMoney(value, currency) : kind === "num" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value) : money(value, currency)
  const tone = signed ? (value > 0 ? "text-up" : value < 0 ? "text-down" : "") : value < 0 && kind !== "pct" ? "text-down" : ""
  return <span className={cn("font-mono tabular-nums", tone)}>{text}</span>
}

export function SpanToggle({ value, onChange }: { value: Span; onChange: (span: Span) => void }) {
  const spans: Span[] = ["1M", "Q", "3M", "6M", "12M", "ALL"]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="span-toggle flex flex-wrap border border-border">
        {spans.map((span) => (
          <button
            key={span}
            type="button"
            aria-pressed={value === span}
            onClick={() => onChange(span)}
            className={cn(
              "px-2 py-1 font-mono text-[10px] tracking-wider",
              value === span ? "bg-amber text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {span}
          </button>
        ))}
      </div>
      <span className="font-mono text-[10px] tracking-wider text-muted-foreground" title="Days and weeks are split from the closed month and add back to it.">
        {grainLabel(value)}
      </span>
    </div>
  )
}

export function TermTable<T>({
  rows,
  columns,
  empty,
  getKey,
}: {
  rows: T[]
  columns: { key: string; header: string; className?: string; render: (row: T) => ReactNode }[]
  empty: string
  getKey: (row: T) => string
}) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] tracking-wider text-amber uppercase">
            {columns.map((column) => (
              <th key={column.key} className={cn("border-b border-border px-2 py-1.5 font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)} className="border-b border-border/70 hover:bg-muted">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-2 py-1.5 align-top", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MiniActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex gap-1">
      {onEdit ? (
        <Button type="button" size="xs" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
      {onDelete ? (
        <Button type="button" size="xs" variant="ghost" className="text-down" onClick={onDelete}>
          Del
        </Button>
      ) : null}
    </div>
  )
}
