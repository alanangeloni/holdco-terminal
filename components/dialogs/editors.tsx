"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HEALTH_LABEL, RECOMMENDATION_LABEL, STAGE_LABEL, CONFIDENCE_LABEL } from "@/lib/capital"
import { todayISO } from "@/lib/format"
import { cloneStatement, emptySocialBook, plugEquity, shiftPeriod } from "@/lib/metrics"
import { usePortfolio } from "@/lib/store"
import type {
  AskKind,
  AskStatus,
  Asset,
  AssetCategory,
  BankAccount,
  Bill,
  BusinessModel,
  CapitalAsk,
  Company,
  CompanyStatus,
  Confidence,
  CorporateEvent,
  Customer,
  Deal,
  DocStatus,
  EntityType,
  EventKind,
  HealthTier,
  HoldingCompany,
  Idea,
  IdeaStage,
  Invoice,
  MarketplaceProfile,
  MonthlyStatement,
  PersonOrAgent,
  Platform,
  ProductLine,
  Recommendation,
  Risk,
  SocialPost,
  Vendor,
  WikiKind,
  WikiPage,
  WorkItem,
  WorkStatus,
} from "@/lib/types"
import { PLATFORMS } from "@/lib/types"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] tracking-wider text-amber uppercase">{label}</span>
      {children}
    </label>
  )
}

