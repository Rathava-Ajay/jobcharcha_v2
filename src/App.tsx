/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { ScrollToTop } from './components/routing/ScrollToTop';
import { AnalyticsPageView } from './components/routing/AnalyticsPageView';
import { MobileTabBar } from './components/MobileTabBar';

// The landing page is the primary entry and is prerendered — keep it eager so first paint
// has no lazy-chunk round-trip. Every other route is code-split: the homepage no longer
// ships the job-detail, dashboard, admin, checkout, etc. bundles it never renders.
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const AllJobsPage = lazy(() => import('./pages/AllJobsPage'));
const PrivateJobsPage = lazy(() => import('./pages/PrivateJobsPage'));
const PrivateJobDetailsPage = lazy(() => import('./pages/PrivateJobDetailsPage'));
const JobDetailsPage = lazy(() => import('./pages/JobDetailsPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogDetailsPage = lazy(() => import('./pages/BlogDetailsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdmitCardsPage = lazy(() => import('./pages/AdmitCardsPage'));
const AdmitCardDetailsPage = lazy(() => import('./pages/AdmitCardDetailsPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ResultDetailsPage = lazy(() => import('./pages/ResultDetailsPage'));
const MockTestPage = lazy(() => import('./pages/MockTestPage'));
const MockTestDashboardPage = lazy(() => import('./pages/MockTestDashboardPage'));
const AttemptResultPage = lazy(() => import('./pages/AttemptResultPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'));
const CutoffPredictorPage = lazy(() => import('./pages/CutoffPredictorPage'));
const DailyQuizPage = lazy(() => import('./pages/DailyQuizPage'));
const OldPapersPage = lazy(() => import('./pages/OldPapersPage'));
const OldPaperDetailsPage = lazy(() => import('./pages/OldPaperDetailsPage'));
const PracticeQuestionsPage = lazy(() => import('./pages/PracticeQuestionsPage'));
const SchemesPage = lazy(() => import('./pages/SchemesPage'));
const SchemeDetailsPage = lazy(() => import('./pages/SchemeDetailsPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsDetailsPage = lazy(() => import('./pages/NewsDetailsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const ShippingDeliveryPage = lazy(() => import('./pages/ShippingDeliveryPage'));
const EmployerJobPostingRulesPage = lazy(() => import('./pages/EmployerJobPostingRulesPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const AspirantDashboardPage = lazy(() => import('./pages/AspirantDashboardPage'));
const AspirantCareerHubPage = lazy(() => import('./pages/AspirantCareerHubPage'));
const EmployerDashboardPage = lazy(() => import('./pages/EmployerDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminMobilePostPage = lazy(() => import('./pages/AdminMobilePostPage'));
const AdminMobilePostResultPage = lazy(() => import('./pages/AdminMobilePostResultPage'));
const AdminMobilePostAdmitCardPage = lazy(() => import('./pages/AdminMobilePostAdmitCardPage'));
const AdminMobilePostMockTestPage = lazy(() => import('./pages/AdminMobilePostMockTestPage'));
const AdminMobilePostQuizPage = lazy(() => import('./pages/AdminMobilePostQuizPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" role="status" aria-label="Loading" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <AnalyticsPageView />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:role" element={<JoinPage />} />
          <Route path="/jobs" element={<AllJobsPage />} />
          <Route path="/private-jobs" element={<PrivateJobsPage />} />
          <Route path="/private-jobs/:slug" element={<PrivateJobDetailsPage />} />
          <Route path="/jobs/:slug" element={<JobDetailsPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admit-cards" element={<AdmitCardsPage />} />
          <Route path="/admit-cards/:slug" element={<AdmitCardDetailsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:slug" element={<ResultDetailsPage />} />
          <Route path="/mock-tests" element={<MockTestDashboardPage />} />
          <Route path="/mock-tests/:slug" element={<MockTestPage />} />
          <Route path="/attempts/:id/result" element={<AttemptResultPage />} />
          <Route path="/job-alerts" element={<JobAlertsPage />} />
          <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
          <Route path="/cutoff-predictor" element={<CutoffPredictorPage />} />
          <Route path="/daily-quiz" element={<DailyQuizPage />} />
          <Route path="/daily-quiz/:date" element={<DailyQuizPage />} />
          <Route path="/old-papers" element={<OldPapersPage />} />
          <Route path="/old-papers/:slug" element={<OldPaperDetailsPage />} />
          <Route path="/practice-questions" element={<PracticeQuestionsPage />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/schemes/:slug" element={<SchemeDetailsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/shipping-policy" element={<ShippingDeliveryPage />} />
          <Route path="/employer-job-posting-rules" element={<EmployerJobPostingRulesPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="/saved-jobs" element={<SavedJobsPage />} />

          <Route
            path="/dashboard/aspirant"
            element={
              <ProtectedRoute allowedRoles={['aspirant']}>
                <AspirantDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/aspirant/profile"
            element={
              <ProtectedRoute allowedRoles={['aspirant']}>
                <AspirantCareerHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/employer"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mobile-post"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMobilePostPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mobile-post-result"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMobilePostResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mobile-post-admitcard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMobilePostAdmitCardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mobile-post-mocktest"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMobilePostMockTestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mobile-post-quiz"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMobilePostQuizPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <MobileTabBar />
    </AuthProvider>
  );
}
