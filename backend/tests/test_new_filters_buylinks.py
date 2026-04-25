"""Tests for iteration_7 features: genres list, MongoDB cache hits, genre+year filters, buy_links."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbo-max-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Genres ----------------
class TestGenres:
    def test_genres_list_shape(self, session):
        r = session.get(f"{API}/games/genres", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 20, f"expected >=20 genres got {len(data)}"
        for g in data[:3]:
            assert "id" in g and isinstance(g["id"], int)
            assert "name" in g and isinstance(g["name"], str)
        names = {g["name"] for g in data}
        # IGDB always returns at least these
        for expected in ("Shooter", "Role-playing (RPG)", "Adventure"):
            assert expected in names, f"missing {expected} in {sorted(names)[:10]}"


# ---------------- MongoDB cache ----------------
class TestMongoCache:
    def test_trending_second_hit_is_fast(self, session):
        # first call to warm cache
        r1 = session.get(f"{API}/games/trending", params={"limit": 30}, timeout=30)
        assert r1.status_code == 200
        # second call - should be cached
        t0 = time.time()
        r2 = session.get(f"{API}/games/trending", params={"limit": 30}, timeout=30)
        elapsed_ms = (time.time() - t0) * 1000
        assert r2.status_code == 200
        # Public preview ingress + Mongo round-trip target: < 1500ms (sub-second is the goal but ingress can add latency)
        assert elapsed_ms < 1500, f"2nd call took {elapsed_ms:.0f}ms (expected fast cached hit)"
        assert r1.json()["total"] == r2.json()["total"]


# ---------------- Filters ----------------
class TestFilters:
    def test_trending_genre_shooter_year_2023(self, session):
        # Shooter genre id from IGDB = 5
        r = session.get(f"{API}/games/trending", params={"genre": 5, "year": 2023, "limit": 30}, timeout=40)
        assert r.status_code == 200, r.text
        data = r.json()
        results = data["results"]
        assert len(results) > 0, "no shooter games returned for 2023"
        for g in results[:5]:
            assert "Shooter" in (g.get("genres") or []), f"{g.get('title')} genres={g.get('genres')}"
            yr = (g.get("release_date") or "")[:4]
            assert yr == "2023", f"{g.get('title')} released {yr}"

    def test_top_rated_genre_rpg(self, session):
        # RPG = 12
        r = session.get(f"{API}/games/top-rated", params={"genre": 12, "limit": 20}, timeout=40)
        assert r.status_code == 200, r.text
        results = r.json()["results"]
        assert len(results) > 0
        for g in results[:5]:
            assert "Role-playing (RPG)" in (g.get("genres") or []), f"{g.get('title')} -> {g.get('genres')}"

    def test_platform_playstation_genre_year(self, session):
        r = session.get(
            f"{API}/games/platform/playstation",
            params={"genre": 5, "year": 2023, "limit": 20},
            timeout=40,
        )
        assert r.status_code == 200, r.text
        results = r.json()["results"]
        # filtered set may be small but should be > 0 for shooter+2023+PS
        assert len(results) > 0
        for g in results[:5]:
            assert "Shooter" in (g.get("genres") or [])
            yr = (g.get("release_date") or "")[:4]
            assert yr == "2023"

    def test_upcoming_with_genre(self, session):
        r = session.get(f"{API}/games/upcoming", params={"genre": 12, "limit": 10}, timeout=30)
        assert r.status_code == 200, r.text
        # may be empty if no hyped RPGs upcoming - just shape check
        assert "results" in r.json()


# ---------------- Buy links ----------------
class TestBuyLinks:
    def test_witcher_3_has_direct_store_links(self, session):
        # IGDB id 1942 = The Witcher 3: Wild Hunt
        r = session.get(f"{API}/games/details/1942", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "buy_links" in data
        kinds = [b["kind"] for b in data["buy_links"]]
        # Witcher 3 should have these direct stores from IGDB websites + amazon fallback
        for expected in ("steam", "gog", "amazon"):
            assert expected in kinds, f"missing {expected} in {kinds}"
        # urls must be valid http(s)
        for b in data["buy_links"]:
            assert b["url"].startswith("http"), b
            assert b["label"]
            assert b["kind"]

    def test_gtav_has_fallback_buy_links(self, session):
        # IGDB id 1020 = GTA V
        r = session.get(f"{API}/games/details/1020", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        kinds = [b["kind"] for b in data.get("buy_links", [])]
        # At minimum amazon + at least one console fallback should exist
        assert "amazon" in kinds, kinds
        # GTA V is on PSN and Xbox - fallback search urls should be added if direct missing
        has_psn_or_xbox = ("psn" in kinds) or ("xbox" in kinds)
        assert has_psn_or_xbox, f"expected psn/xbox link, got {kinds}"

    def test_buy_links_no_duplicates(self, session):
        r = session.get(f"{API}/games/details/1942", timeout=30)
        kinds = [b["kind"] for b in r.json()["buy_links"]]
        assert len(kinds) == len(set(kinds)), f"duplicate kinds: {kinds}"