function Choose({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function EditorFrame({
  title,
  description,
  onClose,
  onSubmit,
  children,
  wide = false,
}: {
  title: string
  description: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <DialogContent className={`max-h-[88vh] overflow-y-auto ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
      <DialogHeader>
        <DialogTitle className="font-mono text-sm tracking-wide text-amber">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function textInput(value: string, onChange: (value: string) => void, props?: { type?: string; required?: boolean }) {
  return (
    <Input
      value={value}
      required={props?.required}
      type={props?.type ?? "text"}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 font-mono text-xs"
    />
  )
}

function n(value: string) {
  const parsed = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const ENTITIES: { value: EntityType; label: string }[] = [
  { value: "c-corp", label: "C-Corp" },
  { value: "s-corp", label: "S-Corp" },
  { value: "llc", label: "LLC" },
  { value: "ltd", label: "Ltd" },
  { value: "lp", label: "LP" },
]
const MODELS: { value: BusinessModel; label: string }[] = [
  { value: "saas", label: "SaaS" },
  { value: "services", label: "Services" },
  { value: "commerce", label: "Commerce" },
  { value: "marketplace", label: "Marketplace" },
  { value: "other", label: "Other" },
]
const STATUSES: { value: CompanyStatus; label: string }[] = [
  { value: "operating", label: "Operating" },
  { value: "dormant", label: "Dormant" },
  { value: "exited", label: "Exited" },
]
const HEALTHS: { value: HealthTier; label: string }[] = [
  { value: "grow", label: HEALTH_LABEL.grow },
  { value: "hold", label: HEALTH_LABEL.hold },
  { value: "fix", label: HEALTH_LABEL.fix },
  { value: "stop", label: HEALTH_LABEL.stop },
]
const DOC: { value: DocStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
]

export function ConfirmDialog({
  open,
  title,
  body,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-amber">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HoldcoDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: HoldingCompany | null
}) {
  const add = usePortfolio((state) => state.addHoldco)
  const update = usePortfolio((state) => state.updateHoldco)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <HoldcoForm
          initial={initial}
          onClose={() => onOpenChange(false)}
          onSave={(input) => {
            if (initial?.id) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function HoldcoForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: HoldingCompany | null
  onClose: () => void
  onSave: (input: Omit<HoldingCompany, "id">) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [legalName, setLegalName] = useState(initial?.legalName ?? "")
  const [jurisdiction, setJurisdiction] = useState(initial?.jurisdiction ?? "Delaware")
  const [entityType, setEntityType] = useState<EntityType>(initial?.entityType ?? "c-corp")
  const [founded, setFounded] = useState(initial?.founded ?? "2026")
  const [fiscalYearEnd, setFiscalYearEnd] = useState(initial?.fiscalYearEnd ?? "12-31")
  const [currency, setCurrency] = useState(initial?.currency ?? "USD")
  const [description, setDescription] = useState(initial?.description ?? "")
  return (
    <EditorFrame
      title={initial ? "Edit holding company" : "New holding company"}
      description="The holdco is the owner. Operating numbers live on the companies underneath it."
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return
        onSave({
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          jurisdiction,
          entityType,
          founded,
          fiscalYearEnd,
          currency: currency.trim() || "USD",
          description,
        })
      }}
    >
      <Field label="Name">{textInput(name, setName, { required: true })}</Field>
      <Field label="Legal name">{textInput(legalName, setLegalName)}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jurisdiction">{textInput(jurisdiction, setJurisdiction)}</Field>
        <Field label="Entity">
          <Choose value={entityType} onChange={(value) => setEntityType(value as EntityType)} options={ENTITIES} />
        </Field>
        <Field label="Founded">{textInput(founded, setFounded)}</Field>
        <Field label="Fiscal year end">{textInput(fiscalYearEnd, setFiscalYearEnd)}</Field>
        <Field label="Currency">{textInput(currency, setCurrency)}</Field>
      </div>
      <Field label="Description">
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="text-sm" />
      </Field>
    </EditorFrame>
  )
}

export function CompanyDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<Company> | null
}) {
  const add = usePortfolio((state) => state.addCompany)
  const update = usePortfolio((state) => state.updateCompany)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CompanyForm
          initial={initial}
          onClose={() => onOpenChange(false)}
          onSave={(input) => {
            if (initial?.id) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function CompanyForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<Company> | null
  onClose: () => void
  onSave: (input: Omit<Company, "id">) => void
}) {
  const holdcos = usePortfolio((state) => state.holdcos)
  const companies = usePortfolio((state) => state.companies)
  const [name, setName] = useState(initial?.name ?? "")
  const [legalName, setLegalName] = useState(initial?.legalName ?? "")
  const [holdcoId, setHoldcoId] = useState(initial?.holdcoId ?? "none")
  const [parentCompanyId, setParentCompanyId] = useState(initial?.parentCompanyId ?? "none")
  const [industry, setIndustry] = useState(initial?.industry ?? "")
  const [businessModel, setBusinessModel] = useState<BusinessModel>(initial?.businessModel ?? "services")
  const [status, setStatus] = useState<CompanyStatus>(initial?.status ?? "operating")
  const [health, setHealth] = useState<HealthTier>(initial?.health ?? "hold")
  const [hq, setHq] = useState(initial?.hq ?? "")
  const [website, setWebsite] = useState(initial?.website ?? "")
  const [ownershipPct, setOwnershipPct] = useState(String(initial?.ownershipPct ?? 100))
  const [entityType, setEntityType] = useState<EntityType>(initial?.entityType ?? "c-corp")
  const [founded, setFounded] = useState(initial?.founded ?? "2026")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [officers, setOfficers] = useState(
    (initial?.officers ?? []).map((officer) => `${officer.name} | ${officer.title}`).join("\n"),
  )
  const parents = companies.filter((company) => company.id !== initial?.id && (holdcoId === "none" || company.holdcoId === holdcoId))
  return (
    <EditorFrame
      title={initial?.id ? "Edit company" : holdcoId !== "none" ? "Add subsidiary" : "Add company"}
      description="A subsidiary sits under a holdco. Leave the holdco blank for a standalone company."
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return
        onSave({
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          holdcoId: holdcoId === "none" ? null : holdcoId,
          parentCompanyId: parentCompanyId === "none" ? null : parentCompanyId,
          industry,
          businessModel,
          status,
          health,
          hq,
          website,
          ownershipPct: n(ownershipPct),
          entityType,
          founded,
          description,
          marketplace: initial?.marketplace ?? null,
          officers: officers
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [officerName, title] = line.split("|").map((part) => part.trim())
              return { name: officerName || "Officer", title: title || "Officer" }
            }),
        })
      }}
    >
      <Field label="Name">{textInput(name, setName, { required: true })}</Field>
      <Field label="Legal name">{textInput(legalName, setLegalName)}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Holding company">
          <Choose
            value={holdcoId ?? "none"}
            onChange={setHoldcoId}
            options={[{ value: "none", label: "Standalone" }, ...holdcos.map((holdco) => ({ value: holdco.id, label: holdco.name }))]}
          />
        </Field>
        <Field label="Parent company">
          <Choose
            value={parentCompanyId ?? "none"}
            onChange={setParentCompanyId}
            options={[{ value: "none", label: "None" }, ...parents.map((company) => ({ value: company.id, label: company.name }))]}
          />
        </Field>
        <Field label="Industry">{textInput(industry, setIndustry)}</Field>
        <Field label="Model">
          <Choose value={businessModel} onChange={(value) => setBusinessModel(value as BusinessModel)} options={MODELS} />
        </Field>
        <Field label="Status">
          <Choose value={status} onChange={(value) => setStatus(value as CompanyStatus)} options={STATUSES} />
        </Field>
        <Field label="Health">
          <Choose value={health} onChange={(value) => setHealth(value as HealthTier)} options={HEALTHS} />
        </Field>
        <Field label="Entity">
          <Choose value={entityType} onChange={(value) => setEntityType(value as EntityType)} options={ENTITIES} />
        </Field>
        <Field label="Ownership %">{textInput(ownershipPct, setOwnershipPct, { type: "number" })}</Field>
        <Field label="Founded">{textInput(founded, setFounded)}</Field>
        <Field label="HQ">{textInput(hq, setHq)}</Field>
        <Field label="Website">{textInput(website, setWebsite)}</Field>
      </div>
      <Field label="Officers (Name | Title)">
        <Textarea value={officers} onChange={(event) => setOfficers(event.target.value)} className="font-mono text-xs" />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
    </EditorFrame>
  )
}

const STATEMENT_FIELDS: { key: keyof MonthlyStatement; label: string; group: string }[] = [
  ["revenue", "Revenue", "P&L"],
  ["cogs", "COGS", "P&L"],
  ["payroll", "Payroll", "P&L"],
  ["marketing", "Marketing", "P&L"],
  ["ga", "G&A", "P&L"],
  ["otherOpex", "Other opex", "P&L"],
  ["interest", "Interest", "P&L"],
  ["tax", "Tax", "P&L"],
  ["depreciation", "Depreciation", "Owner"],
  ["maintenanceCapex", "Maintenance capex", "Owner"],
  ["budgetRevenue", "Budget revenue", "Budget"],
  ["budgetCogs", "Budget COGS", "Budget"],
  ["budgetPayroll", "Budget payroll", "Budget"],
  ["budgetMarketing", "Budget marketing", "Budget"],
  ["budgetGa", "Budget G&A", "Budget"],
  ["budgetOtherOpex", "Budget other", "Budget"],
  ["budgetInterest", "Budget interest", "Budget"],
  ["budgetTax", "Budget tax", "Budget"],
  ["cash", "Cash", "Balance sheet"],
  ["ar", "Accounts receivable", "Balance sheet"],
  ["inventory", "Inventory", "Balance sheet"],
  ["otherAssets", "Other assets", "Balance sheet"],
  ["fixedAssets", "Fixed assets", "Balance sheet"],
  ["intangibles", "Intangibles", "Balance sheet"],
  ["ap", "Accounts payable", "Balance sheet"],
  ["accrued", "Accrued", "Balance sheet"],
  ["shortDebt", "Short debt", "Balance sheet"],
  ["longDebt", "Long debt", "Balance sheet"],
  ["cfo", "Cash from operations", "Cash flow"],
  ["cfi", "Cash from investing", "Cash flow"],
  ["cff", "Cash from financing", "Cash flow"],
  ["sessions", "Sessions", "Audience"],
  ["users", "Users", "Audience"],
  ["pageviews", "Pageviews", "Audience"],
  ["bounceRate", "Bounce rate (0-1)", "Audience"],
  ["conversions", "Conversions", "Audience"],
  ["channelOrganic", "Organic sessions", "Channels"],
  ["channelPaid", "Paid sessions", "Channels"],
  ["channelDirect", "Direct sessions", "Channels"],
  ["channelReferral", "Referral sessions", "Channels"],
  ["channelSocial", "Social sessions", "Channels"],
].map(([key, label, group]) => ({ key: key as keyof MonthlyStatement, label, group }))

export function StatementDialog({
  open,
  onOpenChange,
  companyId,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  initial?: MonthlyStatement | null
}) {
  const upsert = usePortfolio((state) => state.upsertStatement)
  const statements = usePortfolio((state) => state.statements)
  const asOf = usePortfolio((state) => state.asOf)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <StatementForm
          companyId={companyId}
          initial={initial}
          statements={statements}
          asOf={asOf}
          onClose={() => onOpenChange(false)}
          onSave={(statement) => {
            upsert(statement)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function StatementForm({
  companyId,
  initial,
  statements,
  asOf,
  onClose,
  onSave,
}: {
  companyId: string
  initial?: MonthlyStatement | null
  statements: MonthlyStatement[]
  asOf: string
  onClose: () => void
  onSave: (statement: Omit<MonthlyStatement, "id"> & { id?: string }) => void
}) {
  const mine = statements.filter((statement) => statement.companyId === companyId).sort((a, b) => a.period.localeCompare(b.period))
  const latest = mine.at(-1)
  const suggested = mine.some((statement) => statement.period === asOf) ? shiftPeriod(mine.at(-1)?.period ?? asOf, 1) : asOf
  const base = initial ?? (latest ? { ...cloneStatement(latest), period: suggested, id: "" } : null)
  const [period, setPeriod] = useState(base?.period ?? asOf)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const field of STATEMENT_FIELDS) next[field.key] = String(base?.[field.key] ?? 0)
    const social = base?.social ?? emptySocialBook()
    for (const platform of PLATFORMS) {
      next[`${platform}_followers`] = String(social[platform].followers)
      next[`${platform}_impressions`] = String(social[platform].impressions)
      next[`${platform}_engagement`] = String(social[platform].engagement)
      next[`${platform}_posts`] = String(social[platform].posts)
    }
    return next
  })
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
  const groups = [...new Set(STATEMENT_FIELDS.map((field) => field.group))]
  return (
    <EditorFrame
      wide
      title={initial?.id ? `Edit ${initial.period}` : "Add a statement month"}
      description="Equity is plugged so assets equal liabilities plus equity. A month that already exists is overwritten."
      onClose={onClose}
      onSubmit={() => {
        const social = emptySocialBook()
        for (const platform of PLATFORMS) {
          social[platform] = {
            followers: n(values[`${platform}_followers`]),
            impressions: n(values[`${platform}_impressions`]),
            engagement: n(values[`${platform}_engagement`]),
            posts: n(values[`${platform}_posts`]),
          }
        }
        const draft = {
          id: initial?.id,
          companyId,
          period,
          social,
        } as Omit<MonthlyStatement, "id"> & { id?: string }
        for (const field of STATEMENT_FIELDS) {
          ;(draft as unknown as Record<string, number>)[field.key] = n(values[field.key])
        }
        onSave(plugEquity(draft as MonthlyStatement))
      }}
    >
      <Field label="Period">{textInput(period, setPeriod, { type: "month", required: true })}</Field>
      {groups.map((group) => (
        <div key={group} className="grid gap-2">
          <div className="text-[10px] tracking-[0.16em] text-steel uppercase">{group}</div>
          <div className="grid gap-2 sm:grid-cols-4">
            {STATEMENT_FIELDS.filter((field) => field.group === group).map((field) => (
              <Field key={field.key} label={field.label}>
                {textInput(values[field.key] ?? "0", (value) => set(field.key, value), { type: "number" })}
              </Field>
            ))}
          </div>
        </div>
      ))}
      <div className="text-[10px] tracking-[0.16em] text-steel uppercase">Social</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <div key={platform} className="grid grid-cols-2 gap-2 border border-border p-2">
            <div className="col-span-2 font-mono text-[10px] text-amber uppercase">{platform}</div>
            {(["followers", "impressions", "engagement", "posts"] as const).map((metric) => (
              <Field key={metric} label={metric}>
                {textInput(values[`${platform}_${metric}`] ?? "0", (value) => set(`${platform}_${metric}`, value), { type: "number" })}
              </Field>
            ))}
          </div>
        ))}
      </div>
    </EditorFrame>
  )
}

export function CustomerDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: Customer | null }) {
  const add = usePortfolio((state) => state.addCustomer)
  const update = usePortfolio((state) => state.updateCustomer)
  const companies = usePortfolio((state) => state.companies)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SimpleCompanyForm
          title={initial ? "Edit customer" : "Add customer"}
          description="Customers explain the receivable. They do not rewrite the closed AR balance."
          companies={companies}
          companyId={initial?.companyId ?? companyId ?? companies[0]?.id ?? ""}
          onClose={() => onOpenChange(false)}
          initial={initial}
          fields={[
            ["name", "Name", initial?.name ?? ""],
            ["segment", "Segment", initial?.segment ?? ""],
            ["since", "Customer since", initial?.since ?? "2026-01-01"],
          ]}
          onSave={(id, values) => {
            const input = { companyId: id, name: values.name, segment: values.segment, since: values.since }
            if (initial) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function SimpleCompanyForm({
  title,
  description,
  companies,
  companyId,
  fields,
  onClose,
  onSave,
}: {
  title: string
  description: string
  companies: Company[]
  companyId: string
  initial?: unknown
  fields: [string, string, string, ("text" | "number" | "date")?][]
  onClose: () => void
  onSave: (companyId: string, values: Record<string, string>) => void
}) {
  const [company, setCompany] = useState(companyId)
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(fields.map(([key, , value]) => [key, value])))
  return (
    <EditorFrame title={title} description={description} onClose={onClose} onSubmit={() => onSave(company, values)}>
      <Field label="Company">
        <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
      </Field>
      {fields.map(([key, label, , type]) => (
        <Field key={key} label={label}>
          {textInput(values[key] ?? "", (value) => setValues((current) => ({ ...current, [key]: value })), { type: type === "number" ? "number" : type === "date" ? "date" : "text", required: key === "name" || key === "title" })}
        </Field>
      ))}
    </EditorFrame>
  )
}

export function InvoiceDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: Invoice | null }) {
  const add = usePortfolio((state) => state.addInvoice)
  const update = usePortfolio((state) => state.updateInvoice)
  const companies = usePortfolio((state) => state.companies)
  const customers = usePortfolio((state) => state.customers)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <InvoiceForm
          companies={companies}
          customers={customers}
          companyId={initial?.companyId ?? companyId ?? companies[0]?.id ?? ""}
          initial={initial}
          onClose={() => onOpenChange(false)}
          onSave={(input) => {
            if (initial) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function InvoiceForm({
  companies,
  customers,
  companyId,
  initial,
  onClose,
  onSave,
}: {
  companies: Company[]
  customers: Customer[]
  companyId: string
  initial?: Invoice | null
  onClose: () => void
  onSave: (input: Omit<Invoice, "id">) => void
}) {
  const [company, setCompany] = useState(companyId)
  const options = customers.filter((customer) => customer.companyId === company)
  const [customerId, setCustomerId] = useState(initial?.customerId ?? options[0]?.id ?? "")
  const [number, setNumber] = useState(initial?.number ?? "")
  const [issue, setIssue] = useState(initial?.issue ?? "2026-10-01")
  const [due, setDue] = useState(initial?.due ?? "2026-10-31")
  const [amount, setAmount] = useState(String(initial?.amount ?? 0))
  const [status, setStatus] = useState<DocStatus>(initial?.status ?? "open")
  const currentCustomers = customers.filter((customer) => customer.companyId === company)
  const selected = currentCustomers.some((customer) => customer.id === customerId) ? customerId : currentCustomers[0]?.id ?? ""
  return (
    <EditorFrame
      title={initial ? "Edit invoice" : "Add invoice"}
      description="Open and overdue invoices drive the aging chart."
      onClose={onClose}
      onSubmit={() => {
        if (!selected) return
        onSave({ companyId: company, customerId: selected, number: number || "INV-NEW", issue, due, amount: n(amount), status })
      }}
    >
      <Field label="Company">
        <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
      </Field>
      <Field label="Customer">
        <Choose value={selected || "none"} onChange={setCustomerId} options={currentCustomers.length ? currentCustomers.map((customer) => ({ value: customer.id, label: customer.name })) : [{ value: "none", label: "Add a customer first" }]} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Number">{textInput(number, setNumber)}</Field>
        <Field label="Amount">{textInput(amount, setAmount, { type: "number" })}</Field>
        <Field label="Issued">{textInput(issue, setIssue, { type: "date" })}</Field>
        <Field label="Due">{textInput(due, setDue, { type: "date" })}</Field>
        <Field label="Status">
          <Choose value={status} onChange={(value) => setStatus(value as DocStatus)} options={DOC} />
        </Field>
      </div>
    </EditorFrame>
  )
}

export function VendorDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: Vendor | null }) {
  const add = usePortfolio((state) => state.addVendor)
  const update = usePortfolio((state) => state.updateVendor)
  const companies = usePortfolio((state) => state.companies)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SimpleCompanyForm
          title={initial ? "Edit vendor" : "Add vendor"}
          description="Vendors explain the payable."
          companies={companies}
          companyId={initial?.companyId ?? companyId ?? companies[0]?.id ?? ""}
          fields={[
            ["name", "Name", initial?.name ?? ""],
            ["category", "Category", initial?.category ?? "Software"],
          ]}
          onClose={() => onOpenChange(false)}
          onSave={(id, values) => {
            const input = { companyId: id, name: values.name, category: values.category }
            if (initial) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

export function BillDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: Bill | null }) {
  const add = usePortfolio((state) => state.addBill)
  const update = usePortfolio((state) => state.updateBill)
  const companies = usePortfolio((state) => state.companies)
  const vendors = usePortfolio((state) => state.vendors)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <BillForm
          companies={companies}
          vendors={vendors}
          companyId={initial?.companyId ?? companyId ?? companies[0]?.id ?? ""}
          initial={initial}
          onClose={() => onOpenChange(false)}
          onSave={(input) => {
            if (initial) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function BillForm({
  companies,
  vendors,
  companyId,
  initial,
  onClose,
  onSave,
}: {
  companies: Company[]
  vendors: Vendor[]
  companyId: string
  initial?: Bill | null
  onClose: () => void
  onSave: (input: Omit<Bill, "id">) => void
}) {
  const [company, setCompany] = useState(companyId)
  const current = vendors.filter((vendor) => vendor.companyId === company)
  const [vendorId, setVendorId] = useState(initial?.vendorId ?? current[0]?.id ?? "")
  const [number, setNumber] = useState(initial?.number ?? "")
  const [issue, setIssue] = useState(initial?.issue ?? "2026-10-01")
  const [due, setDue] = useState(initial?.due ?? "2026-10-31")
  const [amount, setAmount] = useState(String(initial?.amount ?? 0))
  const [status, setStatus] = useState<DocStatus>(initial?.status ?? "open")
  const [category, setCategory] = useState(initial?.category ?? "Software")
  const selected = current.some((vendor) => vendor.id === vendorId) ? vendorId : current[0]?.id ?? ""
  return (
    <EditorFrame
      title={initial ? "Edit bill" : "Add bill"}
      description="Bills are the open detail behind accounts payable."
      onClose={onClose}
      onSubmit={() => {
        if (!selected) return
        onSave({ companyId: company, vendorId: selected, number: number || "BILL-NEW", issue, due, amount: n(amount), status, category })
      }}
    >
      <Field label="Company">
        <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
      </Field>
      <Field label="Vendor">
        <Choose value={selected || "none"} onChange={setVendorId} options={current.length ? current.map((vendor) => ({ value: vendor.id, label: vendor.name })) : [{ value: "none", label: "Add a vendor first" }]} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Number">{textInput(number, setNumber)}</Field>
        <Field label="Amount">{textInput(amount, setAmount, { type: "number" })}</Field>
        <Field label="Issued">{textInput(issue, setIssue, { type: "date" })}</Field>
        <Field label="Due">{textInput(due, setDue, { type: "date" })}</Field>
        <Field label="Category">{textInput(category, setCategory)}</Field>
        <Field label="Status">
          <Choose value={status} onChange={(value) => setStatus(value as DocStatus)} options={DOC} />
        </Field>
      </div>
    </EditorFrame>
  )
}

export function BankDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: BankAccount | null }) {
  const add = usePortfolio((state) => state.addBank)
  const update = usePortfolio((state) => state.updateBank)
  const companies = usePortfolio((state) => state.companies)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SimpleCompanyForm
          title={initial ? "Edit account" : "Add bank account"}
          description="Treasury cash is the sum of accounts. It sits beside the closed cash balance."
          companies={companies}
          companyId={initial?.companyId ?? companyId ?? companies[0]?.id ?? ""}
          fields={[
            ["institution", "Institution", initial?.institution ?? ""],
            ["mask", "Account mask", initial?.mask ?? ""],
            ["balance", "Balance", String(initial?.balance ?? 0), "number"],
            ["currency", "Currency", initial?.currency ?? "USD"],
          ]}
          onClose={() => onOpenChange(false)}
          onSave={(id, values) => {
            const input = { companyId: id, institution: values.institution, mask: values.mask, balance: n(values.balance), currency: values.currency || "USD" }
            if (initial) update(initial.id, input)
            else add(input)
            onOpenChange(false)
          }}
        />
      ) : null}
    </Dialog>
  )
}

const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "equity", label: "Equity stake" },
  { value: "ip", label: "IP" },
  { value: "real_estate", label: "Real estate" },
  { value: "equipment", label: "Equipment" },
  { value: "domain", label: "Domain" },
  { value: "inventory", label: "Inventory" },
  { value: "other", label: "Other" },
]

export function AssetDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: Asset | null }) {
  const add = usePortfolio((state) => state.addAsset)
  const update = usePortfolio((state) => state.updateAsset)
  const companies = usePortfolio((state) => state.companies)
  const [company, setCompany] = useState(initial?.companyId ?? companyId ?? companies[0]?.id ?? "")
  const [name, setName] = useState(initial?.name ?? "")
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? "equipment")
  const [bookValue, setBookValue] = useState(String(initial?.bookValue ?? 0))
  const [acquired, setAcquired] = useState(initial?.acquired ?? "2026-01-01")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title={initial ? "Edit asset" : "Add asset"}
        description="Book value by company. Cash stays on the treasury desk."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const input = { companyId: company, name, category, bookValue: n(bookValue), acquired, location, notes }
          if (initial) update(initial.id, input)
          else add(input)
          onOpenChange(false)
        }}
      >
        <Field label="Company">
          <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
        </Field>
        <Field label="Name">{textInput(name, setName, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Choose value={category} onChange={(value) => setCategory(value as AssetCategory)} options={ASSET_CATEGORIES} />
          </Field>
          <Field label="Book value">{textInput(bookValue, setBookValue, { type: "number" })}</Field>
          <Field label="Acquired">{textInput(acquired, setAcquired, { type: "date" })}</Field>
          <Field label="Location">{textInput(location, setLocation)}</Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </EditorFrame>
    </Dialog>
  )
}

export function PersonDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: PersonOrAgent | null }) {
  const add = usePortfolio((state) => state.addPerson)
  const update = usePortfolio((state) => state.updatePerson)
  const companies = usePortfolio((state) => state.companies)
  const people = usePortfolio((state) => state.people)
  const allocations = usePortfolio((state) => state.allocations)
  const addAllocation = usePortfolio((state) => state.addAllocation)
  const [name, setName] = useState(initial?.name ?? "")
  const [kind, setKind] = useState<"person" | "agent">(initial?.kind ?? "person")
  const [role, setRole] = useState(initial?.role ?? "")
  const [status, setStatus] = useState<"active" | "inactive">(initial?.status ?? "active")
  const [home, setHome] = useState(initial?.homeCompanyId ?? companyId ?? companies[0]?.id ?? "")
  const [reportsTo, setReportsTo] = useState(initial?.reportsToId ?? "none")
  const [annualCost, setAnnualCost] = useState(String(initial?.annualCost ?? 0))
  const [runtime, setRuntime] = useState(initial?.runtime ?? "")
  const [monthlyRuns, setMonthlyRuns] = useState(String(initial?.monthlyRuns ?? 0))
  const existingAlloc = allocations.find((row) => row.personId === initial?.id && (!companyId || row.companyId === companyId))
  const [allocCompany, setAllocCompany] = useState(existingAlloc?.companyId ?? companyId ?? home)
  const [percent, setPercent] = useState(String(existingAlloc?.percent ?? 100))
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title={initial ? "Edit person" : "Add person or agent"}
        description="Allocation is how a person or agent shows up on a company's roster."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const input = {
            name,
            kind,
            role,
            status,
            reportsToId: reportsTo === "none" ? null : reportsTo,
            annualCost: n(annualCost),
            homeCompanyId: home,
            runtime: kind === "agent" ? runtime : "",
            monthlyRuns: kind === "agent" ? n(monthlyRuns) : 0,
          }
          if (initial) {
            update(initial.id, input)
            if (!existingAlloc) addAllocation({ personId: initial.id, companyId: allocCompany, percent: n(percent) })
          } else {
            add(input, { companyId: allocCompany || home, percent: n(percent) })
          }
          onOpenChange(false)
        }}
      >
        <Field label="Name">{textInput(name, setName, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <Choose value={kind} onChange={(value) => setKind(value as "person" | "agent")} options={[{ value: "person", label: "Person" }, { value: "agent", label: "Agent" }]} />
          </Field>
          <Field label="Status">
            <Choose value={status} onChange={(value) => setStatus(value as "active" | "inactive")} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          </Field>
          <Field label="Role">{textInput(role, setRole)}</Field>
          <Field label="Annual cost">{textInput(annualCost, setAnnualCost, { type: "number" })}</Field>
          <Field label="Home company">
            <Choose value={home} onChange={setHome} options={companies.map((company) => ({ value: company.id, label: company.name }))} />
          </Field>
          <Field label="Reports to">
            <Choose value={reportsTo} onChange={setReportsTo} options={[{ value: "none", label: "Nobody" }, ...people.filter((person) => person.id !== initial?.id).map((person) => ({ value: person.id, label: person.name }))]} />
          </Field>
          <Field label="Allocated to">
            <Choose value={allocCompany} onChange={setAllocCompany} options={companies.map((company) => ({ value: company.id, label: company.name }))} />
          </Field>
          <Field label="Allocation %">{textInput(percent, setPercent, { type: "number" })}</Field>
          {kind === "agent" ? (
            <>
              <Field label="Runtime">{textInput(runtime, setRuntime)}</Field>
              <Field label="Monthly runs">{textInput(monthlyRuns, setMonthlyRuns, { type: "number" })}</Field>
            </>
          ) : null}
        </div>
      </EditorFrame>
    </Dialog>
  )
}

export function WorkDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: WorkItem | null }) {
  const add = usePortfolio((state) => state.addWork)
  const update = usePortfolio((state) => state.updateWork)
  const companies = usePortfolio((state) => state.companies)
  const people = usePortfolio((state) => state.people)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [company, setCompany] = useState(initial?.companyId ?? companyId ?? companies[0]?.id ?? "")
  const [assignee, setAssignee] = useState(initial?.assigneeId ?? "none")
  const [status, setStatus] = useState<WorkStatus>(initial?.status ?? "backlog")
  const [due, setDue] = useState(initial?.due ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [priority, setPriority] = useState(String(initial?.priority ?? 2))
  const [doneNote, setDoneNote] = useState(initial?.doneNote ?? "")
  const [nextNote, setNextNote] = useState(initial?.nextNote ?? "")
  const [stuckNote, setStuckNote] = useState(initial?.stuckNote ?? "")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title={initial ? "Edit work" : "Add work"}
        description="Who is on what. Assignees can be people or agents."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const input = {
            title,
            companyId: company,
            assigneeId: assignee === "none" ? null : assignee,
            status,
            due: due || null,
            notes,
            priority: n(priority),
            doneNote,
            nextNote,
            stuckNote,
            dependsOnId: initial?.dependsOnId ?? null,
          }
          if (initial) update(initial.id, input)
          else add(input)
          onOpenChange(false)
        }}
      >
        <Field label="Title">{textInput(title, setTitle, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Assignee">
            <Choose value={assignee} onChange={setAssignee} options={[{ value: "none", label: "Unassigned" }, ...people.map((person) => ({ value: person.id, label: `${person.name} · ${person.kind}` }))]} />
          </Field>
          <Field label="Status">
            <Choose value={status} onChange={(value) => setStatus(value as WorkStatus)} options={[{ value: "backlog", label: "Backlog" }, { value: "doing", label: "Doing" }, { value: "blocked", label: "Blocked" }, { value: "done", label: "Done" }]} />
          </Field>
          <Field label="Due">{textInput(due, setDue, { type: "date" })}</Field>
          <Field label="Priority">{textInput(priority, setPriority, { type: "number" })}</Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Field label="Done">{textInput(doneNote, setDoneNote)}</Field>
        <Field label="Next">{textInput(nextNote, setNextNote)}</Field>
        <Field label="Stuck">{textInput(stuckNote, setStuckNote)}</Field>
      </EditorFrame>
    </Dialog>
  )
}

export function WikiDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string; initial?: WikiPage | null }) {
  const add = usePortfolio((state) => state.addPage)
  const update = usePortfolio((state) => state.updatePage)
  const companies = usePortfolio((state) => state.companies)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [company, setCompany] = useState(initial?.companyId ?? companyId ?? companies[0]?.id ?? "")
  const [kind, setKind] = useState<WikiKind>(initial?.kind ?? "brief")
  const [body, setBody] = useState(initial?.body ?? "")
  const [reversible, setReversible] = useState(initial?.reversible === false ? "no" : "yes")
  const [reviewDate, setReviewDate] = useState(initial?.reviewDate ?? "")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title={initial ? "Edit page" : "New page"}
        description="Briefs, meetings, decisions, and SOPs. Markdown is stored as written."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const input = { title, companyId: company, kind, body, reversible: kind === "decision" ? reversible === "yes" : undefined, reviewDate: kind === "decision" ? reviewDate : undefined }
          if (initial) update(initial.id, input)
          else add(input)
          onOpenChange(false)
        }}
      >
        <Field label="Title">{textInput(title, setTitle, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Kind">
            <Choose value={kind} onChange={(value) => setKind(value as WikiKind)} options={[{ value: "brief", label: "Brief" }, { value: "meeting", label: "Meeting" }, { value: "decision", label: "Decision" }, { value: "sop", label: "SOP" }]} />
          </Field>
        </div>
        {kind === "decision" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Reversible">
              <Choose value={reversible} onChange={setReversible} options={[{ value: "yes", label: "Reversible" }, { value: "no", label: "One way" }]} />
            </Field>
            <Field label="Review date">{textInput(reviewDate, setReviewDate, { type: "date" })}</Field>
          </div>
        ) : null}
        <Field label="Body">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-40 font-mono text-xs" />
        </Field>
      </EditorFrame>
    </Dialog>
  )
}

export function ProductDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId: string }) {
  const add = usePortfolio((state) => state.addProductLine)
  const asOf = usePortfolio((state) => state.asOf)
  const [name, setName] = useState("")
  const [revenue, setRevenue] = useState("0")
  const [user, setUser] = useState("")
  const [problem, setProblem] = useState("")
  const [bet, setBet] = useState("")
  const [killCriterion, setKillCriterion] = useState("")
  const [retention, setRetention] = useState("0.8")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add product line"
        description="Revenue for the as-of month. Add more months later by editing the line in the book."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const line: Omit<ProductLine, "id"> = { companyId, name, monthly: [{ period: asOf, revenue: n(revenue) }], user, problem, bet, killCriterion, retention: n(retention) }
          add(line)
          onOpenChange(false)
        }}
      >
        <Field label="Name">{textInput(name, setName, { required: true })}</Field>
        <Field label={`Revenue in ${asOf}`}>{textInput(revenue, setRevenue, { type: "number" })}</Field>
        <Field label="User">{textInput(user, setUser)}</Field>
        <Field label="Problem">{textInput(problem, setProblem)}</Field>
        <Field label="Bet">{textInput(bet, setBet)}</Field>
        <Field label="Kill criterion">{textInput(killCriterion, setKillCriterion)}</Field>
        <Field label="Retention (0-1)">{textInput(retention, setRetention, { type: "number" })}</Field>
      </EditorFrame>
    </Dialog>
  )
}

export function DealDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string }) {
  const add = usePortfolio((state) => state.addDeal)
  const companies = usePortfolio((state) => state.companies)
  const people = usePortfolio((state) => state.people)
  const [company, setCompany] = useState(companyId ?? companies[0]?.id ?? "")
  const [name, setName] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [stage, setStage] = useState<Deal["stage"]>("lead")
  const [amount, setAmount] = useState("0")
  const [expectedClose, setExpectedClose] = useState("2026-11-15")
  const [ownerId, setOwnerId] = useState(people[0]?.id ?? "none")
  const [probability, setProbability] = useState("0.4")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add deal"
        description="Pipeline stages from lead through won or lost."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          add({ companyId: company, name, customerName, stage, amount: n(amount), expectedClose, ownerId: ownerId === "none" ? null : ownerId, probability: n(probability) })
          onOpenChange(false)
        }}
      >
        <Field label="Name">{textInput(name, setName, { required: true })}</Field>
        <Field label="Customer">{textInput(customerName, setCustomerName)}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Stage">
            <Choose value={stage} onChange={(value) => setStage(value as Deal["stage"])} options={["lead", "qualified", "proposal", "negotiation", "won", "lost"].map((value) => ({ value, label: value }))} />
          </Field>
          <Field label="Amount">{textInput(amount, setAmount, { type: "number" })}</Field>
          <Field label="Expected close">{textInput(expectedClose, setExpectedClose, { type: "date" })}</Field>
          <Field label="Owner">
            <Choose value={ownerId} onChange={setOwnerId} options={[{ value: "none", label: "Unassigned" }, ...people.map((person) => ({ value: person.id, label: person.name }))]} />
          </Field>
          <Field label="Probability (0-1)">{textInput(probability, setProbability, { type: "number" })}</Field>
        </div>
      </EditorFrame>
    </Dialog>
  )
}

export function PostDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string }) {
  const add = usePortfolio((state) => state.addPost)
  const companies = usePortfolio((state) => state.companies)
  const [company, setCompany] = useState(companyId ?? companies[0]?.id ?? "")
  const [platform, setPlatform] = useState<Platform>("linkedin")
  const [title, setTitle] = useState("")
  const [published, setPublished] = useState("2026-10-02")
  const [impressions, setImpressions] = useState("0")
  const [engagement, setEngagement] = useState("0.02")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add post"
        description="A published post with impressions and engagement rate."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          const post: Omit<SocialPost, "id"> = { companyId: company, platform, title, published, impressions: n(impressions), engagement: n(engagement) }
          add(post)
          onOpenChange(false)
        }}
      >
        <Field label="Title">{textInput(title, setTitle, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Platform">
            <Choose value={platform} onChange={(value) => setPlatform(value as Platform)} options={PLATFORMS.map((value) => ({ value, label: value }))} />
          </Field>
          <Field label="Published">{textInput(published, setPublished, { type: "date" })}</Field>
          <Field label="Impressions">{textInput(impressions, setImpressions, { type: "number" })}</Field>
          <Field label="Engagement rate">{textInput(engagement, setEngagement, { type: "number" })}</Field>
        </div>
      </EditorFrame>
    </Dialog>
  )
}

export function KpiDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string }) {
  const add = usePortfolio((state) => state.addKpi)
  const companies = usePortfolio((state) => state.companies)
  const [company, setCompany] = useState(companyId ?? companies[0]?.id ?? "")
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("%")
  const [target, setTarget] = useState("0")
  const [actual, setActual] = useState("0")
  const [direction, setDirection] = useState<"up" | "down">("up")
  const [kind, setKind] = useState<"input" | "output">("output")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add KPI"
        description="Off-target KPIs show up as alerts."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          add({ companyId: company, name, unit, target: n(target), actual: n(actual), direction, kind })
          onOpenChange(false)
        }}
      >
        <Field label="Name">{textInput(name, setName, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Unit">{textInput(unit, setUnit)}</Field>
          <Field label="Target">{textInput(target, setTarget, { type: "number" })}</Field>
          <Field label="Actual">{textInput(actual, setActual, { type: "number" })}</Field>
          <Field label="Better when">
            <Choose value={direction} onChange={(value) => setDirection(value as "up" | "down")} options={[{ value: "up", label: "Higher" }, { value: "down", label: "Lower" }]} />
          </Field>
          <Field label="Kind">
            <Choose value={kind} onChange={(value) => setKind(value as "input" | "output")} options={[{ value: "input", label: "Input" }, { value: "output", label: "Output" }]} />
          </Field>
        </div>
      </EditorFrame>
    </Dialog>
  )
}

export function EventDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string }) {
  const add = usePortfolio((state) => state.addEvent)
  const companies = usePortfolio((state) => state.companies)
  const [company, setCompany] = useState(companyId ?? companies[0]?.id ?? "")
  const [kind, setKind] = useState<EventKind>("filing")
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("2026-10-31")
  const [status, setStatus] = useState<CorporateEvent["status"]>("upcoming")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add corporate date"
        description="Filings, insurance, contracts, licenses, and board dates."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          add({ companyId: company, kind, title, due, status })
          onOpenChange(false)
        }}
      >
        <Field label="Title">{textInput(title, setTitle, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Kind">
            <Choose value={kind} onChange={(value) => setKind(value as EventKind)} options={["filing", "insurance", "contract", "license", "board"].map((value) => ({ value, label: value }))} />
          </Field>
          <Field label="Due">{textInput(due, setDue, { type: "date" })}</Field>
          <Field label="Status">
            <Choose value={status} onChange={(value) => setStatus(value as CorporateEvent["status"])} options={[{ value: "upcoming", label: "Upcoming" }, { value: "done", label: "Done" }, { value: "overdue", label: "Overdue" }]} />
          </Field>
        </div>
      </EditorFrame>
    </Dialog>
  )
}

export function RiskDialog({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: string }) {
  const add = usePortfolio((state) => state.addRisk)
  const companies = usePortfolio((state) => state.companies)
  const people = usePortfolio((state) => state.people)
  const [company, setCompany] = useState(companyId ?? companies[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState("3")
  const [likelihood, setLikelihood] = useState("3")
  const [ownerId, setOwnerId] = useState(people[0]?.id ?? "none")
  const [mitigation, setMitigation] = useState("")
  const [status, setStatus] = useState<Risk["status"]>("open")
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorFrame
        title="Add risk"
        description="Severity and likelihood are 1 to 5. The matrix plots both."
        onClose={() => onOpenChange(false)}
        onSubmit={() => {
          add({
            companyId: company,
            title,
            severity: Math.min(5, Math.max(1, n(severity))),
            likelihood: Math.min(5, Math.max(1, n(likelihood))),
            ownerId: ownerId === "none" ? null : ownerId,
            mitigation,
            status,
          })
          onOpenChange(false)
        }}
      >
        <Field label="Title">{textInput(title, setTitle, { required: true })}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Choose value={company} onChange={setCompany} options={companies.map((item) => ({ value: item.id, label: item.name }))} />
          </Field>
          <Field label="Owner">
            <Choose value={ownerId} onChange={setOwnerId} options={[{ value: "none", label: "Unassigned" }, ...people.map((person) => ({ value: person.id, label: person.name }))]} />
          </Field>
          <Field label="Severity 1-5">{textInput(severity, setSeverity, { type: "number" })}</Field>
          <Field label="Likelihood 1-5">{textInput(likelihood, setLikelihood, { type: "number" })}</Field>
          <Field label="Status">
            <Choose value={status} onChange={(value) => setStatus(value as Risk["status"])} options={[{ value: "open", label: "Open" }, { value: "mitigating", label: "Mitigating" }, { value: "closed", label: "Closed" }]} />
          </Field>
        </div>
        <Field label="Mitigation">
          <Textarea value={mitigation} onChange={(event) => setMitigation(event.target.value)} />
        </Field>
      </EditorFrame>
    </Dialog>
  )
}

const RECS: { value: Recommendation; label: string }[] = [
  { value: "do", label: RECOMMENDATION_LABEL.do },
  { value: "dont", label: RECOMMENDATION_LABEL.dont },
  { value: "park", label: RECOMMENDATION_LABEL.park },
  { value: "soft_yes", label: RECOMMENDATION_LABEL.soft_yes },
]
const CONFIDENCE: { value: Confidence; label: string }[] = [
  { value: "low", label: CONFIDENCE_LABEL.low },
  { value: "medium", label: CONFIDENCE_LABEL.medium },
  { value: "high", label: CONFIDENCE_LABEL.high },
]
const ASK_STATUS: { value: AskStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "decided", label: "Decided" },
  { value: "parked", label: "Parked" },
]
const STAGES: { value: IdeaStage; label: string }[] = [
  { value: "research", label: STAGE_LABEL.research },
  { value: "weak", label: STAGE_LABEL.weak },
  { value: "parked", label: STAGE_LABEL.parked },
  { value: "greenlit", label: STAGE_LABEL.greenlit },
]

export function AskDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: CapitalAsk | null
}) {
  const add = usePortfolio((state) => state.addAsk)
  const update = usePortfolio((state) => state.updateAsk)
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AskForm
        initial={initial}
        onClose={() => onOpenChange(false)}
        onSave={(input) => {
          if (initial?.id) update(initial.id, input)
          else add(input)
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}

function AskForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: CapitalAsk | null
  onClose: () => void
  onSave: (input: Omit<CapitalAsk, "id">) => void
}) {
  const companies = usePortfolio((state) => state.companies)
  const ideas = usePortfolio((state) => state.ideas)
  const sealed = initial?.status === "decided" || initial?.status === "parked"
  const [subjectKind, setSubjectKind] = useState(initial?.ideaId ? "idea" : "company")
  const [companyId, setCompanyId] = useState(initial?.companyId ?? companies[0]?.id ?? "none")
  const [ideaId, setIdeaId] = useState(initial?.ideaId ?? ideas[0]?.id ?? "none")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [kind, setKind] = useState<AskKind>(initial?.kind ?? "cash")
  const [cashAmount, setCashAmount] = useState(initial?.cashAmount != null ? String(initial.cashAmount) : "")
  const [recommendation, setRecommendation] = useState<Recommendation>(initial?.recommendation ?? "do")
  const [conditions, setConditions] = useState(initial?.conditions ?? "")
  const [why, setWhy] = useState(initial?.why ?? "")
  const [alternatives, setAlternatives] = useState(initial?.alternatives ?? "")
  const [confidence, setConfidence] = useState<Confidence>(initial?.confidence ?? "medium")
  const [status, setStatus] = useState<AskStatus>(initial?.status ?? "open")
  const [decidedAt, setDecidedAt] = useState(initial?.decidedAt ?? todayISO())
  const [stealsFocus, setStealsFocus] = useState(initial?.stealsFocus ? "yes" : "no")
  const [focusNote, setFocusNote] = useState(initial?.focusNote ?? "")
  return (
    <EditorFrame
      wide
      title={initial?.id ? "Edit ask" : "New ask"}
      description="Cash, or time and attention only. A kill or a park stays in the log."
      onClose={onClose}
      onSubmit={() => {
        if (!title.trim()) return
        if (recommendation === "soft_yes" && !conditions.trim()) return
        const forCompany = subjectKind === "company" && companyId !== "none"
        const forIdea = subjectKind === "idea" && ideaId !== "none"
        if (!forCompany && !forIdea) return
        onSave({
          companyId: forCompany ? companyId : null,
          ideaId: forIdea ? ideaId : null,
          title: title.trim(),
          kind,
          cashAmount: kind === "cash" ? n(cashAmount) : null,
          recommendation,
          conditions: recommendation === "soft_yes" ? conditions.trim() : "",
          why: why.trim(),
          alternatives: alternatives.trim(),
          confidence,
          status: sealed ? initial!.status : status,
          decidedAt: (sealed ? initial!.status : status) === "open" ? null : decidedAt || todayISO(),
          stealsFocus: stealsFocus === "yes",
          focusNote: focusNote.trim(),
        })
      }}
    >
      <Field label="What they want">
        {sealed ? <div className="flex h-8 items-center font-mono text-xs">{title}</div> : textInput(title, setTitle, { required: true })}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="For">
          {sealed ? (
            <div className="flex h-8 items-center font-mono text-xs">{subjectKind === "idea" ? "Idea" : "Company"}</div>
          ) : (
            <Choose
              value={subjectKind}
              onChange={setSubjectKind}
              options={[{ value: "company", label: "Company" }, { value: "idea", label: "Idea" }]}
            />
          )}
        </Field>
        {subjectKind === "company" ? (
          <Field label="Company">
            {sealed ? (
              <div className="flex h-8 items-center font-mono text-xs">{companies.find((company) => company.id === companyId)?.name ?? "Former company"}</div>
            ) : (
              <Choose
                value={companyId}
                onChange={setCompanyId}
                options={companies.length ? companies.map((company) => ({ value: company.id, label: company.name })) : [{ value: "none", label: "No companies" }]}
              />
            )}
          </Field>
        ) : (
          <Field label="Idea">
            {sealed ? (
              <div className="flex h-8 items-center font-mono text-xs">{ideas.find((idea) => idea.id === ideaId)?.name ?? "Former idea"}</div>
            ) : (
              <Choose
                value={ideaId}
                onChange={setIdeaId}
                options={ideas.length ? ideas.map((idea) => ({ value: idea.id, label: idea.name })) : [{ value: "none", label: "No ideas yet" }]}
              />
            )}
          </Field>
        )}
        <Field label="Kind">
          {sealed ? (
            <div className="flex h-8 items-center font-mono text-xs">{kind === "attention" ? "Attention only" : "Cash"}</div>
          ) : (
            <Choose value={kind} onChange={(value) => setKind(value as AskKind)} options={[{ value: "cash", label: "Cash" }, { value: "attention", label: "Attention only" }]} />
          )}
        </Field>
        {kind === "cash" ? (
          <Field label="Cash amount">
            {sealed ? <div className="flex h-8 items-center font-mono text-xs">{cashAmount || "0"}</div> : textInput(cashAmount, setCashAmount, { type: "number" })}
          </Field>
        ) : <div />}
        <Field label="Recommendation">
          {sealed ? (
            <div className="flex h-8 items-center font-mono text-xs">{RECOMMENDATION_LABEL[recommendation]}</div>
          ) : (
            <Choose value={recommendation} onChange={(value) => setRecommendation(value as Recommendation)} options={RECS} />
          )}
        </Field>
        <Field label="Confidence">
          <Choose value={confidence} onChange={(value) => setConfidence(value as Confidence)} options={CONFIDENCE} />
        </Field>
        {sealed ? (
          <Field label="Status">
            <div className="flex h-8 items-center font-mono text-xs uppercase">{initial?.status}</div>
          </Field>
        ) : (
          <Field label="Status">
            <Choose value={status} onChange={(value) => setStatus(value as AskStatus)} options={ASK_STATUS} />
          </Field>
        )}
        {!sealed && status !== "open" ? <Field label="Date decided">{textInput(decidedAt, setDecidedAt, { type: "date" })}</Field> : null}
        {sealed && initial?.decidedAt ? (
          <Field label="Date decided">
            <div className="flex h-8 items-center font-mono text-xs">{initial.decidedAt}</div>
          </Field>
        ) : null}
        <Field label="Steals focus from #1">
          {sealed ? (
            <div className="flex h-8 items-center font-mono text-xs">{stealsFocus === "yes" ? "Yes" : "No"}</div>
          ) : (
            <Choose value={stealsFocus} onChange={setStealsFocus} options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
          )}
        </Field>
      </div>
      {recommendation === "soft_yes" ? <Field label="Conditions">{textInput(conditions, setConditions, { required: true })}</Field> : null}
      <Field label="Why">
        <Textarea value={why} onChange={(event) => setWhy(event.target.value)} />
      </Field>
      <Field label="What else we considered">
        <Textarea value={alternatives} onChange={(event) => setAlternatives(event.target.value)} />
      </Field>
      <Field label="Attention note">
        <Textarea value={focusNote} onChange={(event) => setFocusNote(event.target.value)} />
      </Field>
    </EditorFrame>
  )
}

export function IdeaDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Idea | null
}) {
  const add = usePortfolio((state) => state.addIdea)
  const update = usePortfolio((state) => state.updateIdea)
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <IdeaForm
        initial={initial}
        onClose={() => onOpenChange(false)}
        onSave={(input) => {
          if (initial?.id) update(initial.id, input)
          else add(input)
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}

function IdeaForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Idea | null
  onClose: () => void
  onSave: (input: Omit<Idea, "id">) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [summary, setSummary] = useState(initial?.summary ?? "")
  const [link, setLink] = useState(initial?.link ?? "")
  const [stage, setStage] = useState<IdeaStage>(initial?.stage ?? "research")
  const [killReason, setKillReason] = useState(initial?.killReason ?? "")
  return (
    <EditorFrame
      title={initial?.id ? "Edit idea" : "New idea"}
      description="Research until you say go. Greenlit is permission to build, not an operating company."
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return
        if (stage === "weak" && !killReason.trim()) return
        onSave({
          name: name.trim(),
          summary: summary.trim(),
          link: link.trim(),
          stage,
          killReason: stage === "weak" ? killReason.trim() : killReason.trim(),
        })
      }}
    >
      <Field label="Name">{textInput(name, setName, { required: true })}</Field>
      <Field label="Stage">
        <Choose value={stage} onChange={(value) => setStage(value as IdeaStage)} options={STAGES} />
      </Field>
      <Field label="One-pager">
        <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
      </Field>
      <Field label="Link">{textInput(link, setLink)}</Field>
      <Field label={stage === "weak" ? "Kill reason" : "Kill reason, if you pass"}>
        <Textarea value={killReason} onChange={(event) => setKillReason(event.target.value)} />
      </Field>
    </EditorFrame>
  )
}

export function MarketplaceDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}) {
  const company = usePortfolio((state) => state.companies.find((item) => item.id === companyId))
  const update = usePortfolio((state) => state.updateCompany)
  if (!open || !company) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MarketplaceForm
        initial={company.marketplace}
        onClose={() => onOpenChange(false)}
        onSave={(marketplace) => {
          update(company.id, { marketplace })
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}

function MarketplaceForm({
  initial,
  onClose,
  onSave,
}: {
  initial: MarketplaceProfile | null
  onClose: () => void
  onSave: (profile: MarketplaceProfile) => void
}) {
  const [liveListings, setLive] = useState(String(initial?.liveListings ?? 0))
  const [listingGoal, setGoal] = useState(String(initial?.listingGoal ?? 0))
  const [paidListings, setPaid] = useState(String(initial?.paidListings ?? 0))
  const [paidListingCash, setPaidCash] = useState(String(initial?.paidListingCash ?? 0))
  const [featuredSlots, setSlots] = useState(String(initial?.featuredSlots ?? 0))
  const [featuredFilled, setFilled] = useState(String(initial?.featuredFilled ?? 0))
  const [claimsOn, setClaimsOn] = useState(initial?.claimsEligible != null ? "yes" : "no")
  const [claimsEligible, setEligible] = useState(initial?.claimsEligible != null ? String(initial.claimsEligible) : "")
  const [claimsOwned, setOwned] = useState(initial?.claimsOwned != null ? String(initial.claimsOwned) : "")
  return (
    <EditorFrame
      title="Listing numbers"
      description="Inventory and paid listings. These are not statement revenue."
      onClose={onClose}
      onSubmit={() => {
        const tracking = claimsOn === "yes"
        onSave({
          liveListings: n(liveListings),
          listingGoal: n(listingGoal),
          paidListings: n(paidListings),
          paidListingCash: n(paidListingCash),
          featuredSlots: n(featuredSlots),
          featuredFilled: n(featuredFilled),
          claimsEligible: tracking ? n(claimsEligible) : null,
          claimsOwned: tracking ? n(claimsOwned) : null,
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Live listings">{textInput(liveListings, setLive, { type: "number" })}</Field>
        <Field label="Listing goal">{textInput(listingGoal, setGoal, { type: "number" })}</Field>
        <Field label="Paid listings">{textInput(paidListings, setPaid, { type: "number" })}</Field>
        <Field label="Cash from paid listings">{textInput(paidListingCash, setPaidCash, { type: "number" })}</Field>
        <Field label="Featured slots">{textInput(featuredSlots, setSlots, { type: "number" })}</Field>
        <Field label="Featured filled">{textInput(featuredFilled, setFilled, { type: "number" })}</Field>
        <Field label="Claims">
          <Choose value={claimsOn} onChange={setClaimsOn} options={[{ value: "no", label: "No claims" }, { value: "yes", label: "Claims in play" }]} />
        </Field>
        {claimsOn === "yes" ? <Field label="Claimable listings">{textInput(claimsEligible, setEligible, { type: "number" })}</Field> : null}
        {claimsOn === "yes" ? <Field label="Claimed">{textInput(claimsOwned, setOwned, { type: "number" })}</Field> : null}
      </div>
    </EditorFrame>
  )
}
