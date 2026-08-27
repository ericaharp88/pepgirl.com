"""Tests for /api/reviews endpoints (public + admin CRUD)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://peptide-dosing-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    # Try common auth endpoints
    for path in ["/admin/login", "/auth/login", "/login"]:
        r = requests.post(f"{API}{path}", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            data = r.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
    pytest.skip("Could not obtain admin token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def test_public_list_reviews_returns_seeded():
    r = requests.get(f"{API}/reviews")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 4, f"expected >=4 seeded reviews, got {len(data)}"
    sample = data[0]
    for field in ["author", "quote", "rating", "location"]:
        assert field in sample, f"missing field {field}"
    # no _id leak
    assert "_id" not in sample


def test_reviews_all_requires_auth():
    r = requests.get(f"{API}/reviews/all")
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


def test_create_requires_auth():
    r = requests.post(f"{API}/reviews", json={"author": "X", "quote": "Y"})
    assert r.status_code in (401, 403)


def test_update_requires_auth():
    r = requests.put(f"{API}/reviews/some-id", json={"author": "X", "quote": "Y"})
    assert r.status_code in (401, 403)


def test_delete_requires_auth():
    r = requests.delete(f"{API}/reviews/some-id")
    assert r.status_code in (401, 403)


def test_admin_crud_review(auth_headers):
    # CREATE
    payload = {"author": "TEST_Sara", "quote": "TEST review quote", "rating": 5, "location": "TEST"}
    r = requests.post(f"{API}/reviews", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["author"] == "TEST_Sara"
    assert created["quote"] == "TEST review quote"
    assert created["rating"] == 5
    rid = created["id"]

    # verify in admin list
    r = requests.get(f"{API}/reviews/all", headers=auth_headers)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert rid in ids

    # UPDATE
    upd = {"author": "TEST_Sara", "quote": "updated quote", "rating": 4, "location": "TEST"}
    r = requests.put(f"{API}/reviews/{rid}", json=upd, headers=auth_headers)
    assert r.status_code == 200, r.text
    fetched = r.json()
    assert fetched["quote"] == "updated quote"
    assert fetched["rating"] == 4

    # DELETE
    r = requests.delete(f"{API}/reviews/{rid}", headers=auth_headers)
    assert r.status_code in (200, 204)

    # verify gone
    r = requests.get(f"{API}/reviews/all", headers=auth_headers)
    ids = [x["id"] for x in r.json()]
    assert rid not in ids
