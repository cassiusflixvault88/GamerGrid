"""
Iteration 8 backend tests:
- Profile picture persistence (no auto-revert to default)
- User model defaults: profile_picture_url should be None (not /flixvault-icon.svg)
- /api/games/goty endpoint (default + ?year=2024)
- Mongo TTL index on games_cache (expires_at, expireAfterSeconds=0)
- Regression: trending/top-rated/upcoming/new-releases/platform/search/details/videos/genres/platforms
"""
import os
import uuid
import asyncio
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbo-max-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CEO_EMAIL = "cassiusflixvault@gmail.com"
CEO_PASS = "JGotti.8890"


# --------- fixtures ---------
@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def ceo_headers(ceo_token):
    return {"Authorization": f"Bearer {ceo_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def fresh_user_token():
    """Create a brand new user to test default profile_picture_url == None."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_iter8_{suffix}@example.com"
    payload = {"email": email, "username": f"tst_{suffix}", "password": "TestPass.1234"}
    r = requests.post(f"{API}/auth/signup", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"signup failed: {r.status_code} {r.text}"
    body = r.json()
    token = body.get("access_token")
    assert token, f"no token returned: {body}"
    return token, email


# --------- Profile picture / Settings bug ---------
class TestProfilePicturePersistence:
    def test_ceo_profile_persists_gamergrid_icon(self, ceo_headers):
        # CEO should currently have /gamergrid-icon.svg per the prompt
        r = requests.get(f"{API}/user/profile", headers=ceo_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Must NOT be /flixvault-icon.svg (the bad default)
        assert data.get("profile_picture_url") != "/flixvault-icon.svg", (
            f"CEO has bad flixvault default! got={data.get('profile_picture_url')}"
        )

    def test_put_profile_xbox_persists(self, ceo_headers):
        # Set xbox preset
        r = requests.put(
            f"{API}/user/profile",
            headers=ceo_headers,
            json={"profile_picture_url": "/xbox-icon.svg"},
            timeout=30,
        )
        assert r.status_code == 200, f"put failed: {r.status_code} {r.text}"
        body = r.json()
        # Endpoint returns {message, updated_fields}; persistence verified by GET
        assert "profile_picture_url" in body.get("updated_fields", [])

        # GET to verify persistence
        r2 = requests.get(f"{API}/user/profile", headers=ceo_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("profile_picture_url") == "/xbox-icon.svg", (
            f"profile picture did not persist! got={r2.json().get('profile_picture_url')}"
        )

    def test_put_profile_does_not_revert_to_default(self, ceo_headers):
        """Setting any preset must NOT silently revert to /flixvault-icon.svg."""
        for url in ("/playstation-icon.svg", "/switch-icon.svg", "/pc-steam-icon.svg"):
            r = requests.put(
                f"{API}/user/profile",
                headers=ceo_headers,
                json={"profile_picture_url": url},
                timeout=30,
            )
            assert r.status_code == 200
            r2 = requests.get(f"{API}/user/profile", headers=ceo_headers, timeout=30)
            assert r2.json().get("profile_picture_url") == url, (
                f"Reverted! sent={url} got={r2.json().get('profile_picture_url')}"
            )

    def test_restore_ceo_to_gamergrid(self, ceo_headers):
        # Cleanup: leave CEO on /gamergrid-icon.svg as the prompt expects
        r = requests.put(
            f"{API}/user/profile",
            headers=ceo_headers,
            json={"profile_picture_url": "/gamergrid-icon.svg"},
            timeout=30,
        )
        assert r.status_code == 200
        # Verify with GET
        r2 = requests.get(f"{API}/user/profile", headers=ceo_headers, timeout=30)
        assert r2.json().get("profile_picture_url") == "/gamergrid-icon.svg"


class TestNewUserDefault:
    def test_new_user_profile_picture_is_none(self, fresh_user_token):
        token, email = fresh_user_token
        h = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{API}/user/profile", headers=h, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get("profile_picture_url") in (None, ""), (
            f"new user should have null/empty profile_picture_url, got={data.get('profile_picture_url')}"
        )
        # Definitely should NOT be the old bad default
        assert data.get("profile_picture_url") != "/flixvault-icon.svg"


# --------- Preset SVGs accessible ---------
class TestPresetAvatarAssets:
    @pytest.mark.parametrize("path", [
        "/gamergrid-icon.svg",
        "/playstation-icon.svg",
        "/xbox-icon.svg",
        "/switch-icon.svg",
        "/pc-steam-icon.svg",
    ])
    def test_preset_svg_returns_200(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=20)
        assert r.status_code == 200, f"{path} returned {r.status_code}"
        ct = r.headers.get("content-type", "")
        assert "svg" in ct.lower() or "xml" in ct.lower(), f"{path} content-type={ct}"


# --------- GOTY endpoint ---------
class TestGOTY:
    def test_goty_default_year(self):
        r = requests.get(f"{API}/games/goty", timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "year" in data and "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) > 0, "GOTY should return at least one game"
        # Default year should be last completed year (2025 as of 2026)
        assert data["year"] in (2024, 2025), f"unexpected default year: {data['year']}"
        # Items must be normalized
        first = data["results"][0]
        for k in ("id", "title", "vote_average", "release_date"):
            assert k in first, f"missing key {k}: {first.keys()}"

    def test_goty_year_2024(self):
        r = requests.get(f"{API}/games/goty?year=2024", timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["year"] == 2024
        assert len(data["results"]) > 0
        # All returned items should be 2024 releases
        for g in data["results"][:5]:
            rd = (g.get("release_date") or "")
            assert rd.startswith("2024"), f"GOTY 2024 returned non-2024 game: {g.get('title')} -> {rd}"


# --------- Mongo TTL index ---------
class TestMongoTTL:
    def test_games_cache_has_ttl_index(self):
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        # Trigger cache so TTL is initialized (idempotent)
        requests.get(f"{API}/games/genres", timeout=30)

        async def _check():
            idx = await db["games_cache"].index_information()
            return idx
        idx = asyncio.get_event_loop().run_until_complete(_check())
        # Find the TTL on expires_at
        found = False
        for name, meta in idx.items():
            keys = meta.get("key", [])
            if any(k[0] == "expires_at" for k in keys):
                if meta.get("expireAfterSeconds") == 0:
                    found = True
                    break
        assert found, f"No TTL index on expires_at(expireAfterSeconds=0). Got: {idx}"


# --------- Regression: existing endpoints ---------
class TestRegression:
    @pytest.mark.parametrize("path", [
        "/games/trending",
        "/games/top-rated",
        "/games/upcoming",
        "/games/new-releases",
        "/games/platform/playstation",
        "/games/platform/xbox",
        "/games/platform/pc",
        "/games/platform/switch",
        "/games/genres",
        "/games/platforms",
    ])
    def test_endpoint_200(self, path):
        r = requests.get(f"{API}{path}", timeout=45)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
        body = r.json()
        # genres / platforms return list directly; others return dict with results
        if path in ("/games/genres", "/games/platforms"):
            assert isinstance(body, list) and len(body) > 0
        else:
            assert "results" in body and len(body["results"]) > 0, f"{path} has empty results"

    def test_search_zelda(self):
        r = requests.get(f"{API}/games/search?q=Zelda&limit=5", timeout=45)
        assert r.status_code == 200
        assert len(r.json()["results"]) > 0

    def test_witcher3_details_buy_links(self):
        r = requests.get(f"{API}/games/details/1942", timeout=45)
        assert r.status_code == 200
        data = r.json()
        assert data.get("id") == 1942
        bl = data.get("buy_links") or []
        assert len(bl) >= 6, f"witcher3 buy_links count={len(bl)}"
        kinds = {b.get("kind") for b in bl}
        # Should include several direct stores per iteration_7 context (8 expected)
        assert "amazon" in kinds
        assert any(k in kinds for k in ("steam", "gog", "epicgames", "official"))

    def test_videos_endpoint(self):
        r = requests.get(f"{API}/games/videos/1942", timeout=45)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
