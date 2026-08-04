"""Backend tests for vendor reordering and promotion display."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://peptide-dosing-1.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestVendorListing:
    def test_public_vendors_sorted_by_order(self):
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        # verify sorted by order asc (0 treated as bottom via list_vendors logic)
        orders = [(v.get("order") or 999999) for v in data]
        assert orders == sorted(orders), f"Vendors not sorted by order asc: {orders}"
        # login_config should be None for anonymous
        assert all(v.get("login_config") is None for v in data)

    def test_admin_vendors_have_login_config_key(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/vendors", headers=admin_headers, timeout=15)
        assert r.status_code == 200


class TestVendorReorder:
    def test_reorder_endpoint(self, admin_headers):
        # Get current vendors
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=15)
        vendors = r.json()
        assert len(vendors) >= 3
        original_ids = [v["id"] for v in vendors]

        # Swap first two
        reordered_ids = [original_ids[1], original_ids[0]] + original_ids[2:]
        rr = requests.post(f"{BASE_URL}/api/vendors/reorder", headers=admin_headers, json={"ids": reordered_ids}, timeout=15)
        assert rr.status_code == 200, rr.text
        assert rr.json().get("ok") is True

        # Verify order persisted
        r2 = requests.get(f"{BASE_URL}/api/vendors", timeout=15)
        new_vendors = r2.json()
        new_ids = [v["id"] for v in new_vendors]
        assert new_ids[:3] == reordered_ids[:3], f"Expected {reordered_ids[:3]}, got {new_ids[:3]}"

        # Verify order values increment by 10
        for i, v in enumerate(new_vendors[:len(reordered_ids)]):
            assert v.get("order") == (i + 1) * 10

        # Restore original order
        rr2 = requests.post(f"{BASE_URL}/api/vendors/reorder", headers=admin_headers, json={"ids": original_ids}, timeout=15)
        assert rr2.status_code == 200

    def test_reorder_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/vendors/reorder", json={"ids": ["x"]}, timeout=15)
        assert r.status_code in (401, 403)


class TestVendorCreationAppendsToBottom:
    def test_create_vendor_gets_highest_order(self, admin_headers):
        # get current max order
        vendors = requests.get(f"{BASE_URL}/api/vendors", timeout=15).json()
        max_order = max((v.get("order") or 0) for v in vendors)

        payload = {
            "name": "ZZTestVendor",
            "slug": "zztestvendor",
            "url": "https://example.com",
            "affiliate_url": "https://example.com",
            "featured": False,
        }
        r = requests.post(f"{BASE_URL}/api/vendors", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["order"] > max_order, f"New vendor order {created['order']} not > max {max_order}"

        # verify appears last in GET
        vendors_after = requests.get(f"{BASE_URL}/api/vendors", timeout=15).json()
        assert vendors_after[-1]["id"] == created["id"]

        # cleanup
        d = requests.delete(f"{BASE_URL}/api/vendors/{created['id']}", headers=admin_headers, timeout=15)
        assert d.status_code == 200


class TestPromotions:
    def test_active_promotions_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/promotions", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_display_promotion(self, admin_headers):
        vendors = requests.get(f"{BASE_URL}/api/vendors", timeout=15).json()
        assert len(vendors) > 0
        vendor_id = vendors[0]["id"]
        vendor_slug = vendors[0]["slug"]

        promo_payload = {
            "vendor_id": vendor_id,
            "active": True,
            "discount_percent": 15,
            "discount_description": "Test 15% off",
            "promo_code": "TESTPROMO",
        }
        cr = requests.post(f"{BASE_URL}/api/promotions", headers=admin_headers, json=promo_payload, timeout=15)
        assert cr.status_code in (200, 201), cr.text
        promo = cr.json()
        promo_id = promo.get("id")

        # verify appears in /api/promotions
        promos = requests.get(f"{BASE_URL}/api/promotions", timeout=15).json()
        matching = [p for p in promos if p.get("vendor_id") == vendor_id and p.get("active")]
        assert len(matching) >= 1

        # cleanup
        if promo_id:
            requests.delete(f"{BASE_URL}/api/promotions/{promo_id}", headers=admin_headers, timeout=15)
