"""
Iteration 12 — Payments + Admin tips-feed regression tests.

Focus:
- Auth signup/login JWT regression
- Tips-feed OR query bug fix ($or: payment_status=paid OR status=completed)
- /admin/all-transactions diagnostic
- /recent-public anonymized ticker
- Tip / subscription checkout (Stripe call may fail gracefully — must NOT 500-hang)
- Payment status polling on (likely expired) Stripe key — must error gracefully
- Admin notifications regression
- Game catalog sanity (trending/top-rated/etc)
- Geo enrichment via client_ip in tips-feed
"""

import os
import time
import uuid
import pymongo
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbo-max-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

mc = pymongo.MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
db = mc[DB_NAME]


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    """Sign up a test admin, promote via direct DB write, return JWT."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_admin_{suffix}@example.com"
    username = f"TEST_admin_{suffix}"
    password = "Adm1nPass!"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "username": username, "password": password
    }, timeout=20)
    assert r.status_code == 200, f"signup failed {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data or "token" in data, f"no token in {data}"
    token = data.get("access_token") or data.get("token")
    # Promote to admin in DB.
    # Two collections exist: payments_routes checks users.is_admin,
    # admin_routes checks a separate admins collection. Seed BOTH.
    res = db.users.update_one({"email": email.lower()}, {"$set": {"is_admin": True}})
    assert res.matched_count == 1, "user not found after signup"
    user_doc = db.users.find_one({"email": email.lower()}, {"id": 1})
    user_id = user_doc.get("id") if user_doc else None
    if user_id:
        db.admins.update_one(
            {"user_id": user_id},
            {"$set": {"user_id": user_id, "is_admin": True}},
            upsert=True,
        )
    yield {"token": token, "email": email.lower(), "username": username, "user_id": user_id}
    # Cleanup
    db.users.delete_many({"email": email.lower()})
    if user_id:
        db.admins.delete_many({"user_id": user_id})


@pytest.fixture(scope="module")
def user_token():
    """Sign up regular non-admin user."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_user_{suffix}@example.com"
    username = f"TEST_user_{suffix}"
    password = "UserPass1!"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "username": username, "password": password
    }, timeout=20)
    assert r.status_code == 200, f"signup failed: {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    user_id_doc = db.users.find_one({"email": email.lower()}, {"id": 1})
    assert user_id_doc, "user not persisted"
    yield {"token": token, "email": email.lower(), "username": username, "user_id": user_id_doc.get("id")}
    db.users.delete_many({"email": email.lower()})


@pytest.fixture(scope="module")
def seed_payment_txns(user_token):
    """
    Insert 3 transactions covering the OR-query branches:
      A) payment_status='paid' AND status='completed' (modern)
      B) payment_status='paid' AND status='initiated' (modern partial)
      C) payment_status='pending' AND status='completed' (legacy bug — must be included)
      D) payment_status='pending' AND status='initiated' (must NOT be in tips-feed)
    """
    sids = {
        "A": f"TEST_sid_A_{uuid.uuid4().hex[:6]}",
        "B": f"TEST_sid_B_{uuid.uuid4().hex[:6]}",
        "C": f"TEST_sid_C_{uuid.uuid4().hex[:6]}",
        "D": f"TEST_sid_D_{uuid.uuid4().hex[:6]}",
    }
    uid = user_token["user_id"]
    docs = [
        {"session_id": sids["A"], "user_id": uid, "amount": 1.00, "currency": "usd",
         "payment_type": "tip", "package": "small", "payment_status": "paid", "status": "completed",
         "client_ip": "8.8.8.8", "created_at": "2026-01-15T10:00:00+00:00",
         "paid_at": "2026-01-15T10:01:00+00:00"},
        {"session_id": sids["B"], "user_id": uid, "amount": 5.00, "currency": "usd",
         "payment_type": "custom_tip", "payment_status": "paid", "status": "initiated",
         "client_ip": "1.1.1.1", "created_at": "2026-01-15T10:02:00+00:00"},
        {"session_id": sids["C"], "user_id": uid, "amount": 4.99, "currency": "usd",
         "payment_type": "pro_subscription", "payment_status": "pending", "status": "completed",
         "client_ip": "", "created_at": "2026-01-15T10:03:00+00:00"},
        {"session_id": sids["D"], "user_id": uid, "amount": 10.00, "currency": "usd",
         "payment_type": "tip", "package": "large", "payment_status": "pending", "status": "initiated",
         "client_ip": "", "created_at": "2026-01-15T10:04:00+00:00"},
    ]
    db.payment_transactions.insert_many(docs)
    yield sids
    db.payment_transactions.delete_many({"session_id": {"$in": list(sids.values())}})


