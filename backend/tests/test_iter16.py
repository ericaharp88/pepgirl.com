"""Iteration 16 tests: home hero settings, reviews admin flow, new vendors."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# --- Settings: home hero fields ---
def test_settings_has_hero_fields():
    r = requests.get(f"{API}/settings", timeout=10)
    assert r.status_code == 200
    d = r.json()
    for f in ("home_hero_eyebrow", "home_hero_title", "home_hero_intro"):
        assert f in d, f"Missing field {f} in settings: {d.keys()}"
        assert isinstance(d[f], str) and len(d[f]) > 0


def test_settings_update_hero_persists(auth):
    # Get current
    cur = requests.get(f"{API}/settings", timeout=10).json()
    new_title = "TEST_Hero Title. italic part."
    payload = {
        "peptide_price_tool_enabled": cur.get("peptide_price_tool_enabled", True),
        "community_bar_enabled": cur.get("community_bar_enabled", True),
        "community_bar_message": cur.get("community_bar_message", ""),
        "community_bar_cta_label": cur.get("community_bar_cta_label", ""),
        "community_bar_cta_url": cur.get("community_bar_cta_url", ""),
        "home_hero_eyebrow": "TEST_Eyebrow",
        "home_hero_title": new_title,
        "home_hero_intro": "TEST_intro paragraph.",
    }
    r = auth.put(f"{API}/settings", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    # Refetch
    d2 = requests.get(f"{API}/settings", timeout=10).json()
    assert d2["home_hero_title"] == new_title
    assert d2["home_hero_eyebrow"] == "TEST_Eyebrow"
    assert d2["home_hero_intro"] == "TEST_intro paragraph."
    # Restore
    payload.update({
        "home_hero_eyebrow": cur["home_hero_eyebrow"],
        "home_hero_title": cur["home_hero_title"],
        "home_hero_intro": cur["home_hero_intro"],
    })
    auth.put(f"{API}/settings", json=payload, timeout=10)


# --- Reviews CRUD ---
def test_reviews_public_lists_seeded():
    r = requests.get(f"{API}/reviews", timeout=10)
    assert r.status_code == 200
    revs = r.json()
    assert isinstance(revs, list) and len(revs) >= 4
    for rv in revs:
        assert "_id" not in rv
        assert "author" in rv and "quote" in rv


def test_review_admin_crud(auth):
    payload = {"author": "TEST_Reviewer", "quote": "TEST_Great!", "rating": 5,
               "location": "TEST_City", "active": True}
    r = auth.post(f"{API}/reviews", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    rev = r.json()
    rid = rev["id"]
    assert rev["author"] == "TEST_Reviewer"

    # Verify GET
    pub = requests.get(f"{API}/reviews", timeout=10).json()
    assert any(x["id"] == rid for x in pub)

    # Update
    r2 = auth.put(f"{API}/reviews/{rid}", json={**payload, "quote": "TEST_Updated"}, timeout=10)
    assert r2.status_code == 200
    assert r2.json()["quote"] == "TEST_Updated"

    # Toggle inactive => must be hidden on public
    r3 = auth.put(f"{API}/reviews/{rid}", json={**payload, "active": False}, timeout=10)
    assert r3.status_code == 200
    pub2 = requests.get(f"{API}/reviews", timeout=10).json()
    assert not any(x["id"] == rid for x in pub2), "Inactive review should be hidden from public"

    # Delete
    rd = auth.delete(f"{API}/reviews/{rid}", timeout=10)
    assert rd.status_code == 200


# --- Vendors: new + reseq logo ---
def test_new_vendors_and_reseq_logo():
    r = requests.get(f"{API}/vendors", timeout=10)
    assert r.status_code == 200
    vendors = r.json()
    by_slug = {v["slug"]: v for v in vendors}
    assert "ironwithin" in by_slug, f"IronWithin not found. Slugs: {list(by_slug.keys())}"
    assert "vector-research" in by_slug, f"vector-research not found. Slugs: {list(by_slug.keys())}"
    assert "re-seq" in by_slug, "re-seq missing"
    reseq = by_slug["re-seq"]
    assert reseq.get("logo_url") and "reseq.io/apple-touch-icon.png" in reseq["logo_url"], \
        f"re-seq logo_url = {reseq.get('logo_url')}"

    # Check Peptides tags on new vendors
    for slug in ("ironwithin", "vector-research"):
        tags = [t.lower() for t in by_slug[slug].get("tags", [])]
        assert any("peptide" in t for t in tags), f"{slug} tags={tags} missing 'Peptides'"
