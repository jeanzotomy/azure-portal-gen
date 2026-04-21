// Mapping ISO 3166-1 alpha-2 country codes -> international dial code (with leading +)
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  // Afrique
  DZ: "+213", AO: "+244", BJ: "+229", BW: "+267", BF: "+226", BI: "+257",
  CM: "+237", CV: "+238", CF: "+236", TD: "+235", KM: "+269", CG: "+242",
  CD: "+243", CI: "+225", DJ: "+253", EG: "+20", GQ: "+240", ER: "+291",
  SZ: "+268", ET: "+251", GA: "+241", GM: "+220", GH: "+233", GN: "+224",
  GW: "+245", KE: "+254", LS: "+266", LR: "+231", LY: "+218", MG: "+261",
  MW: "+265", ML: "+223", MR: "+222", MU: "+230", MA: "+212", MZ: "+258",
  NA: "+264", NE: "+227", NG: "+234", RW: "+250", ST: "+239", SN: "+221",
  SC: "+248", SL: "+232", SO: "+252", ZA: "+27", SS: "+211", SD: "+249",
  TZ: "+255", TG: "+228", TN: "+216", UG: "+256", ZM: "+260", ZW: "+263",
  // Europe
  AL: "+355", DE: "+49", AT: "+43", BE: "+32", BA: "+387", BG: "+359",
  HR: "+385", DK: "+45", ES: "+34", EE: "+372", FI: "+358", FR: "+33",
  GR: "+30", HU: "+36", IE: "+353", IS: "+354", IT: "+39", LV: "+371",
  LT: "+370", LU: "+352", MK: "+389", MT: "+356", MD: "+373", ME: "+382",
  NO: "+47", NL: "+31", PL: "+48", PT: "+351", CZ: "+420", RO: "+40",
  GB: "+44", RS: "+381", SK: "+421", SI: "+386", SE: "+46", CH: "+41",
  UA: "+380",
  // Amérique
  AR: "+54", BR: "+55", CA: "+1", CL: "+56", CO: "+57", CR: "+506",
  CU: "+53", DO: "+1", EC: "+593", US: "+1", GT: "+502", HT: "+509",
  HN: "+504", JM: "+1", MX: "+52", PA: "+507", PY: "+595", PE: "+51",
  TT: "+1", UY: "+598", VE: "+58",
  // Asie
  SA: "+966", CN: "+86", KR: "+82", AE: "+971", IN: "+91", ID: "+62",
  IQ: "+964", IL: "+972", JP: "+81", JO: "+962", KW: "+965", LB: "+961",
  MY: "+60", PK: "+92", PH: "+63", QA: "+974", SG: "+65", TH: "+66",
  TR: "+90", VN: "+84",
  // Océanie
  AU: "+61", NZ: "+64",
};

// Map French country names -> ISO code (for free-text country fields)
const NAME_TO_ISO: Record<string, string> = {
  "guinée": "GN", "guinee": "GN",
  "france": "FR", "sénégal": "SN", "senegal": "SN", "mali": "ML",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI",
  "burkina faso": "BF", "togo": "TG", "bénin": "BJ", "benin": "BJ",
  "cameroun": "CM", "cameroon": "CM", "maroc": "MA", "morocco": "MA",
  "tunisie": "TN", "algérie": "DZ", "algerie": "DZ",
  "états-unis": "US", "etats-unis": "US", "usa": "US", "united states": "US",
  "canada": "CA", "royaume-uni": "GB", "uk": "GB", "united kingdom": "GB",
  "allemagne": "DE", "germany": "DE", "espagne": "ES", "spain": "ES",
  "italie": "IT", "italy": "IT", "belgique": "BE", "belgium": "BE",
  "suisse": "CH", "switzerland": "CH", "portugal": "PT", "pays-bas": "NL",
  "netherlands": "NL", "chine": "CN", "china": "CN", "japon": "JP",
  "japan": "JP", "inde": "IN", "india": "IN",
};

/**
 * Get the international dial code for a country value.
 * Accepts either an ISO 3166-1 alpha-2 code (e.g. "GN") or a country name (e.g. "Guinée").
 */
export function getDialCode(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  // ISO code direct
  const upper = trimmed.toUpperCase();
  if (COUNTRY_DIAL_CODES[upper]) return COUNTRY_DIAL_CODES[upper];
  // Name lookup
  const iso = NAME_TO_ISO[trimmed.toLowerCase()];
  if (iso && COUNTRY_DIAL_CODES[iso]) return COUNTRY_DIAL_CODES[iso];
  return null;
}

/**
 * Apply a dial code prefix to a phone number. Replaces any existing leading dial code.
 * - If phone is empty, returns the dial code followed by a space.
 * - If phone already starts with the same dial code, returns it unchanged.
 * - If phone starts with a different "+xxx" code, replaces it.
 * - Otherwise prefixes the dial code.
 */
export function applyDialCode(phone: string, dialCode: string): string {
  const cleanPhone = (phone || "").trim();
  if (!cleanPhone) return `${dialCode} `;
  // Already has the correct prefix
  if (cleanPhone.startsWith(dialCode)) return cleanPhone;
  // Has a different international prefix → replace
  const intlMatch = cleanPhone.match(/^\+\d{1,4}\s?/);
  if (intlMatch) {
    return `${dialCode} ${cleanPhone.slice(intlMatch[0].length).trim()}`.trim();
  }
  // Strip leading 0 (national prefix) if present
  const localPart = cleanPhone.replace(/^0+/, "");
  return `${dialCode} ${localPart}`.trim();
}
