import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { financialEntries } from "@closry/db";
import { tenantHandler } from "../middleware/tenant-handler";
import { parseInput } from "../validation";

const FinancialsQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  account_type: z
    .enum(["revenue", "cogs", "opex", "asset", "liability", "equity"])
    .optional(),
});

export const financialsRouter = Router();

financialsRouter.get(
  "/api/financials",
  tenantHandler(async (req, tx) => {
    const q = parseInput(FinancialsQuery, req.query);
    const periodMonth = `${q.month}-01`;

    const conditions = [eq(financialEntries.periodMonth, periodMonth)];
    if (q.account_type) {
      conditions.push(eq(financialEntries.accountType, q.account_type));
    }

    const rows = await tx
      .select()
      .from(financialEntries)
      .where(and(...conditions));

    return rows.map((r) => ({
      id: r.id,
      accountCode: r.accountCode,
      accountName: r.accountName,
      accountType: r.accountType,
      subcategory: r.subcategory,
      periodMonth: r.periodMonth,
      amount: Number(r.amount),
    }));
  }),
);