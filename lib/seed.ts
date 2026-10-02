import type {
  Asset,
  Book,
  Bottleneck,
  BusinessModel,
  CapTableEntry,
  Company,
  Customer,
  HealthTier,
  Deal,
  Invoice,
  MonthlyStatement,
  PersonOrAgent,
  Platform,
  ProductLine,
  SocialPoint,
  Vendor,
  WorkItem,
} from "./types"
import { SEED_AS_OF } from "./types"
import { plugEquity, shiftPeriod } from "./metrics"

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round(n: number) {
  return Math.round(n)
}

function periodsFrom(start: string, count: number) {
  const out = [start]
  let cursor = start
  for (let i = 1; i < count; i += 1) {
    cursor = shiftPeriod(cursor, 1)
    out.push(cursor)
  }
  return out
}

interface Profile {
  id: string
  holdcoId: string | null
  name: string
  legalName: string
  industry: string
  businessModel: BusinessModel
  hq: string
  website: string
  ownershipPct: number
  founded: string
  description: string
  officers: { name: string; title: string }[]
  rev0: number
  growth: number
  season: number
  cogs: number
  cogsShock?: number
  payroll: number
  marketing: number
  ga: number
  other: number
  interest: number
  tax: number
  cash0: number
  cashPin?: number
  arMonths: number
  invMonths: number
  fixed0: number
  intangibles: number
  shortDebt: number
  longDebt: number
  sessions0: number
  conv: number
  bounce: number
  lastRevMult?: number
  socialBase: Record<Platform, number>
  products: [string, string, string]
  seed: number
}

const HOLDCO_NAME = "Meridian Peak Holdings"

const profiles: Profile[] = [
  {
    id: "c_northglass",
    holdcoId: "h_meridian",
    name: "Northglass Systems",
    legalName: "Northglass Systems, Inc.",
    industry: "Vertical software",
    businessModel: "saas",
    hq: "New York, NY",
    website: "northglass.example",
    ownershipPct: 100,
    founded: "2017",
    description: "Subscription software for multi-site operators. Dispatch, billing, and customer portals on one contract.",
    officers: [
      { name: "Elena Voss", title: "Chief Executive Officer" },
      { name: "Amira Shah", title: "Chief Financial Officer" },
    ],
    rev0: 460000,
    growth: 0.018,
    season: 0.02,
    cogs: 0.18,
    cogsShock: 0.3,
    payroll: 0.34,
    marketing: 0.11,
    ga: 0.08,
    other: 0.03,
    interest: 1200,
    tax: 0.18,
    cash0: 2100000,
    arMonths: 0.85,
    invMonths: 0,
    fixed0: 420000,
    intangibles: 1800000,
    shortDebt: 0,
    longDebt: 0,
    sessions0: 82000,
    conv: 0.034,
    bounce: 0.41,
    socialBase: { x: 18400, linkedin: 24600, instagram: 6200, youtube: 4100 },
    products: ["Dispatch Cloud", "Billing Suite", "Operator Portal"],
    seed: 11,
  },
  {
    id: "c_helio",
    holdcoId: "h_meridian",
    name: "Helio Freight",
    legalName: "Helio Freight LLC",
    industry: "Logistics",
    businessModel: "commerce",
    hq: "Chicago, IL",
    website: "heliofreight.example",
    ownershipPct: 80,
    founded: "2012",
    description: "Regional less-than-truckload and final mile. Contract lanes plus a spot book when capacity is loose.",
    officers: [
      { name: "Priya Raman", title: "Chief Operating Officer" },
      { name: "Chris Daley", title: "General Manager" },
    ],
    rev0: 920000,
    growth: 0.006,
    season: 0.035,
    cogs: 0.63,
    payroll: 0.12,
    marketing: 0.03,
    ga: 0.05,
    other: 0.02,
    interest: 7200,
    tax: 0.16,
    cash0: 1450000,
    arMonths: 1.15,
    invMonths: 0.04,
    fixed0: 2600000,
    intangibles: 400000,
    shortDebt: 180000,
    longDebt: 1180000,
    sessions0: 24000,
    conv: 0.018,
    bounce: 0.48,
    socialBase: { x: 6400, linkedin: 11200, instagram: 2800, youtube: 1900 },
    products: ["Contract lanes", "Final mile", "Spot freight"],
    seed: 23,
  },
  {
    id: "c_vesper",
    holdcoId: "h_meridian",
    name: "Vesper & Rye",
    legalName: "Vesper & Rye Coffee, Inc.",
    industry: "Retail coffee",
    businessModel: "commerce",
    hq: "Portland, OR",
    website: "vesperandrye.example",
    ownershipPct: 100,
    founded: "2016",
    description: "Seven cafes and a wholesale roasting book. The cafes carry the brand. Wholesale is what has to pay the rent.",
    officers: [
      { name: "Ruth Okonkwo", title: "General Manager" },
      { name: "Leo Park", title: "Head of Retail" },
    ],
    rev0: 228000,
    growth: 0.004,
    season: 0.05,
    cogs: 0.52,
    payroll: 0.39,
    marketing: 0.07,
    ga: 0.12,
    other: 0.04,
    interest: 900,
    tax: 0.12,
    cash0: 90000,
    cashPin: 88000,
    arMonths: 0.35,
    invMonths: 0.22,
    fixed0: 640000,
    intangibles: 120000,
    shortDebt: 45000,
    longDebt: 210000,
    sessions0: 31000,
    conv: 0.022,
    bounce: 0.52,
    socialBase: { x: 9800, linkedin: 2100, instagram: 27400, youtube: 3600 },
    products: ["Cafe retail", "Wholesale beans", "Catering"],
    seed: 37,
  },
  {
    id: "c_lumen",
    holdcoId: "h_meridian",
    name: "Lumen Field Co",
    legalName: "Lumen Field Co.",
    industry: "Facilities services",
    businessModel: "services",
    hq: "Austin, TX",
    website: "lumenfield.example",
    ownershipPct: 70,
    founded: "2015",
    description: "Technicians and facilities contracts for commercial sites. Recurring maintenance plus project work.",
    officers: [
      { name: "Samir Iqbal", title: "General Manager" },
      { name: "Dana Cho", title: "Head of Field Ops" },
    ],
    rev0: 540000,
    growth: 0.009,
    season: 0.03,
    cogs: 0.47,
    payroll: 0.27,
    marketing: 0.03,
    ga: 0.07,
    other: 0.025,
    interest: 2400,
    tax: 0.17,
    cash0: 760000,
    arMonths: 1.05,
    invMonths: 0.08,
    fixed0: 890000,
    intangibles: 210000,
    shortDebt: 60000,
    longDebt: 240000,
    sessions0: 14000,
    conv: 0.02,
    bounce: 0.46,
    socialBase: { x: 3200, linkedin: 8600, instagram: 4100, youtube: 1500 },
    products: ["Maintenance contracts", "Project work", "Emergency callouts"],
    seed: 41,
  },
  {
    id: "c_atlas",
    holdcoId: null,
    name: "Atlas Field Notes",
    legalName: "Atlas Field Notes, Inc.",
    industry: "Research media",
    businessModel: "marketplace",
    hq: "Brooklyn, NY",
    website: "atlasfieldnotes.example",
    ownershipPct: 100,
    founded: "2019",
    description: "Paid research briefs and a contributor marketplace. Independent of the holdco. Watched because the audience compounds.",
    officers: [{ name: "Helen Brooks", title: "Editor" }],
    rev0: 168000,
    growth: 0.016,
    season: 0.025,
    cogs: 0.26,
    payroll: 0.31,
    marketing: 0.14,
    ga: 0.09,
    other: 0.03,
    interest: 0,
    tax: 0.15,
    cash0: 410000,
    arMonths: 0.4,
    invMonths: 0,
    fixed0: 85000,
    intangibles: 260000,
    shortDebt: 0,
    longDebt: 0,
    sessions0: 124000,
    conv: 0.027,
    bounce: 0.58,
    lastRevMult: 0.8,
    socialBase: { x: 42000, linkedin: 18800, instagram: 15300, youtube: 9600 },
    products: ["Brief subscriptions", "Single reports", "Contributor marketplace"],
    seed: 53,
  },
  {
    id: "c_kite",
    holdcoId: null,
    name: "Kite & Co",
    legalName: "Kite & Co. LLC",
    industry: "Brand studio",
    businessModel: "services",
    hq: "Los Angeles, CA",
    website: "kiteandco.example",
    ownershipPct: 100,
    founded: "2018",
    description: "Brand and performance studio. Portfolio companies are anchor clients. Outside retainers keep the bench full.",
    officers: [
      { name: "Owen Blake", title: "Managing Director" },
      { name: "Nora Feldman", title: "Design Director" },
    ],
    rev0: 305000,
    growth: 0.007,
    season: 0.04,
    cogs: 0.34,
    payroll: 0.38,
    marketing: 0.04,
    ga: 0.08,
    other: 0.02,
    interest: 400,
    tax: 0.18,
    cash0: 520000,
    arMonths: 0.95,
    invMonths: 0,
    fixed0: 160000,
    intangibles: 70000,
    shortDebt: 0,
    longDebt: 0,
    sessions0: 18000,
    conv: 0.031,
    bounce: 0.44,
    socialBase: { x: 11200, linkedin: 9400, instagram: 22100, youtube: 5400 },
    products: ["Brand retainers", "Campaigns", "Site builds"],
    seed: 67,
  },
]

