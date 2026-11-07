import { describe, expect, it } from "vitest";
import { calculateProposalTax, isValidProposalTax } from "@/lib/proposal-tax";

describe("taxe facultative des propositions", () => {
  it("ne facture aucune taxe sans taux", () => {
    expect(calculateProposalTax(1000000)).toEqual({ subtotal: 1000000, tax: 0, total: 1000000 });
  });
  it("calcule taxe et TTC sur chaque borne HT", () => {
    expect(calculateProposalTax(1000000, 18)).toEqual({ subtotal: 1000000, tax: 180000, total: 1180000 });
    expect(calculateProposalTax(2000000, 18).total).toBe(2360000);
  });
  it("arrondit la taxe à l'unité GNF", () => {
    expect(calculateProposalTax(101, 2.5)).toEqual({ subtotal: 101, tax: 3, total: 104 });
  });
  it("refuse les taux invalides et les montants négatifs", () => {
    expect(isValidProposalTax(-1)).toBe(false);
    expect(isValidProposalTax(101)).toBe(false);
    expect(isValidProposalTax(NaN)).toBe(false);
    expect(isValidProposalTax(undefined)).toBe(true);
    expect(calculateProposalTax(-500, 18).total).toBe(0);
  });
});