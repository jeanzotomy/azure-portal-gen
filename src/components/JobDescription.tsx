/**
 * Rendu humanisé d'une description d'offre d'emploi (texte brut).
 * - Lignes en MAJUSCULES (>= 3 mots OU contenant ":") → titre de section.
 * - Lignes commençant par "- ", "* ", "• " → puces (regroupées en <ul>).
 * - Lignes commençant par "1.", "2." … → liste numérotée (regroupées en <ol>).
 * - Autres lignes → paragraphes.
 * - Sécurité: retire tout caractère markdown résiduel (* ** *** _ # `).
 */
import { useMemo } from "react";

function cleanInline(s: string): string {
  return s
    .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, "$1")
    .replace(/\*+/g, "")
    .replace(/`+/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/g, "")
    .replace(/\s+$/g, "");
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function parse(input: string): Block[] {
  const lines = (input || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let mode: "ul" | "ol" | "p" | null = null;

  const flush = () => {
    if (!mode || buf.length === 0) { buf = []; mode = null; return; }
    if (mode === "ul") blocks.push({ kind: "ul", items: [...buf] });
    else if (mode === "ol") blocks.push({ kind: "ol", items: [...buf] });
    else blocks.push({ kind: "p", text: buf.join(" ") });
    buf = []; mode = null;
  };

  const isHeading = (raw: string) => {
    const t = raw.trim();
    if (!t) return false;
    if (t.length > 80) return false;
    const stripped = t.replace(/[:：]\s*$/, "");
    // ALL CAPS line, at least 2 words, allow accents/digits/spaces
    const letters = stripped.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    if (letters.length < 3) return false;
    return stripped === stripped.toUpperCase() && /\s/.test(stripped);
  };

  for (const raw of lines) {
    const line = cleanInline(raw);
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }

    if (isHeading(trimmed)) {
      flush();
      blocks.push({ kind: "heading", text: trimmed.replace(/[:：]\s*$/, "") });
      continue;
    }
    const bullet = trimmed.match(/^[-*•·–-]\s+(.+)$/);
    if (bullet) {
      if (mode !== "ul") flush();
      mode = "ul";
      buf.push(bullet[1]);
      continue;
    }
    const numbered = trimmed.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (numbered) {
      if (mode !== "ol") flush();
      mode = "ol";
      buf.push(numbered[2]);
      continue;
    }
    if (mode !== "p") flush();
    mode = "p";
    buf.push(trimmed);
  }
  flush();
  return blocks;
}

export function JobDescription({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => parse(text || ""), [text]);
  return (
    <div className={`space-y-4 text-sm leading-relaxed text-foreground/85 ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h3 key={i} className="text-base font-semibold text-foreground mt-2">
              {b.text}
            </h3>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5 marker:text-primary">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1.5 marker:text-primary marker:font-semibold">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ol>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}

export default JobDescription;
