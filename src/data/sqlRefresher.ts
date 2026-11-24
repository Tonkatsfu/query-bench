import type { Problem } from '../types/sql';

export type RefresherCategory =
  | 'Fundamentals'
  | 'Joins & NULLs'
  | 'Intermediate Analytics'
  | 'Window Functions & Time-Series';

export interface RefresherExample {
  title: string;
  description: string;
  sql: string;
}

export interface RefresherTopic {
  id: string;
  title: string;
  category: RefresherCategory;
  badge: string;
  relevantProblems: number[]; // problem numbers 1..12 where this is directly used
  summary: string;
  whenToUse: string;
  syntaxBlueprint: string;
  keyRules: string[];
  examples: RefresherExample[];
}

export const SQL_EXECUTION_ORDER = [
  {
    writeOrder: 1,
    execOrder: 5,
    clause: 'SELECT',
    syntax: 'SELECT col1, ROUND(SUM(col2), 2) AS total',
    purpose: 'Chooses which columns or calculated expressions appear in the final output.',
  },
  {
    writeOrder: 2,
    execOrder: 1,
    clause: 'FROM',
    syntax: 'FROM orders o',
    purpose: 'Picks the base table to read rows from (runs FIRST!).',
  },
  {
    writeOrder: 3,
    execOrder: 2,
    clause: 'JOIN',
    syntax: 'INNER JOIN users u ON o.user_id = u.user_id',
    purpose: 'Combines rows from another table using a matching key condition.',
  },
  {
    writeOrder: 4,
    execOrder: 3,
    clause: 'WHERE',
    syntax: "WHERE o.status = 'completed' AND o.total_amount >= 100",
    purpose: 'Filters individual raw rows BEFORE any grouping happens.',
  },
  {
    writeOrder: 5,
    execOrder: 4,
    clause: 'GROUP BY',
    syntax: 'GROUP BY col1',
    purpose: 'Buckets remaining rows into summary groups (one output row per unique group).',
  },
  {
    writeOrder: 6,
    execOrder: 6,
    clause: 'HAVING',
    syntax: 'HAVING COUNT(*) >= 3',
    purpose: 'Filters aggregated groups AFTER GROUP BY (e.g. keeping users with >= 3 orders).',
  },
  {
    writeOrder: 7,
    execOrder: 7,
    clause: 'ORDER BY',
    syntax: 'ORDER BY total DESC, col1 ASC',
    purpose: 'Sorts the final result rows (ASC = lowest/earliest first, DESC = highest/latest first).',
  },
  {
    writeOrder: 8,
    execOrder: 8,
    clause: 'LIMIT',
    syntax: 'LIMIT 10',
    purpose: 'Caps the output to the first N rows.',
  },
];

