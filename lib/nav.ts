export interface NavItem {
  href: string
  code: string
  label: string
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Picture",
    items: [
      { href: "/", code: "CMD", label: "Command" },
      { href: "/holdings", code: "HLD", label: "Holdings" },
      { href: "/alerts", code: "ALR", label: "Alerts" },
    ],
  },
  {
    group: "Books",
    items: [
      { href: "/financials", code: "P&L", label: "Statements" },
      { href: "/customers", code: "CUS", label: "Customers" },
      { href: "/vendors", code: "VEN", label: "Vendors" },
      { href: "/treasury", code: "CSH", label: "Treasury" },
    ],
  },
  {
    group: "Market",
    items: [{ href: "/audience", code: "WEB", label: "Audience" }],
  },
  {
    group: "Firm",
    items: [
      { href: "/people", code: "PPL", label: "People" },
      { href: "/assets", code: "AST", label: "Assets" },
      { href: "/work", code: "WRK", label: "Work" },
      { href: "/wiki", code: "DOC", label: "Wiki" },
    ],
  },
  {
    group: "Record",
    items: [
      { href: "/corporate", code: "COR", label: "Corporate" },
      { href: "/scorecard", code: "SCR", label: "Scorecard" },
      { href: "/reports", code: "RPT", label: "Board pack" },
    ],
  },
]

export function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (href === "/holdings") return pathname.startsWith("/holdings") || pathname.startsWith("/companies")
  return pathname === href || pathname.startsWith(`${href}/`)
}
