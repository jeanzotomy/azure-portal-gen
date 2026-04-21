import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Cloud, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BadgeItem {
  icon?: LucideIcon;
  label: string;
}

interface FormDialogHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badges?: BadgeItem[];
}

/**
 * En-tête de formulaire harmonisé : dégradé navy/cyan, blobs décoratifs,
 * icône en pastille, titre + sous-titre + petits badges.
 * À utiliser dans toutes les modales de la plateforme.
 */
export function FormDialogHeader({
  icon: Icon,
  title,
  subtitle,
  badges = [
    { icon: CheckCircle2, label: "Données validées" },
    { icon: Cloud, label: "Sauvegarde sécurisée" },
  ],
}: FormDialogHeaderProps) {
  return (
    <DialogHeader className="relative bg-gradient-to-br from-primary via-primary to-[#005f80] text-primary-foreground p-6 overflow-hidden rounded-t-lg">
      {/* Blobs décoratifs */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-8 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="shrink-0 h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
          <Icon size={22} className="text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <DialogTitle className="text-primary-foreground text-xl font-bold leading-tight">
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-primary-foreground/85 text-sm font-normal mt-0.5 truncate">
              {subtitle}
            </p>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {badges.map((b, i) => {
                const BIcon = b.icon;
                return (
                  <Badge
                    key={i}
                    className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm gap-1 font-normal"
                  >
                    {BIcon && <BIcon size={11} />} {b.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}

/** Classes à appliquer sur <DialogContent> pour styliser le bouton "X" en blanc translucide. */
export const formDialogContentClass =
  "p-0 gap-0 overflow-hidden [&>button]:bg-white/15 [&>button]:hover:bg-white/25 [&>button]:text-primary-foreground [&>button]:opacity-100 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-4 [&>button]:right-4 [&>button>svg]:h-4 [&>button>svg]:w-4";
