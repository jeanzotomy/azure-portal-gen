import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-secondary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CloudMature" className="h-12 w-auto max-w-[190px]" />
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-medium tracking-wide border border-cyan-glow/30 shadow-[0_0_15px_hsl(195_100%_40%/0.15)]">
            <span className="text-cyan-glow">Consultation TI</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="text-cyan-glow">Cloud</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="text-cyan-glow">DevOps</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="gradient-text font-semibold">IA</span>
          </div>
          <p className="text-sm text-secondary-foreground/60">
            © {new Date().getFullYear()} Cloud Mature. Tous droits réservés. Innover · Optimiser · Automatiser
          </p>
        </div>
      </div>
    </footer>
  );
}
