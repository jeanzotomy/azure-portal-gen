import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
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

// Self-heal stale lazy chunks after a new deploy: when the browser holds an
// outdated index.html that references a hashed JS chunk that no longer exists,
// reload once to fetch the fresh manifest. Guard with sessionStorage to avoid
// infinite reload loops if the failure is genuine (network, offline, etc.).
const CHUNK_RELOAD_KEY = "__chunk_reload_attempted__";
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);

const handleChunkError = (msg: string) => {
  if (!isChunkLoadError(msg)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
};

window.addEventListener("error", (e) => handleChunkError(e?.message ?? ""));
window.addEventListener("unhandledrejection", (e) => {
  const reason: any = e?.reason;
  handleChunkError(typeof reason === "string" ? reason : reason?.message ?? "");
});
// Clear the guard on successful load (next tick after mount).
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 2000);
});


createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageProvider>
      <AuthSessionProvider>
        <App />
      </AuthSessionProvider>
    </LanguageProvider>
  </HelmetProvider>
);
