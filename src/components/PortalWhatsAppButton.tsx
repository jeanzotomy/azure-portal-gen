import { MessageCircle } from "lucide-react";
import { buildWhatsappUrl } from "@/lib/social-channels";
import { cn } from "@/lib/utils";

const PORTAL_WA_NUMBER = "18734371229";
const PORTAL_WA_MESSAGE = "Bonjour CloudMature, je vous contacte depuis le portail client.";

export function PortalWhatsAppButton() {
  const href = buildWhatsappUrl(PORTAL_WA_NUMBER, PORTAL_WA_MESSAGE);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter le support sur WhatsApp"
      title="Support WhatsApp"
  className={cn(
        // Stack above the AI assistant launcher (bottom-20 / md:bottom-6, ~56px tall + 12px gap)
        "fixed z-40 bottom-[9rem] right-4 md:bottom-[5.5rem] md:right-6",
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
    </a>
  );
}

export default PortalWhatsAppButton;
