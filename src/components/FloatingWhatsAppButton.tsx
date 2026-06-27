import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { useSocialChannels } from "@/hooks/use-social-channels";
import { buildWhatsappUrl } from "@/lib/social-channels";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = [
  "/admin",
  "/portal",
  "/auth",
  "/mfa",
  "/reset-password",
  "/onboarding",
  "/rh",
  "/install",
  "/unsubscribe",
];

const DISMISS_KEY = "cm_floating_whatsapp_dismissed";

export function FloatingWhatsAppButton() {
  const { config } = useSocialChannels();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { /* ignore */ }
  }, []);

  if (dismissed) return null;
  if (!config.floating_enabled) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const href = buildWhatsappUrl(config.whatsapp_e164, config.floating_message);
  if (!href) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className={cn(
        "fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6",
        "inline-flex items-center gap-2 rounded-full pl-3 pr-4 py-3",
        "bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30",
        "hover:scale-105 transition-transform",
      )}
    >
      <span className="relative inline-flex">
        <MessageCircle size={22} />
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
      </span>
      <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Fermer"
        className="ml-1 -mr-1 h-5 w-5 inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
      >
        <X size={12} />
      </button>
    </a>
  );
}

export default FloatingWhatsAppButton;
