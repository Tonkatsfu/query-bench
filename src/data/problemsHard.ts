import type { ProblemBlueprint } from './problemsEasy';

export const EXTRA_HARD_PROBLEMS: ProblemBlueprint[] = [
  {
    id: 'h5-days-between-consecutive-orders',
    title: 'Average Days Between Repeat Orders per Customer',
    difficulty: 'Hard',
    concepts: ['LAG()', 'julianday', 'PARTITION BY'],
    stakeholder: 'Lifecycle Retention',
    scenario:
      'Lifecycle Retention wants to understand repeat-purchase cadence. For every customer with at least 2 completed orders (on distinct dates or sequential orders), use `LAG(order_date)` to compute the days elapsed since their previous completed order, then report each customer’s repeat-order count and average days between orders.',
    requirements: [
      'CTE 1: use `LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC) AS prev_order_date` on `orders WHERE status = \'completed\'`.',
      'Compute `gap_days = julianday(order_date) - julianday(prev_order_date)` for rows where `prev_order_date IS NOT NULL`.',
      'Join to `users u` and aggregate per user (`user_id`, `full_name`, `repeat_intervals`, `avg_days_between_orders` rounded to 1 decimal).',
      'Order by `avg_days_between_orders ASC`, `u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'repeat_intervals', type: 'INTEGER', description: 'Number of repeat intervals' },
      { name: 'avg_days_between_orders', type: 'REAL', description: 'Avg days between consecutive orders' },
    ],
    starterSql: `WITH ordered_gaps AS (
  SELECT
    user_id,
    order_date,
    LAG(order_date) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS prev_order_date
  FROM orders
  WHERE status = 'completed'
)
SELECT ...`,
    hints: [
      'Filter `WHERE og.prev_order_date IS NOT NULL` in the outer query so each user’s first order is excluded from the interval average.',
      'Calculate `ROUND(AVG(julianday(og.order_date) - julianday(og.prev_order_date)), 1)`.',
    ],
    solutionSql: `WITH ordered_gaps AS (
  SELECT
    user_id,
    order_date,
    LAG(order_date) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS prev_order_date
  FROM orders
  WHERE status = 'completed'
)
SELECT
  u.user_id,
  u.full_name,
  COUNT(*) AS repeat_intervals,
  ROUND(AVG(julianday(og.order_date) - julianday(og.prev_order_date)), 1) AS avg_days_between_orders
FROM ordered_gaps og
INNER JOIN users u
  ON og.user_id = u.user_id
WHERE og.prev_order_date IS NOT NULL
GROUP BY u.user_id, u.full_name
ORDER BY avg_days_between_orders ASC, u.user_id ASC;`,
    explanation:
      'Partitioned `LAG()` computes inter-purchase intervals per customer without slow self-joins.',
    orderMatters: true,
  },
  {
    id: 'h6-cumulative-ltv-by-order-seq',
    title: 'Average Cumulative LTV Curve by Customer Order Number',
    difficulty: 'Hard',
    concepts: ['ROW_NUMBER()', 'UNBOUNDED PRECEDING', 'Window Frame'],
    stakeholder: 'CFO & Unit Economics',
    scenario:
      'How does cumulative customer spend grow from a buyer’s 1st order to their 2nd, 3rd, and 4th+ orders? Assign each completed order its sequence number per customer (`order_seq`), compute that customer’s running cumulative LTV up to that order, and average cumulative LTV across all customers at each `order_seq` (1 through 5).',
    requirements: [
      'CTE 1: on completed `orders`, compute `order_seq = ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC)` and `cum_ltv = SUM(total_amount) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.',
      'Filter to `order_seq <= 5` and group by `order_seq`.',
      'Return `order_seq`, `customers_reaching_seq` (`COUNT(*)`), and `avg_cumulative_ltv` (`ROUND(AVG(cum_ltv), 2)`), ordered by `order_seq ASC`.',
    ],
    expectedColumns: [
      { name: 'order_seq', type: 'INTEGER', description: 'Customer order sequence (1..5)' },
      { name: 'customers_reaching_seq', type: 'INTEGER', description: 'Buyers reaching this order #' },
      { name: 'avg_cumulative_ltv', type: 'REAL', description: 'Average cumulative spend at this order #' },
    ],
    starterSql: `WITH user_seq AS (
  SELECT
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC) AS order_seq,
    SUM(total_amount) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cum_ltv
  FROM orders
  WHERE status = 'completed'
)
SELECT ...`,
    hints: [
      'Both `ROW_NUMBER()` and `SUM() OVER (...)` share the exact same `PARTITION BY user_id ORDER BY order_date ASC, order_id ASC`.',
      'Group the outer query by `order_seq` with `WHERE order_seq <= 5`.',
    ],
    solutionSql: `WITH user_seq AS (
  SELECT
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS order_seq,
    SUM(total_amount) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cum_ltv
  FROM orders
  WHERE status = 'completed'
)
SELECT
  order_seq,
  COUNT(*) AS customers_reaching_seq,
  ROUND(AVG(cum_ltv), 2) AS avg_cumulative_ltv
FROM user_seq
WHERE order_seq <= 5
GROUP BY order_seq
ORDER BY order_seq ASC;`,
    explanation:
      'Combining `ROW_NUMBER()` with a running `SUM() OVER` aligns every buyer onto a common order-sequence axis for LTV curve modeling.',
    orderMatters: true,
  },
  {
    id: 'h7-pareto-revenue-concentration',
    title: 'Pareto (80/20) Product Revenue Concentration',
    difficulty: 'Hard',
    concepts: ['Window SUM', 'UNBOUNDED PRECEDING', 'Pareto Analysis'],
    stakeholder: 'Merchandising Leadership',
    scenario:
      'Run a Pareto analysis across all products in completed orders: rank products from highest to lowest revenue, compute each product’s running cumulative revenue, and compute its cumulative % share of total catalog revenue.',
    requirements: [
      'CTE 1 (`prod_rev`): compute `product_revenue` (`SUM(oi.quantity * oi.unit_price)`) per `product_name` and `category` on completed orders.',
      'In the outer query, compute `cumulative_rev = SUM(product_revenue) OVER (ORDER BY product_revenue DESC, product_name ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` and `total_rev = SUM(product_revenue) OVER ()`.',
      'Return `product_name`, `category`, `product_revenue` (2 decimals), and `cumulative_share_pct` (`ROUND(100.0 * cumulative_rev / total_rev, 2)`).',
      'Order by `product_revenue DESC, product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Category' },
      { name: 'product_revenue', type: 'REAL', description: 'Completed product revenue' },
      { name: 'cumulative_share_pct', type: 'REAL', description: 'Running % of total catalog revenue' },
    ],
    starterSql: `WITH prod_rev AS (
  SELECT
    p.product_name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS product_revenue
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.product_id, p.product_name, p.category
)
SELECT ...`,
    hints: [
      '`SUM(product_revenue) OVER ()` gives the grand total across all rows without a subquery.',
      'Use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` with deterministic tie-breaking (`ORDER BY product_revenue DESC, product_name ASC`).',
    ],
    solutionSql: `WITH prod_rev AS (
  SELECT
    p.product_name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS product_revenue
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.product_id, p.product_name, p.category
)
SELECT
  product_name,
  category,
  ROUND(product_revenue, 2) AS product_revenue,
  ROUND(
    100.0 * SUM(product_revenue) OVER (
      ORDER BY product_revenue DESC, product_name ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) / SUM(product_revenue) OVER (),
    2
  ) AS cumulative_share_pct
FROM prod_rev
ORDER BY product_revenue DESC, product_name ASC;`,
    explanation:
      'Dividing a running window `SUM()` by an unpartitioned grand-total `SUM() OVER ()` produces Pareto curves in one concise query.',
    orderMatters: true,
  },
  {
    id: 'h8-signup-to-first-purchase-cohort',
    title: 'Signup Cohort Conversion Latency (Months to First Purchase)',
    difficulty: 'Hard',
    concepts: ['Cohort Analysis', 'LEFT JOIN', 'Date Math'],
    stakeholder: 'Growth Strategy',
    scenario:
      'Unlike purchase-based cohorts, measure conversion speed from registration: for users who signed up between `2025-01` and `2025-06`, group by `signup_month` (`YYYY-MM`) and `months_to_purchase` (`0` = same month as signup, `1` = next month, etc.) for their first completed order, showing `converted_users` and `% of signup cohort`.',
    requirements: [
      'CTE 1: get each user’s `signup_month` (`strftime(\'%Y-%m\', signup_date)`) and `cohort_size` for signups in `2025-01`..`2025-06`.',
      'CTE 2: find each user’s `first_order_date` (`MIN(order_date)` where `status = \'completed\'`).',
      'Compute integer `months_to_purchase` between `signup_date` and `first_order_date`.',
      'Return `signup_month`, `months_to_purchase`, `converted_users`, and `cohort_conversion_pct` (`ROUND(100.0 * converted_users / cohort_size, 2)`), ordered by `signup_month ASC, months_to_purchase ASC`.',
    ],
    expectedColumns: [
      { name: 'signup_month', type: 'TEXT', description: 'Signup cohort month (2025-01..2025-06)' },
      { name: 'months_to_purchase', type: 'INTEGER', description: 'Months from signup to 1st order' },
      { name: 'converted_users', type: 'INTEGER', description: 'Users converting at this offset' },
      { name: 'cohort_conversion_pct', type: 'REAL', description: '% of total signup cohort' },
    ],
    starterSql: `WITH signup_cohorts AS (
  SELECT
    user_id,
    signup_date,
    strftime('%Y-%m', signup_date) AS signup_month
  FROM users
  WHERE strftime('%Y-%m', signup_date) BETWEEN '2025-01' AND '2025-06'
),
cohort_sizes AS (
  SELECT signup_month, COUNT(*) AS cohort_size
  FROM signup_cohorts
  GROUP BY signup_month
),
first_orders AS (
  SELECT user_id, MIN(order_date) AS first_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT ...`,
    hints: [
      'Compute integer month offset using `(CAST(strftime(\'%Y\', first_order_date) AS INTEGER) - CAST(strftime(\'%Y\', signup_date) AS INTEGER)) * 12 + (CAST(strftime(\'%m\', first_order_date) AS INTEGER) - CAST(strftime(\'%m\', signup_date) AS INTEGER))`.',
      'Join `cohort_sizes` so the denominator includes all signups (even users who never converted).',
    ],
    solutionSql: `WITH signup_cohorts AS (
  SELECT
    user_id,
    signup_date,
    strftime('%Y-%m', signup_date) AS signup_month
  FROM users
  WHERE strftime('%Y-%m', signup_date) BETWEEN '2025-01' AND '2025-06'
),
cohort_sizes AS (
  SELECT
    signup_month,
    COUNT(*) AS cohort_size
  FROM signup_cohorts
  GROUP BY signup_month
),
first_orders AS (
  SELECT
    user_id,
    MIN(order_date) AS first_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
conversions AS (
  SELECT
    sc.signup_month,
    (CAST(strftime('%Y', fo.first_order_date) AS INTEGER) - CAST(strftime('%Y', sc.signup_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', fo.first_order_date) AS INTEGER) - CAST(strftime('%m', sc.signup_date) AS INTEGER)) AS months_to_purchase,
    COUNT(*) AS converted_users
  FROM signup_cohorts sc
  INNER JOIN first_orders fo
    ON sc.user_id = fo.user_id
  GROUP BY sc.signup_month, months_to_purchase
)
SELECT
  c.signup_month,
  c.months_to_purchase,
  c.converted_users,
  ROUND(100.0 * c.converted_users / cs.cohort_size, 2) AS cohort_conversion_pct
FROM conversions c
INNER JOIN cohort_sizes cs
  ON c.signup_month = cs.signup_month
ORDER BY c.signup_month ASC, c.months_to_purchase ASC;`,
    explanation:
      'Separating signup cohort denominators from first-purchase events accurately tracks registration-to-revenue payback speed.',
    orderMatters: true,
  },
  {
    id: 'h9-clickstream-next-event-transitions',
    title: 'Clickstream Next-Event Transition Matrix (LEAD)',
    difficulty: 'Hard',
    concepts: ['LEAD()', 'PARTITION BY', 'Funnel Pathing'],
    stakeholder: 'Product Analytics',
    scenario:
      'Product Analytics wants to map user navigation flows inside `web_events`: for each event in a session, find the very next event (`LEAD(event_name)`) in that same `session_id` (or `\'EXIT\'` if it was the last event), and count how often each `current_event -> next_event` transition occurred.',
    requirements: [
      'In a CTE, compute `next_event = COALESCE(LEAD(event_name) OVER (PARTITION BY session_id ORDER BY event_timestamp ASC, event_id ASC), \'EXIT\')`.',
      'Group by `event_name` (`current_event`) and `next_event`, counting `transition_count` (`COUNT(*)`).',
      'Keep transitions with `transition_count >= 2`, ordered by `transition_count DESC, current_event ASC, next_event ASC`.',
    ],
    expectedColumns: [
      { name: 'current_event', type: 'TEXT', description: 'Origin event name' },
      { name: 'next_event', type: 'TEXT', description: 'Immediate next event or EXIT' },
      { name: 'transition_count', type: 'INTEGER', description: 'Times transition occurred (>= 2)' },
    ],
    starterSql: `WITH transitions AS (
  SELECT
    event_name AS current_event,
    COALESCE(
      LEAD(event_name) OVER (
        PARTITION BY session_id
        ORDER BY event_timestamp ASC, event_id ASC
      ),
      'EXIT'
    ) AS next_event
  FROM web_events
)
SELECT ...`,
    hints: [
      '`LEAD(event_name)` returns `NULL` on the final event of each `session_id`; `COALESCE(..., \'EXIT\')` labels session endings cleanly.',
      'Filter `HAVING COUNT(*) >= 2`.',
    ],
    solutionSql: `WITH transitions AS (
  SELECT
    event_name AS current_event,
    COALESCE(
      LEAD(event_name) OVER (
        PARTITION BY session_id
        ORDER BY event_timestamp ASC, event_id ASC
      ),
      'EXIT'
    ) AS next_event
  FROM web_events
)
SELECT
  current_event,
  next_event,
  COUNT(*) AS transition_count
FROM transitions
GROUP BY current_event, next_event
HAVING COUNT(*) >= 2
ORDER BY transition_count DESC, current_event ASC, next_event ASC;`,
    explanation:
      'Partitioned `LEAD()` constructs Markov-style session transition paths directly in SQL for Sankey/funnel diagrams.',
    orderMatters: true,
  },
  {
    id: 'h10-session-duration-buyers-vs-nonbuyers',
    title: 'Session Duration: Converting vs. Non-Converting Multi-Event Sessions',
    difficulty: 'Hard',
    concepts: ['CTE (WITH)', 'julianday', 'HAVING'],
    stakeholder: 'UX Research',
    scenario:
      'Compare average session duration (in minutes) for multi-event sessions (`COUNT(*) >= 2`) that ended in a `purchase` versus multi-event sessions that did NOT end in a `purchase`.',
    requirements: [
      'In a CTE (`session_stats`), group `web_events` by `session_id` with `HAVING COUNT(*) >= 2`.',
      'Compute `duration_mins = (julianday(MAX(event_timestamp)) - julianday(MIN(event_timestamp))) * 1440.0` and `converted = MAX(CASE WHEN event_name = \'purchase\' THEN 1 ELSE 0 END)`.',
      'In the outer query, group by `CASE WHEN converted = 1 THEN \'Converted\' ELSE \'Non-Converted\' END AS session_outcome`, returning `session_outcome`, `session_count`, `avg_duration_mins` (2 decimals), and `max_duration_mins` (2 decimals).',
      'Order by `avg_duration_mins DESC`.',
    ],
    expectedColumns: [
      { name: 'session_outcome', type: 'TEXT', description: 'Converted or Non-Converted' },
      { name: 'session_count', type: 'INTEGER', description: 'Multi-event sessions' },
      { name: 'avg_duration_mins', type: 'REAL', description: 'Average session minutes' },
      { name: 'max_duration_mins', type: 'REAL', description: 'Longest session minutes' },
    ],
    starterSql: `WITH session_stats AS (
  SELECT
    session_id,
    (julianday(MAX(event_timestamp)) - julianday(MIN(event_timestamp))) * 1440.0 AS duration_mins,
    MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS converted
  FROM web_events
  GROUP BY session_id
  HAVING COUNT(*) >= 2
)
SELECT ...`,
    hints: [
      'There are 1,440 minutes in a day (`24 * 60`), so `(julianday(end) - julianday(start)) * 1440.0` yields minutes.',
      'Group `session_stats` by `session_outcome` and order by `avg_duration_mins DESC`.',
    ],
    solutionSql: `WITH session_stats AS (
  SELECT
    session_id,
    (julianday(MAX(event_timestamp)) - julianday(MIN(event_timestamp))) * 1440.0 AS duration_mins,
    MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS converted
  FROM web_events
  GROUP BY session_id
  HAVING COUNT(*) >= 2
)
SELECT
  CASE WHEN converted = 1 THEN 'Converted' ELSE 'Non-Converted' END AS session_outcome,
  COUNT(*) AS session_count,
  ROUND(AVG(duration_mins), 2) AS avg_duration_mins,
  ROUND(MAX(duration_mins), 2) AS max_duration_mins
FROM session_stats
GROUP BY session_outcome
ORDER BY avg_duration_mins DESC;`,
    explanation:
      'Collapsing clickstream events to session grain with `HAVING COUNT(*) >= 2` eliminates zero-second single-hit bounces before timing analysis.',
    orderMatters: true,
  },
  {
    id: 'h11-monthly-running-net-mrr-balance',
    title: 'Cumulative Ending MRR Balance & MoM Net MRR Growth',
    difficulty: 'Hard',
    concepts: ['UNION ALL', 'UNBOUNDED PRECEDING', 'LAG()'],
    stakeholder: 'SaaS CFO',
    scenario:
      'Using `subscriptions`, build a monthly SaaS MRR waterfall across every month with MRR activity: compute `new_mrr`, `churned_mrr`, `net_mrr_change`, the cumulative `ending_mrr` (`SUM(net_mrr_change) OVER (ORDER BY month)`), and `mom_mrr_growth_pct` vs the previous month’s `ending_mrr`.',
    requirements: [
      'CTE 1: `UNION ALL` positive `mrr_amount` at `start_date` (`status != \'trialing\'`) and negative `-mrr_amount` at `end_date` (`status = \'cancelled\' AND end_date IS NOT NULL`).',
      'CTE 2: aggregate `new_mrr`, `churned_mrr`, and `net_mrr_change` per `month` (`YYYY-MM`).',
      'CTE 3: compute `ending_mrr = ROUND(SUM(net_mrr_change) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2)`.',
      'Final SELECT: use `LAG(ending_mrr) OVER (ORDER BY month)` to compute `mom_mrr_growth_pct` (`ROUND(100.0 * (ending_mrr - prev_mrr) / prev_mrr, 2)`), ordered by `month ASC`.',
    ],
    expectedColumns: [
      { name: 'month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'net_mrr_change', type: 'REAL', description: 'New minus churned MRR' },
      { name: 'ending_mrr', type: 'REAL', description: 'Cumulative active MRR at month end' },
      { name: 'mom_mrr_growth_pct', type: 'REAL', description: 'MoM ending MRR % growth' },
    ],
    starterSql: `WITH mrr_flows AS (
  SELECT strftime('%Y-%m', start_date) AS month, mrr_amount AS delta
  FROM subscriptions
  WHERE status != 'trialing'
  UNION ALL
  SELECT strftime('%Y-%m', end_date) AS month, -mrr_amount AS delta
  FROM subscriptions
  WHERE status = 'cancelled' AND end_date IS NOT NULL
),
monthly_net AS (
  SELECT month, ROUND(SUM(delta), 2) AS net_mrr_change
  FROM mrr_flows
  GROUP BY month
),
running_mrr AS (
  SELECT
    month,
    net_mrr_change,
    ROUND(SUM(net_mrr_change) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS ending_mrr
  FROM monthly_net
)
SELECT ...`,
    hints: [
      'Separate running `SUM()` (`ending_mrr`) and `LAG(ending_mrr)` into consecutive CTEs because SQL cannot nest window functions.',
      'Order chronologically by `month ASC`.',
    ],
    solutionSql: `WITH mrr_flows AS (
  SELECT
    strftime('%Y-%m', start_date) AS month,
    mrr_amount AS delta
  FROM subscriptions
  WHERE status != 'trialing'
  UNION ALL
  SELECT
    strftime('%Y-%m', end_date) AS month,
    -mrr_amount AS delta
  FROM subscriptions
  WHERE status = 'cancelled'
    AND end_date IS NOT NULL
),
monthly_net AS (
  SELECT
    month,
    ROUND(SUM(delta), 2) AS net_mrr_change
  FROM mrr_flows
  GROUP BY month
),
running_mrr AS (
  SELECT
    month,
    net_mrr_change,
    ROUND(
      SUM(net_mrr_change) OVER (
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ),
      2
    ) AS ending_mrr
  FROM monthly_net
),
with_prev AS (
  SELECT
    month,
    net_mrr_change,
    ending_mrr,
    LAG(ending_mrr) OVER (ORDER BY month) AS prev_ending_mrr
  FROM running_mrr
)
SELECT
  month,
  net_mrr_change,
  ending_mrr,
  ROUND(100.0 * (ending_mrr - prev_ending_mrr) / prev_ending_mrr, 2) AS mom_mrr_growth_pct
FROM with_prev
ORDER BY month ASC;`,
    explanation:
      'Chaining `UNION ALL` → monthly net → running `SUM()` → `LAG()` produces a full SaaS MRR balance sheet.',
    orderMatters: true,
  },
  {
    id: 'h12-customer-rfm-ntile-scoring',
    title: 'Customer RFM Tertile Scoring (NTILE 1–3)',
    difficulty: 'Hard',
    concepts: ['NTILE()', 'CTE (WITH)', 'RFM Analysis'],
    stakeholder: 'CRM & Loyalty',
    scenario:
      'Build an RFM (Recency, Frequency, Monetary) scoring model across all paying customers (`status = \'completed\'`) using `NTILE(3)`: score `recency_score` (3 = most recent `last_order_date`), `frequency_score` (3 = highest order count), and `monetary_score` (3 = highest total spend), plus combined `rfm_total`.',
    requirements: [
      'CTE 1: compute `last_order_date` (`MAX(o.order_date)`), `order_count` (`COUNT(*)`), and `total_spend` (`ROUND(SUM(o.total_amount), 2)`) per `(user_id, full_name)`.',
      'CTE 2: assign `NTILE(3) OVER (ORDER BY last_order_date ASC, user_id ASC)` as `r_score`, `NTILE(3) OVER (ORDER BY order_count ASC, user_id ASC)` as `f_score`, and `NTILE(3) OVER (ORDER BY total_spend ASC, user_id ASC)` as `m_score` (so `3` is best!).',
      'Return `user_id`, `full_name`, `r_score`, `f_score`, `m_score`, and `rfm_total` (`r_score + f_score + m_score`).',
      'Order by `rfm_total DESC, total_spend DESC, user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'r_score', type: 'INTEGER', description: 'Recency score (1–3, 3 best)' },
      { name: 'f_score', type: 'INTEGER', description: 'Frequency score (1–3, 3 best)' },
      { name: 'm_score', type: 'INTEGER', description: 'Monetary score (1–3, 3 best)' },
      { name: 'rfm_total', type: 'INTEGER', description: 'Sum of R + F + M (3–9)' },
    ],
    starterSql: `WITH buyer_metrics AS (
  SELECT
    u.user_id,
    u.full_name,
    MAX(o.order_date) AS last_order_date,
    COUNT(*) AS order_count,
    ROUND(SUM(o.total_amount), 2) AS total_spend
  FROM users u
  INNER JOIN orders o ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, u.full_name
),
scored AS (
  SELECT
    user_id,
    full_name,
    total_spend,
    NTILE(3) OVER (ORDER BY last_order_date ASC, user_id ASC) AS r_score,
    NTILE(3) OVER (ORDER BY order_count ASC, user_id ASC) AS f_score,
    NTILE(3) OVER (ORDER BY total_spend ASC, user_id ASC) AS m_score
  FROM buyer_metrics
)
SELECT ...`,
    hints: [
      'Ordering `ASC` inside `NTILE(3)` gives bucket `1` to the lowest/oldest and bucket `3` to the highest/most recent!',
      'Include `user_id ASC` as tie-breaker inside each `NTILE(3)` window so buckets are 100% deterministic.',
    ],
    solutionSql: `WITH buyer_metrics AS (
  SELECT
    u.user_id,
    u.full_name,
    MAX(o.order_date) AS last_order_date,
    COUNT(*) AS order_count,
    ROUND(SUM(o.total_amount), 2) AS total_spend
  FROM users u
  INNER JOIN orders o
    ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, u.full_name
),
scored AS (
  SELECT
    user_id,
    full_name,
    total_spend,
    NTILE(3) OVER (ORDER BY last_order_date ASC, user_id ASC) AS r_score,
    NTILE(3) OVER (ORDER BY order_count ASC, user_id ASC) AS f_score,
    NTILE(3) OVER (ORDER BY total_spend ASC, user_id ASC) AS m_score
  FROM buyer_metrics
)
SELECT
  user_id,
  full_name,
  r_score,
  f_score,
  m_score,
  (r_score + f_score + m_score) AS rfm_total
FROM scored
ORDER BY rfm_total DESC, total_spend DESC, user_id ASC;`,
    explanation:
      'Three independent `NTILE()` windows turn raw behavioral metrics into an actionable 3–9 CRM RFM scorecard.',
    orderMatters: true,
  },
  {
    id: 'h13-rolling-3-month-revenue-avg',
    title: 'Trailing 3-Month Rolling Average Revenue',
    difficulty: 'Hard',
    concepts: ['ROWS BETWEEN', 'Window Frame', 'Time-Series'],
    stakeholder: 'Executive Finance',
    scenario:
      'Smooth seasonal monthly fluctuations across 2025–2026 by reporting each calendar month’s completed revenue alongside its trailing 3-month rolling average (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`).',
    requirements: [
      'Aggregate completed `orders` by `order_month` (`strftime(\'%Y-%m\', order_date)`) in a CTE.',
      'Compute `rolling_3m_avg = ROUND(AVG(monthly_revenue) OVER (ORDER BY order_month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)`.',
      'Return `order_month`, `monthly_revenue`, and `rolling_3m_avg`, ordered by `order_month ASC`.',
    ],
    expectedColumns: [
      { name: 'order_month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'monthly_revenue', type: 'REAL', description: 'Monthly completed revenue' },
      { name: 'rolling_3m_avg', type: 'REAL', description: 'Trailing 3-month average' },
    ],
    starterSql: `WITH monthly_rev AS (
  SELECT
    strftime('%Y-%m', order_date) AS order_month,
    ROUND(SUM(total_amount), 2) AS monthly_revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY strftime('%Y-%m', order_date)
)
SELECT ...`,
    hints: [
      'A 3-month trailing window including the current month uses `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`.',
      'Sort by `order_month ASC`.',
    ],
    solutionSql: `WITH monthly_rev AS (
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
  ROUND(
    AVG(monthly_revenue) OVER (
      ORDER BY order_month
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS rolling_3m_avg
FROM monthly_rev
ORDER BY order_month ASC;`,
    explanation:
      'Pre-aggregating to monthly grain guarantees `2 PRECEDING AND CURRENT ROW` spans exact 3-month trailing windows.',
    orderMatters: true,
  },
  {
    id: 'h14-category-share-shift-mom',
    title: 'Monthly Category Revenue Share & MoM Share Shift (bps/pct)',
    difficulty: 'Hard',
    concepts: ['Window SUM', 'LAG()', 'PARTITION BY'],
    stakeholder: 'Category Strategy',
    scenario:
      'For each `order_month` and product `category` in 2025–2026 (where that category had completed sales), compute the category’s % share of that month’s total line-item revenue (`share_pct`), the prior active month’s share (`prev_share_pct`), and the percentage-point change (`share_shift_pp`).',
    requirements: [
      'CTE 1: aggregate `cat_rev` per `(order_month, category)` from completed `orders`, `order_items`, and `products`.',
      'CTE 2: compute `share_pct = 100.0 * cat_rev / SUM(cat_rev) OVER (PARTITION BY order_month)`.',
      'CTE 3: use `LAG(share_pct) OVER (PARTITION BY category ORDER BY order_month)` as `prev_share_pct`.',
      'Return `category`, `order_month`, `share_pct` (2 decimals), `prev_share_pct` (2 decimals), and `share_shift_pp` (`ROUND(share_pct - prev_share_pct, 2)`), ordered by `category ASC, order_month ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'order_month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'share_pct', type: 'REAL', description: 'Category share of monthly revenue (%)' },
      { name: 'prev_share_pct', type: 'REAL', description: 'Prior month share (%)' },
      { name: 'share_shift_pp', type: 'REAL', description: 'Percentage-point change' },
    ],
    starterSql: `WITH cat_monthly AS (
  SELECT
    strftime('%Y-%m', o.order_date) AS order_month,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS cat_rev
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY strftime('%Y-%m', o.order_date), p.category
),
with_share AS (
  SELECT
    order_month,
    category,
    100.0 * cat_rev / SUM(cat_rev) OVER (PARTITION BY order_month) AS share_pct
  FROM cat_monthly
)
SELECT ...`,
    hints: [
      'Notice the two different `PARTITION BY` clauses: `SUM(...) OVER (PARTITION BY order_month)` computes monthly mix, while `LAG(...) OVER (PARTITION BY category ORDER BY order_month)` compares across months!',
      'Round `share_pct`, `prev_share_pct`, and `share_shift_pp` in the final `SELECT`.',
    ],
    solutionSql: `WITH cat_monthly AS (
  SELECT
    strftime('%Y-%m', o.order_date) AS order_month,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS cat_rev
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY strftime('%Y-%m', o.order_date), p.category
),
with_share AS (
  SELECT
    order_month,
    category,
    100.0 * cat_rev / SUM(cat_rev) OVER (PARTITION BY order_month) AS share_pct
  FROM cat_monthly
),
with_lag AS (
  SELECT
    order_month,
    category,
    share_pct,
    LAG(share_pct) OVER (PARTITION BY category ORDER BY order_month) AS prev_share_pct
  FROM with_share
)
SELECT
  category,
  order_month,
  ROUND(share_pct, 2) AS share_pct,
  ROUND(prev_share_pct, 2) AS prev_share_pct,
  ROUND(share_pct - prev_share_pct, 2) AS share_shift_pp
FROM with_lag
ORDER BY category ASC, order_month ASC;`,
    explanation:
      'Combining orthogonal window partitions (`PARTITION BY month` for mix, `PARTITION BY category` for MoM lag) is a staple analytics-engineering skill.',
    orderMatters: true,
  },
  {
    id: 'h15-monthly-tickets-vs-refund-rate',
    title: 'Monthly Support Ticket Volume vs. Order Refund Rate',
    difficulty: 'Hard',
    concepts: ['CTE (WITH)', 'LEFT JOIN', 'Conditional Aggregation'],
    stakeholder: 'VP of Operations',
    scenario:
      'Do spikes in support ticket volume coincide with higher monthly refund rates? Aggregate `orders` by month (`total_orders`, `refund_rate_pct`) and `support_tickets` by month (`tickets_created`) in separate CTEs, then join them cleanly by month.',
    requirements: [
      'CTE 1 (`monthly_orders`): group `orders` by `month = strftime(\'%Y-%m\', order_date)` computing `total_orders` and `refund_rate_pct` (`ROUND(100.0 * SUM(CASE WHEN status = \'refunded\' THEN 1 ELSE 0 END) / COUNT(*), 2)`).',
      'CTE 2 (`monthly_tickets`): group `support_tickets` by `month = strftime(\'%Y-%m\', created_at)` computing `tickets_created`.',
      '`LEFT JOIN` `monthly_orders` to `monthly_tickets` on `month`, using `COALESCE(tickets_created, 0)`.',
      'Order by `month ASC`.',
    ],
    expectedColumns: [
      { name: 'month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'total_orders', type: 'INTEGER', description: 'Orders placed' },
      { name: 'refund_rate_pct', type: 'REAL', description: 'Monthly refund rate (%)' },
      { name: 'tickets_created', type: 'INTEGER', description: 'Support tickets opened' },
    ],
    starterSql: `WITH monthly_orders AS (
  SELECT
    strftime('%Y-%m', order_date) AS month,
    COUNT(*) AS total_orders,
    ROUND(100.0 * SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) / COUNT(*), 2) AS refund_rate_pct
  FROM orders
  GROUP BY strftime('%Y-%m', order_date)
),
monthly_tickets AS (
  SELECT
    strftime('%Y-%m', created_at) AS month,
    COUNT(*) AS tickets_created
  FROM support_tickets
  GROUP BY strftime('%Y-%m', created_at)
)
SELECT ...`,
    hints: [
      'Aggregating each table to monthly grain first prevents Cartesian fan-out between `orders` and `support_tickets`.',
      'Use `COALESCE(mt.tickets_created, 0)` for months with zero tickets.',
    ],
    solutionSql: `WITH monthly_orders AS (
  SELECT
    strftime('%Y-%m', order_date) AS month,
    COUNT(*) AS total_orders,
    ROUND(100.0 * SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) / COUNT(*), 2) AS refund_rate_pct
  FROM orders
  GROUP BY strftime('%Y-%m', order_date)
),
monthly_tickets AS (
  SELECT
    strftime('%Y-%m', created_at) AS month,
    COUNT(*) AS tickets_created
  FROM support_tickets
  GROUP BY strftime('%Y-%m', created_at)
)
SELECT
  mo.month,
  mo.total_orders,
  mo.refund_rate_pct,
  COALESCE(mt.tickets_created, 0) AS tickets_created
FROM monthly_orders mo
LEFT JOIN monthly_tickets mt
  ON mo.month = mt.month
ORDER BY mo.month ASC;`,
    explanation:
      'Joining pre-aggregated monthly time series keeps independent operational KPIs aligned without row duplication.',
    orderMatters: true,
  },
  {
    id: 'h16-first-vs-last-touch-utm-attribution',
    title: 'First-Touch vs. Last-Touch UTM Attribution (FIRST_VALUE / LAST_VALUE)',
    difficulty: 'Hard',
    concepts: ['FIRST_VALUE()', 'LAST_VALUE()', 'Attribution'],
    stakeholder: 'Marketing Analytics',
    scenario:
      'For every logged-in user who triggered a `purchase` event in `web_events`, compare their very first recorded `utm_source` (`first_touch`) against the `utm_source` on their last recorded event (`last_touch`), treating NULLs as `\'direct\'`.',
    requirements: [
      'Filter `web_events` to `user_id IS NOT NULL` for users who have at least one `purchase` event.',
      'Use `FIRST_VALUE(COALESCE(utm_source, \'direct\'))` and `LAST_VALUE(COALESCE(utm_source, \'direct\'))` over `PARTITION BY user_id ORDER BY event_timestamp ASC, event_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.',
      'Deduplicate to 1 row per user (`SELECT DISTINCT` or `ROW_NUMBER()`), join `users u`, and return `user_id`, `full_name`, `first_touch`, and `last_touch`.',
      'Order by `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Converted user ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'first_touch', type: 'TEXT', description: 'Earliest UTM source' },
      { name: 'last_touch', type: 'TEXT', description: 'Latest UTM source' },
    ],
    starterSql: `WITH purchasers AS (
  SELECT DISTINCT user_id
  FROM web_events
  WHERE event_name = 'purchase' AND user_id IS NOT NULL
),
touches AS (
  SELECT
    we.user_id,
    FIRST_VALUE(COALESCE(we.utm_source, 'direct')) OVER (
      PARTITION BY we.user_id
      ORDER BY we.event_timestamp ASC, we.event_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_touch,
    LAST_VALUE(COALESCE(we.utm_source, 'direct')) OVER (
      PARTITION BY we.user_id
      ORDER BY we.event_timestamp ASC, we.event_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_touch
  FROM web_events we
  INNER JOIN purchasers p ON we.user_id = p.user_id
)
SELECT ...`,
    hints: [
      '**Classic SQL trap:** Without `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, `LAST_VALUE()` stops at the `CURRENT ROW`!',
      'Use `SELECT DISTINCT` on `touches` joined to `users u`.',
    ],
    solutionSql: `WITH purchasers AS (
  SELECT DISTINCT user_id
  FROM web_events
  WHERE event_name = 'purchase'
    AND user_id IS NOT NULL
),
touches AS (
  SELECT DISTINCT
    we.user_id,
    FIRST_VALUE(COALESCE(we.utm_source, 'direct')) OVER (
      PARTITION BY we.user_id
      ORDER BY we.event_timestamp ASC, we.event_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_touch,
    LAST_VALUE(COALESCE(we.utm_source, 'direct')) OVER (
      PARTITION BY we.user_id
      ORDER BY we.event_timestamp ASC, we.event_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_touch
  FROM web_events we
  INNER JOIN purchasers p
    ON we.user_id = p.user_id
)
SELECT
  u.user_id,
  u.full_name,
  t.first_touch,
  t.last_touch
FROM touches t
INNER JOIN users u
  ON t.user_id = u.user_id
ORDER BY u.user_id ASC;`,
    explanation:
      'Specifying `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is mandatory for `LAST_VALUE()` to inspect the entire partition.',
    orderMatters: true,
  },
  {
    id: 'h17-campaign-roas-rank-and-payback',
    title: 'Promo Campaign ROAS Ranking & Profit Net of Ad Spend',
    difficulty: 'Hard',
    concepts: ['RANK()', 'LEFT JOIN', 'CTE (WITH)'],
    stakeholder: 'CMO Office',
    scenario:
      'For every promo campaign in `marketing_campaigns`, calculate attributed completed revenue (matched by `promo_code` and date flight), net contribution after ad spend (`attributed_revenue - spend_usd`), ROAS, and `RANK()` ordered by ROAS descending.',
    requirements: [
      'CTE 1: `LEFT JOIN` `marketing_campaigns mc` (`mc.promo_code IS NOT NULL`) to completed `orders o` on `o.discount_code = mc.promo_code AND o.order_date BETWEEN mc.start_date AND mc.end_date`.',
      'Compute `attributed_revenue`, `net_after_spend` (`attributed_revenue - spend_usd`), and `roas` (`ROUND(attributed_revenue / spend_usd, 2)`).',
      'Rank with `RANK() OVER (ORDER BY roas DESC) AS roas_rank`, ordered by `roas_rank ASC, campaign_name ASC`.',
    ],
    expectedColumns: [
      { name: 'roas_rank', type: 'INTEGER', description: 'ROAS rank (1 = best)' },
      { name: 'campaign_name', type: 'TEXT', description: 'Campaign name' },
      { name: 'spend_usd', type: 'REAL', description: 'Ad spend' },
      { name: 'attributed_revenue', type: 'REAL', description: 'Attributed revenue' },
      { name: 'net_after_spend', type: 'REAL', description: 'Revenue minus ad spend' },
      { name: 'roas', type: 'REAL', description: 'ROAS multiplier' },
    ],
    starterSql: `WITH camp_perf AS (
  SELECT
    mc.campaign_name,
    mc.spend_usd,
    ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS attributed_revenue,
    ROUND(COALESCE(SUM(o.total_amount), 0) - mc.spend_usd, 2) AS net_after_spend,
    ROUND(COALESCE(SUM(o.total_amount), 0) / mc.spend_usd, 2) AS roas
  FROM marketing_campaigns mc
  LEFT JOIN orders o
    ON o.discount_code = mc.promo_code
    AND o.order_date BETWEEN mc.start_date AND mc.end_date
    AND o.status = 'completed'
  WHERE mc.promo_code IS NOT NULL
  GROUP BY mc.campaign_id, mc.campaign_name, mc.spend_usd
)
SELECT ...`,
    hints: [
      'Apply `RANK() OVER (ORDER BY roas DESC) AS roas_rank` on top of `camp_perf`.',
      'Sort by `roas_rank ASC, campaign_name ASC`.',
    ],
    solutionSql: `WITH camp_perf AS (
  SELECT
    mc.campaign_name,
    mc.spend_usd,
    ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS attributed_revenue,
    ROUND(COALESCE(SUM(o.total_amount), 0) - mc.spend_usd, 2) AS net_after_spend,
    ROUND(COALESCE(SUM(o.total_amount), 0) / mc.spend_usd, 2) AS roas
  FROM marketing_campaigns mc
  LEFT JOIN orders o
    ON o.discount_code = mc.promo_code
    AND o.order_date BETWEEN mc.start_date AND mc.end_date
    AND o.status = 'completed'
  WHERE mc.promo_code IS NOT NULL
  GROUP BY mc.campaign_id, mc.campaign_name, mc.spend_usd
)
SELECT
  RANK() OVER (ORDER BY roas DESC) AS roas_rank,
  campaign_name,
  spend_usd,
  attributed_revenue,
  net_after_spend,
  roas
FROM camp_perf
ORDER BY roas_rank ASC, campaign_name ASC;`,
    explanation:
      'Preserving zero-attribution campaigns via `LEFT JOIN` before ranking gives leadership an honest view of both winners and duds.',
    orderMatters: true,
  },
  {
    id: 'h18-consecutive-active-months-streak',
    title: 'Longest Consecutive Active Ordering Month Streak per Buyer (Gaps & Islands)',
    difficulty: 'Hard',
    concepts: ['Gaps & Islands', 'ROW_NUMBER()', 'Date Math'],
    stakeholder: 'Loyalty Analytics',
    scenario:
      'Identify our most habitual buyers using the classic Gaps & Islands technique: for every user, find the longest unbroken streak of consecutive calendar months in which they placed at least 1 completed order (`streak_months >= 2`).',
    requirements: [
      'CTE 1 (`user_months`): distinct `(user_id, year_month)` where `month_idx = CAST(strftime(\'%Y\', order_date) AS INTEGER) * 12 + CAST(strftime(\'%m\', order_date) AS INTEGER)`.',
      'CTE 2 (`islands`): compute `grp = month_idx - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY month_idx ASC)`.',
      'CTE 3 (`streaks`): group by `(user_id, grp)` to get `streak_len = COUNT(*)`, `streak_start = MIN(year_month)`, `streak_end = MAX(year_month)`.',
      'Return top streak per user (or all streaks `>= 2` joined to `users u`) showing `user_id`, `full_name`, `longest_streak_months` (`MAX(streak_len)`), ordered by `longest_streak_months DESC, u.user_id ASC` (keeping `>= 2`).',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'longest_streak_months', type: 'INTEGER', description: 'Max consecutive active months (>= 2)' },
    ],
    starterSql: `WITH user_months AS (
  SELECT DISTINCT
    user_id,
    CAST(strftime('%Y', order_date) AS INTEGER) * 12 + CAST(strftime('%m', order_date) AS INTEGER) AS month_idx
  FROM orders
  WHERE status = 'completed'
),
islands AS (
  SELECT
    user_id,
    month_idx - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY month_idx ASC) AS grp
  FROM user_months
),
streaks AS (
  SELECT user_id, grp, COUNT(*) AS streak_len
  FROM islands
  GROUP BY user_id, grp
)
SELECT ...`,
    hints: [
      'When consecutive `month_idx` values increase by `+1` and `ROW_NUMBER()` increases by `+1`, `month_idx - ROW_NUMBER()` stays constant across the entire island!',
      'Take `MAX(streak_len)` per `user_id` and filter `HAVING MAX(streak_len) >= 2`.',
    ],
    solutionSql: `WITH user_months AS (
  SELECT DISTINCT
    user_id,
    CAST(strftime('%Y', order_date) AS INTEGER) * 12 + CAST(strftime('%m', order_date) AS INTEGER) AS month_idx
  FROM orders
  WHERE status = 'completed'
),
islands AS (
  SELECT
    user_id,
    month_idx - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY month_idx ASC) AS grp
  FROM user_months
),
streaks AS (
  SELECT
    user_id,
    grp,
    COUNT(*) AS streak_len
  FROM islands
  GROUP BY user_id, grp
)
SELECT
  u.user_id,
  u.full_name,
  MAX(s.streak_len) AS longest_streak_months
FROM streaks s
INNER JOIN users u
  ON s.user_id = u.user_id
GROUP BY u.user_id, u.full_name
HAVING MAX(s.streak_len) >= 2
ORDER BY longest_streak_months DESC, u.user_id ASC;`,
    explanation:
      'Subtracting `ROW_NUMBER()` from a contiguous integer month index (`year * 12 + month`) is the gold-standard Gaps & Islands pattern.',
    orderMatters: true,
  },
  {
    id: 'h19-buyer-first-vs-latest-spend-trend',
    title: 'Repeat Buyers: First Order vs. Latest Order Spend Trend',
    difficulty: 'Hard',
    concepts: ['FIRST_VALUE()', 'LAST_VALUE()', 'CTE (WITH)'],
    stakeholder: 'Account Expansion',
    scenario:
      'For customers with 3 or more completed orders, compare their very first completed order amount (`first_order_amt`) against their most recent completed order amount (`latest_order_amt`) to spot account expansion vs. contraction.',
    requirements: [
      'Filter `orders` to `status = \'completed\'` and identify users with `>= 3` completed orders.',
      'Use `FIRST_VALUE(total_amount)` and `LAST_VALUE(total_amount)` over `PARTITION BY user_id ORDER BY order_date ASC, order_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.',
      'Return 1 row per qualifying user (`user_id`, `full_name`, `first_order_amt`, `latest_order_amt`, `spend_delta`), ordered by `spend_delta DESC, user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'first_order_amt', type: 'REAL', description: 'First completed order amount' },
      { name: 'latest_order_amt', type: 'REAL', description: 'Latest completed order amount' },
      { name: 'spend_delta', type: 'REAL', description: 'latest_order_amt - first_order_amt' },
    ],
    starterSql: `WITH loyal_users AS (
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
  HAVING COUNT(*) >= 3
),
endpoints AS (
  SELECT DISTINCT
    o.user_id,
    FIRST_VALUE(o.total_amount) OVER (
      PARTITION BY o.user_id
      ORDER BY o.order_date ASC, o.order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_order_amt,
    LAST_VALUE(o.total_amount) OVER (
      PARTITION BY o.user_id
      ORDER BY o.order_date ASC, o.order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS latest_order_amt
  FROM orders o
  INNER JOIN loyal_users lu ON o.user_id = lu.user_id
  WHERE o.status = 'completed'
)
SELECT ...`,
    hints: [
      'Always pass `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` when using `LAST_VALUE()`.',
      'Compute `ROUND(e.latest_order_amt - e.first_order_amt, 2) AS spend_delta`.',
    ],
    solutionSql: `WITH loyal_users AS (
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
  HAVING COUNT(*) >= 3
),
endpoints AS (
  SELECT DISTINCT
    o.user_id,
    FIRST_VALUE(o.total_amount) OVER (
      PARTITION BY o.user_id
      ORDER BY o.order_date ASC, o.order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_order_amt,
    LAST_VALUE(o.total_amount) OVER (
      PARTITION BY o.user_id
      ORDER BY o.order_date ASC, o.order_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS latest_order_amt
  FROM orders o
  INNER JOIN loyal_users lu
    ON o.user_id = lu.user_id
  WHERE o.status = 'completed'
)
SELECT
  u.user_id,
  u.full_name,
  e.first_order_amt,
  e.latest_order_amt,
  ROUND(e.latest_order_amt - e.first_order_amt, 2) AS spend_delta
FROM endpoints e
INNER JOIN users u
  ON e.user_id = u.user_id
ORDER BY spend_delta DESC, u.user_id ASC;`,
    explanation:
      'Comparing `FIRST_VALUE` and `LAST_VALUE` across full-partition frames measures individual buyer wallet expansion.',
    orderMatters: true,
  },
  {
    id: 'h20-h1-vs-h2-2025-category-share-shift',
    title: 'H1 vs. H2 2025 Product Category Revenue Mix Shift',
    difficulty: 'Hard',
    concepts: ['CTE (WITH)', 'Conditional Aggregation', 'Window SUM'],
    stakeholder: 'VP of Merchandising',
    scenario:
      'Compare each product `category`’s share of completed line-item revenue in H1 2025 (`2025-01-01`..`2025-06-30`) against H2 2025 (`2025-07-01`..`2025-12-31`), reporting `h1_share_pct`, `h2_share_pct`, and `share_change_pp`.',
    requirements: [
      'Aggregate completed 2025 line-item revenue per `category` split into `h1_rev` and `h2_rev` using `CASE WHEN`.',
      'Compute `h1_share_pct = 100.0 * h1_rev / SUM(h1_rev) OVER ()` and `h2_share_pct = 100.0 * h2_rev / SUM(h2_rev) OVER ()`.',
      'Return `category`, `h1_share_pct`, `h2_share_pct`, and `share_change_pp` (`ROUND(h2_share_pct - h1_share_pct, 2)`).',
      'Order by `share_change_pp DESC`, `category ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'h1_share_pct', type: 'REAL', description: 'H1 2025 revenue share (%)' },
      { name: 'h2_share_pct', type: 'REAL', description: 'H2 2025 revenue share (%)' },
      { name: 'share_change_pp', type: 'REAL', description: 'H2 minus H1 percentage-point shift' },
    ],
    starterSql: `WITH half_rev AS (
  SELECT
    p.category,
    SUM(CASE WHEN o.order_date BETWEEN '2025-01-01' AND '2025-06-30' THEN oi.quantity * oi.unit_price ELSE 0 END) AS h1_rev,
    SUM(CASE WHEN o.order_date BETWEEN '2025-07-01' AND '2025-12-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS h2_rev
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
    AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY p.category
),
shares AS (
  SELECT
    category,
    100.0 * h1_rev / SUM(h1_rev) OVER () AS h1_share_pct,
    100.0 * h2_rev / SUM(h2_rev) OVER () AS h2_share_pct
  FROM half_rev
)
SELECT ...`,
    hints: [
      '`SUM(h1_rev) OVER ()` and `SUM(h2_rev) OVER ()` compute each half-year’s total catalog revenue in one scan.',
      'Round all three percentage metrics to 2 decimal places in the final `SELECT`.',
    ],
    solutionSql: `WITH half_rev AS (
  SELECT
    p.category,
    SUM(CASE WHEN o.order_date BETWEEN '2025-01-01' AND '2025-06-30' THEN oi.quantity * oi.unit_price ELSE 0 END) AS h1_rev,
    SUM(CASE WHEN o.order_date BETWEEN '2025-07-01' AND '2025-12-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS h2_rev
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
    AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY p.category
),
shares AS (
  SELECT
    category,
    100.0 * h1_rev / SUM(h1_rev) OVER () AS h1_share_pct,
    100.0 * h2_rev / SUM(h2_rev) OVER () AS h2_share_pct
  FROM half_rev
)
SELECT
  category,
  ROUND(h1_share_pct, 2) AS h1_share_pct,
  ROUND(h2_share_pct, 2) AS h2_share_pct,
  ROUND(h2_share_pct - h1_share_pct, 2) AS share_change_pp
FROM shares
ORDER BY share_change_pp DESC, category ASC;`,
    explanation:
      'Pairing conditional period pivots with grand-total window sums tracks structural catalog mix shifts cleanly.',
    orderMatters: true,
  },
  {
    id: 'h21-top-2-csat-categories-per-year',
    title: 'Top 2 Highest-CSAT Support Categories per Year (DENSE_RANK)',
    difficulty: 'Hard',
    concepts: ['DENSE_RANK()', 'PARTITION BY', 'strftime'],
    stakeholder: 'Customer Experience',
    scenario:
      'For each calendar year (`2025` and `2026`), rank rated support ticket categories (`satisfaction_score IS NOT NULL`) by average CSAT descending using `DENSE_RANK()` and return the Top 2 per year.',
    requirements: [
      'CTE 1: filter `support_tickets` to `satisfaction_score IS NOT NULL` and group by `ticket_year` (`strftime(\'%Y\', created_at)`) and `category`, computing `rated_count` (`COUNT(*)`) and `avg_csat` (`ROUND(AVG(satisfaction_score), 2)`).',
      'CTE 2: assign `DENSE_RANK() OVER (PARTITION BY ticket_year ORDER BY avg_csat DESC) AS csat_rank`.',
      'Keep `csat_rank <= 2`, ordered by `ticket_year ASC, csat_rank ASC, category ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_year', type: 'TEXT', description: '2025 or 2026' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'rated_count', type: 'INTEGER', description: 'Rated tickets' },
      { name: 'avg_csat', type: 'REAL', description: 'Average CSAT (2 decimals)' },
      { name: 'csat_rank', type: 'INTEGER', description: 'Dense rank within year (1–2)' },
    ],
    starterSql: `WITH yearly_csat AS (
  SELECT
    strftime('%Y', created_at) AS ticket_year,
    category,
    COUNT(*) AS rated_count,
    ROUND(AVG(satisfaction_score), 2) AS avg_csat
  FROM support_tickets
  WHERE satisfaction_score IS NOT NULL
  GROUP BY strftime('%Y', created_at), category
),
ranked AS (
  SELECT
    ticket_year,
    category,
    rated_count,
    avg_csat,
    DENSE_RANK() OVER (PARTITION BY ticket_year ORDER BY avg_csat DESC) AS csat_rank
  FROM yearly_csat
)
SELECT ...`,
    hints: [
      'Filter `WHERE satisfaction_score IS NOT NULL` so unrated categories aren’t ranked with NULLs.',
      'Keep `WHERE csat_rank <= 2` in the outer query.',
    ],
    solutionSql: `WITH yearly_csat AS (
  SELECT
    strftime('%Y', created_at) AS ticket_year,
    category,
    COUNT(*) AS rated_count,
    ROUND(AVG(satisfaction_score), 2) AS avg_csat
  FROM support_tickets
  WHERE satisfaction_score IS NOT NULL
  GROUP BY strftime('%Y', created_at), category
),
ranked AS (
  SELECT
    ticket_year,
    category,
    rated_count,
    avg_csat,
    DENSE_RANK() OVER (
      PARTITION BY ticket_year
      ORDER BY avg_csat DESC
    ) AS csat_rank
  FROM yearly_csat
)
SELECT
  ticket_year,
  category,
  rated_count,
  avg_csat,
  csat_rank
FROM ranked
WHERE csat_rank <= 2
ORDER BY ticket_year ASC, csat_rank ASC, category ASC;`,
    explanation:
      'Partitioned `DENSE_RANK()` highlights top-performing support queues year over year while preserving ties.',
    orderMatters: true,
  },
  {
    id: 'h22-buyer-overdue-churn-risk-flag',
    title: 'Overdue Buyer Churn Risk (Current Silence > 1.5x Personal Cadence)',
    difficulty: 'Hard',
    concepts: ['LAG()', 'julianday', 'CTE (WITH)'],
    stakeholder: 'Customer Retention',
    scenario:
      'Identify repeat buyers (`>= 3` completed orders) whose days elapsed since their last completed order (as of `\'2026-06-30\'`) strictly exceeds `1.5x` their own historical average days between orders!',
    requirements: [
      'CTE 1: compute `prev_order_date = LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC)` on completed `orders`.',
      'CTE 2: aggregate per `user_id` (having `COUNT(*) >= 3`) to compute `avg_cadence_days = AVG(julianday(order_date) - julianday(prev_order_date))` and `days_since_last = julianday(\'2026-06-30\') - julianday(MAX(order_date))`.',
      'Filter `days_since_last > 1.5 * avg_cadence_days`, join `users u`, and return `user_id`, `full_name`, `avg_cadence_days` (1 decimal), `days_since_last` (integer), and `overdue_ratio` (`ROUND(days_since_last / avg_cadence_days, 2)`).',
      'Order by `overdue_ratio DESC`, `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'avg_cadence_days', type: 'REAL', description: 'Personal avg days between orders' },
      { name: 'days_since_last', type: 'INTEGER', description: 'Days since last order as of 2026-06-30' },
      { name: 'overdue_ratio', type: 'REAL', description: 'days_since_last / avg_cadence_days' },
    ],
    starterSql: `WITH order_lag AS (
  SELECT
    user_id,
    order_date,
    LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC) AS prev_order_date
  FROM orders
  WHERE status = 'completed'
),
cadence AS (
  SELECT
    user_id,
    AVG(CASE WHEN prev_order_date IS NOT NULL THEN julianday(order_date) - julianday(prev_order_date) END) AS avg_cadence_days,
    julianday('2026-06-30') - julianday(MAX(order_date)) AS days_since_last
  FROM order_lag
  GROUP BY user_id
  HAVING COUNT(*) >= 3
)
SELECT ...`,
    hints: [
      'Make sure `HAVING COUNT(*) >= 3` runs on all rows of `order_lag` before filtering `WHERE days_since_last > 1.5 * avg_cadence_days` in the outer query.',
      'Check `avg_cadence_days > 0` so a user whose orders were all on the same day doesn’t divide by 0.',
    ],
    solutionSql: `WITH order_lag AS (
  SELECT
    user_id,
    order_date,
    LAG(order_date) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS prev_order_date
  FROM orders
  WHERE status = 'completed'
),
cadence AS (
  SELECT
    user_id,
    AVG(CASE WHEN prev_order_date IS NOT NULL THEN julianday(order_date) - julianday(prev_order_date) END) AS avg_cadence_days,
    julianday('2026-06-30') - julianday(MAX(order_date)) AS days_since_last
  FROM order_lag
  GROUP BY user_id
  HAVING COUNT(*) >= 3
)
SELECT
  u.user_id,
  u.full_name,
  ROUND(c.avg_cadence_days, 1) AS avg_cadence_days,
  CAST(ROUND(c.days_since_last) AS INTEGER) AS days_since_last,
  ROUND(c.days_since_last / c.avg_cadence_days, 2) AS overdue_ratio
FROM cadence c
INNER JOIN users u
  ON c.user_id = u.user_id
WHERE c.avg_cadence_days > 0
  AND c.days_since_last > 1.5 * c.avg_cadence_days
ORDER BY overdue_ratio DESC, u.user_id ASC;`,
    explanation:
      'Comparing current recency against each buyer’s own historical `LAG()` cadence catches quiet churn earlier than fixed 90-day rules.',
    orderMatters: true,
  },
  {
    id: 'h23-cohort-ltv-expansion-vs-month0',
    title: 'Cohort Cumulative Revenue & Expansion Multiple vs. Month 0',
    difficulty: 'Hard',
    concepts: ['Cohort Analysis', 'FIRST_VALUE()', 'UNBOUNDED PRECEDING'],
    stakeholder: 'VP of Finance',
    scenario:
      'For buyer cohorts `2025-01` through `2025-04`, track cumulative cohort revenue across `month_offset` `0..3` and calculate the `ltv_multiple` (`cumulative_revenue / month_0_revenue`) using `FIRST_VALUE()`.',
    requirements: [
      'Anchor each buyer to their first completed `cohort_month` (`2025-01`..`2025-04`).',
      'Aggregate `offset_revenue` per `(cohort_month, month_offset)` for `month_offset BETWEEN 0 AND 3`.',
      'Use `SUM(offset_revenue) OVER (PARTITION BY cohort_month ORDER BY month_offset ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` for `cumulative_revenue`, and `FIRST_VALUE(offset_revenue) OVER (PARTITION BY cohort_month ORDER BY month_offset)` for `month_0_revenue`.',
      'Return `cohort_month`, `month_offset`, `offset_revenue`, `cumulative_revenue`, and `ltv_multiple` (2 decimals), ordered by `cohort_month ASC, month_offset ASC`.',
    ],
    expectedColumns: [
      { name: 'cohort_month', type: 'TEXT', description: 'Cohort (2025-01..2025-04)' },
      { name: 'month_offset', type: 'INTEGER', description: 'Offset 0..3' },
      { name: 'offset_revenue', type: 'REAL', description: 'Revenue in offset month' },
      { name: 'cumulative_revenue', type: 'REAL', description: 'Running cohort revenue' },
      { name: 'ltv_multiple', type: 'REAL', description: 'Cumulative revenue / Month-0 revenue' },
    ],
    starterSql: `WITH first_purchase AS (
  SELECT user_id, MIN(order_date) AS first_order_date, strftime('%Y-%m', MIN(order_date)) AS cohort_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
cohort_rev AS (
  SELECT
    fp.cohort_month,
    (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fp.first_order_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fp.first_order_date) AS INTEGER)) AS month_offset,
    ROUND(SUM(o.total_amount), 2) AS offset_revenue
  FROM orders o
  INNER JOIN first_purchase fp ON o.user_id = fp.user_id
  WHERE o.status = 'completed'
    AND fp.cohort_month BETWEEN '2025-01' AND '2025-04'
  GROUP BY fp.cohort_month, month_offset
)
SELECT ...`,
    hints: [
      'Filter `WHERE month_offset BETWEEN 0 AND 3` inside a CTE before computing the running sum and `FIRST_VALUE()`.',
      'Divide `cumulative_revenue` by `FIRST_VALUE(offset_revenue) OVER (PARTITION BY cohort_month ORDER BY month_offset)`.',
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
cohort_rev AS (
  SELECT
    fp.cohort_month,
    (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fp.first_order_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fp.first_order_date) AS INTEGER)) AS month_offset,
    ROUND(SUM(o.total_amount), 2) AS offset_revenue
  FROM orders o
  INNER JOIN first_purchase fp
    ON o.user_id = fp.user_id
  WHERE o.status = 'completed'
    AND fp.cohort_month BETWEEN '2025-01' AND '2025-04'
  GROUP BY fp.cohort_month, month_offset
),
filtered AS (
  SELECT cohort_month, month_offset, offset_revenue
  FROM cohort_rev
  WHERE month_offset BETWEEN 0 AND 3
)
SELECT
  cohort_month,
  month_offset,
  offset_revenue,
  ROUND(
    SUM(offset_revenue) OVER (
      PARTITION BY cohort_month
      ORDER BY month_offset
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    2
  ) AS cumulative_revenue,
  ROUND(
    SUM(offset_revenue) OVER (
      PARTITION BY cohort_month
      ORDER BY month_offset
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) / FIRST_VALUE(offset_revenue) OVER (PARTITION BY cohort_month ORDER BY month_offset),
    2
  ) AS ltv_multiple
FROM filtered
ORDER BY cohort_month ASC, month_offset ASC;`,
    explanation:
      'Dividing running cohort revenue by Month-0 baseline shows how quickly each cohort expands beyond initial acquisition spend.',
    orderMatters: true,
  },
  {
    id: 'h24-ytd-cumulative-profit-and-margin',
    title: 'Cumulative Running Gross Profit & Margin % by Month',
    difficulty: 'Hard',
    concepts: ['UNBOUNDED PRECEDING', 'Margin Math', 'Window SUM'],
    stakeholder: 'FP&A Leadership',
    scenario:
      'Across all completed orders in 2025–2026, compute monthly line-item revenue and gross profit, plus running cumulative revenue, running cumulative gross profit, and running cumulative gross margin % (`100.0 * cum_profit / cum_revenue`).',
    requirements: [
      'CTE 1: aggregate `monthly_rev` and `monthly_profit` per `order_month` (`YYYY-MM`) from `orders`, `order_items`, and `products`.',
      'CTE 2: compute `cum_revenue` and `cum_profit` using `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.',
      'Return `order_month`, `monthly_profit` (2 decimals), `cum_revenue` (2 decimals), `cum_profit` (2 decimals), and `cum_margin_pct` (`ROUND(100.0 * cum_profit / cum_revenue, 2)`), ordered by `order_month ASC`.',
    ],
    expectedColumns: [
      { name: 'order_month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'monthly_profit', type: 'REAL', description: 'Monthly gross profit' },
      { name: 'cum_revenue', type: 'REAL', description: 'Cumulative revenue' },
      { name: 'cum_profit', type: 'REAL', description: 'Cumulative gross profit' },
      { name: 'cum_margin_pct', type: 'REAL', description: 'Cumulative gross margin %' },
    ],
    starterSql: `WITH monthly_pl AS (
  SELECT
    strftime('%Y-%m', o.order_date) AS order_month,
    SUM(oi.quantity * oi.unit_price) AS monthly_rev,
    SUM((oi.unit_price - p.cost_price) * oi.quantity) AS monthly_profit
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY strftime('%Y-%m', o.order_date)
),
running AS (
  SELECT
    order_month,
    monthly_profit,
    SUM(monthly_rev) OVER (ORDER BY order_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_revenue,
    SUM(monthly_profit) OVER (ORDER BY order_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_profit
  FROM monthly_pl
)
SELECT ...`,
    hints: [
      'Always compute cumulative ratios from `cum_profit / cum_revenue` — never average monthly margin percentages!',
      'Round monetary outputs and `cum_margin_pct` in the final `SELECT`.',
    ],
    solutionSql: `WITH monthly_pl AS (
  SELECT
    strftime('%Y-%m', o.order_date) AS order_month,
    SUM(oi.quantity * oi.unit_price) AS monthly_rev,
    SUM((oi.unit_price - p.cost_price) * oi.quantity) AS monthly_profit
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY strftime('%Y-%m', o.order_date)
),
running AS (
  SELECT
    order_month,
    monthly_profit,
    SUM(monthly_rev) OVER (ORDER BY order_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_revenue,
    SUM(monthly_profit) OVER (ORDER BY order_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_profit
  FROM monthly_pl
)
SELECT
  order_month,
  ROUND(monthly_profit, 2) AS monthly_profit,
  ROUND(cum_revenue, 2) AS cum_revenue,
  ROUND(cum_profit, 2) AS cum_profit,
  ROUND(100.0 * cum_profit / cum_revenue, 2) AS cum_margin_pct
FROM running
ORDER BY order_month ASC;`,
    explanation:
      'Computing cumulative ratio of sums (`cum_profit / cum_revenue`) avoids Simpson’s paradox in running margin reporting.',
    orderMatters: true,
  },
  {
    id: 'h25-top-companion-product-per-sku',
    title: 'Strongest Co-Purchased Companion Product per Anchor SKU (DENSE_RANK)',
    difficulty: 'Hard',
    concepts: ['SELF JOIN', 'DENSE_RANK()', 'Market Basket'],
    stakeholder: 'Personalization Team',
    scenario:
      'For every product that was ever bought alongside another product in the same completed order, find its #1 most frequently co-purchased companion product(s) using `DENSE_RANK()` (keeping ties!).',
    requirements: [
      'CTE 1: self-join `order_items a` and `order_items b` on `a.order_id = b.order_id AND a.product_id != b.product_id` (both directions, so every product acts as an anchor!) joined to completed `orders`.',
      'Count `pair_count = COUNT(DISTINCT a.order_id)` per `(anchor_product, companion_product)`.',
      'CTE 2: rank with `DENSE_RANK() OVER (PARTITION BY anchor_product ORDER BY pair_count DESC) AS rnk`.',
      'Keep `rnk = 1`, ordered by `pair_count DESC, anchor_product ASC, companion_product ASC`.',
    ],
    expectedColumns: [
      { name: 'anchor_product', type: 'TEXT', description: 'Anchor product name' },
      { name: 'companion_product', type: 'TEXT', description: 'Most frequent co-purchased SKU' },
      { name: 'pair_count', type: 'INTEGER', description: 'Shared completed orders' },
    ],
    starterSql: `WITH pairs AS (
  SELECT
    p1.product_name AS anchor_product,
    p2.product_name AS companion_product,
    COUNT(DISTINCT a.order_id) AS pair_count
  FROM order_items a
  INNER JOIN order_items b
    ON a.order_id = b.order_id
    AND a.product_id != b.product_id
  INNER JOIN orders o ON a.order_id = o.order_id
  INNER JOIN products p1 ON a.product_id = p1.product_id
  INNER JOIN products p2 ON b.product_id = p2.product_id
  WHERE o.status = 'completed'
  GROUP BY p1.product_name, p2.product_name
),
ranked AS (
  SELECT
    anchor_product,
    companion_product,
    pair_count,
    DENSE_RANK() OVER (PARTITION BY anchor_product ORDER BY pair_count DESC) AS rnk
  FROM pairs
)
SELECT ...`,
    hints: [
      'Notice here we use `a.product_id != b.product_id` (not `<`) because we want recommendations for BOTH directions of a pair.',
      'Filter `WHERE rnk = 1` to return the top companion(s) for each anchor SKU.',
    ],
    solutionSql: `WITH pairs AS (
  SELECT
    p1.product_name AS anchor_product,
    p2.product_name AS companion_product,
    COUNT(DISTINCT a.order_id) AS pair_count
  FROM order_items a
  INNER JOIN order_items b
    ON a.order_id = b.order_id
    AND a.product_id != b.product_id
  INNER JOIN orders o
    ON a.order_id = o.order_id
  INNER JOIN products p1
    ON a.product_id = p1.product_id
  INNER JOIN products p2
    ON b.product_id = p2.product_id
  WHERE o.status = 'completed'
  GROUP BY p1.product_name, p2.product_name
),
ranked AS (
  SELECT
    anchor_product,
    companion_product,
    pair_count,
    DENSE_RANK() OVER (
      PARTITION BY anchor_product
      ORDER BY pair_count DESC
    ) AS rnk
  FROM pairs
)
SELECT
  anchor_product,
  companion_product,
  pair_count
FROM ranked
WHERE rnk = 1
ORDER BY pair_count DESC, anchor_product ASC, companion_product ASC;`,
    explanation:
      'Self-joining with `!=` builds a symmetric co-purchase graph, and `DENSE_RANK()` surfaces top cross-sell ties.',
    orderMatters: true,
  },
  {
    id: 'h26-subscription-upgrade-downgrade-flows',
    title: 'SaaS Subscription Plan Transition Matrix (Upgrade vs. Downgrade)',
    difficulty: 'Hard',
    concepts: ['LAG()', 'CASE WHEN', 'PARTITION BY'],
    stakeholder: 'SaaS Product Ops',
    scenario:
      'Track plan movements in `subscriptions`: for users with multiple subscription records over time, compare each subscription’s `plan_tier` and `mrr_amount` against their immediately preceding subscription (`LAG()`) and classify transitions (`Upgrade`, `Downgrade`, `Lateral`).',
    requirements: [
      'CTE 1: use `LAG(plan_tier)` and `LAG(mrr_amount)` partitioned by `user_id` ordered by `start_date ASC, sub_id ASC`.',
      'Keep rows where `prev_tier IS NOT NULL`, joining `users u` to display `user_id`, `full_name`, `prev_tier`, `new_tier` (`plan_tier`), `mrr_change` (`ROUND(mrr_amount - prev_mrr, 2)`), and `movement_type` (`Upgrade` if `mrr_amount > prev_mrr`, `Downgrade` if `<`, else `Lateral`).',
      'Order by `mrr_change DESC`, `u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'prev_tier', type: 'TEXT', description: 'Prior plan tier' },
      { name: 'new_tier', type: 'TEXT', description: 'New plan tier' },
      { name: 'mrr_change', type: 'REAL', description: 'Net MRR delta (USD)' },
      { name: 'movement_type', type: 'TEXT', description: 'Upgrade, Downgrade, or Lateral' },
    ],
    starterSql: `WITH sub_lag AS (
  SELECT
    user_id,
    plan_tier AS new_tier,
    mrr_amount,
    LAG(plan_tier) OVER (PARTITION BY user_id ORDER BY start_date ASC, sub_id ASC) AS prev_tier,
    LAG(mrr_amount) OVER (PARTITION BY user_id ORDER BY start_date ASC, sub_id ASC) AS prev_mrr
  FROM subscriptions
)
SELECT ...`,
    hints: [
      'Filter `WHERE sl.prev_tier IS NOT NULL` to isolate true plan transitions.',
      'Classify `movement_type` using `CASE WHEN sl.mrr_amount > sl.prev_mrr THEN \'Upgrade\' WHEN sl.mrr_amount < sl.prev_mrr THEN \'Downgrade\' ELSE \'Lateral\' END`.',
    ],
    solutionSql: `WITH sub_lag AS (
  SELECT
    user_id,
    plan_tier AS new_tier,
    mrr_amount,
    LAG(plan_tier) OVER (PARTITION BY user_id ORDER BY start_date ASC, sub_id ASC) AS prev_tier,
    LAG(mrr_amount) OVER (PARTITION BY user_id ORDER BY start_date ASC, sub_id ASC) AS prev_mrr
  FROM subscriptions
)
SELECT
  u.user_id,
  u.full_name,
  sl.prev_tier,
  sl.new_tier,
  ROUND(sl.mrr_amount - sl.prev_mrr, 2) AS mrr_change,
  CASE
    WHEN sl.mrr_amount > sl.prev_mrr THEN 'Upgrade'
    WHEN sl.mrr_amount < sl.prev_mrr THEN 'Downgrade'
    ELSE 'Lateral'
  END AS movement_type
FROM sub_lag sl
INNER JOIN users u
  ON sl.user_id = u.user_id
WHERE sl.prev_tier IS NOT NULL
ORDER BY mrr_change DESC, u.user_id ASC;`,
    explanation:
      'Multi-column `LAG()` over subscription history reconstructs expansion and contraction events without a separate audit log.',
    orderMatters: true,
  },
  {
    id: 'h27-median-order-value-by-country',
    title: 'Exact Median Completed Order Value by Country (Pure SQL)',
    difficulty: 'Hard',
    concepts: ['ROW_NUMBER()', 'Window COUNT', 'Median in SQL'],
    stakeholder: 'Pricing Analytics',
    scenario:
      'SQLite does not have a built-in `MEDIAN()` function! Compute both the `avg_order_value` and the exact `median_order_value` of completed orders for each `country` using `ROW_NUMBER()` and `COUNT(*) OVER (PARTITION BY country)`.',
    requirements: [
      'CTE 1: join completed `orders o` with `users u`, assigning `rn = ROW_NUMBER() OVER (PARTITION BY u.country ORDER BY o.total_amount ASC, o.order_id ASC)` and `cnt = COUNT(*) OVER (PARTITION BY u.country)`.',
      'Filter to middle position(s): `WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)` (this works for both odd and even counts via integer division!).',
      'Group by `country`, returning `country`, `order_count` (`MAX(cnt)`), and `median_order_value` (`ROUND(AVG(total_amount), 2)`), ordered by `median_order_value DESC, country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'order_count', type: 'INTEGER', description: 'Completed orders in country' },
      { name: 'median_order_value', type: 'REAL', description: 'Exact statistical median (2 decimals)' },
    ],
    starterSql: `WITH ordered_vals AS (
  SELECT
    u.country,
    o.total_amount,
    ROW_NUMBER() OVER (PARTITION BY u.country ORDER BY o.total_amount ASC, o.order_id ASC) AS rn,
    COUNT(*) OVER (PARTITION BY u.country) AS cnt
  FROM orders o
  INNER JOIN users u ON o.user_id = u.user_id
  WHERE o.status = 'completed'
)
SELECT ...`,
    hints: [
      'For `cnt = 5`, `(5+1)/2 = 3` and `(5+2)/2 = 3` (picks the 3rd row). For `cnt = 6`, `(6+1)/2 = 3` and `(6+2)/2 = 4` (averages the 3rd and 4th rows!).',
      'Use `ROUND(AVG(total_amount), 2)` over the middle 1 or 2 rows per `country`.',
    ],
    solutionSql: `WITH ordered_vals AS (
  SELECT
    u.country,
    o.total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY u.country
      ORDER BY o.total_amount ASC, o.order_id ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY u.country) AS cnt
  FROM orders o
  INNER JOIN users u
    ON o.user_id = u.user_id
  WHERE o.status = 'completed'
)
SELECT
  country,
  MAX(cnt) AS order_count,
  ROUND(AVG(total_amount), 2) AS median_order_value
FROM ordered_vals
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY country
ORDER BY median_order_value DESC, country ASC;`,
    explanation:
      'The `rn IN ((cnt + 1)/2, (cnt + 2)/2)` trick is a classic SQL interview solution for exact medians in engines without `PERCENTILE_CONT`.',
    orderMatters: true,
  },
  {
    id: 'h28-session-duration-quartiles',
    title: 'Multi-Event Session Duration Quartiles (NTILE 4)',
    difficulty: 'Hard',
    concepts: ['NTILE()', 'julianday', 'CTE (WITH)'],
    stakeholder: 'Product Performance',
    scenario:
      'Split all multi-event sessions (`COUNT(*) >= 2` in `web_events`) into 4 equal-sized duration quartiles (`NTILE(4)`) and report each quartile’s session count, min minutes, avg minutes, max minutes, and conversion rate %.',
    requirements: [
      'CTE 1 (`sess`): compute `duration_mins` and `converted` (`MAX(CASE WHEN event_name = \'purchase\' THEN 1 ELSE 0 END)`) for sessions with `>= 2` events.',
      'CTE 2 (`quartiled`): assign `duration_quartile = NTILE(4) OVER (ORDER BY duration_mins ASC, session_id ASC)`.',
      'Group by `duration_quartile`: return `duration_quartile`, `session_count`, `min_mins`, `avg_mins`, `max_mins`, and `conversion_pct` (rounded to 2 decimals).',
      'Order by `duration_quartile ASC`.',
    ],
    expectedColumns: [
      { name: 'duration_quartile', type: 'INTEGER', description: 'Quartile 1 (shortest) to 4 (longest)' },
      { name: 'session_count', type: 'INTEGER', description: 'Sessions in quartile' },
      { name: 'min_mins', type: 'REAL', description: 'Min duration (mins)' },
      { name: 'avg_mins', type: 'REAL', description: 'Avg duration (mins)' },
      { name: 'max_mins', type: 'REAL', description: 'Max duration (mins)' },
      { name: 'conversion_pct', type: 'REAL', description: 'Purchase conversion rate (%)' },
    ],
    starterSql: `WITH sess AS (
  SELECT
    session_id,
    (julianday(MAX(event_timestamp)) - julianday(MIN(event_timestamp))) * 1440.0 AS duration_mins,
    MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS converted
  FROM web_events
  GROUP BY session_id
  HAVING COUNT(*) >= 2
),
quartiled AS (
  SELECT
    session_id,
    duration_mins,
    converted,
    NTILE(4) OVER (ORDER BY duration_mins ASC, session_id ASC) AS duration_quartile
  FROM sess
)
SELECT ...`,
    hints: [
      'Use `ROUND(100.0 * SUM(converted) / COUNT(*), 2)` for `conversion_pct`.',
      'Order by `duration_quartile ASC`.',
    ],
    solutionSql: `WITH sess AS (
  SELECT
    session_id,
    (julianday(MAX(event_timestamp)) - julianday(MIN(event_timestamp))) * 1440.0 AS duration_mins,
    MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS converted
  FROM web_events
  GROUP BY session_id
  HAVING COUNT(*) >= 2
),
quartiled AS (
  SELECT
    session_id,
    duration_mins,
    converted,
    NTILE(4) OVER (ORDER BY duration_mins ASC, session_id ASC) AS duration_quartile
  FROM sess
)
SELECT
  duration_quartile,
  COUNT(*) AS session_count,
  ROUND(MIN(duration_mins), 2) AS min_mins,
  ROUND(AVG(duration_mins), 2) AS avg_mins,
  ROUND(MAX(duration_mins), 2) AS max_mins,
  ROUND(100.0 * SUM(converted) / COUNT(*), 2) AS conversion_pct
FROM quartiled
GROUP BY duration_quartile
ORDER BY duration_quartile ASC;`,
    explanation:
      'Bucketing sessions via `NTILE(4)` reveals whether longer browsing correlates with higher checkout conversion.',
    orderMatters: true,
  },
  {
    id: 'h29-yoy-q1-category-revenue-growth',
    title: 'Year-over-Year (YoY) Q1 Revenue Growth by Category (Q1 2025 vs Q1 2026)',
    difficulty: 'Hard',
    concepts: ['YoY Comparison', 'Conditional Aggregation', 'CTE (WITH)'],
    stakeholder: 'Board Strategy',
    scenario:
      'Compare Q1 2025 (`2025-01-01`..`2025-03-31`) against Q1 2026 (`2026-01-01`..`2026-03-31`) completed line-item revenue for every product `category`, reporting `q1_2025_rev`, `q1_2026_rev`, and `yoy_growth_pct`.',
    requirements: [
      'Join `orders o`, `order_items oi`, and `products p` on `o.status = \'completed\'`.',
      'Use conditional `SUM(CASE WHEN ...)` inside a CTE to compute `q1_2025_rev` and `q1_2026_rev` per `category`.',
      'Compute `yoy_growth_pct = ROUND(100.0 * (q1_2026_rev - q1_2025_rev) / q1_2025_rev, 2)`.',
      'Order by `yoy_growth_pct DESC`, `category ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'q1_2025_rev', type: 'REAL', description: 'Q1 2025 revenue' },
      { name: 'q1_2026_rev', type: 'REAL', description: 'Q1 2026 revenue' },
      { name: 'yoy_growth_pct', type: 'REAL', description: 'YoY % growth (2 decimals)' },
    ],
    starterSql: `WITH q1_comp AS (
  SELECT
    p.category,
    SUM(CASE WHEN o.order_date BETWEEN '2025-01-01' AND '2025-03-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS q1_2025_rev,
    SUM(CASE WHEN o.order_date BETWEEN '2026-01-01' AND '2026-03-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS q1_2026_rev
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category
)
SELECT ...`,
    hints: [
      'Apply `ROUND(..., 2)` on all dollar columns and the YoY growth rate.',
      'Sort by `yoy_growth_pct DESC, category ASC`.',
    ],
    solutionSql: `WITH q1_comp AS (
  SELECT
    p.category,
    SUM(CASE WHEN o.order_date BETWEEN '2025-01-01' AND '2025-03-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS q1_2025_rev,
    SUM(CASE WHEN o.order_date BETWEEN '2026-01-01' AND '2026-03-31' THEN oi.quantity * oi.unit_price ELSE 0 END) AS q1_2026_rev
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category
)
SELECT
  category,
  ROUND(q1_2025_rev, 2) AS q1_2025_rev,
  ROUND(q1_2026_rev, 2) AS q1_2026_rev,
  ROUND(100.0 * (q1_2026_rev - q1_2025_rev) / q1_2025_rev, 2) AS yoy_growth_pct
FROM q1_comp
ORDER BY yoy_growth_pct DESC, category ASC;`,
    explanation:
      'Apples-to-apples Q1 YoY comparisons eliminate seasonality bias when evaluating category growth.',
    orderMatters: true,
  },
  {
    id: 'h30-dedup-spend-quartiles',
    title: 'Deduplicated Customer Lifetime Spend Quartiles (NTILE 4)',
    difficulty: 'Hard',
    concepts: ['ROW_NUMBER()', 'NTILE()', 'Deduplication'],
    stakeholder: 'VIP Marketing',
    scenario:
      'First deduplicate completed orders (`ROW_NUMBER()` over `(user_id, order_date, total_amount)` keeping earliest `order_id`), then sum each customer’s clean lifetime spend, bucket customers into 4 spend quartiles (`NTILE(4)`), and report min, avg, and max buyer spend per quartile.',
    requirements: [
      'CTE 1 (`dedup`): keep `rn = 1` from completed `orders` partitioned by `(user_id, order_date, total_amount)`.',
      'CTE 2 (`user_ltv`): sum clean `total_amount` per `user_id`.',
      'CTE 3 (`quartiled`): assign `spend_quartile = NTILE(4) OVER (ORDER BY clean_spend ASC, user_id ASC)`.',
      'Group by `spend_quartile`, returning `spend_quartile`, `buyer_count`, `min_spend`, `avg_spend`, and `max_spend` (rounded to 2 decimals), ordered by `spend_quartile ASC`.',
    ],
    expectedColumns: [
      { name: 'spend_quartile', type: 'INTEGER', description: 'Quartile 1 (lowest) to 4 (highest)' },
      { name: 'buyer_count', type: 'INTEGER', description: 'Buyers in quartile' },
      { name: 'min_spend', type: 'REAL', description: 'Minimum clean spend' },
      { name: 'avg_spend', type: 'REAL', description: 'Average clean spend' },
      { name: 'max_spend', type: 'REAL', description: 'Maximum clean spend' },
    ],
    starterSql: `WITH dedup AS (
  SELECT
    order_id,
    user_id,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC) AS rn
  FROM orders
  WHERE status = 'completed'
),
user_ltv AS (
  SELECT user_id, SUM(total_amount) AS clean_spend
  FROM dedup
  WHERE rn = 1
  GROUP BY user_id
),
quartiled AS (
  SELECT
    user_id,
    clean_spend,
    NTILE(4) OVER (ORDER BY clean_spend ASC, user_id ASC) AS spend_quartile
  FROM user_ltv
)
SELECT ...`,
    hints: [
      'Perform deduplication BEFORE summing per user so double-submitted orders don’t push buyers into higher quartiles.',
      'Order by `spend_quartile ASC`.',
    ],
    solutionSql: `WITH dedup AS (
  SELECT
    order_id,
    user_id,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_date, total_amount
      ORDER BY order_id ASC
    ) AS rn
  FROM orders
  WHERE status = 'completed'
),
user_ltv AS (
  SELECT
    user_id,
    SUM(total_amount) AS clean_spend
  FROM dedup
  WHERE rn = 1
  GROUP BY user_id
),
quartiled AS (
  SELECT
    user_id,
    clean_spend,
    NTILE(4) OVER (ORDER BY clean_spend ASC, user_id ASC) AS spend_quartile
  FROM user_ltv
)
SELECT
  spend_quartile,
  COUNT(*) AS buyer_count,
  ROUND(MIN(clean_spend), 2) AS min_spend,
  ROUND(AVG(clean_spend), 2) AS avg_spend,
  ROUND(MAX(clean_spend), 2) AS max_spend
FROM quartiled
GROUP BY spend_quartile
ORDER BY spend_quartile ASC;`,
    explanation:
      'Piping deduplicated transactions into `NTILE(4)` segmentation is a clean multi-CTE data-quality + analytics pattern.',
    orderMatters: true,
  },
  {
    id: 'h31-utm-funnel-and-revenue-per-session',
    title: 'End-to-End UTM Attribution: Sessions, Buyers & Avg Spend',
    difficulty: 'Hard',
    concepts: ['CTE (WITH)', 'Fan-Out Prevention', 'LEFT JOIN'],
    stakeholder: 'Growth Attribution',
    scenario:
      'For each non-NULL `utm_source` in `web_events`, calculate total distinct sessions, distinct converted users (`purchase` event), and the average lifetime completed spend (`orders`) of those converted users (aggregated safely without fan-out!).',
    requirements: [
      'CTE 1 (`utm_sessions`): group `web_events` (`utm_source IS NOT NULL`) by `utm_source` to get `total_sessions` (`COUNT(DISTINCT session_id)`).',
      'CTE 2 (`utm_buyers`): distinct `(utm_source, user_id)` pairs where `event_name = \'purchase\'` and `user_id IS NOT NULL`.',
      'CTE 3 (`user_spend`): total completed `orders.total_amount` per `user_id`.',
      'Join `utm_sessions`, `utm_buyers`, and `user_spend`, returning `utm_source`, `total_sessions`, `converted_users`, and `avg_buyer_ltv` (`ROUND(AVG(us.ltv), 2)`), ordered by `converted_users DESC, utm_source ASC`.',
    ],
    expectedColumns: [
      { name: 'utm_source', type: 'TEXT', description: 'UTM traffic source' },
      { name: 'total_sessions', type: 'INTEGER', description: 'Distinct sessions' },
      { name: 'converted_users', type: 'INTEGER', description: 'Distinct purchasing users' },
      { name: 'avg_buyer_ltv', type: 'REAL', description: 'Avg completed LTV of converted users' },
    ],
    starterSql: `WITH utm_sessions AS (
  SELECT utm_source, COUNT(DISTINCT session_id) AS total_sessions
  FROM web_events
  WHERE utm_source IS NOT NULL
  GROUP BY utm_source
),
utm_buyers AS (
  SELECT DISTINCT utm_source, user_id
  FROM web_events
  WHERE event_name = 'purchase' AND user_id IS NOT NULL AND utm_source IS NOT NULL
),
user_spend AS (
  SELECT user_id, SUM(total_amount) AS ltv
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT ...`,
    hints: [
      'Use `LEFT JOIN utm_buyers` from `utm_sessions` so UTM channels with zero purchases (like `linkedin`) still appear with `0` buyers!',
      'Group final SELECT by `us.utm_source, us.total_sessions`.',
    ],
    solutionSql: `WITH utm_sessions AS (
  SELECT
    utm_source,
    COUNT(DISTINCT session_id) AS total_sessions
  FROM web_events
  WHERE utm_source IS NOT NULL
  GROUP BY utm_source
),
utm_buyers AS (
  SELECT DISTINCT
    utm_source,
    user_id
  FROM web_events
  WHERE event_name = 'purchase'
    AND user_id IS NOT NULL
    AND utm_source IS NOT NULL
),
user_spend AS (
  SELECT
    user_id,
    SUM(total_amount) AS ltv
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT
  s.utm_source,
  s.total_sessions,
  COUNT(b.user_id) AS converted_users,
  ROUND(AVG(sp.ltv), 2) AS avg_buyer_ltv
FROM utm_sessions s
LEFT JOIN utm_buyers b
  ON s.utm_source = b.utm_source
LEFT JOIN user_spend sp
  ON b.user_id = sp.user_id
GROUP BY s.utm_source, s.total_sessions
ORDER BY converted_users DESC, s.utm_source ASC;`,
    explanation:
      'Separating session breadth, distinct buyer conversion, and customer LTV into distinct CTEs prevents clickstream-to-order join inflation.',
    orderMatters: true,
  },
  {
    id: 'h32-time-to-next-order-lead',
    title: 'First-to-Second Order Conversion Speed by Plan Tier',
    difficulty: 'Hard',
    concepts: ['LEAD()', 'ROW_NUMBER()', 'julianday'],
    stakeholder: 'Retention Modeling',
    scenario:
      'How many days pass between a customer’s 1st completed order and their 2nd completed order? Use `ROW_NUMBER()` and `LEAD(order_date)` per user, isolate `order_seq = 1` where a 2nd order exists, and average the days-to-second-order by `u.plan_tier`.',
    requirements: [
      'CTE 1: on completed `orders`, compute `order_seq = ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC)` and `second_order_date = LEAD(order_date) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC)`.',
      'Filter `order_seq = 1 AND second_order_date IS NOT NULL`, join `users u`, and group by `u.plan_tier`.',
      'Return `plan_tier`, `repeat_buyers` (`COUNT(*)`), and `avg_days_to_second_order` (`ROUND(AVG(julianday(second_order_date) - julianday(order_date)), 1)`).',
      'Order by `avg_days_to_second_order ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Customer plan tier' },
      { name: 'repeat_buyers', type: 'INTEGER', description: 'Buyers with >= 2 completed orders' },
      { name: 'avg_days_to_second_order', type: 'REAL', description: 'Avg days from 1st to 2nd order' },
    ],
    starterSql: `WITH seq AS (
  SELECT
    user_id,
    order_date,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC) AS order_seq,
    LEAD(order_date) OVER (PARTITION BY user_id ORDER BY order_date ASC, order_id ASC) AS second_order_date
  FROM orders
  WHERE status = 'completed'
)
SELECT ...`,
    hints: [
      '`order_seq = 1` guarantees only the 1st-to-2nd transition is measured per buyer.',
      'Exclude one-time buyers with `WHERE s.order_seq = 1 AND s.second_order_date IS NOT NULL`.',
    ],
    solutionSql: `WITH seq AS (
  SELECT
    user_id,
    order_date,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS order_seq,
    LEAD(order_date) OVER (
      PARTITION BY user_id
      ORDER BY order_date ASC, order_id ASC
    ) AS second_order_date
  FROM orders
  WHERE status = 'completed'
)
SELECT
  u.plan_tier,
  COUNT(*) AS repeat_buyers,
  ROUND(AVG(julianday(s.second_order_date) - julianday(s.order_date)), 1) AS avg_days_to_second_order
FROM seq s
INNER JOIN users u
  ON s.user_id = u.user_id
WHERE s.order_seq = 1
  AND s.second_order_date IS NOT NULL
GROUP BY u.plan_tier
ORDER BY avg_days_to_second_order ASC;`,
    explanation:
      'Pairing `ROW_NUMBER()` with `LEAD()` cleanly isolates the exact second-purchase activation window.',
    orderMatters: true,
  },
  {
    id: 'h33-top-2-countries-per-quarter',
    title: 'Top 2 Revenue Countries per Calendar Quarter (DENSE_RANK)',
    difficulty: 'Hard',
    concepts: ['DENSE_RANK()', 'PARTITION BY', 'strftime'],
    stakeholder: 'Global Revenue Ops',
    scenario:
      'For each calendar quarter (`2025-Q1` through `2026-Q1`), rank countries by completed order revenue using `DENSE_RANK()` and return the Top 2 countries per quarter.',
    requirements: [
      'CTE 1: join completed `orders o` to `users u`, derive `quarter = strftime(\'%Y\', o.order_date) || \'-Q\' || ((CAST(strftime(\'%m\', o.order_date) AS INTEGER) + 2) / 3)`, and sum `o.total_amount` per `(quarter, country)`.',
      'CTE 2: compute `qtr_rank = DENSE_RANK() OVER (PARTITION BY quarter ORDER BY qtr_revenue DESC)`.',
      'Return `quarter`, `country`, `qtr_revenue` (2 decimals), and `qtr_rank` where `qtr_rank <= 2`.',
      'Order by `quarter ASC, qtr_rank ASC, country ASC`.',
    ],
    expectedColumns: [
      { name: 'quarter', type: 'TEXT', description: 'Calendar quarter' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'qtr_revenue', type: 'REAL', description: 'Quarterly revenue' },
      { name: 'qtr_rank', type: 'INTEGER', description: 'Dense rank within quarter (1–2)' },
    ],
    starterSql: `WITH qtr_country AS (
  SELECT
    strftime('%Y', o.order_date) || '-Q' || ((CAST(strftime('%m', o.order_date) AS INTEGER) + 2) / 3) AS quarter,
    u.country,
    ROUND(SUM(o.total_amount), 2) AS qtr_revenue
  FROM orders o
  INNER JOIN users u ON o.user_id = u.user_id
  WHERE o.status = 'completed'
  GROUP BY quarter, u.country
),
ranked AS (
  SELECT
    quarter,
    country,
    qtr_revenue,
    DENSE_RANK() OVER (PARTITION BY quarter ORDER BY qtr_revenue DESC) AS qtr_rank
  FROM qtr_country
)
SELECT ...`,
    hints: [
      'Compute the quarter string and revenue inside the first CTE before ranking.',
      'Filter `WHERE qtr_rank <= 2` in the outer query.',
    ],
    solutionSql: `WITH qtr_country AS (
  SELECT
    strftime('%Y', o.order_date) || '-Q' || ((CAST(strftime('%m', o.order_date) AS INTEGER) + 2) / 3) AS quarter,
    u.country,
    ROUND(SUM(o.total_amount), 2) AS qtr_revenue
  FROM orders o
  INNER JOIN users u
    ON o.user_id = u.user_id
  WHERE o.status = 'completed'
  GROUP BY quarter, u.country
),
ranked AS (
  SELECT
    quarter,
    country,
    qtr_revenue,
    DENSE_RANK() OVER (
      PARTITION BY quarter
      ORDER BY qtr_revenue DESC
    ) AS qtr_rank
  FROM qtr_country
)
SELECT
  quarter,
  country,
  qtr_revenue,
  qtr_rank
FROM ranked
WHERE qtr_rank <= 2
ORDER BY quarter ASC, qtr_rank ASC, country ASC;`,
    explanation:
      'Quarter-partitioned `DENSE_RANK()` highlights regional leadership shifts over time.',
    orderMatters: true,
  },
  {
    id: 'h34-post-launch-catalog-revenue-share',
    title: '2025 Product Launches: Share of Total 2025–2026 Revenue',
    difficulty: 'Hard',
    concepts: ['Window SUM', 'CTE (WITH)', 'Date Filtering'],
    stakeholder: 'Product Strategy',
    scenario:
      'What share of total catalog revenue came from newly launched 2025 products (`launch_date >= \'2025-01-01\'`) versus legacy 2024 products? Group completed line items by `launch_cohort` (`\'2024 Legacy\'` vs `\'2025 New Launch\'`) and compute SKU count, units sold, total revenue, and % share of catalog revenue.',
    requirements: [
      'CTE 1: join `products p`, `order_items oi`, and completed `orders o`, classifying `launch_cohort = CASE WHEN p.launch_date >= \'2025-01-01\' THEN \'2025 New Launch\' ELSE \'2024 Legacy\' END`.',
      'Aggregate `distinct_skus` (`COUNT(DISTINCT p.product_id)`), `units_sold` (`SUM(oi.quantity)`), and `cohort_revenue` (`SUM(oi.quantity * oi.unit_price)`).',
      'Compute `revenue_share_pct = ROUND(100.0 * cohort_revenue / SUM(cohort_revenue) OVER (), 2)`.',
      'Order by `cohort_revenue DESC`.',
    ],
    expectedColumns: [
      { name: 'launch_cohort', type: 'TEXT', description: '2024 Legacy or 2025 New Launch' },
      { name: 'distinct_skus', type: 'INTEGER', description: 'Products sold in cohort' },
      { name: 'units_sold', type: 'INTEGER', description: 'Units sold' },
      { name: 'cohort_revenue', type: 'REAL', description: 'Total revenue (2 decimals)' },
      { name: 'revenue_share_pct', type: 'REAL', description: '% of total catalog revenue' },
    ],
    starterSql: `WITH launch_sales AS (
  SELECT
    CASE WHEN p.launch_date >= '2025-01-01' THEN '2025 New Launch' ELSE '2024 Legacy' END AS launch_cohort,
    COUNT(DISTINCT p.product_id) AS distinct_skus,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS cohort_revenue
  FROM products p
  INNER JOIN order_items oi ON p.product_id = oi.product_id
  INNER JOIN orders o ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY launch_cohort
)
SELECT ...`,
    hints: [
      'Divide `cohort_revenue` by `SUM(cohort_revenue) OVER ()` multiplied by `100.0`.',
      'Order by `cohort_revenue DESC`.',
    ],
    solutionSql: `WITH launch_sales AS (
  SELECT
    CASE WHEN p.launch_date >= '2025-01-01' THEN '2025 New Launch' ELSE '2024 Legacy' END AS launch_cohort,
    COUNT(DISTINCT p.product_id) AS distinct_skus,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS cohort_revenue
  FROM products p
  INNER JOIN order_items oi
    ON p.product_id = oi.product_id
  INNER JOIN orders o
    ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY launch_cohort
)
SELECT
  launch_cohort,
  distinct_skus,
  units_sold,
  ROUND(cohort_revenue, 2) AS cohort_revenue,
  ROUND(100.0 * cohort_revenue / SUM(cohort_revenue) OVER (), 2) AS revenue_share_pct
FROM launch_sales
ORDER BY cohort_revenue DESC;`,
    explanation:
      'Evaluating vintage cohorts with `SUM() OVER ()` tells R&D how much revenue comes from new launches vs. mature SKUs.',
    orderMatters: true,
  },
  {
    id: 'h35-support-resolution-sla-rank',
    title: 'Fastest vs. Slowest Resolved Tickets per Category (RANK)',
    difficulty: 'Hard',
    concepts: ['RANK()', 'julianday', 'PARTITION BY'],
    stakeholder: 'Support Quality',
    scenario:
      'For all resolved tickets (`resolved_at IS NOT NULL`), compute exact resolution hours (`(julianday(resolved_at) - julianday(created_at)) * 24.0`), rank tickets slowest-to-fastest within each `category` using `RANK()`, and return the 2 slowest tickets per category.',
    requirements: [
      'CTE 1: compute `resolution_hours = ROUND((julianday(resolved_at) - julianday(created_at)) * 24.0, 2)` and `slow_rank = RANK() OVER (PARTITION BY category ORDER BY (julianday(resolved_at) - julianday(created_at)) DESC)` for resolved tickets.',
      'Keep `slow_rank <= 2`, joining `users u` for customer name.',
      'Return `category`, `slow_rank`, `ticket_id`, `full_name`, `priority`, and `resolution_hours`.',
      'Order by `category ASC, slow_rank ASC, ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'slow_rank', type: 'INTEGER', description: 'Rank within category (1 = slowest)' },
      { name: 'ticket_id', type: 'INTEGER', description: 'Ticket ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'priority', type: 'TEXT', description: 'Priority' },
      { name: 'resolution_hours', type: 'REAL', description: 'Hours to resolve' },
    ],
    starterSql: `WITH ranked_sla AS (
  SELECT
    st.ticket_id,
    st.user_id,
    st.category,
    st.priority,
    ROUND((julianday(st.resolved_at) - julianday(st.created_at)) * 24.0, 2) AS resolution_hours,
    RANK() OVER (
      PARTITION BY st.category
      ORDER BY (julianday(st.resolved_at) - julianday(st.created_at)) DESC
    ) AS slow_rank
  FROM support_tickets st
  WHERE st.resolved_at IS NOT NULL
)
SELECT ...`,
    hints: [
      'Filter `WHERE st.resolved_at IS NOT NULL` before computing `RANK()`.',
      'Keep `WHERE rs.slow_rank <= 2` in the outer query.',
    ],
    solutionSql: `WITH ranked_sla AS (
  SELECT
    st.ticket_id,
    st.user_id,
    st.category,
    st.priority,
    ROUND((julianday(st.resolved_at) - julianday(st.created_at)) * 24.0, 2) AS resolution_hours,
    RANK() OVER (
      PARTITION BY st.category
      ORDER BY (julianday(st.resolved_at) - julianday(st.created_at)) DESC
    ) AS slow_rank
  FROM support_tickets st
  WHERE st.resolved_at IS NOT NULL
)
SELECT
  rs.category,
  rs.slow_rank,
  rs.ticket_id,
  u.full_name,
  rs.priority,
  rs.resolution_hours
FROM ranked_sla rs
INNER JOIN users u
  ON rs.user_id = u.user_id
WHERE rs.slow_rank <= 2
ORDER BY rs.category ASC, rs.slow_rank ASC, rs.ticket_id ASC;`,
    explanation:
      'Partitioned `RANK()` over exact Julian timestamp deltas isolates SLA outliers in every support queue.',
    orderMatters: true,
  },
  {
    id: 'h36-rolling-4-month-review-rating',
    title: 'Monthly Product Review Volume & 3-Month Rolling Avg Rating',
    difficulty: 'Hard',
    concepts: ['ROWS BETWEEN', 'strftime', 'AVG'],
    stakeholder: 'Customer Sentiment',
    scenario:
      'Track product review sentiment over time: aggregate `product_reviews` by `review_month` (`YYYY-MM`) to get `review_count` and `monthly_avg_rating`, then compute a trailing 3-month rolling average of `monthly_avg_rating` (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`).',
    requirements: [
      'CTE 1: group `product_reviews` by `review_month = strftime(\'%Y-%m\', review_date)`, computing `review_count = COUNT(*)` and `monthly_avg_rating = AVG(rating)`.',
      'Outer SELECT: return `review_month`, `review_count`, `monthly_avg_rating` (2 decimals), and `rolling_3m_rating` (`ROUND(AVG(monthly_avg_rating) OVER (ORDER BY review_month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)`).',
      'Order by `review_month ASC`.',
    ],
    expectedColumns: [
      { name: 'review_month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'review_count', type: 'INTEGER', description: 'Reviews posted' },
      { name: 'monthly_avg_rating', type: 'REAL', description: 'Monthly avg stars' },
      { name: 'rolling_3m_rating', type: 'REAL', description: 'Trailing 3-month avg rating' },
    ],
    starterSql: `WITH monthly_reviews AS (
  SELECT
    strftime('%Y-%m', review_date) AS review_month,
    COUNT(*) AS review_count,
    AVG(rating) AS monthly_avg_rating
  FROM product_reviews
  GROUP BY strftime('%Y-%m', review_date)
)
SELECT ...`,
    hints: [
      'Keep `monthly_avg_rating` unrounded inside the CTE and round both columns in the outer `SELECT`.',
      'Use `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` ordered by `review_month`.',
    ],
    solutionSql: `WITH monthly_reviews AS (
  SELECT
    strftime('%Y-%m', review_date) AS review_month,
    COUNT(*) AS review_count,
    AVG(rating) AS monthly_avg_rating
  FROM product_reviews
  GROUP BY strftime('%Y-%m', review_date)
)
SELECT
  review_month,
  review_count,
  ROUND(monthly_avg_rating, 2) AS monthly_avg_rating,
  ROUND(
    AVG(monthly_avg_rating) OVER (
      ORDER BY review_month
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS rolling_3m_rating
FROM monthly_reviews
ORDER BY review_month ASC;`,
    explanation:
      'Smoothing noisy monthly CSAT/review series with a 3-period window exposes long-term product quality trends.',
    orderMatters: true,
  },
  {
    id: 'h37-top-product-by-helpful-votes-per-category',
    title: 'Most Helpful Reviewed Product per Category (DENSE_RANK)',
    difficulty: 'Hard',
    concepts: ['DENSE_RANK()', 'PARTITION BY', 'Multi-Table JOIN'],
    stakeholder: 'Merchandising & Social Proof',
    scenario:
      'For each product `category`, find the product(s) with the highest total `helpful_votes` across `product_reviews` using `DENSE_RANK()`.',
    requirements: [
      'CTE 1: join `product_reviews pr` and `products p`, summing `total_helpful_votes = SUM(pr.helpful_votes)` and `avg_rating = ROUND(AVG(pr.rating), 2)` per `(p.category, p.product_name)`.',
      'CTE 2: compute `vote_rank = DENSE_RANK() OVER (PARTITION BY category ORDER BY total_helpful_votes DESC)`.',
      'Keep `vote_rank = 1`, ordered by `category ASC, product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'product_name', type: 'TEXT', description: 'Top helpful-vote product' },
      { name: 'total_helpful_votes', type: 'INTEGER', description: 'Sum of helpful votes' },
      { name: 'avg_rating', type: 'REAL', description: 'Average rating' },
    ],
    starterSql: `WITH prod_votes AS (
  SELECT
    p.category,
    p.product_name,
    SUM(pr.helpful_votes) AS total_helpful_votes,
    ROUND(AVG(pr.rating), 2) AS avg_rating
  FROM product_reviews pr
  INNER JOIN products p ON pr.product_id = p.product_id
  GROUP BY p.category, p.product_name
),
ranked AS (
  SELECT
    category,
    product_name,
    total_helpful_votes,
    avg_rating,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY total_helpful_votes DESC) AS vote_rank
  FROM prod_votes
)
SELECT ...`,
    hints: [
      'Compute `SUM(pr.helpful_votes)` per product before ranking.',
      'Filter `WHERE vote_rank = 1`.',
    ],
    solutionSql: `WITH prod_votes AS (
  SELECT
    p.category,
    p.product_name,
    SUM(pr.helpful_votes) AS total_helpful_votes,
    ROUND(AVG(pr.rating), 2) AS avg_rating
  FROM product_reviews pr
  INNER JOIN products p
    ON pr.product_id = p.product_id
  GROUP BY p.category, p.product_name
),
ranked AS (
  SELECT
    category,
    product_name,
    total_helpful_votes,
    avg_rating,
    DENSE_RANK() OVER (
      PARTITION BY category
      ORDER BY total_helpful_votes DESC
    ) AS vote_rank
  FROM prod_votes
)
SELECT
  category,
  product_name,
  total_helpful_votes,
  avg_rating
FROM ranked
WHERE vote_rank = 1
ORDER BY category ASC, product_name ASC;`,
    explanation:
      'Using `DENSE_RANK()` ensures tied community favorites within any category are preserved.',
    orderMatters: true,
  },
  {
    id: 'h38-channel-cohort-retention-month1',
    title: 'Month-1 Buyer Retention Rate by Acquisition Channel',
    difficulty: 'Hard',
    concepts: ['Cohort Analysis', 'Date Math', 'LEFT JOIN'],
    stakeholder: 'Growth Marketing',
    scenario:
      'Which `acquisition_channel` produces the stickiest buyers? Anchor each customer to their first completed `order_date` (for cohorts `2025-01`..`2025-12`), check whether they returned to place a completed order in exact `month_offset = 1`, and report `cohort_buyers`, `retained_m1_buyers`, and `m1_retention_pct` by channel.',
    requirements: [
      'CTE 1 (`first_buy`): `MIN(o.order_date)` per `user_id` on completed orders where `strftime(\'%Y-%m\', first_order_date) BETWEEN \'2025-01\' AND \'2025-12\'`.',
      'CTE 2 (`m1_return`): distinct `user_id`s who have a completed order with integer `month_offset = 1` relative to `first_order_date`.',
      'Join `first_buy fb`, `users u`, and `LEFT JOIN m1_return m1`, grouping by `COALESCE(u.acquisition_channel, \'unattributed\') AS channel`.',
      'Return `channel`, `cohort_buyers`, `retained_m1_buyers`, and `m1_retention_pct` (2 decimals), ordered by `m1_retention_pct DESC, cohort_buyers DESC, channel ASC`.',
    ],
    expectedColumns: [
      { name: 'channel', type: 'TEXT', description: 'Acquisition channel or unattributed' },
      { name: 'cohort_buyers', type: 'INTEGER', description: '2025 first-time buyers' },
      { name: 'retained_m1_buyers', type: 'INTEGER', description: 'Buyers returning in Month +1' },
      { name: 'm1_retention_pct', type: 'REAL', description: 'Month-1 retention %' },
    ],
    starterSql: `WITH first_buy AS (
  SELECT
    user_id,
    MIN(order_date) AS first_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
  HAVING strftime('%Y-%m', MIN(order_date)) BETWEEN '2025-01' AND '2025-12'
),
m1_return AS (
  SELECT DISTINCT o.user_id
  FROM orders o
  INNER JOIN first_buy fb ON o.user_id = fb.user_id
  WHERE o.status = 'completed'
    AND (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fb.first_order_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fb.first_order_date) AS INTEGER)) = 1
)
SELECT ...`,
    hints: [
      '`LEFT JOIN m1_return` preserves channels with 0% Month-1 retention.',
      'Use `COUNT(m1.user_id)` for `retained_m1_buyers` and `COUNT(fb.user_id)` for `cohort_buyers`.',
    ],
    solutionSql: `WITH first_buy AS (
  SELECT
    user_id,
    MIN(order_date) AS first_order_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
  HAVING strftime('%Y-%m', MIN(order_date)) BETWEEN '2025-01' AND '2025-12'
),
m1_return AS (
  SELECT DISTINCT o.user_id
  FROM orders o
  INNER JOIN first_buy fb
    ON o.user_id = fb.user_id
  WHERE o.status = 'completed'
    AND (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', fb.first_order_date) AS INTEGER)) * 12
      + (CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', fb.first_order_date) AS INTEGER)) = 1
)
SELECT
  COALESCE(u.acquisition_channel, 'unattributed') AS channel,
  COUNT(fb.user_id) AS cohort_buyers,
  COUNT(m1.user_id) AS retained_m1_buyers,
  ROUND(100.0 * COUNT(m1.user_id) / COUNT(fb.user_id), 2) AS m1_retention_pct
FROM first_buy fb
INNER JOIN users u
  ON fb.user_id = u.user_id
LEFT JOIN m1_return m1
  ON fb.user_id = m1.user_id
GROUP BY COALESCE(u.acquisition_channel, 'unattributed')
ORDER BY m1_retention_pct DESC, cohort_buyers DESC, channel ASC;`,
    explanation:
      'Evaluating Month-1 repeat behavior by acquisition channel bridges CAC spend with downstream retention quality.',
    orderMatters: true,
  },
  {
    id: 'h39-country-share-of-active-mrr',
    title: 'Active SaaS MRR Concentration & Cumulative % by Country',
    difficulty: 'Hard',
    concepts: ['Window SUM', 'UNBOUNDED PRECEDING', 'Multi-Table JOIN'],
    stakeholder: 'International VP',
    scenario:
      'Join currently `active` `subscriptions` to `users` to aggregate active MRR by `country`, then calculate each country’s % share of global active MRR and cumulative running % share from largest market to smallest.',
    requirements: [
      'CTE 1: join `subscriptions s` (`s.status = \'active\'`) with `users u`, summing `country_mrr` and counting `active_subs` per `u.country`.',
      'Outer SELECT: compute `mrr_share_pct = ROUND(100.0 * country_mrr / SUM(country_mrr) OVER (), 2)` and `cum_mrr_share_pct = ROUND(100.0 * SUM(country_mrr) OVER (ORDER BY country_mrr DESC, country ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(country_mrr) OVER (), 2)`.',
      'Order by `country_mrr DESC, country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'active_subs', type: 'INTEGER', description: 'Active subscriptions' },
      { name: 'country_mrr', type: 'REAL', description: 'Active MRR (USD)' },
      { name: 'mrr_share_pct', type: 'REAL', description: 'Share of global active MRR (%)' },
      { name: 'cum_mrr_share_pct', type: 'REAL', description: 'Cumulative % share' },
    ],
    starterSql: `WITH country_saas AS (
  SELECT
    u.country,
    COUNT(*) AS active_subs,
    SUM(s.mrr_amount) AS country_mrr
  FROM subscriptions s
  INNER JOIN users u ON s.user_id = u.user_id
  WHERE s.status = 'active'
  GROUP BY u.country
)
SELECT ...`,
    hints: [
      'Use `SUM(country_mrr) OVER ()` for the global MRR denominator.',
      'Order the running window sum by `country_mrr DESC, country ASC`.',
    ],
    solutionSql: `WITH country_saas AS (
  SELECT
    u.country,
    COUNT(*) AS active_subs,
    SUM(s.mrr_amount) AS country_mrr
  FROM subscriptions s
  INNER JOIN users u
    ON s.user_id = u.user_id
  WHERE s.status = 'active'
  GROUP BY u.country
)
SELECT
  country,
  active_subs,
  ROUND(country_mrr, 2) AS country_mrr,
  ROUND(100.0 * country_mrr / SUM(country_mrr) OVER (), 2) AS mrr_share_pct,
  ROUND(
    100.0 * SUM(country_mrr) OVER (
      ORDER BY country_mrr DESC, country ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) / SUM(country_mrr) OVER (),
    2
  ) AS cum_mrr_share_pct
FROM country_saas
ORDER BY country_mrr DESC, country ASC;`,
    explanation:
      'Dual window `SUM()` expressions expose geographic revenue concentration across active recurring contracts.',
    orderMatters: true,
  },
  {
    id: 'h40-revenue-per-buyer-ranked-within-tier',
    title: 'Top 2 Highest-Value Buyers Within Each Plan Tier (DENSE_RANK & Percentile)',
    difficulty: 'Hard',
    concepts: ['DENSE_RANK()', 'Window AVG', 'CTE (WITH)'],
    stakeholder: 'Enterprise Customer Success',
    scenario:
      'Within each `plan_tier` (`enterprise`, `pro`, `starter`), rank customers by their deduplicated lifetime completed spend (`total_spent`) using `DENSE_RANK()`, compute the tier’s average buyer spend via `AVG() OVER (PARTITION BY plan_tier)`, and return the Top 2 buyers per tier alongside how much they exceed their tier’s average (`vs_tier_avg`).',
    requirements: [
      'CTE 1: deduplicate completed `orders` via `ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC)`.',
      'CTE 2: aggregate `total_spent` per `(plan_tier, user_id, full_name)`.',
      'CTE 3: compute `tier_rank = DENSE_RANK() OVER (PARTITION BY plan_tier ORDER BY total_spent DESC)` and `tier_avg = AVG(total_spent) OVER (PARTITION BY plan_tier)`.',
      'Keep `tier_rank <= 2`, returning `plan_tier`, `tier_rank`, `full_name`, `total_spent`, and `vs_tier_avg` (`ROUND(total_spent - tier_avg, 2)`), ordered by `plan_tier ASC, tier_rank ASC, user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Subscription tier' },
      { name: 'tier_rank', type: 'INTEGER', description: 'Dense rank within tier (1–2)' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'total_spent', type: 'REAL', description: 'Deduplicated completed spend' },
      { name: 'vs_tier_avg', type: 'REAL', description: 'Spend above tier average (USD)' },
    ],
    starterSql: `WITH dedup_orders AS (
  SELECT
    order_id,
    user_id,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC) AS rn
  FROM orders
  WHERE status = 'completed'
),
buyer_spend AS (
  SELECT
    u.plan_tier,
    u.user_id,
    u.full_name,
    SUM(d.total_amount) AS total_spent
  FROM dedup_orders d
  INNER JOIN users u ON d.user_id = u.user_id
  WHERE d.rn = 1
  GROUP BY u.plan_tier, u.user_id, u.full_name
),
ranked AS (
  SELECT
    plan_tier,
    user_id,
    full_name,
    total_spent,
    DENSE_RANK() OVER (PARTITION BY plan_tier ORDER BY total_spent DESC) AS tier_rank,
    AVG(total_spent) OVER (PARTITION BY plan_tier) AS tier_avg
  FROM buyer_spend
)
SELECT ...`,
    hints: [
      'Notice `AVG(total_spent) OVER (PARTITION BY plan_tier)` computes the full tier benchmark BEFORE filtering `WHERE tier_rank <= 2`!',
      'Round `total_spent` and `vs_tier_avg` to 2 decimal places.',
    ],
    solutionSql: `WITH dedup_orders AS (
  SELECT
    order_id,
    user_id,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_date, total_amount
      ORDER BY order_id ASC
    ) AS rn
  FROM orders
  WHERE status = 'completed'
),
buyer_spend AS (
  SELECT
    u.plan_tier,
    u.user_id,
    u.full_name,
    SUM(d.total_amount) AS total_spent
  FROM dedup_orders d
  INNER JOIN users u
    ON d.user_id = u.user_id
  WHERE d.rn = 1
  GROUP BY u.plan_tier, u.user_id, u.full_name
),
ranked AS (
  SELECT
    plan_tier,
    user_id,
    full_name,
    total_spent,
    DENSE_RANK() OVER (PARTITION BY plan_tier ORDER BY total_spent DESC) AS tier_rank,
    AVG(total_spent) OVER (PARTITION BY plan_tier) AS tier_avg
  FROM buyer_spend
)
SELECT
  plan_tier,
  tier_rank,
  full_name,
  ROUND(total_spent, 2) AS total_spent,
  ROUND(total_spent - tier_avg, 2) AS vs_tier_avg
FROM ranked
WHERE tier_rank <= 2
ORDER BY plan_tier ASC, tier_rank ASC, user_id ASC;`,
    explanation:
      'This capstone combines order deduplication, per-tier `DENSE_RANK()`, and tier-wide `AVG() OVER` benchmarking in a single clean pipeline.',
    orderMatters: true,
  },
];
