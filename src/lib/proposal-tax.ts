/** Budgets saisis hors taxe ; arrondi de la taxe à l'unité GNF. */
export function calculateProposalTax(amount: number, rate = 0) {
  const subtotal = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const safeRate = Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0;
  const tax = Math.round(subtotal * safeRate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function isValidProposalTax(rate: number | undefined) {
  return rate === undefined || (Number.isFinite(rate) && rate >= 0 && rate <= 100);
}