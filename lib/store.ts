"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  ActivityEvent,
  Allocation,
  Asset,
  BankAccount,
  Bill,
  Book,
  CapTableEntry,
  CapitalAsk,
  CapitalSettings,
  Company,
  CorporateEvent,
  Customer,
  Deal,
  DebtFacility,
  HoldingCompany,
  IntercompanyLoan,
  Invoice,
  Idea,
  Kpi,
  MonthlyStatement,
  Objective,
  OpenRole,
  PersonOrAgent,
  ProductLine,
  Risk,
  SocialPost,
  Vendor,
  WikiPage,
  WorkItem,
  WorkStatus,
} from "./types"
import { fillAllocation } from "./capital"
import { todayISO } from "./format"
import { seed } from "./seed"

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}

function note(activity: ActivityEvent[], message: string): ActivityEvent[] {
  return [{ id: uid("log"), at: new Date().toISOString(), message }, ...activity].slice(0, 250)
}

function patchById<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>) {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
}

type Data = Book

interface Actions {
  setAsOf: (period: string) => void
  reset: () => void
  addHoldco: (input: Omit<HoldingCompany, "id">) => string
  updateHoldco: (id: string, patch: Partial<HoldingCompany>) => void
  deleteHoldco: (id: string) => void
  addCompany: (input: Omit<Company, "id">) => string
  updateCompany: (id: string, patch: Partial<Company>) => void
  deleteCompany: (id: string) => void
  upsertStatement: (input: Omit<MonthlyStatement, "id"> & { id?: string }) => string
  deleteStatement: (id: string) => void
  addProductLine: (input: Omit<ProductLine, "id">) => string
  updateProductLine: (id: string, patch: Partial<ProductLine>) => void
  deleteProductLine: (id: string) => void
  addCustomer: (input: Omit<Customer, "id">) => string
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  addInvoice: (input: Omit<Invoice, "id">) => string
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  addVendor: (input: Omit<Vendor, "id">) => string
  updateVendor: (id: string, patch: Partial<Vendor>) => void
  deleteVendor: (id: string) => void
  addBill: (input: Omit<Bill, "id">) => string
  updateBill: (id: string, patch: Partial<Bill>) => void
  deleteBill: (id: string) => void
  addDeal: (input: Omit<Deal, "id">) => string
  updateDeal: (id: string, patch: Partial<Deal>) => void
  deleteDeal: (id: string) => void
  addBank: (input: Omit<BankAccount, "id">) => string
  updateBank: (id: string, patch: Partial<BankAccount>) => void
  deleteBank: (id: string) => void
  addDebt: (input: Omit<DebtFacility, "id">) => string
  updateDebt: (id: string, patch: Partial<DebtFacility>) => void
  deleteDebt: (id: string) => void
  addLoan: (input: Omit<IntercompanyLoan, "id">) => string
  updateLoan: (id: string, patch: Partial<IntercompanyLoan>) => void
  deleteLoan: (id: string) => void
  addAsset: (input: Omit<Asset, "id">) => string
  updateAsset: (id: string, patch: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  addPerson: (input: Omit<PersonOrAgent, "id">, allocation?: { companyId: string; percent: number }) => string
  updatePerson: (id: string, patch: Partial<PersonOrAgent>) => void
  deletePerson: (id: string) => void
  addAllocation: (input: Omit<Allocation, "id">) => string
  updateAllocation: (id: string, patch: Partial<Allocation>) => void
  deleteAllocation: (id: string) => void
  addRole: (input: Omit<OpenRole, "id">) => string
  updateRole: (id: string, patch: Partial<OpenRole>) => void
  deleteRole: (id: string) => void
  addWork: (input: Omit<WorkItem, "id">) => string
  updateWork: (id: string, patch: Partial<WorkItem>) => void
  deleteWork: (id: string) => void
  moveWork: (id: string, status: WorkStatus) => void
  addPage: (input: Omit<WikiPage, "id" | "updated">) => string
  updatePage: (id: string, patch: Partial<WikiPage>) => void
  deletePage: (id: string) => void
  addKpi: (input: Omit<Kpi, "id">) => string
  updateKpi: (id: string, patch: Partial<Kpi>) => void
  deleteKpi: (id: string) => void
  addObjective: (input: Omit<Objective, "id">) => string
  updateObjective: (id: string, patch: Partial<Objective>) => void
  deleteObjective: (id: string) => void
  addEvent: (input: Omit<CorporateEvent, "id">) => string
  updateEvent: (id: string, patch: Partial<CorporateEvent>) => void
  deleteEvent: (id: string) => void
  addRisk: (input: Omit<Risk, "id">) => string
  updateRisk: (id: string, patch: Partial<Risk>) => void
  deleteRisk: (id: string) => void
  addCap: (input: Omit<CapTableEntry, "id">) => string
  updateCap: (id: string, patch: Partial<CapTableEntry>) => void
  deleteCap: (id: string) => void
  addPost: (input: Omit<SocialPost, "id">) => string
  updatePost: (id: string, patch: Partial<SocialPost>) => void
  deletePost: (id: string) => void
  updateCapital: (patch: Partial<CapitalSettings>) => void
  addAsk: (input: Omit<CapitalAsk, "id">) => string
  updateAsk: (id: string, patch: Partial<CapitalAsk>) => void
  deleteAsk: (id: string) => void
  addIdea: (input: Omit<Idea, "id">) => string
  updateIdea: (id: string, patch: Partial<Idea>) => void
  deleteIdea: (id: string) => void
}

export type Portfolio = Data & Actions

function dropCompany(data: Data, id: string): Partial<Data> {
  const byCompany = <T extends { companyId: string }>(rows: T[]) => rows.filter((row) => row.companyId !== id)
  return {
    companies: data.companies
      .filter((company) => company.id !== id)
      .map((company) => (company.parentCompanyId === id ? { ...company, parentCompanyId: null } : company)),
    statements: byCompany(data.statements),
    productLines: byCompany(data.productLines),
    customers: byCompany(data.customers),
    invoices: byCompany(data.invoices),
    vendors: byCompany(data.vendors),
    bills: byCompany(data.bills),
    deals: byCompany(data.deals),
    bankAccounts: byCompany(data.bankAccounts),
    debt: byCompany(data.debt),
    loans: data.loans.filter((loan) => loan.lenderCompanyId !== id && loan.borrowerCompanyId !== id),
    assets: byCompany(data.assets),
    people: data.people.filter((person) => person.homeCompanyId !== id),
    allocations: data.allocations.filter((row) => row.companyId !== id),
    roles: byCompany(data.roles),
    work: byCompany(data.work),
    pages: byCompany(data.pages),
    kpis: byCompany(data.kpis),
    objectives: byCompany(data.objectives),
    events: byCompany(data.events),
    risks: byCompany(data.risks),
    capTable: byCompany(data.capTable),
    posts: byCompany(data.posts),
  }
}

const DATA_KEYS: (keyof Data)[] = [
  "holdcos",
  "companies",
  "statements",
  "productLines",
  "customers",
  "invoices",
  "vendors",
  "bills",
  "deals",
  "bankAccounts",
  "debt",
  "loans",
  "assets",
  "people",
  "allocations",
  "roles",
  "work",
  "pages",
  "kpis",
  "objectives",
  "events",
  "risks",
  "capTable",
  "posts",
  "activity",
  "capital",
  "asks",
  "ideas",
  "asOf",
]

function normalizeAsk(ask: CapitalAsk): CapitalAsk {
  const status = ask.status
  return {
    ...ask,
    cashAmount: ask.kind === "attention" ? null : ask.cashAmount,
    decidedAt: status === "open" ? null : ask.decidedAt || todayISO(),
    conditions: ask.recommendation === "soft_yes" ? ask.conditions : "",
  }
}

function mergePersisted(persisted: unknown, current: Portfolio): Portfolio {
  if (!persisted || typeof persisted !== "object") return current
  const saved = persisted as Partial<Book>
  return { ...current, ...saved, ...fillAllocation(saved, seed()) }
}

export const usePortfolio = create<Portfolio>()(
  persist(
    (set) => ({
      ...seed(),
      setAsOf: (period) => set({ asOf: period }),
      reset: () => set({ ...seed(), activity: note(seed().activity, "Book reset to the September close.") }),
      addHoldco: (input) => {
        const id = uid("h")
        set((state) => ({
          holdcos: [...state.holdcos, { ...input, id }],
          activity: note(state.activity, `Opened holding company ${input.name}.`),
        }))
        return id
      },
      updateHoldco: (id, patch) =>
        set((state) => ({
          holdcos: patchById(state.holdcos, id, patch),
          activity: note(state.activity, "Updated a holding company."),
        })),
      deleteHoldco: (id) =>
        set((state) => ({
          holdcos: state.holdcos.filter((holdco) => holdco.id !== id),
          companies: state.companies.map((company) =>
            company.holdcoId === id ? { ...company, holdcoId: null, parentCompanyId: null } : company,
          ),
          activity: note(state.activity, "Removed a holding company. Its companies are now standalone."),
        })),
      addCompany: (input) => {
        const id = uid("c")
        set((state) => ({
          companies: [...state.companies, { ...input, id }],
          activity: note(state.activity, `Added ${input.name}.`),
        }))
        return id
      },
      updateCompany: (id, patch) =>
        set((state) => ({
          companies: patchById(state.companies, id, patch),
          activity: note(state.activity, "Updated a company."),
        })),
      deleteCompany: (id) =>
        set((state) => {
          const company = state.companies.find((item) => item.id === id)
          return {
            ...dropCompany(state, id),
            capital: state.capital.priorityCompanyId === id ? { ...state.capital, priorityCompanyId: null } : state.capital,
            activity: note(state.activity, `Removed ${company?.name ?? "company"} and its records.`),
          }
        }),
      upsertStatement: (input) => {
        const existing = input.id
        const id = existing || uid("st")
        set((state) => {
          const match = state.statements.find(
            (row) => row.id === id || (row.companyId === input.companyId && row.period === input.period),
          )
          const next = { ...input, id: match?.id ?? id }
          return {
            statements: match
              ? state.statements.map((row) => (row.id === match.id ? next : row))
              : [...state.statements, next],
            activity: note(state.activity, `Saved ${input.period} statement.`),
          }
        })
        return id
      },
      deleteStatement: (id) =>
        set((state) => ({
          statements: state.statements.filter((row) => row.id !== id),
          activity: note(state.activity, "Removed a statement month."),
        })),
      addProductLine: (input) => {
        const id = uid("pr")
        set((state) => ({
          productLines: [...state.productLines, { ...input, id }],
          activity: note(state.activity, `Added product line ${input.name}.`),
        }))
        return id
      },
      updateProductLine: (id, patch) => set((state) => ({ productLines: patchById(state.productLines, id, patch) })),
      deleteProductLine: (id) => set((state) => ({ productLines: state.productLines.filter((row) => row.id !== id) })),
      addCustomer: (input) => {
        const id = uid("cu")
        set((state) => ({
          customers: [...state.customers, { ...input, id }],
          activity: note(state.activity, `Added customer ${input.name}.`),
        }))
        return id
      },
      updateCustomer: (id, patch) => set((state) => ({ customers: patchById(state.customers, id, patch) })),
      deleteCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((row) => row.id !== id),
          invoices: state.invoices.filter((row) => row.customerId !== id),
          activity: note(state.activity, "Removed a customer."),
        })),
      addInvoice: (input) => {
        const id = uid("in")
        set((state) => ({
          invoices: [...state.invoices, { ...input, id }],
          activity: note(state.activity, `Recorded invoice ${input.number}.`),
        }))
        return id
      },
      updateInvoice: (id, patch) => set((state) => ({ invoices: patchById(state.invoices, id, patch) })),
      deleteInvoice: (id) => set((state) => ({ invoices: state.invoices.filter((row) => row.id !== id) })),
      addVendor: (input) => {
        const id = uid("ve")
        set((state) => ({
          vendors: [...state.vendors, { ...input, id }],
          activity: note(state.activity, `Added vendor ${input.name}.`),
        }))
        return id
      },
      updateVendor: (id, patch) => set((state) => ({ vendors: patchById(state.vendors, id, patch) })),
      deleteVendor: (id) =>
        set((state) => ({
          vendors: state.vendors.filter((row) => row.id !== id),
          bills: state.bills.filter((row) => row.vendorId !== id),
        })),
      addBill: (input) => {
        const id = uid("bi")
        set((state) => ({
          bills: [...state.bills, { ...input, id }],
          activity: note(state.activity, `Recorded bill ${input.number}.`),
        }))
        return id
      },
      updateBill: (id, patch) => set((state) => ({ bills: patchById(state.bills, id, patch) })),
      deleteBill: (id) => set((state) => ({ bills: state.bills.filter((row) => row.id !== id) })),
      addDeal: (input) => {
        const id = uid("dl")
        set((state) => ({ deals: [...state.deals, { ...input, id }] }))
        return id
      },
      updateDeal: (id, patch) => set((state) => ({ deals: patchById(state.deals, id, patch) })),
      deleteDeal: (id) => set((state) => ({ deals: state.deals.filter((row) => row.id !== id) })),
      addBank: (input) => {
        const id = uid("ba")
        set((state) => ({
          bankAccounts: [...state.bankAccounts, { ...input, id }],
          activity: note(state.activity, `Added ${input.institution} · ${input.mask}.`),
        }))
        return id
      },
      updateBank: (id, patch) => set((state) => ({ bankAccounts: patchById(state.bankAccounts, id, patch) })),
      deleteBank: (id) => set((state) => ({ bankAccounts: state.bankAccounts.filter((row) => row.id !== id) })),
      addDebt: (input) => {
        const id = uid("db")
        set((state) => ({ debt: [...state.debt, { ...input, id }] }))
        return id
      },
      updateDebt: (id, patch) => set((state) => ({ debt: patchById(state.debt, id, patch) })),
      deleteDebt: (id) => set((state) => ({ debt: state.debt.filter((row) => row.id !== id) })),
      addLoan: (input) => {
        const id = uid("ln")
        set((state) => ({ loans: [...state.loans, { ...input, id }] }))
        return id
      },
      updateLoan: (id, patch) => set((state) => ({ loans: patchById(state.loans, id, patch) })),
      deleteLoan: (id) => set((state) => ({ loans: state.loans.filter((row) => row.id !== id) })),
      addAsset: (input) => {
        const id = uid("as")
        set((state) => ({
          assets: [...state.assets, { ...input, id }],
          activity: note(state.activity, `Booked asset ${input.name}.`),
        }))
        return id
      },
      updateAsset: (id, patch) => set((state) => ({ assets: patchById(state.assets, id, patch) })),
      deleteAsset: (id) => set((state) => ({ assets: state.assets.filter((row) => row.id !== id) })),
      addPerson: (input, allocation) => {
        const id = uid(input.kind === "agent" ? "a" : "p")
        set((state) => ({
          people: [...state.people, { ...input, id }],
          allocations: allocation
            ? [...state.allocations, { id: uid("al"), personId: id, companyId: allocation.companyId, percent: allocation.percent }]
            : state.allocations,
          activity: note(state.activity, `Added ${input.kind} ${input.name}.`),
        }))
        return id
      },
      updatePerson: (id, patch) => set((state) => ({ people: patchById(state.people, id, patch) })),
      deletePerson: (id) =>
        set((state) => ({
          people: state.people.filter((row) => row.id !== id),
          allocations: state.allocations.filter((row) => row.personId !== id),
          work: state.work.map((row) => (row.assigneeId === id ? { ...row, assigneeId: null } : row)),
          activity: note(state.activity, "Removed a person or agent."),
        })),
      addAllocation: (input) => {
        const id = uid("al")
        set((state) => ({ allocations: [...state.allocations, { ...input, id }] }))
        return id
      },
      updateAllocation: (id, patch) => set((state) => ({ allocations: patchById(state.allocations, id, patch) })),
      deleteAllocation: (id) => set((state) => ({ allocations: state.allocations.filter((row) => row.id !== id) })),
      addRole: (input) => {
        const id = uid("or")
        set((state) => ({ roles: [...state.roles, { ...input, id }] }))
        return id
      },
      updateRole: (id, patch) => set((state) => ({ roles: patchById(state.roles, id, patch) })),
      deleteRole: (id) => set((state) => ({ roles: state.roles.filter((row) => row.id !== id) })),
      addWork: (input) => {
        const id = uid("wk")
        set((state) => ({
          work: [...state.work, { ...input, id }],
          activity: note(state.activity, `Opened work: ${input.title}.`),
        }))
        return id
      },
      updateWork: (id, patch) => set((state) => ({ work: patchById(state.work, id, patch) })),
      deleteWork: (id) => set((state) => ({ work: state.work.filter((row) => row.id !== id) })),
      moveWork: (id, status) => set((state) => ({ work: patchById(state.work, id, { status }) })),
      addPage: (input) => {
        const id = uid("pg")
        set((state) => ({
          pages: [...state.pages, { ...input, id, updated: new Date().toISOString().slice(0, 10) }],
          activity: note(state.activity, `Wrote “${input.title}”.`),
        }))
        return id
      },
      updatePage: (id, patch) =>
        set((state) => ({
          pages: patchById(state.pages, id, { ...patch, updated: new Date().toISOString().slice(0, 10) }),
        })),
      deletePage: (id) => set((state) => ({ pages: state.pages.filter((row) => row.id !== id) })),
      addKpi: (input) => {
        const id = uid("kp")
        set((state) => ({ kpis: [...state.kpis, { ...input, id }] }))
        return id
      },
      updateKpi: (id, patch) => set((state) => ({ kpis: patchById(state.kpis, id, patch) })),
      deleteKpi: (id) => set((state) => ({ kpis: state.kpis.filter((row) => row.id !== id) })),
      addObjective: (input) => {
        const id = uid("ok")
        set((state) => ({ objectives: [...state.objectives, { ...input, id }] }))
        return id
      },
      updateObjective: (id, patch) => set((state) => ({ objectives: patchById(state.objectives, id, patch) })),
      deleteObjective: (id) => set((state) => ({ objectives: state.objectives.filter((row) => row.id !== id) })),
      addEvent: (input) => {
        const id = uid("ev")
        set((state) => ({ events: [...state.events, { ...input, id }] }))
        return id
      },
      updateEvent: (id, patch) => set((state) => ({ events: patchById(state.events, id, patch) })),
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((row) => row.id !== id) })),
      addRisk: (input) => {
        const id = uid("rk")
        set((state) => ({ risks: [...state.risks, { ...input, id }] }))
        return id
      },
      updateRisk: (id, patch) => set((state) => ({ risks: patchById(state.risks, id, patch) })),
      deleteRisk: (id) => set((state) => ({ risks: state.risks.filter((row) => row.id !== id) })),
      addCap: (input) => {
        const id = uid("cap")
        set((state) => ({ capTable: [...state.capTable, { ...input, id }] }))
        return id
      },
      updateCap: (id, patch) => set((state) => ({ capTable: patchById(state.capTable, id, patch) })),
      deleteCap: (id) => set((state) => ({ capTable: state.capTable.filter((row) => row.id !== id) })),
      addPost: (input) => {
        const id = uid("po")
        set((state) => ({ posts: [...state.posts, { ...input, id }] }))
        return id
      },
      updatePost: (id, patch) => set((state) => ({ posts: patchById(state.posts, id, patch) })),
      deletePost: (id) => set((state) => ({ posts: state.posts.filter((row) => row.id !== id) })),
      updateCapital: (patch) =>
        set((state) => ({
          capital: {
            ...state.capital,
            ...patch,
            deployableCash: Math.max(0, patch.deployableCash ?? state.capital.deployableCash),
          },
          activity: note(state.activity, "Updated the capital call."),
        })),
      addAsk: (input) => {
        const id = uid("ask")
        set((state) => ({
          asks: [...state.asks, normalizeAsk({ ...input, id })],
          activity: note(state.activity, `Logged ask ${input.title}.`),
        }))
        return id
      },
      updateAsk: (id, patch) =>
        set((state) => ({
          asks: state.asks.map((ask) => (ask.id === id ? normalizeAsk({ ...ask, ...patch, id }) : ask)),
          activity: note(state.activity, "Updated a capital ask."),
        })),
      deleteAsk: (id) =>
        set((state) => {
          const ask = state.asks.find((row) => row.id === id)
          if (!ask || ask.status !== "open") return {}
          return {
            asks: state.asks.filter((row) => row.id !== id),
            activity: note(state.activity, `Removed open ask ${ask.title}.`),
          }
        }),
      addIdea: (input) => {
        const id = uid("id")
        set((state) => ({
          ideas: [...state.ideas, { ...input, id }],
          activity: note(state.activity, `Shelved idea ${input.name}.`),
        }))
        return id
      },
      updateIdea: (id, patch) =>
        set((state) => ({
          ideas: patchById(state.ideas, id, patch),
          activity: note(state.activity, "Updated an idea."),
        })),
      deleteIdea: (id) =>
        set((state) => {
          const idea = state.ideas.find((row) => row.id === id)
          if (!idea || idea.stage !== "research") return {}
          return {
            ideas: state.ideas.filter((row) => row.id !== id),
            activity: note(state.activity, `Removed research idea ${idea.name}.`),
          }
        }),
    }),
    {
      name: "holdco-terminal-v1",
      merge: mergePersisted,
      partialize: (state) => {
        const data: Partial<Data> = {}
        for (const key of DATA_KEYS) data[key] = state[key] as never
        return data as Data
      },
    },
  ),
)