function buildStatements(profile: Profile, periods: string[]) {
  const rand = mulberry32(profile.seed)
  const last = periods.length - 1
  const statements: MonthlyStatement[] = []
  for (let i = 0; i < periods.length; i += 1) {
    const season = 1 + profile.season * Math.sin(i / 2.2)
    const trend = Math.pow(1 + profile.growth, i)
    const noise = 0.985 + rand() * 0.03
    let revenue = profile.rev0 * trend * season * noise
    if (i === last && profile.lastRevMult) revenue *= profile.lastRevMult
    revenue = round(revenue)
    const cogsRate = i === last && profile.cogsShock ? profile.cogsShock : profile.cogs
    const cogs = round(revenue * cogsRate)
    const payroll = round(revenue * profile.payroll)
    const marketing = round(revenue * profile.marketing)
    const ga = round(revenue * profile.ga)
    const otherOpex = round(revenue * profile.other)
    const interest = profile.interest
    const operating = revenue - cogs - payroll - marketing - ga - otherOpex - interest
    const tax = operating > 0 ? round(operating * profile.tax) : 0
    const net = operating - tax
    const cash = profile.cashPin
      ? round(profile.cashPin * (0.94 + rand() * 0.12))
      : round(profile.cash0 * (1 + i * 0.008) * (0.97 + rand() * 0.06))
    const sessions = Math.max(400, round(profile.sessions0 * (revenue / profile.rev0) * (0.94 + rand() * 0.12)))
    const users = round(sessions * (0.58 + rand() * 0.12))
    const pageviews = round(sessions * (1.7 + rand() * 0.5))
    const bounceRate = Math.min(0.82, Math.max(0.22, profile.bounce + (rand() - 0.5) * 0.05))
    const conversions = Math.max(1, round(sessions * profile.conv * (0.9 + rand() * 0.2)))
    const weights = [0.34, 0.24, 0.18, 0.12, 0.12].map((w) => Math.max(0.04, w + (rand() - 0.5) * 0.05))
    const weightSum = weights.reduce((sum, value) => sum + value, 0)
    const channels = weights.map((w) => round((w / weightSum) * sessions))
    channels[0] += sessions - channels.reduce((sum, value) => sum + value, 0)
    const posts = 3 + Math.round(rand() * 5)
    const social = (base: number): SocialPoint => {
      const followers = round(base * Math.pow(1.011, i) * (0.98 + rand() * 0.05))
      const impressions = round(followers * (0.22 + rand() * 0.35) * posts)
      return { followers, impressions, engagement: 0.012 + rand() * 0.045, posts }
    }
    const budgetFactor = 0.96 + rand() * 0.1
    const draft: MonthlyStatement = {
      id: `st_${profile.id}_${periods[i]}`,
      companyId: profile.id,
      period: periods[i],
      revenue,
      cogs,
      payroll,
      marketing,
      ga,
      otherOpex,
      interest,
      tax,
      cash,
      ar: round(revenue * profile.arMonths),
      inventory: round(cogs * profile.invMonths),
      otherAssets: round(revenue * 0.08),
      fixedAssets: round(profile.fixed0 * (1 + i * 0.004)),
      intangibles: profile.intangibles,
      ap: round(Math.max(cogs, 1) * 0.36),
      accrued: round(payroll * 0.18),
      shortDebt: profile.shortDebt,
      longDebt: profile.longDebt,
      equity: 0,
      cfo: 0,
      cfi: 0,
      cff: 0,
      budgetRevenue: round(revenue * budgetFactor),
      budgetCogs: round(cogs * (0.97 + rand() * 0.06)),
      budgetPayroll: round(payroll * (0.98 + rand() * 0.05)),
      budgetMarketing: round(marketing * (0.95 + rand() * 0.1)),
      budgetGa: round(ga * (0.98 + rand() * 0.04)),
      budgetOtherOpex: round(otherOpex * (0.96 + rand() * 0.08)),
      budgetInterest: interest,
      budgetTax: tax > 0 ? round(tax * budgetFactor) : 0,
      sessions,
      users,
      pageviews,
      bounceRate,
      conversions,
      channelOrganic: channels[0],
      channelPaid: channels[1],
      channelDirect: channels[2],
      channelReferral: channels[3],
      channelSocial: channels[4],
      social: {
        x: social(profile.socialBase.x),
        linkedin: social(profile.socialBase.linkedin),
        instagram: social(profile.socialBase.instagram),
        youtube: social(profile.socialBase.youtube),
      },
    }
    const prevCash = i === 0 ? round(cash * 0.96) : statements[i - 1].cash
    const prevFixed = i === 0 ? profile.fixed0 : statements[i - 1].fixedAssets
    draft.cfo = round(net * 0.82)
    draft.cfi = round(-(draft.fixedAssets - prevFixed))
    draft.cff = round(cash - prevCash - draft.cfo - draft.cfi)
    draft.depreciation = round(Math.max(0, draft.fixedAssets) * 0.008)
    draft.maintenanceCapex = round(Math.max(revenue * 0.012, Math.abs(Math.min(draft.cfi, 0)) * 0.4))
    statements.push(plugEquity(draft))
  }
  return statements
}

