"""Backend tests for subscribers + extended settings fields (iteration 18)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to frontend env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# -------- subscribers ----------
class TestSubscribers:
    def test_create_subscriber(self):
        email = "TEST_iter18@example.com"
        # cleanup first by creating admin session
        r = requests.post(f"{API}/subscribers", json={"email": email, "source": "test"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        # duplicate
        r2 = requests.post(f"{API}/subscribers", json={"email": email, "source": "test"})
        assert r2.status_code == 200
        assert r2.json().get("already_subscribed") is True

    def test_invalid_email(self):
        r = requests.post(f"{API}/subscribers", json={"email": "not-an-email", "source": "x"})
        assert r.status_code == 400

    def test_list_requires_auth(self):
        r = requests.get(f"{API}/subscribers")
        assert r.status_code == 401

    def test_list_returns_created(self, admin_session):
        r = admin_session.get(f"{API}/subscribers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        emails = [d.get("email") for d in data]
        assert "test_iter18@example.com" in emails or "TEST_iter18@example.com".lower() in emails

    def test_export_csv(self, admin_session):
        r = admin_session.get(f"{API}/subscribers/export.csv?mark_exported=true")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "")
        first_line = r.text.splitlines()[0]
        assert first_line == "email,subscribed_at,source"
        # after export, list should show exported=true for our email
        r2 = admin_session.get(f"{API}/subscribers")
        rows = [d for d in r2.json() if d.get("email") == "test_iter18@example.com"]
        assert rows and rows[0].get("exported") is True

    def test_delete_subscriber(self, admin_session):
        r = admin_session.get(f"{API}/subscribers")
        rows = [d for d in r.json() if d.get("email") == "test_iter18@example.com"]
        assert rows
        sid = rows[0]["id"]
        rd = admin_session.delete(f"{API}/subscribers/{sid}")
        assert rd.status_code == 200
        r3 = admin_session.get(f"{API}/subscribers")
        assert not [d for d in r3.json() if d.get("id") == sid]


# -------- settings ----------
NEW_KEYS = [
    "home_meet_title", "home_meet_body",
    "home_stat_1_value", "home_stat_1_label",
    "home_stat_2_value", "home_stat_2_label",
    "home_stat_3_value", "home_stat_3_label",
    "home_newsletter_title", "home_newsletter_body",
]


class TestSettings:
    def test_get_settings_has_new_keys(self):
        r = requests.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        for k in NEW_KEYS:
            assert k in d, f"missing key {k}"
            assert isinstance(d[k], str) and d[k], f"{k} empty"

    def test_put_settings_merges(self, admin_session):
        # get current
        cur = requests.get(f"{API}/settings").json()
        new_meet = "TEST Meet Title"
        payload = {**{k: cur.get(k, "") for k in cur if isinstance(cur.get(k), str)},
                   "home_meet_title": new_meet}
        # Ensure required non-string fields removed - only send strings the API accepts
        # PUT: send all fields
        r = admin_session.put(f"{API}/settings", json=payload)
        assert r.status_code == 200, r.text
        after = requests.get(f"{API}/settings").json()
        assert after["home_meet_title"] == new_meet
        # ensure other new fields still populated (co-exist / merge)
        for k in NEW_KEYS:
            assert after.get(k), f"{k} cleared after PUT"
        # restore
        payload["home_meet_title"] = cur["home_meet_title"]
        admin_session.put(f"{API}/settings", json=payload)
