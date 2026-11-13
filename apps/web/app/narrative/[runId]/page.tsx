"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { NarrativeRun, RunVariance } from "@/lib/narrative-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";
const DEMO_USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const [progress, setProgress] = useState<{ step: string; progress: number; message: string } | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);

  const run = useQuery({
    queryKey: ["run", runId],
    queryFn: () => apiGet<NarrativeRun>(`/api/narrative/runs/${runId}`),
    // disable polling — SSE handles real-time updates
    refetchInterval: false,
  });

  const variances = useQuery({
    queryKey: ["run-variances", runId],
    queryFn: () => apiGet<RunVariance[]>(`/api/narrative/runs/${runId}/variances`),
  });

  // Subscribe to SSE for live progress.
  useEffect(() => {
    if (!runId) return;
    const url = `${API_URL}/api/narrative/runs/${runId}/events?tenant_id=${DEMO_TENANT}&user_id=${DEMO_USER}`;
    const es = new EventSource(url);

    es.addEventListener("progress", (e) => {
      try {
        setProgress(JSON.parse(e.data));
      } catch {
        /* ignore malformed */
      }
    });
    es.addEventListener("state", (e) => {
      // update the initial fetch — one less round trip
      try {
        const r = JSON.parse(e.data) as NarrativeRun;
        // Note: useQuery manages its own cache; we don't push into it here.
        // Simpler to let the refetch happen if needed. This is fine for demo.
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("complete", () => {
      es.close();
      run.refetch();
      variances.refetch();
    });
    es.onerror = () => setSseError("SSE connection lost — refreshing");

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Run · <span className="font-mono text-sm text-neutral-500">{runId?.slice(0, 8)}</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {run.data ? `${run.data.periodMonth.slice(0, 7)} · status: ${run.data.status}` : "Loading…"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold">Pipeline</h2>
          {sseError && <span className="text-xs text-amber-600">{sseError}</span>}
        </div>
        <div className="flex gap-2 text-xs">
          {["ingesting", "computing", "review"].map((step) => {
            const active = progress?.step === step;
            const done =
              (step === "ingesting" && progress && ["computing", "review", "complete", "failed"].includes(progress.step)) ||
              (step === "computing" && progress && ["review", "complete", "failed"].includes(progress.step)) ||
              (step === "review" && progress && ["review", "complete"].includes(progress.step));
            const color = done ? "bg-green-100 text-green-800" : active ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-500";
            return (
              <div key={step} className={`rounded px-3 py-1.5 ${color}`}>
                {step}
              </div>
            );
          })}
        </div>
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>{progress.message}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-semibold">
            Persisted variances ({variances.data?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500 bg-neutral-50">
            <tr>
              <th className="px-5 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium text-right">Current</th>
              <th className="px-3 py-2 font-medium text-right">Prior</th>
              <th className="px-3 py-2 font-medium text-right">Δ</th>
              <th className="px-5 py-2 font-medium">Materiality</th>
            </tr>
          </thead>
          <tbody>
            {variances.data?.map((v) => (
              <tr key={v.id} className="border-t border-neutral-100">
                <td className="px-5 py-2">{v.accountName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(v.currentValue)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-500">{fmt(v.priorValue)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${v.delta >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {v.delta >= 0 ? "+" : "−"}{fmt(Math.abs(v.delta))}
                </td>
                <td className="px-5 py-2 text-xs">{v.materiality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}