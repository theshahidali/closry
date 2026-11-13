import { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { withTenant, financialEntries, narrativeRuns, variances } from "@closry/db";
import { computeVariances, type FinancialEntryInput } from "@closry/pipeline";
import { pool } from "../db";
import { publishRunEvent } from "../pubsub";

export type NarrativeJobData = {
  runId: string;
  tenantId: string;
  periodMonth: string; // YYYY-MM-01
};

function priorMonth(periodMonth: string): string {
  const [y, m] = periodMonth.slice(0, 7).split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}-01`;
}

function toInput(r: {
  accountCode: string;
  accountName: string;
  accountType: string;
  subcategory: string | null;
  amount: string;
}): FinancialEntryInput {
  return {
    accountCode: r.accountCode,
    accountName: r.accountName,
    accountType: r.accountType as FinancialEntryInput["accountType"],
    subcategory: r.subcategory,
    amount: Number(r.amount),
  };
}

export async function processNarrativeJob(job: Job<NarrativeJobData>) {
  const { runId, tenantId, periodMonth } = job.data;
  const log = (stage: string, progress: number, message: string) => {
    console.log(`[run ${runId.slice(0, 8)}] ${stage} ${progress}% ${message}`);
    return publishRunEvent(runId, { step: stage, progress, message });
  };

  try {
    // --- INGEST (stub) ---
    await withTenant(pool, tenantId, async (tx) => {
      await tx
        .update(narrativeRuns)
        .set({ status: "ingesting", progress: 5, startedAt: new Date() })
        .where(eq(narrativeRuns.id, runId));
    });
    await log("ingesting", 10, "Fetching source data (stub)");
    await log("ingesting", 20, "Sources up to date");

    // --- COMPUTE ---
    await withTenant(pool, tenantId, async (tx) => {
      await tx
        .update(narrativeRuns)
        .set({ status: "computing", progress: 30 })
        .where(eq(narrativeRuns.id, runId));
    });
    await log("computing", 40, "Loading financial entries");

    const prior = priorMonth(periodMonth);
    const { current, prev } = await withTenant(pool, tenantId, async (tx) => {
      const c = await tx
        .select()
        .from(financialEntries)
        .where(eq(financialEntries.periodMonth, periodMonth));
      const p = await tx
        .select()
        .from(financialEntries)
        .where(eq(financialEntries.periodMonth, prior));
      return { current: c, prev: p };
    });

    if (current.length === 0) {
      throw new Error(`no financial entries for ${periodMonth}`);
    }
    await log("computing", 55, `Loaded ${current.length} current / ${prev.length} prior entries`);

    const computed = computeVariances(current.map(toInput), prev.map(toInput));

    const persistable = computed.filter((v) => v.materiality !== "none");

    await log("computing", 70, `Computed ${computed.length} variances (${persistable.length} non-zero)`);

    // --- PERSIST ---
    await withTenant(pool, tenantId, async (tx) => {
      // Clear any prior variances for this run (idempotent re-runs)
      await tx.delete(variances).where(eq(variances.runId, runId));

      if (persistable.length > 0) {
        await tx.insert(variances).values(
          persistable.map((v) => ({
            tenantId,
            runId,
            periodMonth,
            accountCode: v.accountCode,
            accountName: v.accountName,
            currentValue: v.currentValue.toFixed(2),
            priorValue: v.priorValue.toFixed(2),
            delta: v.delta.toFixed(2),
            deltaPct: v.deltaPct.toFixed(4),
            materiality: v.materiality,
          })),
        );
      }
    });

    await log("computing", 85, "Persisted variances");

    await withTenant(pool, tenantId, async (tx) => {
      await tx
        .update(narrativeRuns)
        .set({
          status: "review",
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(narrativeRuns.id, runId));
    });
    await log("review", 100, "Ready for review");

    return { varianceCount: persistable.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await withTenant(pool, tenantId, async (tx) => {
      await tx
        .update(narrativeRuns)
        .set({
          status: "failed",
          errorMessage: message,
          completedAt: new Date(),
        })
        .where(eq(narrativeRuns.id, runId));
    });
    await log("failed", 100, message);
    throw err; // BullMQ will mark the job as failed and apply retry policy
  }
}