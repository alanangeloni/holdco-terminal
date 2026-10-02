"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { PALETTE, TermBars, TermCombo, TermHBar, TermLine, TermStacked, TermWaterfall } from "@/components/charts/charts"
import {
  BankDialog,
  BillDialog,
  ConfirmDialog,
  CustomerDialog,
  DealDialog,
  InvoiceDialog,
  ProductDialog,
  StatementDialog,
  VendorDialog,
} from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { Empty, MiniActions, Num, PageHead, Panel, SpanToggle, TermTable } from "@/components/terminal/kit"
import { aging, balanceTotals, budgetPnl, derivePnl, statementAt, waterfall } from "@/lib/metrics"
import { money, pct } from "@/lib/format"
import { usePortfolio } from "@/lib/store"
import type { Span } from "@/lib/types"
import { companySeries, seriesFor } from "@/lib/view"

function useSpan() {
  const [span, setSpan] = useState<Span>("12M")
  return { span, setSpan }
}

export function StatementsDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const remove = usePortfolio((state) => state.deleteStatement)
  const { span, setSpan } = useSpan()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const company = book.companies.find((item) => item.id === companyId)
  const companies = company ? [company] : book.companies
  const series = seriesFor(book, companies, span, "full")
  const latest = company ? statementAt(book.statements, company.id, book.asOf) : null
  const pnl = latest ? derivePnl(latest) : null
  const budget = latest ? budgetPnl(latest) : null
  const rows = book.statements
    .filter((statement) => !companyId || statement.companyId === companyId)
    .filter((statement) => statement.period <= book.asOf)
    .sort((a, b) => b.period.localeCompare(a.period) || a.companyId.localeCompare(b.companyId))

  const body = company ? (
    <div className="grid gap-2">
      <div className="flex justify-end"><SpanToggle value={span} onChange={setSpan} /></div>
      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Revenue and margin">
          <TermCombo data={series.map((point) => ({ period: point.period, revenue: point.revenue, grossMargin: point.grossMargin }))} />
        </Panel>
        <Panel title="Revenue to net income">
          {pnl ? <TermWaterfall data={waterfall(pnl)} /> : <Empty>Enter a statement for {book.asOf}.</Empty>}
        </Panel>
        <Panel title="Revenue versus costs">
          <TermBars data={series.map((point) => ({ period: point.period, Revenue: point.revenue, Costs: point.costs }))} series={[{ key: "Revenue", name: "Revenue", color: PALETTE[0] }, { key: "Costs", name: "Costs", color: PALETTE[4] }]} />
        </Panel>
        <Panel title="Cost mix">
          <TermStacked
            data={series.map((point) => ({ period: point.period, COGS: point.cogs, Payroll: point.payroll, Marketing: point.marketing, "G&A": point.ga, Other: point.otherOpex }))}
            series={[
              { key: "COGS", name: "COGS", color: "#8aa0b4" },
              { key: "Payroll", name: "Payroll", color: "#f5a524" },
              { key: "Marketing", name: "Marketing", color: "#6ea8fe" },
              { key: "G&A", name: "G&A", color: "#d6d3d1" },
              { key: "Other", name: "Other", color: "#5c6b7a" },
            ]}
          />
        </Panel>
      </div>
      {latest && pnl && budget ? (
        <div className="grid gap-2 lg:grid-cols-3">
          <Panel title={`P&L · ${book.asOf}`} bodyClassName="p-0">
            <StatementLines rows={[
              ["Revenue", pnl.revenue, budget.revenue],
              ["COGS", pnl.cogs, budget.cogs],
              ["Gross profit", pnl.grossProfit, budget.grossProfit],
              ["Opex", pnl.opex, budget.opex],
              ["Operating income", pnl.operatingIncome, budget.operatingIncome],
              ["Interest", pnl.interest, budget.interest],
              ["Tax", pnl.tax, budget.tax],
              ["Net income", pnl.netIncome, budget.netIncome],
            ]} />
          </Panel>
          <Panel title="Balance sheet" bodyClassName="p-0">
            <StatementLines rows={[
              ["Cash", latest.cash],
              ["Receivables", latest.ar],
              ["Inventory", latest.inventory],
              ["Other assets", latest.otherAssets],
              ["Fixed assets", latest.fixedAssets],
              ["Intangibles", latest.intangibles],
              ["Payables", latest.ap],
              ["Accrued", latest.accrued],
              ["Short debt", latest.shortDebt],
              ["Long debt", latest.longDebt],
              ["Equity", latest.equity],
            ]} note={`Balance gap ${money(balanceTotals(latest).gap)}`} />
          </Panel>
          <Panel title="Cash flow" bodyClassName="p-0">
            <StatementLines rows={[
              ["Operations", latest.cfo],
              ["Investing", latest.cfi],
              ["Financing", latest.cff],
              ["Net change", latest.cfo + latest.cfi + latest.cff],
            ]} />
          </Panel>
        </div>
      ) : <Empty>No closed month for {book.asOf}. Add a statement to fill the books.</Empty>}
    </div>
  ) : (
    <div className="grid gap-2">
      <div className="flex justify-end"><SpanToggle value={span} onChange={setSpan} /></div>
      <Panel title="Net income">
        <TermLine
          data={series.map((point) => ({ period: point.period, "Net income": point.netIncome }))}
          series={[{ key: "Net income", name: "Portfolio net income", color: PALETTE[1] }]}
        />
      </Panel>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {book.companies.map((item, index) => (
          <Panel key={item.id} title={item.name}>
            <TermLine
              height="h-28"
              data={companySeries(book, item.id, span).map((point) => ({ period: point.period, NI: point.netIncome }))}
              series={[{ key: "NI", name: "Net income", color: PALETTE[index % PALETTE.length] }]}
            />
          </Panel>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {embedded ? null : (
        <PageHead kicker="Books" title="Statements" lede="Closed months are the source of truth. Budget sits beside actuals." actions={<SpanToggle value={span} onChange={setSpan} />} />
      )}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {company ? (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditId(null); setOpen(true) }}>Add month</Button>
          </div>
        ) : null}
        {body}
        <Panel title={company ? "Months" : "Portfolio months"} bodyClassName="p-0" action={company ? <Button size="xs" onClick={() => { setEditId(null); setOpen(true) }}>Add month</Button> : undefined}>
          <TermTable
            rows={rows}
            empty="No statements yet."
            getKey={(row) => row.id}
            columns={[
              { key: "period", header: "Period", render: (row) => row.period },
              { key: "co", header: "Company", render: (row) => book.companies.find((item) => item.id === row.companyId)?.name ?? "—" },
              { key: "rev", header: "Revenue", className: "text-right", render: (row) => <Num value={row.revenue} /> },
              { key: "ni", header: "Net", className: "text-right", render: (row) => <Num value={derivePnl(row).netIncome} signed /> },
              { key: "gm", header: "GM", className: "text-right", render: (row) => pct(derivePnl(row).grossMargin) },
              { key: "act", header: "", render: (row) => company ? <MiniActions onEdit={() => { setEditId(row.id); setOpen(true) }} onDelete={() => setConfirm(row.id)} /> : null },
            ]}
          />
        </Panel>
      </div>
      {company && open ? (
        <StatementDialog open onOpenChange={setOpen} companyId={company.id} initial={book.statements.find((row) => row.id === editId) ?? null} />
      ) : null}
      <ConfirmDialog open={Boolean(confirm)} title="Remove this month?" body="The chart history for that period goes with it." onOpenChange={() => setConfirm(null)} onConfirm={() => confirm && remove(confirm)} />
    </div>
  )
}

