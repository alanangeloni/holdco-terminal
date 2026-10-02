import { daysOfMonth } from "./grain"
import {
  consolidatedStatement,
  derivePnl,
  effectiveOwnership,
  followerTotal,
  mom,
  shiftPeriod,
  statementAt,
} from "./metrics"
import type {
  Book,
  Bottleneck,
  CloseCheck,
  CloseMemo,
  Company,
  CostLine,
  DebtFacility,
  HoldingCompany,
  IntercompanyLoan,
  MonthlyStatement,
} from "./types"

export function ownerEarnings(statement: MonthlyStatement) {
  return derivePnl(statement).netIncome + (statement.depreciation ?? 0) - (statement.maintenanceCapex ?? 0)
}

export function capitalEmployed(statement: MonthlyStatement) {
  return statement.equity + statement.shortDebt + statement.longDebt
}

export function returnOnCapital(statement: MonthlyStatement) {
  const capital = capitalEmployed(statement)
  if (!capital) return null
  return (ownerEarnings(statement) * 12) / capital
}

export function hurdleRate(holdco: HoldingCompany | undefined) {
  return holdco?.hurdleRate ?? 0.15
}

export function lookThroughEarnings(statements: MonthlyStatement[], companies: Company[], asOf: string) {
  let total = 0
  for (const company of companies) {
    const statement = statementAt(statements, company.id, asOf)
    if (!statement) continue
    total += ownerEarnings(statement) * effectiveOwnership(company, companies)
  }
  return total
}

export function internalLoans(loans: IntercompanyLoan[], companyIds: Set<string>) {
  return loans.filter((loan) => companyIds.has(loan.lenderCompanyId) && companyIds.has(loan.borrowerCompanyId))
}

export function eliminatedPosition(statement: MonthlyStatement, loans: IntercompanyLoan[], companyIds: Set<string>) {
  const balance = internalLoans(loans, companyIds).reduce((sum, loan) => sum + loan.balance, 0)
  return {
    balance,
    cash: statement.cash - balance,
    debt: statement.shortDebt + statement.longDebt - balance,
  }
}

export interface CashTie {
  companyId: string
  banks: number
  statement: number
  rolled: number | null
  bankGap: number
  rollGap: number | null
}

export function cashTie(book: Book, companyId: string, asOf = book.asOf): CashTie | null {
  const statement = statementAt(book.statements, companyId, asOf)
  if (!statement) return null
  const prior = statementAt(book.statements, companyId, shiftPeriod(asOf, -1))
  const banks = book.bankAccounts
    .filter((account) => account.companyId === companyId)
    .reduce((sum, account) => sum + account.balance, 0)
  const rolled = prior ? prior.cash + statement.cfo + statement.cfi + statement.cff : null
  return {
    companyId,
    banks,
    statement: statement.cash,
    rolled,
    bankGap: banks - statement.cash,
    rollGap: rolled === null ? null : rolled - statement.cash,
  }
}

export function maturityWall(debt: DebtFacility[]) {
  const buckets = new Map<string, number>()
  for (const facility of debt) {
    const year = facility.maturity.slice(0, 4) || "Open"
    buckets.set(year, (buckets.get(year) ?? 0) + facility.outstanding)
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ({ name, value }))
}

export function covenantBreach(facility: DebtFacility) {
  if (facility.covenantLimit === undefined || facility.covenantActual === undefined) return false
  return facility.covenantActual < facility.covenantLimit
}

export function stressClose(book: Book, companyIds?: string[]) {
  const companies = companyIds
    ? book.companies.filter((company) => companyIds.includes(company.id))
    : book.companies
  const statement = consolidatedStatement(book.statements, companies, book.asOf, "full")
  if (!statement) return null
  const base = derivePnl(statement)
  const revenueDown = derivePnl({ ...statement, revenue: statement.revenue * 0.8 })
  const ids = new Set(companies.map((company) => company.id))
  const debt = book.debt.filter((facility) => ids.has(facility.companyId)).reduce((sum, facility) => sum + facility.outstanding, 0)
  const extraInterest = (debt * 0.02) / 12
  const ratesUp = derivePnl({ ...statement, interest: statement.interest + extraInterest })
  return { base, revenueDown, ratesUp, extraInterest }
}

