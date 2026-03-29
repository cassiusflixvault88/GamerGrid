import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/toaster";
import Home from "./pages/Home";
import MoviesPage from "./pages/MoviesPage";
import SeriesPage from "./pages/SeriesPage";
import OriginalsPage from "./pages/OriginalsPage";
import SearchPage from "./pages/SearchPage";
import PublicDomainPage from "./pages/PublicDomainPage";
import WatchlistPage from "./pages/WatchlistPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/originals" element={<OriginalsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/public-domain" element={<PublicDomainPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;
