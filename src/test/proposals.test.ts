import { describe, it, expect } from "vitest";
import { milestonesTotal, websiteTemplate, formatGnf, toNonNegative, reorderProposalOption } from "@/components/admin/ProposalsTab";

describe("propositions commerciales", () => {
  it("déplace les options avec leurs budgets, taxes et fonctionnalités sans modifier l’original", () => {
    const p = websiteTemplate();
    p.options[0].tax_rate = 18;
    p.accepted_option = 0;
    const moved = reorderProposalOption(p, 0, 1);
    expect(moved.options.map((o) => o.name)).toEqual([p.options[1].name, p.options[0].name]);
    expect(moved.options[1].price_min).toBe(35000000);
    expect(moved.options[1].tax_rate).toBe(18);
    expect(moved.features.find((f) => f.label === "Espace client sécurisé")?.values).toEqual(["inclus", "non"]);
    expect(moved.accepted_option).toBe(1);
    expect(p.accepted_option).toBe(0);
    expect(p.features.find((f) => f.label === "Espace client sécurisé")?.values).toEqual(["non", "inclus"]);
    expect(reorderProposalOption(moved, 1, 0)).toEqual(p);
  });
  it("préserve l’option retenue lorsqu’une autre option est déplacée et respecte les limites", () => {
    const p = websiteTemplate();
    p.options.push({ name: "Option 3", objective: "", price_min: 0, price_max: 0, delay: "" });
    p.features = p.features.map((f) => ({ ...f, values: [...f.values, "option"] }));
    p.accepted_option = 1;
    expect(reorderProposalOption(p, 2, 0).accepted_option).toBe(2);
    expect(reorderProposalOption(p, 0, -1)).toBe(p);
    expect(reorderProposalOption(p, 2, 3)).toBe(p);
    p.accepted_option = null;
    expect(reorderProposalOption(p, 0, 1).accepted_option).toBeNull();
  });
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
  it("refuse les montants négatifs à la saisie", () => {
    expect(toNonNegative("-500")).toBe(0);
    expect(toNonNegative(-500)).toBe(0);
    expect(toNonNegative("")).toBe(0);
    expect(toNonNegative(null)).toBe(0);
    expect(toNonNegative("1200000")).toBe(1200000);
    expect(toNonNegative("0")).toBe(0);
  });
});
