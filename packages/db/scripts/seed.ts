import { createPool } from "../src/client";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CONN_A = "aaaa1111-1111-1111-1111-111111111111";
const CONN_B = "bbbb1111-1111-1111-1111-111111111111";

// Three months of demo financials per tenant, shaped so Oct variance
// against Sep produces the numbers in the spec's Screen 1 table.
const ACME_MONTHS: Array<{
  month: string;
  entries: Array<{
    code: string; name: string; type: "revenue" | "cogs" | "opex";
    sub: string; amount: number;
  }>;
}> = [
  {
    month: "2026-08-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue", sub: "subscriptions", amount: 1_050_000 },
      { code: "4100", name: "Services Revenue", type: "revenue", sub: "consulting", amount: 55_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs", sub: "hosting", amount: 215_000 },
      { code: "5100", name: "Customer Support", type: "cogs", sub: "support", amount: 102_000 },
      { code: "5200", name: "Payment Processing", type: "cogs", sub: "payments", amount: 44_000 },
      { code: "6000", name: "Payroll", type: "opex", sub: "people", amount: 252_000 },
      { code: "6100", name: "Marketing", type: "opex", sub: "growth", amount: 82_000 },
      { code: "6200", name: "G&A", type: "opex", sub: "admin", amount: 42_000 },
      { code: "6300", name: "Sales", type: "opex", sub: "revenue-ops", amount: 108_000 },
    ],
  },
  {
    month: "2026-09-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue", sub: "subscriptions", amount: 1_100_000 },
      { code: "4100", name: "Services Revenue", type: "revenue", sub: "consulting", amount: 50_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs", sub: "hosting", amount: 225_000 },
      { code: "5100", name: "Customer Support", type: "cogs", sub: "support", amount: 108_000 },
      { code: "5200", name: "Payment Processing", type: "cogs", sub: "payments", amount: 47_000 },
      { code: "6000", name: "Payroll", type: "opex", sub: "people", amount: 265_000 },
      { code: "6100", name: "Marketing", type: "opex", sub: "growth", amount: 88_000 },
      { code: "6200", name: "G&A", type: "opex", sub: "admin", amount: 44_000 },
      { code: "6300", name: "Sales", type: "opex", sub: "revenue-ops", amount: 95_000 },
    ],
  },
  {
    month: "2026-10-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue", sub: "subscriptions", amount: 1_180_000 },
      { code: "4100", name: "Services Revenue", type: "revenue", sub: "consulting", amount: 60_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs", sub: "hosting", amount: 240_000 },
      { code: "5100", name: "Customer Support", type: "cogs", sub: "support", amount: 120_000 },
      { code: "5200", name: "Payment Processing", type: "cogs", sub: "payments", amount: 52_000 },
      { code: "6000", name: "Payroll", type: "opex", sub: "people", amount: 280_000 },
      { code: "6100", name: "Marketing", type: "opex", sub: "growth", amount: 95_000 },
      { code: "6200", name: "G&A", type: "opex", sub: "admin", amount: 40_000 },
      { code: "6300", name: "Sales", type: "opex", sub: "revenue-ops", amount: 101_000 },
    ],
  },
];

const BETA_MONTHS = [
  {
    month: "2026-08-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue" as const, sub: "subscriptions", amount: 165_000 },
      { code: "4100", name: "Services Revenue", type: "revenue" as const, sub: "consulting", amount: 14_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs" as const, sub: "hosting", amount: 42_000 },
      { code: "5100", name: "Customer Support", type: "cogs" as const, sub: "support", amount: 19_000 },
      { code: "5200", name: "Payment Processing", type: "cogs" as const, sub: "payments", amount: 8_000 },
      { code: "6000", name: "Payroll", type: "opex" as const, sub: "people", amount: 65_000 },
      { code: "6100", name: "Marketing", type: "opex" as const, sub: "growth", amount: 16_000 },
      { code: "6200", name: "G&A", type: "opex" as const, sub: "admin", amount: 12_000 },
      { code: "6300", name: "Sales", type: "opex" as const, sub: "revenue-ops", amount: 14_000 },
    ],
  },
  {
    month: "2026-09-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue" as const, sub: "subscriptions", amount: 172_000 },
      { code: "4100", name: "Services Revenue", type: "revenue" as const, sub: "consulting", amount: 14_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs" as const, sub: "hosting", amount: 44_000 },
      { code: "5100", name: "Customer Support", type: "cogs" as const, sub: "support", amount: 20_000 },
      { code: "5200", name: "Payment Processing", type: "cogs" as const, sub: "payments", amount: 7_000 },
      { code: "6000", name: "Payroll", type: "opex" as const, sub: "people", amount: 67_000 },
      { code: "6100", name: "Marketing", type: "opex" as const, sub: "growth", amount: 17_000 },
      { code: "6200", name: "G&A", type: "opex" as const, sub: "admin", amount: 13_000 },
      { code: "6300", name: "Sales", type: "opex" as const, sub: "revenue-ops", amount: 13_000 },
    ],
  },
  {
    month: "2026-10-01",
    entries: [
      { code: "4000", name: "SaaS Revenue", type: "revenue" as const, sub: "subscriptions", amount: 180_000 },
      { code: "4100", name: "Services Revenue", type: "revenue" as const, sub: "consulting", amount: 15_000 },
      { code: "5000", name: "Cloud Infrastructure", type: "cogs" as const, sub: "hosting", amount: 45_000 },
      { code: "5100", name: "Customer Support", type: "cogs" as const, sub: "support", amount: 22_000 },
      { code: "5200", name: "Payment Processing", type: "cogs" as const, sub: "payments", amount: 8_000 },
      { code: "6000", name: "Payroll", type: "opex" as const, sub: "people", amount: 68_000 },
      { code: "6100", name: "Marketing", type: "opex" as const, sub: "growth", amount: 18_000 },
      { code: "6200", name: "G&A", type: "opex" as const, sub: "admin", amount: 12_000 },
      { code: "6300", name: "Sales", type: "opex" as const, sub: "revenue-ops", amount: 15_000 },
    ],
  },
];

