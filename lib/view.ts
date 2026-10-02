import { grainFor, projectRows, type MonthlyRow } from "./grain"
import type { Book, Company, Span } from "./types"
import { PLATFORMS } from "./types"
import {
  aging,
  companyPeriods,
  consolidatedRunway,
  consolidatedStatement,
  derivePnl,
  descendants,
  followerTotal,
  mom,
  runway,
  statementAt,
  shiftPeriod,
  windowPeriods,
} from "./metrics"

export interface Point {
  period: string
  revenue: number
  netIncome: number
  grossMargin: number
  cash: number
  costs: number
  budgetRevenue: number
  budgetNetIncome: number
  sessions: number
  users: number
  conversions: number
  cogs: number
  payroll: number
  marketing: number
  ga: number
  otherOpex: number
  channelOrganic: number
  channelPaid: number
  channelDirect: number
  channelReferral: number
  channelSocial: number
  followers: number
}

export interface Snapshot {
  revenue: number
  grossProfit: number
  grossMargin: number
  operatingIncome: number
  netIncome: number
  netMargin: number
  opex: number
  totalCosts: number
  cash: number
  runway: number | null
  ar: number
  ap: number
  sessions: number
  conversions: number
  convRate: number
  followers: number
  book: number
  headcount: number
  momRevenue: number | null
  momNetIncome: number | null
}

function pointFrom(statement: NonNullable<ReturnType<typeof consolidatedStatement>>, period: string): Point {
  const pnl = derivePnl(statement)
  return {
    period,
    revenue: pnl.revenue,
    netIncome: pnl.netIncome,
    grossMargin: pnl.grossMargin,
    cash: statement.cash,
    costs: pnl.totalCosts,
    budgetRevenue: statement.budgetRevenue,
    budgetNetIncome: derivePnl({
      revenue: statement.budgetRevenue,
      cogs: statement.budgetCogs,
      payroll: statement.budgetPayroll,
      marketing: statement.budgetMarketing,
      ga: statement.budgetGa,
      otherOpex: statement.budgetOtherOpex,
      interest: statement.budgetInterest,
      tax: statement.budgetTax,
    }).netIncome,
    sessions: statement.sessions,
    users: statement.users,
    conversions: statement.conversions,
    cogs: statement.cogs,
    payroll: statement.payroll,
    marketing: statement.marketing,
    ga: statement.ga,
    otherOpex: statement.otherOpex,
    channelOrganic: statement.channelOrganic,
    channelPaid: statement.channelPaid,
    channelDirect: statement.channelDirect,
    channelReferral: statement.channelReferral,
    channelSocial: statement.channelSocial,
    followers: followerTotal(statement),
  }
}

const STOCK_KEYS = ["cash", "followers"]
const RATE_KEYS = ["grossMargin"]

function valuesOf(point: Point): Record<string, number> {
  const values: Record<string, number> = {}
  for (const [key, value] of Object.entries(point)) {
    if (key !== "period") values[key] = value
  }
  return values
}

function pointFromValues(period: string, values: Record<string, number>, template: Point): Point {
  return { ...template, ...values, period }
}

export function seriesFor(
  book: Book,
  companies: Company[],
  span: Span,
  mode: "full" | "weighted" = "full",
) {
  const available = [...new Set(book.statements.map((s) => s.period))]
  const periods = windowPeriods(available, book.asOf, span)
  const points: Point[] = []
  for (const period of periods) {
    const statement = consolidatedStatement(book.statements, companies, period, mode)
    if (statement) points.push(pointFrom(statement, period))
  }
  if (grainFor(span) === "month" || points.length === 0) return points
  const priorPeriod = shiftPeriod(points[0].period, -1)
  const priorStatement = consolidatedStatement(book.statements, companies, priorPeriod, mode)
  const prior = priorStatement ? pointFrom(priorStatement, priorPeriod) : null
  const monthly: MonthlyRow[] = points.map((point) => ({ period: point.period, values: valuesOf(point) }))
  const projected = projectRows(monthly, span, book.asOf, {
    stock: STOCK_KEYS,
    rate: RATE_KEYS,
    prior: prior ? { period: prior.period, values: valuesOf(prior) } : null,
  })
  return projected.map((row) => pointFromValues(row.period, row.values, points[0]))
}

