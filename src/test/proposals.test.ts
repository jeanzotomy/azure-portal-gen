import { describe, it, expect } from "vitest";
import { milestonesTotal, websiteTemplate, formatGnf } from "@/components/admin/ProposalsTab";

describe("propositions commerciales", () => {
  it("le modèle site web propose 40/30/30 = 100 %", () => {
    const t = websiteTemplate();
    expect(t.milestones.map((m) => m.percent)).toEqual([40, 30, 30]);
    expect(milestonesTotal(t.milestones)).toBe(100);
  });
  it("chaque ligne a une valeur par option", () => {
    const t = websiteTemplate();
    t.features.forEach((f) => expect(f.values.length).toBe(t.options.length));
  });
  it("formate les montants en GNF sans décimale", () => {
    expect(formatGnf(35000000)).toBe("35\u202F000\u202F000\u202FGNF");
  });
});