export function largestShare(
  rows: { name: string; amount: number }[],
  total: number,
) {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount)
  const top = sorted[0]
  if (!top || !total) return { name: top?.name ?? "—", amount: top?.amount ?? 0, share: 0 }
  return { name: top.name, amount: top.amount, share: top.amount / total }
}

export function customerShares(book: Book, companyId?: string) {
  const invoices = book.invoices.filter((invoice) => (!companyId || invoice.companyId === companyId) && invoice.status !== "draft")
  const byName = new Map<string, number>()
  for (const invoice of invoices) {
    const name = book.customers.find((customer) => customer.id === invoice.customerId)?.name ?? "Customer"
    byName.set(name, (byName.get(name) ?? 0) + invoice.amount)
  }
  return [...byName.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
}

export function vendorShares(book: Book, companyId?: string) {
  const bills = book.bills.filter((bill) => (!companyId || bill.companyId === companyId) && bill.status !== "draft")
  const byName = new Map<string, number>()
  for (const bill of bills) {
    const name = book.vendors.find((vendor) => vendor.id === bill.vendorId)?.name ?? bill.category
    byName.set(name, (byName.get(name) ?? 0) + bill.amount)
  }
  return [...byName.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
}

export function periodRevenue(book: Book, companyId?: string, asOf = book.asOf) {
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  return companies.reduce((sum, company) => sum + (statementAt(book.statements, company.id, asOf)?.revenue ?? 0), 0)
}

export function periodCost(book: Book, companyId?: string, asOf = book.asOf) {
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  return companies.reduce((sum, company) => {
    const statement = statementAt(book.statements, company.id, asOf)
    if (!statement) return sum
    const pnl = derivePnl(statement)
    return sum + pnl.cogs + pnl.opex
  }, 0)
}

export function retainedRevenue(book: Book, companyId?: string, asOf = book.asOf) {
  const cutoff = shiftPeriod(asOf, -12)
  const customers = book.customers.filter((customer) => {
    if (companyId && customer.companyId !== companyId) return false
    return customer.since.slice(0, 7) <= cutoff
  })
  const ids = new Set(customers.map((customer) => customer.id))
  const invoiced = book.invoices
    .filter((invoice) => ids.has(invoice.customerId) && invoice.status !== "draft")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
  const revenue = periodRevenue(book, companyId, asOf)
  return {
    customers: customers.length,
    invoiced,
    revenue,
    share: revenue ? invoiced / revenue : 0,
  }
}

export function decisionStrip(book: Book) {
  let best: { company: Company; delta: number; change: number } | null = null
  const priorPeriod = shiftPeriod(book.asOf, -1)
  for (const company of book.companies) {
    const current = statementAt(book.statements, company.id, book.asOf)
    const prior = statementAt(book.statements, company.id, priorPeriod)
    if (!current || !prior || !prior.revenue) continue
    const delta = current.revenue - prior.revenue
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { company, delta, change: delta / Math.abs(prior.revenue) }
    }
  }
  if (!best) return null
  const direction = best.delta >= 0 ? "rose" : "fell"
  return {
    delta: best.delta,
    sentence: `${best.company.name} revenue ${direction} ${(Math.abs(best.change) * 100).toFixed(1)}% versus ${priorPeriod}.`,
    action: `Open ${best.company.name}`,
    href: `/companies/${best.company.id}`,
  }
}

export function fridayOf(today: string) {
  const cursor = new Date(`${today}T00:00:00Z`)
  const weekday = cursor.getUTCDay()
  const untilFriday = weekday === 6 ? 6 : weekday === 0 ? 5 : 5 - weekday
  cursor.setUTCDate(cursor.getUTCDate() + untilFriday)
  return cursor.toISOString().slice(0, 10)
}

export function myWeek(book: Book, today: string) {
  const end = fridayOf(today)
  return book.work
    .filter((item) => item.status !== "done")
    .filter((item) => item.status === "blocked" || Boolean(item.dependsOnId) || (item.due !== null && item.due <= end))
    .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || (a.due ?? "").localeCompare(b.due ?? ""))
}

