import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SRC = join(ROOT, "src");

// The technical backend client lives here and is invisible to users.
const ALLOWED_PREFIXES = ["src/integrations/"];

const SCANNED_EXT = /\.(ts|tsx|js|jsx|css|html|json|txt)$/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCANNED_EXT.test(entry)) out.push(full);
  }
  return out;
}

describe("no preview-host branding leaks into the public app", () => {
  it("does not mention the editor platform outside src/integrations", () => {
    const files = [...walk(SRC), join(ROOT, "index.html")];
    const offenders: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).split("\\").join("/");
      if (ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) continue;
      if (rel === "src/test/no-preview-host-leak.test.ts") continue;

      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/lovable/i.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }

    expect(offenders, `Forbidden references found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