function StatementLines({ rows, note }: { rows: [string, number, number?][]; note?: string }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map(([label, actual, budget]) => (
          <tr key={label} className="border-b border-border/60">
            <td className="px-2 py-1 text-muted-foreground">{label}</td>
            <td className="px-2 py-1 text-right"><Num value={actual} signed /></td>
            {budget !== undefined ? <td className="px-2 py-1 text-right text-muted-foreground"><Num value={budget} /></td> : null}
          </tr>
        ))}
      </tbody>
      {note ? <caption className="px-2 py-1 text-left text-[10px] text-muted-foreground caption-bottom">{note}</caption> : null}
    </table>
  )
}

export function RevenueDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const { span, setSpan } = useSpan()
  const [productOpen, setProductOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  const ids = new Set(companies.map((company) => company.id))
  const periods = seriesFor(book, companies, span).map((point) => point.period)
  const lines = book.productLines.filter((line) => ids.has(line.companyId))
  const stacked = periods.map((period) => {
    const row: Record<string, string | number> = { period }
    if (companyId) {
      for (const line of lines) row[line.name] = line.monthly.find((month) => month.period === period)?.revenue ?? 0
    } else {
      for (const company of companies) row[company.name] = statementAt(book.statements, company.id, period)?.revenue ?? 0
    }
    return row
  })
  const series = (companyId ? lines.map((line) => line.name) : companies.map((company) => company.name)).map((name, index) => ({
    key: name,
    name,
    color: PALETTE[index % PALETTE.length],
  }))
  const invoices = book.invoices.filter((invoice) => ids.has(invoice.companyId) && invoice.status !== "draft")
  const byCustomer = new Map<string, number>()
  for (const invoice of invoices) byCustomer.set(invoice.customerId, (byCustomer.get(invoice.customerId) ?? 0) + invoice.amount)
  const concentration = [...byCustomer.entries()]
    .map(([id, value]) => ({ name: book.customers.find((customer) => customer.id === id)?.name ?? "Customer", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
  const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]
  const pipeline = stages.map((stage) => ({
    name: stage,
    value: book.deals.filter((deal) => ids.has(deal.companyId) && deal.stage === stage).reduce((sum, deal) => sum + deal.amount, 0),
  }))
  return (
    <div>
      {embedded ? null : <PageHead kicker="Books" title="Revenue" lede="Product mix, customer concentration, and the open pipeline." />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        <div className="flex flex-wrap justify-end gap-2">
          <SpanToggle value={span} onChange={setSpan} />
          {companyId ? <Button size="sm" variant="outline" onClick={() => setProductOpen(true)}>Add product line</Button> : null}
          <Button size="sm" onClick={() => setDealOpen(true)}>Add deal</Button>
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title={companyId ? "Revenue by product" : "Revenue by company"}>
            {series.length === 0 ? <Empty>No product lines yet.</Empty> : <TermStacked area data={stacked} series={series} />}
          </Panel>
          <Panel title="Customer concentration">
            <TermHBar data={concentration} color="#6ea8fe" />
          </Panel>
          <Panel title="Pipeline by stage">
            <TermHBar data={pipeline} color="#f5a524" />
          </Panel>
        </div>
      </div>
      {companyId && productOpen ? <ProductDialog open companyId={companyId} onOpenChange={setProductOpen} /> : null}
      {dealOpen ? <DealDialog open companyId={companyId} onOpenChange={setDealOpen} /> : null}
    </div>
  )
}

export function ReceivablesDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const removeInvoice = usePortfolio((state) => state.deleteInvoice)
  const removeCustomer = usePortfolio((state) => state.deleteCustomer)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null)
  const invoices = book.invoices.filter((invoice) => !companyId || invoice.companyId === companyId)
  const buckets = aging(invoices, book.asOf)
  const data = [
    { name: "Current", value: buckets.current },
    { name: "1–30", value: buckets.d30 },
    { name: "31–60", value: buckets.d60 },
    { name: "61+", value: buckets.d61 },
  ]
  return (
    <div>
      {embedded ? null : <PageHead kicker="Books" title="Customers" lede="Aging is measured against the as-of month end. Paid and draft invoices stay off the chart." actions={<><Button size="sm" variant="outline" onClick={() => setCustomerOpen(true)}>Add customer</Button><Button size="sm" onClick={() => setInvoiceOpen(true)}>Add invoice</Button></>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setCustomerOpen(true)}>Add customer</Button>
            <Button size="sm" onClick={() => setInvoiceOpen(true)}>Add invoice</Button>
          </div>
        ) : null}
        <Panel title={`Aging · ${money(buckets.total)} open`}>
          <TermHBar data={data} color="#ff5d5d" />
        </Panel>
        <Panel title="Invoices" bodyClassName="p-0">
          <TermTable
            rows={invoices}
            empty="No invoices yet. Add a customer, then an invoice."
            getKey={(row) => row.id}
            columns={[
              { key: "num", header: "Invoice", render: (row) => row.number },
              { key: "co", header: "Company", render: (row) => book.companies.find((item) => item.id === row.companyId)?.name ?? "—" },
              { key: "cu", header: "Customer", render: (row) => book.customers.find((item) => item.id === row.customerId)?.name ?? "—" },
              { key: "due", header: "Due", render: (row) => row.due },
              { key: "amt", header: "Amount", className: "text-right", render: (row) => <Num value={row.amount} /> },
              { key: "st", header: "Status", render: (row) => <span className={row.status === "overdue" ? "text-down" : ""}>{row.status}</span> },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm({ title: "Remove invoice?", body: row.number, run: () => removeInvoice(row.id) })} /> },
            ]}
          />
        </Panel>
        <Panel title="Customers" bodyClassName="p-0">
          <TermTable
            rows={book.customers.filter((customer) => !companyId || customer.companyId === companyId)}
            empty="No customers yet."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Customer", render: (row) => row.name },
              { key: "seg", header: "Segment", render: (row) => row.segment },
              { key: "since", header: "Since", render: (row) => row.since },
              { key: "co", header: "Company", render: (row) => <Link className="hover:text-amber" href={`/companies/${row.companyId}?tab=receivables`}>{book.companies.find((item) => item.id === row.companyId)?.name}</Link> },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm({ title: "Remove customer?", body: "Their invoices are removed too.", run: () => removeCustomer(row.id) })} /> },
            ]}
          />
        </Panel>
      </div>
      {invoiceOpen ? <InvoiceDialog open companyId={companyId} onOpenChange={setInvoiceOpen} /> : null}
      {customerOpen ? <CustomerDialog open companyId={companyId} onOpenChange={setCustomerOpen} /> : null}
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title ?? ""} body={confirm?.body ?? ""} onOpenChange={() => setConfirm(null)} onConfirm={() => confirm?.run()} />
    </div>
  )
}

