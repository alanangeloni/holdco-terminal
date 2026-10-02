import { describe, expect, it } from "vitest"
import { daysOfMonth, grainFor, projectRows } from "./grain"
import { consolidatedStatement, derivePnl } from "./metrics"
import { seed } from "./seed"
import { seriesFor } from "./view"

describe("chart grain", () => {
  it("keeps the long ranges on the closed month", () => {
    expect(grainFor("1M")).toBe("day")
    expect(grainFor("Q")).toBe("week")
    expect(grainFor("3M")).toBe("month")
    expect(grainFor("ALL")).toBe("month")
  })

  it("splits a month into days that add back, with month-end cash on the last day", () => {
    const days = daysOfMonth("2026-09")
    expect(days).toHaveLength(30)
    expect(days[0]).toBe("2026-09-01")
    expect(days.at(-1)).toBe("2026-09-30")
    const projected = projectRows(
      [{ period: "2026-09", values: { revenue: 3000, cash: 900, grossMargin: 0.4 } }],
      "1M",
      "2026-09",
      { stock: ["cash"], rate: ["grossMargin"], prior: { period: "2026-08", values: { revenue: 1000, cash: 600, grossMargin: 0.2 } } },
    )
    expect(projected).toHaveLength(30)
    expect(projected[0].period).toBe("2026-09-01")
    expect(projected.reduce((sum, row) => sum + row.values.revenue, 0)).toBeCloseTo(3000)
    expect(projected.at(-1)?.values.cash).toBeCloseTo(900)
    expect(projected[0].values.cash).toBeGreaterThan(600)
    expect(projected[0].values.cash).toBeLessThan(900)
    expect(projected.every((row) => row.values.grossMargin === 0.4)).toBe(true)
    expect(new Set(projected.map((row) => row.values.revenue)).size).toBeGreaterThan(1)
  })

  it("rolls a quarter into weeks that add back to the months", () => {
    const projected = projectRows(
      [
        { period: "2026-07", values: { revenue: 100 } },
        { period: "2026-08", values: { revenue: 200 } },
        { period: "2026-09", values: { revenue: 300 } },
      ],
      "Q",
      "2026-09",
    )
    expect(projected.length).toBeGreaterThan(10)
    expect(projected.length).toBeLessThan(16)
    expect(projected[0].period.startsWith("2026-07")).toBe(true)
    expect(projected.reduce((sum, row) => sum + row.values.revenue, 0)).toBeCloseTo(600)
    expect(projected.every((row) => row.period.length === 10)).toBe(true)
  })

  it("expands the seeded book without moving the monthly ranges", () => {
    const book = seed()
    const companies = book.companies
    const monthly = seriesFor(book, companies, "12M")
    expect(monthly).toHaveLength(12)
    expect(monthly[0].period).toBe("2025-10")
    expect(monthly.at(-1)?.period).toBe("2026-09")
    const daily = seriesFor(book, companies, "1M")
    const september = consolidatedStatement(book.statements, companies, "2026-09", "full")
    expect(daily).toHaveLength(30)
    expect(daily.reduce((sum, point) => sum + point.revenue, 0)).toBeCloseTo(derivePnl(september!).revenue)
    expect(daily.at(-1)?.cash).toBeCloseTo(september!.cash)
    const quarter = seriesFor(book, companies, "Q")
    const months = ["2026-07", "2026-08", "2026-09"].map((period) => consolidatedStatement(book.statements, companies, period, "full"))
    expect(quarter.reduce((sum, point) => sum + point.revenue, 0)).toBeCloseTo(
      months.reduce((sum, statement) => sum + derivePnl(statement!).revenue, 0),
    )
  })
})