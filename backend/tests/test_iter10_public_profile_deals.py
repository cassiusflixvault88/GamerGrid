"""Iteration 10 backend regression tests.

Covers:
  - Public profile route /api/users/{username}
  - CheapShark deals /api/games/deals (+ MongoDB cache)
  - Trending now exposes developer/publisher/developers[]/publishers[]
  - Consolidated /api/user/profile (only profile_router serves it)
  - Iter7-9 regressions remain green
"""

import os
import re
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
CEO_EMAIL = "cassiusflixvault@gmail.com"
CEO_PASS = "JGotti.8890"


# --------------------------------------------------------------- fixtures
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def ceo_token(s):
    r = s.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASS}, timeout=30)
    assert r.status_code == 200, f"CEO login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_h(ceo_token):
    return {"Authorization": f"Bearer {ceo_token}"}


@pytest.fixture(scope="session")
def mongo_db():
    cli = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=3000)
    return cli[os.environ["DB_NAME"]]


# --------------------------------------------------------------- public profile
class TestPublicProfile:
    def test_existing_user_jaycool(self, s, mongo_db):
        # ensure JayCool exists in DB
        u = mongo_db.users.find_one({"username": {"$regex": "^jaycool$", "$options": "i"}})
        if not u:
            pytest.skip("JayCool user not seeded in DB")
        r = s.get(f"{API}/users/JayCool", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("username", "display_name", "profile_picture_url", "library",
                  "library_count", "ratings", "ratings_count", "avg_rating", "created_at"):
            assert k in d, f"missing key {k}"
        # sensitive fields must NOT leak
        for forbidden in ("email", "phone", "address", "password", "hashed_password", "is_admin"):
            assert forbidden not in d, f"sensitive field leaked: {forbidden}"

    def test_case_insensitive(self, s, mongo_db):
        u = mongo_db.users.find_one({"username": {"$regex": "^jaycool$", "$options": "i"}})
        if not u:
            pytest.skip("JayCool user not seeded")
        r1 = s.get(f"{API}/users/jaycool", timeout=15)
        r2 = s.get(f"{API}/users/JAYCOOL", timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["username"].lower() == "jaycool"
        assert r2.json()["username"].lower() == "jaycool"

    def test_nonexistent_user_returns_404(self, s):
        r = s.get(f"{API}/users/nonexistent_xyz_zzz_404", timeout=15)
        assert r.status_code == 404


# --------------------------------------------------------------- CheapShark deals
class TestDeals:
    def test_witcher3_deals(self, s):
        r = s.get(f"{API}/games/deals", params={"title": "Witcher 3", "limit": 3}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "results" in d and "total" in d
        assert isinstance(d["results"], list)
        if not d["results"]:
            pytest.skip("CheapShark returned 0 results (network/upstream issue)")
        assert d["total"] >= 1
        first = d["results"][0]
        for k in ("title", "store_name", "sale_price", "normal_price",
                  "savings_pct", "is_on_sale", "deal_url", "thumb"):
            assert k in first, f"missing key {k}"
        assert first["deal_url"].startswith("https://www.cheapshark.com/redirect")

    def test_no_match_returns_empty(self, s):
        r = s.get(f"{API}/games/deals", params={"title": "doesnotexistXyz"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 0
        assert d["results"] == []

    def test_deals_cached_with_ttl(self, s, mongo_db):
        # warm the cache
        s.get(f"{API}/games/deals", params={"title": "Witcher 3", "limit": 3}, timeout=30)
        time.sleep(0.5)
        doc = mongo_db.games_cache.find_one({"_id": re.compile(r"^deals:")})
        assert doc is not None, "no deals:* cache entry found"
        assert "expires_at" in doc, "expires_at missing"
        # expires_at should be a real Date in mongo (datetime), not a string
        from datetime import datetime
        assert isinstance(doc["expires_at"], datetime), \
            f"expires_at should be Date, got {type(doc['expires_at'])}"


# --------------------------------------------------------------- developer/publisher on cards
class TestCardDevPub:
    def test_trending_has_dev_pub(self, s):
        r = s.get(f"{API}/games/trending", params={"limit": 5}, timeout=30)
        assert r.status_code == 200
        results = r.json().get("results", [])
        assert len(results) >= 1
        # at least one result should expose developer/publisher fields
        sample = results[0]
        for k in ("developer", "publisher", "developers", "publishers"):
            assert k in sample, f"missing {k} on trending result"
        assert isinstance(sample["developers"], list)
        assert isinstance(sample["publishers"], list)
        # at least one of the first 5 should have a non-null developer
        assert any(g.get("developer") for g in results), "no game in top-5 trending has a developer"


# --------------------------------------------------------------- consolidated /user/profile
class TestUserProfileConsolidation:
    def test_get_user_profile(self, s, auth_h):
        r = s.get(f"{API}/user/profile", headers=auth_h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # /user/profile returns the user's profile-settings shape (no email)
        assert d.get("display_name"), f"display_name missing: {d}"
        assert "profile_picture_url" in d

    def test_put_then_get_roundtrip(self, s, auth_h):
        # set xbox
        r = s.put(f"{API}/user/profile",
                  headers=auth_h,
                  json={"profile_picture_url": "/xbox-icon.svg"},
                  timeout=15)
        assert r.status_code == 200, r.text
        g = s.get(f"{API}/user/profile", headers=auth_h, timeout=15)
        assert g.status_code == 200
        assert g.json().get("profile_picture_url") == "/xbox-icon.svg"
        # restore
        r2 = s.put(f"{API}/user/profile",
                   headers=auth_h,
                   json={"profile_picture_url": "/gamergrid-icon.svg"},
                   timeout=15)
        assert r2.status_code == 200
        g2 = s.get(f"{API}/user/profile", headers=auth_h, timeout=15)
        assert g2.json().get("profile_picture_url") == "/gamergrid-icon.svg"

    def test_no_legacy_disabled_route(self, s, auth_h):
        # If the safety stub /user/profile_legacy_disabled exists it should
        # NOT respond to the canonical path.
        r = s.get(f"{API}/user/profile_legacy_disabled", headers=auth_h, timeout=10)
        assert r.status_code in (404, 410, 405), f"unexpected {r.status_code}"


# --------------------------------------------------------------- iter7-9 regressions
@pytest.mark.parametrize("path", [
    "/games/trending?limit=2",
    "/games/top-rated?limit=2",
    "/games/upcoming?limit=2",
    "/games/new-releases?limit=2",
    "/games/platform/playstation?limit=2",
    "/games/platform/xbox?limit=2",
    "/games/platform/pc?limit=2",
    "/games/platform/switch?limit=2",
    "/games/search?q=zelda&limit=2",
    "/games/genres",
    "/games/platforms",
    "/games/goty?limit=1",
])
def test_regression_endpoints(s, path):
    r = s.get(f"{API}{path}", timeout=30)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_game_details_and_videos(s):
    # use a stable popular IGDB id (GTA V == 1020 is common; fall back via search)
    sr = s.get(f"{API}/games/search", params={"q": "gta v", "limit": 1}, timeout=30).json()
    if not sr.get("results"):
        pytest.skip("search returned no results")
    gid = sr["results"][0]["id"]
    d = s.get(f"{API}/games/details/{gid}", timeout=30)
    v = s.get(f"{API}/games/videos/{gid}", timeout=30)
    assert d.status_code == 200
    assert v.status_code == 200