export function companySeries(book: Book, companyId: string, span: Span) {
  const company = book.companies.find((item) => item.id === companyId)
  if (!company) return []
  return seriesFor(book, [company], span, "full")
}

export function headcount(book: Book, companyId?: string) {
  const ids = new Set<string>()
  for (const allocation of book.allocations) {
    if (allocation.percent <= 0) continue
    if (companyId && allocation.companyId !== companyId) continue
    const person = book.people.find((item) => item.id === allocation.personId)
    if (person?.status === "active") ids.add(person.id)
  }
  if (companyId && ids.size === 0) {
    return book.people.filter((person) => person.homeCompanyId === companyId && person.status === "active").length
  }
  return ids.size
}

export function bookValue(book: Book, companyId?: string) {
  return book.assets
    .filter((asset) => !companyId || asset.companyId === companyId)
    .reduce((sum, asset) => sum + asset.bookValue, 0)
}

export function snapshotFor(book: Book, companies: Company[], mode: "full" | "weighted" = "full"): Snapshot {
  const current = consolidatedStatement(book.statements, companies, book.asOf, mode)
  const prior = consolidatedStatement(book.statements, companies, shiftPeriod(book.asOf, -1), mode)
  const pnl = current ? derivePnl(current) : null
  const priorPnl = prior ? derivePnl(prior) : null
  const companyIds = new Set(companies.map((company) => company.id))
  const single = companies.length === 1 ? companies[0].id : undefined
  return {
    revenue: pnl?.revenue ?? 0,
    grossProfit: pnl?.grossProfit ?? 0,
    grossMargin: pnl?.grossMargin ?? 0,
    operatingIncome: pnl?.operatingIncome ?? 0,
    netIncome: pnl?.netIncome ?? 0,
    netMargin: pnl?.netMargin ?? 0,
    opex: pnl?.opex ?? 0,
    totalCosts: pnl?.totalCosts ?? 0,
    cash: current?.cash ?? 0,
    runway: companies.length === 1
      ? runway(book.statements, companies[0].id, book.asOf)
      : consolidatedRunway(book.statements, companies, book.asOf, mode),
    ar: current?.ar ?? 0,
    ap: current?.ap ?? 0,
    sessions: current?.sessions ?? 0,
    conversions: current?.conversions ?? 0,
    convRate: current?.sessions ? current.conversions / current.sessions : 0,
    followers: current ? followerTotal(current) : 0,
    book: book.assets.filter((asset) => companyIds.has(asset.companyId)).reduce((sum, asset) => sum + asset.bookValue, 0),
    headcount: (() => {
    if (single) return headcount(book, single)
    const ids = new Set<string>()
    for (const allocation of book.allocations) {
      if (allocation.percent <= 0 || !companyIds.has(allocation.companyId)) continue
      const person = book.people.find((item) => item.id === allocation.personId)
      if (person?.status === "active") ids.add(person.id)
    }
    return ids.size
  })(),
    momRevenue: pnl && priorPnl ? mom(pnl.revenue, priorPnl.revenue) : null,
    momNetIncome: pnl && priorPnl ? mom(pnl.netIncome, priorPnl.netIncome) : null,
  }
}

export function portfolioCompanies(book: Book) {
  return book.companies
}

export function holdcoCompanies(book: Book, holdcoId: string) {
  return descendants(book.companies, holdcoId)
}

export function pastDueTotal(book: Book, companyId?: string) {
  return aging(
    book.invoices.filter((invoice) => !companyId || invoice.companyId === companyId),
    book.asOf,
  ).pastDue
}

export function sparkline(book: Book, companyId: string) {
  return companyPeriods(book.statements, companyId)
    .filter((period) => period <= book.asOf)
    .slice(-12)
    .map((period) => statementAt(book.statements, companyId, period)?.revenue ?? 0)
}

export function platformFollowers(book: Book, companyIds: string[], platform: (typeof PLATFORMS)[number], period: string) {
  return companyIds.reduce((sum, id) => {
    const statement = statementAt(book.statements, id, period)
    return sum + (statement?.social[platform].followers ?? 0)
  }, 0)
}
