export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)
}

export function compactMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0)
}

export function pct(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—"
  return `${(n * 100).toFixed(digits)}%`
}

export function signedPct(n: number | null, digits = 1) {
  if (n === null || !Number.isFinite(n)) return "—"
  const body = pct(n, digits)
  return n > 0 ? `+${body}` : body
}

export function num(n: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
    Number.isFinite(n) ? n : 0,
  )
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export function monthLabel(period: string) {
  const [y, m] = period.split("-").map(Number)
  if (!y || !m) return period
  return `${MONTHS[m - 1]} ${y}`
}

export function monthTick(period: string) {
  const [year, month, day] = period.split("-")
  const name = MONTHS[Number(month) - 1]
  if (!year || !name) return period
  if (day) {
    const date = Number(day)
    if (!date) return period
    return `${name} ${date}`
  }
  return `${name} ${year.slice(2)}`
}

export function todayISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
