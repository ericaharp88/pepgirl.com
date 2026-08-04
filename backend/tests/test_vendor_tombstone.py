"""Regression tests for vendor deletion tombstone + cascade to prices/promotions."""
import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"

TEST_VENDOR_NAME = "ZZ-Tombstone-Test"
TEST_VENDOR_SLUG = "zz-tombstone-test"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token: {r.json()}"
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _get_vendors():
    r = requests.get(f"{BASE_URL}/api/vendors", timeout=15)
    assert r.status_code == 200
    return r.json()


def _get_prices():
    r = requests.get(f"{BASE_URL}/api/prices", timeout=15)
    assert r.status_code == 200
    return r.json()


def _get_promotions():
    r = requests.get(f"{BASE_URL}/api/promotions", timeout=15)
    assert r.status_code == 200
    return r.json()


def _get_comparison():
    r = requests.get(f"{BASE_URL}/api/comparison", timeout=15)
    assert r.status_code == 200
    return r.json()


def _restart_backend():
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    for _ in range(30):
        time.sleep(1)
        try:
            r = requests.get(f"{BASE_URL}/api/vendors", timeout=5)
            if r.status_code == 200:
                time.sleep(2)  # allow seed to finish
                return
        except Exception:
            continue
    raise RuntimeError("Backend did not come back up")


def _cleanup_tombstone():
    """Remove test vendor tombstone from deleted_seeds directly via mongo."""
    import pymongo
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    # Read DB_NAME from backend/.env
    db_name = None
    try:
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("DB_NAME="):
                    db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except Exception:
        pass
    if not db_name:
        db_name = "test_database"
    client = pymongo.MongoClient(mongo_url)
    client[db_name].deleted_seeds.delete_many({"kind": "vendor", "slug": TEST_VENDOR_SLUG})
    client.close()


@pytest.fixture(scope="module", autouse=True)
def cleanup_before_and_after(auth_headers):
    # Pre-cleanup: remove any leftover test vendor + tombstone
    for v in _get_vendors():
        if v.get("slug") == TEST_VENDOR_SLUG:
            requests.delete(f"{BASE_URL}/api/vendors/{v['id']}", headers=auth_headers, timeout=15)
    _cleanup_tombstone()
    yield
    # Post-cleanup
    for v in _get_vendors():
        if v.get("slug") == TEST_VENDOR_SLUG:
            requests.delete(f"{BASE_URL}/api/vendors/{v['id']}", headers=auth_headers, timeout=15)
    _cleanup_tombstone()


# ---------- Test 1: Delete a test vendor persists across restart ----------
def test_delete_vendor_persists_after_restart(auth_headers):
    # Create test vendor
    payload = {"name": TEST_VENDOR_NAME, "slug": TEST_VENDOR_SLUG,
               "description": "Test vendor for tombstone regression.",
               "affiliate_url": "https://example.com",
               "logo_url": "", "rating": 4.0, "tags": ["Test"],
               "discount_code": "", "featured": False}
    r = requests.post(f"{BASE_URL}/api/vendors", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code in (200, 201), f"Create failed: {r.status_code} {r.text}"
    vid = r.json()["id"]

    # Verify present
    assert any(v["id"] == vid for v in _get_vendors())

    # Delete
    d = requests.delete(f"{BASE_URL}/api/vendors/{vid}", headers=auth_headers, timeout=15)
    assert d.status_code == 200, f"Delete failed: {d.status_code} {d.text}"

    # Verify absent
    assert not any(v["id"] == vid for v in _get_vendors())

    # Restart and verify absent
    _restart_backend()
    vendors_after = _get_vendors()
    assert not any(v.get("slug") == TEST_VENDOR_SLUG for v in vendors_after), \
        f"Test vendor resurrected after restart: {[v for v in vendors_after if v.get('slug') == TEST_VENDOR_SLUG]}"


# ---------- Test 2: Delete vendor cascades to prices & promotions ----------
def test_delete_vendor_cascades_to_prices_and_promotions(auth_headers):
    # Clean any leftover
    _cleanup_tombstone()
    for v in _get_vendors():
        if v.get("slug") == TEST_VENDOR_SLUG:
            requests.delete(f"{BASE_URL}/api/vendors/{v['id']}", headers=auth_headers, timeout=15)
            _cleanup_tombstone()

    # Fresh create
    payload = {"name": TEST_VENDOR_NAME, "slug": TEST_VENDOR_SLUG,
               "description": "Cascade test", "affiliate_url": "https://example.com",
               "logo_url": "", "rating": 4.0, "tags": ["Test"],
               "discount_code": "", "featured": False}
    r = requests.post(f"{BASE_URL}/api/vendors", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code in (200, 201)
    vid = r.json()["id"]

    # Get any existing peptide id
    peps = requests.get(f"{BASE_URL}/api/peptides", timeout=15).json()
    assert peps, "No peptides in DB"
    pep_id = peps[0]["id"]

    # Create a price for this vendor
    price_payload = {"peptide_id": pep_id, "vendor_id": vid, "size_mg": 10,
                     "price_usd": 99.99, "product_url": "https://example.com/p"}
    pr = requests.post(f"{BASE_URL}/api/prices", json=price_payload, headers=auth_headers, timeout=15)
    assert pr.status_code in (200, 201), f"Price create: {pr.status_code} {pr.text}"

    # Try to create promotion (endpoint may vary — attempt but don't fail hard if not supported)
    promo_created = False
    promo_payload = {"vendor_id": vid, "title": "Test Promo", "description": "test",
                     "code": "TEST10", "discount_percent": 10}
    pm = requests.post(f"{BASE_URL}/api/promotions", json=promo_payload, headers=auth_headers, timeout=15)
    if pm.status_code in (200, 201):
        promo_created = True

    # Verify price present
    prices_before = _get_prices()
    assert any(p.get("vendor_id") == vid for p in prices_before), "Price not visible before delete"

    # Delete vendor
    d = requests.delete(f"{BASE_URL}/api/vendors/{vid}", headers=auth_headers, timeout=15)
    assert d.status_code == 200

    # Verify prices for this vendor are gone
    prices_after = _get_prices()
    assert not any(p.get("vendor_id") == vid for p in prices_after), \
        "Prices for deleted vendor still present"

    # Verify promotions for this vendor are gone
    if promo_created:
        promos_after = _get_promotions()
        assert not any(p.get("vendor_id") == vid for p in promos_after), \
            "Promotions for deleted vendor still present"

    # Verify /api/comparison doesn't contain this vendor anywhere
    comp = _get_comparison()
    assert not any(v.get("id") == vid for v in comp.get("vendors", []))
    assert not any(p.get("vendor_id") == vid for p in comp.get("prices", []))
    assert not any(p.get("vendor_id") == vid for p in comp.get("promotions", []))


# ---------- Test 3: Real seeded vendors still present after restart ----------
def test_real_seeded_vendors_intact():
    vendors = _get_vendors()
    slugs = [v.get("slug") for v in vendors]
    # These are core seed vendors per prev iteration notes
    assert any("amino" in (s or "") for s in slugs), f"Amino Well USA missing. Slugs: {slugs}"
    assert any("felix" in (s or "") for s in slugs), f"Felix Chems missing. Slugs: {slugs}"