export const REFRESHER_TOPICS: RefresherTopic[] = [
  {
    id: 'select-from-order',
    title: '1. SELECT, Aliases (AS), ORDER BY & LIMIT',
    category: 'Fundamentals',
    badge: 'SELECT / ORDER BY',
    relevantProblems: [1, 2, 3, 4],
    summary:
      'Every SQL query starts by choosing columns (`SELECT`) from a table (`FROM`). Use `AS` to rename a column in the output, and `ORDER BY` to sort rows deterministically.',
    whenToUse:
      'Used in every query. Always add a tie-breaker column in `ORDER BY` (e.g. `ORDER BY order_date ASC, order_id ASC`) when two rows might share the same primary sort value.',
    syntaxBlueprint: `SELECT
  column_a,
  column_b AS custom_name
FROM table_name
ORDER BY column_a DESC, column_b ASC
LIMIT 5;`,
    keyRules: [
      '`ASC` sorts ascending (A→Z, 1→100, oldest→newest date). It is the default if omitted.',
      '`DESC` sorts descending (Z→A, 100→1, newest→oldest date).',
      'Separate multiple columns in `SELECT` and `ORDER BY` with commas (never put a comma after the last column before `FROM`).',
    ],
    examples: [
      {
        title: 'Inspect the 5 most expensive products in our catalog',
        description:
          'Selects specific columns, computes markup preview with an alias, and sorts highest cost first.',
        sql: `SELECT
  product_id,
  product_name,
  category,
  cost_price AS unit_cogs,
  launch_date
FROM products
ORDER BY cost_price DESC, product_id ASC
LIMIT 5;`,
      },
    ],
  },
  {
    id: 'where-in-between',
    title: '2. Filtering Rows: WHERE, IN, BETWEEN & AND/OR',
    category: 'Fundamentals',
    badge: 'WHERE / IN / BETWEEN',
    relevantProblems: [1, 3, 6, 10],
    summary:
      '`WHERE` filters individual rows before any grouping or totals are calculated. Only rows where the `WHERE` condition evaluates to true are kept.',
    whenToUse:
      'Use `BETWEEN x AND y` for inclusive date or number ranges, `IN (...)` to match a column against a list of allowed values, and `AND` to require all conditions to be true.',
    syntaxBlueprint: `SELECT *
FROM orders
WHERE order_date BETWEEN '2026-01-01' AND '2026-03-31'
  AND status IN ('completed', 'refunded')
  AND total_amount >= 250;`,
    keyRules: [
      "`BETWEEN a AND b` is **inclusive** of both endpoints (`>= a AND <= b`). Always wrap date strings in single quotes: `'2026-01-01'`.",
      "`status IN ('completed', 'refunded')` is cleaner and safer than `status = 'completed' OR status = 'refunded'` (which can break `AND` precedence without parentheses).",
      'String comparisons in SQLite are case-sensitive (`\'completed\'` ≠ `\'Completed\'`).',
    ],
    examples: [
      {
        title: 'Filter Enterprise & Pro users in US or UK who signed up in 2025',
        description: 'Combines `IN` lists with a `BETWEEN` date range using `AND`.',
        sql: `SELECT
  user_id,
  full_name,
  country,
  plan_tier,
  signup_date
FROM users
WHERE country IN ('US', 'UK')
  AND plan_tier IN ('pro', 'enterprise')
  AND signup_date BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY signup_date ASC;`,
      },
    ],
  },
  {
    id: 'group-by-having',
    title: '3. Aggregations: GROUP BY, HAVING, COUNT, SUM, AVG & ROUND',
    category: 'Fundamentals',
    badge: 'GROUP BY / HAVING',
    relevantProblems: [2, 3, 5, 6, 7, 8],
    summary:
      '`GROUP BY` collapses multiple rows that share a category or ID into a single summary row, allowing you to compute `COUNT(*)`, `SUM(col)`, `AVG(col)`, `MIN(col)`, or `MAX(col)` for each group.',
    whenToUse:
      'Whenever a stakeholder asks for metrics **"per user"**, **"by country"**, or **"for each category"** — and use `HAVING` when you need to filter based on the aggregated total (like "users with at least 3 orders").',
    syntaxBlueprint: `SELECT
  user_id,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_spent
FROM orders
WHERE status = 'completed'       -- 1. Filter raw rows FIRST
GROUP BY user_id                 -- 2. Bucket rows by user_id
HAVING COUNT(*) >= 3             -- 3. Filter groups AFTER aggregating
ORDER BY total_spent DESC;`,
    keyRules: [
      '**Golden Rule:** You cannot use `WHERE COUNT(*) >= 3`! `WHERE` runs before grouping; `HAVING` runs after grouping.',
      'Every non-aggregated column in `SELECT` should appear in `GROUP BY`.',
      'Wrap decimal sums or averages in `ROUND(value, 2)` to format currency/percentages to 2 decimal places.',
    ],
    examples: [
      {
        title: 'Count users per country and filter to countries with >= 7 users',
        description: 'Demonstrates `GROUP BY` combined with `HAVING COUNT(*) >= 7`.',
        sql: `SELECT
  country,
  COUNT(*) AS user_count
FROM users
GROUP BY country
HAVING COUNT(*) >= 7
ORDER BY user_count DESC, country ASC;`,
      },
      {
        title: 'Completed revenue and average order value by status',
        description: 'Shows `COUNT(*)`, `SUM()`, and `ROUND(AVG(), 2)` grouped by order status.',
        sql: `SELECT
  status,
  COUNT(*) AS total_orders,
  ROUND(SUM(total_amount), 2) AS total_amount_usd,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
GROUP BY status
ORDER BY total_orders DESC;`,
      },
    ],
  },
  {
    id: 'null-and-coalesce',
    title: '4. Handling Missing Data: IS NULL & COALESCE()',
    category: 'Joins & NULLs',
    badge: 'COALESCE / IS NULL',
    relevantProblems: [3, 4],
    summary:
      'In SQL, `NULL` means "missing or unknown value". Because `NULL` is not a regular value, `discount_code = NULL` never matches anything! You must use `IS NULL`, `IS NOT NULL`, or `COALESCE()`.',
    whenToUse:
      'Use `COALESCE(col, \'Fallback\')` to replace `NULL` cells with a clean label (like `\'NO_PROMO\'` or `0`) in reports, or `WHERE col IS NULL` to find rows with missing values.',
    syntaxBlueprint: `SELECT
  COALESCE(discount_code, 'NO_PROMO') AS promo_code,
  COUNT(*) AS order_count
FROM orders
GROUP BY COALESCE(discount_code, 'NO_PROMO');`,
    keyRules: [
      '`COALESCE(a, b)` checks `a`: if `a` is not NULL it returns `a`; otherwise it returns `b`.',
      'Never write `WHERE col = NULL` or `WHERE col != NULL` — always write `WHERE col IS NULL` or `WHERE col IS NOT NULL`.',
      '`COUNT(*)` counts all rows including NULLs, whereas `COUNT(discount_code)` counts only non-NULL values in that column!',
    ],
    examples: [
      {
        title: 'Clean up NULL acquisition channels in the users table',
        description: 'Replaces missing `acquisition_channel` values with `\'unattributed\'` and counts users.',
        sql: `SELECT
  COALESCE(acquisition_channel, 'unattributed') AS channel_clean,
  COUNT(*) AS user_count
FROM users
GROUP BY COALESCE(acquisition_channel, 'unattributed')
ORDER BY user_count DESC;`,
      },
    ],
  },
  {
    id: 'joins-inner-left',
    title: '5. Combining Tables: INNER JOIN, LEFT JOIN & Anti-Joins',
    category: 'Joins & NULLs',
    badge: 'INNER & LEFT JOIN',
    relevantProblems: [4, 5, 6, 7, 8, 12],
    summary:
      '`JOIN` connects rows across tables using a shared key (like `users.user_id = orders.user_id`). The choice between `INNER JOIN` and `LEFT JOIN` determines what happens when a row has no match.',
    whenToUse:
      'Use `INNER JOIN` when you only want rows that exist in both tables. Use `LEFT JOIN` when you want to keep ALL rows from the left table even if they have zero matches in the right table.',
    syntaxBlueprint: `-- 1. INNER JOIN: keeps only users who placed orders
SELECT u.full_name, o.order_id, o.total_amount
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id;

-- 2. LEFT ANTI-JOIN: finds users with ZERO orders
SELECT u.user_id, u.full_name
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.order_id IS NULL;`,
    keyRules: [
      'Give tables short aliases (`FROM users u LEFT JOIN orders o`) and prefix column names (`u.user_id`) so SQL knows which table a column belongs to.',
      'In a `LEFT JOIN`, any unmatched row from the left table gets `NULL` for every column of the right table. Filtering `WHERE o.order_id IS NULL` isolates those unmatched rows!',
      'You can chain multiple joins (`FROM orders o INNER JOIN order_items oi ON ... INNER JOIN products p ON ...`) to connect 3+ tables.',
    ],
    examples: [
      {
        title: '3-Table Join: Line items with customer name and product category',
        description: 'Connects `orders` → `order_items` → `products` for completed orders.',
        sql: `SELECT
  o.order_id,
  o.order_date,
  p.category,
  p.product_name,
  oi.quantity,
  oi.unit_price,
  (oi.quantity * oi.unit_price) AS line_revenue
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.status = 'completed'
ORDER BY o.order_id ASC
LIMIT 8;`,
      },
    ],
  },
  {
    id: 'case-when-conditional-agg',
    title: '6. Conditional Logic: CASE WHEN & Percentage Rates',
    category: 'Intermediate Analytics',
    badge: 'CASE WHEN / Rates',
    relevantProblems: [5],
    summary:
      '`CASE WHEN ... THEN ... ELSE ... END` is SQL’s `if / else` expression. When wrapped inside `SUM()` or `COUNT()`, it lets you count specific subsets (like refunded vs completed orders) in a single query!',
    whenToUse:
      'Essential for calculating conversion rates, refund rates, or status breakdowns where you need both a filtered numerator and an unfiltered total denominator at the same time.',
    syntaxBlueprint: `SELECT
  plan_tier,
  COUNT(*) AS total_orders,
  SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunded_orders,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS refund_rate_pct
FROM ...`,
    keyRules: [
      'Always close a `CASE` expression with the keyword `END`.',
      '**Watch out for Integer Division!** In SQLite, dividing two integers (`1 / 4`) truncates to `0`. Multiply by `100.0` (with a decimal point!) first so SQLite performs floating-point division.',
    ],
    examples: [
      {
        title: 'Calculate order completion rate and refund count by country',
        description: 'Uses `SUM(CASE WHEN ...)` and `100.0 *` float division.',
        sql: `SELECT
  u.country,
  COUNT(o.order_id) AS total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_cnt,
  ROUND(
    100.0 * SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) / COUNT(o.order_id),
    2
  ) AS completion_rate_pct
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
GROUP BY u.country
ORDER BY total_orders DESC;`,
      },
    ],
  },
  {
    id: 'cte-with-clauses',
    title: '7. Multi-Step Queries: CTEs (WITH Clauses)',
    category: 'Intermediate Analytics',
    badge: 'WITH (CTEs)',
    relevantProblems: [7, 8, 9, 10, 11, 12],
    summary:
      'A Common Table Expression (`WITH cte_name AS (SELECT ...)`) creates a named temporary result table that you can query in the next step — turning complex multi-stage problems into simple step-by-step pipelines.',
    whenToUse:
      'Use a CTE whenever you need to aggregate data twice (e.g. "average of user totals"), filter on a window function (`ROW_NUMBER`, `DENSE_RANK`), or chain 2–3 logical transformations cleanly.',
    syntaxBlueprint: `WITH step_one AS (
  SELECT user_id, SUM(total_amount) AS user_total
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
step_two AS (
  SELECT AVG(user_total) AS overall_avg
  FROM step_one
)
SELECT s1.user_id, s1.user_total, ROUND(s2.overall_avg, 2) AS avg_benchmark
FROM step_one s1
CROSS JOIN step_two s2
WHERE s1.user_total > s2.overall_avg;`,
    keyRules: [
      'Write `WITH` only ONCE at the very top. Separate multiple CTEs with a comma: `WITH cte1 AS (...), cte2 AS (...) SELECT ...`.',
      'Do NOT put a semicolon after a CTE definition — the semicolon only goes at the very end of the final `SELECT`.',
    ],
    examples: [
      {
        title: 'Two-step CTE: Compare each product category against overall average category revenue',
        description: 'Step 1 sums revenue per category; Step 2 averages those category totals.',
        sql: `WITH category_totals AS (
  SELECT
    p.category,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS cat_revenue
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category
),
overall AS (
  SELECT ROUND(AVG(cat_revenue), 2) AS avg_cat_revenue
  FROM category_totals
)
SELECT
  ct.category,
  ct.cat_revenue,
  ov.avg_cat_revenue
FROM category_totals ct
CROSS JOIN overall ov
ORDER BY ct.cat_revenue DESC;`,
      },
    ],
  },
  {
    id: 'window-ranking-dedup',
    title: '8. Window Ranking: ROW_NUMBER() vs DENSE_RANK()',
    category: 'Window Functions & Time-Series',
    badge: 'ROW_NUMBER / DENSE_RANK',
    relevantProblems: [8, 12],
    summary:
      'Window functions (`func() OVER (PARTITION BY group_col ORDER BY sort_col)`) compute a rank or row number within each partition without collapsing rows like `GROUP BY` does.',
    whenToUse:
      'Use `ROW_NUMBER()` when you need exactly one row per group (e.g. deduplicating duplicate orders with `rn = 1`). Use `DENSE_RANK()` for "Top-N per category" when tied items must both be kept.',
    syntaxBlueprint: `WITH ranked AS (
  SELECT
    category,
    product_name,
    total_revenue,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS row_num,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS dense_rnk
  FROM product_revenue_cte
)
SELECT * FROM ranked WHERE dense_rnk <= 2;`,
    keyRules: [
      '`PARTITION BY` resets the rank counter back to 1 for each new group (e.g. each `category` or `(user_id, order_date, total_amount)`).',
      'If two rows tie for 2nd place: `ROW_NUMBER()` assigns `2, 3` (arbitrary winner); `RANK()` assigns `2, 2, 4` (skips 3); `DENSE_RANK()` assigns `2, 2, 3` (no gaps!).',
      'You cannot use a window function directly inside `WHERE`. Always compute it inside a CTE first, then filter `WHERE rnk <= 2` in the outer query.',
    ],
    examples: [
      {
        title: 'Compare ROW_NUMBER(), RANK(), and DENSE_RANK() on Automation product revenue',
        description:
          'Notice how Alert Bot Suite and Webhook Sync Engine tie at $1,800.00 and both get dense_rank = 2!',
        sql: `WITH auto_rev AS (
  SELECT
    p.product_name,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed' AND p.category = 'Automation'
  GROUP BY p.product_name
)
SELECT
  product_name,
  revenue,
  ROW_NUMBER() OVER (ORDER BY revenue DESC) AS row_num,
  RANK() OVER (ORDER BY revenue DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rnk
FROM auto_rev
ORDER BY revenue DESC, product_name ASC;`,
      },
    ],
  },
  {
    id: 'window-lag-rolling',
    title: '9. Time-Series Windows: LAG() & Rolling Averages (ROWS BETWEEN)',
    category: 'Window Functions & Time-Series',
    badge: 'LAG() / ROWS BETWEEN',
    relevantProblems: [9, 10],
    summary:
      '`LAG(col) OVER (ORDER BY time_col)` looks back 1 row to grab the previous period’s value (for Month-over-Month growth). `AVG(col) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` averages a sliding 7-row window.',
    whenToUse:
      'Always aggregate raw transactions to one row per month or one row per day in a CTE **first**, then apply `LAG()` or `ROWS BETWEEN` on that clean time series.',
    syntaxBlueprint: `-- 1. Previous period lookup with LAG()
LAG(monthly_revenue) OVER (ORDER BY order_month) AS prev_month_revenue

-- 2. Trailing 7-day moving average (current row + 6 previous rows = 7 days)
AVG(daily_revenue) OVER (
  ORDER BY order_date
  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
) AS rolling_7d_avg`,
    keyRules: [
      'For the very first row in `ORDER BY`, `LAG()` has no prior row so it returns `NULL`.',
      'MoM Growth % formula: `ROUND(100.0 * (current_rev - prev_rev) / prev_rev, 2)`.',
      'A 7-day rolling window that includes today uses `6 PRECEDING AND CURRENT ROW` (`6 + 1 = 7` rows total).',
    ],
    examples: [
      {
        title: 'First 7 days of March 2026 daily revenue with trailing 3-day & 7-day rolling averages',
        description: 'Aggregates daily revenue in a CTE first, then applies sliding window frames.',
        sql: `WITH daily AS (
  SELECT
    order_date,
    SUM(total_amount) AS daily_rev
  FROM orders
  WHERE status = 'completed'
    AND order_date BETWEEN '2026-03-01' AND '2026-03-07'
  GROUP BY order_date
)
SELECT
  order_date,
  daily_rev,
  LAG(daily_rev) OVER (ORDER BY order_date) AS prev_day_rev,
  ROUND(AVG(daily_rev) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7d_avg
FROM daily
ORDER BY order_date ASC;`,
      },
    ],
  },
  {
    id: 'sqlite-dates-cohorts',
    title: '10. SQLite Date Formatting (strftime) & Cohort Month Math',
    category: 'Window Functions & Time-Series',
    badge: 'strftime / Cohorts',
    relevantProblems: [9, 11],
    summary:
      'SQLite stores dates as `' +
      'YYYY-MM-DD' +
      '` strings and provides `strftime(format, date_col)` to extract year-month buckets (`%Y-%m`), years (`%Y`), or months (`%m`).',
    whenToUse:
      'Use `strftime(\'%Y-%m\', order_date)` to group orders by calendar month, and combine `MIN(order_date)` with `CAST(strftime(...) AS INTEGER)` to calculate how many months after a customer’s first purchase each repeat order occurred.',
    syntaxBlueprint: `-- Extract 'YYYY-MM' (e.g. '2025-03')
strftime('%Y-%m', order_date) AS order_month

-- Compute integer months elapsed between first_order_date and order_date:
(CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fp.first_order_date) AS INTEGER)) * 12
  + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fp.first_order_date) AS INTEGER)) AS month_offset`,
    keyRules: [
      "`strftime('%Y-%m', '2025-03-17')` returns `'2025-03'`.",
      '`strftime()` always returns `TEXT`, so wrap `%Y` or `%m` in `CAST(... AS INTEGER)` when doing subtraction across year boundaries.',
      'In cohort analysis, always use `COUNT(DISTINCT user_id)` so a user who places 2 orders in the same month is only counted once!',
    ],
    examples: [
      {
        title: 'Find each customer’s first completed order month (cohort_month)',
        description: 'Uses `MIN(order_date)` and `strftime(\'%Y-%m\', ...)` per user.',
        sql: `SELECT
  user_id,
  MIN(order_date) AS first_order_date,
  strftime('%Y-%m', MIN(order_date)) AS cohort_month,
  COUNT(*) AS lifetime_completed_orders
FROM orders
WHERE status = 'completed'
GROUP BY user_id
ORDER BY first_order_date ASC
LIMIT 8;`,
      },
    ],
  },
];

