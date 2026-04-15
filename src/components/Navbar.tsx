import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Globe, Smartphone, User, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { clearSmsMfaVerified } from "@/hooks/use-mfa";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { t, locale, setLocale } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthSession();

  const navLinks = [
    { label: t("nav.home"), href: "#hero" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.industries"), href: "#industries" },
    { label: t("nav.whyUs"), href: "#why-us" },
    { label: t("nav.contact"), href: "#contact" },
  ];

  const scrollTo = (id: string) => {
    setOpen(false);
    if (location.pathname !== "/") {
      navigate("/" + id);
    } else {
      const el = document.querySelector(id);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleLang = () => setLocale(locale === "fr" ? "en" : "fr");

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    navigate("/");
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const firstName = fullName.split(" ")[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="CloudMature" className="h-12 w-auto max-w-[190px]" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </button>
          ))}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Globe size={16} />
            {locale === "fr" ? "EN" : "FR"}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/portal" className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shadow-sm">
                  <User size={14} className="text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold text-primary">{firstName}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title={locale === "fr" ? "Déconnexion" : "Sign out"}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/portal">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0 hover:opacity-90">
                {t("nav.portal")}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden gradient-hero border-t border-border/20 pb-4">
          {navLinks.map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)} className="block w-full text-left px-6 py-3 text-sm text-secondary-foreground hover:bg-secondary/50">
              {l.label}
            </button>
          ))}
          <button
            onClick={toggleLang}
            className="block w-full text-left px-6 py-3 text-sm text-secondary-foreground hover:bg-secondary/50 flex items-center gap-2"
          >
            <Globe size={16} />
            {locale === "fr" ? "English" : "Français"}
          </button>
          <Link
            to="/install"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-6 py-3 text-sm text-secondary-foreground hover:bg-secondary/50 flex items-center gap-2"
          >
            <Smartphone size={16} />
            {t("install.navButton")}
          </Link>
          <div className="px-6 pt-2">
            {user ? (
              <div className="space-y-2">
                <Link to="/portal" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                    <User size={16} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{firstName}</p>
                    <p className="text-xs text-muted-foreground">{t("nav.portal")}</p>
                  </div>
                </Link>
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  {locale === "fr" ? "Déconnexion" : "Sign out"}
                </button>
              </div>
            ) : (
              <Link to="/portal" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full gradient-primary text-primary-foreground border-0">{t("nav.portal")}</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
