import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, readDraft, saveDraft } from "@/lib/form-draft";
import { isEmptyProposal, type Proposal } from "@/components/admin/ProposalsTab";

const KEY = "test:form";

beforeEach(() => {
  localStorage.clear();
});

describe("form-draft", () => {
  it("enregistre et relit un brouillon avec sa date", () => {
    saveDraft(KEY, { a: 1 });
    const d = readDraft<{ a: number }>(KEY);
    expect(d?.value).toEqual({ a: 1 });
    expect(typeof d?.savedAt).toBe("number");
  });

  it("retourne null quand aucun brouillon n'existe", () => {
    expect(readDraft(KEY)).toBeNull();
  });

  it("clear supprime définitivement le brouillon", () => {
    saveDraft(KEY, { a: 1 });
    clearDraft(KEY);
    expect(readDraft(KEY)).toBeNull();
  });

  it("ignore un contenu corrompu sans lever d'erreur", () => {
    localStorage.setItem("cm_form_draft:" + KEY, "{pas du json");
    expect(readDraft(KEY)).toBeNull();
  });
});

describe("isEmptyProposal", () => {
  const base: Proposal = {
    title: "Proposition commerciale", client_name: "", client_contact: "", client_email: "",
    summary: "", options: [{ name: "Option 1", objective: "", price_min: 0, price_max: 0, delay: "" }],
    features: [], milestones: [], status: "brouillon", accepted_option: null, valid_until: null,
  };

  it("une proposition vierge est vide (elle ne doit pas écraser un brouillon)", () => {
    expect(isEmptyProposal(base)).toBe(true);
  });

  it("un nom de client saisi rend la proposition non vide", () => {
    expect(isEmptyProposal({ ...base, client_name: "LMS" })).toBe(false);
  });

  it("un prix saisi rend la proposition non vide", () => {
    expect(isEmptyProposal({ ...base, options: [{ ...base.options[0], price_min: 1000 }] })).toBe(false);
  });
});
