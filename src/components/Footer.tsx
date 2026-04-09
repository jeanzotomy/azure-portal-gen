import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-secondary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CloudMature" className="h-10 w-auto max-w-[160px]" />
          </div>
          <p className="text-sm text-secondary-foreground/60">
            © {new Date().getFullYear()} Cloud Mature. Tous droits réservés. Innover · Optimiser · Automatiser
          </p>
        </div>
      </div>
    </footer>
  );
}
