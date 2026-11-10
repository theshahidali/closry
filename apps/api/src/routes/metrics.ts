import { Router } from "express";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { operationalMetrics } from "@closry/db";
import { tenantHandler } from "../middleware/tenant-handler";
import { parseInput } from "../validation";

const MetricsQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  keys: z.string().optional(),
});

export const metricsRouter = Router();

metricsRouter.get(
  "/api/metrics",
  tenantHandler(async (req, tx) => {
    const q = parseInput(MetricsQuery, req.query);
    const periodMonth = `${q.month}-01`;
    const keys = q.keys?.split(",").map((k) => k.trim()).filter(Boolean);

    const conditions = [eq(operationalMetrics.periodMonth, periodMonth)];
    if (keys && keys.length > 0) {
      conditions.push(inArray(operationalMetrics.metricKey, keys));
    }

    const rows = await tx
      .select()
      .from(operationalMetrics)
      .where(and(...conditions));

    return rows.map((r) => ({
      metricKey: r.metricKey,
      metricValue: r.metricValue === null ? null : Number(r.metricValue),
      periodMonth: r.periodMonth,
      metadata: r.metadata,
    }));
  }),
);