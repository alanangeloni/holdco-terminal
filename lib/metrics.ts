import type { Company, MonthlyStatement, Platform, SocialPoint, Span } from "./types"
import { PLATFORMS } from "./types"

export interface Pnl {
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  payroll: number
  marketing: number
  ga: number
  otherOpex: number
  opex: number
  operatingIncome: number
  interest: number
  tax: number
  netIncome: number
  netMargin: number
  totalCosts: number
}

const ADDITIVE = [
  "revenue",
  "cogs",
  "payroll",
  "marketing",
  "ga",
  "otherOpex",
  "interest",
  "tax",
  "cash",
  "ar",
  "inventory",
  "otherAssets",
  "fixedAssets",
  "intangibles",
  "ap",
  "accrued",
  "shortDebt",
  "longDebt",
  "equity",
  "cfo",
  "cfi",
  "cff",
  "budgetRevenue",
  "budgetCogs",
  "budgetPayroll",
  "budgetMarketing",
  "budgetGa",
  "budgetOtherOpex",
  "budgetInterest",
  "budgetTax",
  "sessions",
  "users",
  "pageviews",
  "conversions",
  "channelOrganic",
  "channelPaid",
  "channelDirect",
  "channelReferral",
  "channelSocial",
] as const satisfies readonly (keyof MonthlyStatement)[]

export function emptySocial(): SocialPoint {
  return { followers: 0, impressions: 0, engagement: 0, posts: 0 }
}

export function emptySocialBook(): Record<Platform, SocialPoint> {
  return {
    x: emptySocial(),
    linkedin: emptySocial(),
    instagram: emptySocial(),
    youtube: emptySocial(),
  }
}

export function cloneStatement(s: MonthlyStatement): MonthlyStatement {
  const social = emptySocialBook()
  for (const platform of PLATFORMS) social[platform] = { ...s.social[platform] }
  return { ...s, social }
}

export function derivePnl(s: Pick<
  MonthlyStatement,
  "revenue" | "cogs" | "payroll" | "marketing" | "ga" | "otherOpex" | "interest" | "tax"
>): Pnl {
  const grossProfit = s.revenue - s.cogs
  const opex = s.payroll + s.marketing + s.ga + s.otherOpex
  const operatingIncome = grossProfit - opex
  const netIncome = operatingIncome - s.interest - s.tax
  return {
    revenue: s.revenue,
    cogs: s.cogs,
    grossProfit,
    grossMargin: s.revenue ? grossProfit / s.revenue : 0,
    payroll: s.payroll,
    marketing: s.marketing,
    ga: s.ga,
    otherOpex: s.otherOpex,
    opex,
    operatingIncome,
    interest: s.interest,
    tax: s.tax,
    netIncome,
    netMargin: s.revenue ? netIncome / s.revenue : 0,
    totalCosts: s.cogs + opex + s.interest + s.tax,
  }
}

export function budgetPnl(s: MonthlyStatement): Pnl {
  return derivePnl({
    revenue: s.budgetRevenue,
    cogs: s.budgetCogs,
    payroll: s.budgetPayroll,
    marketing: s.budgetMarketing,
    ga: s.budgetGa,
    otherOpex: s.budgetOtherOpex,
    interest: s.budgetInterest,
    tax: s.budgetTax,
  })
}

