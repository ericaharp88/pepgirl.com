"""Backend API tests for Peptide Hub."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://peptide-hub-37.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def auth(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["role"] == "admin"
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return data


# --- Health ---
def test_health(s):
    r = s.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Auth ---
def test_login_invalid(s):
    r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "bad"}, timeout=10)
    assert r.status_code == 401


def test_me_requires_auth():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_me_with_auth(s, auth):
    r = s.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# --- Vendors ---
def test_list_vendors_public(s):
    r = requests.get(f"{API}/vendors", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 4
    slugs = {v["slug"] for v in data}
    assert {"peptide-sciences", "pure-peptides-usa", "amino-asylum", "limitless-life"}.issubset(slugs)


def test_create_vendor_unauthenticated():
    r = requests.post(f"{API}/vendors", json={"name": "X", "slug": "x", "affiliate_url": "http://x.com"}, timeout=10)
    assert r.status_code in (401, 403)


def test_vendor_crud(s, auth):
    payload = {"name": "TEST_Vendor", "slug": "test-vendor-x", "affiliate_url": "https://test.example.com",
               "description": "test", "rating": 4.0, "tags": ["test"]}
    r = s.post(f"{API}/vendors", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    vid = r.json()["id"]
    # Verify persistence
    r2 = s.get(f"{API}/vendors", timeout=10)
    assert any(v["id"] == vid for v in r2.json())
    # Delete
    r3 = s.delete(f"{API}/vendors/{vid}", timeout=10)
    assert r3.status_code == 200


# --- Peptides ---
def test_list_peptides(s):
    r = requests.get(f"{API}/peptides", timeout=10)
    assert r.status_code == 200
    assert len(r.json()) >= 6


def test_peptide_crud(s, auth):
    p = {"name": "TEST_Pep", "slug": "test-pep-z", "typical_dose_mcg": 100, "category": "Test"}
    r = s.post(f"{API}/peptides", json=p, timeout=10)
    assert r.status_code == 200
    pid = r.json()["id"]
    r = s.delete(f"{API}/peptides/{pid}", timeout=10)
    assert r.status_code == 200


# --- Prices / Comparison ---
def test_list_prices(s):
    r = requests.get(f"{API}/prices", timeout=10)
    assert r.status_code == 200
    assert len(r.json()) >= 24


def test_comparison(s):
    r = requests.get(f"{API}/comparison", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert "peptides" in d and "vendors" in d and "prices" in d
    assert len(d["peptides"]) >= 6 and len(d["vendors"]) >= 4 and len(d["prices"]) >= 24


def test_price_crud(s, auth):
    vendors = requests.get(f"{API}/vendors").json()
    peptides = requests.get(f"{API}/peptides").json()
    pe = {"peptide_id": peptides[0]["id"], "vendor_id": vendors[0]["id"],
          "size_mg": 5, "price_usd": 99.99, "product_url": "", "scrape_selector": ""}
    r = s.post(f"{API}/prices", json=pe, timeout=10)
    assert r.status_code == 200
    pid = r.json()["id"]
    assert r.json()["price_usd"] == 99.99
    r = s.delete(f"{API}/prices/{pid}", timeout=10)
    assert r.status_code == 200


# --- Scrape all (sample data has no URLs => all skipped) ---
def test_scrape_all_skipped(s, auth):
    r = s.post(f"{API}/prices/scrape-all", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["skipped"] >= 24
    assert d["ok"] == 0


# --- Resources ---
def test_list_resources(s):
    r = requests.get(f"{API}/resources", timeout=10)
    assert r.status_code == 200
    assert len(r.json()) >= 4


def test_resource_crud(s, auth):
    payload = {"title": "TEST_Resource", "category": "Guide", "summary": "s", "content": "c"}
    r = s.post(f"{API}/resources", json=payload, timeout=10)
    assert r.status_code == 200
    rid = r.json()["id"]
    r = s.delete(f"{API}/resources/{rid}", timeout=10)
    assert r.status_code == 200
