// Shared types and helpers for social media communication channels.
// Configuration is stored in site_settings under the key "social_channels".

export type SocialChannelsConfig = {
  whatsapp_e164: string;        // digits only, country code first, no "+"
  messenger_page: string;       // Facebook page username for m.me/<page>
  telegram_handle: string;      // Telegram username for t.me/<handle>
  linkedin_url: string;         // full https URL
  x_url: string;                // full https URL
  facebook_url: string;         // full https URL
  floating_enabled: boolean;    // show floating WhatsApp button on public pages
  floating_message: string;     // pre-filled WhatsApp message
};

export const DEFAULT_SOCIAL_CHANNELS: SocialChannelsConfig = {
  whatsapp_e164: "",
  messenger_page: "",
  telegram_handle: "",
  linkedin_url: "",
  x_url: "",
  facebook_url: "",
  floating_enabled: false,
  floating_message: "Bonjour CloudMature, j'aimerais en savoir plus sur vos services.",
};

export const SOCIAL_CHANNELS_KEY = "social_channels";

export function sanitizeE164(input: string): string {
  return (input || "").replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(e164: string, message?: string): string | null {
  const num = sanitizeE164(e164);
  if (!num) return null;
  // Detect mobile: wa.me works natively. On desktop, wa.me redirects to
  // api.whatsapp.com/send which is blocked by some browsers/extensions
  // (ERR_BLOCKED_BY_RESPONSE). Use web.whatsapp.com directly on desktop.
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  const base = isMobile
    ? `https://wa.me/${num}`
    : `https://web.whatsapp.com/send?phone=${num}`;
  if (!message) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}

export function buildMessengerUrl(page: string): string | null {
  const p = (page || "").trim().replace(/^@/, "");
  if (!p) return null;
  return `https://m.me/${p}`;
}

export function buildTelegramUrl(handle: string): string | null {
  const h = (handle || "").trim().replace(/^@/, "");
  if (!h) return null;
  return `https://t.me/${h}`;
}

export function normalizeConfig(raw: unknown): SocialChannelsConfig {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<SocialChannelsConfig>;
  return {
    ...DEFAULT_SOCIAL_CHANNELS,
    ...v,
    floating_enabled: Boolean(v.floating_enabled),
  };
}
