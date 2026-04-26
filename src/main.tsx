import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthSessionProvider } from "./hooks/use-auth-session";
import heroPersonUrl from "./assets/hero-person.webp";

// Preload the LCP hero image as early as possible (before React mounts)
// so the browser discovers it sooner and applies high fetch priority.
if (typeof document !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = heroPersonUrl;
  link.fetchPriority = "high";
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <AuthSessionProvider>
      <App />
    </AuthSessionProvider>
  </LanguageProvider>
);
