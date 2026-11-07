import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readDraft, saveDraft, useFormDraft } from "@/lib/form-draft";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("reprise des factures et clients", () => {
  it.each(["invoice:user-1:new", "client:user-1:new"])("conserve immédiatement la dernière saisie et la propose à la réouverture : %s", async (key) => {
    const initial = { notes: "" };
    const hook = renderHook(({ value }) => useFormDraft(key, value, () => false), { initialProps: { value: initial } });
    expect(readDraft(key)).toBeNull();
    hook.rerender({ value: { notes: "Saisie en cours" } });
    expect(readDraft<{ notes: string }>(key)?.value.notes).toBe("Saisie en cours");
    hook.unmount();
    const reopened = renderHook(() => useFormDraft(key, initial, () => false));
    await waitFor(() => expect(reopened.result.current.pendingDraft?.value.notes).toBe("Saisie en cours"));
    act(() => { expect(reopened.result.current.restore()).toEqual({ notes: "Saisie en cours" }); });
  });

  it("attend le chargement de la facture sans écraser son brouillon", () => {
    const key = "invoice:user-1:existing";
    saveDraft(key, { notes: "Modifications" });
    const hook = renderHook(({ value, enabled }) => useFormDraft(key, value, () => false, enabled), { initialProps: { value: { notes: "" }, enabled: false } });
    hook.rerender({ value: { notes: "Facture enregistrée" }, enabled: true });
    expect(hook.result.current.pendingDraft?.value.notes).toBe("Modifications");
    expect(readDraft<{ notes: string }>(key)?.value.notes).toBe("Modifications");
  });

  it("supprime le brouillon après enregistrement sans le recréer", () => {
    const key = "client:user-1:new";
    const hook = renderHook(({ value }) => useFormDraft(key, value, () => false), { initialProps: { value: { name: "" } } });
    hook.rerender({ value: { name: "Client" } });
    act(() => hook.result.current.clear());
    hook.rerender({ value: { name: "Client" } });
    expect(readDraft(key)).toBeNull();
  });

  it("isole les brouillons par utilisateur et document", () => {
    saveDraft("invoice:user-1:invoice-a", { notes: "Privé" });
    expect(readDraft("invoice:user-2:invoice-a")).toBeNull();
    expect(readDraft("invoice:user-1:invoice-b")).toBeNull();
    expect(readDraft("client:user-1:invoice-a")).toBeNull();
  });
});