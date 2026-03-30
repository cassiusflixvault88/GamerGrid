import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import InstallPWA from "./components/InstallPWA";
import Home from "./pages/Home";
import MoviesPage from "./pages/MoviesPage";
import SeriesPage from "./pages/SeriesPage";
import OriginalsPage from "./pages/OriginalsPage";
import SearchPage from "./pages/SearchPage";
import PublicDomainPage from "./pages/PublicDomainPage";
import AppReviewsPage from "./pages/AppReviewsPage";
import RequestContentPage from "./pages/RequestContentPage";
import WatchlistPage from "./pages/WatchlistPage";
import AdminDashboard from "./pages/AdminDashboard";
import SettingsPage from "./pages/SettingsPage";
import PromoteCEO from "./pages/PromoteCEO";
import DebugAdmin from "./pages/DebugAdmin";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/originals" element={<OriginalsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/public-domain" element={<PublicDomainPage />} />
              <Route path="/app-reviews" element={<AppReviewsPage />} />
              <Route path="/request-content" element={<RequestContentPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/promote-ceo" element={<PromoteCEO />} />
              <Route path="/debug-admin" element={<DebugAdmin />} />
            </Routes>
          </BrowserRouter>
          <InstallPWA />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