const CUSTOMER_BOOKS: Record<string, [string, string][]> = {
  c_northglass: [
    ["Harborline Logistics", "Mid-market"],
    ["Pallet North", "Mid-market"],
    ["Civic Sites", "Enterprise"],
    ["Redbird Facilities", "Enterprise"],
    ["Sable Clinics", "Mid-market"],
    ["Orchard Grocers", "SMB"],
    ["Mesa Transit", "Enterprise"],
    ["Kindling Home", "SMB"],
  ],
  c_helio: [
    ["Northline Retail", "Enterprise"],
    ["Cinder Apparel", "Mid-market"],
    ["Glasshouse Foods", "Enterprise"],
    ["Paper Route Co", "SMB"],
    ["Union Hardware", "Mid-market"],
    ["Bright Parcel", "Mid-market"],
    ["Lake and Timber", "SMB"],
    ["Arcadia Parts", "Enterprise"],
  ],
  c_vesper: [
    ["Hotel June", "Wholesale"],
    ["Marlow Grocery", "Wholesale"],
    ["Cafe walk-in", "Retail"],
    ["Sunday Market", "Wholesale"],
    ["The Annex Rooms", "Catering"],
    ["Pier Office Club", "Catering"],
    ["Lowland Bakery", "Wholesale"],
    ["City of Portland Parks", "Catering"],
  ],
  c_lumen: [
    ["Brickwork Offices", "Contract"],
    ["Hearth Clinics", "Contract"],
    ["South Congress Retail", "Project"],
    ["Basin Schools", "Contract"],
    ["Copper Motel Group", "Contract"],
    ["Yardbird Warehouses", "Project"],
    ["Alto Property", "Contract"],
    ["Fremont Labs", "Project"],
  ],
  c_atlas: [
    ["Keel Capital", "Subscription"],
    ["Operator Guild", "Subscription"],
    ["Smallbatch Media", "Single report"],
    ["North Desk Research", "Subscription"],
    ["Lane Partners", "Subscription"],
    ["Public Record Club", "Marketplace"],
    ["Ivy Street", "Single report"],
    ["Harbor Fellows", "Subscription"],
  ],
  c_kite: [
    ["Northglass Systems", "Portfolio"],
    ["Helio Freight", "Portfolio"],
    ["Vesper & Rye", "Portfolio"],
    ["Lumen Field Co", "Portfolio"],
    ["June Outdoor", "Outside"],
    ["Marble Audio", "Outside"],
    ["Softlantern", "Outside"],
    ["Field Day Bank", "Outside"],
  ],
}

const VENDORS: Record<string, [string, string][]> = {
  c_northglass: [
    ["Cloudline Hosting", "Software"],
    ["Relay SMS", "Software"],
    ["Hudson Legal", "Professional"],
    ["Canal Street Office", "Rent"],
    ["Northbeam Ads", "Marketing"],
  ],
  c_helio: [
    ["Great Lakes Fuel", "Freight"],
    ["Dock 14 Rent", "Rent"],
    ["Carrier Compliance Co", "Professional"],
    ["Midwest Tires", "Equipment"],
    ["Lane Insurance", "Insurance"],
  ],
  c_vesper: [
    ["Willamette Green Coffee", "Supplies"],
    ["Division Street Lease", "Rent"],
    ["Cup and Lid Co", "Supplies"],
    ["Portland Power", "Utilities"],
    ["Local Roast Ads", "Marketing"],
  ],
  c_lumen: [
    ["Hill Country Supply", "Supplies"],
    ["Van Fleet Lease", "Equipment"],
    ["Site Insurance Pool", "Insurance"],
    ["Austin Yard Rent", "Rent"],
    ["Radio Dispatch", "Software"],
  ],
  c_atlas: [
    ["Type Foundry", "Software"],
    ["Brooklyn Desk Rent", "Rent"],
    ["Contributor Payouts", "Professional"],
    ["Sponsored Shelf", "Marketing"],
    ["Counsel Row", "Professional"],
  ],
  c_kite: [
    ["Studio Lease", "Rent"],
    ["Render Farm", "Software"],
    ["Freelance Bench", "Professional"],
    ["Media Buy Desk", "Marketing"],
    ["Production Insurance", "Insurance"],
  ],
}

const HEALTH: Record<string, HealthTier> = {
  c_northglass: "grow",
  c_helio: "hold",
  c_vesper: "fix",
  c_lumen: "hold",
  c_atlas: "grow",
  c_kite: "stop",
}

const MOAT: Record<string, { note: string; bottleneck: Bottleneck; lead: string }> = {
  c_northglass: {
    note: "Sites stay because dispatch, billing, and the portal are one contract. Ripping it out stops the trucks.",
    bottleneck: "person",
    lead: "Dispatch and billing for multi-site operators, priced per site.",
  },
  c_helio: {
    note: "Lanes stay because the shipper already trained the dock on Helio's cutoff.",
    bottleneck: "vendor",
    lead: "Regional freight with a cutoff the dock already knows.",
  },
  c_vesper: {
    note: "Wholesale stays for the roast. The cafe stays for the room. Neither is a bargain.",
    bottleneck: "cash",
    lead: "A roast and a room on Division Street.",
  },
  c_lumen: {
    note: "Contracts stay because the technician already has the keys and the history.",
    bottleneck: "person",
    lead: "Field maintenance for buildings that cannot wait.",
  },
  c_atlas: {
    note: "Readers stay for the brief they cannot get from a feed.",
    bottleneck: "vendor",
    lead: "A paid brief for operators who already have the data and not the judgment.",
  },
  c_kite: {
    note: "Clients stay when the work is visible. The studio does not win on price.",
    bottleneck: "machine",
    lead: "Brand and campaign work, billed at the published rate.",
  },
}

const ATLAS_MARKET = {
  liveListings: 186,
  listingGoal: 400,
  paidListings: 41,
  paidListingCash: 6200,
  featuredSlots: 12,
  featuredFilled: 7,
  claimsEligible: 186,
  claimsOwned: 54,
}

function splitAmount(total: number, parts: number) {
  const weights = Array.from({ length: parts }, (_, index) => parts - index)
  const sum = weights.reduce((acc, value) => acc + value, 0)
  const amounts = weights.map((weight) => round((weight / sum) * total))
  amounts[0] += total - amounts.reduce((acc, value) => acc + value, 0)
  return amounts
}

