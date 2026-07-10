"""Backend tests for site settings — community bar feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://peptide-dosing-1.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=15)
    assert r.status_code == 200, r.text
    return s


class TestSettingsPublic:
    def test_get_settings_returns_all_community_bar_fields(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["price_tool_enabled", "community_bar_enabled",
                  "community_bar_url", "community_bar_message",
                  "community_bar_price", "community_bar_cta"]:
            assert k in d, f"missing key {k}"
        assert isinstance(d["community_bar_enabled"], bool)
        assert isinstance(d["community_bar_price"], str)

    def test_default_price_is_three_dollar_one_time(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        d = r.json()
        # current DB should reflect $3 one-time (post-restore)
        assert d["community_bar_price"] == "$3 one-time"


class TestSettingsUpdate:
    def test_put_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/settings", json={
            "price_tool_enabled": True, "community_bar_enabled": True,
            "community_bar_url": "https://x", "community_bar_message": "m",
            "community_bar_price": "$1", "community_bar_cta": "c"
        }, timeout=15)
        assert r.status_code in (401, 403)

    def test_update_and_persist_price(self, admin_session):
        # get original
        orig = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()

        payload = {
            "price_tool_enabled": orig["price_tool_enabled"],
            "community_bar_enabled": orig["community_bar_enabled"],
            "community_bar_url": orig["community_bar_url"],
            "community_bar_message": orig["community_bar_message"],
            "community_bar_price": "$5 test",
            "community_bar_cta": orig["community_bar_cta"],
        }
        put_r = admin_session.put(f"{BASE_URL}/api/settings", json=payload, timeout=15)
        assert put_r.status_code == 200
        pd = put_r.json()
        assert pd["community_bar_price"] == "$5 test"

        # GET verify persistence
        g = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()
        assert g["community_bar_price"] == "$5 test"

        # restore
        payload["community_bar_price"] = orig["community_bar_price"]
        r2 = admin_session.put(f"{BASE_URL}/api/settings", json=payload, timeout=15)
        assert r2.status_code == 200
        g2 = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()
        assert g2["community_bar_price"] == orig["community_bar_price"]

    def test_toggle_community_bar_enabled(self, admin_session):
        orig = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()
        payload = {**{k: orig[k] for k in [
            "price_tool_enabled", "community_bar_enabled", "community_bar_url",
            "community_bar_message", "community_bar_price", "community_bar_cta"]}}
        payload["community_bar_enabled"] = False
        r = admin_session.put(f"{BASE_URL}/api/settings", json=payload, timeout=15)
        assert r.status_code == 200
        assert requests.get(f"{BASE_URL}/api/settings", timeout=15).json()["community_bar_enabled"] is False
        payload["community_bar_enabled"] = True
        admin_session.put(f"{BASE_URL}/api/settings", json=payload, timeout=15)
        assert requests.get(f"{BASE_URL}/api/settings", timeout=15).json()["community_bar_enabled"] is True
