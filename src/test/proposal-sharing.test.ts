import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { filterProposals, paginateProposals } from "@/lib/proposal-list";
import { proposalDocumentRows, generateProposalPdf, generateProposalWord } from "@/lib/proposal-documents";
import { websiteTemplate } from "@/components/admin/ProposalsTab";

vi.mock("@/lib/document-brand", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/document-brand")>();
  const base64 = readFileSync("src/assets/cloudmature-logo.png").toString("base64");
  return { ...original, loadDocumentBrand: async () => ({ dataUrl: `data:image/png;base64,${base64}`, bytes: Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)), colors: { primary: "007aa3", ink: "0B1F33", muted: "526171", surface: "EAF6FB", border: "D7E3EA", paper: "FFFFFF" } }) };
});

describe("recherche des propositions", () => {
  const rows = Array.from({ length: 13 }, (_, i) => ({ ...websiteTemplate(), client_name: i === 0 ? "Société LMS" : `Client ${i}`, status: i === 0 ? "acceptee" : "brouillon" }));
  it("recherche sans accents et filtre par statut", () => {
    expect(filterProposals(rows, "societe", "acceptee")).toHaveLength(1);
    expect(filterProposals(rows, "societe", "brouillon")).toHaveLength(0);
  });
  it("pagine sans perdre ni répéter de propositions", () => {
    expect(paginateProposals(rows, 1, 6).rows).toHaveLength(6);
    expect(paginateProposals(rows, 3, 6).rows).toHaveLength(1);
    expect(paginateProposals(rows, 99, 6).page).toBe(3);
    expect(paginateProposals([], 2, 6).pages).toBe(1);
  });
});
describe("exports des propositions", () => {
  it("partage les budgets HT, taxe et TTC exacts", () => {
    const p = websiteTemplate();
    p.options[0] = { ...p.options[0], price_min: 1000000, price_max: 2000000, tax_rate: 18 };
    const rows = proposalDocumentRows(p);
    expect(rows.find((r) => r[0] === "Budget TTC")?.[1]).toBe("1 180 000 GNF - 2 360 000 GNF");
    expect(rows.find((r) => r[0] === "Taxe")?.[1]).toBe("18 % : 180 000 GNF - 360 000 GNF");
  });
  it("génère de vrais documents PDF et Word", async () => {
    const p = websiteTemplate();
    expect((await generateProposalPdf(p)).size).toBeGreaterThan(1000);
    expect((await generateProposalWord(p)).size).toBeGreaterThan(1000);
  });
});