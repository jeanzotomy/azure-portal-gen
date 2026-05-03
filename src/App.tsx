import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import { AuthGuard } from "./components/AuthGuard";
import { ScrollToTop } from "./components/ScrollToTop";
import { MobileBottomNav } from "./components/MobileBottomNav";

// Lazy-load non-landing routes to drastically reduce initial JS bundle
// (improves Total Blocking Time and LCP). The landing page (Index) stays
// eagerly loaded since it is the most-visited entry point.
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const PortalPage = lazy(() => import("./pages/PortalPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.tsx"));
const MfaPage = lazy(() => import("./pages/MfaPage.tsx"));
const InstallPage = lazy(() => import("./pages/InstallPage.tsx"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.tsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.tsx"));
const CareersPage = lazy(() => import("./pages/CareersPage.tsx"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage.tsx"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage.tsx"));
const ApplicationTrackingPage = lazy(() => import("./pages/ApplicationTrackingPage.tsx"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

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
        <Suspense fallback={null}>
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
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/candidature/:trackingId" element={<ApplicationTrackingPage />} />
            <Route path="/candidature" element={<ApplicationTrackingPage />} />
            <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ScrollToTop />
        <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