export function seed(): Book {
  const periods = periodsFrom("2025-04", 18)
  const companies: Company[] = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    legalName: profile.legalName,
    holdcoId: profile.holdcoId,
    parentCompanyId: null,
    industry: profile.industry,
    businessModel: profile.businessModel,
    status: "operating",
    hq: profile.hq,
    website: profile.website,
    ownershipPct: profile.ownershipPct,
    entityType: profile.businessModel === "commerce" && profile.id === "c_helio" ? "llc" : profile.id === "c_kite" ? "llc" : "c-corp",
    founded: profile.founded,
    description: profile.description,
    officers: profile.officers,
    health: HEALTH[profile.id] ?? "hold",
    marketplace: profile.id === "c_atlas" ? ATLAS_MARKET : null,
    moatNote: MOAT[profile.id]?.note ?? "",
    bottleneck: MOAT[profile.id]?.bottleneck,
    productLead: MOAT[profile.id]?.lead ?? "",
  }))
  const statements = profiles.flatMap((profile) => buildStatements(profile, periods))
  const latestOf = (id: string) => statements.find((s) => s.companyId === id && s.period === SEED_AS_OF)!

  const customers: Customer[] = []
  const invoices: Invoice[] = []
  const vendors: Vendor[] = []
  const bills: Book["bills"] = []
  const productLines: ProductLine[] = []

  for (const profile of profiles) {
    const latest = latestOf(profile.id)
    const names = CUSTOMER_BOOKS[profile.id]
    names.forEach(([name, segment], index) => {
      customers.push({
        id: `cu_${profile.id}_${index + 1}`,
        companyId: profile.id,
        name,
        segment,
        since: index < 3 ? "2023-04-01" : "2025-01-15",
      })
    })
    const arParts = splitAmount(latest.ar, 4)
    const stressed = profile.id === "c_helio" || profile.id === "c_kite" || profile.id === "c_lumen"
    const invoicePlan: { status: Invoice["status"]; due: string; issue: string; customer: number }[] = stressed
      ? [
          { status: "overdue", due: "2026-07-12", issue: "2026-06-12", customer: 0 },
          { status: "overdue", due: "2026-08-20", issue: "2026-07-20", customer: 1 },
          { status: "open", due: "2026-10-18", issue: "2026-09-18", customer: 2 },
          { status: "open", due: "2026-09-28", issue: "2026-09-01", customer: 3 },
        ]
      : [
          { status: "paid", due: "2026-08-01", issue: "2026-07-01", customer: 0 },
          { status: "paid", due: "2026-09-01", issue: "2026-08-01", customer: 1 },
          { status: "open", due: "2026-10-18", issue: "2026-09-18", customer: 2 },
          { status: "open", due: "2026-10-25", issue: "2026-09-20", customer: 3 },
        ]
    invoicePlan.forEach((plan, index) => {
      invoices.push({
        id: `in_${profile.id}_${index + 1}`,
        companyId: profile.id,
        customerId: `cu_${profile.id}_${plan.customer + 1}`,
        number: `INV-${profile.id.slice(2, 5).toUpperCase()}-${2400 + index}`,
        issue: plan.issue,
        due: plan.due,
        amount: Math.max(500, arParts[index]),
        status: plan.status,
      })
    })
    invoices.push({
      id: `in_${profile.id}_paid`,
      companyId: profile.id,
      customerId: `cu_${profile.id}_5`,
      number: `INV-${profile.id.slice(2, 5).toUpperCase()}-2390`,
      issue: "2026-08-02",
      due: "2026-08-30",
      amount: round(latest.revenue * 0.08),
      status: "paid",
    })

    VENDORS[profile.id].forEach(([name, category], index) => {
      vendors.push({
        id: `ve_${profile.id}_${index + 1}`,
        companyId: profile.id,
        name,
        category,
      })
    })
    const apParts = splitAmount(latest.ap, 3)
    const billPlan: { status: Book["bills"][number]["status"]; due: string }[] = [
      { status: profile.id === "c_vesper" ? "overdue" : "open", due: profile.id === "c_vesper" ? "2026-08-05" : "2026-10-12" },
      { status: "open", due: "2026-09-22" },
      { status: "paid", due: "2026-08-15" },
    ]
    billPlan.forEach((plan, index) => {
      const vendor = vendors.find((item) => item.id === `ve_${profile.id}_${index + 1}`)!
      bills.push({
        id: `bi_${profile.id}_${index + 1}`,
        companyId: profile.id,
        vendorId: vendor.id,
        number: `BILL-${1800 + index}`,
        issue: "2026-08-01",
        due: plan.due,
        amount: Math.max(200, apParts[index]),
        status: plan.status,
        category: vendor.category,
      })
    })

    const shares = [0.48, 0.31, 0.21]
    const retentions = [0.91, 0.84, 0.72]
    profile.products.forEach((name, index) => {
      productLines.push({
        id: `pr_${profile.id}_${index + 1}`,
        companyId: profile.id,
        name,
        user: profile.businessModel === "saas" ? "The operator who runs the sites" : "The buyer who already has a vendor",
        problem: `${name} is how ${profile.name} gets paid for the job customers cannot drop.`,
        bet: `${name} keeps its share of ${profile.name} if the price holds.`,
        killCriterion: `Pull ${name} if retention falls under 70% for two closes.`,
        price: round(latest.revenue * shares[index] / Math.max(1, latest.conversions)),
        retention: retentions[index],
        monthly: statements
          .filter((s) => s.companyId === profile.id)
          .map((s, monthIndex) => {
            const wobble = 1 + Math.sin(monthIndex / 3 + index) * 0.04
            const share = shares[index] * wobble
            return { period: s.period, revenue: round(s.revenue * share) }
          }),
      })
    })
  }

  customers.push({
    id: "cu_helio_harbor",
    companyId: "c_helio",
    name: "Harborline Logistics",
    segment: "Mid-market",
    since: "2024-02-01",
  })
  invoices.push({
    id: "in_helio_harbor",
    companyId: "c_helio",
    customerId: "cu_helio_harbor",
    number: "INV-HEL-2410",
    issue: "2026-09-12",
    due: "2026-10-20",
    amount: 18000,
    status: "open",
  })
  vendors.push({ id: "ve_atlas_cloud", companyId: "c_atlas", name: "Cloudline Hosting", category: "Software" })
  bills.push({
    id: "bi_atlas_cloud",
    companyId: "c_atlas",
    vendorId: "ve_atlas_cloud",
    number: "BILL-1844",
    issue: "2026-09-01",
    due: "2026-10-18",
    amount: 4200,
    status: "open",
    category: "Software",
  })

  const people: PersonOrAgent[] = [
    { id: "p_elena", name: "Elena Voss", kind: "person", role: "Chief Executive Officer", status: "active", reportsToId: null, annualCost: 280000, homeCompanyId: "c_northglass", runtime: "", monthlyRuns: 0 },
    { id: "p_marcus", name: "Marcus Hale", kind: "person", role: "Chief Revenue Officer", status: "active", reportsToId: "p_elena", annualCost: 210000, homeCompanyId: "c_northglass", runtime: "", monthlyRuns: 0 },
    { id: "p_amira", name: "Amira Shah", kind: "person", role: "Chief Financial Officer", status: "active", reportsToId: null, annualCost: 320000, homeCompanyId: "c_northglass", runtime: "", monthlyRuns: 0 },
    { id: "p_jonah", name: "Jonah Peck", kind: "person", role: "Controller", status: "active", reportsToId: "p_amira", annualCost: 165000, homeCompanyId: "c_northglass", runtime: "", monthlyRuns: 0 },
    { id: "p_priya", name: "Priya Raman", kind: "person", role: "Chief Operating Officer", status: "active", reportsToId: null, annualCost: 240000, homeCompanyId: "c_helio", runtime: "", monthlyRuns: 0 },
    { id: "p_chris", name: "Chris Daley", kind: "person", role: "General Manager", status: "active", reportsToId: "p_priya", annualCost: 180000, homeCompanyId: "c_helio", runtime: "", monthlyRuns: 0 },
    { id: "p_ruth", name: "Ruth Okonkwo", kind: "person", role: "General Manager", status: "active", reportsToId: null, annualCost: 160000, homeCompanyId: "c_vesper", runtime: "", monthlyRuns: 0 },
    { id: "p_leo", name: "Leo Park", kind: "person", role: "Head of Retail", status: "active", reportsToId: "p_ruth", annualCost: 110000, homeCompanyId: "c_vesper", runtime: "", monthlyRuns: 0 },
    { id: "p_samir", name: "Samir Iqbal", kind: "person", role: "General Manager", status: "active", reportsToId: null, annualCost: 190000, homeCompanyId: "c_lumen", runtime: "", monthlyRuns: 0 },
    { id: "p_dana", name: "Dana Cho", kind: "person", role: "Head of Field Ops", status: "active", reportsToId: "p_samir", annualCost: 140000, homeCompanyId: "c_lumen", runtime: "", monthlyRuns: 0 },
    { id: "p_helen", name: "Helen Brooks", kind: "person", role: "Editor", status: "active", reportsToId: null, annualCost: 150000, homeCompanyId: "c_atlas", runtime: "", monthlyRuns: 0 },
    { id: "p_owen", name: "Owen Blake", kind: "person", role: "Managing Director", status: "active", reportsToId: null, annualCost: 200000, homeCompanyId: "c_kite", runtime: "", monthlyRuns: 0 },
    { id: "p_nora", name: "Nora Feldman", kind: "person", role: "Design Director", status: "active", reportsToId: "p_owen", annualCost: 155000, homeCompanyId: "c_kite", runtime: "", monthlyRuns: 0 },
    { id: "p_imani", name: "Imani Brooks", kind: "person", role: "Portfolio Analyst", status: "active", reportsToId: "p_amira", annualCost: 145000, homeCompanyId: "c_northglass", runtime: "", monthlyRuns: 0 },
    { id: "a_ledger", name: "Ledger Clerk", kind: "agent", role: "Close assistant", status: "active", reportsToId: "p_jonah", annualCost: 18000, homeCompanyId: "c_northglass", runtime: "books-close", monthlyRuns: 220 },
    { id: "a_traffic", name: "Traffic Watch", kind: "agent", role: "Audience monitor", status: "active", reportsToId: "p_helen", annualCost: 14000, homeCompanyId: "c_atlas", runtime: "audience-watch", monthlyRuns: 640 },
    { id: "a_collect", name: "Collections Desk", kind: "agent", role: "Receivables follow-up", status: "active", reportsToId: "p_priya", annualCost: 12000, homeCompanyId: "c_helio", runtime: "ar-followup", monthlyRuns: 160 },
    { id: "a_close", name: "Close Bot", kind: "agent", role: "Month-end checklist", status: "active", reportsToId: "p_owen", annualCost: 9000, homeCompanyId: "c_kite", runtime: "month-end", monthlyRuns: 48 },
  ]

  const allocationRows: [string, string, number][] = [
    ["p_elena", "c_northglass", 100],
    ["p_marcus", "c_northglass", 100],
    ["p_amira", "c_northglass", 25],
    ["p_amira", "c_helio", 25],
    ["p_amira", "c_vesper", 25],
    ["p_amira", "c_lumen", 25],
    ["p_jonah", "c_northglass", 40],
    ["p_jonah", "c_helio", 20],
    ["p_jonah", "c_vesper", 20],
    ["p_jonah", "c_lumen", 20],
    ["p_priya", "c_helio", 100],
    ["p_chris", "c_helio", 100],
    ["p_ruth", "c_vesper", 100],
    ["p_leo", "c_vesper", 100],
    ["p_samir", "c_lumen", 100],
    ["p_dana", "c_lumen", 100],
    ["p_helen", "c_atlas", 100],
    ["p_owen", "c_kite", 80],
    ["p_owen", "c_northglass", 20],
    ["p_nora", "c_kite", 70],
    ["p_nora", "c_northglass", 30],
    ["p_imani", "c_northglass", 20],
    ["p_imani", "c_helio", 20],
    ["p_imani", "c_vesper", 20],
    ["p_imani", "c_lumen", 20],
    ["p_imani", "c_atlas", 10],
    ["p_imani", "c_kite", 10],
    ["a_ledger", "c_northglass", 40],
    ["a_ledger", "c_helio", 20],
    ["a_ledger", "c_vesper", 20],
    ["a_ledger", "c_lumen", 20],
    ["a_traffic", "c_atlas", 50],
    ["a_traffic", "c_northglass", 25],
    ["a_traffic", "c_kite", 25],
    ["a_collect", "c_helio", 60],
    ["a_collect", "c_kite", 40],
    ["a_close", "c_kite", 100],
  ]
  const allocations: Book["allocations"] = allocationRows.map(([personId, companyId, percent], index) => ({
    id: `al_${index + 1}`,
    personId,
    companyId,
    percent: Number(percent),
  }))

  const work: WorkItem[] = [
    ["c_northglass", "p_marcus", "doing", "Renew Civic Sites expansion", "Pricing is drafted. Legal redlines are with Hudson.", "2026-10-16"],
    ["c_northglass", "a_ledger", "doing", "September close binder", "Revenue tie-out is done. Deferred revenue still open.", "2026-10-08"],
    ["c_northglass", "p_jonah", "backlog", "Rewrite billing cohort note", "Needed before the board pack.", "2026-10-20"],
    ["c_helio", "p_priya", "doing", "Lane repricing for Arcadia", "Fuel surcharge is the open item.", "2026-10-11"],
    ["c_helio", "a_collect", "doing", "Chase Glasshouse overdues", "Two invoices, one dispute on accessorials.", "2026-10-06"],
    ["c_helio", "p_chris", "backlog", "Dock 14 lease option", "Notice window opens in November.", "2026-11-01"],
    ["c_vesper", "p_ruth", "doing", "Wholesale price increase", "Hotel June has asked for a call.", "2026-10-09"],
    ["c_vesper", "p_leo", "doing", "Close Tuesday cafe early", "Labor is the whole margin problem.", "2026-10-07"],
    ["c_vesper", "p_amira", "backlog", "Cash weekly with Ruth", "Runway is inside six months.", "2026-10-04"],
    ["c_lumen", "p_samir", "doing", "Basin Schools renewal", "Utilization on that contract is thin.", "2026-10-18"],
    ["c_lumen", "p_dana", "backlog", "Hire the third technician", "Offer is out.", "2026-10-14"],
    ["c_atlas", "p_helen", "doing", "October brief: freight margins", "Draft is late. Traffic dipped in September.", "2026-10-12"],
    ["c_atlas", "a_traffic", "doing", "Explain the September session drop", "Paid mix shifted. Organic held.", "2026-10-05"],
    ["c_kite", "p_owen", "doing", "Northglass site rebuild", "Homepage is in review.", "2026-10-21"],
    ["c_kite", "p_nora", "doing", "Vesper holiday campaign", "Photography is booked.", "2026-10-15"],
    ["c_kite", "a_close", "done", "August studio close", "Filed.", "2026-09-12"],
  ].map(([companyId, assigneeId, status, title, notes, due], index) => ({
    id: `wk_${index + 1}`,
    companyId,
    assigneeId,
    status: status as WorkItem["status"],
    title,
    notes,
    due,
    priority: (index % 3) + 1,
  }))
  const waiting = work.find((item) => item.title === "Cash weekly with Ruth")
  const letter = work.find((item) => item.title === "Wholesale price increase")
  if (waiting) {
    waiting.status = "blocked"
    waiting.dependsOnId = letter?.id ?? null
    waiting.doneNote = "The Monday cash note went out."
    waiting.nextNote = "Sit with Ruth once the price letter is sent."
    waiting.stuckNote = "Waiting on the wholesale letter before the cash conversation is useful."
    waiting.priority = 1
  }

  const capRows: [string, string, string, number, number][] = [
    ["c_northglass", HOLDCO_NAME, "Common", 1000000, 100],
    ["c_helio", HOLDCO_NAME, "Common", 800000, 80],
    ["c_helio", "Hale Family Trust", "Common", 200000, 20],
    ["c_vesper", HOLDCO_NAME, "Common", 500000, 100],
    ["c_lumen", HOLDCO_NAME, "Common", 700000, 70],
    ["c_lumen", "Field Founders", "Common", 300000, 30],
    ["c_atlas", "Helen Brooks", "Common", 620000, 62],
    ["c_atlas", "Reader Pool", "Common", 380000, 38],
    ["c_kite", "Owen Blake", "Common", 700000, 70],
    ["c_kite", "Nora Feldman", "Common", 300000, 30],
  ]
  const capTable: CapTableEntry[] = capRows.map(([companyId, holder, shareClass, shares, percent], index) => ({
    id: `cap_${index + 1}`,
    companyId,
    holder,
    shareClass,
    shares: Number(shares),
    percent: Number(percent),
  }))

  const dealRows: [string, string, string, Deal["stage"], number, string, string][] = [
    ["c_northglass", "Mesa Transit phase 2", "Mesa Transit", "negotiation", 180000, "2026-10-30", "p_marcus"],
    ["c_northglass", "Orchard Grocers rollout", "Orchard Grocers", "proposal", 96000, "2026-11-15", "p_marcus"],
    ["c_northglass", "Inbound demo queue", "Open", "lead", 40000, "2026-12-01", "p_marcus"],
    ["c_helio", "Arcadia Parts renewal", "Arcadia Parts", "negotiation", 240000, "2026-10-22", "p_priya"],
    ["c_helio", "Cinder peak season", "Cinder Apparel", "won", 120000, "2026-09-20", "p_chris"],
    ["c_vesper", "Hotel June 2027", "Hotel June", "proposal", 48000, "2026-11-01", "p_ruth"],
    ["c_lumen", "Basin Schools option", "Basin Schools", "qualified", 86000, "2026-10-28", "p_samir"],
    ["c_lumen", "Fremont Labs fit-out", "Fremont Labs", "proposal", 140000, "2026-11-20", "p_dana"],
    ["c_atlas", "Keel Capital seat expansion", "Keel Capital", "negotiation", 36000, "2026-10-19", "p_helen"],
    ["c_kite", "Marble Audio rebrand", "Marble Audio", "proposal", 75000, "2026-11-05", "p_owen"],
    ["c_kite", "Lost pitch", "Softlantern", "lost", 50000, "2026-09-02", "p_nora"],
  ]
  const deals: Deal[] = dealRows.map(([companyId, name, customerName, stage, amount, expectedClose, ownerId], index) => ({
    id: `dl_${index + 1}`,
    companyId,
    name,
    customerName,
    stage: stage as Deal["stage"],
    amount: Number(amount),
    expectedClose,
    ownerId,
    probability: stage === "lead" ? 0.1 : stage === "qualified" ? 0.25 : stage === "proposal" ? 0.4 : stage === "negotiation" ? 0.6 : stage === "won" ? 1 : 0,
  }))

  const bankFor = (companyId: string, institution: string, mask: string, ratio: number, index: number) => {
    const cash = latestOf(companyId).cash
    return {
      id: `ba_${companyId}_${index}`,
      companyId,
      institution,
      mask,
      balance: round(cash * ratio),
      currency: "USD",
    }
  }

  const banks = [
    bankFor("c_northglass", "First Meridian Bank", "4412", 0.78, 1),
    bankFor("c_northglass", "Treasury Reserve", "9021", 0.22, 2),
    bankFor("c_helio", "Lakeshore Bank", "1884", 0.7, 1),
    bankFor("c_helio", "Operating Sweep", "1885", 0.3, 2),
    bankFor("c_vesper", "Willamette Credit", "2209", 1, 1),
    bankFor("c_lumen", "Austin National", "7740", 0.8, 1),
    bankFor("c_lumen", "Payroll Account", "7741", 0.2, 2),
    bankFor("c_atlas", "Borough Bank", "3310", 1, 1),
    bankFor("c_kite", "Pacific Studio Bank", "5588", 1, 1),
  ]
  for (const companyId of ["c_northglass", "c_helio", "c_lumen"]) {
    const rows = banks.filter((bank) => bank.companyId === companyId)
    const drift = latestOf(companyId).cash - rows.reduce((sum, bank) => sum + bank.balance, 0)
    rows[0].balance += drift
  }

  const assetRows: [string, string, Asset["category"], number, string, string, string][] = [
    ["c_northglass", "Dispatch patent family", "ip", 920000, "2019-06-01", "USPTO", "Core routing and billing claims."],
    ["c_northglass", "northglass.example", "domain", 45000, "2017-02-11", "Registrar", "Primary brand domain."],
    ["c_helio", "Dock 14 equipment", "equipment", 640000, "2021-04-18", "Chicago, IL", "Forklifts, scales, and yard tractors."],
    ["c_helio", "Minority stake in Paper Route", "equity", 180000, "2024-01-09", "Cap table", "8% of a regional courier."],
    ["c_vesper", "Division Street cafe", "real_estate", 1100000, "2018-09-01", "Portland, OR", "Owned box. Leasehold improvements sit with it."],
    ["c_vesper", "Roaster", "equipment", 86000, "2022-03-14", "Portland, OR", "15-kilo production roaster."],
    ["c_lumen", "Service van fleet", "equipment", 410000, "2023-05-02", "Austin, TX", "Eleven vans, book value after depreciation."],
    ["c_atlas", "Brief archive", "ip", 150000, "2019-11-01", "Brooklyn, NY", "Back catalog of paid research."],
    ["c_kite", "Studio build-out", "other", 70000, "2020-08-20", "Los Angeles, CA", "Leasehold. Landlord consent is on file."],
  ]
  const assets: Asset[] = assetRows.map(([companyId, name, category, bookValue, acquired, location, notes], index) => ({
    id: `as_${index + 1}`,
    companyId,
    name,
    category: category as Asset["category"],
    bookValue: Number(bookValue),
    acquired,
    location,
    notes,
  }))

  return {
    holdcos: [
      {
        id: "h_meridian",
        name: "Meridian Peak",
        legalName: "Meridian Peak Holdings, Inc.",
        jurisdiction: "Delaware",
        entityType: "c-corp",
        founded: "2014",
        fiscalYearEnd: "12-31",
        currency: "USD",
        description: "Operating holdco for software, freight, coffee, and field services. Two watched companies sit outside the stack.",
        hurdleRate: 0.15,
      },
    ],
    companies,
    statements,
    productLines,
    customers,
    invoices,
    vendors,
    bills,
    deals,
    bankAccounts: banks,
    debt: [
      {
        id: "db_helio",
        companyId: "c_helio",
        lender: "First Meridian Bank",
        principal: 1500000,
        rate: 0.0725,
        maturity: "2029-06-30",
        outstanding: 1180000,
        covenantName: "Minimum cash",
        covenantLimit: 500000,
        covenantActual: latestOf("c_helio").cash,
      },
      {
        id: "db_vesper",
        companyId: "c_vesper",
        lender: "Willamette Credit",
        principal: 200000,
        rate: 0.09,
        maturity: "2026-12-15",
        outstanding: 160000,
        covenantName: "Minimum cash",
        covenantLimit: round(latestOf("c_vesper").cash * 1.15),
        covenantActual: latestOf("c_vesper").cash,
      },
    ],
    loans: [
      { id: "ln_1", lenderCompanyId: "c_northglass", borrowerCompanyId: "c_vesper", balance: 250000, rate: 0.06 },
      { id: "ln_2", lenderCompanyId: "c_helio", borrowerCompanyId: "c_lumen", balance: 500000, rate: 0.055 },
    ],
    assets,
    people,
    allocations,
    roles: [
      { id: "or_1", companyId: "c_northglass", title: "Account Executive", status: "interviewing" },
      { id: "or_2", companyId: "c_vesper", title: "Cafe Lead", status: "open" },
      { id: "or_3", companyId: "c_lumen", title: "Field Technician", status: "offer" },
    ],
    work,
    pages: [
      { id: "pg_1", companyId: "c_northglass", kind: "brief", title: "What Northglass sells", body: "Dispatch, billing, and a portal. Price is per site, with a floor. Civic Sites is the reference logo.", updated: "2026-09-18" },
      { id: "pg_2", companyId: "c_northglass", kind: "decision", title: "Hold price on Mesa", body: "Do not discount phase 2 below the current per-site rate. Marcus owns the conversation.", updated: "2026-09-28", reversible: false, reviewDate: "2026-10-30" },
      { id: "pg_3", companyId: "c_helio", kind: "meeting", title: "September lane review", body: "Fuel is the swing factor. Arcadia wants a cap. Priya will take a one-quarter collar, not a year.", updated: "2026-09-22" },
      { id: "pg_4", companyId: "c_vesper", kind: "decision", title: "Tuesday hours cut", body: "Close the Division cafe at 3pm on Tuesdays until payroll is back under 36% of cafe sales.", updated: "2026-09-30", reversible: true, reviewDate: "2026-11-01" },
      { id: "pg_5", companyId: "c_vesper", kind: "sop", title: "Weekly cash note", body: "Ruth sends cash, card batches, and unpaid wholesale every Monday. Amira reads it the same day.", updated: "2026-09-12" },
      { id: "pg_6", companyId: "c_lumen", kind: "brief", title: "Contract versus project", body: "Maintenance is the book. Project work fills gaps and wrecks utilization if it is more than a quarter of hours.", updated: "2026-08-30" },
      { id: "pg_7", companyId: "c_atlas", kind: "meeting", title: "September audience", body: "Sessions fell. Paid share moved. The brief still has to ship. Helen owns the explanation in the pack.", updated: "2026-10-01" },
      { id: "pg_8", companyId: "c_kite", kind: "sop", title: "Portfolio client rule", body: "Holdco companies are billed at the published rate. No silent discounts. Owen signs exceptions.", updated: "2026-07-14" },
    ],
    kpis: [
      { id: "kp_1", companyId: "c_northglass", name: "Net revenue retention", unit: "%", target: 110, actual: 108, direction: "up", kind: "output" },
      { id: "kp_2", companyId: "c_northglass", name: "Logo churn", unit: "%", target: 2, actual: 2.8, direction: "down", kind: "output" },
      { id: "kp_3", companyId: "c_helio", name: "On-time delivery", unit: "%", target: 97, actual: 98.4, direction: "up", kind: "input" },
      { id: "kp_4", companyId: "c_vesper", name: "Same-store sales", unit: "%", target: 4, actual: 1.2, direction: "up", kind: "output" },
      { id: "kp_5", companyId: "c_lumen", name: "Technician utilization", unit: "%", target: 75, actual: 71, direction: "up", kind: "input" },
      { id: "kp_6", companyId: "c_atlas", name: "Paid conversion", unit: "%", target: 3.1, actual: 2.4, direction: "up", kind: "output" },
      { id: "kp_7", companyId: "c_kite", name: "Bench utilization", unit: "%", target: 70, actual: 76, direction: "up", kind: "input" },
    ],
    objectives: [
      { id: "ok_1", companyId: "c_northglass", quarter: "2026 Q4", title: "Defend margin without losing Mesa", ownerId: "p_elena", progress: 0.45, keyResults: ["Hold gross margin above 75%", "Sign Mesa phase 2 at list", "Close the September binder"] },
      { id: "ok_2", companyId: "c_vesper", quarter: "2026 Q4", title: "Get cash back outside six months", ownerId: "p_ruth", progress: 0.2, keyResults: ["Payroll under 36% of sales", "Wholesale price letter out", "No new cafe capex"] },
      { id: "ok_3", companyId: "c_atlas", quarter: "2026 Q4", title: "Explain and reverse the traffic dip", ownerId: "p_helen", progress: 0.35, keyResults: ["Publish the freight brief", "Paid mix back under 30%", "Two new subscription seats"] },
      { id: "ok_4", companyId: "c_lumen", quarter: "2026 Q4", title: "Renew the school contract", ownerId: "p_samir", progress: 0.5, keyResults: ["Utilization back to 75%", "Technician offer accepted"] },
    ],
    events: [
      { id: "ev_1", companyId: "c_northglass", kind: "filing", title: "Delaware franchise tax", due: "2026-10-18", status: "upcoming" },
      { id: "ev_2", companyId: "c_vesper", kind: "insurance", title: "General liability renewal", due: "2026-10-22", status: "upcoming" },
      { id: "ev_3", companyId: "c_helio", kind: "contract", title: "Arcadia master services agreement", due: "2026-10-28", status: "upcoming" },
      { id: "ev_4", companyId: "c_lumen", kind: "board", title: "Quarterly operating review", due: "2026-10-15", status: "upcoming" },
      { id: "ev_5", companyId: "c_atlas", kind: "license", title: "NYC business license", due: "2026-10-09", status: "upcoming" },
      { id: "ev_6", companyId: "c_kite", kind: "insurance", title: "Production insurance", due: "2026-12-01", status: "upcoming" },
      { id: "ev_7", companyId: "c_helio", kind: "filing", title: "Fuel tax return", due: "2026-09-20", status: "done" },
    ],
    risks: [
      { id: "rk_1", companyId: "c_vesper", title: "Cafe labor above gross profit", severity: 5, likelihood: 4, ownerId: "p_ruth", mitigation: "Cut Tuesday hours and reprice wholesale.", status: "open", loss: 180000, limit: 100000 },
      { id: "rk_2", companyId: "c_helio", title: "Fuel collar on Arcadia", severity: 3, likelihood: 4, ownerId: "p_priya", mitigation: "Offer a one-quarter collar only.", status: "mitigating" },
      { id: "rk_3", companyId: "c_northglass", title: "Logo churn above 2%", severity: 3, likelihood: 3, ownerId: "p_marcus", mitigation: "Save desk on the two at-risk logos.", status: "open" },
      { id: "rk_4", companyId: "c_atlas", title: "Paid traffic dependency", severity: 3, likelihood: 4, ownerId: "p_helen", mitigation: "Shift the October brief to organic distribution.", status: "mitigating" },
      { id: "rk_5", companyId: "c_lumen", title: "Single-contract concentration", severity: 4, likelihood: 2, ownerId: "p_samir", mitigation: "Renew Basin and add one project client.", status: "open" },
      { id: "rk_6", companyId: "c_kite", title: "Portfolio client dependence", severity: 2, likelihood: 3, ownerId: "p_owen", mitigation: "Keep outside retainers above 40% of fees.", status: "mitigating" },
    ],
    capTable,
    posts: [
      { id: "po_1", companyId: "c_northglass", platform: "linkedin", title: "How Civic Sites cut invoice lag", published: "2026-09-24", impressions: 18400, engagement: 0.041 },
      { id: "po_2", companyId: "c_northglass", platform: "x", title: "Dispatch note: peak season staffing", published: "2026-09-18", impressions: 9200, engagement: 0.018 },
      { id: "po_3", companyId: "c_helio", platform: "linkedin", title: "Final mile on-time, September", published: "2026-09-29", impressions: 6400, engagement: 0.027 },
      { id: "po_4", companyId: "c_vesper", platform: "instagram", title: "New espresso, same price", published: "2026-09-21", impressions: 22100, engagement: 0.052 },
      { id: "po_5", companyId: "c_lumen", platform: "linkedin", title: "What 75% utilization actually means", published: "2026-09-16", impressions: 4100, engagement: 0.033 },
      { id: "po_6", companyId: "c_atlas", platform: "x", title: "Freight margins are not back", published: "2026-09-27", impressions: 31000, engagement: 0.024 },
      { id: "po_7", companyId: "c_kite", platform: "instagram", title: "Northglass homepage, in progress", published: "2026-09-26", impressions: 12800, engagement: 0.046 },
    ],
    activity: [
      { id: "log_seed", at: "2026-10-02T12:00:00.000Z", message: "September close loaded for the portfolio.", replyToId: null },
      { id: "log_reply", at: "2026-10-02T12:20:00.000Z", message: "Amira: the Vesper cash tie is the one to sign.", replyToId: "log_seed" },
    ],
    capital: {
      deployableCash: 250000,
      priorityCompanyId: "c_vesper",
      callNote: "September call: renew Lumen at the airport, do not staff Kite, and leave the Dallas desk parked. The open question is still the Vesper bridge.",
      callDate: "2026-09-02",
    },
    asks: [
      {
        id: "ask_vesper_bridge",
        companyId: "c_vesper",
        ideaId: null,
        title: "Bridge wholesale terms",
        kind: "cash",
        cashAmount: 75000,
        recommendation: "do",
        conditions: "",
        why: "Cash is pinned and payroll is eating the cafes. A short bridge keeps wholesale shipping.",
        alternatives: "Close a cafe, or stretch payables another month.",
        confidence: "high",
        status: "open",
        decidedAt: null,
        stealsFocus: false,
        focusNote: "",
      },
      {
        id: "ask_atlas_push",
        companyId: "c_atlas",
        ideaId: null,
        title: "Push contributor listings",
        kind: "attention",
        cashAmount: null,
        recommendation: "park",
        conditions: "",
        why: "Listings are thin, but this is not the cash problem.",
        alternatives: "Leave the marketplace to fill on the brief cycle.",
        confidence: "medium",
        status: "open",
        decidedAt: null,
        stealsFocus: true,
        focusNote: "Helen’s week comes off the Vesper cash note.",
      },
      {
        id: "ask_northglass_squad",
        companyId: "c_northglass",
        ideaId: null,
        title: "Second product squad",
        kind: "attention",
        cashAmount: null,
        recommendation: "soft_yes",
        conditions: "After the Vesper bridge.",
        why: "Dispatch can take another squad, but not while the cafes are the priority.",
        alternatives: "Contract the Mesa phase instead of hiring.",
        confidence: "medium",
        status: "open",
        decidedAt: null,
        stealsFocus: true,
        focusNote: "A squad is Elena and Amira, who are on the Vesper bridge.",
      },
      {
        id: "ask_kite_designer",
        companyId: "c_kite",
        ideaId: null,
        title: "Second designer",
        kind: "cash",
        cashAmount: 96000,
        recommendation: "dont",
        conditions: "",
        why: "Kite is not a company we are feeding. A second designer is a new habit.",
        alternatives: "Contract the overflow.",
        confidence: "high",
        status: "decided",
        decidedAt: "2026-08-12",
        stealsFocus: true,
        focusNote: "A hire here is attention that does not come back.",
      },
      {
        id: "ask_helio_dallas",
        companyId: "c_helio",
        ideaId: null,
        title: "Dallas spot desk",
        kind: "cash",
        cashAmount: 180000,
        recommendation: "park",
        conditions: "",
        why: "Chicago lanes still have slack. A new desk is a second book.",
        alternatives: "Tighten the Chicago spot book.",
        confidence: "medium",
        status: "parked",
        decidedAt: "2026-07-20",
        stealsFocus: true,
        focusNote: "A new city is a general manager, not a lane.",
      },
      {
        id: "ask_lumen_airport",
        companyId: "c_lumen",
        ideaId: null,
        title: "Renew the airport contract",
        kind: "attention",
        cashAmount: null,
        recommendation: "do",
        conditions: "",
        why: "Renew at the current margin. Do not buy the work with a discount.",
        alternatives: "Let it lapse and fill with project hours.",
        confidence: "high",
        status: "decided",
        decidedAt: "2026-09-02",
        stealsFocus: false,
        focusNote: "",
      },
    ],
    ideas: [
      {
        id: "id_permit",
        name: "Permit desk for multi-site operators",
        summary: "A one-pager on selling permit tracking next to Northglass dispatch. The buyer is the same operator. The work is research until someone says build.",
        link: "",
        stage: "research",
        killReason: "",
      },
      {
        id: "id_equipment",
        name: "Neighborhood equipment exchange",
        summary: "A listing site for used cafe and field equipment. Looked at supply, repeat listing, and how full a city book would need to be.",
        link: "",
        stage: "weak",
        killReason: "Supply will not list twice. There is no path to density.",
      },
      {
        id: "id_editions",
        name: "City editions of Field Notes",
        summary: "Local editions of the Atlas brief. The audience is real. The editing load is a second product. Park until the marketplace is fuller.",
        link: "",
        stage: "parked",
        killReason: "",
      },
      {
        id: "id_claimable",
        name: "Claimable business pages",
        summary: "Let a listed business claim its Atlas page. Greenlit means we may build it. It is not a company and it is not operating.",
        link: "",
        stage: "greenlit",
        killReason: "",
      },
    ],
    costLines: profiles.flatMap((profile) => {
      const latest = latestOf(profile.id)
      const volume = Math.max(1, latest.conversions)
      const lines: [string, number, number][] = [
        ["Delivery unit", latest.cogs / volume, volume],
        ["Labor block", latest.payroll / 160, 160],
        ["Overhead load", (latest.ga + latest.otherOpex) / volume, volume],
      ]
      return lines.map(([name, unitCost, units], index) => ({
        id: `cost_${profile.id}_${index + 1}`,
        companyId: profile.id,
        period: SEED_AS_OF,
        name,
        unitCost: round(unitCost),
        volume: round(units),
      }))
    }),
    memos: [
      {
        id: "memo_2026-09",
        period: "2026-09",
        changed: "Northglass margin compressed. Atlas revenue fell. Vesper cash is inside six months.",
        doing: "Hold Mesa at list. Reprice Vesper wholesale. Publish the Atlas freight brief.",
        notDoing: "No new cafe capex. No discount on phase 2.",
        signedBy: "",
        signedAt: null,
      },
    ],
    checks: [
      { id: "ck_1", period: "2026-09", label: "Bank balances tie to the cash line", done: true, owner: "Amira Shah" },
      { id: "ck_2", period: "2026-09", label: "Intercompany loans scheduled", done: true, owner: "Jonah Peck" },
      { id: "ck_3", period: "2026-09", label: "Covenants calculated", done: false, owner: "Amira Shah" },
      { id: "ck_4", period: "2026-09", label: "Owner earnings reviewed", done: false, owner: "Elena Voss" },
    ],
    asOf: SEED_AS_OF,
  }
}