export function shiftPeriod(period: string, delta: number) {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function monthEnd(period: string) {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(Date.UTC(y, m, 0))
  return d.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function comparePeriod(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function scaleStatement(s: MonthlyStatement, weight: number): MonthlyStatement {
  const next = cloneStatement(s)
  for (const key of ADDITIVE) {
    const value = s[key]
    if (typeof value === "number") next[key] = value * weight
  }
  for (const platform of PLATFORMS) {
    next.social[platform].followers = s.social[platform].followers * weight
    next.social[platform].impressions = s.social[platform].impressions * weight
    next.social[platform].posts = s.social[platform].posts * weight
    next.social[platform].engagement = s.social[platform].engagement
  }
  return next
}

export function sumStatements(list: MonthlyStatement[]): MonthlyStatement | null {
  if (!list.length) return null
  const acc = cloneStatement(list[0])
  for (const key of ADDITIVE) {
    const value = acc[key]
    if (typeof value === "number") (acc[key] as number) = 0
  }
  for (const platform of PLATFORMS) {
    acc.social[platform] = emptySocial()
  }
  let bounceWeight = 0
  let sessions = 0
  const engWeight: Record<Platform, number> = { x: 0, linkedin: 0, instagram: 0, youtube: 0 }
  const impressions: Record<Platform, number> = { x: 0, linkedin: 0, instagram: 0, youtube: 0 }

  for (const raw of list) {
    for (const key of ADDITIVE) {
      const value = raw[key]
      if (typeof value === "number") (acc[key] as number) += value
    }
    bounceWeight += raw.bounceRate * raw.sessions
    sessions += raw.sessions
    for (const platform of PLATFORMS) {
      const point = raw.social[platform]
      acc.social[platform].followers += point.followers
      acc.social[platform].impressions += point.impressions
      acc.social[platform].posts += point.posts
      engWeight[platform] += point.engagement * point.impressions
      impressions[platform] += point.impressions
    }
  }
  acc.bounceRate = sessions ? bounceWeight / sessions : 0
  for (const platform of PLATFORMS) {
    acc.social[platform].engagement = impressions[platform]
      ? engWeight[platform] / impressions[platform]
      : 0
  }
  acc.id = `cons_${acc.period}`
  acc.companyId = "consolidated"
  return acc
}

export function statementAt(statements: MonthlyStatement[], companyId: string, period: string) {
  return statements.find((s) => s.companyId === companyId && s.period === period)
}

export function companyPeriods(statements: MonthlyStatement[], companyId: string) {
  return statements
    .filter((s) => s.companyId === companyId)
    .map((s) => s.period)
    .sort()
}

export function windowPeriods(available: string[], asOf: string, span: Span) {
  const sorted = [...new Set(available)].filter((p) => p <= asOf).sort()
  if (span === "ALL") return sorted
  const n = span === "3M" ? 3 : span === "6M" ? 6 : 12
  return sorted.slice(-n)
}

export function mom(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export function effectiveOwnership(company: Company, companies: Company[]) {
  let weight = company.ownershipPct / 100
  let parentId = company.parentCompanyId
  const seen = new Set<string>([company.id])
  while (parentId) {
    if (seen.has(parentId)) break
    seen.add(parentId)
    const parent = companies.find((c) => c.id === parentId)
    if (!parent) break
    weight *= parent.ownershipPct / 100
    parentId = parent.parentCompanyId
  }
  return weight
}

export function descendants(companies: Company[], holdcoId: string) {
  const ids = new Set(companies.filter((c) => c.holdcoId === holdcoId).map((c) => c.id))
  let grew = true
  while (grew) {
    grew = false
    for (const company of companies) {
      if (company.parentCompanyId && ids.has(company.parentCompanyId) && !ids.has(company.id)) {
        ids.add(company.id)
        grew = true
      }
    }
  }
  return companies.filter((c) => ids.has(c.id))
}

export function consolidatedStatement(
  statements: MonthlyStatement[],
  companies: Company[],
  period: string,
  mode: "full" | "weighted",
) {
  const rows: MonthlyStatement[] = []
  for (const company of companies) {
    const statement = statementAt(statements, company.id, period)
    if (!statement) continue
    const weight = mode === "full" ? 1 : effectiveOwnership(company, companies)
    rows.push(scaleStatement(statement, weight))
  }
  return sumStatements(rows)
}

export function runway(statements: MonthlyStatement[], companyId: string, asOf: string) {
  const latest = statementAt(statements, companyId, asOf)
  if (!latest) return null
  const months = [0, 1, 2].map((delta) => shiftPeriod(asOf, -delta))
  const incomes = months
    .map((period) => statementAt(statements, companyId, period))
    .filter((s): s is MonthlyStatement => Boolean(s))
    .map((s) => -derivePnl(s).netIncome)
  if (!incomes.length) return null
  const burn = incomes.reduce((sum, value) => sum + value, 0) / incomes.length
  if (burn <= 0) return null
  return latest.cash / burn
}

export function consolidatedRunway(
  statements: MonthlyStatement[],
  companies: Company[],
  asOf: string,
  mode: "full" | "weighted",
) {
  const latest = consolidatedStatement(statements, companies, asOf, mode)
  if (!latest) return null
  const burns: number[] = []
  for (const delta of [0, 1, 2]) {
    const statement = consolidatedStatement(statements, companies, shiftPeriod(asOf, -delta), mode)
    if (!statement) continue
    burns.push(-derivePnl(statement).netIncome)
  }
  if (!burns.length) return null
  const burn = burns.reduce((sum, value) => sum + value, 0) / burns.length
  if (burn <= 0) return null
  return latest.cash / burn
}

export interface AgingDoc {
  due: string
  amount: number
  status: "draft" | "open" | "paid" | "overdue"
}

export interface Aging {
  current: number
  d30: number
  d60: number
  d61: number
  total: number
  pastDue: number
}

export function aging(docs: AgingDoc[], asOf: string): Aging {
  const end = monthEnd(asOf)
  const buckets = { current: 0, d30: 0, d60: 0, d61: 0 }
  for (const doc of docs) {
    if (doc.status === "paid" || doc.status === "draft") continue
    const days = daysBetween(doc.due, end)
    if (days <= 0) buckets.current += doc.amount
    else if (days <= 30) buckets.d30 += doc.amount
    else if (days <= 60) buckets.d60 += doc.amount
    else buckets.d61 += doc.amount
  }
  const pastDue = buckets.d30 + buckets.d60 + buckets.d61
  return { ...buckets, pastDue, total: buckets.current + pastDue }
}

export function balanceTotals(s: MonthlyStatement) {
  const assets = s.cash + s.ar + s.inventory + s.otherAssets + s.fixedAssets + s.intangibles
  const liabilities = s.ap + s.accrued + s.shortDebt + s.longDebt
  return { assets, liabilities, equity: s.equity, gap: assets - liabilities - s.equity }
}

export function followerTotal(s: MonthlyStatement) {
  return PLATFORMS.reduce((sum, platform) => sum + s.social[platform].followers, 0)
}

export function plugEquity(s: MonthlyStatement): MonthlyStatement {
  const assets = s.cash + s.ar + s.inventory + s.otherAssets + s.fixedAssets + s.intangibles
  const liabilities = s.ap + s.accrued + s.shortDebt + s.longDebt
  return { ...s, equity: assets - liabilities }
}

export interface WaterfallRow {
  name: string
  base: number
  rise: number
  fall: number
}

export function waterfall(pnl: Pnl): WaterfallRow[] {
  const steps: { name: string; end: number; total: boolean }[] = [
    { name: "Revenue", end: pnl.revenue, total: true },
    { name: "COGS", end: pnl.revenue - pnl.cogs, total: false },
    { name: "Gross profit", end: pnl.grossProfit, total: true },
    { name: "Opex", end: pnl.grossProfit - pnl.opex, total: false },
    { name: "Op. income", end: pnl.operatingIncome, total: true },
    { name: "Interest", end: pnl.operatingIncome - pnl.interest, total: false },
    { name: "Tax", end: pnl.operatingIncome - pnl.interest - pnl.tax, total: false },
    { name: "Net income", end: pnl.netIncome, total: true },
  ]
  let cursor = 0
  return steps.map((step) => {
    const start = step.total ? 0 : cursor
    const end = step.total ? step.end : cursor + (step.end - cursor)
    cursor = step.total ? step.end : end
    const up = end >= start
    return {
      name: step.name,
      base: Math.min(start, end),
      rise: up ? end - start : 0,
      fall: up ? 0 : start - end,
    }
  })
}
