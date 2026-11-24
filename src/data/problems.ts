import type { Problem } from '../types/sql';
import { EXTRA_EASY_PROBLEMS } from './problemsEasy';
import { EXTRA_MEDIUM_PROBLEMS } from './problemsMedium';
import { EXTRA_HARD_PROBLEMS } from './problemsHard';

export const CORE_PROBLEMS: Problem[] = [
  // =========================================================================
  // EASY (1 - 4)
  // =========================================================================
  {
    id: 'q1-high-value-q1-orders',
    number: 1,
    title: 'High-Value Q1 2026 Orders Audit',
    difficulty: 'Easy',
    concepts: ['WHERE', 'IN', 'BETWEEN', 'ORDER BY'],
    stakeholder: 'Finance Operations',
    scenario:
      'Finance is auditing high-value customer transactions from Q1 2026 to reconcile payment processor payouts and chargebacks. They need a clean list of every order placed between January 1, 2026 and March 31, 2026 (inclusive) whose status is either completed or refunded and whose total amount is at least $250.',
    requirements: [
      'Filter `orders` where `order_date` is between `2026-01-01` and `2026-03-31` (inclusive).',
      'Include only orders where `status` is in (`completed`, `refunded`).',
      'Keep only orders with `total_amount >= 250`.',
      'Sort results by `order_date ASC`, then `order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Unique order identifier' },
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'order_date', type: 'TEXT', description: 'Order date (YYYY-MM-DD)' },
      { name: 'status', type: 'TEXT', description: 'completed or refunded' },
      { name: 'total_amount', type: 'REAL', description: 'Order amount in USD (>= 250)' },
    ],
    starterSql: `-- Finance Q1 2026 high-value audit
SELECT
  order_id,
  user_id,
  order_date,
  status,
  total_amount
FROM orders
WHERE ...
ORDER BY order_date ASC, order_id ASC;`,
    hints: [
      'Combine three conditions in your `WHERE` clause using `AND`: a `BETWEEN` range on `order_date`, an `IN (...)` check on `status`, and `total_amount >= 250`.',
      'In SQLite, ISO date strings (`YYYY-MM-DD`) compare chronologically with `BETWEEN \'2026-01-01\' AND \'2026-03-31\'`. Remember to include both `\'completed\'` and `\'refunded\'`.',
    ],
    solutionSql: `SELECT
  order_id,
  user_id,
  order_date,
  status,
  total_amount
FROM orders
WHERE order_date BETWEEN '2026-01-01' AND '2026-03-31'
  AND status IN ('completed', 'refunded')
  AND total_amount >= 250
ORDER BY order_date ASC, order_id ASC;`,
    explanation:
      'ISO-8601 date strings (`YYYY-MM-DD`) sort identically to calendar dates, so `BETWEEN` cleanly captures Q1 2026 inclusively. Using `IN (\'completed\', \'refunded\')` is cleaner and less error-prone than chaining `OR` clauses (which can easily break operator precedence when combined with `AND`).',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (user.rowCount < expected.rowCount && !sql.toLowerCase().includes('refunded')) {
            return "You returned fewer rows than expected — did you forget to include 'refunded' orders alongside 'completed'?";
          }
          if (user.rowCount > expected.rowCount && !sql.toLowerCase().includes('250')) {
            return 'Row count is too high — make sure you filter for total_amount >= 250.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q2-repeat-high-value-buyers',
    number: 2,
    title: 'Loyal Repeat Buyers Threshold',
    difficulty: 'Easy',
    concepts: ['GROUP BY', 'HAVING', 'Aggregations'],
    stakeholder: 'Customer Retention',
    scenario:
      'The Retention team wants to invite our most loyal repeat buyers to an exclusive beta program. Find every customer who has placed at least 3 completed orders across all time, and report their total number of completed orders and lifetime completed spend.',
    requirements: [
      'Consider only orders with `status = \'completed\'`.',
      'Group by `user_id` and keep only users with at least 3 completed orders (`HAVING COUNT(*) >= 3`).',
      'Return `user_id`, `order_count`, and `total_spent` (rounded to 2 decimal places).',
      'Order by `total_spent DESC`, then `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'order_count', type: 'INTEGER', description: 'Number of completed orders (>= 3)' },
      { name: 'total_spent', type: 'REAL', description: 'Sum of completed order amounts (rounded to 2 decimals)' },
    ],
    starterSql: `-- Identify customers with >= 3 completed orders
SELECT
  user_id,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_spent
FROM orders
...`,
    hints: [
      'Filter out non-completed orders in `WHERE` before grouping — `WHERE` filters individual rows, while `HAVING` filters aggregated groups.',
      'Use `GROUP BY user_id` followed by `HAVING COUNT(*) >= 3` and `ORDER BY total_spent DESC, user_id ASC`.',
    ],
    solutionSql: `SELECT
  user_id,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_spent
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY total_spent DESC, user_id ASC;`,
    explanation:
      'Filtering `status = \'completed\'` in the `WHERE` clause ensures refunded, pending, and cancelled orders never inflate a customer’s order count or spend. Then `GROUP BY user_id` collapses orders per user, and `HAVING COUNT(*) >= 3` keeps only repeat buyers.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (user.rowCount > expected.rowCount && !sql.toLowerCase().includes('completed')) {
            return "Row count is higher than expected — check if you filtered out non-completed orders (`WHERE status = 'completed'`).";
          }
          if (user.rowCount > expected.rowCount && !sql.toLowerCase().includes('having')) {
            return 'Row count is too high — use a `HAVING COUNT(*) >= 3` clause to filter groups after aggregation.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q3-promo-code-coalesce',
    number: 3,
    title: '2026 Promo Code Performance & NULL Cleanup',
    difficulty: 'Easy',
    concepts: ['COALESCE', 'NULL Handling', 'GROUP BY'],
    stakeholder: 'Growth Marketing',
    scenario:
      'Marketing is preparing a 2026 executive deck on promo code ROI, but raw exports show confusing blank NULL labels for full-price orders. Summarize all completed orders placed in 2026 by promo code, replacing any NULL `discount_code` with `\'NO_PROMO\'`.',
    requirements: [
      'Filter `orders` to `status = \'completed\'` and `order_date >= \'2026-01-01\'` (all 2026 orders).',
      'Use `COALESCE(discount_code, \'NO_PROMO\')` aliased as `promo_code`.',
      'Compute `order_count` and `total_revenue` (`ROUND(SUM(total_amount), 2)`) for each `promo_code`.',
      'Order by `total_revenue DESC`, then `promo_code ASC`.',
    ],
    expectedColumns: [
      { name: 'promo_code', type: 'TEXT', description: 'Discount code or NO_PROMO when NULL' },
      { name: 'order_count', type: 'INTEGER', description: 'Completed orders in 2026 using this promo' },
      { name: 'total_revenue', type: 'REAL', description: 'Total revenue rounded to 2 decimal places' },
    ],
    starterSql: `-- Summarize 2026 completed revenue by promo code (replace NULL with 'NO_PROMO')
SELECT
  COALESCE(discount_code, 'NO_PROMO') AS promo_code,
  ...
FROM orders
WHERE ...`,
    hints: [
      'Wrap `discount_code` with `COALESCE(discount_code, \'NO_PROMO\')` in both the `SELECT` list and `GROUP BY` (or group by the alias `promo_code`).',
      'Filter by `status = \'completed\' AND order_date LIKE \'2026-%\'` (or `order_date BETWEEN \'2026-01-01\' AND \'2026-12-31\'`).',
    ],
    solutionSql: `SELECT
  COALESCE(discount_code, 'NO_PROMO') AS promo_code,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_revenue
FROM orders
WHERE status = 'completed'
  AND order_date BETWEEN '2026-01-01' AND '2026-12-31'
GROUP BY COALESCE(discount_code, 'NO_PROMO')
ORDER BY total_revenue DESC, promo_code ASC;`,
    explanation:
      '`COALESCE()` returns the first non-NULL expression in its argument list, turning unattributed NULL `discount_code` values into a clean business label (`NO_PROMO`) prior to grouping so dashboards never render empty category labels.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, _expected, sql) => {
          const hasNull = user.values.some((row) => row[0] === null);
          if (hasNull) {
            return "Your output still contains a `NULL` promo_code — wrap `discount_code` with `COALESCE(discount_code, 'NO_PROMO')`.";
          }
          if (!sql.toLowerCase().includes('2026')) {
            return 'Make sure you filter to orders placed in 2026 only.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q4-users-never-ordered',
    number: 4,
    title: 'Signed Up, Never Purchased',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'Anti-Join', 'IS NULL'],
    stakeholder: 'Lifecycle Marketing',
    scenario:
      'Lifecycle Marketing is building an onboarding nudge campaign for registered accounts that never converted into a single order. Find every user in the `users` table who has zero matching rows in the `orders` table (regardless of order status).',
    requirements: [
      'Start from `users` and `LEFT JOIN` to `orders` on `user_id`.',
      'Filter to rows where no order exists (`o.order_id IS NULL`).',
      'Return `user_id`, `full_name`, `email`, `signup_date`, and `plan_tier`.',
      'Order by `signup_date ASC`, then `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer full name' },
      { name: 'email', type: 'TEXT', description: 'Email address for win-back campaign' },
      { name: 'signup_date', type: 'TEXT', description: 'Registration date (YYYY-MM-DD)' },
      { name: 'plan_tier', type: 'TEXT', description: 'Current subscription tier' },
    ],
    starterSql: `-- Find users who signed up but have never placed any order
SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.signup_date,
  u.plan_tier
FROM users u
...`,
    hints: [
      'An `INNER JOIN` drops unmatched users immediately. Use `LEFT JOIN orders o ON u.user_id = o.user_id` to preserve users without orders.',
      'After the `LEFT JOIN`, users with no orders will have `NULL` in every column from `orders`. Add `WHERE o.order_id IS NULL`.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.signup_date,
  u.plan_tier
FROM users u
LEFT JOIN orders o
  ON u.user_id = o.user_id
WHERE o.order_id IS NULL
ORDER BY u.signup_date ASC, u.user_id ASC;`,
    explanation:
      'The `LEFT JOIN ... WHERE right_table.pk IS NULL` pattern (known as a left anti-join) is one of the most frequently tested SQL interview patterns. It retains every row from `users` and then isolates those for which the join found no corresponding record in `orders`.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (user.rowCount === 0 && sql.toLowerCase().includes('inner join')) {
            return 'An `INNER JOIN` removes users without orders before `WHERE` runs. Switch to `LEFT JOIN`!';
          }
          if (user.rowCount > expected.rowCount) {
            return 'Too many rows returned — make sure you filter with `WHERE o.order_id IS NULL` (and do not filter by order status).';
          }
          return null;
        },
      },
    ],
  },

  // =========================================================================
  // MEDIUM (5 - 8)
  // =========================================================================
  {
    id: 'q5-plan-tier-refund-rates',
    number: 5,
    title: 'Order Health & Refund Rate by Plan Tier',
    difficulty: 'Medium',
    concepts: ['Conditional Aggregation', 'CASE WHEN', 'JOIN'],
    stakeholder: 'Customer Success',
    scenario:
      'Customer Success suspects that lower subscription tiers experience significantly higher refund rates than Enterprise accounts. Across all orders, calculate each `plan_tier`’s total orders, completed orders, refunded orders, and refund rate percentage.',
    requirements: [
      'Join `orders` with `users` on `user_id` and group by `u.plan_tier`.',
      'Use conditional aggregation (`SUM(CASE WHEN ... THEN 1 ELSE 0 END)`) to count `completed_orders` and `refunded_orders`.',
      'Compute `refund_rate_pct` as `ROUND(100.0 * refunded_orders / total_orders, 2)`.',
      'Order by `refund_rate_pct DESC`, then `plan_tier ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Subscription tier (free, starter, pro, enterprise)' },
      { name: 'total_orders', type: 'INTEGER', description: 'Total orders of any status' },
      { name: 'completed_orders', type: 'INTEGER', description: 'Count of completed orders' },
      { name: 'refunded_orders', type: 'INTEGER', description: 'Count of refunded orders' },
      { name: 'refund_rate_pct', type: 'REAL', description: 'Percentage of orders refunded (0–100, 2 decimals)' },
    ],
    starterSql: `-- Calculate order health and refund rate per plan_tier
SELECT
  u.plan_tier,
  COUNT(o.order_id) AS total_orders,
  ...
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
GROUP BY u.plan_tier
ORDER BY refund_rate_pct DESC, u.plan_tier ASC;`,
    hints: [
      'Use `SUM(CASE WHEN o.status = \'refunded\' THEN 1 ELSE 0 END)` to count refunded orders without filtering them out of `total_orders`.',
      'Watch out for integer division in SQLite! Multiply by `100.0` (not `100`) before dividing by `COUNT(o.order_id)` so you get decimal percentages.',
    ],
    solutionSql: `SELECT
  u.plan_tier,
  COUNT(o.order_id) AS total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
  SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) AS refunded_orders,
  ROUND(
    100.0 * SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) / COUNT(o.order_id),
    2
  ) AS refund_rate_pct
FROM orders o
INNER JOIN users u
  ON o.user_id = u.user_id
GROUP BY u.plan_tier
ORDER BY refund_rate_pct DESC, u.plan_tier ASC;`,
    explanation:
      'Conditional aggregation (`SUM(CASE WHEN ...)`) lets you compute multiple status-specific metrics in a single table scan. Multiplying the numerator by `100.0` forces floating-point arithmetic in SQLite, preventing integer division from truncating percentages to `0`.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user) => {
          const allZeros =
            user.values.length > 0 &&
            user.values.every((r) => Number(r[r.length - 1]) === 0);
          if (allZeros) {
            return 'All `refund_rate_pct` values evaluated to 0 — check for integer division! Multiply by `100.0` instead of `100`.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q6-h2-2025-category-gross-profit',
    number: 6,
    title: 'H2 2025 Gross Profit by Product Category',
    difficulty: 'Medium',
    concepts: ['Multi-Table JOIN', 'Date Filtering', 'Margin Math'],
    stakeholder: 'FP&A Finance',
    scenario:
      'Finance is closing the H2 2025 P&L review and wants to see which product categories generated the highest gross profit between July 1, 2025 and December 31, 2025. Gross profit for each line item is defined as `(unit_price - cost_price) * quantity`.',
    requirements: [
      'Join `orders`, `order_items`, and `products`.',
      'Filter to `orders.status = \'completed\'` and `order_date BETWEEN \'2025-07-01\' AND \'2025-12-31\'`.',
      'For each product `category`, compute `units_sold` (`SUM(oi.quantity)`), `gross_revenue` (`ROUND(SUM(oi.quantity * oi.unit_price), 2)`), and `gross_profit` (`ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2)`).',
      'Order by `gross_profit DESC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'units_sold', type: 'INTEGER', description: 'Total units sold in H2 2025' },
      { name: 'gross_revenue', type: 'REAL', description: 'Line-item revenue (2 decimals)' },
      { name: 'gross_profit', type: 'REAL', description: 'Line-item gross profit (2 decimals)' },
    ],
    starterSql: `-- Compute H2 2025 units, revenue, and gross profit by product category
SELECT
  p.category,
  ...
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE ...`,
    hints: [
      'Remember to multiply `(oi.unit_price - p.cost_price)` by `oi.quantity` — forgetting `quantity` only calculates single-unit margin.',
      'Filter on `o.status = \'completed\'` and `o.order_date BETWEEN \'2025-07-01\' AND \'2025-12-31\'` before grouping by `p.category`.',
    ],
    solutionSql: `SELECT
  p.category,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS gross_revenue,
  ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_profit
FROM orders o
INNER JOIN order_items oi
  ON o.order_id = oi.order_id
INNER JOIN products p
  ON oi.product_id = p.product_id
WHERE o.status = 'completed'
  AND o.order_date BETWEEN '2025-07-01' AND '2025-12-31'
GROUP BY p.category
ORDER BY gross_profit DESC;`,
    explanation:
      'Joining across `orders → order_items → products` connects transaction status/dates with line-item quantities/prices and catalog COGS (`cost_price`). Aggregating at the line-item grain avoids fan-out errors you would get if you summed `orders.total_amount` after joining `order_items`.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (_user, _expected, sql) => {
          if (sql.toLowerCase().includes('total_amount')) {
            return 'Avoid summing `orders.total_amount` after joining `order_items` (it duplicates order totals per line item). Use `oi.quantity * oi.unit_price`.';
          }
          if (!sql.toLowerCase().includes('completed')) {
            return "Don't forget to filter to `o.status = 'completed'` so refunded/cancelled orders are excluded.";
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q7-above-avg-spenders-cte',
    number: 7,
    title: 'Above-Average Spenders Within Each Country',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Multi-Step Aggregation', 'Benchmarking'],
    stakeholder: 'VIP Account Management',
    scenario:
      'Regional Account Managers want to identify VIP customers who outspend the typical buyer in their own country. Using CTEs, first calculate each paying customer’s lifetime completed spend, then compute each country’s average customer spend, and return every customer whose spend strictly exceeds their country’s average.',
    requirements: [
      'Include only `status = \'completed\'` orders (users with zero completed orders should not dilute a country’s buyer average).',
      'Step 1 CTE (`user_spend`): calculate `user_spend` (`SUM(o.total_amount)`) per `user_id`, along with `full_name` and `country`.',
      'Step 2 CTE (`country_avg`): calculate `country_avg_spend` (`AVG(user_spend)`) per `country`.',
      'Return `user_id`, `full_name`, `country`, `user_spend` (rounded to 2 decimals), and `country_avg_spend` (rounded to 2 decimals) where `user_spend > country_avg_spend`.',
      'Order by `country ASC`, `user_spend DESC`, `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer full name' },
      { name: 'country', type: 'TEXT', description: 'Customer country code' },
      { name: 'user_spend', type: 'REAL', description: 'Customer lifetime completed spend (2 decimals)' },
      { name: 'country_avg_spend', type: 'REAL', description: 'Country average buyer spend (2 decimals)' },
    ],
    starterSql: `-- Multi-step CTE: find customers spending more than their country's average buyer
WITH user_spend AS (
  SELECT
    u.user_id,
    u.full_name,
    u.country,
    SUM(o.total_amount) AS user_spend
  FROM users u
  INNER JOIN orders o ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, u.full_name, u.country
),
country_avg AS (
  ...
)
SELECT ...`,
    hints: [
      'In the second CTE (`country_avg`), run `SELECT country, AVG(user_spend) AS country_avg_spend FROM user_spend GROUP BY country`.',
      'Join `user_spend` and `country_avg` on `country`, filter with `WHERE us.user_spend > ca.country_avg_spend`, and `ROUND()` both spend columns in the final `SELECT`.',
    ],
    solutionSql: `WITH user_spend AS (
  SELECT
    u.user_id,
    u.full_name,
    u.country,
    SUM(o.total_amount) AS user_spend
  FROM users u
  INNER JOIN orders o
    ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, u.full_name, u.country
),
country_avg AS (
  SELECT
    country,
    AVG(user_spend) AS country_avg_spend
  FROM user_spend
  GROUP BY country
)
SELECT
  us.user_id,
  us.full_name,
  us.country,
  ROUND(us.user_spend, 2) AS user_spend,
  ROUND(ca.country_avg_spend, 2) AS country_avg_spend
FROM user_spend us
INNER JOIN country_avg ca
  ON us.country = ca.country
WHERE us.user_spend > ca.country_avg_spend
ORDER BY us.country ASC, us.user_spend DESC, us.user_id ASC;`,
    explanation:
      'Chaining CTEs cleanly separates entity-level aggregation (spend per customer) from group-level benchmarking (average customer spend per country). Comparing unrounded values in `WHERE` before rounding in `SELECT` avoids boundary precision bugs.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (sql.toLowerCase().includes('left join')) {
            return 'Using `LEFT JOIN` pulls in non-buyers with 0 spend, lowering each country’s average. Use `INNER JOIN` on completed orders.';
          }
          if (user.rowCount !== expected.rowCount && !sql.toLowerCase().includes('completed')) {
            return "Check that you filtered `o.status = 'completed'` inside the first CTE.";
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q8-deduplicate-orders-row-number',
    number: 8,
    title: 'Deduplicating Double-Submitted Orders',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'Deduplication', 'Window Functions'],
    stakeholder: 'Data Engineering & Revenue Ops',
    scenario:
      'Data Engineering discovered a checkout retry bug that occasionally recorded duplicate completed order rows with the exact same `user_id`, `order_date`, and `total_amount`. Before publishing country revenue numbers, deduplicate completed orders using `ROW_NUMBER()`, keeping only the earliest `order_id` for each duplicate group, then report clean order count and clean revenue per country.',
    requirements: [
      'Filter `orders` to `status = \'completed\'`.',
      'Assign `ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC)` inside a CTE.',
      'Keep only rows where `rn = 1`, then join to `users` to group by `country`.',
      'Return `country`, `clean_order_count`, and `clean_revenue` (`ROUND(SUM(total_amount), 2)`), ordered by `clean_revenue DESC`, `country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Customer country' },
      { name: 'clean_order_count', type: 'INTEGER', description: 'Deduplicated completed order count' },
      { name: 'clean_revenue', type: 'REAL', description: 'Deduplicated completed revenue (2 decimals)' },
    ],
    starterSql: `-- Deduplicate completed orders caused by checkout double-submits
WITH ranked_orders AS (
  SELECT
    order_id,
    user_id,
    order_date,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY ...
      ORDER BY ...
    ) AS rn
  FROM orders
  WHERE status = 'completed'
)
SELECT ...`,
    hints: [
      'Partition by the duplicate signature `(user_id, order_date, total_amount)` and order by `order_id ASC` so the original submission receives `rn = 1`.',
      'In the outer query, filter `WHERE ro.rn = 1`, join `users u ON ro.user_id = u.user_id`, and group by `u.country`.',
    ],
    solutionSql: `WITH ranked_orders AS (
  SELECT
    order_id,
    user_id,
    order_date,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_date, total_amount
      ORDER BY order_id ASC
    ) AS rn
  FROM orders
  WHERE status = 'completed'
)
SELECT
  u.country,
  COUNT(*) AS clean_order_count,
  ROUND(SUM(ro.total_amount), 2) AS clean_revenue
FROM ranked_orders ro
INNER JOIN users u
  ON ro.user_id = u.user_id
WHERE ro.rn = 1
GROUP BY u.country
ORDER BY clean_revenue DESC, u.country ASC;`,
    explanation:
      'Deduplicating event or transaction logs with `ROW_NUMBER() OVER (PARTITION BY natural_key ORDER BY id ASC)` and filtering `rn = 1` is the canonical warehouse pattern for removing double-writes while keeping deterministic auditability.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (_user, _expected, sql) => {
          if (!sql.toLowerCase().includes('row_number')) {
            return 'Make sure you deduplicate using `ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC)` — there are 5 duplicate completed orders in the dataset!';
          }
          if (!sql.toLowerCase().includes('rn = 1') && !sql.toLowerCase().includes('= 1')) {
            return 'Did you forget to filter the CTE to only the first row (`WHERE rn = 1`)?';
          }
          return null;
        },
      },
    ],
  },

  // =========================================================================
  // HARD (9 - 12)
  // =========================================================================
  {
    id: 'q9-mom-revenue-growth-lag',
    number: 9,
    title: 'Month-over-Month (MoM) Revenue Growth',
    difficulty: 'Hard',
    concepts: ['LAG()', 'Window Functions', 'Time-Series', 'strftime'],
    stakeholder: 'Executive Leadership',
    scenario:
      'The CFO wants a monthly completed revenue time series across 2025–2026 showing each month’s revenue alongside the prior month’s revenue and the Month-over-Month (MoM) percentage growth rate.',
    requirements: [
      'Aggregate completed orders (`status = \'completed\'`) by `order_month` formatted as `YYYY-MM` (`strftime(\'%Y-%m\', order_date)`).',
      'Use `LAG(monthly_revenue) OVER (ORDER BY order_month)` to fetch `prev_month_revenue`.',
      'Compute `mom_growth_pct` as `ROUND(100.0 * (monthly_revenue - prev_month_revenue) / prev_month_revenue, 2)` (will naturally be `NULL` for the first month).',
      'Return `order_month`, `monthly_revenue` (rounded to 2 decimals), `prev_month_revenue` (rounded to 2 decimals), and `mom_growth_pct`, ordered by `order_month ASC`.',
    ],
    expectedColumns: [
      { name: 'order_month', type: 'TEXT', description: 'Calendar month (YYYY-MM)' },
      { name: 'monthly_revenue', type: 'REAL', description: 'Completed revenue in this month' },
      { name: 'prev_month_revenue', type: 'REAL', description: 'Previous month completed revenue (NULL for first month)' },
      { name: 'mom_growth_pct', type: 'REAL', description: 'MoM percentage change (2 decimals, NULL for first month)' },
    ],
    starterSql: `-- Monthly completed revenue and Month-over-Month % growth
WITH monthly_rev AS (
  SELECT
    strftime('%Y-%m', order_date) AS order_month,
    ROUND(SUM(total_amount), 2) AS monthly_revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY strftime('%Y-%m', order_date)
)
SELECT
  order_month,
  monthly_revenue,
  ...
FROM monthly_rev
ORDER BY order_month ASC;`,
    hints: [
      'Wrap the `LAG(monthly_revenue) OVER (ORDER BY order_month)` inside a second CTE (or repeat the `LAG()` expression) so you can reference `prev_month_revenue` cleanly in the growth formula.',
      'Formula: `ROUND(100.0 * (monthly_revenue - prev_month_revenue) / prev_month_revenue, 2)`. In SQL, arithmetic with `NULL` returns `NULL`, so the first month handles itself automatically.',
    ],
    solutionSql: `WITH monthly_rev AS (
  SELECT
    strftime('%Y-%m', order_date) AS order_month,
    ROUND(SUM(total_amount), 2) AS monthly_revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY strftime('%Y-%m', order_date)
),
with_prev AS (
  SELECT
    order_month,
    monthly_revenue,
    LAG(monthly_revenue) OVER (ORDER BY order_month) AS prev_month_revenue
  FROM monthly_rev
)
SELECT
  order_month,
  monthly_revenue,
  prev_month_revenue,
  ROUND(
    100.0 * (monthly_revenue - prev_month_revenue) / prev_month_revenue,
    2
  ) AS mom_growth_pct
FROM with_prev
ORDER BY order_month ASC;`,
    explanation:
      'Aggregating to the monthly grain first ensures `LAG()` steps cleanly across calendar months rather than raw order rows. Splitting `LAG()` into a `with_prev` CTE avoids repeating window expressions and keeps the MoM percentage formula readable and maintainable.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected) => {
          if (user.rowCount > expected.rowCount) {
            return 'Row count is too high — make sure you aggregate by `strftime(\'%Y-%m\', order_date)` BEFORE applying `LAG()`.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q10-7day-rolling-revenue',
    number: 10,
    title: '7-Day Rolling Average Revenue (March 2026)',
    difficulty: 'Hard',
    concepts: ['Window Frame', 'ROWS BETWEEN', 'Rolling Average'],
    stakeholder: 'Growth Analytics',
    scenario:
      'Daily revenue during our March 2026 Spring campaign (`2026-03-01` to `2026-03-21`) fluctuates heavily between weekdays and weekends. Smooth out the noise by calculating each day’s completed revenue alongside its trailing 7-day rolling average (current day plus the 6 preceding days).',
    requirements: [
      'Filter `orders` to `status = \'completed\'` and `order_date BETWEEN \'2026-03-01\' AND \'2026-03-21\'`.',
      'First aggregate daily revenue (`SUM(total_amount)`) by `order_date` in a CTE (note: some days have multiple completed orders!).',
      'Compute `rolling_7d_avg` using `AVG(daily_revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`, rounded to 2 decimal places.',
      'Return `order_date`, `daily_revenue` (rounded to 2 decimals), and `rolling_7d_avg`, ordered by `order_date ASC`.',
    ],
    expectedColumns: [
      { name: 'order_date', type: 'TEXT', description: 'Date in March 2026 (YYYY-MM-DD)' },
      { name: 'daily_revenue', type: 'REAL', description: 'Total completed revenue on that day' },
      { name: 'rolling_7d_avg', type: 'REAL', description: 'Trailing 7-day rolling average (2 decimals)' },
    ],
    starterSql: `-- Daily completed revenue & 7-day rolling average for March 1–21, 2026
WITH daily_sales AS (
  SELECT
    order_date,
    SUM(total_amount) AS daily_revenue
  FROM orders
  WHERE status = 'completed'
    AND order_date BETWEEN '2026-03-01' AND '2026-03-21'
  GROUP BY order_date
)
SELECT
  order_date,
  ...
FROM daily_sales
ORDER BY order_date ASC;`,
    hints: [
      'Always collapse to one row per day in a CTE first! If you run `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` directly on `orders`, days with multiple orders break the 7-day window.',
      'Window clause: `ROUND(AVG(daily_revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7d_avg`.',
    ],
    solutionSql: `WITH daily_sales AS (
  SELECT
    order_date,
    SUM(total_amount) AS daily_revenue
  FROM orders
  WHERE status = 'completed'
    AND order_date BETWEEN '2026-03-01' AND '2026-03-21'
  GROUP BY order_date
)
SELECT
  order_date,
  ROUND(daily_revenue, 2) AS daily_revenue,
  ROUND(
    AVG(daily_revenue) OVER (
      ORDER BY order_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS rolling_7d_avg
FROM daily_sales
ORDER BY order_date ASC;`,
    explanation:
      'Because `2026-03-01` has two completed orders in our dataset, aggregating to daily totals in `daily_sales` first guarantees each row represents exactly one calendar day. Then `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` computes a true trailing 7-day moving average (averaging available days during the initial 6-day ramp-up).',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (user.rowCount > expected.rowCount) {
            return 'You returned more than 21 rows — make sure you aggregate by `order_date` in a CTE first (March 1 has multiple completed orders!).';
          }
          if (!sql.toLowerCase().includes('6 preceding')) {
            return 'Double-check your window frame: a 7-day window (including the current day) uses `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`, not 7 preceding.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q11-cohort-retention-analysis',
    number: 11,
    title: 'Monthly Buyer Cohort Retention Table',
    difficulty: 'Hard',
    concepts: ['Cohort Analysis', 'Multi-CTE', 'Date Math', 'COUNT DISTINCT'],
    stakeholder: 'VP of Product',
    scenario:
      'Product leadership wants a classic buyer retention cohort table based on completed orders. Define each customer’s `cohort_month` as the `YYYY-MM` of their first completed order. For cohorts acquired between `2025-01` and `2025-06`, track how many unique users from each cohort returned to place a completed order in months 0 through 3 (`month_offset` 0, 1, 2, 3), along with the retention percentage.',
    requirements: [
      'Use only `status = \'completed\'` orders.',
      'Assign each user’s `cohort_month` from their earliest completed `order_date` (`MIN(order_date)`), filtered to `cohort_month BETWEEN \'2025-01\' AND \'2025-06\'`.',
      'Calculate `month_offset` as the integer month difference between each order’s month and the user’s `cohort_month`, keeping `month_offset BETWEEN 0 AND 3`.',
      'Return `cohort_month`, `month_offset`, `active_users` (distinct returning users), and `retention_pct` (`ROUND(100.0 * active_users / cohort_size, 2)`).',
      'Order by `cohort_month ASC`, `month_offset ASC`.',
    ],
    expectedColumns: [
      { name: 'cohort_month', type: 'TEXT', description: 'First completed purchase month (2025-01 to 2025-06)' },
      { name: 'month_offset', type: 'INTEGER', description: 'Months elapsed since cohort_month (0 to 3)' },
      { name: 'active_users', type: 'INTEGER', description: 'Distinct cohort users active in that offset month' },
      { name: 'retention_pct', type: 'REAL', description: 'Percentage of cohort still active (2 decimals)' },
    ],
    starterSql: `-- Monthly buyer cohort retention (2025-01 to 2025-06 cohorts, offsets 0..3)
WITH first_purchase AS (
  SELECT
    user_id,
    MIN(order_date) AS first_order_date,
    strftime('%Y-%m', MIN(order_date)) AS cohort_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
cohort_activity AS (
  ...
)
SELECT ...`,
    hints: [
      'In SQLite, compute exact integer month difference with: `(CAST(strftime(\'%Y\', o.order_date) AS INTEGER) - CAST(strftime(\'%Y\', fp.first_order_date) AS INTEGER)) * 12 + (CAST(strftime(\'%m\', o.order_date) AS INTEGER) - CAST(strftime(\'%m\', fp.first_order_date) AS INTEGER))`.',
      'Compute `cohort_size` per `cohort_month` in a CTE (`COUNT(DISTINCT user_id)` from `first_purchase`), then join it to `cohort_activity` (grouped by `cohort_month, month_offset`) to calculate `ROUND(100.0 * active_users / cohort_size, 2)`.',
    ],
    solutionSql: `WITH first_purchase AS (
  SELECT
    user_id,
    MIN(order_date) AS first_order_date,
    strftime('%Y-%m', MIN(order_date)) AS cohort_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
cohort_sizes AS (
  SELECT
    cohort_month,
    COUNT(DISTINCT user_id) AS cohort_size
  FROM first_purchase
  WHERE cohort_month BETWEEN '2025-01' AND '2025-06'
  GROUP BY cohort_month
),
cohort_activity AS (
  SELECT
    fp.cohort_month,
    (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fp.first_order_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fp.first_order_date) AS INTEGER)) AS month_offset,
    COUNT(DISTINCT o.user_id) AS active_users
  FROM orders o
  INNER JOIN first_purchase fp
    ON o.user_id = fp.user_id
  WHERE o.status = 'completed'
    AND fp.cohort_month BETWEEN '2025-01' AND '2025-06'
  GROUP BY fp.cohort_month, month_offset
)
SELECT
  ca.cohort_month,
  ca.month_offset,
  ca.active_users,
  ROUND(100.0 * ca.active_users / cs.cohort_size, 2) AS retention_pct
FROM cohort_activity ca
INNER JOIN cohort_sizes cs
  ON ca.cohort_month = cs.cohort_month
WHERE ca.month_offset BETWEEN 0 AND 3
ORDER BY ca.cohort_month ASC, ca.month_offset ASC;`,
    explanation:
      'Cohort retention is a gold-standard product analytics interview question. It breaks neatly into 3 CTEs: (1) anchor each buyer to their first completed order month, (2) count initial cohort sizes, and (3) count distinct returning buyers at each `month_offset`. Using `COUNT(DISTINCT o.user_id)` ensures users who order twice in the same month are only counted once.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (_user, _expected, sql) => {
          if (!sql.toLowerCase().includes('distinct')) {
            return 'Be careful! Use `COUNT(DISTINCT o.user_id)` so a customer who places multiple orders in the same month is not double-counted.';
          }
          if (!sql.toLowerCase().includes('completed')) {
            return "Make sure you restrict both `first_purchase` and subsequent orders to `status = 'completed'`.";
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'q12-top-products-dense-rank',
    number: 12,
    title: 'Top 2 Revenue Products per Category (With Ties)',
    difficulty: 'Hard',
    concepts: ['DENSE_RANK()', 'PARTITION BY', 'Tie Handling'],
    stakeholder: 'Merchandising Team',
    scenario:
      'Merchandising wants to feature the top 2 highest-grossing products in every product category on the homepage. Because ties in revenue happen in real catalogs, any products tied for 1st or 2nd place must ALL be included using `DENSE_RANK()`.',
    requirements: [
      'Join `orders`, `order_items`, and `products`, filtering to `orders.status = \'completed\'`.',
      'Calculate `total_revenue` (`ROUND(SUM(oi.quantity * oi.unit_price), 2)`) per `(category, product_name)`.',
      'Rank products inside each `category` using `DENSE_RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC)` as `category_rank`.',
      'Return `category`, `product_name`, `total_revenue`, and `category_rank` for `category_rank <= 2`.',
      'Order by `category ASC`, `category_rank ASC`, `product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'total_revenue', type: 'REAL', description: 'Completed line-item revenue (2 decimals)' },
      { name: 'category_rank', type: 'INTEGER', description: 'Dense rank within category (1 or 2)' },
    ],
    starterSql: `-- Top 2 products per category by completed revenue, preserving ties with DENSE_RANK()
WITH product_rev AS (
  SELECT
    p.category,
    p.product_name,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, p.product_name
),
ranked AS (
  ...
)
SELECT ...`,
    hints: [
      'Use `DENSE_RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS category_rank` inside a CTE, because SQL does not allow filtering window functions directly inside `WHERE`.',
      'In the final query, filter `WHERE category_rank <= 2` and sort by `category ASC, category_rank ASC, product_name ASC`. Notice how the Automation category has an exact tie at Rank 2!',
    ],
    solutionSql: `WITH product_rev AS (
  SELECT
    p.category,
    p.product_name,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, p.product_name
),
ranked AS (
  SELECT
    category,
    product_name,
    total_revenue,
    DENSE_RANK() OVER (
      PARTITION BY category
      ORDER BY total_revenue DESC
    ) AS category_rank
  FROM product_rev
)
SELECT
  category,
  product_name,
  total_revenue,
  category_rank
FROM ranked
WHERE category_rank <= 2
ORDER BY category ASC, category_rank ASC, product_name ASC;`,
    explanation:
      'In the `Automation` category, *Alert Bot Suite* and *Webhook Sync Engine* both generated exactly $1,800.00 in completed revenue. `ROW_NUMBER()` would arbitrarily drop one of them, whereas `DENSE_RANK()` assigns both rank `2` so both appear in the Top 2 without skipping subsequent ranks.',
    orderMatters: true,
    commonMistakeHints: [
      {
        check: (user, expected, sql) => {
          if (user.rowCount === expected.rowCount - 1 && sql.toLowerCase().includes('row_number')) {
            return 'Row count is off by 1 (got 8 instead of 9) — `ROW_NUMBER()` drops ties! Switch to `DENSE_RANK()` so both tied Rank-2 products in Automation are included.';
          }
          if (!sql.toLowerCase().includes('dense_rank')) {
            return 'Use `DENSE_RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC)` to properly handle revenue ties.';
          }
          return null;
        },
      },
    ],
  },
];

const ALL_EXTRA = [
  ...EXTRA_EASY_PROBLEMS,
  ...EXTRA_MEDIUM_PROBLEMS,
  ...EXTRA_HARD_PROBLEMS,
].map((bp, idx) => ({
  ...bp,
  number: CORE_PROBLEMS.length + idx + 1,
}));

export const PROBLEMS: Problem[] = [...CORE_PROBLEMS, ...ALL_EXTRA];
