import type { Problem } from '../types/sql';

export type ProblemBlueprint = Omit<Problem, 'number'>;

export const EXTRA_EASY_PROBLEMS: ProblemBlueprint[] = [
  {
    id: 'e5-active-annual-subscriptions',
    title: 'Active Annual Subscriptions Roster',
    difficulty: 'Easy',
    concepts: ['WHERE', 'AND', 'ORDER BY'],
    stakeholder: 'Billing Operations',
    scenario:
      'Billing Operations is auditing annual recurring contracts ahead of Q2 renewals. Pull all currently active subscriptions on an annual billing cycle with their monthly recurring revenue (`mrr_amount`).',
    requirements: [
      'Filter `subscriptions` where `status = \'active\'` and `billing_cycle = \'annual\'`.',
      'Return `sub_id`, `user_id`, `plan_tier`, `mrr_amount`, and `start_date`.',
      'Order by `mrr_amount DESC`, `start_date ASC`, `sub_id ASC`.',
    ],
    expectedColumns: [
      { name: 'sub_id', type: 'INTEGER', description: 'Subscription ID' },
      { name: 'user_id', type: 'INTEGER', description: 'Account user ID' },
      { name: 'plan_tier', type: 'TEXT', description: 'Subscription plan tier' },
      { name: 'mrr_amount', type: 'REAL', description: 'Monthly recurring revenue (USD)' },
      { name: 'start_date', type: 'TEXT', description: 'Contract start date' },
    ],
    starterSql: `SELECT
  sub_id,
  user_id,
  plan_tier,
  mrr_amount,
  start_date
FROM subscriptions
WHERE ...
ORDER BY mrr_amount DESC, start_date ASC, sub_id ASC;`,
    hints: [
      'Combine `status = \'active\'` and `billing_cycle = \'annual\'` in your `WHERE` clause.',
      'Include `sub_id ASC` as the final tie-breaker in `ORDER BY`.',
    ],
    solutionSql: `SELECT
  sub_id,
  user_id,
  plan_tier,
  mrr_amount,
  start_date
FROM subscriptions
WHERE status = 'active'
  AND billing_cycle = 'annual'
ORDER BY mrr_amount DESC, start_date ASC, sub_id ASC;`,
    explanation:
      'Filtering on both `status` and `billing_cycle` isolates active annual contracts, while multi-column sorting keeps ties deterministic.',
    orderMatters: true,
  },
  {
    id: 'e6-open-high-priority-tickets',
    title: 'Unresolved High & Urgent Support Backlog',
    difficulty: 'Easy',
    concepts: ['IS NULL', 'IN', 'INNER JOIN'],
    stakeholder: 'Support Engineering',
    scenario:
      'Support managers need an immediate escalation queue of every ticket that is still unresolved (`resolved_at IS NULL`) and marked either `high` or `urgent` priority, including the customer’s name and country.',
    requirements: [
      'Join `support_tickets st` with `users u` on `user_id`.',
      'Keep rows where `st.resolved_at IS NULL` and `st.priority IN (\'high\', \'urgent\')`.',
      'Return `ticket_id`, `full_name`, `country`, `category`, `priority`, and `created_at`.',
      'Order by `created_at ASC`, `ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_id', type: 'INTEGER', description: 'Support ticket ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Customer country' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'priority', type: 'TEXT', description: 'high or urgent' },
      { name: 'created_at', type: 'TEXT', description: 'Timestamp created' },
    ],
    starterSql: `SELECT
  st.ticket_id,
  u.full_name,
  u.country,
  st.category,
  st.priority,
  st.created_at
FROM support_tickets st
INNER JOIN users u ON st.user_id = u.user_id
WHERE ...`,
    hints: [
      'In SQL, check for missing values with `st.resolved_at IS NULL` (never `= NULL`).',
      'Use `st.priority IN (\'high\', \'urgent\')` and sort oldest-first (`st.created_at ASC`).',
    ],
    solutionSql: `SELECT
  st.ticket_id,
  u.full_name,
  u.country,
  st.category,
  st.priority,
  st.created_at
FROM support_tickets st
INNER JOIN users u
  ON st.user_id = u.user_id
WHERE st.resolved_at IS NULL
  AND st.priority IN ('high', 'urgent')
ORDER BY st.created_at ASC, st.ticket_id ASC;`,
    explanation:
      'Checking `IS NULL` on `resolved_at` finds open tickets, and joining `users` enriches the queue with customer context.',
    orderMatters: true,
  },
  {
    id: 'e7-email-domain-directory',
    title: 'Corporate Email Domain Directory (.uk & .de)',
    difficulty: 'Easy',
    concepts: ['LIKE', 'OR', 'ORDER BY'],
    stakeholder: 'EMEA Compliance',
    scenario:
      'Legal & Compliance wants to audit registered accounts using country-specific `.uk` or `.de` email domains for GDPR regional verification.',
    requirements: [
      'Filter `users` where `email LIKE \'%.uk\'` or `email LIKE \'%.de\'`.',
      'Return `user_id`, `full_name`, `email`, `country`, and `plan_tier`.',
      'Order by `country ASC`, `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'email', type: 'TEXT', description: 'Email ending in .uk or .de' },
      { name: 'country', type: 'TEXT', description: 'Account country' },
      { name: 'plan_tier', type: 'TEXT', description: 'Subscription tier' },
    ],
    starterSql: `SELECT
  user_id,
  full_name,
  email,
  country,
  plan_tier
FROM users
WHERE ...`,
    hints: [
      'Use the `%` wildcard with `LIKE`: `email LIKE \'%.uk\' OR email LIKE \'%.de\'`.',
      'Sort by `country ASC, user_id ASC`.',
    ],
    solutionSql: `SELECT
  user_id,
  full_name,
  email,
  country,
  plan_tier
FROM users
WHERE email LIKE '%.uk'
   OR email LIKE '%.de'
ORDER BY country ASC, user_id ASC;`,
    explanation:
      'The `LIKE \'%.uk\'` pattern matches any string ending in `.uk`.',
    orderMatters: true,
  },
  {
    id: 'e8-low-cogs-2025-products',
    title: '2025 Product Launches Under $60 Unit Cost',
    difficulty: 'Easy',
    concepts: ['BETWEEN', 'WHERE', 'ORDER BY'],
    stakeholder: 'Supply Chain',
    scenario:
      'Supply Chain is reviewing lightweight catalog additions launched during 2025 whose unit cost (`cost_price`) is strictly under $60.',
    requirements: [
      'Filter `products` where `launch_date BETWEEN \'2025-01-01\' AND \'2025-12-31\'` and `cost_price < 60`.',
      'Return `product_id`, `product_name`, `category`, `cost_price`, and `launch_date`.',
      'Order by `cost_price ASC`, `product_id ASC`.',
    ],
    expectedColumns: [
      { name: 'product_id', type: 'INTEGER', description: 'Product ID' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Catalog category' },
      { name: 'cost_price', type: 'REAL', description: 'Unit COGS (< 60)' },
      { name: 'launch_date', type: 'TEXT', description: 'Launch date in 2025' },
    ],
    starterSql: `SELECT
  product_id,
  product_name,
  category,
  cost_price,
  launch_date
FROM products
WHERE ...`,
    hints: [
      'Use `BETWEEN \'2025-01-01\' AND \'2025-12-31\'` for `launch_date`.',
      'Note "strictly under $60" means `cost_price < 60` (not `<=`).',
    ],
    solutionSql: `SELECT
  product_id,
  product_name,
  category,
  cost_price,
  launch_date
FROM products
WHERE launch_date BETWEEN '2025-01-01' AND '2025-12-31'
  AND cost_price < 60
ORDER BY cost_price ASC, product_id ASC;`,
    explanation:
      'Filtering `launch_date` with `BETWEEN` and `cost_price < 60` isolates low-COGS 2025 catalog launches.',
    orderMatters: true,
  },
  {
    id: 'e9-weekend-orders-volume',
    title: 'Weekend Completed Orders Snapshot',
    difficulty: 'Easy',
    concepts: ['strftime', 'IN', 'WHERE'],
    stakeholder: 'Fulfillment Ops',
    scenario:
      'Fulfillment wants to staff weekend warehouse shifts properly. List all completed orders placed on a Saturday or Sunday across the dataset.',
    requirements: [
      'In SQLite, `strftime(\'%w\', order_date)` returns `\'0\'` for Sunday and `\'6\'` for Saturday.',
      'Filter `orders` to `status = \'completed\'` and `strftime(\'%w\', order_date) IN (\'0\', \'6\')`.',
      'Return `order_id`, `order_date`, `strftime(\'%w\', order_date) AS day_of_week`, and `total_amount`.',
      'Order by `order_date ASC`, `order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Order ID' },
      { name: 'order_date', type: 'TEXT', description: 'Weekend order date' },
      { name: 'day_of_week', type: 'TEXT', description: '0 = Sunday, 6 = Saturday' },
      { name: 'total_amount', type: 'REAL', description: 'Order total (USD)' },
    ],
    starterSql: `SELECT
  order_id,
  order_date,
  strftime('%w', order_date) AS day_of_week,
  total_amount
FROM orders
WHERE ...`,
    hints: [
      '`strftime(\'%w\', order_date)` returns text digits `\'0\'` (Sunday) through `\'6\'` (Saturday).',
      'Filter with `strftime(\'%w\', order_date) IN (\'0\', \'6\')` and `status = \'completed\'`.',
    ],
    solutionSql: `SELECT
  order_id,
  order_date,
  strftime('%w', order_date) AS day_of_week,
  total_amount
FROM orders
WHERE status = 'completed'
  AND strftime('%w', order_date) IN ('0', '6')
ORDER BY order_date ASC, order_id ASC;`,
    explanation:
      'Using `strftime(\'%w\', ...)` extracts the day of week directly from ISO date strings without needing a separate calendar dimension table.',
    orderMatters: true,
  },
  {
    id: 'e10-unattributed-web-events-by-device',
    title: 'Direct / Unattributed Web Traffic by Device',
    difficulty: 'Easy',
    concepts: ['IS NULL', 'GROUP BY', 'COUNT'],
    stakeholder: 'Performance Marketing',
    scenario:
      'Marketing noticed several web events lack a `utm_source` tag (direct or stripped referrals). Count how many unattributed events and unique sessions occurred on each `device_type`.',
    requirements: [
      'Filter `web_events` where `utm_source IS NULL`.',
      'Group by `device_type`.',
      'Return `device_type`, `event_count` (`COUNT(*)`), and `session_count` (`COUNT(DISTINCT session_id)`).',
      'Order by `event_count DESC`, `device_type ASC`.',
    ],
    expectedColumns: [
      { name: 'device_type', type: 'TEXT', description: 'desktop, mobile, or tablet' },
      { name: 'event_count', type: 'INTEGER', description: 'Events missing utm_source' },
      { name: 'session_count', type: 'INTEGER', description: 'Distinct sessions' },
    ],
    starterSql: `SELECT
  device_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS session_count
FROM web_events
WHERE ...`,
    hints: [
      'Filter `WHERE utm_source IS NULL` before grouping.',
      'Use `COUNT(DISTINCT session_id)` so multi-event sessions count once in `session_count`.',
    ],
    solutionSql: `SELECT
  device_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS session_count
FROM web_events
WHERE utm_source IS NULL
GROUP BY device_type
ORDER BY event_count DESC, device_type ASC;`,
    explanation:
      '`COUNT(*)` measures total telemetry hits while `COUNT(DISTINCT session_id)` reveals unique visits missing UTM attribution.',
    orderMatters: true,
  },
  {
    id: 'e11-churn-reasons-coalesce',
    title: 'Churned & Past-Due Subscription Reasons',
    difficulty: 'Easy',
    concepts: ['COALESCE', 'IN', 'GROUP BY'],
    stakeholder: 'Retention Strategy',
    scenario:
      'Retention wants a breakdown of cancellation reasons across `cancelled` and `past_due` subscriptions, replacing missing `cancel_reason` values with `\'not_specified\'`.',
    requirements: [
      'Filter `subscriptions` to `status IN (\'cancelled\', \'past_due\')`.',
      'Normalize `cancel_reason` with `COALESCE(cancel_reason, \'not_specified\') AS reason`.',
      'Return `reason`, `sub_count` (`COUNT(*)`), and `lost_mrr` (`ROUND(SUM(mrr_amount), 2)`).',
      'Order by `lost_mrr DESC`, `reason ASC`.',
    ],
    expectedColumns: [
      { name: 'reason', type: 'TEXT', description: 'Cancel reason or not_specified' },
      { name: 'sub_count', type: 'INTEGER', description: 'Subscription count' },
      { name: 'lost_mrr', type: 'REAL', description: 'Sum of MRR (USD)' },
    ],
    starterSql: `SELECT
  COALESCE(cancel_reason, 'not_specified') AS reason,
  COUNT(*) AS sub_count,
  ROUND(SUM(mrr_amount), 2) AS lost_mrr
FROM subscriptions
WHERE ...`,
    hints: [
      'Filter `status IN (\'cancelled\', \'past_due\')` first.',
      'Group by `COALESCE(cancel_reason, \'not_specified\')`.',
    ],
    solutionSql: `SELECT
  COALESCE(cancel_reason, 'not_specified') AS reason,
  COUNT(*) AS sub_count,
  ROUND(SUM(mrr_amount), 2) AS lost_mrr
FROM subscriptions
WHERE status IN ('cancelled', 'past_due')
GROUP BY COALESCE(cancel_reason, 'not_specified')
ORDER BY lost_mrr DESC, reason ASC;`,
    explanation:
      '`COALESCE` groups both involuntary `past_due` accounts and un-surveyed cancellations under `not_specified` so no churned MRR disappears.',
    orderMatters: true,
  },
  {
    id: 'e12-unrated-resolved-tickets',
    title: 'Resolved Tickets Missing CSAT Surveys',
    difficulty: 'Easy',
    concepts: ['IS NOT NULL', 'IS NULL', 'ORDER BY'],
    stakeholder: 'Customer Experience',
    scenario:
      'CX noticed some closed tickets never received a customer satisfaction rating (`satisfaction_score`). Find all resolved tickets where `satisfaction_score IS NULL`.',
    requirements: [
      'Filter `support_tickets` where `resolved_at IS NOT NULL` and `satisfaction_score IS NULL`.',
      'Return `ticket_id`, `user_id`, `category`, `priority`, and `resolved_at`.',
      'Order by `resolved_at ASC`, `ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_id', type: 'INTEGER', description: 'Ticket ID' },
      { name: 'user_id', type: 'INTEGER', description: 'Customer ID' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'priority', type: 'TEXT', description: 'Priority level' },
      { name: 'resolved_at', type: 'TEXT', description: 'Resolution timestamp' },
    ],
    starterSql: `SELECT
  ticket_id,
  user_id,
  category,
  priority,
  resolved_at
FROM support_tickets
WHERE ...`,
    hints: [
      'Combine `resolved_at IS NOT NULL` and `satisfaction_score IS NULL`.',
      'Sort chronologically by `resolved_at ASC, ticket_id ASC`.',
    ],
    solutionSql: `SELECT
  ticket_id,
  user_id,
  category,
  priority,
  resolved_at
FROM support_tickets
WHERE resolved_at IS NOT NULL
  AND satisfaction_score IS NULL
ORDER BY resolved_at ASC, ticket_id ASC;`,
    explanation:
      'Pairing `IS NOT NULL` and `IS NULL` separates closed tickets missing survey responses from still-open tickets.',
    orderMatters: true,
  },
  {
    id: 'e13-csat-by-priority',
    title: 'Ticket Volume & Average CSAT by Priority',
    difficulty: 'Easy',
    concepts: ['AVG', 'COUNT', 'GROUP BY'],
    stakeholder: 'Support Leadership',
    scenario:
      'Support Leadership wants to compare total ticket volume against rated ticket count and average `satisfaction_score` across each priority tier.',
    requirements: [
      'Group `support_tickets` by `priority`.',
      'Compute `total_tickets` (`COUNT(*)`), `rated_tickets` (`COUNT(satisfaction_score)`), and `avg_csat` (`ROUND(AVG(satisfaction_score), 2)`).',
      'Order by `avg_csat DESC`, `priority ASC`.',
    ],
    expectedColumns: [
      { name: 'priority', type: 'TEXT', description: 'low, medium, high, urgent' },
      { name: 'total_tickets', type: 'INTEGER', description: 'All tickets in priority' },
      { name: 'rated_tickets', type: 'INTEGER', description: 'Tickets with non-NULL CSAT' },
      { name: 'avg_csat', type: 'REAL', description: 'Average CSAT (2 decimals)' },
    ],
    starterSql: `SELECT
  priority,
  COUNT(*) AS total_tickets,
  COUNT(satisfaction_score) AS rated_tickets,
  ROUND(AVG(satisfaction_score), 2) AS avg_csat
FROM support_tickets
GROUP BY priority
ORDER BY avg_csat DESC, priority ASC;`,
    hints: [
      '`COUNT(*)` counts every row, whereas `COUNT(satisfaction_score)` ignores `NULL` scores.',
      '`AVG(satisfaction_score)` also ignores `NULL` automatically—do not replace NULLs with 0!',
    ],
    solutionSql: `SELECT
  priority,
  COUNT(*) AS total_tickets,
  COUNT(satisfaction_score) AS rated_tickets,
  ROUND(AVG(satisfaction_score), 2) AS avg_csat
FROM support_tickets
GROUP BY priority
ORDER BY avg_csat DESC, priority ASC;`,
    explanation:
      'SQL aggregate functions `COUNT(col)` and `AVG(col)` automatically ignore `NULL` values, preventing unrated tickets from pulling down CSAT.',
    orderMatters: true,
  },
  {
    id: 'e14-bulk-line-items',
    title: 'Bulk Quantity Line Items (>= 3 Units)',
    difficulty: 'Easy',
    concepts: ['INNER JOIN', 'WHERE', 'Arithmetic'],
    stakeholder: 'B2B Sales',
    scenario:
      'B2B Sales wants to inspect every completed order line item where a customer purchased 3 or more units of a single product, including the line-item subtotal.',
    requirements: [
      'Join `order_items oi`, `orders o`, and `products p`.',
      'Filter to `o.status = \'completed\'` and `oi.quantity >= 3`.',
      'Return `order_id`, `product_name`, `quantity`, `unit_price`, and `line_total` (`ROUND(oi.quantity * oi.unit_price, 2)`).',
      'Order by `line_total DESC`, `order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Order ID' },
      { name: 'product_name', type: 'TEXT', description: 'Product purchased' },
      { name: 'quantity', type: 'INTEGER', description: 'Units purchased (>= 3)' },
      { name: 'unit_price', type: 'REAL', description: 'Unit price (USD)' },
      { name: 'line_total', type: 'REAL', description: 'quantity * unit_price' },
    ],
    starterSql: `SELECT
  o.order_id,
  p.product_name,
  oi.quantity,
  oi.unit_price,
  ROUND(oi.quantity * oi.unit_price, 2) AS line_total
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE ...`,
    hints: [
      'Join `order_items` to both `orders` (for `status`) and `products` (for `product_name`).',
      'Filter `o.status = \'completed\' AND oi.quantity >= 3`.',
    ],
    solutionSql: `SELECT
  o.order_id,
  p.product_name,
  oi.quantity,
  oi.unit_price,
  ROUND(oi.quantity * oi.unit_price, 2) AS line_total
FROM order_items oi
INNER JOIN orders o
  ON oi.order_id = o.order_id
INNER JOIN products p
  ON oi.product_id = p.product_id
WHERE o.status = 'completed'
  AND oi.quantity >= 3
ORDER BY line_total DESC, o.order_id ASC;`,
    explanation:
      'Joining across `order_items`, `orders`, and `products` surfaces bulk single-SKU line items for B2B outreach.',
    orderMatters: true,
  },
  {
    id: 'e15-brand-campaigns-no-promo',
    title: 'Non-Promo Brand Awareness Campaigns',
    difficulty: 'Easy',
    concepts: ['IS NULL', 'WHERE', 'ORDER BY'],
    stakeholder: 'Brand Marketing',
    scenario:
      'Finance wants to separate pure brand-awareness campaigns (those without any `promo_code`) from promo-driven campaigns and list them by spend.',
    requirements: [
      'Filter `marketing_campaigns` where `promo_code IS NULL`.',
      'Return `campaign_id`, `campaign_name`, `channel`, `spend_usd`, `start_date`, and `end_date`.',
      'Order by `spend_usd DESC`, `campaign_id ASC`.',
    ],
    expectedColumns: [
      { name: 'campaign_id', type: 'INTEGER', description: 'Campaign ID' },
      { name: 'campaign_name', type: 'TEXT', description: 'Campaign name' },
      { name: 'channel', type: 'TEXT', description: 'Marketing channel' },
      { name: 'spend_usd', type: 'REAL', description: 'Ad spend in USD' },
      { name: 'start_date', type: 'TEXT', description: 'Start date' },
      { name: 'end_date', type: 'TEXT', description: 'End date' },
    ],
    starterSql: `SELECT
  campaign_id,
  campaign_name,
  channel,
  spend_usd,
  start_date,
  end_date
FROM marketing_campaigns
WHERE ...`,
    hints: [
      'Filter `WHERE promo_code IS NULL`.',
      'Sort highest spend first with `ORDER BY spend_usd DESC, campaign_id ASC`.',
    ],
    solutionSql: `SELECT
  campaign_id,
  campaign_name,
  channel,
  spend_usd,
  start_date,
  end_date
FROM marketing_campaigns
WHERE promo_code IS NULL
ORDER BY spend_usd DESC, campaign_id ASC;`,
    explanation:
      'Isolating `promo_code IS NULL` rows lets Finance audit upper-funnel brand spend separately from discount-attributed promotions.',
    orderMatters: true,
  },
  {
    id: 'e16-products-zero-reviews',
    title: 'Catalog Products With Zero Reviews',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'Anti-Join', 'IS NULL'],
    stakeholder: 'Merchandising Team',
    scenario:
      'Merchandising wants to run a review-solicitation email for any product in our catalog that currently has zero rows in `product_reviews`.',
    requirements: [
      'Start from `products p` and `LEFT JOIN product_reviews pr ON p.product_id = pr.product_id`.',
      'Keep products where `pr.review_id IS NULL`.',
      'Return `product_id`, `product_name`, `category`, and `launch_date`, ordered by `product_id ASC`.',
    ],
    expectedColumns: [
      { name: 'product_id', type: 'INTEGER', description: 'Product ID' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'launch_date', type: 'TEXT', description: 'Launch date' },
    ],
    starterSql: `SELECT
  p.product_id,
  p.product_name,
  p.category,
  p.launch_date
FROM products p
LEFT JOIN product_reviews pr ON p.product_id = pr.product_id
WHERE ...`,
    hints: [
      'Use `LEFT JOIN` so unreviewed products stay in the result set with `NULL` review columns.',
      'Filter `WHERE pr.review_id IS NULL`.',
    ],
    solutionSql: `SELECT
  p.product_id,
  p.product_name,
  p.category,
  p.launch_date
FROM products p
LEFT JOIN product_reviews pr
  ON p.product_id = pr.product_id
WHERE pr.review_id IS NULL
ORDER BY p.product_id ASC;`,
    explanation:
      'A `LEFT JOIN ... WHERE right_pk IS NULL` anti-join cleanly identifies catalog items lacking customer social proof.',
    orderMatters: true,
  },
  {
    id: 'e17-users-no-support-tickets',
    title: 'Zero-Touch Paid Customers (No Support Tickets)',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'Anti-Join', 'IN'],
    stakeholder: 'Customer Success',
    scenario:
      'Customer Success wants to identify `pro` and `enterprise` users who have never filed a single support ticket.',
    requirements: [
      '`LEFT JOIN` `users u` to `support_tickets st` on `user_id`.',
      'Filter `u.plan_tier IN (\'pro\', \'enterprise\')` and `st.ticket_id IS NULL`.',
      'Return `user_id`, `full_name`, `country`, and `plan_tier`, ordered by `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'plan_tier', type: 'TEXT', description: 'pro or enterprise' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
LEFT JOIN support_tickets st ON u.user_id = st.user_id
WHERE ...`,
    hints: [
      'Filter `st.ticket_id IS NULL` after the `LEFT JOIN`.',
      'Restrict tiers with `u.plan_tier IN (\'pro\', \'enterprise\')`.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
LEFT JOIN support_tickets st
  ON u.user_id = st.user_id
WHERE u.plan_tier IN ('pro', 'enterprise')
  AND st.ticket_id IS NULL
ORDER BY u.user_id ASC;`,
    explanation:
      'Combining a left anti-join with tier filtering highlights self-sufficient premium accounts.',
    orderMatters: true,
  },
  {
    id: 'e18-verified-vs-unverified-reviews',
    title: 'Verified vs. Unverified Review Ratings',
    difficulty: 'Easy',
    concepts: ['CASE WHEN', 'GROUP BY', 'AVG'],
    stakeholder: 'Trust & Safety',
    scenario:
      'Trust & Safety suspects unverified product reviews skew much lower than verified purchases. Compare review count, average rating, and total helpful votes between `verified_purchase = 1` and `0`.',
    requirements: [
      'Map `verified_purchase` using `CASE WHEN verified_purchase = 1 THEN \'Verified\' ELSE \'Unverified\' END AS purchase_status`.',
      'Compute `review_count` (`COUNT(*)`), `avg_rating` (`ROUND(AVG(rating), 2)`), and `total_helpful_votes` (`SUM(helpful_votes)`).',
      'Order by `purchase_status DESC`.',
    ],
    expectedColumns: [
      { name: 'purchase_status', type: 'TEXT', description: 'Verified or Unverified' },
      { name: 'review_count', type: 'INTEGER', description: 'Number of reviews' },
      { name: 'avg_rating', type: 'REAL', description: 'Average star rating (2 decimals)' },
      { name: 'total_helpful_votes', type: 'INTEGER', description: 'Sum of helpful votes' },
    ],
    starterSql: `SELECT
  CASE WHEN verified_purchase = 1 THEN 'Verified' ELSE 'Unverified' END AS purchase_status,
  COUNT(*) AS review_count,
  ROUND(AVG(rating), 2) AS avg_rating,
  SUM(helpful_votes) AS total_helpful_votes
FROM product_reviews
GROUP BY ...`,
    hints: [
      'Group by the `CASE WHEN ... END` expression (or `verified_purchase`).',
      'Order by `purchase_status DESC` so `Verified` appears first.',
    ],
    solutionSql: `SELECT
  CASE WHEN verified_purchase = 1 THEN 'Verified' ELSE 'Unverified' END AS purchase_status,
  COUNT(*) AS review_count,
  ROUND(AVG(rating), 2) AS avg_rating,
  SUM(helpful_votes) AS total_helpful_votes
FROM product_reviews
GROUP BY CASE WHEN verified_purchase = 1 THEN 'Verified' ELSE 'Unverified' END
ORDER BY purchase_status DESC;`,
    explanation:
      'Grouping by a `CASE` label converts binary integer flags into readable stakeholder categories.',
    orderMatters: true,
  },
  {
    id: 'e19-unique-buyers-per-country',
    title: 'Unique Paying Buyers & Order Density by Country',
    difficulty: 'Easy',
    concepts: ['COUNT DISTINCT', 'INNER JOIN', 'GROUP BY'],
    stakeholder: 'International Growth',
    scenario:
      'International Growth wants to know how many distinct paying customers and total completed orders we have in each country.',
    requirements: [
      'Join `users u` and `orders o` on `user_id`, keeping `o.status = \'completed\'`.',
      'Group by `u.country`.',
      'Return `country`, `unique_buyers` (`COUNT(DISTINCT o.user_id)`), and `completed_orders` (`COUNT(*)`).',
      'Order by `unique_buyers DESC`, `completed_orders DESC`, `country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'unique_buyers', type: 'INTEGER', description: 'Distinct users with >= 1 completed order' },
      { name: 'completed_orders', type: 'INTEGER', description: 'Total completed orders' },
    ],
    starterSql: `SELECT
  u.country,
  COUNT(DISTINCT o.user_id) AS unique_buyers,
  COUNT(*) AS completed_orders
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
WHERE ...`,
    hints: [
      'Use `COUNT(DISTINCT o.user_id)` so repeat buyers are counted once in `unique_buyers`.',
      'Filter `o.status = \'completed\'` before grouping by `u.country`.',
    ],
    solutionSql: `SELECT
  u.country,
  COUNT(DISTINCT o.user_id) AS unique_buyers,
  COUNT(*) AS completed_orders
FROM users u
INNER JOIN orders o
  ON u.user_id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.country
ORDER BY unique_buyers DESC, completed_orders DESC, u.country ASC;`,
    explanation:
      'Separating `COUNT(DISTINCT user_id)` from `COUNT(*)` distinguishes market breadth (buyer count) from repeat purchase depth.',
    orderMatters: true,
  },
  {
    id: 'e20-top-rated-products-having',
    title: 'Well-Reviewed Products (>= 3 Reviews & Avg >= 4.5)',
    difficulty: 'Easy',
    concepts: ['GROUP BY', 'HAVING', 'INNER JOIN'],
    stakeholder: 'Product Marketing',
    scenario:
      'Product Marketing wants to highlight products with strong, credible customer satisfaction: at least 3 reviews and an average rating of 4.5 stars or higher.',
    requirements: [
      'Join `product_reviews pr` and `products p` on `product_id`.',
      'Group by `p.product_id, p.product_name, p.category`.',
      'Keep products with `HAVING COUNT(*) >= 3 AND AVG(pr.rating) >= 4.5`.',
      'Return `product_name`, `category`, `review_count`, and `avg_rating` (`ROUND(AVG(pr.rating), 2)`), ordered by `avg_rating DESC, review_count DESC, product_name ASC`.',
    ],
    expectedColumns: [
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Category' },
      { name: 'review_count', type: 'INTEGER', description: 'Number of reviews (>= 3)' },
      { name: 'avg_rating', type: 'REAL', description: 'Average rating (>= 4.5)' },
    ],
    starterSql: `SELECT
  p.product_name,
  p.category,
  COUNT(*) AS review_count,
  ROUND(AVG(pr.rating), 2) AS avg_rating
FROM product_reviews pr
INNER JOIN products p ON pr.product_id = p.product_id
GROUP BY p.product_id, p.product_name, p.category
HAVING ...`,
    hints: [
      'Remember `AVG(pr.rating)` in SQLite returns float when integer ratings are averaged.',
      'Combine both thresholds in `HAVING COUNT(*) >= 3 AND AVG(pr.rating) >= 4.5`.',
    ],
    solutionSql: `SELECT
  p.product_name,
  p.category,
  COUNT(*) AS review_count,
  ROUND(AVG(pr.rating), 2) AS avg_rating
FROM product_reviews pr
INNER JOIN products p
  ON pr.product_id = p.product_id
GROUP BY p.product_id, p.product_name, p.category
HAVING COUNT(*) >= 3
   AND AVG(pr.rating) >= 4.5
ORDER BY avg_rating DESC, review_count DESC, p.product_name ASC;`,
    explanation:
      'Applying both sample-size (`COUNT(*) >= 3`) and score (`AVG >= 4.5`) filters in `HAVING` prevents single-review outliers from dominating badges.',
    orderMatters: true,
  },
  {
    id: 'e21-anonymous-vs-authenticated-events',
    title: 'Anonymous vs. Authenticated Web Traffic',
    difficulty: 'Easy',
    concepts: ['CASE WHEN', 'IS NULL', 'COUNT DISTINCT'],
    stakeholder: 'Product Analytics',
    scenario:
      'Product Analytics wants to quantify how much telemetry comes from logged-in users (`user_id IS NOT NULL`) versus anonymous visitors (`user_id IS NULL`).',
    requirements: [
      'Classify each event in `web_events` using `CASE WHEN user_id IS NULL THEN \'Anonymous\' ELSE \'Authenticated\' END AS visitor_type`.',
      'Return `visitor_type`, `event_count` (`COUNT(*)`), and `session_count` (`COUNT(DISTINCT session_id)`).',
      'Order by `event_count DESC`.',
    ],
    expectedColumns: [
      { name: 'visitor_type', type: 'TEXT', description: 'Anonymous or Authenticated' },
      { name: 'event_count', type: 'INTEGER', description: 'Total events' },
      { name: 'session_count', type: 'INTEGER', description: 'Distinct sessions' },
    ],
    starterSql: `SELECT
  CASE WHEN user_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END AS visitor_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS session_count
FROM web_events
GROUP BY ...`,
    hints: [
      'Use `user_id IS NULL` inside `CASE WHEN`.',
      'Group by the `visitor_type` expression and order by `event_count DESC`.',
    ],
    solutionSql: `SELECT
  CASE WHEN user_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END AS visitor_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS session_count
FROM web_events
GROUP BY CASE WHEN user_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END
ORDER BY event_count DESC;`,
    explanation:
      'Checking `IS NULL` inside `CASE WHEN` lets you segment nullable foreign-key telemetry cleanly.',
    orderMatters: true,
  },
  {
    id: 'e22-engaged-sessions-having',
    title: 'Highly Engaged Web Sessions (>= 4 Events)',
    difficulty: 'Easy',
    concepts: ['GROUP BY', 'HAVING', 'MIN/MAX'],
    stakeholder: 'Growth Engineering',
    scenario:
      'Growth Engineering wants to inspect deep browsing sessions that recorded at least 4 events, along with their first and last event timestamps.',
    requirements: [
      'Group `web_events` by `session_id` and `device_type`.',
      'Keep sessions with `HAVING COUNT(*) >= 4`.',
      'Return `session_id`, `device_type`, `event_count`, `first_event_at` (`MIN(event_timestamp)`), and `last_event_at` (`MAX(event_timestamp)`).',
      'Order by `event_count DESC`, `session_id ASC`.',
    ],
    expectedColumns: [
      { name: 'session_id', type: 'TEXT', description: 'Session identifier' },
      { name: 'device_type', type: 'TEXT', description: 'Device type' },
      { name: 'event_count', type: 'INTEGER', description: 'Events in session (>= 4)' },
      { name: 'first_event_at', type: 'TEXT', description: 'Earliest timestamp' },
      { name: 'last_event_at', type: 'TEXT', description: 'Latest timestamp' },
    ],
    starterSql: `SELECT
  session_id,
  device_type,
  COUNT(*) AS event_count,
  MIN(event_timestamp) AS first_event_at,
  MAX(event_timestamp) AS last_event_at
FROM web_events
GROUP BY session_id, device_type
HAVING ...`,
    hints: [
      'Use `MIN(event_timestamp)` and `MAX(event_timestamp)` to find session boundaries.',
      'Filter with `HAVING COUNT(*) >= 4`.',
    ],
    solutionSql: `SELECT
  session_id,
  device_type,
  COUNT(*) AS event_count,
  MIN(event_timestamp) AS first_event_at,
  MAX(event_timestamp) AS last_event_at
FROM web_events
GROUP BY session_id, device_type
HAVING COUNT(*) >= 4
ORDER BY event_count DESC, session_id ASC;`,
    explanation:
      'Grouping clickstream hits by `session_id` turns raw event logs into session-level summaries.',
    orderMatters: true,
  },
  {
    id: 'e23-monthly-signup-velocity-2025',
    title: '2025 Monthly User Signup Velocity',
    difficulty: 'Easy',
    concepts: ['strftime', 'BETWEEN', 'GROUP BY'],
    stakeholder: 'Executive Team',
    scenario:
      'Track how many new users signed up each calendar month throughout 2025 (`2025-01` through `2025-12`).',
    requirements: [
      'Filter `users` where `signup_date BETWEEN \'2025-01-01\' AND \'2025-12-31\'`.',
      'Group by `strftime(\'%Y-%m\', signup_date) AS signup_month`.',
      'Return `signup_month` and `new_users` (`COUNT(*)`), ordered by `signup_month ASC`.',
    ],
    expectedColumns: [
      { name: 'signup_month', type: 'TEXT', description: 'Month (YYYY-MM)' },
      { name: 'new_users', type: 'INTEGER', description: 'Users registered' },
    ],
    starterSql: `SELECT
  strftime('%Y-%m', signup_date) AS signup_month,
  COUNT(*) AS new_users
FROM users
WHERE ...`,
    hints: [
      'Extract `YYYY-MM` with `strftime(\'%Y-%m\', signup_date)`.',
      'Sort chronologically with `ORDER BY signup_month ASC`.',
    ],
    solutionSql: `SELECT
  strftime('%Y-%m', signup_date) AS signup_month,
  COUNT(*) AS new_users
FROM users
WHERE signup_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY strftime('%Y-%m', signup_date)
ORDER BY signup_month ASC;`,
    explanation:
      '`strftime(\'%Y-%m\', ...)` buckets daily signup dates into clean monthly cohorts.',
    orderMatters: true,
  },
  {
    id: 'e24-most-helpful-reviews',
    title: 'Top Helpful Verified Product Reviews (>= 10 Votes)',
    difficulty: 'Easy',
    concepts: ['Multi-Table JOIN', 'WHERE', 'ORDER BY'],
    stakeholder: 'Community Team',
    scenario:
      'Community wants to feature our most helpful verified customer reviews (`verified_purchase = 1` and `helpful_votes >= 10`) on product landing pages.',
    requirements: [
      'Join `product_reviews pr`, `products p`, and `users u`.',
      'Filter `pr.verified_purchase = 1` and `pr.helpful_votes >= 10`.',
      'Return `review_id`, `product_name`, `full_name`, `rating`, and `helpful_votes`.',
      'Order by `helpful_votes DESC`, `review_id ASC`.',
    ],
    expectedColumns: [
      { name: 'review_id', type: 'INTEGER', description: 'Review ID' },
      { name: 'product_name', type: 'TEXT', description: 'Reviewed product' },
      { name: 'full_name', type: 'TEXT', description: 'Reviewer name' },
      { name: 'rating', type: 'INTEGER', description: 'Star rating (1–5)' },
      { name: 'helpful_votes', type: 'INTEGER', description: 'Helpful vote count (>= 10)' },
    ],
    starterSql: `SELECT
  pr.review_id,
  p.product_name,
  u.full_name,
  pr.rating,
  pr.helpful_votes
FROM product_reviews pr
INNER JOIN products p ON pr.product_id = p.product_id
INNER JOIN users u ON pr.user_id = u.user_id
WHERE ...`,
    hints: [
      'Join `product_reviews` to both `products` and `users`.',
      'Filter `pr.verified_purchase = 1 AND pr.helpful_votes >= 10`.',
    ],
    solutionSql: `SELECT
  pr.review_id,
  p.product_name,
  u.full_name,
  pr.rating,
  pr.helpful_votes
FROM product_reviews pr
INNER JOIN products p
  ON pr.product_id = p.product_id
INNER JOIN users u
  ON pr.user_id = u.user_id
WHERE pr.verified_purchase = 1
  AND pr.helpful_votes >= 10
ORDER BY pr.helpful_votes DESC, pr.review_id ASC;`,
    explanation:
      'Joining review facts to product and user dimensions surfaces high-signal customer testimonials.',
    orderMatters: true,
  },
  {
    id: 'e25-order-tickets-by-order-status',
    title: 'Support Tickets Grouped by Linked Order Status',
    difficulty: 'Easy',
    concepts: ['INNER JOIN', 'GROUP BY', 'COUNT'],
    stakeholder: 'Operations',
    scenario:
      'Operations wants to know how many order-linked support tickets correspond to `completed`, `refunded`, `pending`, and `cancelled` orders.',
    requirements: [
      'Join `support_tickets st` with `orders o` on `st.order_id = o.order_id` (excluding non-order tickets).',
      'Group by `o.status`.',
      'Return `order_status` (`o.status`), `ticket_count` (`COUNT(*)`), and `distinct_orders` (`COUNT(DISTINCT o.order_id)`).',
      'Order by `ticket_count DESC`, `order_status ASC`.',
    ],
    expectedColumns: [
      { name: 'order_status', type: 'TEXT', description: 'Status of linked order' },
      { name: 'ticket_count', type: 'INTEGER', description: 'Support tickets linked' },
      { name: 'distinct_orders', type: 'INTEGER', description: 'Distinct orders with tickets' },
    ],
    starterSql: `SELECT
  o.status AS order_status,
  COUNT(*) AS ticket_count,
  COUNT(DISTINCT o.order_id) AS distinct_orders
FROM support_tickets st
INNER JOIN orders o ON st.order_id = o.order_id
GROUP BY o.status
ORDER BY ticket_count DESC, order_status ASC;`,
    hints: [
      'An `INNER JOIN` on `st.order_id = o.order_id` automatically excludes tickets with `order_id IS NULL`.',
      'Notice some refunded orders have multiple tickets, so `ticket_count` > `distinct_orders`.',
    ],
    solutionSql: `SELECT
  o.status AS order_status,
  COUNT(*) AS ticket_count,
  COUNT(DISTINCT o.order_id) AS distinct_orders
FROM support_tickets st
INNER JOIN orders o
  ON st.order_id = o.order_id
GROUP BY o.status
ORDER BY ticket_count DESC, order_status ASC;`,
    explanation:
      'Joining nullable foreign keys with `INNER JOIN` cleanly focuses on order-related support volume.',
    orderMatters: true,
  },
  {
    id: 'e26-promo-orders-outside-campaign-dates',
    title: 'Completed Promo Orders Without a Matching Campaign Window',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'IS NULL', 'BETWEEN'],
    stakeholder: 'Marketing Attribution',
    scenario:
      'Attribution Audit found some customers used promo codes on dates when no corresponding campaign in `marketing_campaigns` was active. Find every completed order with a non-NULL `discount_code` that does NOT fall inside a matching `marketing_campaigns` flight window.',
    requirements: [
      '`LEFT JOIN` `orders o` to `marketing_campaigns mc` on `o.discount_code = mc.promo_code AND o.order_date BETWEEN mc.start_date AND mc.end_date`.',
      'Filter `o.status = \'completed\'`, `o.discount_code IS NOT NULL`, and `mc.campaign_id IS NULL`.',
      'Return `order_id`, `order_date`, `discount_code`, and `total_amount`, ordered by `order_date ASC, order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Order ID' },
      { name: 'order_date', type: 'TEXT', description: 'Order date' },
      { name: 'discount_code', type: 'TEXT', description: 'Used promo code' },
      { name: 'total_amount', type: 'REAL', description: 'Order amount' },
    ],
    starterSql: `SELECT
  o.order_id,
  o.order_date,
  o.discount_code,
  o.total_amount
FROM orders o
LEFT JOIN marketing_campaigns mc
  ON o.discount_code = mc.promo_code
  AND o.order_date BETWEEN mc.start_date AND mc.end_date
WHERE ...`,
    hints: [
      'Keep the date-range check inside the `LEFT JOIN ... ON` clause.',
      'Filter `WHERE o.status = \'completed\' AND o.discount_code IS NOT NULL AND mc.campaign_id IS NULL`.',
    ],
    solutionSql: `SELECT
  o.order_id,
  o.order_date,
  o.discount_code,
  o.total_amount
FROM orders o
LEFT JOIN marketing_campaigns mc
  ON o.discount_code = mc.promo_code
  AND o.order_date BETWEEN mc.start_date AND mc.end_date
WHERE o.status = 'completed'
  AND o.discount_code IS NOT NULL
  AND mc.campaign_id IS NULL
ORDER BY o.order_date ASC, o.order_id ASC;`,
    explanation:
      'A range-based left anti-join catches promo code leakage outside scheduled campaign flight dates.',
    orderMatters: true,
  },
  {
    id: 'e27-customer-frequency-buckets',
    title: 'Customer Segmentation by Completed Order Count',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'CASE WHEN', 'Subquery'],
    stakeholder: 'CRM Team',
    scenario:
      'CRM wants to group all 42 registered users into 3 buyer segments based on their lifetime completed order count: `0 Orders`, `1–2 Orders`, or `3+ Orders`.',
    requirements: [
      'First count completed orders per user (`LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = \'completed\'`).',
      'Bucket each user with `CASE WHEN order_cnt = 0 THEN \'0 Orders\' WHEN order_cnt <= 2 THEN \'1-2 Orders\' ELSE \'3+ Orders\' END AS buyer_segment`.',
      'Return `buyer_segment` and `user_count`, ordered by `user_count DESC, buyer_segment ASC`.',
    ],
    expectedColumns: [
      { name: 'buyer_segment', type: 'TEXT', description: '0 Orders, 1-2 Orders, or 3+ Orders' },
      { name: 'user_count', type: 'INTEGER', description: 'Users in segment' },
    ],
    starterSql: `SELECT
  CASE
    WHEN completed_cnt = 0 THEN '0 Orders'
    WHEN completed_cnt <= 2 THEN '1-2 Orders'
    ELSE '3+ Orders'
  END AS buyer_segment,
  COUNT(*) AS user_count
FROM (
  SELECT u.user_id, COUNT(o.order_id) AS completed_cnt
  FROM users u
  LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = 'completed'
  GROUP BY u.user_id
)
GROUP BY buyer_segment
ORDER BY user_count DESC, buyer_segment ASC;`,
    hints: [
      'Count `o.order_id` (not `*`) after `LEFT JOIN` so non-buyers get `0`.',
      'Aggregate the per-user subquery by `buyer_segment`.',
    ],
    solutionSql: `SELECT
  CASE
    WHEN completed_cnt = 0 THEN '0 Orders'
    WHEN completed_cnt <= 2 THEN '1-2 Orders'
    ELSE '3+ Orders'
  END AS buyer_segment,
  COUNT(*) AS user_count
FROM (
  SELECT
    u.user_id,
    COUNT(o.order_id) AS completed_cnt
  FROM users u
  LEFT JOIN orders o
    ON u.user_id = o.user_id
    AND o.status = 'completed'
  GROUP BY u.user_id
)
GROUP BY buyer_segment
ORDER BY user_count DESC, buyer_segment ASC;`,
    explanation:
      'Two-step aggregation (per user, then per bucket) cleanly creates customer frequency distributions.',
    orderMatters: true,
  },
  {
    id: 'e28-country-aov-min-max',
    title: 'Order Value Spread (Min, Avg, Max) by Country',
    difficulty: 'Easy',
    concepts: ['MIN/MAX', 'AVG', 'INNER JOIN'],
    stakeholder: 'Pricing Team',
    scenario:
      'Pricing wants to see the spread of completed order sizes (minimum, average, and maximum `total_amount`) across each country.',
    requirements: [
      'Join `orders o` and `users u` on `user_id`, keeping `o.status = \'completed\'`.',
      'Group by `u.country`.',
      'Return `country`, `min_order`, `avg_order` (rounded to 2 decimals), and `max_order`.',
      'Order by `avg_order DESC`, `country ASC`.',
    ],
    expectedColumns: [
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'min_order', type: 'REAL', description: 'Smallest completed order' },
      { name: 'avg_order', type: 'REAL', description: 'Average completed order (2 decimals)' },
      { name: 'max_order', type: 'REAL', description: 'Largest completed order' },
    ],
    starterSql: `SELECT
  u.country,
  MIN(o.total_amount) AS min_order,
  ROUND(AVG(o.total_amount), 2) AS avg_order,
  MAX(o.total_amount) AS max_order
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
WHERE ...`,
    hints: [
      'Filter `WHERE o.status = \'completed\'`.',
      'Group by `u.country` and sort by `avg_order DESC, u.country ASC`.',
    ],
    solutionSql: `SELECT
  u.country,
  MIN(o.total_amount) AS min_order,
  ROUND(AVG(o.total_amount), 2) AS avg_order,
  MAX(o.total_amount) AS max_order
FROM orders o
INNER JOIN users u
  ON o.user_id = u.user_id
WHERE o.status = 'completed'
GROUP BY u.country
ORDER BY avg_order DESC, u.country ASC;`,
    explanation:
      'Using `MIN`, `AVG`, and `MAX` together reveals regional ticket-size dispersion.',
    orderMatters: true,
  },
  {
    id: 'e29-checkout-starts-by-device',
    title: 'Checkout Start Events by Device Type',
    difficulty: 'Easy',
    concepts: ['WHERE', 'GROUP BY', 'COUNT DISTINCT'],
    stakeholder: 'E-Commerce Product',
    scenario:
      'E-Commerce Product wants to know how many `checkout_start` events and unique sessions occurred on desktop, mobile, and tablet.',
    requirements: [
      'Filter `web_events` to `event_name = \'checkout_start\'`.',
      'Group by `device_type`.',
      'Return `device_type`, `checkout_events`, and `unique_sessions` (`COUNT(DISTINCT session_id)`).',
      'Order by `checkout_events DESC`, `device_type ASC`.',
    ],
    expectedColumns: [
      { name: 'device_type', type: 'TEXT', description: 'desktop, mobile, or tablet' },
      { name: 'checkout_events', type: 'INTEGER', description: 'Total checkout_start events' },
      { name: 'unique_sessions', type: 'INTEGER', description: 'Distinct sessions reaching checkout' },
    ],
    starterSql: `SELECT
  device_type,
  COUNT(*) AS checkout_events,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM web_events
WHERE ...`,
    hints: [
      'Filter `WHERE event_name = \'checkout_start\'` before grouping.',
      'Group by `device_type`.',
    ],
    solutionSql: `SELECT
  device_type,
  COUNT(*) AS checkout_events,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM web_events
WHERE event_name = 'checkout_start'
GROUP BY device_type
ORDER BY checkout_events DESC, device_type ASC;`,
    explanation:
      'Filtering on a specific funnel event isolates checkout intent across device form factors.',
    orderMatters: true,
  },
  {
    id: 'e30-users-multiple-subscriptions',
    title: 'Customers With Multiple Subscription Records',
    difficulty: 'Easy',
    concepts: ['GROUP BY', 'HAVING', 'INNER JOIN'],
    stakeholder: 'SaaS Finance',
    scenario:
      'SaaS Finance wants to audit accounts that have had 2 or more subscription records over time (due to upgrades, downgrades, or re-subscriptions).',
    requirements: [
      'Join `subscriptions s` and `users u` on `user_id`.',
      'Group by `u.user_id, u.full_name, u.country`.',
      'Keep users with `HAVING COUNT(*) >= 2`.',
      'Return `user_id`, `full_name`, `country`, `sub_count`, and `first_sub_date` (`MIN(s.start_date)`), ordered by `sub_count DESC, u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'sub_count', type: 'INTEGER', description: 'Subscription records (>= 2)' },
      { name: 'first_sub_date', type: 'TEXT', description: 'Earliest subscription start date' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(*) AS sub_count,
  MIN(s.start_date) AS first_sub_date
FROM subscriptions s
INNER JOIN users u ON s.user_id = u.user_id
GROUP BY u.user_id, u.full_name, u.country
HAVING ...`,
    hints: [
      'Use `HAVING COUNT(*) >= 2` after grouping by user attributes.',
      'Use `MIN(s.start_date)` to find when the customer first subscribed.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(*) AS sub_count,
  MIN(s.start_date) AS first_sub_date
FROM subscriptions s
INNER JOIN users u
  ON s.user_id = u.user_id
GROUP BY u.user_id, u.full_name, u.country
HAVING COUNT(*) >= 2
ORDER BY sub_count DESC, u.user_id ASC;`,
    explanation:
      'Grouping subscription history by `user_id` with `HAVING COUNT(*) >= 2` surfaces accounts with plan transitions.',
    orderMatters: true,
  },
  {
    id: 'e31-product-unit-markup',
    title: 'Catalog Unit Markup & Profit Per Unit',
    difficulty: 'Easy',
    concepts: ['INNER JOIN', 'Arithmetic', 'GROUP BY'],
    stakeholder: 'Pricing Strategy',
    scenario:
      'Pricing Strategy wants to verify the average selling price (`unit_price`) vs. catalog `cost_price` and unit dollar markup for every product sold in completed orders.',
    requirements: [
      'Join `products p`, `order_items oi`, and `orders o` (`o.status = \'completed\'`).',
      'Group by `p.product_id, p.product_name, p.cost_price`.',
      'Compute `avg_selling_price` (`ROUND(AVG(oi.unit_price), 2)`) and `unit_markup` (`ROUND(AVG(oi.unit_price) - p.cost_price, 2)`).',
      'Order by `unit_markup DESC`, `p.product_id ASC`.',
    ],
    expectedColumns: [
      { name: 'product_id', type: 'INTEGER', description: 'Product ID' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'cost_price', type: 'REAL', description: 'Catalog COGS' },
      { name: 'avg_selling_price', type: 'REAL', description: 'Average unit selling price' },
      { name: 'unit_markup', type: 'REAL', description: 'Avg selling price minus cost_price' },
    ],
    starterSql: `SELECT
  p.product_id,
  p.product_name,
  p.cost_price,
  ROUND(AVG(oi.unit_price), 2) AS avg_selling_price,
  ROUND(AVG(oi.unit_price) - p.cost_price, 2) AS unit_markup
FROM products p
INNER JOIN order_items oi ON p.product_id = oi.product_id
INNER JOIN orders o ON oi.order_id = o.order_id
WHERE ...`,
    hints: [
      'Filter `o.status = \'completed\'` before grouping.',
      'Include `p.cost_price` in the `GROUP BY` clause.',
    ],
    solutionSql: `SELECT
  p.product_id,
  p.product_name,
  p.cost_price,
  ROUND(AVG(oi.unit_price), 2) AS avg_selling_price,
  ROUND(AVG(oi.unit_price) - p.cost_price, 2) AS unit_markup
FROM products p
INNER JOIN order_items oi
  ON p.product_id = oi.product_id
INNER JOIN orders o
  ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY p.product_id, p.product_name, p.cost_price
ORDER BY unit_markup DESC, p.product_id ASC;`,
    explanation:
      'Comparing `AVG(oi.unit_price)` to `p.cost_price` checks catalog unit economics cleanly.',
    orderMatters: true,
  },
  {
    id: 'e32-low-csat-tickets-audit',
    title: 'Low-CSAT Support Tickets Audit (Score <= 2)',
    difficulty: 'Easy',
    concepts: ['INNER JOIN', 'WHERE', 'ORDER BY'],
    stakeholder: 'VP of Support',
    scenario:
      'The VP of Support wants to personally review every ticket that received a CSAT score of 1 or 2 (`satisfaction_score <= 2`) along with the customer’s email and plan tier.',
    requirements: [
      'Join `support_tickets st` with `users u` on `user_id`.',
      'Filter `st.satisfaction_score <= 2` (note `NULL` rows are automatically excluded).',
      'Return `ticket_id`, `full_name`, `email`, `plan_tier`, `category`, and `satisfaction_score`.',
      'Order by `satisfaction_score ASC`, `ticket_id ASC`.',
    ],
    expectedColumns: [
      { name: 'ticket_id', type: 'INTEGER', description: 'Ticket ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'email', type: 'TEXT', description: 'Customer email' },
      { name: 'plan_tier', type: 'TEXT', description: 'Customer plan tier' },
      { name: 'category', type: 'TEXT', description: 'Ticket category' },
      { name: 'satisfaction_score', type: 'INTEGER', description: 'CSAT 1 or 2' },
    ],
    starterSql: `SELECT
  st.ticket_id,
  u.full_name,
  u.email,
  u.plan_tier,
  st.category,
  st.satisfaction_score
FROM support_tickets st
INNER JOIN users u ON st.user_id = u.user_id
WHERE ...`,
    hints: [
      'Use `st.satisfaction_score <= 2`.',
      'Sort lowest satisfaction first (`st.satisfaction_score ASC, st.ticket_id ASC`).',
    ],
    solutionSql: `SELECT
  st.ticket_id,
  u.full_name,
  u.email,
  u.plan_tier,
  st.category,
  st.satisfaction_score
FROM support_tickets st
INNER JOIN users u
  ON st.user_id = u.user_id
WHERE st.satisfaction_score <= 2
ORDER BY st.satisfaction_score ASC, st.ticket_id ASC;`,
    explanation:
      'Relational comparisons like `<= 2` ignore `NULL`s automatically and surface dissatisfied customer interactions.',
    orderMatters: true,
  },
  {
    id: 'e33-annual-revenue-summary',
    title: 'Annual Completed Order Volume & Revenue (2025 vs 2026)',
    difficulty: 'Easy',
    concepts: ['strftime', 'GROUP BY', 'SUM'],
    stakeholder: 'FP&A Finance',
    scenario:
      'Summarize total completed orders, total completed revenue, and average order value by calendar year (`2025` vs `2026` YTD).',
    requirements: [
      'Filter `orders` to `status = \'completed\'`.',
      'Group by `strftime(\'%Y\', order_date) AS order_year`.',
      'Return `order_year`, `order_count`, `total_revenue` (`ROUND(SUM(total_amount), 2)`), and `avg_order_value` (`ROUND(AVG(total_amount), 2)`).',
      'Order by `order_year ASC`.',
    ],
    expectedColumns: [
      { name: 'order_year', type: 'TEXT', description: 'Calendar year (2025 or 2026)' },
      { name: 'order_count', type: 'INTEGER', description: 'Completed order count' },
      { name: 'total_revenue', type: 'REAL', description: 'Completed revenue (USD)' },
      { name: 'avg_order_value', type: 'REAL', description: 'Average order value (USD)' },
    ],
    starterSql: `SELECT
  strftime('%Y', order_date) AS order_year,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_revenue,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE ...`,
    hints: [
      'Extract year with `strftime(\'%Y\', order_date)`.',
      'Filter `WHERE status = \'completed\'` and order by `order_year ASC`.',
    ],
    solutionSql: `SELECT
  strftime('%Y', order_date) AS order_year,
  COUNT(*) AS order_count,
  ROUND(SUM(total_amount), 2) AS total_revenue,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY strftime('%Y', order_date)
ORDER BY order_year ASC;`,
    explanation:
      'Extracting `%Y` with `strftime` gives a clean year-level executive summary.',
    orderMatters: true,
  },
  {
    id: 'e34-users-with-orders-and-reviews',
    title: 'Advocate Buyers Who Also Left Product Reviews',
    difficulty: 'Easy',
    concepts: ['EXISTS', 'Subquery', 'WHERE'],
    stakeholder: 'Advocacy Marketing',
    scenario:
      'Advocacy Marketing wants a list of users who have BOTH at least one completed order in `orders` AND at least one review in `product_reviews`.',
    requirements: [
      'Query `users u` using two `EXISTS (...)` predicates (avoiding row multiplication from joining two 1-to-many tables).',
      'Check `EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id AND o.status = \'completed\')` and `EXISTS (SELECT 1 FROM product_reviews pr WHERE pr.user_id = u.user_id)`.',
      'Return `user_id`, `full_name`, `country`, and `plan_tier`, ordered by `user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'plan_tier', type: 'TEXT', description: 'Plan tier' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.user_id AND o.status = 'completed'
)
  AND EXISTS (
    ...
  )
ORDER BY u.user_id ASC;`,
    hints: [
      '`EXISTS` stops scanning as soon as one matching row is found and never duplicates `users` rows.',
      'Add the second `EXISTS` checking `product_reviews pr WHERE pr.user_id = u.user_id`.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  u.plan_tier
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.user_id = u.user_id
    AND o.status = 'completed'
)
  AND EXISTS (
    SELECT 1
    FROM product_reviews pr
    WHERE pr.user_id = u.user_id
  )
ORDER BY u.user_id ASC;`,
    explanation:
      'Using `EXISTS` avoids the Cartesian row duplication that occurs when joining two child tables directly to `users`.',
    orderMatters: true,
  },
  {
    id: 'e35-high-budget-campaigns',
    title: 'High-Budget Campaigns (>= $3,000 Ad Spend)',
    difficulty: 'Easy',
    concepts: ['WHERE', 'ORDER BY', 'Arithmetic'],
    stakeholder: 'Finance Audit',
    scenario:
      'Finance Audit wants every marketing campaign with a budget of at least $3,000 along with its campaign duration in days.',
    requirements: [
      'Filter `marketing_campaigns` where `spend_usd >= 3000`.',
      'Compute `duration_days` using `CAST(julianday(end_date) - julianday(start_date) + 1 AS INTEGER)`.',
      'Return `campaign_id`, `campaign_name`, `channel`, `spend_usd`, and `duration_days`.',
      'Order by `spend_usd DESC`, `campaign_id ASC`.',
    ],
    expectedColumns: [
      { name: 'campaign_id', type: 'INTEGER', description: 'Campaign ID' },
      { name: 'campaign_name', type: 'TEXT', description: 'Campaign name' },
      { name: 'channel', type: 'TEXT', description: 'Marketing channel' },
      { name: 'spend_usd', type: 'REAL', description: 'Ad spend (>= 3000)' },
      { name: 'duration_days', type: 'INTEGER', description: 'Inclusive flight days' },
    ],
    starterSql: `SELECT
  campaign_id,
  campaign_name,
  channel,
  spend_usd,
  CAST(julianday(end_date) - julianday(start_date) + 1 AS INTEGER) AS duration_days
FROM marketing_campaigns
WHERE ...`,
    hints: [
      '`julianday(end_date) - julianday(start_date) + 1` calculates inclusive calendar days.',
      'Filter `WHERE spend_usd >= 3000`.',
    ],
    solutionSql: `SELECT
  campaign_id,
  campaign_name,
  channel,
  spend_usd,
  CAST(julianday(end_date) - julianday(start_date) + 1 AS INTEGER) AS duration_days
FROM marketing_campaigns
WHERE spend_usd >= 3000
ORDER BY spend_usd DESC, campaign_id ASC;`,
    explanation:
      'SQLite’s `julianday()` converts date strings into Julian day counts for exact date-difference math.',
    orderMatters: true,
  },
  {
    id: 'e36-silent-refunded-orders',
    title: 'Refunded Orders Without Any Support Ticket',
    difficulty: 'Easy',
    concepts: ['LEFT JOIN', 'Anti-Join', 'WHERE'],
    stakeholder: 'Fraud & Risk',
    scenario:
      'Risk Ops wants to flag refunded orders that have no linked support ticket in `support_tickets` (possible silent chargebacks or self-serve refunds).',
    requirements: [
      '`LEFT JOIN` `orders o` to `support_tickets st` on `o.order_id = st.order_id`.',
      'Filter `o.status = \'refunded\'` and `st.ticket_id IS NULL`.',
      'Return `order_id`, `user_id`, `order_date`, and `total_amount`, ordered by `order_date ASC, order_id ASC`.',
    ],
    expectedColumns: [
      { name: 'order_id', type: 'INTEGER', description: 'Refunded order ID' },
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'order_date', type: 'TEXT', description: 'Order date' },
      { name: 'total_amount', type: 'REAL', description: 'Refunded amount' },
    ],
    starterSql: `SELECT
  o.order_id,
  o.user_id,
  o.order_date,
  o.total_amount
FROM orders o
LEFT JOIN support_tickets st ON o.order_id = st.order_id
WHERE ...`,
    hints: [
      'Filter `o.status = \'refunded\' AND st.ticket_id IS NULL`.',
      'Sort by `o.order_date ASC, o.order_id ASC`.',
    ],
    solutionSql: `SELECT
  o.order_id,
  o.user_id,
  o.order_date,
  o.total_amount
FROM orders o
LEFT JOIN support_tickets st
  ON o.order_id = st.order_id
WHERE o.status = 'refunded'
  AND st.ticket_id IS NULL
ORDER BY o.order_date ASC, o.order_id ASC;`,
    explanation:
      'An anti-join between `orders` and `support_tickets` detects refunds that bypassed the support workflow.',
    orderMatters: true,
  },
  {
    id: 'e37-web-event-frequency',
    title: 'Clickstream Event & Session Reach Breakdown',
    difficulty: 'Easy',
    concepts: ['GROUP BY', 'COUNT DISTINCT', 'ORDER BY'],
    stakeholder: 'Product Analytics',
    scenario:
      'Get a baseline summary of every `event_name` in `web_events`, showing total event occurrences and how many distinct sessions triggered each event.',
    requirements: [
      'Group `web_events` by `event_name`.',
      'Return `event_name`, `total_events` (`COUNT(*)`), and `unique_sessions` (`COUNT(DISTINCT session_id)`).',
      'Order by `unique_sessions DESC`, `total_events DESC`, `event_name ASC`.',
    ],
    expectedColumns: [
      { name: 'event_name', type: 'TEXT', description: 'Event type' },
      { name: 'total_events', type: 'INTEGER', description: 'Total hits' },
      { name: 'unique_sessions', type: 'INTEGER', description: 'Distinct sessions' },
    ],
    starterSql: `SELECT
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM web_events
GROUP BY event_name
ORDER BY unique_sessions DESC, total_events DESC, event_name ASC;`,
    hints: [
      'Group by `event_name`.',
      'Use `COUNT(DISTINCT session_id)` for session reach.',
    ],
    solutionSql: `SELECT
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM web_events
GROUP BY event_name
ORDER BY unique_sessions DESC, total_events DESC, event_name ASC;`,
    explanation:
      'Grouping by `event_name` reveals top-of-funnel vs. bottom-of-funnel session volume at a glance.',
    orderMatters: true,
  },
  {
    id: 'e38-active-mrr-by-billing-cycle',
    title: 'Active SaaS MRR & ARR by Billing Cycle',
    difficulty: 'Easy',
    concepts: ['WHERE', 'GROUP BY', 'Arithmetic'],
    stakeholder: 'SaaS Finance',
    scenario:
      'SaaS Finance wants a breakdown of currently `active` subscriptions by `billing_cycle` (`monthly` vs `annual`), reporting subscription count, total MRR, and implied ARR (`SUM(mrr_amount) * 12`).',
    requirements: [
      'Filter `subscriptions` to `status = \'active\'`.',
      'Group by `billing_cycle`.',
      'Return `billing_cycle`, `active_subs` (`COUNT(*)`), `total_mrr` (`ROUND(SUM(mrr_amount), 2)`), and `implied_arr` (`ROUND(SUM(mrr_amount) * 12, 2)`).',
      'Order by `total_mrr DESC`.',
    ],
    expectedColumns: [
      { name: 'billing_cycle', type: 'TEXT', description: 'monthly or annual' },
      { name: 'active_subs', type: 'INTEGER', description: 'Active subscription count' },
      { name: 'total_mrr', type: 'REAL', description: 'Sum of active MRR' },
      { name: 'implied_arr', type: 'REAL', description: 'Annualized recurring revenue (MRR * 12)' },
    ],
    starterSql: `SELECT
  billing_cycle,
  COUNT(*) AS active_subs,
  ROUND(SUM(mrr_amount), 2) AS total_mrr,
  ROUND(SUM(mrr_amount) * 12, 2) AS implied_arr
FROM subscriptions
WHERE ...`,
    hints: [
      'Filter `WHERE status = \'active\'` before grouping.',
      'Multiply `SUM(mrr_amount)` by `12` to compute `implied_arr`.',
    ],
    solutionSql: `SELECT
  billing_cycle,
  COUNT(*) AS active_subs,
  ROUND(SUM(mrr_amount), 2) AS total_mrr,
  ROUND(SUM(mrr_amount) * 12, 2) AS implied_arr
FROM subscriptions
WHERE status = 'active'
GROUP BY billing_cycle
ORDER BY total_mrr DESC;`,
    explanation:
      'Filtering on `status = \'active\'` isolates live recurring revenue split by contract term.',
    orderMatters: true,
  },
  {
    id: 'e39-multi-promo-customers',
    title: 'Promo-Hoppers Using >= 2 Distinct Discount Codes',
    difficulty: 'Easy',
    concepts: ['COUNT DISTINCT', 'HAVING', 'INNER JOIN'],
    stakeholder: 'Growth Marketing',
    scenario:
      'Growth wants to find repeat buyers who used at least 2 different `discount_code` values across their completed orders.',
    requirements: [
      'Join `orders o` and `users u` on `user_id`, keeping `o.status = \'completed\'` and `o.discount_code IS NOT NULL`.',
      'Group by `u.user_id, u.full_name, u.country`.',
      'Apply `HAVING COUNT(DISTINCT o.discount_code) >= 2`.',
      'Return `user_id`, `full_name`, `country`, and `distinct_promos`, ordered by `distinct_promos DESC, u.user_id ASC`.',
    ],
    expectedColumns: [
      { name: 'user_id', type: 'INTEGER', description: 'User ID' },
      { name: 'full_name', type: 'TEXT', description: 'Customer name' },
      { name: 'country', type: 'TEXT', description: 'Country code' },
      { name: 'distinct_promos', type: 'INTEGER', description: 'Distinct discount codes used (>= 2)' },
    ],
    starterSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(DISTINCT o.discount_code) AS distinct_promos
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
WHERE o.status = 'completed'
  AND o.discount_code IS NOT NULL
GROUP BY u.user_id, u.full_name, u.country
HAVING ...`,
    hints: [
      'Use `COUNT(DISTINCT o.discount_code)` inside `HAVING`.',
      'Exclude NULLs in `WHERE` with `o.discount_code IS NOT NULL`.',
    ],
    solutionSql: `SELECT
  u.user_id,
  u.full_name,
  u.country,
  COUNT(DISTINCT o.discount_code) AS distinct_promos
FROM orders o
INNER JOIN users u
  ON o.user_id = u.user_id
WHERE o.status = 'completed'
  AND o.discount_code IS NOT NULL
GROUP BY u.user_id, u.full_name, u.country
HAVING COUNT(DISTINCT o.discount_code) >= 2
ORDER BY distinct_promos DESC, u.user_id ASC;`,
    explanation:
      'Combining `COUNT(DISTINCT ...)` with `HAVING` surfaces bargain-hunting customers who stack multiple campaigns.',
    orderMatters: true,
  },
  {
    id: 'e40-products-not-purchased-2026',
    title: 'Catalog Products With Zero Sales in 2026',
    difficulty: 'Easy',
    concepts: ['NOT EXISTS', 'Subquery', 'Date Filtering'],
    stakeholder: 'Inventory & Catalog',
    scenario:
      'Catalog Ops wants to see which products have not appeared in any completed order during 2026 (`order_date >= \'2026-01-01\'`).',
    requirements: [
      'Query `products p` using `NOT EXISTS` (or `LEFT JOIN`) against 2026 completed `orders` + `order_items`.',
      'Return `product_id`, `product_name`, `category`, and `cost_price`.',
      'Order by `category ASC`, `product_id ASC`.',
    ],
    expectedColumns: [
      { name: 'product_id', type: 'INTEGER', description: 'Product ID' },
      { name: 'product_name', type: 'TEXT', description: 'Product name' },
      { name: 'category', type: 'TEXT', description: 'Product category' },
      { name: 'cost_price', type: 'REAL', description: 'Unit COGS' },
    ],
    starterSql: `SELECT
  p.product_id,
  p.product_name,
  p.category,
  p.cost_price
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.order_id
  WHERE oi.product_id = p.product_id
    AND o.status = 'completed'
    AND o.order_date >= '2026-01-01'
)
ORDER BY p.category ASC, p.product_id ASC;`,
    hints: [
      '`NOT EXISTS` is safer than `NOT IN` because it never breaks if NULLs are present.',
      'Make sure the subquery joins `order_items` to `orders` and checks `o.status = \'completed\'` and `o.order_date >= \'2026-01-01\'`.',
    ],
    solutionSql: `SELECT
  p.product_id,
  p.product_name,
  p.category,
  p.cost_price
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  INNER JOIN orders o
    ON oi.order_id = o.order_id
  WHERE oi.product_id = p.product_id
    AND o.status = 'completed'
    AND o.order_date >= '2026-01-01'
)
ORDER BY p.category ASC, p.product_id ASC;`,
    explanation:
      '`NOT EXISTS` isolates stale catalog SKUs with zero 2026 completed transactions.',
    orderMatters: true,
  },
];