export function PayablesDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const removeBill = usePortfolio((state) => state.deleteBill)
  const removeVendor = usePortfolio((state) => state.deleteVendor)
  const [billOpen, setBillOpen] = useState(false)
  const [vendorOpen, setVendorOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null)
  const bills = book.bills.filter((bill) => !companyId || bill.companyId === companyId)
  const buckets = aging(bills, book.asOf)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const bill of bills) {
      if (bill.status === "draft") continue
      map.set(bill.category, (map.get(bill.category) ?? 0) + bill.amount)
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [bills])
  return (
    <div>
      {embedded ? null : <PageHead kicker="Books" title="Vendors" lede="Bills and the categories they land in." actions={<><Button size="sm" variant="outline" onClick={() => setVendorOpen(true)}>Add vendor</Button><Button size="sm" onClick={() => setBillOpen(true)}>Add bill</Button></>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setVendorOpen(true)}>Add vendor</Button><Button size="sm" onClick={() => setBillOpen(true)}>Add bill</Button></div> : null}
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Bill aging"><TermHBar data={[{ name: "Current", value: buckets.current }, { name: "1–30", value: buckets.d30 }, { name: "31–60", value: buckets.d60 }, { name: "61+", value: buckets.d61 }]} color="#8aa0b4" /></Panel>
          <Panel title="Cost by category"><TermHBar data={byCategory} /></Panel>
        </div>
        <Panel title="Bills" bodyClassName="p-0">
          <TermTable
            rows={bills}
            empty="No bills yet."
            getKey={(row) => row.id}
            columns={[
              { key: "num", header: "Bill", render: (row) => row.number },
              { key: "ve", header: "Vendor", render: (row) => book.vendors.find((vendor) => vendor.id === row.vendorId)?.name ?? "—" },
              { key: "cat", header: "Category", render: (row) => row.category },
              { key: "due", header: "Due", render: (row) => row.due },
              { key: "amt", header: "Amount", className: "text-right", render: (row) => <Num value={row.amount} /> },
              { key: "st", header: "Status", render: (row) => row.status },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm({ title: "Remove bill?", body: row.number, run: () => removeBill(row.id) })} /> },
            ]}
          />
        </Panel>
        <Panel title="Vendors" bodyClassName="p-0">
          <TermTable
            rows={book.vendors.filter((vendor) => !companyId || vendor.companyId === companyId)}
            empty="No vendors yet."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Vendor", render: (row) => row.name },
              { key: "cat", header: "Category", render: (row) => row.category },
              { key: "co", header: "Company", render: (row) => book.companies.find((item) => item.id === row.companyId)?.name ?? "—" },
              { key: "act", header: "", render: (row) => <MiniActions onDelete={() => setConfirm({ title: "Remove vendor?", body: "Their bills are removed too.", run: () => removeVendor(row.id) })} /> },
            ]}
          />
        </Panel>
      </div>
      {billOpen ? <BillDialog open companyId={companyId} onOpenChange={setBillOpen} /> : null}
      {vendorOpen ? <VendorDialog open companyId={companyId} onOpenChange={setVendorOpen} /> : null}
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title ?? ""} body={confirm?.body ?? ""} onOpenChange={() => setConfirm(null)} onConfirm={() => confirm?.run()} />
    </div>
  )
}

