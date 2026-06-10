import Papa from "papaparse";

/**
 * Sérialise `rows` en CSV (UTF-8 avec BOM pour compatibilité Excel) puis déclenche un téléchargement.
 */
export function exportCsv<T extends Record<string, unknown>>(filename: string, rows: T[]) {
  const csv = Papa.unparse(rows, { quotes: true });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
