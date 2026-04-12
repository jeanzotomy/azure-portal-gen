import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthSessionProvider } from "./hooks/use-auth-session";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <AuthSessionProvider>
      <App />
    </AuthSessionProvider>
  </LanguageProvider>
);
