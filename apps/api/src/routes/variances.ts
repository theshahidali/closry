import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { financialEntries } from "@closry/db";
import {
  computeVariances,
  computeEbitdaBridge,
  MATERIALITY_RANK,
  type Materiality,
} from "@closry/pipeline";
import { tenantHandler } from "../middleware/tenant-handler";
import { parseInput } from "../validation";

const VariancesQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  min_materiality: z
    .enum(["none", "minor", "material", "significant"])
    .optional(),
});

export const variancesRouter = Router();

function priorMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const priorY = m === 1 ? y - 1 : y;
  const priorM = m === 1 ? 12 : m - 1;
  return `${priorY}-${String(priorM).padStart(2, "0")}`;
}

variancesRouter.get(
  "/api/variances",
  tenantHandler(async (req, tx) => {
    const q = parseInput(VariancesQuery, req.query);
    const currentMonth = `${q.month}-01`;
    const priorMonthStr = `${priorMonth(q.month)}-01`;

    const rows = await tx
      .select()
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.periodMonth, currentMonth),
        ),
      );

    const priorRows = await tx
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.periodMonth, priorMonthStr));

    const toInput = (r: typeof rows[number]) => ({
      accountCode: r.accountCode,
      accountName: r.accountName,
      accountType: r.accountType as
        | "revenue"
        | "cogs"
        | "opex"
        | "asset"
        | "liability"
        | "equity",
      subcategory: r.subcategory,
      amount: Number(r.amount),
    });

    const currentInput = rows.map(toInput);
    const priorInput = priorRows.map(toInput);

    const allVariances = computeVariances(currentInput, priorInput);
    const bridge = computeEbitdaBridge(currentInput, priorInput);

    const minRank = q.min_materiality
      ? MATERIALITY_RANK[q.min_materiality as Materiality]
      : 0;
    const variances = allVariances.filter(
      (v) => MATERIALITY_RANK[v.materiality] >= minRank,
    );

    return {
      periodMonth: currentMonth,
      priorMonth: priorMonthStr,
      ebitdaBridge: bridge,
      variances,
    };
  }),
);