# Holdco Terminal

A Bloomberg-style operating picture for a holding company. It keeps the jobs of a ledger, an analytics view, and a company notebook in one dark terminal: structure, statements, customers, vendors, cash, audience, people, agents, assets, work, and the corporate record.

Numbers live in this browser. The first visit loads a seeded September 2026 close for Meridian Peak Holdings plus two standalone companies, so the charts and alerts are already true. Everything you add is saved locally. Reset from the footer returns the seeded book.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

```bash
npm test
```

## What you can do

- Create a holding company, add a subsidiary, or add a standalone company.
- Enter or edit a closed month: P&L, budget, balance sheet, cash flow, site, and social.
- Record customers, invoices, vendors, bills, bank accounts, assets, people, agents, work, and wiki pages.
- Move the as-of month. Statement figures, aging, runway, and scorecards follow it.
- Read alerts, the holdings rollup (full or ownership-weighted), and a printable board pack.

Consolidation adds subsidiary books without eliminating intercompany loans. Those loans are labeled uneliminated.
