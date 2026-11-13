CREATE TABLE IF NOT EXISTS "driver_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variance_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"driver_text" text NOT NULL,
	"source_metrics" text DEFAULT '[]' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.0' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"user_correction" text,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "driver_attributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "narrative_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"triggered_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "narrative_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "variances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL,
	"current_value" numeric(14, 2) NOT NULL,
	"prior_value" numeric(14, 2) NOT NULL,
	"delta" numeric(14, 2) NOT NULL,
	"delta_pct" numeric(8, 4) NOT NULL,
	"materiality" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "variances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_attributions" ADD CONSTRAINT "driver_attributions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_attributions" ADD CONSTRAINT "driver_attributions_variance_id_variances_id_fk" FOREIGN KEY ("variance_id") REFERENCES "public"."variances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_attributions" ADD CONSTRAINT "driver_attributions_run_id_narrative_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."narrative_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_attributions" ADD CONSTRAINT "driver_attributions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "narrative_runs" ADD CONSTRAINT "narrative_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "narrative_runs" ADD CONSTRAINT "narrative_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "variances" ADD CONSTRAINT "variances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "variances" ADD CONSTRAINT "variances_run_id_narrative_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."narrative_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_driver_attributions_tenant_run" ON "driver_attributions" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_narrative_runs_tenant_period" ON "narrative_runs" USING btree ("tenant_id","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_variances_tenant_run" ON "variances" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "driver_attributions" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "narrative_runs" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "variances" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);