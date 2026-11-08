import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Two connection strings matter:
 *  - DATABASE_URL_ADMIN: used by migrations (dev/superuser role)
 *  - DATABASE_URL:       used by the app (app_user, NOBYPASSRLS)
 *
 * The app must NEVER connect as the admin role. If it does, RLS is bypassed
 * and tenant isolation silently breaks.
 */
export function createAppClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  return drizzle(pool);
}