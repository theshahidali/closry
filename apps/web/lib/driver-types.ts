export type DriverProposal = {
  id: string;
  varianceId: string;
  driverText: string;
  confidence: number;
  status: "proposed" | "confirmed" | "corrected" | "rejected";
  userCorrection: string | null;
  confirmedAt: string | null;
  accountCode: string;
  accountName: string;
  currentValue: number;
  priorValue: number;
  delta: number;
  deltaPct: number;
  materiality: "none" | "minor" | "material" | "significant";
};