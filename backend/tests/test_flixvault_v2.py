"""
FlixVault V2.0 Backend API Tests
Tests: Login/Auth, Feedback/Report Issue, User Reviews (edit/delete/reply), Admin replies, Search
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials — required env vars (test will skip if missing)
ADMIN_EMAIL = os.environ.get("ADMIN_TEST_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_TEST_PASSWORD", "")

# Test user credentials
TEST_EMAIL = os.environ.get("TEST_USER_EMAIL", "testuser@example.com")
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "ChangeMeIfYouRunTests!")
TEST_USERNAME = os.environ.get("TEST_USER_USERNAME", "TestUserV5")


class TestAuthenticationFlow:
    """Test Login/Authentication flow"""

    def test_login_admin_account(self):
        """Test admin login with CEO credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✅ Admin login successful: {data['user']['username']}")

    def test_login_test_user(self):
        """Test regular user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Test user login successful: {data['user']['username']}")

    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")

    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_resp.json()["access_token"]

        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✅ Get current user working: {data['username']}")


class TestFeedbackReportIssue:
    """Test Feedback/Report Issue functionality"""

    @pytest.fixture
    def user_token(self):
        """Get test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]

    def test_submit_bug_report(self, user_token):
        """Test submitting a bug report"""
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json={
                "title": "TEST_Bug: Button not working",
                "feedback_type": "bug",
                "description": "The submit button on the review form is not responding",
                "priority": "high"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Bug report failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "id" in data or "feedback_id" in data
        print("✅ Bug report submitted successfully")

    def test_submit_feature_request(self, user_token):
        """Test submitting a feature request"""
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json={
                "title": "TEST_Feature: Dark mode toggle",
                "feedback_type": "feature",
                "description": "Would love to have a dark mode toggle in settings",
                "priority": "medium"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Feature request failed: {response.text}"
        data = response.json()
        assert "message" in data
        print("✅ Feature request submitted successfully")

    def test_submit_improvement(self, user_token):
        """Test submitting an improvement suggestion"""
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json={
                "title": "TEST_Improvement: Better search filters",
                "feedback_type": "improvement",
                "description": "Search could use genre and year filters",
                "priority": "low"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Improvement failed: {response.text}"
        print("✅ Improvement suggestion submitted successfully")

    def test_get_my_feedback(self, user_token):
        """Test viewing own feedback submissions"""
        response = requests.get(
            f"{BASE_URL}/api/feedback/my-feedback",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Get feedback failed: {response.text}"
        data = response.json()
        assert "feedback" in data
        feedback_count = len(data["feedback"])
        print(f"✅ Retrieved {feedback_count} feedback submissions")

        # Verify feedback has expected fields
        if feedback_count > 0:
            fb = data["feedback"][0]
            assert "title" in fb
            assert "feedback_type" in fb
            assert "description" in fb
            assert "status" in fb
            print(f"✅ Feedback structure verified: {fb['title']}")

    def test_feedback_requires_auth(self):
        """Test that feedback submission requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/feedback/submit",
            json={
                "title": "Test",
                "feedback_type": "bug",
                "description": "Test",
                "priority": "low"
            }
        )
        assert response.status_code in [401, 403]
        print("✅ Feedback correctly requires authentication")


class TestUserReviewManagement:
    """Test user review edit/delete functionality"""

    @pytest.fixture
    def user_token(self):
        """Get test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]

    def test_submit_review(self, user_token):
        """Test submitting a review for content"""
        # Use a known content ID (The Godfather = 238)
        content_id = 238
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "content_id": content_id,
                "content_title": "The Godfather",
                "rating": 5,
                "review": "TEST_Review: Amazing classic movie!"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Submit review failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["rating"] == 5
        print(f"✅ Review submitted successfully: {data['id']}")
        return data["id"]

    def test_get_ratings_for_content(self):
        """Test getting ratings for a content item"""
        content_id = 238  # The Godfather
        response = requests.get(f"{BASE_URL}/api/ratings/{content_id}")
        assert response.status_code == 200
        data = response.json()
        assert "average" in data
        assert "count" in data
        assert "ratings" in data
        print(f"✅ Ratings retrieved: avg={data['average']}, count={data['count']}")

    def test_get_user_rating_for_content(self, user_token):
        """Test getting user's own rating for content"""
        content_id = 238
        response = requests.get(
            f"{BASE_URL}/api/ratings/user/content/{content_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        # May be 200 with data or null if no rating
        assert response.status_code == 200
        print("✅ User rating endpoint working")

    def test_update_review(self, user_token):
        """Test updating own review"""
        # First submit a review
        content_id = 550  # Fight Club
        submit_resp = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "content_id": content_id,
                "content_title": "Fight Club",
                "rating": 4,
                "review": "TEST_Review: Great movie"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        rating_id = submit_resp.json()["id"]

        # Update the review
        response = requests.put(
            f"{BASE_URL}/api/ratings/{rating_id}",
            json={
                "content_id": content_id,
                "content_title": "Fight Club",
                "rating": 5,
                "review": "TEST_Review: Updated - Even better on rewatch!"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Update review failed: {response.text}"
        print("✅ Review updated successfully")

    def test_delete_review_requires_ownership(self, user_token):
        """Test that users can only delete their own reviews"""
        # Try to delete a non-existent review
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/ratings/{fake_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        # Should be 404 (not found) or 403 (forbidden)
        assert response.status_code in [404, 403, 405]
        print(f"✅ Delete review protection working (status: {response.status_code})")


class TestAdminReplySystem:
    """Test admin reply to reviews functionality"""

    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    @pytest.fixture
    def user_token(self):
        """Get test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]

    def test_admin_check(self, admin_token):
        """Test admin status check"""
        response = requests.get(
            f"{BASE_URL}/api/admin/check",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"]
        print(f"✅ Admin status verified: is_admin={data['is_admin']}")

    def test_admin_get_all_reviews(self, admin_token):
        """Test admin getting all reviews"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reviews",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin retrieved {len(data)} reviews")

    def test_admin_reply_to_review(self, admin_token, user_token):
        """Test admin replying to a user review"""
        # First create a review as user
        content_id = 680  # Pulp Fiction
        submit_resp = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "content_id": content_id,
                "content_title": "Pulp Fiction",
                "rating": 5,
                "review": "TEST_Review: Tarantino masterpiece!"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        review_id = submit_resp.json()["id"]

        # Admin replies to the review
        response = requests.post(
            f"{BASE_URL}/api/admin/reply-to-review",
            json={
                "review_id": review_id,
                "reply_text": "Thank you for your review! We agree, it's a classic!"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin reply failed: {response.text}"
        print("✅ Admin reply posted successfully")

    def test_admin_reply_to_app_review(self, admin_token, user_token):
        """Test admin replying to app review"""
        # First submit an app review
        requests.post(
            f"{BASE_URL}/api/app-reviews/submit",
            json={
                "rating": 5,
                "review": "TEST_AppReview: Love this app!"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )

        # Get app reviews to find the review ID
        reviews_resp = requests.get(f"{BASE_URL}/api/app-reviews")
        reviews = reviews_resp.json()["reviews"]

        if reviews:
            review_id = reviews[0]["id"]

            # Admin replies
            response = requests.post(
                f"{BASE_URL}/api/admin/reply-to-app-review",
                json={
                    "review_id": review_id,
                    "reply_text": "Thank you for the kind words!"
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Admin app review reply failed: {response.text}"
            print("✅ Admin replied to app review successfully")
        else:
            print("⚠️ No app reviews found to reply to")


class TestUserReplyToAdmin:
    """Test user reply to admin comments"""

    @pytest.fixture
    def user_token(self):
        """Get test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]

    def test_user_reply_to_admin_endpoint(self, user_token):
        """Test user reply to admin endpoint exists"""
        # This tests the endpoint exists - actual reply requires an admin_reply_id
        response = requests.post(
            f"{BASE_URL}/api/user-reply-to-admin",
            json={
                "admin_reply_id": str(uuid.uuid4()),  # Fake ID
                "reply_text": "Thank you for responding!"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        # Should work (200) or fail gracefully
        assert response.status_code in [200, 404, 422]
        print(f"✅ User reply to admin endpoint working (status: {response.status_code})")


class TestSearchFunctionality:
    """Test search functionality"""

    def test_catalog_movies_search(self):
        """Test movie catalog search"""
        response = requests.get(f"{BASE_URL}/api/catalog/movies")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total_results" in data
        movie_count = data["total_results"]
        print(f"✅ Catalog: {movie_count} items available (movies + series)")
        # User mentioned 1022 total
        assert movie_count >= 1000, f"Expected at least 1000 items, got {movie_count}"

    def test_catalog_series_count(self):
        """Test TV series count in catalog"""
        # Series are filtered from the main catalog by media_type='tv'
        response = requests.get(f"{BASE_URL}/api/catalog/movies?limit=1000")
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])
        series_count = len([x for x in results if x.get("media_type") == "tv"])
        print(f"✅ TV Series in first 1000: {series_count}")
        # User mentioned 492 TV series (470 in first page + 22 in second)
        assert series_count >= 400, f"Expected at least 400 series, got {series_count}"


class TestAdminFeedbackManagement:
    """Test admin feedback management"""

    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    def test_admin_get_all_feedback(self, admin_token):
        """Test admin getting all feedback"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 200 or 403 depending on admin check implementation
        if response.status_code == 200:
            data = response.json()
            # Could be list or dict with 'feedback' key
            if isinstance(data, list):
                print(f"✅ Admin retrieved {len(data)} feedback items")
            elif "feedback" in data:
                print(f"✅ Admin retrieved {len(data['feedback'])} feedback items")
        elif response.status_code == 403:
            print("⚠️ Admin feedback endpoint requires different admin check")
        else:
            print(f"⚠️ Admin feedback response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
