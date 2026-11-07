import { describe, it, expect } from "vitest";
import { TEMPLATES, milestonesTotal, DELAYS, FEATURE_LIBRARY } from "@/components/admin/ProposalsTab";

describe("modèles de propositions", () => {
  it("chaque modèle a des jalons totalisant 100 %", () => {
    for (const t of TEMPLATES) {
      expect(milestonesTotal(t.build().milestones), t.label).toBe(100);
    }
  });
  it("chaque fonctionnalité a une valeur pour chaque option", () => {
    for (const t of TEMPLATES) {
      const p = t.build();
      for (const f of p.features) {
        expect(f.values.length, `${t.label} / ${f.label}`).toBe(p.options.length);
      }
    }
  });
  it("chaque délai de modèle est dans la liste des choix", () => {
    for (const t of TEMPLATES) {
      for (const o of t.build().options) {
        expect(DELAYS, `${t.label} / ${o.delay}`).toContain(o.delay);
      }
    }
  });
  it("la bibliothèque de fonctionnalités a deux valeurs par défaut par entrée", () => {
    for (const f of FEATURE_LIBRARY) {
      expect(f.v.length, f.label).toBe(2);
    }
  });
});
