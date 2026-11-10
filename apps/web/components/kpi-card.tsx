type KpiCardProps = {
  label: string;
  value: string;
  deltaPct: number | null;
};

export function KpiCard({ label, value, deltaPct }: KpiCardProps) {
  const positive = deltaPct !== null && deltaPct >= 0;
  const showDelta = deltaPct !== null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {showDelta && (
        <div
          className={`mt-1 text-sm ${
            positive ? "text-green-600" : "text-red-600"
          }`}
        >
          {positive ? "▲" : "▼"} {Math.abs(deltaPct!).toFixed(1)}% MoM
        </div>
      )}
    </div>
  );
}