"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { FinancialEntry, OperationalMetric } from "@/lib/types";
import type { VariancesResponse } from "@/lib/variance-types";
import { KpiCard } from "@/components/kpi-card";
import { VarianceTable } from "@/components/variance-table";

const CURRENT_MONTH = "2026-10";

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
  const metrics = useQuery({
    queryKey: ["metrics", CURRENT_MONTH],
    queryFn: () => apiGet<OperationalMetric[]>(`/api/metrics?month=${CURRENT_MONTH}`),
  });
  const variances = useQuery({
    queryKey: ["variances", CURRENT_MONTH],
    queryFn: () => apiGet<VariancesResponse>(`/api/variances?month=${CURRENT_MONTH}`),
  });

  if (current.isLoading || metrics.isLoading || variances.isLoading) {
    return <div className="text-sm text-neutral-500">Loading dashboard…</div>;
  }
  const error = current.error || metrics.error || variances.error;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load: {String(error)}
      </div>
    );
  }

  const c = current.data!;
  const m = metrics.data!;
  const v = variances.data!;

  const revenue = sumByType(c, "revenue");
  const cogs = sumByType(c, "cogs");
  const opex = sumByType(c, "opex");
  const ebitda = revenue - cogs - opex;
  const mrr = Number(m.find((x) => x.metricKey === "mrr")?.metricValue ?? 0);

  const bridge = v.ebitdaBridge.steps;
  const revStep = bridge.find((s) => s.label === "Revenue")!;
  const ebitdaStep = bridge.find((s) => s.label === "EBITDA")!;
  const mrrStep = { deltaPct: null as number | null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">October 2026 · Overview</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Acme Corp — from QuickBooks + Stripe
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(revenue)}
          deltaPct={revStep.deltaPct}
        />
        <KpiCard
          label="EBITDA"
          value={formatCurrency(ebitda)}
          deltaPct={ebitdaStep.deltaPct}
        />
        <KpiCard
          label="MRR"
          value={formatCurrency(mrr)}
          deltaPct={mrrStep.deltaPct}
        />
      </div>

      <VarianceTable variances={v.variances} />

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-3">EBITDA bridge</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="py-2 font-medium">Step</th>
              <th className="py-2 font-medium text-right">Current</th>
              <th className="py-2 font-medium text-right">Prior</th>
              <th className="py-2 font-medium text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {v.ebitdaBridge.steps.map((s) => (
              <tr key={s.label} className="border-b border-neutral-100 last:border-0">
                <td className="py-2 font-medium">{s.label}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(s.current)}
                </td>
                <td className="py-2 text-right tabular-nums text-neutral-500">
                  {formatCurrency(s.prior)}
                </td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    s.delta > 0
                      ? "text-green-700"
                      : s.delta < 0
                      ? "text-red-700"
                      : "text-neutral-500"
                  }`}
                >
                  {s.delta >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(s.delta))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}