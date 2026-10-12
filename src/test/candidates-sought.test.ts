import { describe, expect, it } from "vitest";
import { parseCandidatesSought } from "@/components/HrTab";

// Le nombre de candidats recherchés pour un poste est un entier de 1 à 999.
// Une saisie vide, négative, non numérique ou trop grande ne doit jamais
// enregistrer 0 ni un nombre absurde : on retombe sur une valeur sûre.
describe("parseCandidatesSought", () => {
  it("conserve un nombre valide", () => {
    expect(parseCandidatesSought("1")).toBe(1);
    expect(parseCandidatesSought("3")).toBe(3);
    expect(parseCandidatesSought("25")).toBe(25);
  });

  it("arrondit à l'entier inférieur un nombre à décimale", () => {
    expect(parseCandidatesSought("2.7")).toBe(2);
  });

  it("retombe sur 1 quand la saisie est vide ou invalide", () => {
    expect(parseCandidatesSought("")).toBe(1);
    expect(parseCandidatesSought("   ")).toBe(1);
    expect(parseCandidatesSought("abc")).toBe(1);
    expect(parseCandidatesSought("0")).toBe(1);
    expect(parseCandidatesSought("-5")).toBe(1);
  });

  it("plafonne à 999 un nombre déraisonnable", () => {
    expect(parseCandidatesSought("1500")).toBe(999);
    expect(parseCandidatesSought("999")).toBe(999);
  });
});
