import type { ProblemBlueprint } from './problemsEasy';

export const EXTRA_MEDIUM_PROBLEMS: ProblemBlueprint[] = [
  {
    id: 'm5-campaign-roas-attribution',
    title: 'Promo Campaign ROAS & Attributed Revenue',
    difficulty: 'Medium',
    concepts: ['LEFT JOIN', 'Date Range Join', 'ROAS'],
    stakeholder: 'Performance Marketing',
    scenario:
      'Marketing wants to evaluate Return on Ad Spend (ROAS = attributed revenue / spend) for every promo-code campaign in `marketing_campaigns`. Match completed orders whose `discount_code` equals `promo_code` AND whose `order_date` falls inside `[start_date, end_date]`.',
    requirements: [
      'Filter `marketing_campaigns mc` to `mc.promo_code IS NOT NULL`.',
      '`LEFT JOIN orders o ON o.discount_code = mc.promo_code AND o.order_date BETWEEN mc.start_date AND mc.end_date AND o.status = \'completed\'`.',
      'Return `campaign_name`, `promo_code`, `spend_usd`, `attributed_orders` (`COUNT(o.order_id)`), `attributed_revenue` (`ROUND(COALESCE(SUM(o.total_amount), 0), 2)`), and `roas` (`ROUND(COALESCE(SUM(o.total_amount), 0) / mc.spend_usd, 2)`).',
      'Order by `roas DESC`, `campaign_name ASC`.',
    ],
    expectedColumns: [
      { name: 'campaign_name', type: 'TEXT', description: 'Campaign name' },
      { name: 'promo_code', type: 'TEXT', description: 'Campaign promo code' },
      { name: 'spend_usd', type: 'REAL', description: 'Campaign spend' },
      { name: 'attributed_orders', type: 'INTEGER', description: 'Matched completed orders' },
      { name: 'attributed_revenue', type: 'REAL', description: 'Attributed revenue (USD)' },
      { name: 'roas', type: 'REAL', description: 'Revenue / Spend ratio (2 decimals)' },
    ],
    starterSql: `SELECT
  mc.campaign_name,
  mc.promo_code,
  mc.spend_usd,
  COUNT(o.order_id) AS attributed_orders,
  ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS attributed_revenue,
  ROUND(COALESCE(SUM(o.total_amount), 0) / mc.spend_usd, 2) AS roas
FROM marketing_campaigns mc
LEFT JOIN orders o
  ON o.discount_code = mc.promo_code
  AND o.order_date BETWEEN mc.start_date AND mc.end_date
  AND o.status = 'completed'
WHERE ...`,
    hints: [
      'Put the date range and `o.status = \'completed\'` inside the `LEFT JOIN ... ON` clause so zero-conversion campaigns (`WINTER5`) still appear!',
      'Filter `WHERE mc.promo_code IS NOT NULL` and group by `mc.campaign_id, mc.campaign_name, mc.promo_code, mc.spend_usd`.',
    ],
    solutionSql: `SELECT
  mc.campaign_name,
  mc.promo_code,
  mc.spend_usd,
  COUNT(o.order_id) AS attributed_orders,
  ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS attributed_revenue,
  ROUND(COALESCE(SUM(o.total_amount), 0) / mc.spend_usd, 2) AS roas
FROM marketing_campaigns mc
LEFT JOIN orders o
  ON o.discount_code = mc.promo_code
  AND o.order_date BETWEEN mc.start_date AND mc.end_date
  AND o.status = 'completed'
WHERE mc.promo_code IS NOT NULL
GROUP BY mc.campaign_id, mc.campaign_name, mc.promo_code, mc.spend_usd
ORDER BY roas DESC, mc.campaign_name ASC;`,
    explanation:
      'Joining on both `promo_code` and `[start_date, end_date]` properly credits `SPRING20` orders to Spring 2025 vs Spring 2026 without cross-contaminating flights.',
    orderMatters: true,
  },
  {
    id: 'm6-support-sla-resolution-hours',
    title: 'Support SLA Resolution Time (Hours) by Category',
    difficulty: 'Medium',
    concepts: ['julianday', 'Conditional Aggregation', 'AVG'],
    stakeholder: 'Support Operations',
    scenario:
      'Support Operations tracks ticket resolution speed across categories. For each `category`, report total tickets, still-open tickets (`resolved_at IS NULL`), and the average resolution time in hours for resolved tickets.',
    requirements: [
      'Group `support_tickets` by `category`.',
      'Count `open_tickets` using `SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END)`.',
      'Calculate `avg_resolution_hours` as `ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24.0 END), 2)`.',
      'Return `category`, `total_tickets`, `open_tickets`, and `avg_resolution_hours`, ordered by `avg_resolution_hours DESC, category ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'total_tickets', type: 'INTEGER', description: 'Total tickets' },
      { name: 'open_tickets', type: 'INTEGER', description: 'Unresolved tickets' },
      { name: 'avg_resolution_hours', type: 'REAL', description: 'Average resolution hours (2 decimals)' },
    ],
    starterSql: `SELECT
  category,
  COUNT(*) AS total_tickets,
  SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS open_tickets,
  ROUND(
    AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24.0 END),
    2
  ) AS avg_resolution_hours
FROM support_tickets
GROUP BY category
ORDER BY avg_resolution_hours DESC, category ASC;`,
    hints: [
      '`(julianday(resolved_at) - julianday(created_at)) * 24.0` converts fractional days into hours.',
      'Wrapping `CASE WHEN resolved_at IS NOT NULL THEN ... END` inside `AVG()` leaves open tickets as `NULL` so they do not skew the average.',
    ],
    solutionSql: `SELECT
  category,
  COUNT(*) AS total_tickets,
  SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS open_tickets,
  ROUND(
    AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24.0 END),
    2
  ) AS avg_resolution_hours
FROM support_tickets
GROUP BY category
ORDER BY avg_resolution_hours DESC, category ASC;`,
    explanation:
      '`julianday()` handles datetime strings cleanly in SQLite, while conditional `AVG` keeps unresolved tickets excluded from elapsed SLA.',
    orderMatters: true,
  },
  {
    id: 'm7-web-conversion-by-utm',
    title: 'Session-to-Purchase Conversion Rate by UTM Source',
    difficulty: 'Medium',
    concepts: ['COUNT DISTINCT', 'CASE WHEN', 'COALESCE'],
    stakeholder: 'Growth Marketing',
    scenario:
      'Growth wants to measure session conversion rate (`purchase` sessions / total sessions) across each `utm_source` (replacing NULLs with `\'direct\'`).',
    requirements: [
      'Normalize `utm_source` with `COALESCE(utm_source, \'direct\') AS source`.',
      'Count `total_sessions` (`COUNT(DISTINCT session_id)`) and `converted_sessions` (`COUNT(DISTINCT CASE WHEN event_name = \'purchase\' THEN session_id END)`).',
      'Compute `conversion_rate_pct` as `ROUND(100.0 * converted_sessions / total_sessions, 2)`.',
      'Order by `conversion_rate_pct DESC`, `total_sessions DESC`, `source ASC`.',
    ],
    expectedColumns: [
      { name: 'source', type: 'TEXT', description: 'utm_source or direct' },
      { name: 'total_sessions', type: 'INTEGER', description: 'Distinct sessions' },
      { name: 'converted_sessions', type: 'INTEGER', description: 'Sessions with a purchase event' },
      { name: 'conversion_rate_pct', type: 'REAL', description: 'Session conversion % (2 decimals)' },
    ],
    starterSql: `SELECT
  COALESCE(utm_source, 'direct') AS source,
  COUNT(DISTINCT session_id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) AS converted_sessions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) / COUNT(DISTINCT session_id),
    2
  ) AS conversion_rate_pct
FROM web_events
GROUP BY COALESCE(utm_source, 'direct')
ORDER BY conversion_rate_pct DESC, total_sessions DESC, source ASC;`,
    hints: [
      '`COUNT(DISTINCT CASE WHEN ... THEN session_id END)` ignores non-matching rows (which return `NULL`) and counts unique converting sessions.',
      'Multiply by `100.0` for decimal percentages.',
    ],
    solutionSql: `SELECT
  COALESCE(utm_source, 'direct') AS source,
  COUNT(DISTINCT session_id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) AS converted_sessions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) / COUNT(DISTINCT session_id),
    2
  ) AS conversion_rate_pct
FROM web_events
GROUP BY COALESCE(utm_source, 'direct')
ORDER BY conversion_rate_pct DESC, total_sessions DESC, source ASC;`,
    explanation:
      '`COUNT(DISTINCT CASE WHEN ... THEN id END)` is a staple product-analytics idiom for funnel conversion rates at session grain.',
    orderMatters: true,
  },
  {
    id: 'm8-subscription-churn-by-tier',
    title: 'Subscription Churn Rate & Active MRR by Plan Tier',
    difficulty: 'Medium',
    concepts: ['Conditional Aggregation', 'CASE WHEN', 'GROUP BY'],
    stakeholder: 'SaaS Revenue Ops',
    scenario:
      'Compare subscription health across `starter`, `pro`, and `enterprise`: show total historical subscriptions, active count, cancelled count, cancellation rate %, and current active MRR.',
    requirements: [
      'Group `subscriptions` by `plan_tier`.',
      'Use conditional `SUM(CASE WHEN ...)` for `active_subs`, `cancelled_subs`, and `active_mrr`.',
      'Compute `churn_rate_pct` as `ROUND(100.0 * cancelled_subs / total_subs, 2)`.',
      'Order by `churn_rate_pct DESC`, `plan_tier ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'starter, pro, or enterprise' },
      { name: 'total_subs', type: 'INTEGER', description: 'Total subscription records' },
      { name: 'active_subs', type: 'INTEGER', description: 'Currently active' },
      { name: 'cancelled_subs', type: 'INTEGER', description: 'Cancelled subscriptions' },
      { name: 'active_mrr', type: 'REAL', description: 'Sum of MRR where active' },
      { name: 'churn_rate_pct', type: 'REAL', description: 'Cancelled / Total % (2 decimals)' },
    ],
    starterSql: `SELECT
  plan_tier,
  COUNT(*) AS total_subs,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_subs,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_subs,
  ROUND(SUM(CASE WHEN status = 'active' THEN mrr_amount ELSE 0 END), 2) AS active_mrr,
  ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS churn_rate_pct
FROM subscriptions
GROUP BY plan_tier
ORDER BY churn_rate_pct DESC, plan_tier ASC;`,
    hints: [
      'Conditional `SUM(CASE WHEN status = \'active\' THEN mrr_amount ELSE 0 END)` computes active MRR alongside total churn metrics.',
      'Multiply numerator by `100.0` before dividing by `COUNT(*)`.',
    ],
    solutionSql: `SELECT
  plan_tier,
  COUNT(*) AS total_subs,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_subs,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_subs,
  ROUND(SUM(CASE WHEN status = 'active' THEN mrr_amount ELSE 0 END), 2) AS active_mrr,
  ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS churn_rate_pct
FROM subscriptions
GROUP BY plan_tier
ORDER BY churn_rate_pct DESC, plan_tier ASC;`,
    explanation:
      'One conditional aggregation query produces a complete SaaS retention scorecard per plan tier.',
    orderMatters: true,
  },
  {
    id: 'm9-basket-size-penetration',
    title: 'Multi-Product Basket Penetration & Avg Items per Order',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Grain Alignment', 'CASE WHEN'],
    stakeholder: 'Merchandising Team',
    scenario:
      'Merchandising wants to know how often customers buy multiple distinct products or multiple units in a single completed order. Compute average line items per order, average total units per order, and % of orders containing 2+ distinct products.',
    requirements: [
      'In a CTE (`order_baskets`), join completed `orders o` to `order_items oi` and group by `o.order_id` to get `distinct_skus` (`COUNT(DISTINCT oi.product_id)`) and `total_units` (`SUM(oi.quantity)`).',
      'In the outer query, return `completed_orders` (`COUNT(*)`), `avg_distinct_skus`, `avg_units_per_order`, and `multi_sku_order_pct` (rounded to 2 decimals).',
    ],
    expectedColumns: [
      { name: 'completed_orders', type: 'INTEGER', description: 'Completed orders' },
      { name: 'avg_distinct_skus', type: 'REAL', description: 'Avg distinct products per order' },
      { name: 'avg_units_per_order', type: 'REAL', description: 'Avg units per order' },
      { name: 'multi_sku_order_pct', type: 'REAL', description: '% of orders with >= 2 distinct products' },
    ],
    starterSql: `WITH order_baskets AS (
  SELECT
    o.order_id,
    COUNT(DISTINCT oi.product_id) AS distinct_skus,
    SUM(oi.quantity) AS total_units
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_id
)
SELECT ...`,
    hints: [
      'Aggregating to `order_id` grain inside the CTE first prevents multi-item orders from skewing order-level averages.',
      'Use `ROUND(100.0 * SUM(CASE WHEN distinct_skus >= 2 THEN 1 ELSE 0 END) / COUNT(*), 2)`.',
    ],
    solutionSql: `WITH order_baskets AS (
  SELECT
    o.order_id,
    COUNT(DISTINCT oi.product_id) AS distinct_skus,
    SUM(oi.quantity) AS total_units
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_id
)
SELECT
  COUNT(*) AS completed_orders,
  ROUND(AVG(distinct_skus), 2) AS avg_distinct_skus,
  ROUND(AVG(total_units), 2) AS avg_units_per_order,
  ROUND(
    100.0 * SUM(CASE WHEN distinct_skus >= 2 THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS multi_sku_order_pct
FROM order_baskets;`,
    explanation:
      'Using a CTE to collapse `order_items` to the `order_id` grain is essential before taking order-level averages and basket percentages.',
    orderMatters: false,
  },
  {
    id: 'm10-market-basket-product-pairs',
    title: 'Frequently Bought Together Product Pairs (Market Basket)',
    difficulty: 'Medium',
    concepts: ['SELF JOIN', 'INNER JOIN', 'GROUP BY'],
    stakeholder: 'Recommendation Engine',
    scenario:
      'The Product team wants to build a "Frequently Bought Together" cross-sell widget. Find every pair of distinct products purchased together in the same completed order at least 2 times.',
    requirements: [
      'Self-join `order_items a` and `order_items b` on `a.order_id = b.order_id AND a.product_id < b.product_id` (the `<` avoids self-pairs and duplicate reverse pairs!).',
      'Join `orders o` (`o.status = \'completed\'`) and `products p1` / `products p2` for names.',
      'Group by `p1.product_name, p2.product_name` and keep pairs with `HAVING COUNT(DISTINCT a.order_id) >= 2`.',
      'Return `product_a`, `product_b`, and `times_bought_together`, ordered by `times_bought_together DESC, product_a ASC, product_b ASC`.',
    ],
    expectedColumns: [
      { name: 'product_a', type: 'TEXT', description: 'First product in pair' },
      { name: 'product_b', type: 'TEXT', description: 'Second product in pair' },
      { name: 'times_bought_together', type: 'INTEGER', description: 'Co-occurrence order count (>= 2)' },
    ],
    starterSql: `SELECT
  p1.product_name AS product_a,
  p2.product_name AS product_b,
  COUNT(DISTINCT a.order_id) AS times_bought_together
FROM order_items a
INNER JOIN order_items b
  ON a.order_id = b.order_id
  AND a.product_id < b.product_id
INNER JOIN orders o ON a.order_id = o.order_id
INNER JOIN products p1 ON a.product_id = p1.product_id
INNER JOIN products p2 ON b.product_id = p2.product_id
WHERE o.status = 'completed'
GROUP BY p1.product_name, p2.product_name
HAVING ...`,
    hints: [
      '`a.product_id < b.product_id` guarantees `(BI Dashboard Pro, Cloud Warehouse 1TB)` appears once instead of twice.',
      'Filter `HAVING COUNT(DISTINCT a.order_id) >= 2`.',
    ],
    solutionSql: `SELECT
  p1.product_name AS product_a,
  p2.product_name AS product_b,
  COUNT(DISTINCT a.order_id) AS times_bought_together
FROM order_items a
INNER JOIN order_items b
  ON a.order_id = b.order_id
  AND a.product_id < b.product_id
INNER JOIN orders o
  ON a.order_id = o.order_id
INNER JOIN products p1
  ON a.product_id = p1.product_id
INNER JOIN products p2
  ON b.product_id = p2.product_id
WHERE o.status = 'completed'
GROUP BY p1.product_name, p2.product_name
HAVING COUNT(DISTINCT a.order_id) >= 2
ORDER BY times_bought_together DESC, product_a ASC, product_b ASC;`,
    explanation:
      'An inequality self-join (`a.product_id < b.product_id`) is the classic SQL pattern for market-basket co-occurrence without mirrored duplicates.',
    orderMatters: true,
  },
  {
    id: 'm11-time-to-first-order-by-channel',
    title: 'Days From Signup to First Completed Order by Channel',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'julianday', 'COALESCE'],
    stakeholder: 'Lifecycle Marketing',
    scenario:
      'Lifecycle wants to measure onboarding speed: for each `acquisition_channel` (replace NULL with `\'unattributed\'`), compute the average number of days between a user’s `signup_date` and their first completed `order_date`.',
    requirements: [
      'In a CTE, find each paying user’s `first_order_date` (`MIN(o.order_date)`) across `status = \'completed\'` orders, joined to `users u`.',
      'Compute `days_to_first_order` per user as `julianday(first_order_date) - julianday(signup_date)`.',
      'Aggregate by `COALESCE(acquisition_channel, \'unattributed\') AS channel`, returning `channel`, `converted_users`, and `avg_days_to_convert` (rounded to 2 decimals).',
      'Order by `avg_days_to_convert ASC`, `channel ASC`.',
    ],
    expectedColumns: [
      { name: 'channel', type: 'TEXT', description: 'Acquisition channel or unattributed' },
      { name: 'converted_users', type: 'INTEGER', description: 'Buyers with >= 1 completed order' },
      { name: 'avg_days_to_convert', type: 'REAL', description: 'Average days from signup to first order' },
    ],
    starterSql: `WITH first_orders AS (
  SELECT
    u.user_id,
    COALESCE(u.acquisition_channel, 'unattributed') AS channel,
    u.signup_date,
    MIN(o.order_date) AS first_order_date
  FROM users u
  INNER JOIN orders o ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, COALESCE(u.acquisition_channel, 'unattributed'), u.signup_date
)
SELECT ...`,
    hints: [
      'Subtract Julian dates in the outer query: `AVG(julianday(first_order_date) - julianday(signup_date))`.',
      'Group by `channel` and sort fastest-converting channel first.',
    ],
    solutionSql: `WITH first_orders AS (
  SELECT
    u.user_id,
    COALESCE(u.acquisition_channel, 'unattributed') AS channel,
    u.signup_date,
    MIN(o.order_date) AS first_order_date
  FROM users u
  INNER JOIN orders o
    ON u.user_id = o.user_id
  WHERE o.status = 'completed'
  GROUP BY u.user_id, COALESCE(u.acquisition_channel, 'unattributed'), u.signup_date
)
SELECT
  channel,
  COUNT(*) AS converted_users,
  ROUND(AVG(julianday(first_order_date) - julianday(signup_date)), 2) AS avg_days_to_convert
FROM first_orders
GROUP BY channel
ORDER BY avg_days_to_convert ASC, channel ASC;`,
    explanation:
      'Computing per-user conversion latency in a CTE before averaging by channel ensures repeat buyers are weighted once.',
    orderMatters: true,
  },
  {
    id: 'm12-paid-buyers-who-filed-refund-tickets',
    title: 'Active Buyers Who Also Requested Refunds',
    difficulty: 'Medium',
    concepts: ['INTERSECT', 'Set Operations', 'INNER JOIN'],
    stakeholder: 'Retention Risk',
    scenario:
      'Identify customers who have BOTH at least one `completed` order AND at least one `refund_request` support ticket, using set intersection (`INTERSECT`) or dual CTEs, and return their `user_id`, `full_name`, and `plan_tier`.',
    requirements: [
      'Find `user_id`s that appear in `orders WHERE status = \'completed\'` AND in `support_tickets WHERE category = \'refund_request\'`.',
      'Join back to `users` to return `user_id`, `full_name`, `country`, and `plan_tier`.',
      'Order by `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'plan_tier', type: 'TEXT', description: 'Plan tier' },
    ],
    starterSql: `WITH overlapping_users AS (
  SELECT user_id FROM orders WHERE status = 'completed'
  INTERSECT
  SELECT user_id FROM support_tickets WHERE category = 'refund_request'
)
SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
INNER JOIN overlapping_users ou ON u.user_id = ou.user_id
ORDER BY u.user_id ASC;`,
    hints: [
      '`INTERSECT` automatically deduplicates matching `user_id`s from both queries.',
      'Join the resulting `user_id` CTE to `users` to fetch names and tiers.',
    ],
    solutionSql: `WITH overlapping_users AS (
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
  INTERSECT
  SELECT user_id
  FROM support_tickets
  WHERE category = 'refund_request'
)
SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
INNER JOIN overlapping_users ou
  ON u.user_id = ou.user_id
ORDER BY u.user_id ASC;`,
    explanation:
      'Set `INTERSECT` cleanly expresses behavioral overlap across independent fact tables without fan-out.',
    orderMatters: true,
  },
  {
    id: 'm13-product-rating-vs-refund-rate',
    title: 'Product Rating vs. Order Refund Rate (Fan-Out Safe)',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Fan-Out Prevention', 'LEFT JOIN'],
    stakeholder: 'Product Quality',
    scenario:
      'Product Quality wants to compare each product’s average star rating (`product_reviews`) against the refund rate of orders containing that product. Avoid many-to-many join fan-out by aggregating sales and reviews in separate CTEs!',
    requirements: [
      'CTE 1 (`sales_stats`): join `order_items` and `orders` grouped by `product_id` to compute `total_orders` (`COUNT(DISTINCT oi.order_id)`) and `refunded_orders` (`COUNT(DISTINCT CASE WHEN o.status = \'refunded\' THEN oi.order_id END)`).',
      'CTE 2 (`review_stats`): group `product_reviews` by `product_id` to compute `review_count` and `avg_rating` (`ROUND(AVG(rating), 2)`).',
      'Join `products p` with both CTEs, returning `product_name`, `category`, `avg_rating`, and `refund_rate_pct` (`ROUND(100.0 * refunded_orders / total_orders, 2)`), filtering to products with at least 1 review.',
      'Order by `refund_rate_pct DESC`, `avg_rating ASC`, `product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Category' },
      { name: 'avg_rating', type: 'REAL', description: 'Average star rating' },
      { name: 'refund_rate_pct', type: 'REAL', description: '% of orders containing product that were refunded' },
    ],
    starterSql: `WITH sales_stats AS (
  SELECT
    oi.product_id,
    COUNT(DISTINCT oi.order_id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN oi.order_id END) AS refunded_orders
  FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.order_id
  GROUP BY oi.product_id
),
review_stats AS (
  SELECT
    product_id,
    ROUND(AVG(rating), 2) AS avg_rating
  FROM product_reviews
  GROUP BY product_id
)
SELECT ...`,
    hints: [
      'Never join `order_items` directly to `product_reviews` on `product_id` before aggregating — it multiplies rows!',
      'Use `INNER JOIN review_stats` (to keep reviewed products) and `INNER JOIN sales_stats` on `p.product_id`.',
    ],
    solutionSql: `WITH sales_stats AS (
  SELECT
    oi.product_id,
    COUNT(DISTINCT oi.order_id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN oi.order_id END) AS refunded_orders
  FROM order_items oi
  INNER JOIN orders o
    ON oi.order_id = o.order_id
  GROUP BY oi.product_id
),
review_stats AS (
  SELECT
    product_id,
    ROUND(AVG(rating), 2) AS avg_rating
  FROM product_reviews
  GROUP BY product_id
)
SELECT
  p.product_name,
  p.category,
  rs.avg_rating,
  ROUND(100.0 * ss.refunded_orders / ss.total_orders, 2) AS refund_rate_pct
FROM products p
INNER JOIN review_stats rs
  ON p.product_id = rs.product_id
INNER JOIN sales_stats ss
  ON p.product_id = ss.product_id
ORDER BY refund_rate_pct DESC, rs.avg_rating ASC, p.product_name ASC;`,
    explanation:
      'Pre-aggregating independent fact tables into separate 1-row-per-entity CTEs before joining prevents SQL join fan-out bugs.',
    orderMatters: true,
  },
  {
    id: 'm14-active-mrr-snapshot-date',
    title: 'Point-in-Time Active MRR Snapshot (July 1, 2025)',
    difficulty: 'Medium',
    concepts: ['Point-in-Time', 'IS NULL', 'BETWEEN'],
    stakeholder: 'Board Reporting',
    scenario:
      'For the Q3 2025 Board Deck, reconstruct exact Active MRR as of `2025-07-01` by plan tier. A subscription was active on `2025-07-01` if `start_date <= \'2025-07-01\'`, `status != \'trialing\'`, and `(end_date IS NULL OR end_date > \'2025-07-01\')`.',
    requirements: [
      'Filter `subscriptions` to rows live on `2025-07-01` using `start_date <= \'2025-07-01\'`, `status != \'trialing\'`, and `(end_date IS NULL OR end_date > \'2025-07-01\')`.',
      'Group by `plan_tier`.',
      'Return `plan_tier`, `active_accounts` (`COUNT(*)`), and `snapshot_mrr` (`ROUND(SUM(mrr_amount), 2)`).',
      'Order by `snapshot_mrr DESC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Subscription tier' },
      { name: 'active_accounts', type: 'INTEGER', description: 'Subscriptions active on 2025-07-01' },
      { name: 'snapshot_mrr', type: 'REAL', description: 'MRR on 2025-07-01 (USD)' },
    ],
    starterSql: `SELECT
  plan_tier,
  COUNT(*) AS active_accounts,
  ROUND(SUM(mrr_amount), 2) AS snapshot_mrr
FROM subscriptions
WHERE start_date <= '2025-07-01'
  AND status != 'trialing'
  AND (end_date IS NULL OR end_date > '2025-07-01')
GROUP BY plan_tier
ORDER BY snapshot_mrr DESC;`,
    hints: [
      'Don’t filter `status = \'active\'`! A subscription that cancelled later in 2025 or 2026 was still active on `2025-07-01`.',
      'Wrap `(end_date IS NULL OR end_date > \'2025-07-01\')` in parentheses.',
    ],
    solutionSql: `SELECT
  plan_tier,
  COUNT(*) AS active_accounts,
  ROUND(SUM(mrr_amount), 2) AS snapshot_mrr
FROM subscriptions
WHERE start_date <= '2025-07-01'
  AND status != 'trialing'
  AND (end_date IS NULL OR end_date > '2025-07-01')
GROUP BY plan_tier
ORDER BY snapshot_mrr DESC;`,
    explanation:
      'Historical point-in-time queries rely on `[start_date, end_date)` interval logic rather than the current `status` column.',
    orderMatters: true,
  },
  {
    id: 'm15-weekday-vs-weekend-aov',
    title: 'Weekday vs. Weekend Revenue & Average Order Value',
    difficulty: 'Medium',
    concepts: ['strftime', 'CASE WHEN', 'GROUP BY'],
    stakeholder: 'E-Commerce Ops',
    scenario:
      'Compare completed order performance on Weekdays (Mon–Fri) versus Weekends (Sat–Sun): report order count, total revenue, and average order value.',
    requirements: [
      'Filter `orders` to `status = \'completed\'`.',
      'Classify `day_type` using `CASE WHEN strftime(\'%w\', order_date) IN (\'0\', \'6\') THEN \'Weekend\' ELSE \'Weekday\' END`.',
      'Return `day_type`, `order_count`, `total_revenue`, and `avg_order_value` (rounded to 2 decimals).',
      'Order by `total_revenue DESC`.',
    ],
    expectedColumns: [
      { name: 'day_type', type: 'TEXT', description: 'Weekday or Weekend' },
      { name: 'order_count', type: 'INTEGER', description: 'Completed orders' },
      { name: 'total_revenue', type: 'REAL', description: 'Total revenue (USD)' },
      { name: 'avg_order_value', type: 'REAL', description: 'Average order value (USD)' },
    ],
    starterSql: `SELECT
  CASE
    WHEN strftime('%w', order_date) IN ('0', '6') THEN 'Weekend'
    ELSE 'Weekday'
  END AS day_type,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_revenue,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE ...`,
    hints: [
      '`strftime(\'%w\', order_date)` returns `\'0\'` for Sunday and `\'6\'` for Saturday.',
      'Group by `day_type` and filter `status = \'completed\'`.',
    ],
    solutionSql: `SELECT
  CASE
    WHEN strftime('%w', order_date) IN ('0', '6') THEN 'Weekend'
    ELSE 'Weekday'
  END AS day_type,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_revenue,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY day_type
ORDER BY total_revenue DESC;`,
    explanation:
      'Grouping by derived `strftime(\'%w\', ...)` buckets reveals behavioral differences between B2B weekday and weekend buyers.',
    orderMatters: true,
  },
  {
    id: 'm16-latest-subscription-per-user',
    title: 'Latest Subscription State per Paying User',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'PARTITION BY', 'INNER JOIN'],
    stakeholder: 'Billing Ops',
    scenario:
      'Because users can have multiple historical subscription rows in `subscriptions`, Billing Ops needs a deduplicated table showing only each user’s most recent subscription (`start_date DESC, sub_id DESC`), joined with `users`.',
    requirements: [
      'Rank each user’s subscriptions using `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start_date DESC, sub_id DESC) AS rn`.',
      'Filter `rn = 1` and join to `users u` on `user_id`.',
      'Return `user_id`, `full_name`, `latest_tier` (`s.plan_tier`), `latest_status` (`s.status`), and `mrr_amount`.',
      'Order by `mrr_amount DESC`, `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'latest_tier', type: 'TEXT', description: 'Latest subscription tier' },
      { name: 'latest_status', type: 'TEXT', description: 'Latest subscription status' },
      { name: 'mrr_amount', type: 'REAL', description: 'Latest MRR (USD)' },
    ],
    starterSql: `WITH ranked_subs AS (
  SELECT
    sub_id,
    user_id,
    plan_tier,
    status,
    mrr_amount,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start_date DESC, sub_id DESC) AS rn
  FROM subscriptions
)
SELECT ...`,
    hints: [
      'Order by `start_date DESC, sub_id DESC` inside `ROW_NUMBER()` so the newest contract is `rn = 1`.',
      'Join `ranked_subs` to `users` and filter `WHERE rs.rn = 1`.',
    ],
    solutionSql: `WITH ranked_subs AS (
  SELECT
    sub_id,
    user_id,
    plan_tier,
    status,
    mrr_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY start_date DESC, sub_id DESC
    ) AS rn
  FROM subscriptions
)
SELECT
  u.user_id,
  u.full_name,
  rs.plan_tier AS latest_tier,
  rs.status AS latest_status,
  rs.mrr_amount
FROM ranked_subs rs
INNER JOIN users u
  ON rs.user_id = u.user_id
WHERE rs.rn = 1
ORDER BY rs.mrr_amount DESC, u.user_id ASC;`,
    explanation:
      'Using `ROW_NUMBER()` on SCD-like subscription history extracts the current/latest snapshot per customer.',
    orderMatters: true,
  },
  {
    id: 'm17-unconverted-pricing-viewers',
    title: 'High-Intent Pricing-Page Viewers Who Never Purchased',
    difficulty: 'Medium',
    concepts: ['EXISTS', 'NOT EXISTS', 'Distinct'],
    stakeholder: 'Sales Development',
    scenario:
      'Sales Development wants a target list of logged-in users who triggered a `pricing_view` event in `web_events` but have zero `completed` orders in `orders`.',
    requirements: [
      'Query `users u` where `EXISTS` a `pricing_view` row in `web_events` for `u.user_id`.',
      'Ensure `NOT EXISTS` any `completed` order in `orders` for `u.user_id`.',
      'Return `user_id`, `full_name`, `email`, `country`, and `plan_tier`, ordered by `u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'email', type: 'TEXT', description: 'Customer email' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'plan_tier', type: 'TEXT', description: 'Current tier' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.country,
  u.plan_tier
FROM users u
WHERE EXISTS (
  SELECT 1 FROM web_events we WHERE we.user_id = u.user_id AND we.event_name = 'pricing_view'
)
  AND NOT EXISTS (
    ...
  )
ORDER BY u.user_id ASC;`,
    hints: [
      'Pair `EXISTS (... pricing_view ...)` with `NOT EXISTS (... status = \'completed\' ...)`.',
      'Using `EXISTS`/`NOT EXISTS` avoids duplicate user rows if someone viewed pricing multiple times.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.country,
  u.plan_tier
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM web_events we
  WHERE we.user_id = u.user_id
    AND we.event_name = 'pricing_view'
)
  AND NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.user_id
      AND o.status = 'completed'
  )
ORDER BY u.user_id ASC;`,
    explanation:
      'Combining positive and negative semi-joins (`EXISTS` + `NOT EXISTS`) builds high-intent SDR lead lists cleanly.',
    orderMatters: true,
  },
  {
    id: 'm18-repeat-vs-onetime-revenue-share',
    title: 'One-Time vs. Repeat Buyer Revenue Share',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'CASE WHEN', 'Window SUM'],
    stakeholder: 'Executive Strategy',
    scenario:
      'How much of our completed revenue comes from Repeat Buyers (`>= 2` completed orders) versus One-Time Buyers (`1` completed order)? Compute buyer count, total revenue, and % share of total revenue for each group.',
    requirements: [
      'CTE 1 (`user_totals`): group completed `orders` by `user_id` to compute `order_cnt` and `user_rev` (`SUM(total_amount)`).',
      'Classify each user as `\'Repeat Buyer\'` (`order_cnt >= 2`) or `\'One-Time Buyer\'`.',
      'Return `buyer_type`, `buyer_count`, `group_revenue` (`ROUND(SUM(user_rev), 2)`), and `revenue_share_pct` (`ROUND(100.0 * SUM(user_rev) / (SELECT SUM(user_rev) FROM user_totals), 2)`).',
      'Order by `group_revenue DESC`.',
    ],
    expectedColumns: [
      { name: 'buyer_type', type: 'TEXT', description: 'Repeat Buyer or One-Time Buyer' },
      { name: 'buyer_count', type: 'INTEGER', description: 'Number of users in group' },
      { name: 'group_revenue', type: 'REAL', description: 'Total completed revenue' },
      { name: 'revenue_share_pct', type: 'REAL', description: '% of all completed revenue' },
    ],
    starterSql: `WITH user_totals AS (
  SELECT
    user_id,
    COUNT(*) AS order_cnt,
    SUM(total_amount) AS user_rev
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT ...`,
    hints: [
      'Group `user_totals` by `CASE WHEN order_cnt >= 2 THEN \'Repeat Buyer\' ELSE \'One-Time Buyer\' END`.',
      'Divide `SUM(user_rev)` by `(SELECT SUM(user_rev) FROM user_totals)` (or `SUM(SUM(user_rev)) OVER ()`) multiplied by `100.0`.',
    ],
    solutionSql: `WITH user_totals AS (
  SELECT
    user_id,
    COUNT(*) AS order_cnt,
    SUM(total_amount) AS user_rev
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT
  CASE WHEN order_cnt >= 2 THEN 'Repeat Buyer' ELSE 'One-Time Buyer' END AS buyer_type,
  COUNT(*) AS buyer_count,
  ROUND(SUM(user_rev), 2) AS group_revenue,
  ROUND(
    100.0 * SUM(user_rev) / (SELECT SUM(user_rev) FROM user_totals),
    2
  ) AS revenue_share_pct
FROM user_totals
GROUP BY buyer_type
ORDER BY group_revenue DESC;`,
    explanation:
      'Classifying customers in a CTE before calculating group shares clearly proves how dependent revenue is on retention.',
    orderMatters: true,
  },
  {
    id: 'm19-device-funnel-dropoff',
    title: 'Multi-Step Checkout Funnel by Device Type',
    difficulty: 'Medium',
    concepts: ['COUNT DISTINCT', 'CASE WHEN', 'Funnel'],
    stakeholder: 'Mobile & Web Team',
    scenario:
      'Build a device-level funnel matrix from `web_events` showing distinct sessions reaching `add_to_cart`, `checkout_start`, and `purchase`, plus the cart-to-purchase completion rate %.',
    requirements: [
      'Group `web_events` by `device_type`.',
      'Count distinct sessions for `cart_sessions` (`add_to_cart`), `checkout_sessions` (`checkout_start`), and `purchase_sessions` (`purchase`).',
      'Compute `cart_to_purchase_pct` as `ROUND(100.0 * purchase_sessions / cart_sessions, 2)` (using `NULLIF(cart_sessions, 0)` for safety).',
      'Order by `purchase_sessions DESC`, `device_type ASC`.',
    ],
    expectedColumns: [
      { name: 'device_type', type: 'TEXT', description: 'desktop, mobile, or tablet' },
      { name: 'cart_sessions', type: 'INTEGER', description: 'Distinct sessions with add_to_cart' },
      { name: 'checkout_sessions', type: 'INTEGER', description: 'Distinct sessions with checkout_start' },
      { name: 'purchase_sessions', type: 'INTEGER', description: 'Distinct sessions with purchase' },
      { name: 'cart_to_purchase_pct', type: 'REAL', description: 'Purchase / Cart % (2 decimals)' },
    ],
    starterSql: `SELECT
  device_type,
  COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN session_id END) AS cart_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'checkout_start' THEN session_id END) AS checkout_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) AS purchase_sessions,
  ...
FROM web_events
GROUP BY device_type
ORDER BY purchase_sessions DESC, device_type ASC;`,
    hints: [
      'Wrap `COUNT(DISTINCT CASE WHEN event_name = \'add_to_cart\' THEN session_id END)` inside `NULLIF(..., 0)` when dividing.',
      'Multiply numerator by `100.0`.',
    ],
    solutionSql: `SELECT
  device_type,
  COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN session_id END) AS cart_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'checkout_start' THEN session_id END) AS checkout_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) AS purchase_sessions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END)
      / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN session_id END), 0),
    2
  ) AS cart_to_purchase_pct
FROM web_events
GROUP BY device_type
ORDER BY purchase_sessions DESC, device_type ASC;`,
    explanation:
      '`NULLIF(..., 0)` prevents division-by-zero errors on segments with zero cart events while keeping the funnel matrix in one pass.',
    orderMatters: true,
  },
  {
    id: 'm20-monthly-new-vs-churned-mrr',
    title: 'Monthly New MRR vs. Churned MRR (UNION ALL)',
    difficulty: 'Medium',
    concepts: ['UNION ALL', 'CTE (WITH)', 'strftime'],
    stakeholder: 'SaaS Finance',
    scenario:
      'SaaS Finance wants a monthly ledger comparing gross New MRR added (`start_date` where `status != \'trialing\'`) against Churned MRR lost (`end_date` where `status = \'cancelled\'`), and Net MRR change per month.',
    requirements: [
      'Use `UNION ALL` in a CTE: emit `+mrr_amount` at `strftime(\'%Y-%m\', start_date)` for non-trialing subscriptions, and `-mrr_amount` at `strftime(\'%Y-%m\', end_date)` for cancelled subscriptions.',
      'Aggregate by `month` (`YYYY-MM`): compute `new_mrr`, `churned_mrr` (positive dollar amount lost), and `net_mrr_change`.',
      'Order by `month ASC`.',
    ],
    expectedColumns: [
      { name: 'month', type: 'TEXT', description: 'Calendar month (YYYY-MM)' },
      { name: 'new_mrr', type: 'REAL', description: 'New subscription MRR started' },
      { name: 'churned_mrr', type: 'REAL', description: 'Cancelled MRR ended (positive number)' },
      { name: 'net_mrr_change', type: 'REAL', description: 'new_mrr - churned_mrr' },
    ],
    starterSql: `WITH mrr_events AS (
  SELECT
    strftime('%Y-%m', start_date) AS month,
    mrr_amount AS new_amt,
    0.0 AS churn_amt
  FROM subscriptions
  WHERE status != 'trialing'
  UNION ALL
  SELECT
    strftime('%Y-%m', end_date) AS month,
    0.0 AS new_amt,
    mrr_amount AS churn_amt
  FROM subscriptions
  WHERE status = 'cancelled'
    AND end_date IS NOT NULL
)
SELECT ...`,
    hints: [
      '`UNION ALL` avoids deduplicating identical MRR amounts across different subscriptions in the same month!',
      'Aggregate `ROUND(SUM(new_amt), 2)` and `ROUND(SUM(churn_amt), 2)` grouped by `month`.',
    ],
    solutionSql: `WITH mrr_events AS (
  SELECT
    strftime('%Y-%m', start_date) AS month,
    mrr_amount AS new_amt,
    0.0 AS churn_amt
  FROM subscriptions
  WHERE status != 'trialing'
  UNION ALL
  SELECT
    strftime('%Y-%m', end_date) AS month,
    0.0 AS new_amt,
    mrr_amount AS churn_amt
  FROM subscriptions
  WHERE status = 'cancelled'
    AND end_date IS NOT NULL
)
SELECT
  month,
  ROUND(SUM(new_amt), 2) AS new_mrr,
  ROUND(SUM(churn_amt), 2) AS churned_mrr,
  ROUND(SUM(new_amt - churn_amt), 2) AS net_mrr_change
FROM mrr_events
GROUP BY month
ORDER BY month ASC;`,
    explanation:
      'Normalizing start and end events via `UNION ALL` into a single ledger stream is the standard way to build SaaS MRR bridges.',
    orderMatters: true,
  },
  {
    id: 'm21-post-order-tickets-within-7d',
    title: 'Orders Triggering Support Tickets Within 7 Days',
    difficulty: 'Medium',
    concepts: ['julianday', 'BETWEEN', 'INNER JOIN'],
    stakeholder: 'Customer Experience',
    scenario:
      'Find every support ticket filed between `0` and `7` days after its linked `order_date` (`0 <= days_after_order <= 7`), showing customer name, order status, ticket category, and exact days elapsed (rounded to 1 decimal).',
    requirements: [
      'Join `support_tickets st`, `orders o`, and `users u`.',
      'Compute `days_after_order` as `ROUND(julianday(st.created_at) - julianday(o.order_date), 1)`.',
      'Filter `julianday(st.created_at) - julianday(o.order_date) BETWEEN 0 AND 7`.',
      'Return `ticket_id`, `order_id`, `full_name`, `order_status` (`o.status`), `category`, and `days_after_order`, ordered by `days_after_order ASC, ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_id', type: 'INTEGER', description: 'Ticket ID' },
      { name: 'order_id', type: 'INTEGER', description: 'Linked order ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'order_status', type: 'TEXT', description: 'Linked order status' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'days_after_order', type: 'REAL', description: 'Days elapsed since order_date' },
    ],
    starterSql: `SELECT
  st.ticket_id,
  o.order_id,
  u.full_name,
  o.status AS order_status,
  st.category,
  ROUND(julianday(st.created_at) - julianday(o.order_date), 1) AS days_after_order
FROM support_tickets st
INNER JOIN orders o ON st.order_id = o.order_id
INNER JOIN users u ON st.user_id = u.user_id
WHERE ...`,
    hints: [
      '`julianday(st.created_at) - julianday(o.order_date)` works seamlessly even though `created_at` has a timestamp and `order_date` is a date.',
      'Check `BETWEEN 0 AND 7` on the unrounded difference.',
    ],
    solutionSql: `SELECT
  st.ticket_id,
  o.order_id,
  u.full_name,
  o.status AS order_status,
  st.category,
  ROUND(julianday(st.created_at) - julianday(o.order_date), 1) AS days_after_order
FROM support_tickets st
INNER JOIN orders o
  ON st.order_id = o.order_id
INNER JOIN users u
  ON st.user_id = u.user_id
WHERE julianday(st.created_at) - julianday(o.order_date) BETWEEN 0 AND 7
ORDER BY days_after_order ASC, st.ticket_id ASC;`,
    explanation:
      'Calculating elapsed days between transactional and support timestamps pinpoints post-purchase friction.',
    orderMatters: true,
  },
  {
    id: 'm22-product-margin-tier-classification',
    title: 'Product Profitability Tier Classification',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'CASE WHEN', 'Margin Math'],
    stakeholder: 'Finance & Merchandising',
    scenario:
      'Classify every product in our catalog based on its lifetime completed gross margin percentage (`margin_pct`): `High Margin (>= 55%)`, `Standard Margin (45%–54.99%)`, or `Low Margin (< 45%)`.',
    requirements: [
      'In a CTE, join `products p`, `order_items oi`, and completed `orders o` to compute `revenue`, `gross_profit`, and `margin_pct` (`100.0 * gross_profit / revenue`) per product.',
      'Label each product with `CASE WHEN margin_pct >= 55 THEN \'High Margin\' WHEN margin_pct >= 45 THEN \'Standard Margin\' ELSE \'Low Margin\' END AS margin_tier`.',
      'Return `product_name`, `category`, `revenue`, `gross_profit`, `margin_pct` (2 decimals), and `margin_tier`, ordered by `margin_pct DESC, product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Category' },
      { name: 'revenue', type: 'REAL', description: 'Completed revenue' },
      { name: 'gross_profit', type: 'REAL', description: 'Completed gross profit' },
      { name: 'margin_pct', type: 'REAL', description: 'Gross margin % (2 decimals)' },
      { name: 'margin_tier', type: 'TEXT', description: 'High, Standard, or Low Margin' },
    ],
    starterSql: `WITH prod_margins AS (
  SELECT
    p.product_name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    SUM((oi.unit_price - p.cost_price) * oi.quantity) AS gross_profit
  FROM products p
  INNER JOIN order_items oi ON p.product_id = oi.product_id
  INNER JOIN orders o ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY p.product_id, p.product_name, p.category
)
SELECT ...`,
    hints: [
      'Compute `100.0 * gross_profit / revenue` inside the outer query (or another CTE) before applying the `CASE WHEN` thresholds.',
      'Round monetary amounts and `margin_pct` to 2 decimal places.',
    ],
    solutionSql: `WITH prod_margins AS (
  SELECT
    p.product_name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    SUM((oi.unit_price - p.cost_price) * oi.quantity) AS gross_profit
  FROM products p
  INNER JOIN order_items oi
    ON p.product_id = oi.product_id
  INNER JOIN orders o
    ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY p.product_id, p.product_name, p.category
)
SELECT
  product_name,
  category,
  ROUND(revenue, 2) AS revenue,
  ROUND(gross_profit, 2) AS gross_profit,
  ROUND(100.0 * gross_profit / revenue, 2) AS margin_pct,
  CASE
    WHEN 100.0 * gross_profit / revenue >= 55 THEN 'High Margin'
    WHEN 100.0 * gross_profit / revenue >= 45 THEN 'Standard Margin'
    ELSE 'Low Margin'
  END AS margin_tier
FROM prod_margins
ORDER BY margin_pct DESC, product_name ASC;`,
    explanation:
      'Evaluating thresholds against unrounded `100.0 * gross_profit / revenue` avoids rounding boundary edge cases.',
    orderMatters: true,
  },
  {
    id: 'm23-orders-with-multiple-tickets',
    title: 'Escalated Orders With >= 2 Support Tickets',
    difficulty: 'Medium',
    concepts: ['GROUP BY', 'HAVING', 'Multi-Table JOIN'],
    stakeholder: 'Support Escalations',
    scenario:
      'Support Escalations wants to investigate orders that generated 2 or more support tickets, showing the customer name, order status, order amount, and ticket count.',
    requirements: [
      'Join `support_tickets st`, `orders o`, and `users u` on `order_id` and `user_id`.',
      'Group by `o.order_id, u.full_name, o.status, o.total_amount`.',
      'Filter with `HAVING COUNT(*) >= 2`.',
      'Return `order_id`, `full_name`, `status`, `total_amount`, and `ticket_count`, ordered by `ticket_count DESC, o.order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Order ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'status', type: 'TEXT', description: 'Order status' },
      { name: 'total_amount', type: 'REAL', description: 'Order total (USD)' },
      { name: 'ticket_count', type: 'INTEGER', description: 'Tickets opened on this order (>= 2)' },
    ],
    starterSql: `SELECT
  o.order_id,
  u.full_name,
  o.status,
  o.total_amount,
  COUNT(*) AS ticket_count
FROM support_tickets st
INNER JOIN orders o ON st.order_id = o.order_id
INNER JOIN users u ON o.user_id = u.user_id
GROUP BY o.order_id, u.full_name, o.status, o.total_amount
HAVING ...`,
    hints: [
      'Use `INNER JOIN orders o ON st.order_id = o.order_id` so non-order tickets (`NULL`) are ignored.',
      'Filter `HAVING COUNT(*) >= 2`.',
    ],
    solutionSql: `SELECT
  o.order_id,
  u.full_name,
  o.status,
  o.total_amount,
  COUNT(*) AS ticket_count
FROM support_tickets st
INNER JOIN orders o
  ON st.order_id = o.order_id
INNER JOIN users u
  ON o.user_id = u.user_id
GROUP BY o.order_id, u.full_name, o.status, o.total_amount
HAVING COUNT(*) >= 2
ORDER BY ticket_count DESC, o.order_id ASC;`,
    explanation:
      'Grouping support tickets by `order_id` with `HAVING COUNT(*) >= 2` highlights messy multi-touch order incidents.',
    orderMatters: true,
  },
  {
    id: 'm24-latest-ticket-per-user',
    title: 'Most Recent Support Ticket per Customer',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'PARTITION BY', 'INNER JOIN'],
    stakeholder: 'Account Management',
    scenario:
      'Before quarterly business reviews, Account Managers want a clean summary showing each ticket-filing customer’s single most recent support ticket, its category, priority, and whether it is resolved (`\'Resolved\'` vs `\'Open\'`).',
    requirements: [
      'Rank tickets per `user_id` using `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, ticket_id DESC) AS rn`.',
      'Keep `rn = 1` and join to `users u`.',
      'Return `user_id`, `full_name`, `ticket_id`, `category`, `priority`, and `ticket_state` (`CASE WHEN resolved_at IS NULL THEN \'Open\' ELSE \'Resolved\' END`).',
      'Order by `created_at DESC, ticket_id DESC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'ticket_id', type: 'INTEGER', description: 'Latest ticket ID' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'priority', type: 'TEXT', description: 'Priority' },
      { name: 'ticket_state', type: 'TEXT', description: 'Open or Resolved' },
    ],
    starterSql: `WITH ranked_tickets AS (
  SELECT
    ticket_id,
    user_id,
    category,
    priority,
    created_at,
    resolved_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, ticket_id DESC) AS rn
  FROM support_tickets
)
SELECT ...`,
    hints: [
      'Keep `created_at` in the CTE so you can sort the outer query by `rt.created_at DESC`.',
      'Derive `ticket_state` using `CASE WHEN rt.resolved_at IS NULL THEN \'Open\' ELSE \'Resolved\' END`.',
    ],
    solutionSql: `WITH ranked_tickets AS (
  SELECT
    ticket_id,
    user_id,
    category,
    priority,
    created_at,
    resolved_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, ticket_id DESC
    ) AS rn
  FROM support_tickets
)
SELECT
  u.user_id,
  u.full_name,
  rt.ticket_id,
  rt.category,
  rt.priority,
  CASE WHEN rt.resolved_at IS NULL THEN 'Open' ELSE 'Resolved' END AS ticket_state
FROM ranked_tickets rt
INNER JOIN users u
  ON rt.user_id = u.user_id
WHERE rt.rn = 1
ORDER BY rt.created_at DESC, rt.ticket_id DESC;`,
    explanation:
      '`ROW_NUMBER()` extracts each customer’s latest support interaction without losing string metadata.',
    orderMatters: true,
  },
  {
    id: 'm25-order-items-reconciliation',
    title: 'Order Header vs. Line-Item Total Reconciliation',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'INNER JOIN', 'Data Quality'],
    stakeholder: 'Financial Controls',
    scenario:
      'Financial Controls wants to verify data integrity between `orders.total_amount` and the sum of `order_items` (`quantity * unit_price`) across every order, grouped by `status` to confirm zero discrepancy.',
    requirements: [
      'In a CTE (`item_totals`), sum `quantity * unit_price` per `order_id`.',
      'Join `orders o` to `item_totals it` and group by `o.status`.',
      'Return `status`, `order_count`, `header_sum` (`ROUND(SUM(o.total_amount), 2)`), `line_item_sum` (`ROUND(SUM(it.items_total), 2)`), and `abs_variance` (`ROUND(ABS(SUM(o.total_amount) - SUM(it.items_total)), 2)`).',
      'Order by `header_sum DESC`.',
    ],
    expectedColumns: [
      { name: 'status', type: 'TEXT', description: 'Order status' },
      { name: 'order_count', type: 'INTEGER', description: 'Orders checked' },
      { name: 'header_sum', type: 'REAL', description: 'Sum of orders.total_amount' },
      { name: 'line_item_sum', type: 'REAL', description: 'Sum of order_items totals' },
      { name: 'abs_variance', type: 'REAL', description: 'Absolute dollar discrepancy' },
    ],
    starterSql: `WITH item_totals AS (
  SELECT
    order_id,
    SUM(quantity * unit_price) AS items_total
  FROM order_items
  GROUP BY order_id
)
SELECT ...`,
    hints: [
      'Pre-aggregating `order_items` per `order_id` prevents duplicating `o.total_amount` on multi-item orders.',
      'Compare `SUM(o.total_amount)` against `SUM(it.items_total)`.',
    ],
    solutionSql: `WITH item_totals AS (
  SELECT
    order_id,
    SUM(quantity * unit_price) AS items_total
  FROM order_items
  GROUP BY order_id
)
SELECT
  o.status,
  COUNT(*) AS order_count,
  ROUND(SUM(o.total_amount), 2) AS header_sum,
  ROUND(SUM(it.items_total), 2) AS line_item_sum,
  ROUND(ABS(SUM(o.total_amount) - SUM(it.items_total)), 2) AS abs_variance
FROM orders o
INNER JOIN item_totals it
  ON o.order_id = it.order_id
GROUP BY o.status
ORDER BY header_sum DESC;`,
    explanation:
      'Collapsing child line items to the parent `order_id` grain before comparing against parent totals is the golden rule of financial reconciliation.',
    orderMatters: true,
  },
  {
    id: 'm26-channel-cac-vs-ltv',
    title: 'Channel Ad Spend vs. Customer Acquisition Cost (CAC)',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'LEFT JOIN', 'Unit Economics'],
    stakeholder: 'Growth Finance',
    scenario:
      'Compare marketing spend per `channel` (`marketing_campaigns`) against acquired paying users (`users` with `>= 1` completed order) to calculate Customer Acquisition Cost (`CAC = total_spend / paying_users`).',
    requirements: [
      'CTE 1 (`channel_spend`): sum `spend_usd` per `channel` from `marketing_campaigns`.',
      'CTE 2 (`channel_buyers`): count distinct `u.user_id` with at least one completed order per `u.acquisition_channel`.',
      'Join `channel_spend cs` to `channel_buyers cb` on `channel`, returning `channel`, `total_spend`, `paying_users`, and `cac_usd` (`ROUND(cs.total_spend / cb.paying_users, 2)`).',
      'Order by `cac_usd ASC`, `channel ASC`.',
    ],
    expectedColumns: [
      { name: 'channel', type: 'TEXT', description: 'Marketing channel' },
      { name: 'total_spend', type: 'REAL', description: 'Campaign ad spend (USD)' },
      { name: 'paying_users', type: 'INTEGER', description: 'Acquired users with completed orders' },
      { name: 'cac_usd', type: 'REAL', description: 'Spend per paying user (USD)' },
    ],
    starterSql: `WITH channel_spend AS (
  SELECT channel, SUM(spend_usd) AS total_spend
  FROM marketing_campaigns
  GROUP BY channel
),
channel_buyers AS (
  SELECT u.acquisition_channel AS channel, COUNT(DISTINCT u.user_id) AS paying_users
  FROM users u
  INNER JOIN orders o ON u.user_id = o.user_id
  WHERE o.status = 'completed'
    AND u.acquisition_channel IS NOT NULL
  GROUP BY u.acquisition_channel
)
SELECT ...`,
    hints: [
      'Aggregate `marketing_campaigns` and `users/orders` in separate CTEs so multiple campaigns per channel don’t multiply user counts.',
      'Use `ROUND(cs.total_spend / cb.paying_users, 2) AS cac_usd`.',
    ],
    solutionSql: `WITH channel_spend AS (
  SELECT
    channel,
    SUM(spend_usd) AS total_spend
  FROM marketing_campaigns
  GROUP BY channel
),
channel_buyers AS (
  SELECT
    u.acquisition_channel AS channel,
    COUNT(DISTINCT u.user_id) AS paying_users
  FROM users u
  INNER JOIN orders o
    ON u.user_id = o.user_id
  WHERE o.status = 'completed'
    AND u.acquisition_channel IS NOT NULL
  GROUP BY u.acquisition_channel
)
SELECT
  cs.channel,
  ROUND(cs.total_spend, 2) AS total_spend,
  cb.paying_users,
  ROUND(cs.total_spend / cb.paying_users, 2) AS cac_usd
FROM channel_spend cs
INNER JOIN channel_buyers cb
  ON cs.channel = cb.channel
ORDER BY cac_usd ASC, cs.channel ASC;`,
    explanation:
      'Separating ad-spend aggregation from buyer-acquisition aggregation gives accurate channel CAC without fan-out.',
    orderMatters: true,
  },
  {
    id: 'm27-churned-subscription-tenure-days',
    title: 'Churned Subscription Tenure (Days) by Plan Tier',
    difficulty: 'Medium',
    concepts: ['julianday', 'WHERE', 'GROUP BY'],
    stakeholder: 'Retention Analytics',
    scenario:
      'For all `cancelled` subscriptions, calculate how long customers stayed subscribed before cancelling: report churned count, minimum tenure days, average tenure days, and maximum tenure days by `plan_tier`.',
    requirements: [
      'Filter `subscriptions` to `status = \'cancelled\'` and `end_date IS NOT NULL`.',
      'Compute tenure per row as `julianday(end_date) - julianday(start_date)`.',
      'Group by `plan_tier`, returning `plan_tier`, `churned_count`, `min_days`, `avg_days` (rounded to 1 decimal), and `max_days`.',
      'Order by `avg_days DESC`, `plan_tier ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Plan tier' },
      { name: 'churned_count', type: 'INTEGER', description: 'Cancelled subscriptions' },
      { name: 'min_days', type: 'INTEGER', description: 'Shortest tenure in days' },
      { name: 'avg_days', type: 'REAL', description: 'Average tenure in days (1 decimal)' },
      { name: 'max_days', type: 'INTEGER', description: 'Longest tenure in days' },
    ],
    starterSql: `SELECT
  plan_tier,
  COUNT(*) AS churned_count,
  CAST(MIN(julianday(end_date) - julianday(start_date)) AS INTEGER) AS min_days,
  ROUND(AVG(julianday(end_date) - julianday(start_date)), 1) AS avg_days,
  CAST(MAX(julianday(end_date) - julianday(start_date)) AS INTEGER) AS max_days
FROM subscriptions
WHERE ...`,
    hints: [
      'Filter `status = \'cancelled\' AND end_date IS NOT NULL`.',
      'Use `CAST(... AS INTEGER)` on `MIN` and `MAX` Julian differences for clean integer days.',
    ],
    solutionSql: `SELECT
  plan_tier,
  COUNT(*) AS churned_count,
  CAST(MIN(julianday(end_date) - julianday(start_date)) AS INTEGER) AS min_days,
  ROUND(AVG(julianday(end_date) - julianday(start_date)), 1) AS avg_days,
  CAST(MAX(julianday(end_date) - julianday(start_date)) AS INTEGER) AS max_days
FROM subscriptions
WHERE status = 'cancelled'
  AND end_date IS NOT NULL
GROUP BY plan_tier
ORDER BY avg_days DESC, plan_tier ASC;`,
    explanation:
      'Measuring tenure before cancellation identifies whether churn happens early (onboarding failure) or late (renewal fatigue).',
    orderMatters: true,
  },
  {
    id: 'm28-top-country-per-category',
    title: 'Leading Country Market for Each Product Category',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'Multi-Table JOIN', 'CTE (WITH)'],
    stakeholder: 'Regional Merchandising',
    scenario:
      'Regional Merchandising wants to know which single `country` generated the highest completed revenue in each product `category`.',
    requirements: [
      'Join `orders`, `order_items`, `products`, and `users` on completed orders to compute `revenue` per `(category, country)`.',
      'Rank countries within each `category` using `ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, country ASC) AS rn`.',
      'Return `category`, `top_country` (`country`), and `revenue` (rounded to 2 decimals) where `rn = 1`.',
      'Order by `category ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'top_country', type: 'TEXT', description: 'Highest-revenue country' },
      { name: 'revenue', type: 'REAL', description: 'Completed category revenue in that country' },
    ],
    starterSql: `WITH cat_country AS (
  SELECT
    p.category,
    u.country,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
  FROM orders o
  INNER JOIN users u ON o.user_id = u.user_id
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, u.country
),
ranked AS (
  ...
)
SELECT ...`,
    hints: [
      'Use `ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, country ASC)` in the second CTE.',
      'Filter `WHERE rn = 1` in the outer query.',
    ],
    solutionSql: `WITH cat_country AS (
  SELECT
    p.category,
    u.country,
    ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
  FROM orders o
  INNER JOIN users u
    ON o.user_id = u.user_id
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, u.country
),
ranked AS (
  SELECT
    category,
    country,
    revenue,
    ROW_NUMBER() OVER (
      PARTITION BY category
      ORDER BY revenue DESC, country ASC
    ) AS rn
  FROM cat_country
)
SELECT
  category,
  country AS top_country,
  revenue
FROM ranked
WHERE rn = 1
ORDER BY category ASC;`,
    explanation:
      'Combining 4-table aggregation with `ROW_NUMBER()` picks the #1 market per product vertical.',
    orderMatters: true,
  },
  {
    id: 'm29-cart-abandonment-sessions',
    title: 'Cart Abandonment Rate & Abandoned Sessions List',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Conditional Aggregation', 'HAVING'],
    stakeholder: 'Checkout Optimization',
    scenario:
      'Find every session in `web_events` that recorded an `add_to_cart` event WITHOUT any `purchase` event in the same session, returning `session_id`, `user_id`, `device_type`, and `reached_checkout` (1 if `checkout_start` occurred, else 0).',
    requirements: [
      'Group `web_events` by `session_id, user_id, device_type`.',
      'Use `HAVING MAX(CASE WHEN event_name = \'add_to_cart\' THEN 1 ELSE 0 END) = 1 AND MAX(CASE WHEN event_name = \'purchase\' THEN 1 ELSE 0 END) = 0`.',
      'Compute `reached_checkout` as `MAX(CASE WHEN event_name = \'checkout_start\' THEN 1 ELSE 0 END)`.',
      'Order by `reached_checkout DESC`, `session_id ASC`.',
    ],
    expectedColumns: [
      { name: 'session_id', type: 'TEXT', description: 'Abandoned session ID' },
      { name: 'user_id', type: 'INTEGER', description: 'User ID (NULL if anonymous)' },
      { name: 'device_type', type: 'TEXT', description: 'Device type' },
      { name: 'reached_checkout', type: 'INTEGER', description: '1 if checkout_start occurred, else 0' },
    ],
    starterSql: `SELECT
  session_id,
  user_id,
  device_type,
  MAX(CASE WHEN event_name = 'checkout_start' THEN 1 ELSE 0 END) AS reached_checkout
FROM web_events
GROUP BY session_id, user_id, device_type
HAVING ...`,
    hints: [
      '`MAX(CASE WHEN event_name = \'add_to_cart\' THEN 1 ELSE 0 END) = 1` tests if an event happened at least once in the session.',
      'Combine with `MAX(CASE WHEN event_name = \'purchase\' THEN 1 ELSE 0 END) = 0` inside `HAVING`.',
    ],
    solutionSql: `SELECT
  session_id,
  user_id,
  device_type,
  MAX(CASE WHEN event_name = 'checkout_start' THEN 1 ELSE 0 END) AS reached_checkout
FROM web_events
GROUP BY session_id, user_id, device_type
HAVING MAX(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) = 1
   AND MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) = 0
ORDER BY reached_checkout DESC, session_id ASC;`,
    explanation:
      '`HAVING MAX(CASE WHEN ...)` is a clean, single-scan pattern for checking event presence and absence inside a session.',
    orderMatters: true,
  },
  {
    id: 'm30-quarterly-revenue-summary',
    title: 'Quarterly Revenue, Orders & Active Buyers (2025–2026)',
    difficulty: 'Medium',
    concepts: ['strftime', 'Date Formatting', 'COUNT DISTINCT'],
    stakeholder: 'CFO Office',
    scenario:
      'Build a quarterly completed revenue summary (`2025-Q1` through `2026-Q1`) showing completed orders, unique buyers, and total revenue.',
    requirements: [
      'Filter `orders` to `status = \'completed\'`.',
      'Derive `quarter` in SQLite as `strftime(\'%Y\', order_date) || \'-Q\' || ((CAST(strftime(\'%m\', order_date) AS INTEGER) + 2) / 3)`.',
      'Return `quarter`, `order_count`, `active_buyers` (`COUNT(DISTINCT user_id)`), and `total_revenue` (`ROUND(SUM(total_amount), 2)`).',
      'Order by `quarter ASC`.',
    ],
    expectedColumns: [
      { name: 'quarter', type: 'TEXT', description: 'Quarter (e.g. 2025-Q1)' },
      { name: 'order_count', type: 'INTEGER', description: 'Completed orders' },
      { name: 'active_buyers', type: 'INTEGER', description: 'Distinct buyers' },
      { name: 'total_revenue', type: 'REAL', description: 'Quarterly revenue (USD)' },
    ],
    starterSql: `SELECT
  strftime('%Y', order_date) || '-Q' || ((CAST(strftime('%m', order_date) AS INTEGER) + 2) / 3) AS quarter,
  COUNT(*) AS order_count,
  COUNT(DISTINCT user_id) AS active_buyers,
  ROUND(SUM(total_amount), 2) AS total_revenue
FROM orders
WHERE ...`,
    hints: [
      'Integer division `(month + 2) / 3` maps months 1–3 → 1, 4–6 → 2, 7–9 → 3, 10–12 → 4.',
      'Group by `quarter` and order chronologically.',
    ],
    solutionSql: `SELECT
  strftime('%Y', order_date) || '-Q' || ((CAST(strftime('%m', order_date) AS INTEGER) + 2) / 3) AS quarter,
  COUNT(*) AS order_count,
  COUNT(DISTINCT user_id) AS active_buyers,
  ROUND(SUM(total_amount), 2) AS total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY quarter
ORDER BY quarter ASC;`,
    explanation:
      'Computing calendar quarters from `strftime(\'%m\', ...)` with integer division works cleanly without a separate date table.',
    orderMatters: true,
  },
  {
    id: 'm31-cross-category-buyers',
    title: 'Multi-Category Power Buyers (>= 3 Categories)',
    difficulty: 'Medium',
    concepts: ['Multi-Table JOIN', 'COUNT DISTINCT', 'HAVING'],
    stakeholder: 'Cross-Sell Strategy',
    scenario:
      'Find customers who have purchased products across at least 3 distinct catalog categories (`Analytics`, `Automation`, `Data Storage`, `Hardware`) in completed orders.',
    requirements: [
      'Join `users u`, `orders o`, `order_items oi`, and `products p` (`o.status = \'completed\'`).',
      'Group by `u.user_id, u.full_name, u.country`.',
      'Keep users with `HAVING COUNT(DISTINCT p.category) >= 3`.',
      'Return `user_id`, `full_name`, `country`, `categories_bought` (`COUNT(DISTINCT p.category)`), and `total_units` (`SUM(oi.quantity)`), ordered by `categories_bought DESC, total_units DESC, u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'categories_bought', type: 'INTEGER', description: 'Distinct categories purchased (>= 3)' },
      { name: 'total_units', type: 'INTEGER', description: 'Total units purchased' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(DISTINCT p.category) AS categories_bought,
  SUM(oi.quantity) AS total_units
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.status = 'completed'
GROUP BY u.user_id, u.full_name, u.country
HAVING ...`,
    hints: [
      'Use `COUNT(DISTINCT p.category) >= 3` inside `HAVING`.',
      'Only count `o.status = \'completed\'` orders.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(DISTINCT p.category) AS categories_bought,
  SUM(oi.quantity) AS total_units
FROM users u
INNER JOIN orders o
  ON u.user_id = o.user_id
INNER JOIN order_items oi
  ON o.order_id = oi.order_id
INNER JOIN products p
  ON oi.product_id = p.product_id
WHERE o.status = 'completed'
GROUP BY u.user_id, u.full_name, u.country
HAVING COUNT(DISTINCT p.category) >= 3
ORDER BY categories_bought DESC, total_units DESC, u.user_id ASC;`,
    explanation:
      'Using `COUNT(DISTINCT p.category)` across a 4-table join identifies multi-product platform adopters.',
    orderMatters: true,
  },
  {
    id: 'm32-review-gap-verified-vs-unverified',
    title: 'Products With Both Verified & Unverified Reviews',
    difficulty: 'Medium',
    concepts: ['Conditional Aggregation', 'HAVING', 'INNER JOIN'],
    stakeholder: 'Trust & Safety',
    scenario:
      'For every product that has received BOTH at least 1 verified review (`verified_purchase = 1`) AND at least 1 unverified review (`verified_purchase = 0`), compare its verified average rating against its unverified average rating.',
    requirements: [
      'Join `product_reviews pr` and `products p` on `product_id`.',
      'Group by `p.product_id, p.product_name`.',
      'Compute `verified_avg` (`ROUND(AVG(CASE WHEN pr.verified_purchase = 1 THEN pr.rating END), 2)`) and `unverified_avg` (`ROUND(AVG(CASE WHEN pr.verified_purchase = 0 THEN pr.rating END), 2)`).',
      'Keep products where both averages are non-NULL (`HAVING COUNT(CASE WHEN pr.verified_purchase = 1 THEN 1 END) > 0 AND COUNT(CASE WHEN pr.verified_purchase = 0 THEN 1 END) > 0`), ordered by `(verified_avg - unverified_avg) DESC, p.product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'verified_avg', type: 'REAL', description: 'Avg rating from verified buyers' },
      { name: 'unverified_avg', type: 'REAL', description: 'Avg rating from unverified reviewers' },
      { name: 'rating_gap', type: 'REAL', description: 'verified_avg minus unverified_avg' },
    ],
    starterSql: `SELECT
  p.product_name,
  ROUND(AVG(CASE WHEN pr.verified_purchase = 1 THEN pr.rating END), 2) AS verified_avg,
  ROUND(AVG(CASE WHEN pr.verified_purchase = 0 THEN pr.rating END), 2) AS unverified_avg,
  ROUND(
    AVG(CASE WHEN pr.verified_purchase = 1 THEN pr.rating END)
    - AVG(CASE WHEN pr.verified_purchase = 0 THEN pr.rating END),
    2
  ) AS rating_gap
FROM product_reviews pr
INNER JOIN products p ON pr.product_id = p.product_id
GROUP BY p.product_id, p.product_name
HAVING ...`,
    hints: [
      'In `HAVING`, check `SUM(CASE WHEN pr.verified_purchase = 1 THEN 1 ELSE 0 END) > 0` and `SUM(CASE WHEN pr.verified_purchase = 0 THEN 1 ELSE 0 END) > 0`.',
      'Sort by `rating_gap DESC, p.product_name ASC`.',
    ],
    solutionSql: `SELECT
  p.product_name,
  ROUND(AVG(CASE WHEN pr.verified_purchase = 1 THEN pr.rating END), 2) AS verified_avg,
  ROUND(AVG(CASE WHEN pr.verified_purchase = 0 THEN pr.rating END), 2) AS unverified_avg,
  ROUND(
    AVG(CASE WHEN pr.verified_purchase = 1 THEN pr.rating END)
    - AVG(CASE WHEN pr.verified_purchase = 0 THEN pr.rating END),
    2
  ) AS rating_gap
FROM product_reviews pr
INNER JOIN products p
  ON pr.product_id = p.product_id
GROUP BY p.product_id, p.product_name
HAVING SUM(CASE WHEN pr.verified_purchase = 1 THEN 1 ELSE 0 END) > 0
   AND SUM(CASE WHEN pr.verified_purchase = 0 THEN 1 ELSE 0 END) > 0
ORDER BY rating_gap DESC, p.product_name ASC;`,
    explanation:
      'Pivoting conditional `AVG(CASE WHEN ...)` lets you spot review-bombing anomalies on specific SKUs.',
    orderMatters: true,
  },
  {
    id: 'm33-discount-aov-lift-by-tier',
    title: 'Promo vs. Full-Price Average Order Value by Tier',
    difficulty: 'Medium',
    concepts: ['Conditional Aggregation', 'INNER JOIN', 'CASE WHEN'],
    stakeholder: 'Pricing & Promotions',
    scenario:
      'Does offering a promo code increase or decrease average order value within each subscription tier? Pivot completed orders by `u.plan_tier` to compare `promo_aov` (`discount_code IS NOT NULL`) against `full_price_aov` (`discount_code IS NULL`).',
    requirements: [
      'Join `orders o` and `users u` on `user_id` (`o.status = \'completed\'`).',
      'Group by `u.plan_tier`.',
      'Compute `promo_aov` and `full_price_aov` using conditional `AVG(CASE WHEN ... THEN o.total_amount END)`, plus `aov_diff` (`ROUND(promo_aov - full_price_aov, 2)`).',
      'Order by `u.plan_tier ASC`.',
    ],
    expectedColumns: [
      { name: 'plan_tier', type: 'TEXT', description: 'Customer plan tier' },
      { name: 'promo_aov', type: 'REAL', description: 'Avg order value with promo code' },
      { name: 'full_price_aov', type: 'REAL', description: 'Avg order value without promo code' },
      { name: 'aov_diff', type: 'REAL', description: 'promo_aov minus full_price_aov' },
    ],
    starterSql: `SELECT
  u.plan_tier,
  ROUND(AVG(CASE WHEN o.discount_code IS NOT NULL THEN o.total_amount END), 2) AS promo_aov,
  ROUND(AVG(CASE WHEN o.discount_code IS NULL THEN o.total_amount END), 2) AS full_price_aov,
  ROUND(
    AVG(CASE WHEN o.discount_code IS NOT NULL THEN o.total_amount END)
    - AVG(CASE WHEN o.discount_code IS NULL THEN o.total_amount END),
    2
  ) AS aov_diff
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
WHERE o.status = 'completed'
GROUP BY u.plan_tier
ORDER BY u.plan_tier ASC;`,
    hints: [
      'Only include `o.status = \'completed\'` orders.',
      'In SQLite, `AVG(CASE WHEN ... END)` omits `ELSE`, so non-matching rows become `NULL` and are ignored by `AVG`.',
    ],
    solutionSql: `SELECT
  u.plan_tier,
  ROUND(AVG(CASE WHEN o.discount_code IS NOT NULL THEN o.total_amount END), 2) AS promo_aov,
  ROUND(AVG(CASE WHEN o.discount_code IS NULL THEN o.total_amount END), 2) AS full_price_aov,
  ROUND(
    AVG(CASE WHEN o.discount_code IS NOT NULL THEN o.total_amount END)
    - AVG(CASE WHEN o.discount_code IS NULL THEN o.total_amount END),
    2
  ) AS aov_diff
FROM orders o
INNER JOIN users u
  ON o.user_id = u.user_id
WHERE o.status = 'completed'
GROUP BY u.plan_tier
ORDER BY u.plan_tier ASC;`,
    explanation:
      'Pivoting two conditional averages side by side exposes whether discounts lift basket size or simply subsidize existing demand.',
    orderMatters: true,
  },
  {
    id: 'm34-open-ticket-aging-as-of-q1-end',
    title: 'Open Ticket Aging Report (As of March 31, 2026)',
    difficulty: 'Medium',
    concepts: ['julianday', 'CASE WHEN', 'IS NULL'],
    stakeholder: 'Support SLA Team',
    scenario:
      'Measure the age in days of every currently unresolved support ticket (`resolved_at IS NULL`) relative to the Q1 close date `\'2026-03-31\'`, and classify each into an aging bucket (`0-14 Days`, `15-30 Days`, `31+ Days`).',
    requirements: [
      'Join `support_tickets st` and `users u` where `st.resolved_at IS NULL`.',
      'Calculate `age_days` as `CAST(ROUND(julianday(\'2026-03-31\') - julianday(st.created_at)) AS INTEGER)`.',
      'Bucket into `aging_bucket` (`<= 14`, `15..30`, or `> 30` days).',
      'Return `ticket_id`, `full_name`, `category`, `priority`, `age_days`, and `aging_bucket`, ordered by `age_days DESC, st.ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_id', type: 'INTEGER', description: 'Open ticket ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'priority', type: 'TEXT', description: 'Priority' },
      { name: 'age_days', type: 'INTEGER', description: 'Days open as of 2026-03-31' },
      { name: 'aging_bucket', type: 'TEXT', description: '0-14 Days, 15-30 Days, or 31+ Days' },
    ],
    starterSql: `SELECT
  st.ticket_id,
  u.full_name,
  st.category,
  st.priority,
  CAST(ROUND(julianday('2026-03-31') - julianday(st.created_at)) AS INTEGER) AS age_days,
  CASE
    WHEN julianday('2026-03-31') - julianday(st.created_at) <= 14 THEN '0-14 Days'
    WHEN julianday('2026-03-31') - julianday(st.created_at) <= 30 THEN '15-30 Days'
    ELSE '31+ Days'
  END AS aging_bucket
FROM support_tickets st
INNER JOIN users u ON st.user_id = u.user_id
WHERE ...`,
    hints: [
      'Filter `WHERE st.resolved_at IS NULL`.',
      'Sort oldest backlog tickets first (`age_days DESC, st.ticket_id ASC`).',
    ],
    solutionSql: `SELECT
  st.ticket_id,
  u.full_name,
  st.category,
  st.priority,
  CAST(ROUND(julianday('2026-03-31') - julianday(st.created_at)) AS INTEGER) AS age_days,
  CASE
    WHEN julianday('2026-03-31') - julianday(st.created_at) <= 14 THEN '0-14 Days'
    WHEN julianday('2026-03-31') - julianday(st.created_at) <= 30 THEN '15-30 Days'
    ELSE '31+ Days'
  END AS aging_bucket
FROM support_tickets st
INNER JOIN users u
  ON st.user_id = u.user_id
WHERE st.resolved_at IS NULL
ORDER BY age_days DESC, st.ticket_id ASC;`,
    explanation:
      'Pinning an aging snapshot to a fixed reporting date keeps backlog metrics reproducible.',
    orderMatters: true,
  },
  {
    id: 'm35-support-volume-by-product-category',
    title: 'Support Ticket Volume Linked to Each Product Category',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Multi-Table JOIN', 'COUNT DISTINCT'],
    stakeholder: 'Product Quality',
    scenario:
      'Which product categories generate the most order-linked support tickets? Link `support_tickets` to `orders`, `order_items`, and `products` — using `COUNT(DISTINCT st.ticket_id)` so multi-item orders don’t double-count the same ticket inside a category.',
    requirements: [
      'Join `support_tickets st`, `orders o`, `order_items oi`, and `products p`.',
      'Group by `p.category`.',
      'Return `category`, `distinct_tickets` (`COUNT(DISTINCT st.ticket_id)`), and `refund_tickets` (`COUNT(DISTINCT CASE WHEN st.category = \'refund_request\' THEN st.ticket_id END)`).',
      'Order by `distinct_tickets DESC`, `p.category ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'distinct_tickets', type: 'INTEGER', description: 'Distinct tickets touching this category' },
      { name: 'refund_tickets', type: 'INTEGER', description: 'Distinct refund_request tickets' },
    ],
    starterSql: `SELECT
  p.category,
  COUNT(DISTINCT st.ticket_id) AS distinct_tickets,
  COUNT(DISTINCT CASE WHEN st.category = 'refund_request' THEN st.ticket_id END) AS refund_tickets
FROM support_tickets st
INNER JOIN orders o ON st.order_id = o.order_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
GROUP BY p.category
ORDER BY distinct_tickets DESC, p.category ASC;`,
    hints: [
      'If an order has two items in the same category, `COUNT(*)` would count the ticket twice — `COUNT(DISTINCT st.ticket_id)` prevents that.',
      'Use `COUNT(DISTINCT CASE WHEN ... THEN st.ticket_id END)` for `refund_tickets`.',
    ],
    solutionSql: `SELECT
  p.category,
  COUNT(DISTINCT st.ticket_id) AS distinct_tickets,
  COUNT(DISTINCT CASE WHEN st.category = 'refund_request' THEN st.ticket_id END) AS refund_tickets
FROM support_tickets st
INNER JOIN orders o
  ON st.order_id = o.order_id
INNER JOIN order_items oi
  ON o.order_id = oi.order_id
INNER JOIN products p
  ON oi.product_id = p.product_id
GROUP BY p.category
ORDER BY distinct_tickets DESC, p.category ASC;`,
    explanation:
      'Using `COUNT(DISTINCT ticket_id)` safely handles one-to-many order-to-item expansion within a category.',
    orderMatters: true,
  },
  {
    id: 'm36-dormant-h1-2025-buyers',
    title: 'Dormant Buyers (Active in H1 2025, Zero Orders in 2026)',
    difficulty: 'Medium',
    concepts: ['EXCEPT', 'Set Operations', 'INNER JOIN'],
    stakeholder: 'Win-Back Marketing',
    scenario:
      'Win-Back Marketing wants a list of customers who placed at least one completed order in H1 2025 (`2025-01-01` to `2025-06-30`) but placed ZERO completed orders in 2026 (`>= 2026-01-01`).',
    requirements: [
      'Use `EXCEPT` (or `EXISTS` + `NOT EXISTS`) between H1 2025 buyers and 2026 buyers.',
      'Join back to `users u` to return `user_id`, `full_name`, `email`, `country`, and `plan_tier`.',
      'Order by `u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'Dormant user ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'email', type: 'TEXT', description: 'Email for win-back campaign' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'plan_tier', type: 'TEXT', description: 'Current tier' },
    ],
    starterSql: `WITH dormant_ids AS (
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
    AND order_date BETWEEN '2025-01-01' AND '2025-06-30'
  EXCEPT
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
    AND order_date >= '2026-01-01'
)
SELECT ...`,
    hints: [
      '`EXCEPT` returns rows from the first `SELECT` that do not appear in the second `SELECT`.',
      'Join `dormant_ids` to `users` and sort by `u.user_id ASC`.',
    ],
    solutionSql: `WITH dormant_ids AS (
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
    AND order_date BETWEEN '2025-01-01' AND '2025-06-30'
  EXCEPT
  SELECT user_id
  FROM orders
  WHERE status = 'completed'
    AND order_date >= '2026-01-01'
)
SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.country,
  u.plan_tier
FROM users u
INNER JOIN dormant_ids d
  ON u.user_id = d.user_id
ORDER BY u.user_id ASC;`,
    explanation:
      'Set difference (`EXCEPT`) is an expressive, readable way to identify lapsed or churned customer cohorts.',
    orderMatters: true,
  },
  {
    id: 'm37-duplicate-order-revenue-impact',
    title: 'Quantifying Revenue Inflation From Duplicate Orders',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'CTE (WITH)', 'Deduplication'],
    stakeholder: 'Data Engineering',
    scenario:
      'Data Engineering wants a single executive reconciliation showing Gross Completed Revenue (before deduplication), Clean Deduplicated Revenue (keeping earliest `order_id` per `(user_id, order_date, total_amount)`), the duplicate order count removed, and exact dollar inflation.',
    requirements: [
      'Rank completed orders with `ROW_NUMBER() OVER (PARTITION BY user_id, order_date, total_amount ORDER BY order_id ASC) AS rn`.',
      'In the outer query, report `raw_orders` (`COUNT(*)`), `clean_orders` (`SUM(CASE WHEN rn = 1 THEN 1 ELSE 0 END)`), `raw_revenue`, `clean_revenue`, and `duplicate_inflation_usd` (`ROUND(raw_revenue - clean_revenue, 2)`).',
    ],
    expectedColumns: [
      { name: 'raw_orders', type: 'INTEGER', description: 'Total completed rows' },
      { name: 'clean_orders', type: 'INTEGER', description: 'Unique completed orders' },
      { name: 'raw_revenue', type: 'REAL', description: 'Unadjusted revenue' },
      { name: 'clean_revenue', type: 'REAL', description: 'Deduplicated revenue' },
      { name: 'duplicate_inflation_usd', type: 'REAL', description: 'Revenue overstated by duplicates' },
    ],
    starterSql: `WITH ranked AS (
  SELECT
    order_id,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_date, total_amount
      ORDER BY order_id ASC
    ) AS rn
  FROM orders
  WHERE status = 'completed'
)
SELECT ...`,
    hints: [
      'Keep all `ranked` rows in the outer `SELECT` and use `CASE WHEN rn = 1` for the clean columns.',
      'Subtract `clean_revenue` from `raw_revenue` to report the dollar impact.',
    ],
    solutionSql: `WITH ranked AS (
  SELECT
    order_id,
    total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_date, total_amount
      ORDER BY order_id ASC
    ) AS rn
  FROM orders
  WHERE status = 'completed'
)
SELECT
  COUNT(*) AS raw_orders,
  SUM(CASE WHEN rn = 1 THEN 1 ELSE 0 END) AS clean_orders,
  ROUND(SUM(total_amount), 2) AS raw_revenue,
  ROUND(SUM(CASE WHEN rn = 1 THEN total_amount ELSE 0 END), 2) AS clean_revenue,
  ROUND(SUM(CASE WHEN rn > 1 THEN total_amount ELSE 0 END), 2) AS duplicate_inflation_usd
FROM ranked;`,
    explanation:
      'Evaluating `rn = 1` vs `rn > 1` in one pass produces a clear audit trail for financial restatements.',
    orderMatters: false,
  },
  {
    id: 'm38-products-beating-category-margin',
    title: 'Products Outperforming Their Category Average Margin',
    difficulty: 'Medium',
    concepts: ['CTE (WITH)', 'Benchmarking', 'Margin Math'],
    stakeholder: 'Merchandising',
    scenario:
      'Find every product whose lifetime completed gross margin % (`100.0 * profit / revenue`) strictly exceeds the average product margin % within its own `category`.',
    requirements: [
      'CTE 1 (`prod_margin`): compute `margin_pct` per `(category, product_name)` from completed line items.',
      'CTE 2 (`cat_avg`): compute `AVG(margin_pct)` per `category`.',
      'Return `category`, `product_name`, `product_margin_pct`, and `category_avg_margin_pct` (rounded to 2 decimals) where `product_margin_pct > category_avg_margin_pct`.',
      'Order by `category ASC, product_margin_pct DESC, product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'category', type: 'TEXT', description: 'Category' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'product_margin_pct', type: 'REAL', description: 'Product margin %' },
      { name: 'category_avg_margin_pct', type: 'REAL', description: 'Category avg margin %' },
    ],
    starterSql: `WITH prod_margin AS (
  SELECT
    p.category,
    p.product_name,
    100.0 * SUM((oi.unit_price - p.cost_price) * oi.quantity) / SUM(oi.quantity * oi.unit_price) AS margin_pct
  FROM orders o
  INNER JOIN order_items oi ON o.order_id = oi.order_id
  INNER JOIN products p ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, p.product_name
),
cat_avg AS (
  SELECT category, AVG(margin_pct) AS avg_margin_pct
  FROM prod_margin
  GROUP BY category
)
SELECT ...`,
    hints: [
      'Compare unrounded `pm.margin_pct > ca.avg_margin_pct` in `WHERE`, then apply `ROUND(..., 2)` in `SELECT`.',
      'Sort by `pm.category ASC, product_margin_pct DESC, pm.product_name ASC`.',
    ],
    solutionSql: `WITH prod_margin AS (
  SELECT
    p.category,
    p.product_name,
    100.0 * SUM((oi.unit_price - p.cost_price) * oi.quantity) / SUM(oi.quantity * oi.unit_price) AS margin_pct
  FROM orders o
  INNER JOIN order_items oi
    ON o.order_id = oi.order_id
  INNER JOIN products p
    ON oi.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, p.product_name
),
cat_avg AS (
  SELECT
    category,
    AVG(margin_pct) AS avg_margin_pct
  FROM prod_margin
  GROUP BY category
)
SELECT
  pm.category,
  pm.product_name,
  ROUND(pm.margin_pct, 2) AS product_margin_pct,
  ROUND(ca.avg_margin_pct, 2) AS category_avg_margin_pct
FROM prod_margin pm
INNER JOIN cat_avg ca
  ON pm.category = ca.category
WHERE pm.margin_pct > ca.avg_margin_pct
ORDER BY pm.category ASC, product_margin_pct DESC, pm.product_name ASC;`,
    explanation:
      'Chained CTEs separate SKU-level margin calculation from category-level benchmarking cleanly.',
    orderMatters: true,
  },
  {
    id: 'm39-h2-2025-country-profit-mix',
    title: 'H2 2025 Gross Profit & Units by Country',
    difficulty: 'Medium',
    concepts: ['Multi-Table JOIN', 'BETWEEN', 'Margin Math'],
    stakeholder: 'Regional FP&A',
    scenario:
      'Regional FP&A wants H2 2025 (`2025-07-01` to `2025-12-31`) completed units sold, line-item revenue, and gross profit broken down by customer `country`.',
    requirements: [
      'Join `users u`, `orders o`, `order_items oi`, and `products p`.',
      'Filter `o.status = \'completed\'` and `o.order_date BETWEEN \'2025-07-01\' AND \'2025-12-31\'`.',
      'Group by `u.country`, returning `country`, `units_sold`, `revenue`, `gross_profit`, and `margin_pct` (rounded to 2 decimals).',
      'Order by `gross_profit DESC`, `u.country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'units_sold', type: 'INTEGER', description: 'Units sold in H2 2025' },
      { name: 'revenue', type: 'REAL', description: 'Line-item revenue' },
      { name: 'gross_profit', type: 'REAL', description: 'Gross profit' },
      { name: 'margin_pct', type: 'REAL', description: 'Margin % (2 decimals)' },
    ],
    starterSql: `SELECT
  u.country,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_profit,
  ROUND(100.0 * SUM((oi.unit_price - p.cost_price) * oi.quantity) / SUM(oi.quantity * oi.unit_price), 2) AS margin_pct
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE ...`,
    hints: [
      'Filter `o.status = \'completed\' AND o.order_date BETWEEN \'2025-07-01\' AND \'2025-12-31\'`.',
      'Group by `u.country`.',
    ],
    solutionSql: `SELECT
  u.country,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM((oi.unit_price - p.cost_price) * oi.quantity), 2) AS gross_profit,
  ROUND(100.0 * SUM((oi.unit_price - p.cost_price) * oi.quantity) / SUM(oi.quantity * oi.unit_price), 2) AS margin_pct
FROM orders o
INNER JOIN users u
  ON o.user_id = u.user_id
INNER JOIN order_items oi
  ON o.order_id = oi.order_id
INNER JOIN products p
  ON oi.product_id = p.product_id
WHERE o.status = 'completed'
  AND o.order_date BETWEEN '2025-07-01' AND '2025-12-31'
GROUP BY u.country
ORDER BY gross_profit DESC, u.country ASC;`,
    explanation:
      'Joining across customer, order, line-item, and catalog tables lets regional finance measure true net product margin by geography.',
    orderMatters: true,
  },
  {
    id: 'm40-highest-order-per-country',
    title: 'Single Largest Completed Order in Each Country',
    difficulty: 'Medium',
    concepts: ['ROW_NUMBER()', 'PARTITION BY', 'INNER JOIN'],
    stakeholder: 'Enterprise Sales',
    scenario:
      'Enterprise Sales wants a case-study list of the single largest completed order (`total_amount DESC, order_id ASC`) placed in each country, including the buyer’s name and order date.',
    requirements: [
      'Join `orders o` and `users u` (`o.status = \'completed\'`).',
      'Use `ROW_NUMBER() OVER (PARTITION BY u.country ORDER BY o.total_amount DESC, o.order_id ASC) AS rn`.',
      'Keep `rn = 1`, returning `country`, `order_id`, `full_name`, `order_date`, and `total_amount`.',
      'Order by `total_amount DESC`, `country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'order_id', type: 'INTEGER', description: 'Largest order ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'order_date', type: 'TEXT', description: 'Order date' },
      { name: 'total_amount', type: 'REAL', description: 'Order amount (USD)' },
    ],
    starterSql: `WITH ranked AS (
  SELECT
    u.country,
    o.order_id,
    u.full_name,
    o.order_date,
    o.total_amount,
    ROW_NUMBER() OVER (PARTITION BY u.country ORDER BY o.total_amount DESC, o.order_id ASC) AS rn
  FROM orders o
  INNER JOIN users u ON o.user_id = u.user_id
  WHERE o.status = 'completed'
)
SELECT ...`,
    hints: [
      'Include `o.order_id ASC` as a tie-breaker inside `ORDER BY` of `ROW_NUMBER()`.',
      'Filter `WHERE rn = 1` in the outer query.',
    ],
    solutionSql: `WITH ranked AS (
  SELECT
    u.country,
    o.order_id,
    u.full_name,
    o.order_date,
    o.total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY u.country
      ORDER BY o.total_amount DESC, o.order_id ASC
    ) AS rn
  FROM orders o
  INNER JOIN users u
    ON o.user_id = u.user_id
  WHERE o.status = 'completed'
)
SELECT
  country,
  order_id,
  full_name,
  order_date,
  total_amount
FROM ranked
WHERE rn = 1
ORDER BY total_amount DESC, country ASC;`,
    explanation:
      '`ROW_NUMBER()` solves greatest-N-per-group problems while preserving full transaction details.',
    orderMatters: true,
  },
];
