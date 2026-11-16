"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch } from "@/lib/api";
import type { DriverProposal } from "@/lib/driver-types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function materialityStyle(m: string): string {
  if (m === "significant") return "border-red-200 bg-red-50";
  if (m === "material") return "border-amber-200 bg-amber-50";
  return "border-neutral-200 bg-white";
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return "text-green-700";
  if (c >= 0.5) return "text-amber-700";
  return "text-red-700";
}

export function DriverCard({
  driver,
  runId,
}: {
  driver: DriverProposal;
  runId: string;
}) {
  const qc = useQueryClient();
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctionText, setCorrectionText] = useState(
    driver.userCorrection ?? "",
  );

  const mutation = useMutation({
    mutationFn: (payload: { status: string; userCorrection?: string }) =>
      apiPatch(`/api/narrative/runs/${runId}/drivers/${driver.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run-drivers", runId] });
      setCorrectionMode(false);
    },
  });

  const isFinal = driver.status !== "proposed";

  return (
    <div
      className={`rounded-lg border p-4 ${materialityStyle(driver.materiality)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {driver.accountName}{" "}
            <span className="text-xs text-neutral-500">
              ({driver.accountCode})
            </span>
          </div>
          <div className="text-sm text-neutral-600 mt-0.5 tabular-nums">
            {driver.delta >= 0 ? "+" : "−"}
            {fmt(Math.abs(driver.delta))}{" "}
            <span className="text-xs">
              ({driver.deltaPct >= 0 ? "+" : ""}
              {driver.deltaPct.toFixed(1)}%)
            </span>{" "}
            <span className="text-xs text-neutral-500">
              · {driver.materiality}
            </span>
          </div>
        </div>
        <div className={`text-xs font-medium ${confidenceColor(driver.confidence)}`}>
          conf {driver.confidence.toFixed(2)}
        </div>
      </div>

      <div className="mt-3 text-sm">
        {driver.status === "corrected" && driver.userCorrection ? (
          <div>
            <div className="text-xs text-neutral-500 line-through mb-1">
              {driver.driverText}
            </div>
            <div className="font-medium">{driver.userCorrection}</div>
          </div>
        ) : (
          <div>{driver.driverText}</div>
        )}
      </div>

      {isFinal && (
        <div className="mt-2 text-xs text-neutral-500">
          {driver.status}
          {driver.confirmedAt
            ? ` · ${new Date(driver.confirmedAt).toLocaleString()}`
            : ""}
        </div>
      )}

      {!isFinal && !correctionMode && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => mutation.mutate({ status: "confirmed" })}
            disabled={mutation.isPending}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            ✅ Confirm
          </button>
          <button
            onClick={() => setCorrectionMode(true)}
            className="rounded border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50"
          >
            ✏️ Correct
          </button>
          <button
            onClick={() => mutation.mutate({ status: "rejected" })}
            disabled={mutation.isPending}
            className="rounded border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50"
          >
            ❌ Reject
          </button>
        </div>
      )}

      {correctionMode && (
        <div className="mt-3 space-y-2">
          <textarea
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            placeholder="What actually drove this variance?"
            className="w-full rounded border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                mutation.mutate({
                  status: "corrected",
                  userCorrection: correctionText,
                })
              }
              disabled={mutation.isPending || correctionText.trim().length < 5}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save correction
            </button>
            <button
              onClick={() => setCorrectionMode(false)}
              className="rounded border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mutation.error && (
        <div className="mt-2 text-xs text-red-700">
          {String(mutation.error)}
        </div>
      )}
    </div>
  );
}