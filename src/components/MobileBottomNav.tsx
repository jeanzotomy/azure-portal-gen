import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderKanban, Briefcase, User } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  icon: typeof Home;
  to: string;
  isActive: (pathname: string, search: string) => boolean;
};

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const { t } = useTranslation();

  // Hide on auth/MFA flows to keep them focused
  const hiddenRoutes = ["/auth", "/mfa", "/reset-password"];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const portalLink = (tab: string) => (user ? `/portal?tab=${tab}` : "/auth");

  const items: Item[] = [
    {
      id: "home",
      label: t("mobileNav.home"),
      icon: Home,
      to: "/",
      isActive: (p) => p === "/",
    },
    {
      id: "projects",
      label: t("mobileNav.projects"),
      icon: FolderKanban,
      to: portalLink("projects"),
      isActive: (p, s) =>
        p.startsWith("/portal") && (s.includes("tab=projects") || s.includes("tab=dashboard") || s === ""),
    },
    {
      id: "applications",
      label: t("mobileNav.applications"),
      icon: Briefcase,
      to: user ? "/portal?tab=applications" : "/careers",
      isActive: (p, s) =>
        p.startsWith("/careers") || (p.startsWith("/portal") && s.includes("tab=applications")),
    },
    {
      id: "profile",
      label: t("mobileNav.profile"),
      icon: User,
      to: portalLink("profile"),
      isActive: (p, s) => p.startsWith("/portal") && s.includes("tab=profile"),
    },
  ];

  const handleClick = (e: React.MouseEvent, item: Item) => {
    // Force reload of query param when already on /portal so the tab updates
    if (item.to.startsWith("/portal") && location.pathname.startsWith("/portal")) {
      e.preventDefault();
      navigate(item.to, { replace: true });
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/85 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.isActive(location.pathname, location.search);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                onClick={(e) => handleClick(e, item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={20}
                  className={cn("transition-transform", active && "scale-110")}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="truncate max-w-full leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