const ACME_METRICS = [
  { month: "2026-08-01", key: "mrr", value: 1_050_000 },
  { month: "2026-08-01", key: "churn_rate", value: 2.4 },
  { month: "2026-08-01", key: "headcount", value: 38 },
  { month: "2026-08-01", key: "pipeline_value", value: 2_100_000 },
  { month: "2026-08-01", key: "csat", value: 4.5 },
  { month: "2026-09-01", key: "mrr", value: 1_100_000 },
  { month: "2026-09-01", key: "churn_rate", value: 2.3 },
  { month: "2026-09-01", key: "headcount", value: 40 },
  { month: "2026-09-01", key: "pipeline_value", value: 2_250_000 },
  { month: "2026-09-01", key: "csat", value: 4.6 },
  { month: "2026-10-01", key: "mrr", value: 1_180_000 },
  { month: "2026-10-01", key: "churn_rate", value: 2.1 },
  { month: "2026-10-01", key: "headcount", value: 42 },
  { month: "2026-10-01", key: "pipeline_value", value: 2_400_000 },
  { month: "2026-10-01", key: "csat", value: 4.6 },
];

const BETA_METRICS = [
  { month: "2026-08-01", key: "mrr", value: 165_000 },
  { month: "2026-08-01", key: "churn_rate", value: 4.8 },
  { month: "2026-08-01", key: "headcount", value: 7 },
  { month: "2026-08-01", key: "pipeline_value", value: 280_000 },
  { month: "2026-08-01", key: "csat", value: 4.1 },
  { month: "2026-09-01", key: "mrr", value: 172_000 },
  { month: "2026-09-01", key: "churn_rate", value: 4.5 },
  { month: "2026-09-01", key: "headcount", value: 8 },
  { month: "2026-09-01", key: "pipeline_value", value: 300_000 },
  { month: "2026-09-01", key: "csat", value: 4.2 },
  { month: "2026-10-01", key: "mrr", value: 180_000 },
  { month: "2026-10-01", key: "churn_rate", value: 4.2 },
  { month: "2026-10-01", key: "headcount", value: 8 },
  { month: "2026-10-01", key: "pipeline_value", value: 320_000 },
  { month: "2026-10-01", key: "csat", value: 4.2 },
];

async function main() {
  const adminUrl =
    process.env.DATABASE_URL_ADMIN ??
    "postgresql://dev:pwPostgres@localhost:5432/closry";
  const pool = createPool(adminUrl);
  const db = drizzle(pool);

  await db.execute(sql`
    TRUNCATE operational_metrics, financial_entries, connections, users, tenants CASCADE
  `);

  await db.execute(sql`
    INSERT INTO tenants (id, name, slug) VALUES
      (${TENANT_A}, 'Acme Corp', 'acme'),
      (${TENANT_B}, 'Beta Inc', 'beta')
  `);

  await db.execute(sql`
    INSERT INTO users (id, tenant_id, email, cognito_sub, full_name, role) VALUES
      (${USER_A}, ${TENANT_A}, 'cfo@acme.test', 'sub-acme', 'Alice (Acme CFO)', 'cfo'),
      (${USER_B}, ${TENANT_B}, 'cfo@beta.test', 'sub-beta', 'Bob (Beta CFO)', 'cfo')
  `);

  await db.execute(sql`
    INSERT INTO connections (id, tenant_id, provider, display_name, status) VALUES
      (${CONN_A}, ${TENANT_A}, 'quickbooks', 'Acme QBO', 'active'),
      (${CONN_B}, ${TENANT_B}, 'stripe', 'Beta Stripe', 'active')
  `);

  // Financial entries
  for (const m of ACME_MONTHS) {
    for (const e of m.entries) {
      await db.execute(sql`
        INSERT INTO financial_entries
          (tenant_id, connection_id, period_month, account_code, account_name, account_type, subcategory, amount)
        VALUES
          (${TENANT_A}, ${CONN_A}, ${m.month}, ${e.code}, ${e.name}, ${e.type}, ${e.sub}, ${e.amount})
      `);
    }
  }
  for (const m of BETA_MONTHS) {
    for (const e of m.entries) {
      await db.execute(sql`
        INSERT INTO financial_entries
          (tenant_id, connection_id, period_month, account_code, account_name, account_type, subcategory, amount)
        VALUES
          (${TENANT_B}, ${CONN_B}, ${m.month}, ${e.code}, ${e.name}, ${e.type}, ${e.sub}, ${e.amount})
      `);
    }
  }

  // Operational metrics
  for (const m of ACME_METRICS) {
    await db.execute(sql`
      INSERT INTO operational_metrics
        (tenant_id, connection_id, period_month, metric_key, metric_value)
      VALUES
        (${TENANT_A}, ${CONN_A}, ${m.month}, ${m.key}, ${m.value})
    `);
  }
  for (const m of BETA_METRICS) {
    await db.execute(sql`
      INSERT INTO operational_metrics
        (tenant_id, connection_id, period_month, metric_key, metric_value)
      VALUES
        (${TENANT_B}, ${CONN_B}, ${m.month}, ${m.key}, ${m.value})
    `);
  }

  console.log("seeded: 2 tenants, 3 months financials, 5 metrics each");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});