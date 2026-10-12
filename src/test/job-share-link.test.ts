import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicUrl } from "@/lib/site-url";
import { jobPath } from "@/lib/slug";

// Le lien d'une offre est ce que les clients, les candidats et les réseaux
// sociaux voient. Il doit toujours être une adresse du site lui-même, jamais
// l'adresse technique du backend.
describe("lien de partage d'une offre d'emploi", () => {
  it("construit l'adresse publique de l'offre sur le domaine du site", () => {
    const url = publicUrl(
      jobPath("1a62d816-add6-4918-8cd1-1315c52836e4", "Stagiaires Agents commerciaux (3)"),
    );
    expect(url).toBe("https://www.cloudmature.com/careers/stagiaires-agents-commerciaux-3");
  });

  it("n'utilise plus l'adresse technique du backend dans la page d'offre", () => {
    const src = readFileSync(resolve(__dirname, "../pages/JobDetailPage.tsx"), "utf8");
    expect(src).not.toContain("supabase.co");
    expect(src).not.toMatch(/functions\/v1/);
    expect(src).toContain("publicUrl(");
  });
});
