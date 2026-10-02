export type EntityType = "c-corp" | "s-corp" | "llc" | "ltd" | "lp"
export type CompanyStatus = "operating" | "dormant" | "exited"
export type BusinessModel = "saas" | "services" | "commerce" | "marketplace" | "other"
export type DocStatus = "draft" | "open" | "paid" | "overdue"
export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
export type AssetCategory = "equity" | "ip" | "real_estate" | "equipment" | "domain" | "inventory" | "other"
export type WorkerKind = "person" | "agent"
export type WorkerStatus = "active" | "inactive"
export type RoleStatus = "open" | "interviewing" | "offer" | "filled"
export type WorkStatus = "backlog" | "doing" | "done"
export type WikiKind = "brief" | "meeting" | "decision" | "sop"
export type KpiDirection = "up" | "down"
export type EventKind = "filing" | "insurance" | "contract" | "license" | "board"
export type EventStatus = "upcoming" | "done" | "overdue"
export type RiskStatus = "open" | "mitigating" | "closed"
export type Platform = "x" | "linkedin" | "instagram" | "youtube"
export type Span = "1M" | "Q" | "3M" | "6M" | "12M" | "ALL"
export type Grain = "day" | "week" | "month"
export type ConsolidationMode = "full" | "weighted"
export type HealthTier = "grow" | "hold" | "fix" | "stop"
export type AskKind = "cash" | "attention"
export type Recommendation = "do" | "dont" | "park" | "soft_yes"
export type AskStatus = "open" | "decided" | "parked"
export type Confidence = "low" | "medium" | "high"
export type IdeaStage = "research" | "weak" | "parked" | "greenlit"

export const PLATFORMS: Platform[] = ["x", "linkedin", "instagram", "youtube"]

export interface Officer {
  name: string
  title: string
}

export interface HoldingCompany {
  id: string
  name: string
  legalName: string
  jurisdiction: string
  entityType: EntityType
  founded: string
  fiscalYearEnd: string
  currency: string
  description: string
}

export interface Company {
  id: string
  name: string
  legalName: string
  holdcoId: string | null
  parentCompanyId: string | null
  industry: string
  businessModel: BusinessModel
  status: CompanyStatus
  hq: string
  website: string
  ownershipPct: number
  entityType: EntityType
  founded: string
  description: string
  officers: Officer[]
  health: HealthTier
  marketplace: MarketplaceProfile | null
}

export interface MarketplaceProfile {
  liveListings: number
  listingGoal: number
  paidListings: number
  paidListingCash: number
  featuredSlots: number
  featuredFilled: number
  claimsEligible: number | null
  claimsOwned: number | null
}

export interface CapitalSettings {
  deployableCash: number
  priorityCompanyId: string | null
  callNote: string
  callDate: string
}

export interface CapitalAsk {
  id: string
  companyId: string | null
  ideaId: string | null
  title: string
  kind: AskKind
  cashAmount: number | null
  recommendation: Recommendation
  conditions: string
  why: string
  alternatives: string
  confidence: Confidence
  status: AskStatus
  decidedAt: string | null
  stealsFocus: boolean
  focusNote: string
}

export interface Idea {
  id: string
  name: string
  summary: string
  link: string
  stage: IdeaStage
  killReason: string
}

export interface SocialPoint {
  followers: number
  impressions: number
  engagement: number
  posts: number
}

export interface MonthlyStatement {
  id: string
  companyId: string
  period: string
  revenue: number
  cogs: number
  payroll: number
  marketing: number
  ga: number
  otherOpex: number
  interest: number
  tax: number
  cash: number
  ar: number
  inventory: number
  otherAssets: number
  fixedAssets: number
  intangibles: number
  ap: number
  accrued: number
  shortDebt: number
  longDebt: number
  equity: number
  cfo: number
  cfi: number
  cff: number
  budgetRevenue: number
  budgetCogs: number
  budgetPayroll: number
  budgetMarketing: number
  budgetGa: number
  budgetOtherOpex: number
  budgetInterest: number
  budgetTax: number
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  conversions: number
  channelOrganic: number
  channelPaid: number
  channelDirect: number
  channelReferral: number
  channelSocial: number
  social: Record<Platform, SocialPoint>
}

