CREATE TABLE IF NOT EXISTS "company_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_code" text NOT NULL,
	"driver_pattern" text NOT NULL,
	"evidence_count" integer DEFAULT 1 NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_memory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_memory" ADD CONSTRAINT "company_memory_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_memory_tenant_account" ON "company_memory" USING btree ("tenant_id","account_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_company_memory_tenant_account_pattern" ON "company_memory" USING btree ("tenant_id","account_code","driver_pattern");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "company_memory" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);