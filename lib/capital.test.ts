import { describe, expect, it } from "vitest"
import {
  claimRate,
  fillAllocation,
  killAndParkLog,
  latestDecided,
  listingDensity,
  openAsks,
  stealsPriority,
} from "./capital"
import { seed } from "./seed"

describe("capital book", () => {
  const book = seed()

  it("keeps open asks, kills, parks, and the latest do on the shelf", () => {
    const before = book.asks.length
    const open = openAsks(book.asks)
    const log = killAndParkLog(book.asks)
    expect(open.map((ask) => ask.title)).toEqual([
      "Bridge wholesale terms",
      "Push contributor listings",
      "Second product squad",
    ])
    expect(log.map((ask) => ask.id)).toEqual(["ask_kite_designer", "ask_helio_dallas"])
    expect(latestDecided(book.asks)?.id).toBe("ask_lumen_airport")
    expect(book.asks).toHaveLength(before)
    expect(log.every((ask) => ask.decidedAt)).toBe(true)
  })

  it("flags attention asks that steal the current priority", () => {
    const vesper = book.asks.find((ask) => ask.id === "ask_vesper_bridge")!
    const atlas = book.asks.find((ask) => ask.id === "ask_atlas_push")!
    expect(book.capital.priorityCompanyId).toBe("c_vesper")
    expect(book.capital.deployableCash).toBe(250000)
    expect(vesper.kind).toBe("cash")
    expect(vesper.cashAmount).toBe(75000)
    expect(stealsPriority(vesper)).toBe(false)
    expect(atlas.kind).toBe("attention")
    expect(atlas.cashAmount).toBeNull()
    expect(stealsPriority(atlas)).toBe(true)
    expect(book.asks.find((ask) => ask.id === "ask_northglass_squad")?.stealsFocus).toBe(true)
  })

  it("seeds health and a marketplace that is not the P&L", () => {
    const health = Object.fromEntries(book.companies.map((company) => [company.id, company.health]))
    expect(health).toMatchObject({
      c_northglass: "grow",
      c_helio: "hold",
      c_vesper: "fix",
      c_lumen: "hold",
      c_atlas: "grow",
      c_kite: "stop",
    })
    const atlas = book.companies.find((company) => company.id === "c_atlas")!
    expect(atlas.marketplace).toMatchObject({
      liveListings: 186,
      listingGoal: 400,
      paidListings: 41,
      paidListingCash: 6200,
      featuredFilled: 7,
      featuredSlots: 12,
      claimsOwned: 54,
      claimsEligible: 186,
    })
    expect(listingDensity(atlas.marketplace!)).toBeCloseTo(186 / 400)
    expect(claimRate(atlas.marketplace!)).toBeCloseTo(54 / 186)
    expect(claimRate({ ...atlas.marketplace!, claimsEligible: null, claimsOwned: null })).toBeNull()
    expect(listingDensity({ ...atlas.marketplace!, listingGoal: 0 })).toBeNull()
    expect(book.companies.filter((company) => company.id !== "c_atlas").every((company) => company.marketplace === null)).toBe(true)
  })

  it("keeps ideas off the operating book", () => {
    expect(book.ideas.map((idea) => idea.stage).sort()).toEqual(["greenlit", "parked", "research", "weak"])
    const passed = book.ideas.find((idea) => idea.stage === "weak")!
    expect(passed.killReason.length).toBeGreaterThan(0)
    expect(book.companies.some((company) => company.name === "Claimable business pages")).toBe(false)
    expect(book.ideas.find((idea) => idea.stage === "greenlit")?.name).toBe("Claimable business pages")
  })

  it("backfills capital fields without dropping a saved ask list", () => {
    const atlas = book.companies.find((company) => company.id === "c_atlas")!
    const { health, marketplace, ...oldAtlas } = atlas
    void health
    void marketplace
    const filled = fillAllocation({ companies: [oldAtlas] }, book)
    expect(filled.companies[0]?.health).toBe("grow")
    expect(filled.companies[0]?.marketplace?.liveListings).toBe(186)
    expect(filled.asks).toHaveLength(book.asks.length)
    expect(fillAllocation({ companies: book.companies, asks: [] }, book).asks).toEqual([])
    expect(fillAllocation({ companies: book.companies, capital: { ...book.capital, deployableCash: 0 } }, book).capital.deployableCash).toBe(0)
  })
})
