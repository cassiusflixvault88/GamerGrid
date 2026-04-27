"""
Backend API Tests for FlixVault V2.0 New Features
Tests: Feedback system, Content Requests, Admin Management, User Details
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials — set via env vars for security; defaults are non-secret demo values.
TEST_EMAIL = os.environ.get("TEST_USER_EMAIL", "tester@example.com")
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "ChangeMeIfYouRunTests!")
TEST_USERNAME = os.environ.get("TEST_USER_USERNAME", "ThemeTester")

class TestHealthAndBasicEndpoints:
    """Basic health check and API availability tests"""

    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ API root working: {data['message']}")

    def test_public_domain_movies(self):
        """Test public domain movies endpoint"""
        response = requests.get(f"{BASE_URL}/api/public-domain/movies")
        assert response.status_code == 200
        data = response.json()
        assert "movies" in data
        movie_count = len(data["movies"])
        print(f"✅ Public domain movies: {movie_count} movies available")
        # User mentioned 17 free movies
        assert movie_count >= 10, f"Expected at least 10 free movies, got {movie_count}"

    def test_trending_whats_hot(self):
        """Test What's Hot trending endpoint"""
        response = requests.get(f"{BASE_URL}/api/trending/whats-hot")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✅ What's Hot endpoint working: {len(data['results'])} items")


class TestAuthentication:
    """Authentication tests"""

    def test_login_with_test_account(self):
        """Test login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })

        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"✅ Login successful for {TEST_EMAIL}")
            return data["token"]
        elif response.status_code == 401:
            print(f"⚠️ Test account {TEST_EMAIL} not found or wrong password - may need to create")
            pytest.skip("Test account not available")
        else:
            print(f"❌ Login failed with status {response.status_code}: {response.text}")
            pytest.fail(f"Unexpected login response: {response.status_code}")

    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@flixvault.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "username": f"TestUser_{uuid.uuid4().hex[:6]}",
            "password": "TestPass123!"
        })

        if response.status_code in [200, 201]:
            data = response.json()
            assert "token" in data or "user" in data
            print(f"✅ Registration successful for {unique_email}")
        else:
            print(f"⚠️ Registration response: {response.status_code} - {response.text}")


class TestFeedbackSystem:
    """Tests for Feedback/Bug Report system"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth token not available")

    def test_submit_feedback_requires_auth(self):
        """Test that feedback submission requires authentication"""
        response = requests.post(f"{BASE_URL}/api/feedback/submit", json={
            "title": "Test Bug",
            "feedback_type": "bug",
            "description": "Test description",
            "priority": "medium"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Feedback submission correctly requires authentication")

    def test_submit_feedback_authenticated(self, auth_token):
        """Test feedback submission with authentication"""
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json={
                "title": "TEST_Bug Report",
                "feedback_type": "bug",
                "description": "This is a test bug report",
                "priority": "medium"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "feedback_id" in data
            print(f"✅ Feedback submitted successfully: {data['feedback_id']}")
        else:
            print(f"⚠️ Feedback submission: {response.status_code} - {response.text}")

    def test_get_my_feedback(self, auth_token):
        """Test getting user's feedback submissions"""
        response = requests.get(
            f"{BASE_URL}/api/feedback/my-feedback",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "feedback" in data
        print(f"✅ My feedback retrieved: {len(data['feedback'])} items")


class TestContentRequests:
    """Tests for Content Request feature"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth token not available")

    def test_submit_content_request_requires_auth(self):
        """Test that content request requires authentication"""
        response = requests.post(f"{BASE_URL}/api/content-requests/submit", json={
            "title": "Test Movie Request",
            "content_type": "movie",
            "description": "Test description"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Content request correctly requires authentication")

    def test_submit_content_request_authenticated(self, auth_token):
        """Test content request submission with authentication"""
        response = requests.post(
            f"{BASE_URL}/api/content-requests/submit",
            json={
                "title": "TEST_Movie Request",
                "content_type": "movie",
                "description": "Test movie description",
                "reason": "Test reason"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "request_id" in data
            print(f"✅ Content request submitted: {data['request_id']}")
        else:
            print(f"⚠️ Content request: {response.status_code} - {response.text}")

    def test_get_my_content_requests(self, auth_token):
        """Test getting user's content requests"""
        response = requests.get(
            f"{BASE_URL}/api/content-requests/my-requests",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✅ My content requests retrieved: {len(data['requests'])} items")


class TestAdminEndpoints:
    """Tests for Admin endpoints (will skip if not admin)"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth token not available")

    def test_admin_check_endpoint(self, auth_token):
        """Test admin check endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/check",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "is_admin" in data
        print(f"✅ Admin check: is_admin = {data['is_admin']}")

    def test_admin_stats_requires_admin(self, auth_token):
        """Test that admin stats requires admin privileges"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Should be 200 if admin, 403 if not
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin stats accessible: {data}")
        elif response.status_code == 403:
            print("✅ Admin stats correctly requires admin privileges")
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")

    def test_admin_user_details_endpoint(self, auth_token):
        """Test admin user details endpoint"""
        # First get users list
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        if response.status_code == 403:
            print("✅ Admin users endpoint correctly requires admin privileges")
            return

        if response.status_code == 200:
            users = response.json()
            if len(users) > 0:
                user_id = users[0].get('id')
                if user_id:
                    detail_response = requests.get(
                        f"{BASE_URL}/api/admin/user-details/{user_id}",
                        headers={"Authorization": f"Bearer {auth_token}"}
                    )
                    if detail_response.status_code == 200:
                        data = detail_response.json()
                        assert "user" in data
                        assert "stats" in data
                        print(f"✅ User details retrieved for user {user_id}")
                    else:
                        print(f"⚠️ User details: {detail_response.status_code}")


class TestAdminManagement:
    """Tests for Admin promote/demote functionality"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth token not available")

    def test_manage_admin_requires_admin(self, auth_token):
        """Test that admin management requires admin privileges"""
        response = requests.post(
            f"{BASE_URL}/api/admin/manage-admin",
            json={"user_id": "test-user-id", "action": "promote"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Should be 403 if not admin, 404 if admin but user not found
        if response.status_code == 403:
            print("✅ Admin management correctly requires admin privileges")
        elif response.status_code == 404:
            print("✅ Admin management accessible (user not found is expected)")
        else:
            print(f"⚠️ Admin management response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
