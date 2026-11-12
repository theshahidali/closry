import { describe, it, expect } from "vitest";
import {
  classifyMateriality,
  computeEbitdaBridge,
  computeVariances,
} from "../src/variance";
import type { FinancialEntryInput } from "../src/types";

const ACME_OCT: FinancialEntryInput[] = [
  { accountCode: "4000", accountName: "SaaS Revenue",     accountType: "revenue", subcategory: "subs", amount: 1_180_000 },
  { accountCode: "4100", accountName: "Services Revenue", accountType: "revenue", subcategory: "cons", amount: 60_000 },
  { accountCode: "5000", accountName: "Cloud",            accountType: "cogs",    subcategory: "host", amount: 240_000 },
  { accountCode: "5100", accountName: "Support",          accountType: "cogs",    subcategory: "sup",  amount: 120_000 },
  { accountCode: "5200", accountName: "Payment",          accountType: "cogs",    subcategory: "pay",  amount: 52_000 },
  { accountCode: "6000", accountName: "Payroll",          accountType: "opex",    subcategory: "p",    amount: 280_000 },
  { accountCode: "6100", accountName: "Marketing",        accountType: "opex",    subcategory: "g",    amount: 95_000 },
  { accountCode: "6200", accountName: "G&A",              accountType: "opex",    subcategory: "a",    amount: 40_000 },
  { accountCode: "6300", accountName: "Sales",            accountType: "opex",    subcategory: "s",    amount: 101_000 },
];

const ACME_SEP: FinancialEntryInput[] = [
  { accountCode: "4000", accountName: "SaaS Revenue",     accountType: "revenue", subcategory: "subs", amount: 1_100_000 },
  { accountCode: "4100", accountName: "Services Revenue", accountType: "revenue", subcategory: "cons", amount: 50_000 },
  { accountCode: "5000", accountName: "Cloud",            accountType: "cogs",    subcategory: "host", amount: 225_000 },
  { accountCode: "5100", accountName: "Support",          accountType: "cogs",    subcategory: "sup",  amount: 108_000 },
  { accountCode: "5200", accountName: "Payment",          accountType: "cogs",    subcategory: "pay",  amount: 47_000 },
  { accountCode: "6000", accountName: "Payroll",          accountType: "opex",    subcategory: "p",    amount: 265_000 },
  { accountCode: "6100", accountName: "Marketing",        accountType: "opex",    subcategory: "g",    amount: 88_000 },
  { accountCode: "6200", accountName: "G&A",              accountType: "opex",    subcategory: "a",    amount: 44_000 },
  { accountCode: "6300", accountName: "Sales",            accountType: "opex",    subcategory: "s",    amount: 95_000 },
];

describe("classifyMateriality", () => {
  it("returns 'none' for zero delta", () => {
    expect(classifyMateriality(0, 0, 1_000_000)).toBe("none");
  });

  it("marks 12% / $34K as significant at default thresholds", () => {
    // EBITDA-like variance; absFloor at 1.5% of $1.24M = $18.6K
    expect(classifyMateriality(34_000, 12.2, 1_240_000)).toBe("significant");
  });

  it("marks 8% / $32K as material", () => {
    // COGS-like; above 5% but below 10%
    expect(classifyMateriality(32_000, 8.4, 1_240_000)).toBe("material");
  });

  it("marks 5.7% / $15K as minor because dollar amount is below absFloor", () => {
    // absFloor ≈ $18.6K; $15K < floor, so 'minor' despite >5%
    expect(classifyMateriality(15_000, 5.7, 1_240_000)).toBe("minor");
  });

  it("respects custom thresholds", () => {
    expect(
      classifyMateriality(34_000, 12.2, 1_240_000, {
        materialPct: 5,
        significantPct: 15,
        absBasePct: 1.5,
      }),
    ).toBe("material");
  });
});

describe("computeVariances", () => {
  const vs = computeVariances(ACME_OCT, ACME_SEP);
  const byCode = (code: string) => vs.find((v) => v.accountCode === code)!;

  it("has one variance per account across both months", () => {
    expect(vs).toHaveLength(9);
  });

  it("computes revenue delta correctly", () => {
    const v = byCode("4000");
    expect(v.currentValue).toBe(1_180_000);
    expect(v.priorValue).toBe(1_100_000);
    expect(v.delta).toBe(80_000);
    expect(v.deltaPct).toBeCloseTo(7.2727, 3);
  });

  it("classifies SaaS revenue as material", () => {
    // 7.27% >= 5%, $80K >= $18.6K floor
    expect(byCode("4000").materiality).toBe("material");
  });

  it("classifies marketing as minor (small dollar amount)", () => {
    // +$7K, +7.95% — but $7K < $18.6K floor
    expect(byCode("6100").materiality).toBe("minor");
  });

  it("computes G&A correctly even though it decreased", () => {
    const v = byCode("6200");
    expect(v.delta).toBe(-4_000); // 40,000 - 44,000
    expect(v.deltaPct).toBeLessThan(0);
  });
});

describe("computeEbitdaBridge", () => {
  it("computes the standard waterfall", () => {
    const bridge = computeEbitdaBridge(ACME_OCT, ACME_SEP);
    const [rev, cogs, gp, opex, ebitda] = bridge.steps;

    expect(rev.current).toBe(1_240_000);
    expect(cogs.current).toBe(412_000);
    expect(gp.current).toBe(828_000);
    expect(opex.current).toBe(516_000);
    expect(ebitda.current).toBe(312_000);

    expect(rev.prior).toBe(1_150_000);
    expect(ebitda.prior).toBe(1_150_000 - 380_000 - 492_000); // 278_000
    expect(ebitda.delta).toBe(34_000);
    expect(ebitda.deltaPct).toBeCloseTo(12.23, 1);
  });
});