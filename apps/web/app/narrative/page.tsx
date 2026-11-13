"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { NarrativeRun } from "@/lib/narrative-types";

function statusPill(s: string) {
  const style =
    s === "review" || s === "complete"
      ? "bg-green-50 text-green-700 border-green-200"
      : s === "failed"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs ${style}`}>
      {s}
    </span>
  );
}

export default function NarrativeListPage() {
  const qc = useQueryClient();
  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: () => apiGet<NarrativeRun[]>("/api/narrative/runs"),
    refetchInterval: 3000, // light polling; the detail page uses SSE
  });

  const trigger = useMutation({
    mutationFn: () =>
      apiPost<NarrativeRun>("/api/narrative/runs", { month: "2026-10" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Narrative runs</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Each run computes variances for a month and (on Day 7) generates prose.
          </p>
        </div>
        <button
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {trigger.isPending ? "Starting…" : "Generate October 2026"}
        </button>
      </div>

      {runs.isLoading && <div className="text-sm text-neutral-500">Loading…</div>}
      {runs.error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {String(runs.error)}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500 bg-neutral-50">
            <tr>
              <th className="px-5 py-2 font-medium">Run</th>
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Progress</th>
              <th className="px-5 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {runs.data?.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-5 py-2">
                  <Link
                    href={`/narrative/${r.id}`}
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.periodMonth.slice(0, 7)}</td>
                <td className="px-3 py-2">{statusPill(r.status)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.progress}%</td>
                <td className="px-5 py-2 text-xs text-neutral-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {runs.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-neutral-500">
                  No runs yet. Click Generate to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}