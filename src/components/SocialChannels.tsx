import { MessageCircle, Facebook, Linkedin, Send as TelegramIcon } from "lucide-react";
import { useSocialChannels } from "@/hooks/use-social-channels";
import {
  buildMessengerUrl,
  buildTelegramUrl,
  buildWhatsappUrl,
} from "@/lib/social-channels";
import { cn } from "@/lib/utils";

type Variant = "inline" | "icons" | "stacked";

type Channel = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  colorClass: string;
};


// Reusable X (Twitter) glyph since lucide doesn't ship one.
function XIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.797l-5.32-6.97L4.8 22H1.54l8.03-9.18L1 2h6.91l4.808 6.36L18.244 2Zm-2.39 18h1.86L7.243 4h-1.93l10.54 16Z" />
    </svg>
  );
}

export function SocialChannels({
  variant = "inline",
  className,
  message,
  title,
}: {
  variant?: Variant;
  className?: string;
  message?: string;
  title?: string;
}) {
  const { config } = useSocialChannels();

  const channels: Channel[] = [];
  const wa = buildWhatsappUrl(config.whatsapp_e164, message ?? config.floating_message);
  if (wa) {
    channels.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: wa,
      icon: MessageCircle,
      colorClass: "text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/30",
    });
  }
  const mes = buildMessengerUrl(config.messenger_page);
  if (mes) {
    channels.push({
      key: "messenger",
      label: "Messenger",
      href: mes,
      icon: MessageCircle,
      colorClass: "text-[#0084FF] hover:bg-[#0084FF]/10 border-[#0084FF]/30",
    });
  }
  const tg = buildTelegramUrl(config.telegram_handle);
  if (tg) {
    channels.push({
      key: "telegram",
      label: "Telegram",
      href: tg,
      icon: TelegramIcon,
      colorClass: "text-[#229ED9] hover:bg-[#229ED9]/10 border-[#229ED9]/30",
    });
  }
  if (config.linkedin_url) {
    channels.push({
      key: "linkedin",
      label: "LinkedIn",
      href: config.linkedin_url,
      icon: Linkedin,
      colorClass: "text-[#0A66C2] hover:bg-[#0A66C2]/10 border-[#0A66C2]/30",
    });
  }
  if (config.facebook_url) {
    channels.push({
      key: "facebook",
      label: "Facebook",
      href: config.facebook_url,
      icon: Facebook,
      colorClass: "text-[#1877F2] hover:bg-[#1877F2]/10 border-[#1877F2]/30",
    });
  }
  if (config.x_url) {
    channels.push({
      key: "x",
      label: "X",
      href: config.x_url,
      icon: XIcon,
      colorClass: "text-foreground hover:bg-foreground/10 border-foreground/30",
    });
  }

  if (channels.length === 0) return null;

  if (variant === "icons") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)} aria-label={title || "Réseaux sociaux"}>
        {channels.map((c) => (
          <a
            key={c.key}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={c.label}
            title={c.label}
            className={cn(
              "inline-flex items-center justify-center h-9 w-9 rounded-full border bg-background/40 backdrop-blur-sm transition-colors",
              c.colorClass,
            )}
          >
            <c.icon size={16} />
          </a>
        ))}
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
        {channels.map((c) => (
          <a
            key={c.key}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium bg-background/40 backdrop-blur-sm transition-colors",
              c.colorClass,
            )}
          >
            <c.icon size={16} />
            {c.label}
          </a>
        ))}
      </div>
    );
  }

  // inline
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {title && <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">{title}</span>}
      {channels.map((c) => (
        <a
          key={c.key}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-background/40 backdrop-blur-sm transition-colors",
            c.colorClass,
          )}
        >
          <c.icon size={14} />
          {c.label}
        </a>
      ))}
    </div>
  );
}
