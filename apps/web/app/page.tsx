"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { FinancialEntry, OperationalMetric } from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";

const CURRENT_MONTH = "2026-10";
const PRIOR_MONTH = "2026-09";

function sumByType(entries: FinancialEntry[], type: FinancialEntry["accountType"]) {
  return entries
    .filter((e) => e.accountType === type)
    .reduce((s, e) => s + e.amount, 0);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

export default function DashboardPage() {
  const current = useQuery({
    queryKey: ["financials", CURRENT_MONTH],
    queryFn: () => apiGet<FinancialEntry[]>(`/api/financials?month=${CURRENT_MONTH}`),
  });
  const prior = useQuery({
    queryKey: ["financials", PRIOR_MONTH],
    queryFn: () => apiGet<FinancialEntry[]>(`/api/financials?month=${PRIOR_MONTH}`),
  });
  const currentMetrics = useQuery({
    queryKey: ["metrics", CURRENT_MONTH],
    queryFn: () => apiGet<OperationalMetric[]>(`/api/metrics?month=${CURRENT_MONTH}`),
  });
  const priorMetrics = useQuery({
    queryKey: ["metrics", PRIOR_MONTH],
    queryFn: () => apiGet<OperationalMetric[]>(`/api/metrics?month=${PRIOR_MONTH}`),
  });

  const isLoading =
    current.isLoading ||
    prior.isLoading ||
    currentMetrics.isLoading ||
    priorMetrics.isLoading;

  const error =
    current.error || prior.error || currentMetrics.error || priorMetrics.error;

  if (isLoading) {
    return <div className="text-sm text-neutral-500">Loading dashboard…</div>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load: {String(error)}
      </div>
    );
  }

  const c = current.data!;
  const p = prior.data!;
  const cm = currentMetrics.data!;
  const pm = priorMetrics.data!;

  const revenueNow = sumByType(c, "revenue");
  const revenuePrior = sumByType(p, "revenue");
  const cogsNow = sumByType(c, "cogs");
  const opexNow = sumByType(c, "opex");
  const cogsPrior = sumByType(p, "cogs");
  const opexPrior = sumByType(p, "opex");
  const ebitdaNow = revenueNow - cogsNow - opexNow;
  const ebitdaPrior = revenuePrior - cogsPrior - opexPrior;
  const mrrNow = Number(cm.find((m) => m.metricKey === "mrr")?.metricValue ?? 0);
  const mrrPrior = Number(pm.find((m) => m.metricKey === "mrr")?.metricValue ?? 0);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">October 2026 · Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Acme Corp — from QuickBooks + Stripe
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(revenueNow)}
          deltaPct={pctDelta(revenueNow, revenuePrior)}
        />
        <KpiCard
          label="EBITDA"
          value={formatCurrency(ebitdaNow)}
          deltaPct={pctDelta(ebitdaNow, ebitdaPrior)}
        />
        <KpiCard
          label="MRR"
          value={formatCurrency(mrrNow)}
          deltaPct={pctDelta(mrrNow, mrrPrior)}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-3">October 2026 — by account</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="py-2">Account</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {c.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="py-2">{e.accountName}</td>
                <td className="py-2 text-neutral-500">{e.accountType}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}