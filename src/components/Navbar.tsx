import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Accueil", href: "#hero" },
  { label: "Services", href: "#services" },
  { label: "Industries", href: "#industries" },
  { label: "Pourquoi Nous", href: "#why-us" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.querySelector(id);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="CloudMature" className="h-10 w-auto max-w-[160px]" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </button>
          ))}
          <Link to="/portal">
            <Button size="sm" className="gradient-primary text-primary-foreground border-0 hover:opacity-90">
              Portail Client
            </Button>
          </Link>
        </div>

        {/* Mobile */}
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
          <div className="px-6 pt-2">
            <Link to="/portal" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full gradient-primary text-primary-foreground border-0">Portail Client</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
