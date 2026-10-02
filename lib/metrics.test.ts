import { describe, expect, it } from "vitest"
import { deriveAlerts } from "./alerts"
import {
  aging,
  consolidatedStatement,
  derivePnl,
  effectiveOwnership,
  runway,
  scaleStatement,
  shiftPeriod,
  sumStatements,
  waterfall,
  windowPeriods,
} from "./metrics"
import { seed } from "./seed"
import type { Company, MonthlyStatement } from "./types"
import { emptySocialBook } from "./metrics"

function statement(partial: Partial<MonthlyStatement> & Pick<MonthlyStatement, "companyId" | "period">): MonthlyStatement {
  return {
    id: `${partial.companyId}_${partial.period}`,
    revenue: 0,
    cogs: 0,
    payroll: 0,
    marketing: 0,
    ga: 0,
    otherOpex: 0,
    interest: 0,
    tax: 0,
    cash: 0,
    ar: 0,
    inventory: 0,
    otherAssets: 0,
    fixedAssets: 0,
    intangibles: 0,
    ap: 0,
    accrued: 0,
    shortDebt: 0,
    longDebt: 0,
    equity: 0,
    cfo: 0,
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

const company = (id: string, ownershipPct: number, parentCompanyId: string | null = null): Company => ({
  id,
  name: id,
  legalName: id,
  holdcoId: "h",
  parentCompanyId,
  industry: "test",
  businessModel: "saas",
  status: "operating",
  hq: "NY",
  website: "example.com",
  ownershipPct,
  entityType: "c-corp",
  founded: "2020",
  description: "",
  officers: [],
})

describe("derivePnl", () => {
  it("computes profit, margins, and costs", () => {
    const pnl = derivePnl({
      revenue: 100,
      cogs: 40,
      payroll: 10,
      marketing: 5,
      ga: 5,
      otherOpex: 0,
      interest: 2,
      tax: 3,
    })
    expect(pnl.grossProfit).toBe(60)
    expect(pnl.grossMargin).toBeCloseTo(0.6)
    expect(pnl.opex).toBe(20)
    expect(pnl.operatingIncome).toBe(40)
    expect(pnl.netIncome).toBe(35)
    expect(pnl.netMargin).toBeCloseTo(0.35)
    expect(pnl.totalCosts).toBe(65)
  })
})

describe("consolidation", () => {
  it("sums revenue and weights bounce by sessions", () => {
    const a = statement({ companyId: "a", period: "2026-09", revenue: 100, sessions: 100, bounceRate: 0.2 })
    const b = statement({ companyId: "b", period: "2026-09", revenue: 50, sessions: 300, bounceRate: 0.6 })
    const sum = sumStatements([a, b])
    expect(sum?.revenue).toBe(150)
    expect(sum?.bounceRate).toBeCloseTo((0.2 * 100 + 0.6 * 300) / 400)
  })

  it("scales a statement by ownership and consolidates", () => {
    const a = statement({ companyId: "a", period: "2026-09", revenue: 200, sessions: 10, bounceRate: 0.5 })
    const scaled = scaleStatement(a, 0.5)
    expect(scaled.revenue).toBe(100)
    expect(scaled.bounceRate).toBeCloseTo(0.5)
    const companies = [company("a", 80), company("b", 50, "a")]
    expect(effectiveOwnership(companies[1], companies)).toBeCloseTo(0.4)
    const consolidated = consolidatedStatement(
      [statement({ companyId: "a", period: "2026-09", revenue: 100 }), statement({ companyId: "b", period: "2026-09", revenue: 50 })],
      companies,
      "2026-09",
      "weighted",
    )
    expect(consolidated?.revenue).toBeCloseTo(100 * 0.8 + 50 * 0.4)
  })
})

describe("periods, aging, runway", () => {
  it("rolls the year and windows the close", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12")
    expect(windowPeriods(["2026-01", "2026-02", "2026-03", "2026-04"], "2026-03", "3M")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ])
    expect(windowPeriods(["2026-07", "2026-08", "2026-09"], "2026-09", "1M")).toEqual(["2026-09"])
    expect(windowPeriods(["2026-06", "2026-07", "2026-08", "2026-09"], "2026-08", "Q")).toEqual([
      "2026-07",
      "2026-08",
    ])
  })

  it("buckets open invoices against the month end", () => {
    const buckets = aging(
      [
        { due: "2026-10-15", amount: 10, status: "open" },
        { due: "2026-09-15", amount: 20, status: "open" },
        { due: "2026-08-15", amount: 30, status: "overdue" },
        { due: "2026-06-01", amount: 40, status: "overdue" },
        { due: "2026-08-01", amount: 99, status: "paid" },
      ],
      "2026-09",
    )
    expect(buckets.current).toBe(10)
    expect(buckets.d30).toBe(20)
    expect(buckets.d60).toBe(30)
    expect(buckets.d61).toBe(40)
    expect(buckets.pastDue).toBe(90)
  })

  it("returns months of cash when the trailing burn is positive", () => {
    const statements = [-10, -20, -30].map((net, index) => {
      const revenue = 100
      const payroll = revenue - net
      return statement({
        companyId: "a",
        period: ["2026-07", "2026-08", "2026-09"][index],
        revenue,
        payroll,
        cash: index === 2 ? 100 : 80,
      })
    })
    expect(runway(statements, "a", "2026-09")).toBeCloseTo(100 / 20)
  })

  it("builds a waterfall that lands on net income", () => {
    const rows = waterfall(derivePnl({
      revenue: 100,
      cogs: 40,
      payroll: 10,
      marketing: 0,
      ga: 0,
      otherOpex: 0,
      interest: 5,
      tax: 5,
    }))
    const net = rows.find((row) => row.name === "Net income")
    expect((net?.base ?? 0) + (net?.rise ?? 0) - (net?.fall ?? 0)).toBe(40)
  })
})

describe("seed book", () => {
  it("raises the operating alerts a close would surface", () => {
    const book = seed()
    const alerts = deriveAlerts(book, "2026-10-02")
    expect(book.statements.filter((row) => row.companyId === "c_northglass")).toHaveLength(18)
    expect(alerts.some((alert) => alert.kind === "runway" && alert.companyId === "c_vesper")).toBe(true)
    expect(alerts.some((alert) => alert.kind === "margin" && alert.companyId === "c_northglass")).toBe(true)
    expect(alerts.some((alert) => alert.kind === "revenue" && alert.companyId === "c_atlas")).toBe(true)
    expect(alerts.some((alert) => alert.kind === "ar")).toBe(true)
    expect(alerts.some((alert) => alert.kind === "kpi")).toBe(true)
    expect(alerts.some((alert) => alert.kind === "filing")).toBe(true)
  })
})
