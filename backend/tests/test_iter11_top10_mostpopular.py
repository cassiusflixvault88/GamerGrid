"""
iter11 backend regression — top10, most-popular + regression of prior endpoints.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbo-max-app.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Accept": "application/json"})
    return sess


# ---------- NEW iter11 endpoints ----------
class TestTop10:
    def test_top10_returns_10(self, s):
        r = s.get(f"{BASE_URL}/api/games/top10", timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "results" in j
        assert len(j["results"]) == 10, f"expected 10 got {len(j['results'])}"
        for g in j["results"]:
            assert g.get("id")
            assert g.get("title")
            assert g.get("poster_path")
            assert g.get("vote_average", 0) > 0

    def test_top10_dev_publisher_populated(self, s):
        r = s.get(f"{BASE_URL}/api/games/top10", timeout=30)
        j = r.json()
        with_dev = [g for g in j["results"] if g.get("developer")]
        # At least 70% should have a developer — IGDB sometimes misses some.
        assert len(with_dev) >= 7, f"only {len(with_dev)}/10 have developer"

    def test_top10_titles_recognizable(self, s):
        r = s.get(f"{BASE_URL}/api/games/top10", timeout=30)
        titles = [g["title"] for g in r.json()["results"]]
        print("Top10 titles:", titles)
        # Just smoke-check that at least one famous game is in there.
        famous = ["Grand Theft Auto V", "The Witcher 3", "Red Dead Redemption 2",
                  "Elden Ring", "God of War", "Cyberpunk 2077", "Minecraft"]
        matches = [t for t in titles if any(f.lower() in (t or "").lower() for f in famous)]
        assert matches, f"no recognizable famous games in top10: {titles}"


class TestMostPopular:
    def test_most_popular_5(self, s):
        r = s.get(f"{BASE_URL}/api/games/most-popular?limit=5", timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "results" in j
        assert len(j["results"]) == 5

    def test_most_popular_differs_from_top10(self, s):
        mp = s.get(f"{BASE_URL}/api/games/most-popular?limit=5", timeout=30).json()
        t10 = s.get(f"{BASE_URL}/api/games/top10", timeout=30).json()
        mp_ids = [g["id"] for g in mp["results"]]
        t10_ids = [g["id"] for g in t10["results"][:5]]
        assert mp_ids != t10_ids, "most-popular should NOT equal top10[:5]"


# ---------- Regression ----------
class TestRegression:
    def test_trending(self, s):
        r = s.get(f"{BASE_URL}/api/games/trending?limit=10", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["results"]) > 0

    def test_top_rated(self, s):
        r = s.get(f"{BASE_URL}/api/games/top-rated?limit=10", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["results"]) > 0

    def test_upcoming(self, s):
        r = s.get(f"{BASE_URL}/api/games/upcoming?limit=10", timeout=30)
        assert r.status_code == 200

    def test_new_releases(self, s):
        r = s.get(f"{BASE_URL}/api/games/new-releases?limit=10", timeout=30)
        assert r.status_code == 200

    def test_goty(self, s):
        r = s.get(f"{BASE_URL}/api/games/goty", timeout=30)
        assert r.status_code == 200

    @pytest.mark.parametrize("plat", ["playstation", "xbox", "pc", "switch"])
    def test_platform(self, s, plat):
        r = s.get(f"{BASE_URL}/api/games/platform/{plat}?limit=5", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["results"]) > 0

    def test_search(self, s):
        r = s.get(f"{BASE_URL}/api/games/search?q=zelda&limit=5", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["results"]) > 0

    def test_details_buy_links(self, s):
        # GTA V id=1020 is a well-known stable IGDB id
        r = s.get(f"{BASE_URL}/api/games/details/1020", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "buy_links" in j and len(j["buy_links"]) > 0

    def test_videos(self, s):
        r = s.get(f"{BASE_URL}/api/games/videos/1020", timeout=30)
        assert r.status_code == 200

    def test_genres(self, s):
        r = s.get(f"{BASE_URL}/api/games/genres", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_platforms_list(self, s):
        r = s.get(f"{BASE_URL}/api/games/platforms", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_deals(self, s):
        r = s.get(f"{BASE_URL}/api/games/deals?title=witcher", timeout=30)
        assert r.status_code == 200
        assert "results" in r.json()

    def test_user_profile_public(self, s):
        r = s.get(f"{BASE_URL}/api/users/JayCool", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "email" not in j
        assert j.get("username", "").lower() == "jaycool"
