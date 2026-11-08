import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgRole,
  pgPolicy,
  index,
} from "drizzle-orm/pg-core";

export const appUser = pgRole("app_user").existing();

// --- tenants ---
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: text("plan").notNull().default("free"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIsolation: pgPolicy("tenant_isolation", {
      as: "permissive",
      to: appUser,
      using: sql`id = current_setting('app.tenant_id', true)::uuid`,
      withCheck: sql`id = current_setting('app.tenant_id', true)::uuid`,
    }),
  })
).enableRLS();

// --- users ---
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    email: text("email").notNull().unique(),
    cognitoSub: text("cognito_sub").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: text("role").notNull().default("viewer"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIsolation: pgPolicy("tenant_isolation", {
      as: "permissive",
      to: appUser,
      using: sql`tenant_id = current_setting('app.tenant_id', true)::uuid`,
      withCheck: sql`tenant_id = current_setting('app.tenant_id', true)::uuid`,
    }),
    tenantIdx: index("idx_users_tenant").on(t.tenantId),
  })
).enableRLS();

// --- connections ---
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("pending"),
    credentialsEncrypted: text("credentials_encrypted"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIsolation: pgPolicy("tenant_isolation", {
      as: "permissive",
      to: appUser,
      using: sql`tenant_id = current_setting('app.tenant_id', true)::uuid`,
      withCheck: sql`tenant_id = current_setting('app.tenant_id', true)::uuid`,
    }),
    tenantIdx: index("idx_connections_tenant").on(t.tenantId),
  })
).enableRLS();