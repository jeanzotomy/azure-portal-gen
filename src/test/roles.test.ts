import { describe, it, expect } from "vitest";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/roles";

describe("référentiel des rôles", () => {
  it("le rôle commercial est proposé à l'invitation", () => {
    expect(INVITABLE_ROLES).toContain("commercial");
  });

  it("les rôles techniques ou liés à un abonnement ne sont pas invitables", () => {
    expect(INVITABLE_ROLES).not.toContain("client_premium");
    expect(INVITABLE_ROLES).not.toContain("user");
  });

  it("chaque rôle invitable a un libellé affichable", () => {
    for (const role of INVITABLE_ROLES) {
      expect(ROLE_LABELS[role], `libellé manquant pour ${role}`).toBeTruthy();
    }
  });
});
