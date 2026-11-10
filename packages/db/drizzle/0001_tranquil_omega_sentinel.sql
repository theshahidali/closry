CREATE TABLE IF NOT EXISTS "financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"subcategory" text,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"raw_ref" text,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operational_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" numeric(14, 4),
	"metadata" text DEFAULT '{}' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operational_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_entries_tenant_period" ON "financial_entries" USING btree ("tenant_id","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_financial_entries_tenant_period_account" ON "financial_entries" USING btree ("tenant_id","period_month","account_code","subcategory");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_operational_metrics_tenant_period" ON "operational_metrics" USING btree ("tenant_id","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_operational_metrics_tenant_period_metric" ON "operational_metrics" USING btree ("tenant_id","period_month","metric_key");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "financial_entries" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "operational_metrics" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);