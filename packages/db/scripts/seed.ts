import { createPool } from "../src/client";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CONN_A = "aaaa1111-1111-1111-1111-111111111111";
const CONN_B = "bbbb1111-1111-1111-1111-111111111111";

async function main() {
  const adminUrl =
    process.env.DATABASE_URL_ADMIN ??
    "postgresql://dev:pwPostgres@localhost:5432/closry";
  const pool = createPool(adminUrl);
  const db = drizzle(pool);

  await db.execute(sql`TRUNCATE tenants, users, connections CASCADE`);

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

  console.log("seeded:", { TENANT_A, USER_A, TENANT_B, USER_B });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});