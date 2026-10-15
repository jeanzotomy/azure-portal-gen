// Le nombre de candidats recherchés reste un entier de 1 à 999 :
// une saisie vide ou invalide retombe sur 1, jamais sur 0.
export const parseCandidatesSought = (v: string): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 999) : 1;
};

/**
 * Nettoie une sortie IA pour un rendu professionnel :
 * retire les emphases markdown et titres, normalise les puces.
 */
export function sanitizeAiText(input: string): string {
  if (!input) return "";
  let s = input.replace(/\r\n/g, "\n");
  s = s.replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, "$1");
  s = s.replace(/\*+/g, "");
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  s = s.replace(/^\s*[•·–-]\s+/gm, "-");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.split("\n").map((l) => l.replace(/\s+$/g, "")).join("\n");
  return s.trim();
}
