import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import InstallPWA from "./components/InstallPWA";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import AppReviewsPage from "./pages/AppReviewsPage";
import ReviewsPage from "./pages/ReviewsPage";
import RequestContentPage from "./pages/RequestContentPage";
import FeedbackPage from "./pages/FeedbackPage";
import SupportPage from "./pages/SupportPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import BrowseAllPage from "./pages/BrowseAllPage";
import UserDetailPage from "./pages/UserDetailPage";
import WatchlistPage from "./pages/WatchlistPage";
import AdminDashboard from "./pages/AdminDashboard";
import SettingsPage from "./pages/SettingsPage";
import PromoteCEO from "./pages/PromoteCEO";
import DebugAdmin from "./pages/DebugAdmin";
import PublicProfilePage from "./pages/PublicProfilePage";
import Top10Page from "./pages/Top10Page";
import NewsPage from "./pages/NewsPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ShareLinksPage from "./pages/ShareLinksPage";
import ReferAFriendPage from "./pages/ReferAFriendPage";
import ReferralCapture from "./components/ReferralCapture";
import PageTracker from "./components/PageTracker";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <PageTracker />
            <ReferralCapture />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/games/all" element={<BrowseAllPage />} />
              <Route path="/games/:platform" element={<BrowseAllPage />} />
              <Route path="/app-reviews" element={<AppReviewsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/request-content" element={<RequestContentPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/admin/user/:userId" element={<UserDetailPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/promote-ceo" element={<PromoteCEO />} />
              <Route path="/debug-admin" element={<DebugAdmin />} />
              <Route path="/u/:username" element={<PublicProfilePage />} />
              <Route path="/top10" element={<Top10Page />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/share" element={<ShareLinksPage />} />
              <Route path="/share-links" element={<ShareLinksPage />} />
              <Route path="/refer" element={<ReferAFriendPage />} />
              <Route path="/refer-a-friend" element={<ReferAFriendPage />} />
            </Routes>
            <InstallPWA />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
