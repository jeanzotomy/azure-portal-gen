import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import PortalPage from "./pages/PortalPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import MfaPage from "./pages/MfaPage.tsx";
import InstallPage from "./pages/InstallPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import CareersPage from "./pages/CareersPage.tsx";
import JobDetailPage from "./pages/JobDetailPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthGuard } from "./components/AuthGuard";

const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTopOnNavigate />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/portal" element={<AuthGuard><PortalPage /></AuthGuard>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mfa" element={<MfaPage />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="/admin" element={<AuthGuard requireRoles={["admin","agent","comptable","gestionnaire"]} fallbackRoute="/portal"><AdminPage /></AuthGuard>} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/careers/:slug" element={<JobDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
