import { covenantBreach } from "./additions"
import type { Book } from "./types"
import {
  aging,
  daysBetween,
  derivePnl,
  descendants,
  runway,
  statementAt,
  shiftPeriod,
} from "./metrics"

export type AlertKind = "runway" | "margin" | "revenue" | "ar" | "filing" | "kpi" | "covenant" | "risk"
export type AlertSeverity = "high" | "watch"

export interface Alert {
  id: string
  companyId: string
  companyName: string
  severity: AlertSeverity
  kind: AlertKind
  title: string
  detail: string
  href: string
}

const POLICY_KINDS = new Set(["filing", "insurance", "license", "contract"])

export function kpiMiss(direction: "up" | "down", actual: number, target: number) {
  return direction === "up" ? actual < target : actual > target
}

export function deriveAlerts(book: Book, today: string): Alert[] {
  const alerts: Alert[] = []
  const nameOf = (id: string) => book.companies.find((c) => c.id === id)?.name ?? "Company"

  for (const company of book.companies) {
    const current = statementAt(book.statements, company.id, book.asOf)
    const prior = statementAt(book.statements, company.id, shiftPeriod(book.asOf, -1))
    if (current && prior) {
      const now = derivePnl(current)
      const then = derivePnl(prior)
      if (then.revenue > 0 && (now.revenue - then.revenue) / Math.abs(then.revenue) < -0.1) {
        const drop = (then.revenue - now.revenue) / then.revenue
        alerts.push({
          id: `revenue:${company.id}`,
          companyId: company.id,
          companyName: company.name,
          severity: "high",
          kind: "revenue",
          title: "Revenue down more than 10%",
          detail: `${company.name} revenue fell ${(drop * 100).toFixed(1)}% versus ${shiftPeriod(book.asOf, -1)}.`,
          href: `/companies/${company.id}?tab=statements`,
        })
      }
      if (now.grossMargin - then.grossMargin < -0.03) {
        alerts.push({
          id: `margin:${company.id}`,
          companyId: company.id,
          companyName: company.name,
          severity: "watch",
          kind: "margin",
          title: "Gross margin compressed",
          detail: `${company.name} gross margin moved ${((now.grossMargin - then.grossMargin) * 100).toFixed(1)} pts month over month.`,
          href: `/companies/${company.id}?tab=statements`,
        })
      }
    }

    const months = runway(book.statements, company.id, book.asOf)
    if (months !== null && months < 6) {
      alerts.push({
        id: `runway:${company.id}`,
        companyId: company.id,
        companyName: company.name,
        severity: "high",
        kind: "runway",
        title: "Runway inside six months",
        detail: `${company.name} has ${months.toFixed(1)} months of cash against the trailing three-month burn.`,
        href: `/companies/${company.id}?tab=treasury`,
      })
    }

    const pastDue = aging(
      book.invoices.filter((invoice) => invoice.companyId === company.id),
      book.asOf,
    ).pastDue
    if (pastDue > 0) {
      alerts.push({
        id: `ar:${company.id}`,
        companyId: company.id,
        companyName: company.name,
        severity: "watch",
        kind: "ar",
        title: "Receivables past due",
        detail: `${company.name} has past-due invoices open against the ${book.asOf} close.`,
        href: `/companies/${company.id}?tab=receivables`,
      })
    }

    for (const kpi of book.kpis.filter((item) => item.companyId === company.id)) {
      if (!kpiMiss(kpi.direction, kpi.actual, kpi.target)) continue
      alerts.push({
        id: `kpi:${kpi.id}`,
        companyId: company.id,
        companyName: company.name,
        severity: "watch",
        kind: "kpi",
        title: `${kpi.name} is off target`,
        detail: `${company.name} ${kpi.name} is ${kpi.actual} ${kpi.unit} against a target of ${kpi.target}.`,
        href: `/companies/${company.id}?tab=scorecard`,
      })
    }
  }

  for (const facility of book.debt) {
    if (!covenantBreach(facility)) continue
    alerts.push({
      id: `covenant:${facility.id}`,
      companyId: facility.companyId,
      companyName: nameOf(facility.companyId),
      severity: "high",
      kind: "covenant",
      title: `${facility.covenantName ?? "Covenant"} is under its floor`,
      detail: `${nameOf(facility.companyId)} ${facility.lender} actual ${facility.covenantActual} is under ${facility.covenantLimit}.`,
      href: "/owner",
    })
  }

  for (const risk of book.risks) {
    if (risk.status === "closed" || risk.loss === undefined || risk.limit === undefined || risk.loss <= risk.limit) continue
    alerts.push({
      id: `risk:${risk.id}`,
      companyId: risk.companyId,
      companyName: nameOf(risk.companyId),
      severity: "watch",
      kind: "risk",
      title: `${risk.title} is over its loss limit`,
      detail: `${nameOf(risk.companyId)} loss ${risk.loss} is over a limit of ${risk.limit}.`,
      href: `/companies/${risk.companyId}?tab=corporate`,
    })
  }

  for (const event of book.events) {
    if (!POLICY_KINDS.has(event.kind) || event.status === "done") continue
    const days = daysBetween(today, event.due)
    const overdue = event.status === "overdue" || days < 0
    if (!overdue && (days < 0 || days > 30)) continue
    alerts.push({
      id: `filing:${event.id}`,
      companyId: event.companyId,
      companyName: nameOf(event.companyId),
      severity: overdue ? "high" : "watch",
      kind: "filing",
      title: overdue ? `${event.title} is past due` : `${event.title} due soon`,
      detail: `${nameOf(event.companyId)} · ${event.kind} · due ${event.due}.`,
      href: `/companies/${event.companyId}?tab=corporate`,
    })
  }

  const rank = { high: 0, watch: 1 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || a.companyName.localeCompare(b.companyName))
}

export function holdcoCompanyIds(book: Book, holdcoId: string) {
  return descendants(book.companies, holdcoId).map((company) => company.id)
}