export function doublingCase(statement: MonthlyStatement, bottleneck: Bottleneck = "cash") {
  const pnl = derivePnl(statement)
  const extraContribution = pnl.revenue - pnl.cogs
  const cashNeed = statement.ar
  const cashAfter = statement.cash + extraContribution - cashNeed
  const notes: Record<Bottleneck, string> = {
    cash: cashAfter < 0 ? "Doubling spends the cash on the extra receivables." : "Cash still covers a doubled book of receivables.",
    person: "Doubling waits on the open roles before volume can move.",
    vendor: "Doubling doubles the largest vendor bill before the price moves.",
    machine: "Doubling runs into the fixed assets before it runs into the people.",
  }
  return { extraContribution, cashNeed, cashAfter, note: notes[bottleneck] }
}

export function overheadRatio(book: Book, companies: Company[] = book.companies) {
  const counts = new Map<string, number>()
  const ids = new Set(companies.map((company) => company.id))
  for (const allocation of book.allocations) {
    if (allocation.percent <= 0 || !ids.has(allocation.companyId)) continue
    counts.set(allocation.personId, (counts.get(allocation.personId) ?? 0) + 1)
  }
  let annual = 0
  for (const [personId, count] of counts) {
    if (count < 2) continue
    const person = book.people.find((item) => item.id === personId)
    if (person?.status === "active") annual += person.annualCost
  }
  const monthly = annual / 12
  const earnings = companies.reduce((sum, company) => {
    const statement = statementAt(book.statements, company.id, book.asOf)
    return sum + (statement ? ownerEarnings(statement) : 0)
  }, 0)
  return { monthly, earnings, ratio: earnings ? monthly / earnings : null }
}

export function dailyCashSeries(book: Book, companyIds: string[], asOf = book.asOf) {
  const days = daysOfMonth(asOf)
  const priorPeriod = shiftPeriod(asOf, -1)
  let start = 0
  let end = 0
  for (const companyId of companyIds) {
    const current = statementAt(book.statements, companyId, asOf)?.cash ?? 0
    start += statementAt(book.statements, companyId, priorPeriod)?.cash ?? current
    end += current
  }
  return days.map((date, index) => {
    const progress = (index + 1) / days.length
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const dip = index === days.length - 1 ? 1 : weekday === 0 || weekday === 6 ? 0.99 : 1
    return { period: date.slice(8), cash: Math.round((start + (end - start) * progress) * dip) }
  })
}

