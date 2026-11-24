<<<<<<< HEAD
# QueryBench — SQL Interview Workbench

An interactive, browser-based SQL practice and interview preparation workbench powered by **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **sql.js** (SQLite compiled to WebAssembly).

Everything runs locally in the browser with an in-memory seeded SQLite database—no backend or external database setup required.

## Features

- **120 SQL Interview Problems** — 40 Easy, 40 Medium, and 40 Hard challenges covering filtering, aggregations, joins, CTEs, window functions, cohort/retention analysis, and more.
- **In-Browser SQLite Engine** — Powered by `sql.js` WebAssembly with isolated working and reference databases, plus one-click database reset if you run mutating queries.
- **Automated Grading & Mistake Hints** — Compares your query results against the reference solution and surfaces targeted hints for common pitfalls (e.g., `ROW_NUMBER()` vs `DENSE_RANK()`, missing edge-case filters).
- **Schema Explorer** — Inspect all 9 seeded tables, column types, primary/foreign keys, and preview table rows.
- **SQL Refresher** — 10 built-in reference topics with runnable example queries you can load straight into the editor.
- **Local Progress Persistence** — Saves solved problems and query drafts in `localStorage`.

## Seeded Database Schema

The workbench seeds **9 tables** (566 total rows) representing a SaaS & e-commerce dataset:

- `users` (42 rows)
- `products` (16 rows)
- `orders` (115 rows)
- `order_items` (140 rows)
- `subscriptions` (44 rows)
- `web_events` (112 rows)
- `support_tickets` (38 rows)
- `marketing_campaigns` (10 rows)
- `product_reviews` (49 rows)

## Tech Stack

- [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [sql.js](https://sql.js.org/) (SQLite in WebAssembly)
- [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended) and `npm`

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check (`tsc --noEmit`) and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run verify` | Verify all 9 seeded tables, 120 problems, refresher examples, grader, and reset logic |

## Project Structure

```text
├── index.html
├── package.json
├── scripts/
│   └── verify-problems.ts   # Problem & database verification script
├── src/
│   ├── components/          # UI panels, SQL editor, schema explorer, console
│   ├── data/                # Seed data, 120 problems, and SQL refresher topics
│   ├── services/            # sql.js WebAssembly initialization and query runner
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Query grader and SQL syntax highlighter
│   └── App.tsx
├── tsconfig.json
└── vite.config.ts
```
=======
# query-bench
>>>>>>> 0fd5aab179a8b5183bc1d5ae58dc99604a412c5d
