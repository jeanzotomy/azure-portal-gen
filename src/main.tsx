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

const showUpdateOverlay = () => {
  if (document.getElementById("__chunk_update_overlay__")) return;
  const overlay = document.createElement("div");
  overlay.id = "__chunk_update_overlay__";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-live", "assertive");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(8,18,32,0.78);backdrop-filter:blur(6px);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;padding:24px;";
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#0b2a3d;border:1px solid rgba(0,153,204,0.4);border-radius:16px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.5);text-align:center;">
      <div style="margin:0 auto 16px;width:48px;height:48px;border-radius:50%;border:3px solid rgba(255,255,255,0.2);border-top-color:#00c2ff;animation:cm-spin 0.9s linear infinite;"></div>
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;">Mise à jour en cours</h2>
      <p style="margin:0 0 4px;font-size:14px;opacity:0.9;line-height:1.5;">Une nouvelle version de l'application est disponible.</p>
      <p style="margin:0;font-size:13px;opacity:0.7;">La page va se recharger automatiquement…</p>
    </div>
    <style>@keyframes cm-spin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(overlay);
};

const handleChunkError = (msg: string) => {
  if (!isChunkLoadError(msg)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  showUpdateOverlay();
  setTimeout(() => window.location.reload(), 1200);
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
