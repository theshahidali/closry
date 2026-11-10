export type FinancialEntry = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: "revenue" | "cogs" | "opex" | "asset" | "liability" | "equity";
  subcategory: string | null;
  periodMonth: string;
  amount: number;
};

export type OperationalMetric = {
  metricKey: string;
  metricValue: number | null;
  periodMonth: string;
  metadata: string;
};