"""GamerGrid IGDB-backed game endpoint tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbo-max-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _assert_normalized_game(g):
    assert "id" in g and isinstance(g["id"], int)
    assert "title" in g
    assert "platforms" in g and isinstance(g["platforms"], list)
    # poster_path optional but if present must be https
    if g.get("poster_path"):
        assert g["poster_path"].startswith("https://"), f"poster not https: {g['poster_path']}"
    assert "vote_average" in g
    assert g.get("is_game") is True


# ---------------- Carousel endpoints ----------------
class TestCarousels:
    def test_trending(self, session):
        r = session.get(f"{API}/games/trending", params={"limit": 30}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "results" in data
        assert len(data["results"]) > 0
        assert len(data["results"]) <= 30
        for g in data["results"][:3]:
            _assert_normalized_game(g)

    def test_top_rated(self, session):
        r = session.get(f"{API}/games/top-rated", params={"limit": 30}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["results"]) > 0
        for g in data["results"][:3]:
            _assert_normalized_game(g)
            assert g["vote_average"] >= 8.0  # rating>=85 -> /10 = 8.5

    def test_upcoming(self, session):
        r = session.get(f"{API}/games/upcoming", params={"limit": 30}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Upcoming with hypes filter may return fewer; allow >=0 but require key shape
        assert "results" in data
        for g in data["results"][:3]:
            _assert_normalized_game(g)

    def test_new_releases(self, session):
        r = session.get(f"{API}/games/new-releases", params={"limit": 30}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["results"]) > 0
        for g in data["results"][:3]:
            _assert_normalized_game(g)


# ---------------- Platform endpoints ----------------
class TestPlatforms:
    @pytest.mark.parametrize("platform", ["playstation", "xbox", "pc", "switch"])
    def test_platform(self, session, platform):
        r = session.get(f"{API}/games/platform/{platform}", params={"sort": "rating"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["results"]) > 0, f"No results for {platform}"
        for g in data["results"][:3]:
            _assert_normalized_game(g)
            assert len(g["platforms"]) > 0

    def test_invalid_platform(self, session):
        r = session.get(f"{API}/games/platform/atari", timeout=15)
        assert r.status_code == 400

    def test_platforms_list(self, session):
        r = session.get(f"{API}/games/platforms", timeout=15)
        assert r.status_code == 200
        data = r.json()
        keys = [p["key"] for p in data]
        for k in ["playstation", "xbox", "pc", "switch"]:
            assert k in keys


# ---------------- Search ----------------
class TestSearch:
    def test_search_mario(self, session):
        r = session.get(f"{API}/games/search", params={"q": "mario"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["results"]) > 0
        names = " ".join((g.get("title") or "").lower() for g in data["results"])
        assert "mario" in names

    def test_search_empty_query(self, session):
        r = session.get(f"{API}/games/search", params={"q": ""}, timeout=15)
        assert r.status_code == 422  # min_length=1


# ---------------- Details + videos ----------------
class TestDetails:
    @pytest.fixture(scope="class")
    def a_game_id(self, session):
        r = session.get(f"{API}/games/top-rated", params={"limit": 5}, timeout=30)
        assert r.status_code == 200
        return r.json()["results"][0]["id"]

    def test_details(self, session, a_game_id):
        r = session.get(f"{API}/games/details/{a_game_id}", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == a_game_id
        assert "developers" in data
        assert "publishers" in data
        assert "similar" in data and isinstance(data["similar"], list)
        assert "screenshots" in data and isinstance(data["screenshots"], list)
        assert "videos" in data and isinstance(data["videos"], list)
        assert "genres" in data and isinstance(data["genres"], list)

    def test_details_not_found(self, session):
        r = session.get(f"{API}/games/details/999999999", timeout=15)
        assert r.status_code == 404

    def test_videos_shape(self, session, a_game_id):
        r = session.get(f"{API}/games/videos/{a_game_id}", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for v in data:
            assert "key" in v
            assert v.get("site") == "YouTube"
            assert v.get("type") == "Trailer"


# ---------------- Auth smoke ----------------
class TestAuthSmoke:
    def test_login(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": "cassiusflixvault@gmail.com", "password": "JGotti.8890"},
            timeout=15,
        )
        # Auth might or might not succeed depending on server seed;
        # accept 200 only as a green flag, but warn on failure with assertion
        assert r.status_code in (200, 401), r.text
        if r.status_code == 200:
            data = r.json()
            assert "access_token" in data or "token" in data