export function sharedNames(rows: { name: string; companyId: string }[]) {
  const groups = new Map<string, { name: string; companies: Set<string> }>()
  for (const row of rows) {
    const key = row.name.trim().toLowerCase()
    const group = groups.get(key) ?? { name: row.name, companies: new Set<string>() }
    group.companies.add(row.companyId)
    groups.set(key, group)
  }
  return [...groups.values()]
    .filter((group) => group.companies.size > 1)
    .map((group) => ({ name: group.name, count: group.companies.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function sharedPeople(book: Book) {
  const counts = new Map<string, number>()
  for (const allocation of book.allocations) {
    if (allocation.percent <= 0) continue
    counts.set(allocation.personId, (counts.get(allocation.personId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([personId, count]) => ({
      name: book.people.find((person) => person.id === personId)?.name ?? "Person",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function companyRanks(book: Book) {
  const priorPeriod = shiftPeriod(book.asOf, -1)
  return book.companies.map((company) => {
    const current = statementAt(book.statements, company.id, book.asOf)
    const prior = statementAt(book.statements, company.id, priorPeriod)
    const pnl = current ? derivePnl(current) : null
    const priorPnl = prior ? derivePnl(prior) : null
    return {
      id: company.id,
      name: company.name,
      margin: pnl?.grossMargin ?? null,
      growth: pnl && priorPnl ? mom(pnl.revenue, priorPnl.revenue) : null,
      conversion: pnl && current && pnl.netIncome ? current.cfo / pnl.netIncome : null,
    }
  })
}

export function audienceYield(book: Book, companyIds: string[], asOf = book.asOf) {
  const companies = book.companies.filter((company) => companyIds.includes(company.id))
  const statement = consolidatedStatement(book.statements, companies, asOf, "full")
  if (!statement) return { sessions: 0, revenue: 0, perThousand: null as number | null, followers: 0 }
  return {
    sessions: statement.sessions,
    revenue: statement.revenue,
    perThousand: statement.sessions ? (statement.revenue / statement.sessions) * 1000 : null,
    followers: followerTotal(statement),
  }
}

export function weightedPipeline(book: Book, companyId?: string) {
  return book.deals
    .filter((deal) => !companyId || deal.companyId === companyId)
    .filter((deal) => deal.stage !== "lost")
    .reduce((sum, deal) => sum + deal.amount * (deal.probability ?? stageProbability(deal.stage)), 0)
}

export function stageProbability(stage: string) {
  if (stage === "lead") return 0.1
  if (stage === "qualified") return 0.25
  if (stage === "proposal") return 0.4
  if (stage === "negotiation") return 0.6
  if (stage === "won") return 1
  return 0
}

export function unitCost(line: CostLine) {
  return line.unitCost * line.volume
}

export function fillPersona(saved: Partial<Book>, fresh: Book) {
  const companies = (saved.companies ?? fresh.companies).map((company) => {
    const seeded = fresh.companies.find((row) => row.id === company.id)
    return {
      ...company,
      moatNote: company.moatNote ?? seeded?.moatNote ?? "",
      bottleneck: company.bottleneck ?? seeded?.bottleneck ?? "cash",
      productLead: company.productLead ?? seeded?.productLead ?? "",
    }
  })
  return {
    companies,
    holdcos: (saved.holdcos ?? fresh.holdcos).map((holdco) => ({
      ...holdco,
      hurdleRate: holdco.hurdleRate ?? fresh.holdcos.find((row) => row.id === holdco.id)?.hurdleRate ?? 0.15,
    })),
    costLines: saved.costLines ?? fresh.costLines,
    memos: saved.memos ?? fresh.memos,
    checks: saved.checks ?? fresh.checks,
    productLines: (saved.productLines ?? fresh.productLines).map((line) => {
      const seeded = fresh.productLines.find((row) => row.id === line.id)
      return {
        ...line,
        user: line.user ?? seeded?.user ?? "",
        problem: line.problem ?? seeded?.problem ?? "",
        bet: line.bet ?? seeded?.bet ?? "",
        killCriterion: line.killCriterion ?? seeded?.killCriterion ?? "",
        price: line.price ?? seeded?.price ?? 0,
        retention: line.retention ?? seeded?.retention ?? 0,
      }
    }),
    kpis: (saved.kpis ?? fresh.kpis).map((kpi) => ({
      ...kpi,
      kind: kpi.kind ?? fresh.kpis.find((row) => row.id === kpi.id)?.kind ?? "output",
    })),
  }
}

export function blankMemo(period: string): CloseMemo {
  return { id: `memo_${period}`, period, changed: "", doing: "", notDoing: "", signedBy: "", signedAt: null }
}

export function blankCheck(period: string, label: string, owner: string): CloseCheck {
  return { id: `ck_${period}_${label}`, period, label, done: false, owner }
}
