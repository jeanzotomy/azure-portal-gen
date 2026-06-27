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
import SiteAssistant from "./components/SiteAssistant";
import { FloatingWhatsAppButton } from "./components/FloatingWhatsAppButton";


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
const HrPortalPage = lazy(() => import("./pages/HrPortalPage.tsx"));
const VerifyCertificatePage = lazy(() => import("./pages/VerifyCertificatePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const EmployeeTrainingAssignmentPage = lazy(() => import("./pages/admin/EmployeeTrainingAssignmentPage.tsx"));
const EmployeeTrainingsListPage = lazy(() => import("./pages/portal/EmployeeTrainingsListPage.tsx"));
const EmployeeTrainingPlayerPage = lazy(() => import("./pages/portal/EmployeeTrainingPlayerPage.tsx"));
const LearnerLeaderboardPage = lazy(() => import("./pages/portal/LearnerLeaderboardPage.tsx"));
const EmployeeTrainingManager = lazy(() => import("./components/admin/EmployeeTrainingManager.tsx"));
const TrainingGroupsManagerPage = lazy(() => import("./pages/admin/TrainingGroupsManagerPage.tsx"));
const UserDetailPage = lazy(() => import("./pages/admin/UserDetailPage.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const CheckoutReturnPage = lazy(() => import("./pages/CheckoutReturnPage.tsx"));
const SubscriptionPage = lazy(() => import("./pages/portal/SubscriptionPage.tsx"));
const TrainingsStorePage = lazy(() => import("./pages/TrainingsStorePage.tsx"));

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
            <Route path="/portal" element={<AuthGuard><PortalPage /></AuthGuard>}>
              <Route path="formations" element={<EmployeeTrainingsListPage />} />
              <Route path="formations/classement" element={<LearnerLeaderboardPage />} />
              <Route path="formations/:assignedId" element={<EmployeeTrainingPlayerPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
            </Route>
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/formations" element={<TrainingsStorePage />} />
            <Route path="/checkout/return" element={<CheckoutReturnPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/mfa" element={<MfaPage />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/admin" element={<AuthGuard requireRoles={["admin","agent","comptable","gestionnaire"]} fallbackRoute="/portal"><AdminPage /></AuthGuard>}>
              <Route path="formations" element={<EmployeeTrainingManager />} />
              <Route path="formations/assignations/:userId" element={<EmployeeTrainingAssignmentPage basePath="/admin" parentLabel="Admin" />} />
              <Route path="formations/groupes" element={<TrainingGroupsManagerPage basePath="/admin" parentLabel="Admin" />} />
              <Route path="users/:userId" element={<UserDetailPage />} />
            </Route>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/careers/:slug" element={<JobDetailPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/candidature/:trackingId" element={<ApplicationTrackingPage />} />
            <Route path="/candidature" element={<ApplicationTrackingPage />} />
            <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
            <Route path="/rh" element={<AuthGuard requireRoles={["hr"]} fallbackRoute="/portal"><HrPortalPage /></AuthGuard>}>
              <Route path="formations" element={<EmployeeTrainingManager />} />
              <Route path="formations/assignations/:userId" element={<EmployeeTrainingAssignmentPage basePath="/rh" parentLabel="RH" />} />
              <Route path="formations/groupes" element={<TrainingGroupsManagerPage basePath="/rh" parentLabel="RH" />} />
            </Route>
            <Route path="/verify/:code" element={<VerifyCertificatePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ScrollToTop />
        <MobileBottomNav />
        <SiteAssistant />
        <FloatingWhatsAppButton />

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
