import { describe, it, expect } from "vitest";
import { buildDriverPrompt, type DriverContext } from "../src/drivers";

const ctx: DriverContext = {
  tenantName: "Acme Corp",
  periodMonth: "2026-10",
  variance: {
    accountCode: "4000",
    accountName: "SaaS Revenue",
    accountType: "revenue",
    currentValue: 1_180_000,
    priorValue: 1_100_000,
    delta: 80_000,
    deltaPct: 7.2727,
    materiality: "material",
  },
  operationalMetrics: [
    { key: "mrr", value: 1_180_000, priorValue: 1_100_000, deltaPct: 7.27 },
    { key: "pipeline_value", value: 2_400_000, priorValue: 2_250_000, deltaPct: 6.67 },
  ],
  confirmedMemory: [
    { driverPattern: "enterprise deals drive new MRR", evidenceCount: 3 },
  ],
};

describe("buildDriverPrompt", () => {
  it("includes the variance numbers", () => {
    const p = buildDriverPrompt(ctx);
    expect(p).toContain("SaaS Revenue");
    expect(p).toContain("$1,180,000");
    expect(p).toContain("+$80,000");
    expect(p).toContain("7.3%");
  });

  it("includes operational metrics with MoM delta", () => {
    const p = buildDriverPrompt(ctx);
    expect(p).toContain("mrr: 1180000");
    expect(p).toContain("+7.3% MoM");
    expect(p).toContain("pipeline_value");
  });

  it("includes confirmed memory", () => {
    const p = buildDriverPrompt(ctx);
    expect(p).toContain("enterprise deals drive new MRR");
    expect(p).toContain("confirmed 3×");
  });

  it("handles empty memory gracefully", () => {
    const p = buildDriverPrompt({ ...ctx, confirmedMemory: [] });
    expect(p).toContain("first confirmed pattern");
  });
});