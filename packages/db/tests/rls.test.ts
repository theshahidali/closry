import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

const APP_USER_URL =
  process.env.TEST_APP_USER_URL ??
  "postgresql://app_user:pwAppUser@localhost:5432/closry";

const tenantA = randomUUID();
const tenantB = randomUUID();

let pool: Pool;

async function withTenant<T>(
  tenantId: string,
  fn: (client: Pool["connect"] extends (...args: never[]) => Promise<infer C> ? C : never) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

describe("RLS tenant isolation", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: APP_USER_URL, max: 2 });

    // Seed as app_user, switching context per tenant.
    await withTenant(tenantA, (c) =>
      c.query("INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)", [
        tenantA,
        "Acme",
        "acme",
      ])
    );
    await withTenant(tenantB, (c) =>
      c.query("INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)", [
        tenantB,
        "Beta",
        "beta",
      ])
    );
  });

  afterAll(async () => {
    // Cleanup must go through admin because app_user can't see other tenants.
    const admin = new Pool({
      connectionString:
        process.env.TEST_ADMIN_URL ??
        "postgresql://dev:pwPostgres@localhost:5432/closry",
    });
    await admin.query("DELETE FROM tenants WHERE id IN ($1, $2)", [
      tenantA,
      tenantB,
    ]);
    await admin.end();
    await pool.end();
  });

  it("tenant A cannot read tenant B rows", async () => {
    const rows = await withTenant(tenantA, async (c) => {
      const r = await c.query("SELECT * FROM tenants");
      return r.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(tenantA);
  });

  it("tenant A cannot insert a row for tenant B", async () => {
    await expect(
      withTenant(tenantA, (c) =>
        c.query("INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)", [
          tenantB,
          "Beta",
          "beta-2",
        ])
      )
    ).rejects.toThrow(/row-level security policy/);
  });

    it("withTenant helper enforces isolation", async () => {
        const { createPool } = await import("../src/client");
        const { withTenant } = await import("../src/tenant");
        const { tenants } = await import("../src/schema");

        const pool = createPool(APP_USER_URL);
        const rows = await withTenant(pool, tenantA, (tx) =>
            tx.select().from(tenants),
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(tenantA);
        await pool.end();
    });
});