export function TreasuryDesk({ companyId, embedded = false }: { companyId?: string; embedded?: boolean }) {
  const book = usePortfolio()
  const [open, setOpen] = useState(false)
  const companies = book.companies.filter((company) => !companyId || company.id === companyId)
  const ids = new Set(companies.map((company) => company.id))
  const accounts = book.bankAccounts.filter((account) => ids.has(account.companyId))
  const byCompany = companies.map((company) => ({
    name: company.name,
    value: accounts.filter((account) => account.companyId === company.id).reduce((sum, account) => sum + account.balance, 0),
  }))
  const runwayBars = companies
    .map((company) => {
      const months = seriesFor(book, [company], "3M")
      const burn = months.length ? -months.reduce((sum, point) => sum + point.netIncome, 0) / months.length : 0
      const cash = statementAt(book.statements, company.id, book.asOf)?.cash ?? 0
      return { name: company.name, value: burn > 0 ? cash / burn : 0, burn }
    })
    .filter((row) => row.burn > 0)
    .map(({ name, value }) => ({ name, value }))
  const loans = book.loans.filter((loan) => !companyId || loan.lenderCompanyId === companyId || loan.borrowerCompanyId === companyId)
  const name = (id: string) => book.companies.find((company) => company.id === id)?.name ?? "—"
  return (
    <div>
      {embedded ? null : <PageHead kicker="Books" title="Treasury" lede="Bank cash, debt, intercompany loans, and runway. Consolidation is uneliminated." actions={<Button size="sm" onClick={() => setOpen(true)}>Add account</Button>} />}
      <div className={embedded ? "grid gap-2" : "grid gap-2 p-2 lg:p-3"}>
        {embedded ? <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>Add account</Button></div> : null}
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Cash by company"><TermHBar data={byCompany} color="#6ea8fe" /></Panel>
          <Panel title="Runway where there is burn"><TermHBar data={runwayBars} moneyAxis={false} color="#ff5d5d" /></Panel>
        </div>
        <Panel title="Accounts" bodyClassName="p-0">
          <TermTable
            rows={accounts}
            empty="No bank accounts yet."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => name(row.companyId) },
              { key: "in", header: "Institution", render: (row) => row.institution },
              { key: "mask", header: "Mask", render: (row) => row.mask },
              { key: "bal", header: "Balance", className: "text-right", render: (row) => <Num value={row.balance} /> },
            ]}
          />
        </Panel>
        <Panel title="Debt" bodyClassName="p-0">
          <TermTable
            rows={book.debt.filter((facility) => ids.has(facility.companyId))}
            empty="No debt facilities."
            getKey={(row) => row.id}
            columns={[
              { key: "co", header: "Company", render: (row) => name(row.companyId) },
              { key: "lender", header: "Lender", render: (row) => row.lender },
              { key: "rate", header: "Rate", render: (row) => pct(row.rate) },
              { key: "mat", header: "Maturity", render: (row) => row.maturity },
              { key: "out", header: "Outstanding", className: "text-right", render: (row) => <Num value={row.outstanding} /> },
            ]}
          />
        </Panel>
        <Panel title="Intercompany loans · uneliminated" bodyClassName="p-0">
          <TermTable
            rows={loans}
            empty="No intercompany loans."
            getKey={(row) => row.id}
            columns={[
              { key: "from", header: "Lender", render: (row) => name(row.lenderCompanyId) },
              { key: "to", header: "Borrower", render: (row) => name(row.borrowerCompanyId) },
              { key: "rate", header: "Rate", render: (row) => pct(row.rate) },
              { key: "bal", header: "Balance", className: "text-right", render: (row) => <Num value={row.balance} /> },
            ]}
          />
        </Panel>
      </div>
      {open ? <BankDialog open companyId={companyId} onOpenChange={setOpen} /> : null}
    </div>
  )
}
