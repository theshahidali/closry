import type { RunStatus } from "@closry/shared";

export type NarrativeRun = {
  id: string;
  tenantId: string;
  periodMonth: string;
  status: RunStatus;
  progress: number;
  errorMessage: string | null;
  triggeredBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type RunVariance = {
  id: string;
  accountCode: string;
  accountName: string;
  currentValue: number;
  priorValue: number;
  delta: number;
  deltaPct: number;
  materiality: string;
};