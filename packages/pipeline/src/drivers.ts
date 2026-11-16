import type { Materiality, Variance } from "./types";

export type DriverContext = {
  tenantName: string;
  periodMonth: string; // "2026-10"
  variance: {
    accountCode: string;
    accountName: string;
    accountType: string;
    currentValue: number;
    priorValue: number;
    delta: number;
    deltaPct: number;
    materiality: Materiality;
  };
  operationalMetrics: Array<{
    key: string;
    value: number;
    priorValue: number | null;
    deltaPct: number | null;
  }>;
  confirmedMemory: Array<{
    driverPattern: string;
    evidenceCount: number;
  }>;
};

export function buildDriverPrompt(ctx: DriverContext): string {
  const v = ctx.variance;
  const cur = formatMoney(v.currentValue);
  const pri = formatMoney(v.priorValue);
  const d = formatMoney(Math.abs(v.delta));
  const sign = v.delta >= 0 ? "+" : "−";
  const pct = isFinite(v.deltaPct) ? `${v.deltaPct.toFixed(1)}%` : "new account";

  const metrics =
    ctx.operationalMetrics.length > 0
      ? ctx.operationalMetrics
          .map((m) => {
            const delta =
              m.deltaPct !== null
                ? ` (${m.deltaPct >= 0 ? "+" : "−"}${Math.abs(m.deltaPct).toFixed(1)}% MoM)`
                : "";
            const prior =
              m.priorValue !== null ? ` from ${formatMoney(m.priorValue)}` : "";
            return `  - ${m.key}: ${formatNumber(m.value)}${prior}${delta}`;
          })
          .join("\n")
      : "  (no operational metrics available)";

  const memory =
    ctx.confirmedMemory.length > 0
      ? ctx.confirmedMemory
          .map(
            (m) =>
              `  - "${m.driverPattern}" (confirmed ${m.evidenceCount}× previously)`,
          )
          .join("\n")
      : "  (none yet — this is the first confirmed pattern for this account)";

  return `A month-over-month variance in ${ctx.tenantName}'s financials needs a business driver.

VARIANCE
  Account: ${v.accountName} (${v.accountCode}, ${v.accountType})
  Period: ${ctx.periodMonth}
  Current: ${cur}    Prior: ${pri}    Δ: ${sign}${d} (${pct})
  Materiality classification: ${v.materiality}

OPERATIONAL METRICS (same month)
${metrics}

PRIOR CONFIRMED PATTERNS (this account)
${memory}

Propose ONE specific business driver for this variance. Be concrete — reference the operational metrics that correlate, name the mechanism ("3 new enterprise deals closed" not "revenue grew"). If nothing in the operational data plausibly explains it, say so honestly and set confidence below 0.4.

Respond with a JSON object only — no prose before or after:
{
  "driver_text": "<one sentence, specific, no numbers from the variance itself>",
  "confidence": <0.0–1.0>,
  "reasoning": "<one sentence on why you believe this>"
}`;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export type DriverProposal = {
  driver_text: string;
  confidence: number;
  reasoning: string;
};