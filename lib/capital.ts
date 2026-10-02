import type {
  Book,
  CapitalAsk,
  CapitalSettings,
  Company,
  Confidence,
  HealthTier,
  Idea,
  IdeaStage,
  MarketplaceProfile,
  Recommendation,
} from "./types"

export const HEALTH_LABEL: Record<HealthTier, string> = {
  grow: "Keep growing",
  hold: "Hold steady",
  fix: "Fix or decide",
  stop: "Stop feeding",
}

export const HEALTH_ORDER: HealthTier[] = ["grow", "hold", "fix", "stop"]

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  do: "Do it",
  dont: "Don't",
  park: "Park it",
  soft_yes: "Soft yes",
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

export const STAGE_LABEL: Record<IdeaStage, string> = {
  research: "Research",
  weak: "Weak",
  parked: "Parked",
  greenlit: "Greenlit to build",
}

export type StoredCompany = Omit<Company, "health" | "marketplace"> & Partial<Pick<Company, "health" | "marketplace">>

export function compareHealth(a: HealthTier, b: HealthTier) {
  return HEALTH_ORDER.indexOf(a) - HEALTH_ORDER.indexOf(b)
}

export function listingDensity(profile: MarketplaceProfile) {
  if (profile.listingGoal <= 0) return null
  return profile.liveListings / profile.listingGoal
}

export function claimRate(profile: MarketplaceProfile) {
  if (profile.claimsEligible === null || profile.claimsOwned === null) return null
  if (profile.claimsEligible <= 0) return null
  return profile.claimsOwned / profile.claimsEligible
}

export function featuredFill(profile: MarketplaceProfile) {
  if (profile.featuredSlots <= 0) return null
  return profile.featuredFilled / profile.featuredSlots
}

export function openAsks(asks: CapitalAsk[]) {
  return asks.filter((ask) => ask.status === "open")
}

export function isKill(ask: CapitalAsk) {
  return ask.status === "decided" && ask.recommendation === "dont"
}

export function isPark(ask: CapitalAsk) {
  return ask.status === "parked"
}

export function killAndParkLog(asks: CapitalAsk[]) {
  return asks
    .filter((ask) => isKill(ask) || isPark(ask))
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
}

export function latestDecided(asks: CapitalAsk[]) {
  const decided = asks.filter((ask) => ask.status === "decided" && ask.decidedAt)
  decided.sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
  return decided[0] ?? null
}

export function stealsPriority(ask: CapitalAsk) {
  return ask.stealsFocus
}

export function fillAllocation(
  saved: {
    companies?: StoredCompany[]
    capital?: CapitalSettings
    asks?: CapitalAsk[]
    ideas?: Idea[]
  },
  fresh: Book,
) {
  const source = saved.companies ?? fresh.companies
  const companies = source.map((company) => {
    const seeded = fresh.companies.find((row) => row.id === company.id)
    const hasMarketplace = Object.prototype.hasOwnProperty.call(company, "marketplace")
    return {
      ...(seeded ?? {}),
      ...company,
      health: company.health ?? seeded?.health ?? "hold",
      marketplace: hasMarketplace ? (company.marketplace ?? null) : (seeded?.marketplace ?? null),
    } as Company
  })
  return {
    companies,
    capital: saved.capital ?? fresh.capital,
    asks: saved.asks ?? fresh.asks,
    ideas: saved.ideas ?? fresh.ideas,
  }
}
