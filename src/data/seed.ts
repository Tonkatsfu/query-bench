import type { TableSchemaInfo } from '../types/sql';
import {
  EXTENDED_SCHEMA_METADATA,
  EXTENDED_SEED_COUNTS,
  buildExtendedSeedSql,
} from './seedExtended';

export const SCHEMA_METADATA: TableSchemaInfo[] = [
  {
    name: 'users',
    description: 'Registered SaaS & e-commerce accounts with region, acquisition channel, and subscription tier.',
    columns: [
      { name: 'user_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'full_name', type: 'TEXT', nullable: false },
      { name: 'email', type: 'TEXT', nullable: false },
      { name: 'signup_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
      { name: 'country', type: 'TEXT', nullable: false, note: 'US, UK, CA, DE, AU, SG' },
      { name: 'acquisition_channel', type: 'TEXT', nullable: true, note: 'Contains NULLs' },
      { name: 'plan_tier', type: 'TEXT', nullable: false, note: 'free, starter, pro, enterprise' },
    ],
  },
  {
    name: 'products',
    description: 'Catalog of add-on modules, data packs, and hardware kits with unit cost and launch dates.',
    columns: [
      { name: 'product_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      { name: 'product_name', type: 'TEXT', nullable: false },
      { name: 'category', type: 'TEXT', nullable: false, note: 'Analytics, Automation, Data Storage, Hardware' },
      { name: 'cost_price', type: 'REAL', nullable: false, note: 'COGS in USD' },
      { name: 'launch_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
    ],
  },
  {
    name: 'orders',
    description: 'Customer orders across 2025–2026 including completed, refunded, pending, and cancelled transactions.',
    columns: [
      { name: 'order_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false,
        foreignKey: { table: 'users', column: 'user_id' },
      },
      { name: 'order_date', type: 'TEXT', nullable: false, note: 'YYYY-MM-DD' },
      { name: 'status', type: 'TEXT', nullable: false, note: 'completed, refunded, pending, cancelled' },
      { name: 'total_amount', type: 'REAL', nullable: false, note: 'USD total billed' },
      { name: 'discount_code', type: 'TEXT', nullable: true, note: 'Contains NULLs' },
    ],
  },
  {
    name: 'order_items',
    description: 'Line-item breakdown linking each order to purchased products, quantities, and unit prices.',
    columns: [
      { name: 'item_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
      {
        name: 'order_id',
        type: 'INTEGER',
        nullable: false,
        foreignKey: { table: 'orders', column: 'order_id' },
      },
      {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false,
        foreignKey: { table: 'products', column: 'product_id' },
      },
      { name: 'quantity', type: 'INTEGER', nullable: false },
      { name: 'unit_price', type: 'REAL', nullable: false, note: 'Selling price per unit (USD)' },
    ],
  },
  ...EXTENDED_SCHEMA_METADATA,
];

interface UserRow {
  id: number;
  name: string;
  email: string;
  signup: string;
  country: string;
  channel: string | null;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
}

interface ProductRow {
  id: number;
  name: string;
  category: 'Analytics' | 'Automation' | 'Data Storage' | 'Hardware';
  cost: number;
  launch: string;
}

interface OrderSeed {
  id: number;
  userId: number;
  date: string;
  status: 'completed' | 'refunded' | 'pending' | 'cancelled';
  discount: string | null;
  items: { productId: number; qty: number; unitPrice: number }[];
  overrideTotal?: number;
}

const USERS: UserRow[] = [
  // Jan 2025 cohort
  { id: 101, name: 'Elena Rostova', email: 'elena.rostova@acme.io', signup: '2025-01-03', country: 'US', channel: 'organic_search', tier: 'enterprise' },
  { id: 102, name: 'Marcus Vance', email: 'm.vance@northstar.co', signup: '2025-01-05', country: 'US', channel: 'referral', tier: 'pro' },
  { id: 103, name: 'Priya Nair', email: 'priya.nair@finlytics.uk', signup: '2025-01-09', country: 'UK', channel: 'paid_social', tier: 'pro' },
  { id: 104, name: 'Lukas Weber', email: 'lukas.weber@berlindata.de', signup: '2025-01-12', country: 'DE', channel: 'partner', tier: 'starter' },
  { id: 105, name: 'Hannah Cho', email: 'hannah.cho@maplecloud.ca', signup: '2025-01-17', country: 'CA', channel: null, tier: 'free' },

  // Feb 2025 cohort
  { id: 106, name: 'Devon Brooks', email: 'devon@brookshq.com', signup: '2025-02-02', country: 'US', channel: 'organic_search', tier: 'enterprise' },
  { id: 107, name: 'Chloe Bennett', email: 'chloe.b@sydneylabs.au', signup: '2025-02-06', country: 'AU', channel: 'paid_social', tier: 'pro' },
  { id: 108, name: 'Kenji Sato', email: 'kenji.sato@pacificops.sg', signup: '2025-02-11', country: 'SG', channel: 'referral', tier: 'pro' },
  { id: 109, name: 'Sofia Morales', email: 'sofia@vervecommerce.com', signup: '2025-02-15', country: 'US', channel: 'email_campaign', tier: 'starter' },
  { id: 110, name: 'Liam OConnor', email: 'liam@thamesmetrics.uk', signup: '2025-02-20', country: 'UK', channel: 'organic_search', tier: 'starter' },

  // Mar 2025 cohort
  { id: 111, name: 'Nadia Al-Mansoor', email: 'nadia@crescentbi.uk', signup: '2025-03-01', country: 'UK', channel: 'partner', tier: 'enterprise' },
  { id: 112, name: 'Ethan Gallagher', email: 'ethan@pinecrest.ca', signup: '2025-03-04', country: 'CA', channel: 'organic_search', tier: 'pro' },
  { id: 113, name: 'Clara Lindqvist', email: 'clara@nordicstack.de', signup: '2025-03-09', country: 'DE', channel: 'referral', tier: 'pro' },
  { id: 114, name: 'Mateo Silva', email: 'mateo@solarisops.us', signup: '2025-03-14', country: 'US', channel: null, tier: 'starter' },
  { id: 115, name: 'Aisha Patel', email: 'aisha.patel@meridian.sg', signup: '2025-03-22', country: 'SG', channel: 'paid_social', tier: 'free' },

  // Apr 2025 cohort
  { id: 116, name: 'Oliver Grant', email: 'oliver@harborware.au', signup: '2025-04-03', country: 'AU', channel: 'organic_search', tier: 'pro' },
  { id: 117, name: 'Mei-Ling Zhou', email: 'meiling@straitsdata.sg', signup: '2025-04-08', country: 'SG', channel: 'partner', tier: 'enterprise' },
  { id: 118, name: 'Gabriel Costa', email: 'gabriel@atlasretail.us', signup: '2025-04-12', country: 'US', channel: 'paid_social', tier: 'starter' },
  { id: 119, name: 'Freya Hoffmann', email: 'freya@rheincloud.de', signup: '2025-04-19', country: 'DE', channel: 'email_campaign', tier: 'pro' },

  // May 2025 cohort
  { id: 120, name: 'Noah Takahashi', email: 'noah.t@vanguard.ca', signup: '2025-05-02', country: 'CA', channel: 'referral', tier: 'enterprise' },
  { id: 121, name: 'Zara Jenkins', email: 'zara@kensington.uk', signup: '2025-05-07', country: 'UK', channel: 'organic_search', tier: 'pro' },
  { id: 122, name: 'Caleb Foster', email: 'caleb@ridgeway.us', signup: '2025-05-14', country: 'US', channel: 'paid_social', tier: 'starter' },
  { id: 123, name: 'Isla MacLeod', email: 'isla@koalaops.au', signup: '2025-05-21', country: 'AU', channel: null, tier: 'free' },

  // Jun 2025 cohort
  { id: 124, name: 'Julian Meyer', email: 'julian@munichai.de', signup: '2025-06-04', country: 'DE', channel: 'organic_search', tier: 'pro' },
  { id: 125, name: 'Sienna Hayes', email: 'sienna@bayview.us', signup: '2025-06-09', country: 'US', channel: 'referral', tier: 'enterprise' },
  { id: 126, name: 'Arjun Deshmukh', email: 'arjun@singtech.sg', signup: '2025-06-15', country: 'SG', channel: 'email_campaign', tier: 'starter' },
  { id: 127, name: 'Ruby Walsh', email: 'ruby@ottawaflow.ca', signup: '2025-06-23', country: 'CA', channel: 'paid_social', tier: 'pro' },

  // H2 2025 & Early 2026 signups
  { id: 128, name: 'Daniel Kim', email: 'dkim@seattlemetrics.us', signup: '2025-07-10', country: 'US', channel: 'organic_search', tier: 'pro' },
  { id: 129, name: 'Amelie Laurent', email: 'amelie@londonops.uk', signup: '2025-08-05', country: 'UK', channel: 'partner', tier: 'enterprise' },
  { id: 130, name: 'Tariq Hassan', email: 'tariq@frankfurtbi.de', signup: '2025-09-12', country: 'DE', channel: 'referral', tier: 'starter' },
  { id: 131, name: 'Grace Liu', email: 'grace.liu@melbournedata.au', signup: '2025-10-03', country: 'AU', channel: 'organic_search', tier: 'pro' },
  { id: 132, name: 'Victor Alvarez', email: 'victor@austincloud.us', signup: '2025-11-11', country: 'US', channel: 'paid_social', tier: 'starter' },
  { id: 133, name: 'Tessa Van Dijk', email: 'tessa@torontohq.ca', signup: '2025-12-02', country: 'CA', channel: null, tier: 'pro' },
  { id: 134, name: 'Owen Pritchard', email: 'owen@bristoltech.uk', signup: '2026-01-08', country: 'UK', channel: 'email_campaign', tier: 'starter' },
  { id: 135, name: 'Maya Subramanian', email: 'maya@marinaanalytics.sg', signup: '2026-01-22', country: 'SG', channel: 'organic_search', tier: 'enterprise' },
  { id: 136, name: 'Lucas Carter', email: 'lucas@denverops.us', signup: '2026-02-10', country: 'US', channel: 'referral', tier: 'pro' },

  // Users who signed up but NEVER placed an order (6 users for Easy Q4 LEFT JOIN)
  { id: 137, name: 'Harper Collins', email: 'harper.c@trialuser.us', signup: '2025-08-19', country: 'US', channel: 'paid_social', tier: 'free' },
  { id: 138, name: 'Felix Richter', email: 'felix.r@sandbox.de', signup: '2025-10-27', country: 'DE', channel: 'organic_search', tier: 'free' },
  { id: 139, name: 'Nina Petrov', email: 'nina.p@evaluate.ca', signup: '2025-12-14', country: 'CA', channel: null, tier: 'starter' },
  { id: 140, name: 'Samuel Boateng', email: 'samuel.b@prospect.uk', signup: '2026-01-15', country: 'UK', channel: 'email_campaign', tier: 'free' },
  { id: 141, name: 'Chloe Tan', email: 'chloe.tan@explore.sg', signup: '2026-02-18', country: 'SG', channel: 'referral', tier: 'free' },
  { id: 142, name: 'Jack Henderson', email: 'jack.h@perthlabs.au', signup: '2026-03-05', country: 'AU', channel: 'paid_social', tier: 'starter' },
];

const PRODUCTS: ProductRow[] = [
  // Analytics (1-4)
  { id: 1, name: 'BI Dashboard Pro', category: 'Analytics', cost: 85.0, launch: '2024-06-01' },
  { id: 2, name: 'Cohort Explorer Add-on', category: 'Analytics', cost: 45.0, launch: '2024-09-15' },
  { id: 3, name: 'Executive SQL Studio', category: 'Analytics', cost: 110.0, launch: '2025-01-10' },
  { id: 4, name: 'Attribution Tracker', category: 'Analytics', cost: 35.0, launch: '2025-04-01' },

  // Automation (5-8) — Products 6 and 7 will intentionally tie for #2 revenue in completed orders!
  { id: 5, name: 'Workflow Orchestrator', category: 'Automation', cost: 95.0, launch: '2024-07-01' },
  { id: 6, name: 'Webhook Sync Engine', category: 'Automation', cost: 50.0, launch: '2024-10-12' },
  { id: 7, name: 'Alert Bot Suite', category: 'Automation', cost: 42.0, launch: '2025-02-01' },
  { id: 8, name: 'CSV Scheduler Lite', category: 'Automation', cost: 20.0, launch: '2025-05-15' },

  // Data Storage (9-12)
  { id: 9, name: 'Cloud Warehouse 1TB', category: 'Data Storage', cost: 130.0, launch: '2024-05-20' },
  { id: 10, name: 'Cold Archive Vault', category: 'Data Storage', cost: 40.0, launch: '2024-11-01' },
  { id: 11, name: 'Realtime Stream Buffer', category: 'Data Storage', cost: 75.0, launch: '2025-03-01' },
  { id: 12, name: 'Snapshot Backup Pack', category: 'Data Storage', cost: 28.0, launch: '2025-06-10' },

  // Hardware (13-16)
  { id: 13, name: 'Edge Telemetry Gateway', category: 'Hardware', cost: 180.0, launch: '2024-08-01' },
  { id: 14, name: 'POS Barcode Scanner', category: 'Hardware', cost: 65.0, launch: '2024-12-01' },
  { id: 15, name: 'NFC Checkout Terminal', category: 'Hardware', cost: 140.0, launch: '2025-02-15' },
  { id: 16, name: 'Thermal Receipt Printer', category: 'Hardware', cost: 55.0, launch: '2025-07-01' },
];

// Carefully engineered orders across 2025-01 to 2026-03:
// - Every month from 2025-01 to 2026-03 has completed orders (15 months for Q9 MoM).
// - Continuous daily completed orders 2026-03-01..2026-03-21 (21 days for Q10 7-day rolling avg).
// - Rich cohort repeat activity for 2025-01..2025-06 cohorts across offsets 0..3 (Q11).
// - 5 realistic duplicate completed order submissions (same user_id, order_date, total_amount) for Q8 ROW_NUMBER().
// - Intentional exact revenue tie in Automation category between Product 6 (Webhook Sync Engine) and Product 7 (Alert Bot Suite) for Q12 DENSE_RANK().
const ORDERS: OrderSeed[] = [
  // === 2025-01 (Jan Cohort M0) ===
  { id: 1001, userId: 101, date: '2025-01-08', status: 'completed', discount: 'WELCOME10', items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 9, qty: 1, unitPrice: 290 }] },
  { id: 1002, userId: 102, date: '2025-01-12', status: 'completed', discount: null, items: [{ productId: 5, qty: 2, unitPrice: 220 }] },
  { id: 1003, userId: 103, date: '2025-01-16', status: 'completed', discount: 'WELCOME10', items: [{ productId: 13, qty: 1, unitPrice: 360 }, { productId: 2, qty: 1, unitPrice: 110 }] },
  { id: 1004, userId: 104, date: '2025-01-21', status: 'completed', discount: null, items: [{ productId: 14, qty: 2, unitPrice: 145 }] },
  { id: 1005, userId: 105, date: '2025-01-25', status: 'refunded', discount: null, items: [{ productId: 8, qty: 2, unitPrice: 55 }] },

  // === 2025-02 (Jan Cohort M1 + Feb Cohort M0) ===
  { id: 1006, userId: 101, date: '2025-02-07', status: 'completed', discount: null, items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1007, userId: 102, date: '2025-02-11', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 6, qty: 3, unitPrice: 120 }] }, // P6: +360
  { id: 1008, userId: 103, date: '2025-02-14', status: 'completed', discount: null, items: [{ productId: 10, qty: 2, unitPrice: 95 }] },
  { id: 1009, userId: 106, date: '2025-02-05', status: 'completed', discount: 'WELCOME10', items: [{ productId: 9, qty: 2, unitPrice: 290 }, { productId: 1, qty: 1, unitPrice: 180 }] },
  { id: 1010, userId: 107, date: '2025-02-12', status: 'completed', discount: null, items: [{ productId: 7, qty: 4, unitPrice: 100 }] }, // P7: +400
  { id: 1011, userId: 108, date: '2025-02-18', status: 'completed', discount: null, items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1012, userId: 109, date: '2025-02-22', status: 'completed', discount: 'WELCOME10', items: [{ productId: 14, qty: 1, unitPrice: 145 }] },
  { id: 1013, userId: 110, date: '2025-02-25', status: 'cancelled', discount: null, items: [{ productId: 2, qty: 1, unitPrice: 110 }] },

  // === 2025-03 (Jan M2, Feb M1, Mar M0) ===
  { id: 1014, userId: 101, date: '2025-03-06', status: 'completed', discount: 'VIP25', items: [{ productId: 5, qty: 2, unitPrice: 220 }, { productId: 11, qty: 1, unitPrice: 175 }] },
  { id: 1015, userId: 102, date: '2025-03-14', status: 'completed', discount: null, items: [{ productId: 1, qty: 1, unitPrice: 180 }] },
  { id: 1016, userId: 106, date: '2025-03-08', status: 'completed', discount: null, items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1017, userId: 107, date: '2025-03-19', status: 'completed', discount: 'SPRING20', items: [{ productId: 6, qty: 3, unitPrice: 120 }] }, // P6: +360 (total 720)
  { id: 1018, userId: 108, date: '2025-03-23', status: 'refunded', discount: null, items: [{ productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1019, userId: 111, date: '2025-03-04', status: 'completed', discount: 'WELCOME10', items: [{ productId: 9, qty: 2, unitPrice: 290 }, { productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1020, userId: 112, date: '2025-03-11', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },
  { id: 1021, userId: 113, date: '2025-03-17', status: 'completed', discount: 'SPRING20', items: [{ productId: 7, qty: 4, unitPrice: 100 }] }, // P7: +400 (total 800)
  { id: 1022, userId: 114, date: '2025-03-26', status: 'completed', discount: null, items: [{ productId: 8, qty: 3, unitPrice: 55 }] },
  // Duplicate submission #1 (same user 112, date 2025-03-11, total 350)
  { id: 1023, userId: 112, date: '2025-03-11', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },

  // === 2025-04 (Jan M3, Feb M2, Mar M1, Apr M0) ===
  { id: 1024, userId: 101, date: '2025-04-09', status: 'completed', discount: null, items: [{ productId: 9, qty: 1, unitPrice: 290 }] },
  { id: 1025, userId: 106, date: '2025-04-14', status: 'completed', discount: 'VIP25', items: [{ productId: 5, qty: 3, unitPrice: 220 }] },
  { id: 1026, userId: 111, date: '2025-04-10', status: 'completed', discount: null, items: [{ productId: 1, qty: 2, unitPrice: 180 }] },
  { id: 1027, userId: 112, date: '2025-04-18', status: 'completed', discount: null, items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1028, userId: 116, date: '2025-04-06', status: 'completed', discount: 'WELCOME10', items: [{ productId: 4, qty: 2, unitPrice: 85 }, { productId: 10, qty: 2, unitPrice: 95 }] },
  { id: 1029, userId: 117, date: '2025-04-12', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 3, qty: 2, unitPrice: 240 }, { productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1030, userId: 118, date: '2025-04-20', status: 'completed', discount: null, items: [{ productId: 14, qty: 1, unitPrice: 145 }] },
  { id: 1031, userId: 119, date: '2025-04-24', status: 'completed', discount: null, items: [{ productId: 6, qty: 2, unitPrice: 120 }] }, // P6: +240 (total 960)
  { id: 1032, userId: 115, date: '2025-04-28', status: 'refunded', discount: null, items: [{ productId: 4, qty: 1, unitPrice: 85 }] },

  // === 2025-05 (Feb M3, Mar M2, Apr M1, May M0) ===
  { id: 1033, userId: 106, date: '2025-05-05', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },
  { id: 1034, userId: 111, date: '2025-05-11', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 15, qty: 2, unitPrice: 310 }] },
  { id: 1035, userId: 116, date: '2025-05-16', status: 'completed', discount: null, items: [{ productId: 2, qty: 2, unitPrice: 110 }] },
  { id: 1036, userId: 117, date: '2025-05-20', status: 'completed', discount: 'VIP25', items: [{ productId: 9, qty: 2, unitPrice: 290 }] },
  { id: 1037, userId: 120, date: '2025-05-04', status: 'completed', discount: 'WELCOME10', items: [{ productId: 5, qty: 2, unitPrice: 220 }, { productId: 1, qty: 2, unitPrice: 180 }] },
  { id: 1038, userId: 121, date: '2025-05-10', status: 'completed', discount: null, items: [{ productId: 7, qty: 4, unitPrice: 100 }] }, // P7: +400 (total 1200)
  { id: 1039, userId: 122, date: '2025-05-19', status: 'completed', discount: null, items: [{ productId: 12, qty: 3, unitPrice: 65 }] },
  { id: 1040, userId: 123, date: '2025-05-25', status: 'refunded', discount: null, items: [{ productId: 16, qty: 1, unitPrice: 125 }] },

  // === 2025-06 (Mar M3, Apr M2, May M1, Jun M0) ===
  { id: 1041, userId: 111, date: '2025-06-03', status: 'completed', discount: null, items: [{ productId: 3, qty: 1, unitPrice: 240 }] },
  { id: 1042, userId: 117, date: '2025-06-08', status: 'completed', discount: null, items: [{ productId: 6, qty: 2, unitPrice: 120 }] }, // P6: +240 (total 1200)
  { id: 1043, userId: 120, date: '2025-06-12', status: 'completed', discount: null, items: [{ productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1044, userId: 121, date: '2025-06-19', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 10, qty: 3, unitPrice: 95 }] },
  { id: 1045, userId: 124, date: '2025-06-06', status: 'completed', discount: 'WELCOME10', items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 4, qty: 2, unitPrice: 85 }] },
  { id: 1046, userId: 125, date: '2025-06-14', status: 'completed', discount: 'VIP25', items: [{ productId: 9, qty: 3, unitPrice: 290 }] },
  { id: 1047, userId: 126, date: '2025-06-21', status: 'completed', discount: null, items: [{ productId: 16, qty: 2, unitPrice: 125 }] },
  { id: 1048, userId: 127, date: '2025-06-26', status: 'completed', discount: null, items: [{ productId: 2, qty: 2, unitPrice: 110 }] },
  // Duplicate submission #2 (same user 124, date 2025-06-06, total 530)
  { id: 1049, userId: 124, date: '2025-06-06', status: 'completed', discount: 'WELCOME10', items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 4, qty: 2, unitPrice: 85 }] },

  // === 2025-07 (Apr M3, May M2, Jun M1 + H2 2025 start for Q6) ===
  { id: 1050, userId: 117, date: '2025-07-05', status: 'completed', discount: null, items: [{ productId: 5, qty: 2, unitPrice: 220 }] },
  { id: 1051, userId: 120, date: '2025-07-11', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },
  { id: 1052, userId: 124, date: '2025-07-15', status: 'completed', discount: null, items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1053, userId: 125, date: '2025-07-18', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1054, userId: 128, date: '2025-07-22', status: 'completed', discount: 'WELCOME10', items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 12, qty: 2, unitPrice: 65 }] },
  { id: 1055, userId: 118, date: '2025-07-28', status: 'refunded', discount: null, items: [{ productId: 14, qty: 2, unitPrice: 145 }] },

  // === 2025-08 (May M3, Jun M2 + H2 2025) ===
  { id: 1056, userId: 120, date: '2025-08-04', status: 'completed', discount: null, items: [{ productId: 9, qty: 1, unitPrice: 290 }] },
  { id: 1057, userId: 125, date: '2025-08-10', status: 'completed', discount: null, items: [{ productId: 13, qty: 2, unitPrice: 360 }] },
  { id: 1058, userId: 129, date: '2025-08-14', status: 'completed', discount: 'WELCOME10', items: [{ productId: 5, qty: 2, unitPrice: 220 }, { productId: 9, qty: 1, unitPrice: 290 }] },
  { id: 1059, userId: 128, date: '2025-08-21', status: 'completed', discount: null, items: [{ productId: 6, qty: 5, unitPrice: 120 }] }, // P6: +600 (total 1800)
  { id: 1060, userId: 114, date: '2025-08-27', status: 'cancelled', discount: null, items: [{ productId: 16, qty: 1, unitPrice: 125 }] },

  // === 2025-09 (Jun M3 + H2 2025) ===
  { id: 1061, userId: 125, date: '2025-09-04', status: 'completed', discount: 'VIP25', items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1062, userId: 129, date: '2025-09-12', status: 'completed', discount: null, items: [{ productId: 1, qty: 3, unitPrice: 180 }] },
  { id: 1063, userId: 130, date: '2025-09-18', status: 'completed', discount: 'WELCOME10', items: [{ productId: 16, qty: 2, unitPrice: 125 }, { productId: 8, qty: 2, unitPrice: 55 }] },
  { id: 1064, userId: 103, date: '2025-09-25', status: 'completed', discount: null, items: [{ productId: 7, qty: 6, unitPrice: 100 }] }, // P7: +600 (total 1800 — EXACT TIE WITH P6!)
  { id: 1065, userId: 109, date: '2025-09-28', status: 'refunded', discount: null, items: [{ productId: 10, qty: 2, unitPrice: 95 }] },

  // === 2025-10 (H2 2025) ===
  { id: 1066, userId: 131, date: '2025-10-06', status: 'completed', discount: 'WELCOME10', items: [{ productId: 11, qty: 2, unitPrice: 175 }, { productId: 2, qty: 2, unitPrice: 110 }] },
  { id: 1067, userId: 106, date: '2025-10-14', status: 'completed', discount: null, items: [{ productId: 15, qty: 2, unitPrice: 310 }] },
  { id: 1068, userId: 119, date: '2025-10-20', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 5, qty: 1, unitPrice: 220 }, { productId: 12, qty: 2, unitPrice: 65 }] },
  { id: 1069, userId: 122, date: '2025-10-27', status: 'pending', discount: null, items: [{ productId: 14, qty: 2, unitPrice: 145 }] },
  // Duplicate submission #3 (same user 131, date 2025-10-06, total 570)
  { id: 1070, userId: 131, date: '2025-10-06', status: 'completed', discount: 'WELCOME10', items: [{ productId: 11, qty: 2, unitPrice: 175 }, { productId: 2, qty: 2, unitPrice: 110 }] },

  // === 2025-11 (H2 2025) ===
  { id: 1071, userId: 132, date: '2025-11-12', status: 'completed', discount: 'WELCOME10', items: [{ productId: 14, qty: 2, unitPrice: 145 }] },
  { id: 1072, userId: 101, date: '2025-11-16', status: 'completed', discount: 'VIP25', items: [{ productId: 9, qty: 2, unitPrice: 290 }, { productId: 3, qty: 1, unitPrice: 240 }] },
  { id: 1073, userId: 127, date: '2025-11-22', status: 'completed', discount: null, items: [{ productId: 4, qty: 3, unitPrice: 85 }] },
  { id: 1074, userId: 130, date: '2025-11-28', status: 'refunded', discount: null, items: [{ productId: 8, qty: 3, unitPrice: 55 }] },

  // === 2025-12 (H2 2025 peak) ===
  { id: 1075, userId: 133, date: '2025-12-04', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 13, qty: 2, unitPrice: 360 }] },
  { id: 1076, userId: 129, date: '2025-12-10', status: 'completed', discount: 'VIP25', items: [{ productId: 5, qty: 3, unitPrice: 220 }, { productId: 11, qty: 1, unitPrice: 175 }] },
  { id: 1077, userId: 128, date: '2025-12-18', status: 'completed', discount: null, items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 10, qty: 2, unitPrice: 95 }] },
  { id: 1078, userId: 110, date: '2025-12-23', status: 'completed', discount: null, items: [{ productId: 16, qty: 2, unitPrice: 125 }] },
  { id: 1079, userId: 126, date: '2025-12-29', status: 'cancelled', discount: null, items: [{ productId: 12, qty: 2, unitPrice: 65 }] },

  // === 2026-01 (Q1 2026) ===
  { id: 1080, userId: 134, date: '2026-01-09', status: 'completed', discount: 'WELCOME10', items: [{ productId: 2, qty: 2, unitPrice: 110 }] },
  { id: 1081, userId: 135, date: '2026-01-14', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 9, qty: 2, unitPrice: 290 }, { productId: 1, qty: 1, unitPrice: 180 }] },
  { id: 1082, userId: 102, date: '2026-01-19', status: 'completed', discount: null, items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1083, userId: 113, date: '2026-01-24', status: 'refunded', discount: 'WELCOME10', items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1084, userId: 132, date: '2026-01-29', status: 'completed', discount: null, items: [{ productId: 8, qty: 3, unitPrice: 55 }] },

  // === 2026-02 (Q1 2026) ===
  { id: 1085, userId: 136, date: '2026-02-05', status: 'completed', discount: 'WELCOME10', items: [{ productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1086, userId: 135, date: '2026-02-11', status: 'completed', discount: 'VIP25', items: [{ productId: 5, qty: 2, unitPrice: 220 }] },
  { id: 1087, userId: 107, date: '2026-02-16', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },
  { id: 1088, userId: 134, date: '2026-02-21', status: 'refunded', discount: null, items: [{ productId: 14, qty: 2, unitPrice: 145 }] },
  { id: 1089, userId: 121, date: '2026-02-26', status: 'completed', discount: null, items: [{ productId: 1, qty: 1, unitPrice: 180 }, { productId: 4, qty: 1, unitPrice: 85 }] },
  // Duplicate submission #4 (same user 136, date 2026-02-05, total 360)
  { id: 1090, userId: 136, date: '2026-02-05', status: 'completed', discount: 'WELCOME10', items: [{ productId: 13, qty: 1, unitPrice: 360 }] },

  // === 2026-03 (Continuous 21-day daily series: 2026-03-01 to 2026-03-21 for Q10 7-day rolling avg!) ===
  { id: 1091, userId: 101, date: '2026-03-01', status: 'completed', discount: 'SPRING20', items: [{ productId: 1, qty: 2, unitPrice: 180 }] },
  { id: 1092, userId: 106, date: '2026-03-02', status: 'completed', discount: null, items: [{ productId: 9, qty: 1, unitPrice: 290 }] },
  { id: 1093, userId: 111, date: '2026-03-03', status: 'completed', discount: 'SPRING20', items: [{ productId: 3, qty: 2, unitPrice: 240 }] },
  { id: 1094, userId: 112, date: '2026-03-04', status: 'completed', discount: null, items: [{ productId: 10, qty: 2, unitPrice: 95 }] },
  { id: 1095, userId: 116, date: '2026-03-05', status: 'completed', discount: null, items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1096, userId: 117, date: '2026-03-06', status: 'completed', discount: 'VIP25', items: [{ productId: 5, qty: 2, unitPrice: 220 }] },
  { id: 1097, userId: 120, date: '2026-03-07', status: 'completed', discount: null, items: [{ productId: 11, qty: 1, unitPrice: 175 }] },
  { id: 1098, userId: 124, date: '2026-03-08', status: 'completed', discount: 'SPRING20', items: [{ productId: 2, qty: 2, unitPrice: 110 }] },
  { id: 1099, userId: 125, date: '2026-03-09', status: 'completed', discount: null, items: [{ productId: 13, qty: 1, unitPrice: 360 }, { productId: 12, qty: 2, unitPrice: 65 }] },
  { id: 1100, userId: 128, date: '2026-03-10', status: 'completed', discount: null, items: [{ productId: 14, qty: 2, unitPrice: 145 }] },
  { id: 1101, userId: 129, date: '2026-03-11', status: 'completed', discount: 'ANNUAL15', items: [{ productId: 9, qty: 2, unitPrice: 290 }] },
  { id: 1102, userId: 131, date: '2026-03-12', status: 'completed', discount: null, items: [{ productId: 4, qty: 2, unitPrice: 85 }] },
  { id: 1103, userId: 133, date: '2026-03-13', status: 'completed', discount: 'SPRING20', items: [{ productId: 16, qty: 2, unitPrice: 125 }] },
  { id: 1104, userId: 135, date: '2026-03-14', status: 'completed', discount: 'VIP25', items: [{ productId: 3, qty: 2, unitPrice: 240 }, { productId: 12, qty: 2, unitPrice: 65 }] },
  { id: 1105, userId: 136, date: '2026-03-15', status: 'completed', discount: null, items: [{ productId: 10, qty: 3, unitPrice: 95 }] },
  { id: 1106, userId: 103, date: '2026-03-16', status: 'completed', discount: null, items: [{ productId: 1, qty: 1, unitPrice: 180 }] },
  { id: 1107, userId: 108, date: '2026-03-17', status: 'completed', discount: 'SPRING20', items: [{ productId: 15, qty: 1, unitPrice: 310 }] },
  { id: 1108, userId: 119, date: '2026-03-18', status: 'completed', discount: null, items: [{ productId: 8, qty: 4, unitPrice: 55 }] },
  { id: 1109, userId: 127, date: '2026-03-19', status: 'completed', discount: null, items: [{ productId: 11, qty: 2, unitPrice: 175 }] },
  { id: 1110, userId: 102, date: '2026-03-20', status: 'completed', discount: 'SPRING20', items: [{ productId: 1, qty: 2, unitPrice: 180 }, { productId: 2, qty: 1, unitPrice: 110 }] },
  { id: 1111, userId: 106, date: '2026-03-21', status: 'completed', discount: 'VIP25', items: [{ productId: 9, qty: 1, unitPrice: 290 }, { productId: 16, qty: 1, unitPrice: 125 }] },

  // Extra Q1 2026 non-completed + duplicate order #5
  { id: 1112, userId: 104, date: '2026-03-10', status: 'pending', discount: null, items: [{ productId: 4, qty: 2, unitPrice: 85 }] },
  { id: 1113, userId: 118, date: '2026-03-14', status: 'refunded', discount: 'SPRING20', items: [{ productId: 13, qty: 1, unitPrice: 360 }] },
  { id: 1114, userId: 122, date: '2026-03-17', status: 'cancelled', discount: null, items: [{ productId: 8, qty: 2, unitPrice: 55 }] },
  // Duplicate submission #5 (same user 101, date 2026-03-01, total 360)
  { id: 1115, userId: 101, date: '2026-03-01', status: 'completed', discount: 'SPRING20', items: [{ productId: 1, qty: 2, unitPrice: 180 }] },
];

function sqlStr(val: string | null): string {
  if (val === null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export function buildSeedSql(): string {
  const lines: string[] = [
    'PRAGMA foreign_keys = ON;',
    '',
    'DROP TABLE IF EXISTS product_reviews;',
    'DROP TABLE IF EXISTS marketing_campaigns;',
    'DROP TABLE IF EXISTS support_tickets;',
    'DROP TABLE IF EXISTS web_events;',
    'DROP TABLE IF EXISTS subscriptions;',
    'DROP TABLE IF EXISTS order_items;',
    'DROP TABLE IF EXISTS orders;',
    'DROP TABLE IF EXISTS products;',
    'DROP TABLE IF EXISTS users;',
    '',
    `CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  signup_date TEXT NOT NULL,
  country TEXT NOT NULL,
  acquisition_channel TEXT,
  plan_tier TEXT NOT NULL
);`,
    '',
    `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_price REAL NOT NULL,
  launch_date TEXT NOT NULL
);`,
    '',
    `CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'refunded', 'pending', 'cancelled')),
  total_amount REAL NOT NULL,
  discount_code TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
    '',
    `CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);`,
    '',
  ];

  // Insert users
  const userValues = USERS.map(
    (u) =>
      `(${u.id}, ${sqlStr(u.name)}, ${sqlStr(u.email)}, ${sqlStr(u.signup)}, ${sqlStr(u.country)}, ${sqlStr(u.channel)}, ${sqlStr(u.tier)})`
  );
  lines.push(
    `INSERT INTO users (user_id, full_name, email, signup_date, country, acquisition_channel, plan_tier) VALUES\n${userValues.join(',\n')};`
  );
  lines.push('');

  // Insert products
  const productValues = PRODUCTS.map(
    (p) =>
      `(${p.id}, ${sqlStr(p.name)}, ${sqlStr(p.category)}, ${p.cost.toFixed(2)}, ${sqlStr(p.launch)})`
  );
  lines.push(
    `INSERT INTO products (product_id, product_name, category, cost_price, launch_date) VALUES\n${productValues.join(',\n')};`
  );
  lines.push('');

  // Insert orders & order_items
  const orderValues: string[] = [];
  const itemValues: string[] = [];
  let itemId = 5001;

  for (const o of ORDERS) {
    const computedTotal = o.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    const total = o.overrideTotal ?? computedTotal;
    orderValues.push(
      `(${o.id}, ${o.userId}, ${sqlStr(o.date)}, ${sqlStr(o.status)}, ${total.toFixed(2)}, ${sqlStr(o.discount)})`
    );
    for (const it of o.items) {
      itemValues.push(`(${itemId++}, ${o.id}, ${it.productId}, ${it.qty}, ${it.unitPrice.toFixed(2)})`);
    }
  }

  lines.push(
    `INSERT INTO orders (order_id, user_id, order_date, status, total_amount, discount_code) VALUES\n${orderValues.join(',\n')};`
  );
  lines.push('');

  lines.push(
    `INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) VALUES\n${itemValues.join(',\n')};`
  );
  lines.push('');
  lines.push(buildExtendedSeedSql());

  return lines.join('\n');
}

export const SEED_SQL = buildSeedSql();
const CORE_TOTAL =
  USERS.length +
  PRODUCTS.length +
  ORDERS.length +
  ORDERS.reduce((acc, o) => acc + o.items.length, 0);

export const SEED_STATS = {
  users: USERS.length,
  products: PRODUCTS.length,
  orders: ORDERS.length,
  orderItems: ORDERS.reduce((acc, o) => acc + o.items.length, 0),
  ...EXTENDED_SEED_COUNTS,
  totalRows:
    CORE_TOTAL +
    EXTENDED_SEED_COUNTS.subscriptions +
    EXTENDED_SEED_COUNTS.webEvents +
    EXTENDED_SEED_COUNTS.supportTickets +
    EXTENDED_SEED_COUNTS.marketingCampaigns +
    EXTENDED_SEED_COUNTS.productReviews,
};
