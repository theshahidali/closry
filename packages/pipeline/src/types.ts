export type AccountType =
  | "revenue"
  | "cogs"
  | "opex"
  | "asset"
  | "liability"
  | "equity";

export type FinancialEntryInput = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  subcategory: string | null;
  amount: number; // already coerced to number at the API boundary
};

export type Materiality = "none" | "minor" | "material" | "significant";

export type MaterialityThresholds = {
  /** Percent change required to qualify for "material" (e.g., 5 = 5%) */
  materialPct: number;
  /** Percent change required to qualify for "significant" (e.g., 10 = 10%) */
  significantPct: number;
  
  absBasePct: number;
};

export const DEFAULT_THRESHOLDS: MaterialityThresholds = {
  materialPct: 5,
  significantPct: 10,
  absBasePct: 1.5,
};

export type Variance = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  currentValue: number;
  priorValue: number;
  delta: number;
  deltaPct: number; // signed percent, e.g., -3.2 or 12.5
  materiality: Materiality;
};

export type BridgeStep = {
  label: string;
  current: number;
  prior: number;
  delta: number;
  deltaPct: number;
};

export type EbitdaBridge = {
  steps: BridgeStep[]; // Revenue → COGS → Gross Profit → OpEx → EBITDA
  currentRevenue: number;
  priorRevenue: number;
};

/** Ranking so callers can filter with `>=`. */
export const MATERIALITY_RANK: Record<Materiality, number> = {
  none: 0,
  minor: 1,
  material: 2,
  significant: 3,
};