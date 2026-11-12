export type Materiality = "none" | "minor" | "material" | "significant";

export type Variance = {
  accountCode: string;
  accountName: string;
  accountType: string;
  currentValue: number;
  priorValue: number;
  delta: number;
  deltaPct: number;
  materiality: Materiality;
};

export type BridgeStep = {
  label: string;
  current: number;
  prior: number;
  delta: number;
  deltaPct: number;
};

export type VariancesResponse = {
  periodMonth: string;
  priorMonth: string;
  ebitdaBridge: { steps: BridgeStep[]; currentRevenue: number; priorRevenue: number };
  variances: Variance[];
};