const CONCEPT_TO_TOPIC_IDS: Record<string, string[]> = {
  'ORDER BY': ['select-from-order'],
  WHERE: ['where-in-between'],
  AND: ['where-in-between'],
  OR: ['where-in-between'],
  LIKE: ['where-in-between'],
  IN: ['where-in-between'],
  BETWEEN: ['where-in-between'],
  'GROUP BY': ['group-by-having'],
  HAVING: ['group-by-having'],
  SUM: ['group-by-having'],
  AVG: ['group-by-having'],
  COUNT: ['group-by-having'],
  'COUNT DISTINCT': ['group-by-having'],
  'MIN/MAX': ['group-by-having'],
  COALESCE: ['null-and-coalesce'],
  'NULL Handling': ['null-and-coalesce'],
  'IS NULL': ['null-and-coalesce'],
  'IS NOT NULL': ['null-and-coalesce'],
  'INNER JOIN': ['joins-inner-left'],
  'LEFT JOIN': ['joins-inner-left'],
  'Multi-Table JOIN': ['joins-inner-left'],
  'SELF JOIN': ['joins-inner-left'],
  'Date Range Join': ['joins-inner-left'],
  'Anti-Join': ['joins-inner-left'],
  EXISTS: ['joins-inner-left'],
  'NOT EXISTS': ['joins-inner-left'],
  'CASE WHEN': ['case-when-conditional-agg'],
  'Conditional Aggregation': ['case-when-conditional-agg'],
  'CTE (WITH)': ['cte-with-clauses'],
  'Multi-Step Aggregation': ['cte-with-clauses'],
  'Fan-Out Prevention': ['cte-with-clauses'],
  'UNION ALL': ['cte-with-clauses'],
  INTERSECT: ['cte-with-clauses'],
  EXCEPT: ['cte-with-clauses'],
  'Set Operations': ['cte-with-clauses'],
  Benchmarking: ['cte-with-clauses'],
  'ROW_NUMBER()': ['window-ranking-dedup'],
  'RANK()': ['window-ranking-dedup'],
  'DENSE_RANK()': ['window-ranking-dedup'],
  'NTILE()': ['window-ranking-dedup'],
  Deduplication: ['window-ranking-dedup'],
  'Tie Handling': ['window-ranking-dedup'],
  'Gaps & Islands': ['window-ranking-dedup'],
  'PARTITION BY': ['window-ranking-dedup'],
  'LAG()': ['window-lag-rolling'],
  'LEAD()': ['window-lag-rolling'],
  'FIRST_VALUE()': ['window-lag-rolling'],
  'LAST_VALUE()': ['window-lag-rolling'],
  'ROWS BETWEEN': ['window-lag-rolling'],
  'Rolling Average': ['window-lag-rolling'],
  'Window Frame': ['window-lag-rolling'],
  'Window SUM': ['window-lag-rolling'],
  'Window AVG': ['window-lag-rolling'],
  'Window COUNT': ['window-lag-rolling'],
  'UNBOUNDED PRECEDING': ['window-lag-rolling'],
  'Time-Series': ['window-lag-rolling', 'sqlite-dates-cohorts'],
  strftime: ['sqlite-dates-cohorts'],
  julianday: ['sqlite-dates-cohorts'],
  'Cohort Analysis': ['sqlite-dates-cohorts'],
  'Date Math': ['sqlite-dates-cohorts'],
  'Date Formatting': ['sqlite-dates-cohorts'],
};

export function getRelevantRefresherTopics(problem: Problem): RefresherTopic[] {
  const matchedIds = new Set<string>();

  for (const t of REFRESHER_TOPICS) {
    if (t.relevantProblems.includes(problem.number)) {
      matchedIds.add(t.id);
    }
  }

  for (const concept of problem.concepts) {
    const ids = CONCEPT_TO_TOPIC_IDS[concept];
    if (ids) {
      for (const id of ids) matchedIds.add(id);
    }
  }

  return REFRESHER_TOPICS.filter((t) => matchedIds.has(t.id)).slice(0, 4);
}
