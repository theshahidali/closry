import {
  DEFAULT_THRESHOLDS,
  type EbitdaBridge,
  type FinancialEntryInput,
  type Materiality,
  type MaterialityThresholds,
  type Variance,
} from "./types";

function sumByType(
  entries: FinancialEntryInput[],
  type: FinancialEntryInput["accountType"],
): number {
  let total = 0;
  for (const e of entries) {
    if (e.accountType === type) total += e.amount;
  }
  return total;
}

export function classifyMateriality(
  delta: number,
  deltaPct: number,
  currentRevenue: number,
  thresholds: MaterialityThresholds = DEFAULT_THRESHOLDS,
): Materiality {
  if (delta === 0) return "none";
  const absPct = Math.abs(deltaPct);
  const absDelta = Math.abs(delta);
  const absFloor = (thresholds.absBasePct / 100) * Math.max(currentRevenue, 0);

  if (absPct >= thresholds.significantPct && absDelta >= absFloor) {
    return "significant";
  }
  if (absPct >= thresholds.materialPct && absDelta >= absFloor) {
    return "material";
  }
  return "minor";
}

function pctDelta(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : Infinity;
  return ((current - prior) / Math.abs(prior)) * 100;
}

export function computeVariances(
  current: FinancialEntryInput[],
  prior: FinancialEntryInput[],
  thresholds: MaterialityThresholds = DEFAULT_THRESHOLDS,
): Variance[] {
  const currentRevenue = sumByType(current, "revenue");

  const keys = new Set<string>();
  for (const e of current) keys.add(`${e.accountType}:${e.accountCode}`);
  for (const e of prior) keys.add(`${e.accountType}:${e.accountCode}`);

  const result: Variance[] = [];
  for (const key of keys) {
    const [type, code] = key.split(":") as [Variance["accountType"], string];
    const cur = current.find(
      (e) => e.accountType === type && e.accountCode === code,
    );
    const pr = prior.find(
      (e) => e.accountType === type && e.accountCode === code,
    );

    const currentValue = cur?.amount ?? 0;
    const priorValue = pr?.amount ?? 0;
    const delta = currentValue - priorValue;
    const deltaPct = pctDelta(currentValue, priorValue);
    const materiality = classifyMateriality(
      delta,
      deltaPct,
      currentRevenue,
      thresholds,
    );

    result.push({
      accountCode: code,
      accountName: cur?.accountName ?? pr?.accountName ?? code,
      accountType: type,
      currentValue,
      priorValue,
      delta,
      deltaPct,
      materiality,
    });
  }

  // Sort so the table reads well: significant first, then by |delta| descending.
  result.sort((a, b) => {
    const mr =
      (b.materiality === "significant" ? 3 : b.materiality === "material" ? 2 : b.materiality === "minor" ? 1 : 0) -
      (a.materiality === "significant" ? 3 : a.materiality === "material" ? 2 : a.materiality === "minor" ? 1 : 0);
    if (mr !== 0) return mr;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });
  return result;
}

export function computeEbitdaBridge(
  current: FinancialEntryInput[],
  prior: FinancialEntryInput[],
): EbitdaBridge {
  const revC = sumByType(current, "revenue");
  const revP = sumByType(prior, "revenue");
  const cogsC = sumByType(current, "cogs");
  const cogsP = sumByType(prior, "cogs");
  const opexC = sumByType(current, "opex");
  const opexP = sumByType(prior, "opex");

  const gpC = revC - cogsC;
  const gpP = revP - cogsP;
  const ebitdaC = gpC - opexC;
  const ebitdaP = gpP - opexP;

  const step = (label: string, c: number, p: number): BridgeStepLocal => ({
    label,
    current: c,
    prior: p,
    delta: c - p,
    deltaPct: pctDelta(c, p),
  });

  return {
    steps: [
      step("Revenue", revC, revP),
      step("COGS", cogsC, cogsP),
      step("Gross Profit", gpC, gpP),
      step("OpEx", opexC, opexP),
      step("EBITDA", ebitdaC, ebitdaP),
    ],
    currentRevenue: revC,
    priorRevenue: revP,
  };
}

// Small local alias to keep the step() helper readable above.
type BridgeStepLocal = {
  label: string;
  current: number;
  prior: number;
  delta: number;
  deltaPct: number;
};