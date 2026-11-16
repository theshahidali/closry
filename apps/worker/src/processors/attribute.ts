import { and, eq } from "drizzle-orm";
import {
  companyMemory,
  driverAttributions,
  operationalMetrics,
  type Tx,
} from "@closry/db";
import {
  buildDriverPrompt,
  type DriverContext,
  type DriverProposal,
} from "@closry/pipeline";
import { z } from "zod";
import { anthropic } from "../llm";
import { env } from "../env";

const ProposalSchema = z.object({
  driver_text: z.string().min(5),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional().default(""),
});

function priorMonth(periodMonth: string): string {
  const [y, m] = periodMonth.slice(0, 7).split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}-01`;
}

async function loadOperationalMetrics(
  tx: Tx,
  periodMonth: string,
): Promise<DriverContext["operationalMetrics"]> {
  const prior = priorMonth(periodMonth);
  const current = await tx
    .select()
    .from(operationalMetrics)
    .where(eq(operationalMetrics.periodMonth, periodMonth));
  const priorRows = await tx
    .select()
    .from(operationalMetrics)
    .where(eq(operationalMetrics.periodMonth, prior));

  const priorMap = new Map(priorRows.map((r) => [r.metricKey, r.metricValue]));

  return current.map((r) => {
    const currVal = r.metricValue === null ? 0 : Number(r.metricValue);
    const priorValStr = priorMap.get(r.metricKey);
    const priorVal = priorValStr === undefined || priorValStr === null
      ? null
      : Number(priorValStr);
    const deltaPct =
      priorVal !== null && priorVal !== 0
        ? ((currVal - priorVal) / Math.abs(priorVal)) * 100
        : null;
    return {
      key: r.metricKey,
      value: currVal,
      priorValue: priorVal,
      deltaPct,
    };
  });
}

async function loadConfirmedMemory(
  tx: Tx,
  accountCode: string,
): Promise<DriverContext["confirmedMemory"]> {
  const rows = await tx
    .select()
    .from(companyMemory)
    .where(eq(companyMemory.accountCode, accountCode));
  return rows.map((r) => ({
    driverPattern: r.driverPattern,
    evidenceCount: r.evidenceCount,
  }));
}

async function proposeDriver(
  ctx: DriverContext,
): Promise<z.infer<typeof ProposalSchema>> {
  const userMessage = buildDriverPrompt(ctx);

  const res = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    // 1. Raise max_tokens — adaptive thinking consumes the budget.
    //    4096 is safe for a short JSON response plus reasoning.
    max_tokens: 4096,
    // 2. REMOVE the temperature field entirely.
    //    Sonnet 5.5 rejects any non-default value with a 400.
    system:
      "You are a CFO's analytical partner. Given financial variance data and operational context, propose the single most likely business driver. Be specific and cite operational evidence. Do not restate the numbers from the variance. Respond with a JSON object only.",
    messages: [{ role: "user", content: userMessage }],
  });

  // 3. Find the TEXT block, not content[0].
  //    With adaptive thinking, content[0] may be a "thinking" block.
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("no text block in LLM response");
  }

  // Strip code fences if the model added them
  const cleaned = textBlock.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return ProposalSchema.parse(parsed);
}

export async function attributeDriversForRun(
  tx: Tx,
  opts: {
    runId: string;
    tenantId: string;
    tenantName: string;
    periodMonth: string;
    variances: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      currentValue: number;
      priorValue: number;
      delta: number;
      deltaPct: number;
      materiality: string;
    }>;
  },
): Promise<number> {

  await tx.delete(driverAttributions).where(eq(driverAttributions.runId, opts.runId));

  const materialMetrics = await loadOperationalMetrics(tx, opts.periodMonth);

  const tasks = opts.variances.map(async (v) => {
    const memory = await loadConfirmedMemory(tx, v.accountCode);
    const ctx: DriverContext = {
      tenantName: opts.tenantName,
      periodMonth: opts.periodMonth.slice(0, 7),
      variance: {
        accountCode: v.accountCode,
        accountName: v.accountName,
        accountType: v.accountType,
        currentValue: v.currentValue,
        priorValue: v.priorValue,
        delta: v.delta,
        deltaPct: v.deltaPct,
        materiality: v.materiality as DriverContext["variance"]["materiality"],
      },
      operationalMetrics: materialMetrics,
      confirmedMemory: memory,
    };

    try {
      const proposal = await proposeDriver(ctx);
      return {
        varianceId: v.id,
        driverText: proposal.driver_text,
        confidence: proposal.confidence,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.warn(
        `[attribute] failed for ${v.accountCode}: ${msg} — writing skipped row`,
      );
      return {
        varianceId: v.id,
        driverText: "(LLM proposal unavailable — please enter manually)",
        confidence: 0,
      };
    }
  });

  const results = await Promise.all(tasks);

  if (results.length > 0) {
    await tx.insert(driverAttributions).values(
      results.map((r) => ({
        tenantId: opts.tenantId,
        runId: opts.runId,
        varianceId: r.varianceId,
        driverText: r.driverText,
        sourceMetrics: "[]",
        confidence: r.confidence.toFixed(2),
        status: "proposed",
      })),
    );
  }

  return results.length;
}