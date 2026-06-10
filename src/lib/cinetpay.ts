export type AfricanCurrency = "GNF" | "XOF" | "XAF" | "CDF";
export type AllCurrency = "CAD" | "USD" | "EUR" | AfricanCurrency;

export const AFRICAN_CURRENCIES: AfricanCurrency[] = ["GNF", "XOF", "XAF", "CDF"];

export function isAfricanCurrency(c: string): c is AfricanCurrency {
  return (AFRICAN_CURRENCIES as string[]).includes(c.toUpperCase());
}

export const CURRENCY_LABEL: Record<AllCurrency, string> = {
  CAD: "CA$",
  USD: "US$",
  EUR: "€",
  GNF: "GNF",
  XOF: "FCFA",
  XAF: "FCFA",
  CDF: "FC",
};

export const CURRENCY_FULL_NAME: Record<AllCurrency, string> = {
  CAD: "Dollar canadien",
  USD: "Dollar US",
  EUR: "Euro",
  GNF: "Franc guinéen",
  XOF: "FCFA (UEMOA)",
  XAF: "FCFA (CEMAC)",
  CDF: "Franc congolais",
};

// Conversion rates from EUR (base reference) — indicative, to be refreshed via
// the exchange-rates edge function in production. Used only for display fallback.
const RATES_FROM_EUR: Record<AllCurrency, number> = {
  EUR: 1,
  USD: 1.08,
  CAD: 1.47,
  GNF: 9300,
  XOF: 655.957,
  XAF: 655.957,
  CDF: 3000,
};

export function convertFromEur(amountEur: number, target: AllCurrency): number {
  const v = amountEur * RATES_FROM_EUR[target];
  if (target === "GNF" || target === "XOF" || target === "XAF" || target === "CDF") {
    // Round to nearest 100 for psychologically priced amounts
    return Math.round(v / 100) * 100;
  }
  return Math.round(v);
}

export function formatAmount(amount: number, currency: AllCurrency): string {
  const symbol = CURRENCY_LABEL[currency];
  const useDecimals = currency === "USD" || currency === "EUR" || currency === "CAD";
  const formatted = useDecimals
    ? amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : amount.toLocaleString("fr-FR");
  // CFA/GNF/CDF: symbol after, with space
  if (currency === "GNF" || currency === "XOF" || currency === "XAF" || currency === "CDF") {
    return `${formatted} ${symbol}`;
  }
  return `${symbol}${formatted}`;
}
