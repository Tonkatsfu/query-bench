import type { TableSchemaInfo } from '../types/sql';

export const EXTENDED_SCHEMA_METADATA: TableSchemaInfo[] = [
  {
    name: 'subscriptions',
    description: 'SaaS subscription lifecycle records tracking plan upgrades, billing cycles, MRR, and churn reasons.',
    columns: [
      { name: 'sub_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'user_id', type: 'INTEGER', nullable: false, foreignKey: { table: 'users', column: 'user_id' } },
      { name: 'plan_tier', type: 'TEXT', nullable: false, note: 'starter, pro, enterprise' },
      { name: 'billing_cycle', type: 'TEXT', nullable: false, note: 'monthly, annual' },
      { name: 'mrr_amount', type: 'REAL', nullable: false, note: 'Monthly recurring revenue (USD)' },
      { name: 'start_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
      { name: 'end_date', type: 'TEXT', nullable: true, note: 'NULL if active/trialing' },
      { name: 'status', type: 'TEXT', nullable: false, note: 'active, cancelled, past_due, trialing' },
      { name: 'cancel_reason', type: 'TEXT', nullable: true, note: 'Contains NULLs' },
    ],
  },
  {
    name: 'web_events',
    description: 'Clickstream funnel events across anonymous and logged-in sessions with device and UTM attribution.',
    columns: [
      { name: 'event_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'user_id', type: 'INTEGER', nullable: true, foreignKey: { table: 'users', column: 'user_id' }, note: 'NULL for anonymous visitors' },
      { name: 'session_id', type: 'TEXT', nullable: false },
      { name: 'event_name', type: 'TEXT', nullable: false, note: 'page_view, pricing_view, signup_start, add_to_cart, checkout_start, purchase, feature_used' },
      { name: 'event_timestamp', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD HH:MM:SS' },
      { name: 'device_type', type: 'TEXT', nullable: false, note: 'desktop, mobile, tablet' },
      { name: 'utm_source', type: 'TEXT', nullable: true, note: 'google, linkedin, newsletter, referral, or NULL' },
    ],
  },
  {
    name: 'support_tickets',
    description: 'Customer support queue linked to accounts and optionally to specific orders, with SLA timestamps and CSAT.',
    columns: [
      { name: 'ticket_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'user_id', type: 'INTEGER', nullable: false, foreignKey: { table: 'users', column: 'user_id' } },
      { name: 'order_id', type: 'INTEGER', nullable: true, foreignKey: { table: 'orders', column: 'order_id' }, note: 'NULL for non-order tickets' },
      { name: 'category', type: 'TEXT', nullable: false, note: 'billing, bug, shipping, refund_request, onboarding' },
      { name: 'priority', type: 'TEXT', nullable: false, note: 'low, medium, high, urgent' },
      { name: 'created_at', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD HH:MM:SS' },
      { name: 'resolved_at', type: 'TEXT', nullable: true, note: 'NULL if unresolved' },
      { name: 'satisfaction_score', type: 'INTEGER', nullable: true, note: '1–5 CSAT or NULL' },
    ],
  },
  {
    name: 'marketing_campaigns',
    description: 'Paid and lifecycle marketing campaigns with ad spend, promo codes, and flight windows.',
    columns: [
      { name: 'campaign_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'campaign_name', type: 'TEXT', nullable: false },
      { name: 'channel', type: 'TEXT', nullable: false },
      { name: 'promo_code', type: 'TEXT', nullable: true, note: 'Maps to orders.discount_code or NULL' },
      { name: 'spend_usd', type: 'REAL', nullable: false },
      { name: 'start_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
      { name: 'end_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
    ],
  },
  {
    name: 'product_reviews',
    description: 'Customer product ratings (1–5 stars), purchase verification flags, and helpfulness votes.',
    columns: [
      { name: 'review_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'product_id', type: 'INTEGER', nullable: false, foreignKey: { table: 'products', column: 'product_id' } },
      { name: 'user_id', type: 'INTEGER', nullable: false, foreignKey: { table: 'users', column: 'user_id' } },
      { name: 'rating', type: 'INTEGER', nullable: false, note: '1 to 5' },
      { name: 'review_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
      { name: 'verified_purchase', type: 'INTEGER', nullable: false, note: '1 = verified, 0 = unverified' },
      { name: 'helpful_votes', type: 'INTEGER', nullable: false },
    ],
  },
];

interface SubSeed {
  id: number;
  userId: number;
  tier: 'starter' | 'pro' | 'enterprise';
  cycle: 'monthly' | 'annual';
  mrr: number;
  start: string;
  end: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  reason: string | null;
}

const SUBSCRIPTIONS: SubSeed[] = [
  // Users with upgrades / multiple subscriptions
  { id: 2001, userId: 101, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-01-03', end: '2025-04-03', status: 'cancelled', reason: 'upgraded' },
  { id: 2002, userId: 101, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-04-04', end: null, status: 'active', reason: null },
  { id: 2003, userId: 102, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-01-05', end: '2025-05-05', status: 'cancelled', reason: 'upgraded' },
  { id: 2004, userId: 102, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-05-06', end: null, status: 'active', reason: null },
  { id: 2005, userId: 103, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-01-09', end: null, status: 'active', reason: null },
  { id: 2006, userId: 104, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-01-12', end: '2025-09-12', status: 'cancelled', reason: 'price' },
  { id: 2007, userId: 106, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-02-02', end: null, status: 'active', reason: null },
  { id: 2008, userId: 107, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-02-06', end: '2025-11-06', status: 'cancelled', reason: 'missing_features' },
  { id: 2009, userId: 107, tier: 'pro', cycle: 'annual', mrr: 129, start: '2026-01-10', end: null, status: 'active', reason: null },
  { id: 2010, userId: 108, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-02-11', end: null, status: 'past_due', reason: null },
  { id: 2011, userId: 109, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-02-15', end: '2025-07-15', status: 'cancelled', reason: null },
  { id: 2012, userId: 110, tier: 'starter', cycle: 'annual', mrr: 39, start: '2025-02-20', end: null, status: 'active', reason: null },
  { id: 2013, userId: 111, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-03-01', end: '2025-08-01', status: 'cancelled', reason: 'upgraded' },
  { id: 2014, userId: 111, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-08-02', end: null, status: 'active', reason: null },
  { id: 2015, userId: 112, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-03-04', end: null, status: 'active', reason: null },
  { id: 2016, userId: 113, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-03-09', end: '2026-01-25', status: 'cancelled', reason: 'budget_cuts' },
  { id: 2017, userId: 114, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-03-14', end: '2025-10-14', status: 'cancelled', reason: 'switched_competitor' },
  { id: 2018, userId: 116, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-04-03', end: null, status: 'active', reason: null },
  { id: 2019, userId: 117, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-04-08', end: null, status: 'active', reason: null },
  { id: 2020, userId: 118, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-04-12', end: '2025-08-12', status: 'cancelled', reason: 'price' },
  { id: 2021, userId: 119, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-04-19', end: null, status: 'active', reason: null },
  { id: 2022, userId: 120, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-05-02', end: null, status: 'active', reason: null },
  { id: 2023, userId: 121, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-05-07', end: null, status: 'active', reason: null },
  { id: 2024, userId: 122, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-05-14', end: null, status: 'past_due', reason: null },
  { id: 2025, userId: 124, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-06-04', end: '2026-01-04', status: 'cancelled', reason: 'downgraded' },
  { id: 2026, userId: 124, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2026-01-05', end: null, status: 'active', reason: null },
  { id: 2027, userId: 125, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-06-09', end: null, status: 'active', reason: null },
  { id: 2028, userId: 126, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-06-15', end: '2025-12-30', status: 'cancelled', reason: null },
  { id: 2029, userId: 127, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-06-23', end: null, status: 'active', reason: null },
  { id: 2030, userId: 128, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-07-10', end: '2025-10-10', status: 'cancelled', reason: 'upgraded' },
  { id: 2031, userId: 128, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2025-10-11', end: null, status: 'active', reason: null },
  { id: 2032, userId: 129, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2025-08-05', end: null, status: 'active', reason: null },
  { id: 2033, userId: 130, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-09-12', end: '2025-12-12', status: 'cancelled', reason: 'low_usage' },
  { id: 2034, userId: 131, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-10-03', end: null, status: 'active', reason: null },
  { id: 2035, userId: 132, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2025-11-11', end: null, status: 'active', reason: null },
  { id: 2036, userId: 133, tier: 'pro', cycle: 'annual', mrr: 129, start: '2025-12-02', end: null, status: 'active', reason: null },
  { id: 2037, userId: 134, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2026-01-08', end: '2026-03-01', status: 'cancelled', reason: 'price' },
  { id: 2038, userId: 135, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2026-01-22', end: null, status: 'active', reason: null },
  { id: 2039, userId: 136, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2026-02-10', end: null, status: 'active', reason: null },
  { id: 2040, userId: 139, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2026-03-01', end: null, status: 'trialing', reason: null },
  { id: 2041, userId: 142, tier: 'starter', cycle: 'monthly', mrr: 49, start: '2026-03-05', end: null, status: 'trialing', reason: null },
  { id: 2042, userId: 138, tier: 'pro', cycle: 'monthly', mrr: 149, start: '2026-03-10', end: null, status: 'trialing', reason: null },
  { id: 2043, userId: 112, tier: 'enterprise', cycle: 'monthly', mrr: 549, start: '2026-02-01', end: '2026-03-02', status: 'cancelled', reason: 'budget_cuts' },
  { id: 2044, userId: 121, tier: 'enterprise', cycle: 'annual', mrr: 499, start: '2026-02-15', end: null, status: 'active', reason: null },
];

interface EventSeed {
  id: number;
  userId: number | null;
  session: string;
  name: 'page_view' | 'pricing_view' | 'signup_start' | 'add_to_cart' | 'checkout_start' | 'purchase' | 'feature_used';
  ts: string;
  device: 'desktop' | 'mobile' | 'tablet';
  utm: string | null;
}

const WEB_EVENTS: EventSeed[] = [
  // Converted multi-touch user journeys
  { id: 7001, userId: 101, session: 'sess_101a', name: 'page_view', ts: '2025-01-03 09:00:00', device: 'desktop', utm: 'google' },
  { id: 7002, userId: 101, session: 'sess_101a', name: 'pricing_view', ts: '2025-01-03 09:04:15', device: 'desktop', utm: 'google' },
  { id: 7003, userId: 101, session: 'sess_101a', name: 'signup_start', ts: '2025-01-03 09:07:30', device: 'desktop', utm: 'google' },
  { id: 7004, userId: 101, session: 'sess_101b', name: 'add_to_cart', ts: '2025-01-08 14:10:00', device: 'desktop', utm: 'newsletter' },
  { id: 7005, userId: 101, session: 'sess_101b', name: 'checkout_start', ts: '2025-01-08 14:13:20', device: 'desktop', utm: 'newsletter' },
  { id: 7006, userId: 101, session: 'sess_101b', name: 'purchase', ts: '2025-01-08 14:15:45', device: 'desktop', utm: 'newsletter' },
  { id: 7007, userId: 101, session: 'sess_101c', name: 'feature_used', ts: '2025-02-10 11:20:00', device: 'desktop', utm: null },

  { id: 7008, userId: 102, session: 'sess_102a', name: 'page_view', ts: '2025-01-05 10:00:00', device: 'desktop', utm: 'referral' },
  { id: 7009, userId: 102, session: 'sess_102a', name: 'signup_start', ts: '2025-01-05 10:05:00', device: 'desktop', utm: 'referral' },
  { id: 7010, userId: 102, session: 'sess_102b', name: 'add_to_cart', ts: '2025-01-12 16:00:00', device: 'mobile', utm: 'referral' },
  { id: 7011, userId: 102, session: 'sess_102b', name: 'checkout_start', ts: '2025-01-12 16:03:00', device: 'mobile', utm: 'referral' },
  { id: 7012, userId: 102, session: 'sess_102b', name: 'purchase', ts: '2025-01-12 16:06:30', device: 'mobile', utm: 'referral' },

  { id: 7013, userId: 103, session: 'sess_103a', name: 'page_view', ts: '2025-01-09 12:10:00', device: 'mobile', utm: 'linkedin' },
  { id: 7014, userId: 103, session: 'sess_103a', name: 'pricing_view', ts: '2025-01-09 12:14:00', device: 'mobile', utm: 'linkedin' },
  { id: 7015, userId: 103, session: 'sess_103b', name: 'add_to_cart', ts: '2025-01-16 15:00:00', device: 'desktop', utm: 'google' },
  { id: 7016, userId: 103, session: 'sess_103b', name: 'checkout_start', ts: '2025-01-16 15:05:00', device: 'desktop', utm: 'google' },
  { id: 7017, userId: 103, session: 'sess_103b', name: 'purchase', ts: '2025-01-16 15:08:00', device: 'desktop', utm: 'google' },

  { id: 7018, userId: 106, session: 'sess_106a', name: 'page_view', ts: '2025-02-02 08:30:00', device: 'desktop', utm: 'google' },
  { id: 7019, userId: 106, session: 'sess_106a', name: 'pricing_view', ts: '2025-02-02 08:35:00', device: 'desktop', utm: 'google' },
  { id: 7020, userId: 106, session: 'sess_106a', name: 'signup_start', ts: '2025-02-02 08:40:00', device: 'desktop', utm: 'google' },
  { id: 7021, userId: 106, session: 'sess_106b', name: 'add_to_cart', ts: '2025-02-05 13:00:00', device: 'desktop', utm: 'google' },
  { id: 7022, userId: 106, session: 'sess_106b', name: 'checkout_start', ts: '2025-02-05 13:04:00', device: 'desktop', utm: 'google' },
  { id: 7023, userId: 106, session: 'sess_106b', name: 'purchase', ts: '2025-02-05 13:09:00', device: 'desktop', utm: 'google' },

  { id: 7024, userId: 107, session: 'sess_107a', name: 'page_view', ts: '2025-02-06 10:15:00', device: 'tablet', utm: 'linkedin' },
  { id: 7025, userId: 107, session: 'sess_107a', name: 'signup_start', ts: '2025-02-06 10:21:00', device: 'tablet', utm: 'linkedin' },
  { id: 7026, userId: 107, session: 'sess_107b', name: 'add_to_cart', ts: '2025-02-12 11:00:00', device: 'desktop', utm: 'newsletter' },
  { id: 7027, userId: 107, session: 'sess_107b', name: 'checkout_start', ts: '2025-02-12 11:02:30', device: 'desktop', utm: 'newsletter' },
  { id: 7028, userId: 107, session: 'sess_107b', name: 'purchase', ts: '2025-02-12 11:05:10', device: 'desktop', utm: 'newsletter' },

  { id: 7029, userId: 111, session: 'sess_111a', name: 'page_view', ts: '2025-03-01 09:00:00', device: 'desktop', utm: 'referral' },
  { id: 7030, userId: 111, session: 'sess_111a', name: 'pricing_view', ts: '2025-03-01 09:06:00', device: 'desktop', utm: 'referral' },
  { id: 7031, userId: 111, session: 'sess_111a', name: 'signup_start', ts: '2025-03-01 09:11:00', device: 'desktop', utm: 'referral' },
  { id: 7032, userId: 111, session: 'sess_111b', name: 'add_to_cart', ts: '2025-03-04 14:20:00', device: 'desktop', utm: 'referral' },
  { id: 7033, userId: 111, session: 'sess_111b', name: 'checkout_start', ts: '2025-03-04 14:23:00', device: 'desktop', utm: 'referral' },
  { id: 7034, userId: 111, session: 'sess_111b', name: 'purchase', ts: '2025-03-04 14:27:00', device: 'desktop', utm: 'referral' },

  { id: 7035, userId: 116, session: 'sess_116a', name: 'page_view', ts: '2025-04-03 07:00:00', device: 'desktop', utm: 'google' },
  { id: 7036, userId: 116, session: 'sess_116a', name: 'signup_start', ts: '2025-04-03 07:08:00', device: 'desktop', utm: 'google' },
  { id: 7037, userId: 116, session: 'sess_116b', name: 'add_to_cart', ts: '2025-04-06 18:00:00', device: 'mobile', utm: 'google' },
  { id: 7038, userId: 116, session: 'sess_116b', name: 'checkout_start', ts: '2025-04-06 18:02:00', device: 'mobile', utm: 'google' },
  { id: 7039, userId: 116, session: 'sess_116b', name: 'purchase', ts: '2025-04-06 18:04:00', device: 'mobile', utm: 'google' },

  { id: 7040, userId: 120, session: 'sess_120a', name: 'page_view', ts: '2025-05-02 10:00:00', device: 'desktop', utm: 'referral' },
  { id: 7041, userId: 120, session: 'sess_120a', name: 'pricing_view', ts: '2025-05-02 10:03:00', device: 'desktop', utm: 'referral' },
  { id: 7042, userId: 120, session: 'sess_120b', name: 'add_to_cart', ts: '2025-05-04 12:00:00', device: 'desktop', utm: 'google' },
  { id: 7043, userId: 120, session: 'sess_120b', name: 'checkout_start', ts: '2025-05-04 12:04:00', device: 'desktop', utm: 'google' },
  { id: 7044, userId: 120, session: 'sess_120b', name: 'purchase', ts: '2025-05-04 12:07:00', device: 'desktop', utm: 'google' },

  { id: 7045, userId: 124, session: 'sess_124a', name: 'page_view', ts: '2025-06-04 11:00:00', device: 'desktop', utm: 'google' },
  { id: 7046, userId: 124, session: 'sess_124a', name: 'signup_start', ts: '2025-06-04 11:04:00', device: 'desktop', utm: 'google' },
  { id: 7047, userId: 124, session: 'sess_124b', name: 'add_to_cart', ts: '2025-06-06 09:10:00', device: 'desktop', utm: 'google' },
  { id: 7048, userId: 124, session: 'sess_124b', name: 'checkout_start', ts: '2025-06-06 09:15:00', device: 'desktop', utm: 'google' },
  { id: 7049, userId: 124, session: 'sess_124b', name: 'purchase', ts: '2025-06-06 09:20:00', device: 'desktop', utm: 'google' },

  { id: 7050, userId: 129, session: 'sess_129a', name: 'page_view', ts: '2025-08-05 14:00:00', device: 'desktop', utm: 'linkedin' },
  { id: 7051, userId: 129, session: 'sess_129a', name: 'pricing_view', ts: '2025-08-05 14:05:00', device: 'desktop', utm: 'linkedin' },
  { id: 7052, userId: 129, session: 'sess_129b', name: 'add_to_cart', ts: '2025-08-14 16:00:00', device: 'desktop', utm: 'newsletter' },
  { id: 7053, userId: 129, session: 'sess_129b', name: 'checkout_start', ts: '2025-08-14 16:02:00', device: 'desktop', utm: 'newsletter' },
  { id: 7054, userId: 129, session: 'sess_129b', name: 'purchase', ts: '2025-08-14 16:05:00', device: 'desktop', utm: 'newsletter' },

  { id: 7055, userId: 135, session: 'sess_135a', name: 'page_view', ts: '2026-01-22 09:00:00', device: 'desktop', utm: 'google' },
  { id: 7056, userId: 135, session: 'sess_135a', name: 'pricing_view', ts: '2026-01-22 09:04:00', device: 'desktop', utm: 'google' },
  { id: 7057, userId: 135, session: 'sess_135a', name: 'signup_start', ts: '2026-01-22 09:07:00', device: 'desktop', utm: 'google' },
  { id: 7058, userId: 135, session: 'sess_135a', name: 'purchase', ts: '2026-01-22 09:22:00', device: 'desktop', utm: 'google' },

  { id: 7059, userId: 136, session: 'sess_136a', name: 'page_view', ts: '2026-02-05 10:00:00', device: 'mobile', utm: 'referral' },
  { id: 7060, userId: 136, session: 'sess_136a', name: 'signup_start', ts: '2026-02-05 10:03:00', device: 'mobile', utm: 'referral' },
  { id: 7061, userId: 136, session: 'sess_136a', name: 'add_to_cart', ts: '2026-02-05 10:08:00', device: 'mobile', utm: 'referral' },
  { id: 7062, userId: 136, session: 'sess_136a', name: 'checkout_start', ts: '2026-02-05 10:11:00', device: 'mobile', utm: 'referral' },
  { id: 7063, userId: 136, session: 'sess_136a', name: 'purchase', ts: '2026-02-05 10:14:00', device: 'mobile', utm: 'referral' },

  // Abandoned cart / checkout drop-off sessions (both buyers and non-buyers)
  { id: 7064, userId: 105, session: 'sess_105a', name: 'page_view', ts: '2025-01-20 11:00:00', device: 'mobile', utm: null },
  { id: 7065, userId: 105, session: 'sess_105a', name: 'pricing_view', ts: '2025-01-20 11:03:00', device: 'mobile', utm: null },
  { id: 7066, userId: 105, session: 'sess_105a', name: 'add_to_cart', ts: '2025-01-20 11:06:00', device: 'mobile', utm: null },
  { id: 7067, userId: 105, session: 'sess_105a', name: 'checkout_start', ts: '2025-01-20 11:09:00', device: 'mobile', utm: null },

  { id: 7068, userId: 115, session: 'sess_115a', name: 'page_view', ts: '2025-03-22 15:00:00', device: 'mobile', utm: 'linkedin' },
  { id: 7069, userId: 115, session: 'sess_115a', name: 'pricing_view', ts: '2025-03-22 15:02:00', device: 'mobile', utm: 'linkedin' },
  { id: 7070, userId: 115, session: 'sess_115a', name: 'add_to_cart', ts: '2025-03-22 15:05:00', device: 'mobile', utm: 'linkedin' },

  { id: 7071, userId: 123, session: 'sess_123a', name: 'page_view', ts: '2025-05-21 09:30:00', device: 'tablet', utm: null },
  { id: 7072, userId: 123, session: 'sess_123a', name: 'add_to_cart', ts: '2025-05-21 09:34:00', device: 'tablet', utm: null },
  { id: 7073, userId: 123, session: 'sess_123a', name: 'checkout_start', ts: '2025-05-21 09:36:00', device: 'tablet', utm: null },

  // Non-buying users who viewed pricing_view!
  { id: 7074, userId: 137, session: 'sess_137a', name: 'page_view', ts: '2025-08-19 10:00:00', device: 'mobile', utm: 'linkedin' },
  { id: 7075, userId: 137, session: 'sess_137a', name: 'pricing_view', ts: '2025-08-19 10:04:00', device: 'mobile', utm: 'linkedin' },
  { id: 7076, userId: 137, session: 'sess_137a', name: 'signup_start', ts: '2025-08-19 10:08:00', device: 'mobile', utm: 'linkedin' },

  { id: 7077, userId: 138, session: 'sess_138a', name: 'page_view', ts: '2025-10-27 13:00:00', device: 'desktop', utm: 'google' },
  { id: 7078, userId: 138, session: 'sess_138a', name: 'pricing_view', ts: '2025-10-27 13:05:00', device: 'desktop', utm: 'google' },
  { id: 7079, userId: 138, session: 'sess_138a', name: 'add_to_cart', ts: '2025-10-27 13:10:00', device: 'desktop', utm: 'google' },

  { id: 7080, userId: 139, session: 'sess_139a', name: 'page_view', ts: '2025-12-14 16:00:00', device: 'desktop', utm: null },
  { id: 7081, userId: 139, session: 'sess_139a', name: 'pricing_view', ts: '2025-12-14 16:03:00', device: 'desktop', utm: null },

  { id: 7082, userId: 140, session: 'sess_140a', name: 'page_view', ts: '2026-01-15 11:10:00', device: 'mobile', utm: 'newsletter' },
  { id: 7083, userId: 140, session: 'sess_140a', name: 'pricing_view', ts: '2026-01-15 11:12:00', device: 'mobile', utm: 'newsletter' },
  { id: 7084, userId: 140, session: 'sess_140a', name: 'checkout_start', ts: '2026-01-15 11:17:00', device: 'mobile', utm: 'newsletter' },

  { id: 7085, userId: 141, session: 'sess_141a', name: 'page_view', ts: '2026-02-18 09:00:00', device: 'desktop', utm: 'referral' },
  { id: 7086, userId: 141, session: 'sess_141a', name: 'feature_used', ts: '2026-02-18 09:12:00', device: 'desktop', utm: 'referral' },

  { id: 7087, userId: 142, session: 'sess_142a', name: 'page_view', ts: '2026-03-05 14:00:00', device: 'mobile', utm: 'linkedin' },
  { id: 7088, userId: 142, session: 'sess_142a', name: 'pricing_view', ts: '2026-03-05 14:03:00', device: 'mobile', utm: 'linkedin' },
  { id: 7089, userId: 142, session: 'sess_142a', name: 'add_to_cart', ts: '2026-03-05 14:07:00', device: 'mobile', utm: 'linkedin' },

  // Anonymous sessions (user_id IS NULL)
  { id: 7090, userId: null, session: 'anon_001', name: 'page_view', ts: '2025-07-12 08:00:00', device: 'mobile', utm: 'google' },
  { id: 7091, userId: null, session: 'anon_001', name: 'pricing_view', ts: '2025-07-12 08:02:00', device: 'mobile', utm: 'google' },
  { id: 7092, userId: null, session: 'anon_002', name: 'page_view', ts: '2025-09-03 19:15:00', device: 'desktop', utm: null },
  { id: 7093, userId: null, session: 'anon_003', name: 'page_view', ts: '2025-11-18 12:30:00', device: 'tablet', utm: 'linkedin' },
  { id: 7094, userId: null, session: 'anon_003', name: 'pricing_view', ts: '2025-11-18 12:32:00', device: 'tablet', utm: 'linkedin' },
  { id: 7095, userId: null, session: 'anon_004', name: 'page_view', ts: '2026-01-25 17:45:00', device: 'mobile', utm: null },
  { id: 7096, userId: null, session: 'anon_005', name: 'page_view', ts: '2026-03-02 10:10:00', device: 'desktop', utm: 'google' },
  { id: 7097, userId: null, session: 'anon_005', name: 'signup_start', ts: '2026-03-02 10:13:00', device: 'desktop', utm: 'google' },
  { id: 7098, userId: null, session: 'anon_006', name: 'page_view', ts: '2026-03-14 21:00:00', device: 'mobile', utm: 'newsletter' },

  // Extra feature usage & 2026 purchase sessions
  { id: 7099, userId: 128, session: 'sess_128a', name: 'signup_start', ts: '2025-07-10 09:00:00', device: 'desktop', utm: 'google' },
  { id: 7100, userId: 128, session: 'sess_128a', name: 'purchase', ts: '2025-07-10 13:30:00', device: 'desktop', utm: 'google' },
  { id: 7101, userId: 131, session: 'sess_131a', name: 'signup_start', ts: '2025-10-03 08:00:00', device: 'desktop', utm: 'google' },
  { id: 7102, userId: 131, session: 'sess_131a', name: 'add_to_cart', ts: '2025-10-03 08:05:00', device: 'desktop', utm: 'google' },
  { id: 7103, userId: 131, session: 'sess_131a', name: 'purchase', ts: '2025-10-03 08:12:00', device: 'desktop', utm: 'google' },
  { id: 7104, userId: 133, session: 'sess_133a', name: 'page_view', ts: '2025-12-02 10:00:00', device: 'desktop', utm: null },
  { id: 7105, userId: 133, session: 'sess_133a', name: 'feature_used', ts: '2025-12-02 10:18:00', device: 'desktop', utm: null },
  { id: 7106, userId: 134, session: 'sess_134a', name: 'page_view', ts: '2026-01-08 11:00:00', device: 'tablet', utm: 'newsletter' },
  { id: 7107, userId: 134, session: 'sess_134a', name: 'checkout_start', ts: '2026-01-08 11:06:00', device: 'tablet', utm: 'newsletter' },
  { id: 7108, userId: 134, session: 'sess_134a', name: 'purchase', ts: '2026-01-08 11:10:00', device: 'tablet', utm: 'newsletter' },
  { id: 7109, userId: 117, session: 'sess_117a', name: 'feature_used', ts: '2025-07-05 15:00:00', device: 'desktop', utm: 'referral' },
  { id: 7110, userId: 117, session: 'sess_117a', name: 'purchase', ts: '2025-07-05 15:12:00', device: 'desktop', utm: 'referral' },
  { id: 7111, userId: 125, session: 'sess_125a', name: 'pricing_view', ts: '2025-06-09 10:00:00', device: 'desktop', utm: 'referral' },
  { id: 7112, userId: 125, session: 'sess_125a', name: 'purchase', ts: '2025-06-09 10:25:00', device: 'desktop', utm: 'referral' },
];

interface TicketSeed {
  id: number;
  userId: number;
  orderId: number | null;
  category: 'billing' | 'bug' | 'shipping' | 'refund_request' | 'onboarding';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  resolved: string | null;
  csat: number | null;
}

const SUPPORT_TICKETS: TicketSeed[] = [
  { id: 3001, userId: 101, orderId: 1001, category: 'onboarding', priority: 'low', created: '2025-01-09 09:00:00', resolved: '2025-01-09 15:30:00', csat: 5 },
  { id: 3002, userId: 105, orderId: 1005, category: 'refund_request', priority: 'high', created: '2025-01-26 10:00:00', resolved: '2025-01-27 16:00:00', csat: 3 },
  { id: 3003, userId: 103, orderId: 1003, category: 'shipping', priority: 'medium', created: '2025-01-18 14:00:00', resolved: '2025-01-20 11:00:00', csat: 4 },
  { id: 3004, userId: 104, orderId: null, category: 'onboarding', priority: 'low', created: '2025-01-15 11:20:00', resolved: '2025-01-16 09:20:00', csat: 5 },
  { id: 3005, userId: 108, orderId: 1011, category: 'shipping', priority: 'high', created: '2025-02-20 08:30:00', resolved: '2025-02-22 14:30:00', csat: 4 },
  { id: 3006, userId: 110, orderId: 1013, category: 'billing', priority: 'medium', created: '2025-02-25 16:00:00', resolved: '2025-02-26 10:00:00', csat: 4 },
  { id: 3007, userId: 112, orderId: 1023, category: 'billing', priority: 'urgent', created: '2025-03-11 14:00:00', resolved: '2025-03-11 18:00:00', csat: 5 },
  { id: 3008, userId: 108, orderId: 1018, category: 'refund_request', priority: 'high', created: '2025-03-23 11:00:00', resolved: '2025-03-25 11:00:00', csat: 2 },
  { id: 3009, userId: 108, orderId: 1018, category: 'shipping', priority: 'medium', created: '2025-03-24 09:00:00', resolved: '2025-03-25 15:00:00', csat: null },
  { id: 3010, userId: 115, orderId: null, category: 'billing', priority: 'medium', created: '2025-04-28 12:00:00', resolved: '2025-04-29 18:00:00', csat: 3 },
  { id: 3011, userId: 117, orderId: null, category: 'bug', priority: 'high', created: '2025-04-15 09:30:00', resolved: '2025-04-16 21:30:00', csat: 4 },
  { id: 3012, userId: 123, orderId: 1040, category: 'refund_request', priority: 'high', created: '2025-05-25 10:00:00', resolved: '2025-05-27 10:00:00', csat: 2 },
  { id: 3013, userId: 124, orderId: 1049, category: 'billing', priority: 'urgent', created: '2025-06-06 13:00:00', resolved: '2025-06-06 17:00:00', csat: 5 },
  { id: 3014, userId: 126, orderId: 1047, category: 'shipping', priority: 'low', created: '2025-06-23 09:00:00', resolved: '2025-06-25 09:00:00', csat: 4 },
  { id: 3015, userId: 118, orderId: 1055, category: 'refund_request', priority: 'high', created: '2025-07-28 15:00:00', resolved: '2025-07-30 09:00:00', csat: 2 },
  { id: 3016, userId: 118, orderId: 1055, category: 'billing', priority: 'medium', created: '2025-07-29 10:00:00', resolved: '2025-07-30 10:00:00', csat: 3 },
  { id: 3017, userId: 114, orderId: 1060, category: 'shipping', priority: 'medium', created: '2025-08-27 14:00:00', resolved: '2025-08-28 14:00:00', csat: 3 },
  { id: 3018, userId: 109, orderId: 1065, category: 'refund_request', priority: 'medium', created: '2025-09-28 11:00:00', resolved: '2025-09-30 05:00:00', csat: 2 },
  { id: 3019, userId: 129, orderId: null, category: 'onboarding', priority: 'low', created: '2025-08-07 09:00:00', resolved: '2025-08-07 15:00:00', csat: 5 },
  { id: 3020, userId: 131, orderId: 1070, category: 'billing', priority: 'urgent', created: '2025-10-06 16:00:00', resolved: '2025-10-06 20:00:00', csat: 5 },
  { id: 3021, userId: 122, orderId: 1069, category: 'billing', priority: 'high', created: '2025-10-28 10:00:00', resolved: null, csat: null },
  { id: 3022, userId: 130, orderId: 1074, category: 'refund_request', priority: 'high', created: '2025-11-28 12:00:00', resolved: '2025-11-29 18:00:00', csat: 1 },
  { id: 3023, userId: 126, orderId: 1079, category: 'billing', priority: 'low', created: '2025-12-29 14:00:00', resolved: '2025-12-30 14:00:00', csat: null },
  { id: 3024, userId: 113, orderId: 1083, category: 'refund_request', priority: 'urgent', created: '2026-01-24 09:00:00', resolved: '2026-01-25 09:00:00', csat: 2 },
  { id: 3025, userId: 136, orderId: 1090, category: 'billing', priority: 'urgent', created: '2026-02-05 14:00:00', resolved: '2026-02-05 18:00:00', csat: 5 },
  { id: 3026, userId: 134, orderId: 1088, category: 'refund_request', priority: 'high', created: '2026-02-21 10:00:00', resolved: '2026-02-23 10:00:00', csat: 1 },
  { id: 3027, userId: 134, orderId: 1088, category: 'shipping', priority: 'medium', created: '2026-02-22 11:00:00', resolved: '2026-02-23 11:00:00', csat: 2 },
  { id: 3028, userId: 101, orderId: 1115, category: 'billing', priority: 'high', created: '2026-03-01 11:00:00', resolved: '2026-03-01 17:00:00', csat: 5 },
  { id: 3029, userId: 104, orderId: 1112, category: 'billing', priority: 'high', created: '2026-03-11 09:00:00', resolved: null, csat: null },
  { id: 3030, userId: 118, orderId: 1113, category: 'refund_request', priority: 'urgent', created: '2026-03-14 15:00:00', resolved: '2026-03-15 15:00:00', csat: 2 },
  { id: 3031, userId: 122, orderId: 1114, category: 'bug', priority: 'urgent', created: '2026-03-18 08:00:00', resolved: null, csat: null },
  { id: 3032, userId: 135, orderId: null, category: 'onboarding', priority: 'medium', created: '2026-01-23 10:00:00', resolved: '2026-01-23 16:00:00', csat: 5 },
  { id: 3033, userId: 120, orderId: null, category: 'bug', priority: 'high', created: '2026-03-05 13:00:00', resolved: null, csat: null },
  { id: 3034, userId: 106, orderId: null, category: 'bug', priority: 'medium', created: '2026-02-18 11:00:00', resolved: '2026-02-19 23:00:00', csat: 4 },
  { id: 3035, userId: 125, orderId: null, category: 'onboarding', priority: 'low', created: '2025-06-11 09:00:00', resolved: '2025-06-11 13:00:00', csat: null },
  { id: 3036, userId: 111, orderId: 1034, category: 'shipping', priority: 'low', created: '2025-05-12 10:00:00', resolved: '2025-05-13 10:00:00', csat: 5 },
  { id: 3037, userId: 138, orderId: null, category: 'bug', priority: 'medium', created: '2026-03-15 10:00:00', resolved: null, csat: null },
  { id: 3038, userId: 140, orderId: null, category: 'onboarding', priority: 'low', created: '2026-01-16 12:00:00', resolved: '2026-01-17 00:00:00', csat: 4 },
];

interface CampaignSeed {
  id: number;
  name: string;
  channel: string;
  promo: string | null;
  spend: number;
  start: string;
  end: string;
}

const MARKETING_CAMPAIGNS: CampaignSeed[] = [
  { id: 401, name: '2025 Evergreen Welcome', channel: 'email_campaign', promo: 'WELCOME10', spend: 1800, start: '2025-01-01', end: '2026-03-31' },
  { id: 402, name: 'Annual Upgrade Drive', channel: 'email_campaign', promo: 'ANNUAL15', spend: 2400, start: '2025-02-01', end: '2026-02-28' },
  { id: 403, name: 'VIP Retention Concierge', channel: 'partner', promo: 'VIP25', spend: 3200, start: '2025-03-01', end: '2026-03-31' },
  { id: 404, name: 'Spring Flash 2025', channel: 'paid_social', promo: 'SPRING20', spend: 1400, start: '2025-03-01', end: '2025-05-31' },
  { id: 405, name: 'Spring Campaign 2026', channel: 'paid_social', promo: 'SPRING20', spend: 2100, start: '2026-03-01', end: '2026-03-31' },
  { id: 406, name: 'Winter Promo Test', channel: 'paid_social', promo: 'WINTER5', spend: 1200, start: '2025-11-01', end: '2025-12-31' },
  { id: 407, name: 'Q1 Search Brand Awareness', channel: 'organic_search', promo: null, spend: 4500, start: '2025-01-01', end: '2025-03-31' },
  { id: 408, name: 'H2 Executive LinkedIn Push', channel: 'paid_social', promo: null, spend: 5200, start: '2025-07-01', end: '2025-12-31' },
  { id: 409, name: 'Partner Co-Marketing Summit', channel: 'partner', promo: null, spend: 4100, start: '2026-01-01', end: '2026-03-31' },
  { id: 410, name: 'Referral Advocacy Program', channel: 'referral', promo: null, spend: 1900, start: '2025-01-01', end: '2026-03-31' },
];

interface ReviewSeed {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  date: string;
  verified: 0 | 1;
  votes: number;
}

// Product 16 intentionally has 0 reviews for LEFT JOIN anti-join!
const PRODUCT_REVIEWS: ReviewSeed[] = [
  { id: 6001, productId: 1, userId: 101, rating: 5, date: '2025-01-18', verified: 1, votes: 14 },
  { id: 6002, productId: 1, userId: 102, rating: 5, date: '2025-03-22', verified: 1, votes: 9 },
  { id: 6003, productId: 1, userId: 106, rating: 4, date: '2025-02-15', verified: 1, votes: 6 },
  { id: 6004, productId: 1, userId: 124, rating: 5, date: '2025-06-14', verified: 1, votes: 11 },
  { id: 6005, productId: 1, userId: 137, rating: 2, date: '2025-08-22', verified: 0, votes: 1 },

  { id: 6006, productId: 2, userId: 103, rating: 4, date: '2025-01-25', verified: 1, votes: 5 },
  { id: 6007, productId: 2, userId: 116, rating: 5, date: '2025-05-24', verified: 1, votes: 7 },
  { id: 6008, productId: 2, userId: 134, rating: 4, date: '2026-01-18', verified: 1, votes: 3 },

  { id: 6009, productId: 3, userId: 101, rating: 5, date: '2025-02-16', verified: 1, votes: 18 },
  { id: 6010, productId: 3, userId: 106, rating: 5, date: '2025-03-19', verified: 1, votes: 12 },
  { id: 6011, productId: 3, userId: 117, rating: 4, date: '2025-04-22', verified: 1, votes: 8 },
  { id: 6012, productId: 3, userId: 135, rating: 5, date: '2026-03-19', verified: 1, votes: 10 },

  { id: 6013, productId: 4, userId: 116, rating: 4, date: '2025-04-15', verified: 1, votes: 4 },
  { id: 6014, productId: 4, userId: 115, rating: 2, date: '2025-05-01', verified: 0, votes: 2 },
  { id: 6015, productId: 4, userId: 127, rating: 4, date: '2025-11-29', verified: 1, votes: 6 },

  { id: 6016, productId: 5, userId: 102, rating: 5, date: '2025-01-20', verified: 1, votes: 15 },
  { id: 6017, productId: 5, userId: 106, rating: 5, date: '2025-04-21', verified: 1, votes: 13 },
  { id: 6018, productId: 5, userId: 120, rating: 5, date: '2025-05-12', verified: 1, votes: 11 },
  { id: 6019, productId: 5, userId: 129, rating: 4, date: '2025-12-16', verified: 1, votes: 8 },

  { id: 6020, productId: 6, userId: 102, rating: 4, date: '2025-02-20', verified: 1, votes: 6 },
  { id: 6021, productId: 6, userId: 107, rating: 5, date: '2025-03-27', verified: 1, votes: 9 },
  { id: 6022, productId: 6, userId: 128, rating: 4, date: '2025-08-29', verified: 1, votes: 5 },

  { id: 6023, productId: 7, userId: 107, rating: 4, date: '2025-02-22', verified: 1, votes: 7 },
  { id: 6024, productId: 7, userId: 113, rating: 5, date: '2025-03-25', verified: 1, votes: 6 },
  { id: 6025, productId: 7, userId: 121, rating: 4, date: '2025-05-18', verified: 1, votes: 4 },

  { id: 6026, productId: 8, userId: 105, rating: 2, date: '2025-01-29', verified: 1, votes: 3 },
  { id: 6027, productId: 8, userId: 114, rating: 3, date: '2025-04-02', verified: 1, votes: 2 },
  { id: 6028, productId: 8, userId: 130, rating: 2, date: '2025-12-01', verified: 0, votes: 1 },

  { id: 6029, productId: 9, userId: 101, rating: 5, date: '2025-01-19', verified: 1, votes: 16 },
  { id: 6030, productId: 9, userId: 111, rating: 5, date: '2025-03-12', verified: 1, votes: 12 },
  { id: 6031, productId: 9, userId: 125, rating: 5, date: '2025-06-22', verified: 1, votes: 14 },

  { id: 6032, productId: 10, userId: 103, rating: 4, date: '2025-02-23', verified: 1, votes: 4 },
  { id: 6033, productId: 10, userId: 121, rating: 4, date: '2025-06-28', verified: 1, votes: 5 },
  { id: 6034, productId: 10, userId: 109, rating: 2, date: '2025-10-02', verified: 0, votes: 1 },

  { id: 6035, productId: 11, userId: 112, rating: 5, date: '2025-03-19', verified: 1, votes: 9 },
  { id: 6036, productId: 11, userId: 120, rating: 4, date: '2025-07-19', verified: 1, votes: 6 },
  { id: 6037, productId: 11, userId: 131, rating: 5, date: '2025-10-14', verified: 1, votes: 8 },

  { id: 6038, productId: 12, userId: 122, rating: 4, date: '2025-05-26', verified: 1, votes: 3 },
  { id: 6039, productId: 12, userId: 128, rating: 4, date: '2025-07-30', verified: 1, votes: 4 },

  { id: 6040, productId: 13, userId: 103, rating: 4, date: '2025-01-24', verified: 1, votes: 10 },
  { id: 6041, productId: 13, userId: 108, rating: 2, date: '2025-03-27', verified: 1, votes: 7 },
  { id: 6042, productId: 13, userId: 125, rating: 5, date: '2025-08-19', verified: 1, votes: 11 },
  { id: 6043, productId: 13, userId: 138, rating: 1, date: '2025-11-02', verified: 0, votes: 2 },

  { id: 6044, productId: 14, userId: 104, rating: 4, date: '2025-01-28', verified: 1, votes: 5 },
  { id: 6045, productId: 14, userId: 118, rating: 2, date: '2025-08-03', verified: 1, votes: 3 },
  { id: 6046, productId: 14, userId: 134, rating: 1, date: '2026-02-26', verified: 1, votes: 4 },

  { id: 6047, productId: 15, userId: 108, rating: 4, date: '2025-02-27', verified: 1, votes: 6 },
  { id: 6048, productId: 15, userId: 111, rating: 5, date: '2025-05-19', verified: 1, votes: 9 },
  { id: 6049, productId: 15, userId: 113, rating: 2, date: '2026-01-29', verified: 1, votes: 5 },
];

function q(val: string | number | null): string {
  if (val === null) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${val.replace(/'/g, "''")}'`;
}

export function buildExtendedSeedSql(): string {
  const lines: string[] = [
    'DROP TABLE IF EXISTS product_reviews;',
    'DROP TABLE IF EXISTS marketing_campaigns;',
    'DROP TABLE IF EXISTS support_tickets;',
    'DROP TABLE IF EXISTS web_events;',
    'DROP TABLE IF EXISTS subscriptions;',
    '',
    `CREATE TABLE subscriptions (
  sub_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  mrr_amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  cancel_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
    '',
    `CREATE TABLE web_events (
  event_id INTEGER PRIMARY KEY,
  user_id INTEGER,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_timestamp TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  utm_source TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
    '',
    `CREATE TABLE support_tickets (
  ticket_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  satisfaction_score INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);`,
    '',
    `CREATE TABLE marketing_campaigns (
  campaign_id INTEGER PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  promo_code TEXT,
  spend_usd REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);`,
    '',
    `CREATE TABLE product_reviews (
  review_id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_date TEXT NOT NULL,
  verified_purchase INTEGER NOT NULL CHECK (verified_purchase IN (0, 1)),
  helpful_votes INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
    '',
    `INSERT INTO subscriptions (sub_id, user_id, plan_tier, billing_cycle, mrr_amount, start_date, end_date, status, cancel_reason) VALUES\n${SUBSCRIPTIONS.map(
      (s) =>
        `(${s.id}, ${s.userId}, ${q(s.tier)}, ${q(s.cycle)}, ${s.mrr.toFixed(2)}, ${q(s.start)}, ${q(s.end)}, ${q(s.status)}, ${q(s.reason)})`
    ).join(',\n')};`,
    '',
    `INSERT INTO web_events (event_id, user_id, session_id, event_name, event_timestamp, device_type, utm_source) VALUES\n${WEB_EVENTS.map(
      (e) =>
        `(${e.id}, ${q(e.userId)}, ${q(e.session)}, ${q(e.name)}, ${q(e.ts)}, ${q(e.device)}, ${q(e.utm)})`
    ).join(',\n')};`,
    '',
    `INSERT INTO support_tickets (ticket_id, user_id, order_id, category, priority, created_at, resolved_at, satisfaction_score) VALUES\n${SUPPORT_TICKETS.map(
      (t) =>
        `(${t.id}, ${t.userId}, ${q(t.orderId)}, ${q(t.category)}, ${q(t.priority)}, ${q(t.created)}, ${q(t.resolved)}, ${q(t.csat)})`
    ).join(',\n')};`,
    '',
    `INSERT INTO marketing_campaigns (campaign_id, campaign_name, channel, promo_code, spend_usd, start_date, end_date) VALUES\n${MARKETING_CAMPAIGNS.map(
      (c) =>
        `(${c.id}, ${q(c.name)}, ${q(c.channel)}, ${q(c.promo)}, ${c.spend.toFixed(2)}, ${q(c.start)}, ${q(c.end)})`
    ).join(',\n')};`,
    '',
    `INSERT INTO product_reviews (review_id, product_id, user_id, rating, review_date, verified_purchase, helpful_votes) VALUES\n${PRODUCT_REVIEWS.map(
      (r) =>
        `(${r.id}, ${r.productId}, ${r.userId}, ${r.rating}, ${q(r.date)}, ${r.verified}, ${r.votes})`
    ).join(',\n')};`,
  ];

  return lines.join('\n');
}

export const EXTENDED_SEED_COUNTS = {
  subscriptions: SUBSCRIPTIONS.length,
  webEvents: WEB_EVENTS.length,
  supportTickets: SUPPORT_TICKETS.length,
  marketingCampaigns: MARKETING_CAMPAIGNS.length,
  productReviews: PRODUCT_REVIEWS.length,
};