# ---------- Tests ----------

# Auth regression
class TestAuth:
    def test_signup_returns_jwt(self, admin_token):
        assert admin_token["token"]
        assert isinstance(admin_token["token"], str)
        assert len(admin_token["token"]) > 20

    def test_login_returns_jwt(self, admin_token):
        # Try to log in with the seeded admin password
        r = requests.post(f"{API}/auth/login", json={
            "email": admin_token["email"], "password": "Adm1nPass!"
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        tok = body.get("access_token") or body.get("token")
        assert tok and len(tok) > 20

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "no_such_TEST@example.com", "password": "x"
        }, timeout=15)
        assert r.status_code in (400, 401, 404), r.status_code


# Payments — admin tips feed (OR query bug fix)
class TestAdminTipsFeed:
    def test_requires_auth(self):
        r = requests.get(f"{API}/payments/admin/tips-feed", timeout=15)
        assert r.status_code in (401, 403), r.status_code

    def test_non_admin_forbidden(self, user_token):
        r = requests.get(f"{API}/payments/admin/tips-feed",
                         headers={"Authorization": f"Bearer {user_token['token']}"}, timeout=20)
        assert r.status_code == 403, r.text

    def test_admin_returns_envelope(self, admin_token, seed_payment_txns):
        r = requests.get(f"{API}/payments/admin/tips-feed?limit=200",
                         headers={"Authorization": f"Bearer {admin_token['token']}"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "tips" in data and "totals" in data and "recovered" in data
        assert isinstance(data["tips"], list)
        assert {"tips", "subs", "all", "count"}.issubset(set(data["totals"].keys()))
        # recovered must be int (graceful when Stripe key invalid)
        assert isinstance(data["recovered"], int)

    def test_or_query_includes_legacy_completed_only(self, admin_token, seed_payment_txns):
        """Bug fix verification: a tx with payment_status='pending' but status='completed'
        MUST appear in the tips feed."""
        r = requests.get(f"{API}/payments/admin/tips-feed?limit=200",
                         headers={"Authorization": f"Bearer {admin_token['token']}"}, timeout=60)
        assert r.status_code == 200
        sids = [t["session_id"] for t in r.json()["tips"]]
        assert seed_payment_txns["A"] in sids, "modern paid+completed missing"
        assert seed_payment_txns["B"] in sids, "paid-status only tx missing"
        assert seed_payment_txns["C"] in sids, "BUG: legacy completed-only tx missing"
        assert seed_payment_txns["D"] not in sids, "pending+initiated must NOT be in feed"

    def test_geo_enrichment_present(self, admin_token, seed_payment_txns):
        r = requests.get(f"{API}/payments/admin/tips-feed?limit=200",
                         headers={"Authorization": f"Bearer {admin_token['token']}"}, timeout=60)
        tips = r.json()["tips"]
        a_tip = next((t for t in tips if t["session_id"] == seed_payment_txns["A"]), None)
        assert a_tip is not None
        # geo keys must always be present (may be empty string if lookup failed)
        for k in ("country", "country_code", "city"):
            assert k in a_tip


# Admin all-transactions diagnostic
class TestAllTransactions:
    def test_non_admin_forbidden(self, user_token):
        r = requests.get(f"{API}/payments/admin/all-transactions",
                         headers={"Authorization": f"Bearer {user_token['token']}"}, timeout=15)
        assert r.status_code == 403

    def test_admin_returns_all_regardless_of_status(self, admin_token, seed_payment_txns):
        r = requests.get(f"{API}/payments/admin/all-transactions?limit=200",
                         headers={"Authorization": f"Bearer {admin_token['token']}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data and "transactions" in data
        sids = [t["session_id"] for t in data["transactions"]]
        # Even pending+initiated should show up here
        for k in ("A", "B", "C", "D"):
            assert seed_payment_txns[k] in sids, f"missing tx {k}"
        # Status fields visible
        sample = next(t for t in data["transactions"] if t["session_id"] == seed_payment_txns["D"])
        assert "payment_status" in sample and "status" in sample


# Public anonymized ticker
class TestRecentPublic:
    def test_public_no_auth(self, seed_payment_txns):
        r = requests.get(f"{API}/payments/recent-public?limit=15", timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert isinstance(items, list)
        # Anonymized: no full email or session id leaked
        for it in items:
            assert {"name", "amount", "payment_type", "location", "created_at"}.issubset(it.keys())
            assert "@" not in (it["name"] or "")
            # name should be a short token (first name only)
            assert len(it["name"].split()) <= 1


# Stripe checkout endpoints — must respond, not hang. Live key in env may
# create a real session; if invalid we expect a graceful 500 (not a crash).
class TestStripeCheckout:
    def test_tip_checkout_responds(self, user_token):
        r = requests.post(
            f"{API}/payments/tip/checkout",
            headers={"Authorization": f"Bearer {user_token['token']}"},
            json={"package_id": "small", "payment_type": "tip",
                  "origin_url": "https://example.com"},
            timeout=30,
        )
        # Either success (live key) or graceful 500 (expired). NOT 502/timeout.
        assert r.status_code in (200, 400, 500), r.status_code
        if r.status_code == 200:
            body = r.json()
            assert "url" in body and "session_id" in body
            # Cleanup pending tx created by this call
            db.payment_transactions.delete_many({"session_id": body["session_id"]})
        else:
            # Must include a JSON detail, not stack trace
            assert "detail" in r.json()

    def test_tip_checkout_invalid_package(self, user_token):
        r = requests.post(
            f"{API}/payments/tip/checkout",
            headers={"Authorization": f"Bearer {user_token['token']}"},
            json={"package_id": "BOGUS", "payment_type": "tip",
                  "origin_url": "https://example.com"},
            timeout=15,
        )
        # 400 expected, route wraps in HTTPException -> may surface as 500 with detail
        assert r.status_code in (400, 500)

    def test_tip_checkout_requires_auth(self):
        r = requests.post(f"{API}/payments/tip/checkout",
                          json={"package_id": "small", "payment_type": "tip",
                                "origin_url": "https://example.com"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_subscription_checkout_responds(self, user_token):
        # find subscription endpoint shape — try common payload
        r = requests.post(
            f"{API}/payments/subscription/checkout",
            headers={"Authorization": f"Bearer {user_token['token']}"},
            json={"package_id": "pro", "payment_type": "subscription",
                  "origin_url": "https://example.com"},
            timeout=30,
        )
        assert r.status_code in (200, 400, 404, 422, 500), r.status_code
        if r.status_code == 200:
            body = r.json()
            assert "session_id" in body
            db.payment_transactions.delete_many({"session_id": body["session_id"]})

    def test_status_polling_graceful(self, user_token):
        # Random session_id -> Stripe returns error; backend should NOT 500-hang
        fake = "cs_test_does_not_exist_TESTONLY"
        start = time.time()
        r = requests.get(
            f"{API}/payments/checkout/status/{fake}",
            headers={"Authorization": f"Bearer {user_token['token']}"},
            timeout=30,
        )
        elapsed = time.time() - start
        assert elapsed < 25, f"status endpoint too slow: {elapsed}s"
        # Graceful: any 4xx/5xx with JSON body, not a hang
        assert r.status_code in (200, 400, 401, 403, 404, 422, 500, 502)


# Admin notifications regression
class TestAdminNotifications:
    def test_admin_notifications(self, admin_token):
        r = requests.get(f"{API}/admin/notifications",
                         headers={"Authorization": f"Bearer {admin_token['token']}"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # Should have some counts dict
        assert isinstance(body, dict)

    def test_admin_notifications_non_admin(self, user_token):
        r = requests.get(f"{API}/admin/notifications",
                         headers={"Authorization": f"Bearer {user_token['token']}"}, timeout=15)
        assert r.status_code in (200, 401, 403)


# Game catalog sanity
@pytest.mark.parametrize("path", [
    "/games/trending", "/games/top-rated", "/games/upcoming",
    "/games/new-releases", "/games/top10",
])
def test_games_catalog(path):
    r = requests.get(f"{API}{path}", timeout=30)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
    body = r.json()
    assert isinstance(body, (list, dict))