export interface ProductMonth {
  period: string
  revenue: number
}

export interface ProductLine {
  id: string
  companyId: string
  name: string
  monthly: ProductMonth[]
}

export interface Customer {
  id: string
  companyId: string
  name: string
  segment: string
  since: string
}

export interface Invoice {
  id: string
  companyId: string
  customerId: string
  number: string
  issue: string
  due: string
  amount: number
  status: DocStatus
}

export interface Vendor {
  id: string
  companyId: string
  name: string
  category: string
}

export interface Bill {
  id: string
  companyId: string
  vendorId: string
  number: string
  issue: string
  due: string
  amount: number
  status: DocStatus
  category: string
}

export interface Deal {
  id: string
  companyId: string
  name: string
  customerName: string
  stage: DealStage
  amount: number
  expectedClose: string
  ownerId: string | null
}

export interface BankAccount {
  id: string
  companyId: string
  institution: string
  mask: string
  balance: number
  currency: string
}

export interface DebtFacility {
  id: string
  companyId: string
  lender: string
  principal: number
  rate: number
  maturity: string
  outstanding: number
}

export interface IntercompanyLoan {
  id: string
  lenderCompanyId: string
  borrowerCompanyId: string
  balance: number
  rate: number
}

export interface Asset {
  id: string
  companyId: string
  name: string
  category: AssetCategory
  bookValue: number
  acquired: string
  location: string
  notes: string
}

export interface PersonOrAgent {
  id: string
  name: string
  kind: WorkerKind
  role: string
  status: WorkerStatus
  reportsToId: string | null
  annualCost: number
  homeCompanyId: string
  runtime: string
  monthlyRuns: number
}

export interface Allocation {
  id: string
  personId: string
  companyId: string
  percent: number
}

export interface OpenRole {
  id: string
  companyId: string
  title: string
  status: RoleStatus
}

export interface WorkItem {
  id: string
  companyId: string
  assigneeId: string | null
  status: WorkStatus
  title: string
  notes: string
  due: string | null
}

export interface WikiPage {
  id: string
  companyId: string
  kind: WikiKind
  title: string
  body: string
  updated: string
}

export interface Kpi {
  id: string
  companyId: string
  name: string
  unit: string
  target: number
  actual: number
  direction: KpiDirection
}

export interface Objective {
  id: string
  companyId: string
  quarter: string
  title: string
  ownerId: string | null
  progress: number
  keyResults: string[]
}

export interface CorporateEvent {
  id: string
  companyId: string
  kind: EventKind
  title: string
  due: string
  status: EventStatus
}

export interface Risk {
  id: string
  companyId: string
  title: string
  severity: number
  likelihood: number
  ownerId: string | null
  mitigation: string
  status: RiskStatus
}

export interface CapTableEntry {
  id: string
  companyId: string
  holder: string
  shareClass: string
  shares: number
  percent: number
}

export interface SocialPost {
  id: string
  companyId: string
  platform: Platform
  title: string
  published: string
  impressions: number
  engagement: number
}

export interface ActivityEvent {
  id: string
  at: string
  message: string
}

export interface Book {
  holdcos: HoldingCompany[]
  companies: Company[]
  statements: MonthlyStatement[]
  productLines: ProductLine[]
  customers: Customer[]
  invoices: Invoice[]
  vendors: Vendor[]
  bills: Bill[]
  deals: Deal[]
  bankAccounts: BankAccount[]
  debt: DebtFacility[]
  loans: IntercompanyLoan[]
  assets: Asset[]
  people: PersonOrAgent[]
  allocations: Allocation[]
  roles: OpenRole[]
  work: WorkItem[]
  pages: WikiPage[]
  kpis: Kpi[]
  objectives: Objective[]
  events: CorporateEvent[]
  risks: Risk[]
  capTable: CapTableEntry[]
  posts: SocialPost[]
  activity: ActivityEvent[]
  capital: CapitalSettings
  asks: CapitalAsk[]
  ideas: Idea[]
  asOf: string
}

export const SEED_AS_OF = "2026-09"
