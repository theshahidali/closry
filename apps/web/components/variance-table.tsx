import type { Materiality, Variance } from "@/lib/variance-types";

function materialityBadge(m: Materiality) {
  const style =
    m === "significant"
      ? "bg-red-50 text-red-700 border-red-200"
      : m === "material"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : m === "minor"
      ? "bg-neutral-100 text-neutral-600 border-neutral-200"
      : "bg-white text-neutral-400 border-neutral-200";
  const label =
    m === "none" ? "—" : m.charAt(0).toUpperCase() + m.slice(1);
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${style}`}
    >
      {label}
    </span>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDelta(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${fmt(Math.abs(n))}`;
}

export function VarianceTable({ variances }: { variances: Variance[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-200">
        <h2 className="text-sm font-semibold">Variance summary</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500 bg-neutral-50">
          <tr>
            <th className="px-5 py-2 font-medium">Account</th>
            <th className="px-3 py-2 font-medium text-right">Current</th>
            <th className="px-3 py-2 font-medium text-right">Prior</th>
            <th className="px-3 py-2 font-medium text-right">Δ</th>
            <th className="px-3 py-2 font-medium text-right">Δ %</th>
            <th className="px-5 py-2 font-medium">Materiality</th>
          </tr>
        </thead>
        <tbody>
          {variances.map((v) => (
            <tr
              key={`${v.accountType}:${v.accountCode}`}
              className="border-t border-neutral-100"
            >
              <td className="px-5 py-2">
                <div className="font-medium">{v.accountName}</div>
                <div className="text-xs text-neutral-500">{v.accountType}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {fmt(v.currentValue)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                {fmt(v.priorValue)}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  v.delta > 0
                    ? "text-green-700"
                    : v.delta < 0
                    ? "text-red-700"
                    : "text-neutral-500"
                }`}
              >
                {fmtDelta(v.delta)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {isFinite(v.deltaPct) ? `${v.deltaPct.toFixed(1)}%` : "—"}
              </td>
              <td className="px-5 py-2">{materialityBadge(v.materiality)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}