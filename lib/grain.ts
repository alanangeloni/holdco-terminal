import { monthEnd } from "./metrics"
import type { Grain, Span } from "./types"

export function grainFor(span: Span): Grain {
  if (span === "1M") return "day"
  if (span === "Q") return "week"
  return "month"
}

export function grainLabel(span: Span) {
  const grain = grainFor(span)
  if (grain === "day") return "Daily"
  if (grain === "week") return "Weekly"
  return "Monthly"
}

export interface MonthlyRow {
  period: string
  values: Record<string, number>
}

export interface ChartRow {
  period: string
  values: Record<string, number>
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function daysOfMonth(period: string) {
  const last = Number(monthEnd(period).slice(8))
  const days: string[] = []
  for (let day = 1; day <= last; day++) days.push(`${period}-${String(day).padStart(2, "0")}`)
  return days
}

function weightsFor(dates: string[], salt: string) {
  const raw = dates.map((date) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const noise = 0.82 + (hashString(`${salt}:${date}`) % 360) / 1000
    return (weekend ? 0.42 : 1) * noise
  })
  const sum = raw.reduce((total, weight) => total + weight, 0) || 1
  return raw.map((weight) => weight / sum)
}

function weekStart(date: string) {
  const cursor = new Date(`${date}T00:00:00Z`)
  const weekday = cursor.getUTCDay()
  const delta = weekday === 0 ? -6 : 1 - weekday
  cursor.setUTCDate(cursor.getUTCDate() + delta)
  return cursor.toISOString().slice(0, 10)
}

function bucketWeeks(daily: ChartRow[], stock: Set<string>, rate: Set<string>) {
  const groups = new Map<string, ChartRow[]>()
  for (const row of daily) {
    const key = weekStart(row.period)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, rows]) => {
      const values: Record<string, number> = {}
      const last = rows[rows.length - 1]
      const keys = new Set(rows.flatMap((row) => Object.keys(row.values)))
      for (const key of keys) {
        if (stock.has(key) || rate.has(key)) values[key] = last.values[key] ?? 0
        else values[key] = rows.reduce((sum, row) => sum + (row.values[key] ?? 0), 0)
      }
      return { period: rows[0].period, values }
    })
}

export function projectRows(
  monthly: MonthlyRow[],
  span: Span,
  asOf: string,
  options?: { stock?: string[]; rate?: string[]; prior?: MonthlyRow | null },
): ChartRow[] {
  if (grainFor(span) === "month" || monthly.length === 0) {
    return monthly.map((row) => ({ period: row.period, values: { ...row.values } }))
  }

  const stock = new Set(options?.stock ?? [])
  const rate = new Set(options?.rate ?? [])
  const keys = new Set(monthly.flatMap((row) => Object.keys(row.values)))
  let previous = options?.prior ?? null
  const daily: ChartRow[] = []

  for (const row of monthly) {
    const days = daysOfMonth(row.period)
    const flowKeys = [...keys].filter((key) => !stock.has(key) && !rate.has(key))
    const weights: Record<string, number[]> = {}
    for (const key of flowKeys) weights[key] = weightsFor(days, `${row.period}:${key}`)
    days.forEach((date, index) => {
      const progress = (index + 1) / days.length
      const values: Record<string, number> = {}
      for (const key of keys) {
        const current = row.values[key] ?? 0
        if (rate.has(key)) values[key] = current
        else if (stock.has(key)) {
          const start = previous?.values[key]
          values[key] = start === undefined ? current : start + (current - start) * progress
        } else values[key] = current * (weights[key]?.[index] ?? 0)
      }
      daily.push({ period: date, values })
    })
    previous = row
  }

  const sliced = span === "1M" ? daily.filter((row) => row.period.startsWith(asOf)) : daily
  if (grainFor(span) === "day") return sliced
  return bucketWeeks(sliced, stock, rate)
}
