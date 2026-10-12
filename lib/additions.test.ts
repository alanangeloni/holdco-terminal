import { describe, expect, it } from "vitest"
import {
  capitalEmployed,
  cashTie,
  covenantBreach,
  decisionStrip,
  doublingCase,
  eliminatedPosition,
  lookThroughEarnings,
  ownerEarnings,
  retainedRevenue,
  returnOnCapital,
  stressClose,
} from "./additions"
import { derivePnl } from "./metrics"
import { seed } from "./seed"
import type { MonthlyStatement } from "./types"
import { emptySocialBook } from "./metrics"

function statement(partial: Partial<MonthlyStatement> & Pick<MonthlyStatement, "companyId" | "period">): MonthlyStatement {
  return {
    id: `${partial.companyId}_${partial.period}`,
    revenue: 100,
    cogs: 20,
    payroll: 10,
    marketing: 0,
    ga: 0,
    otherOpex: 0,
    interest: 0,
    tax: 0,
    cash: 50,
    ar: 10,
    inventory: 0,
    otherAssets: 0,
    fixedAssets: 0,
    intangibles: 0,
    ap: 0,
    accrued: 0,
    shortDebt: 0,
    longDebt: 40,
    equity: 20,
    cfo: 30,
    cfi: 0,
    cff: 0,
    budgetRevenue: 0,
    budgetCogs: 0,
    budgetPayroll: 0,
    budgetMarketing: 0,
    budgetGa: 0,
    budgetOtherOpex: 0,
    budgetInterest: 0,
    budgetTax: 0,
    sessions: 0,
    users: 0,
    pageviews: 0,
    bounceRate: 0,
    conversions: 0,
    channelOrganic: 0,
    channelPaid: 0,
    channelDirect: 0,
    channelReferral: 0,
    channelSocial: 0,
    social: emptySocialBook(),
    ...partial,
  }
}

describe("owner earnings", () => {
  it("adds back depreciation and subtracts maintenance spending", () => {
    const row = statement({ companyId: "a", period: "2026-09", depreciation: 8, maintenanceCapex: 3 })
    expect(ownerEarnings(row)).toBe(derivePnl(row).netIncome + 8 - 3)
    expect(capitalEmployed(row)).toBe(60)
    expect(returnOnCapital(row)).toBeCloseTo((ownerEarnings(row) * 12) / 60)
  })

  it("follows ownership for look-through earnings", () => {
    const book = seed()
    const owned = book.companies.filter((company) => company.holdcoId === "h_meridian")
    const total = lookThroughEarnings(book.statements, owned, book.asOf)
    expect(total).not.toBe(0)
    expect(book.statements.some((row) => (row.depreciation ?? 0) > 0)).toBe(true)
  })
})

describe("fortress math", () => {
  it("removes an internal loan from combined cash and debt", () => {
    const row = statement({ companyId: "consolidated", period: "2026-09", cash: 1000, shortDebt: 100, longDebt: 400 })
    const next = eliminatedPosition(row, [{ id: "ln", lenderCompanyId: "a", borrowerCompanyId: "b", balance: 250, rate: 0.05 }], new Set(["a", "b"]))
    expect(next.cash).toBe(750)
    expect(next.debt).toBe(250)
    const outside = eliminatedPosition(row, [{ id: "ln", lenderCompanyId: "a", borrowerCompanyId: "z", balance: 250, rate: 0.05 }], new Set(["a", "b"]))
    expect(outside.balance).toBe(0)
  })

  it("ties bank cash to the statement and flags a covenant under its floor", () => {
    const book = seed()
    const tie = cashTie(book, "c_northglass")
    expect(tie?.bankGap).toBe(0)
    const vesper = book.debt.find((facility) => facility.companyId === "c_vesper")
    expect(vesper && covenantBreach(vesper)).toBe(true)
    const stress = stressClose(book)
    expect(stress).not.toBeNull()
    expect(stress!.revenueDown.revenue).toBeCloseTo(stress!.base.revenue * 0.8)
    expect(stress!.ratesUp.netIncome).toBeLessThan(stress!.base.netIncome)
  })
})

describe("operator and customer math", () => {
  it("names the company whose revenue moved the most", () => {
    const strip = decisionStrip(seed())
    expect(strip?.sentence).toMatch(/revenue (rose|fell)/)
    expect(strip?.href.startsWith("/companies/")).toBe(true)
  })

  it("counts revenue still invoiced to last year's customers", () => {
    const book = seed()
    const retained = retainedRevenue(book, "c_northglass")
    expect(retained.customers).toBeGreaterThan(0)
    expect(retained.invoiced).toBeGreaterThan(0)
  })

  it("shows the cash left if volume doubles", () => {
    const row = statement({ companyId: "a", period: "2026-09", revenue: 100, cogs: 40, cash: 30, ar: 80 })
    const doubled = doublingCase(row, "cash")
    expect(doubled.extraContribution).toBe(60)
    expect(doubled.cashAfter).toBe(10)
  })
})
