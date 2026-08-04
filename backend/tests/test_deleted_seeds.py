"""Tests for the deleted_seeds mechanism preventing seed resurrection."""
import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://peptide-dosing-1.preview.emergentagent.com"
ADMIN_EMAIL = "admin@peptidehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _get_resources():
    r = requests.get(f"{BASE_URL}/api/resources", timeout=15)
    assert r.status_code == 200, f"GET /api/resources failed: {r.status_code}"
    return r.json()


def _has_erica(resources):
    for res in resources:
        title = (res.get("title") or "").lower()
        if "erica" in title and "elevated" in title:
            return res
    return None


def restart_backend_and_wait():
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    # Wait for backend to come back up
    for _ in range(30):
        time.sleep(1)
        try:
            r = requests.get(f"{BASE_URL}/api/resources", timeout=5)
            if r.status_code == 200:
                # Also wait a bit more for the async seed to finish
                time.sleep(2)
                return True
        except Exception:
            continue
    raise RuntimeError("Backend did not come back up after restart")


# ---------- Test 1: Erica resource NOT present currently ----------
def test_erica_not_present():
    resources = _get_resources()
    found = _has_erica(resources)
    assert found is None, f"Erica resource still present: {found}"


# ---------- Test 2: After backend restart, Erica STILL absent ----------
def test_erica_stays_absent_after_restart():
    restart_backend_and_wait()
    resources = _get_resources()
    found = _has_erica(resources)
    assert found is None, f"Erica resource resurrected after restart: {found}"


# ---------- Test 3: Create new resource with Erica-seeded title, delete it, restart, verify absent ----------
def test_create_delete_erica_stays_gone_after_restart(auth_headers):
    seeded_title = "My Peptide Community \u2014 Erica\u2019s Elevated Life"
    payload = {
        "title": seeded_title,
        "category": "Community",
        "summary": "Test recreation for regression test.",
        "url": "https://www.skool.com/ericas-elevated-life-9005",
        "content": "",
    }
    r = requests.post(f"{BASE_URL}/api/resources", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code in (200, 201), f"Create failed: {r.status_code} {r.text}"
    created = r.json()
    rid = created.get("id")
    assert rid, f"No id in create response: {created}"

    # Verify present
    resources = _get_resources()
    assert _has_erica(resources) is not None, "Newly created Erica resource missing"

    # Delete
    d = requests.delete(f"{BASE_URL}/api/resources/{rid}", headers=auth_headers, timeout=15)
    assert d.status_code == 200, f"Delete failed: {d.status_code} {d.text}"

    # Verify absent
    resources = _get_resources()
    assert _has_erica(resources) is None, "Erica resource still present after delete"

    # Restart and verify still absent
    restart_backend_and_wait()
    resources = _get_resources()
    assert _has_erica(resources) is None, "Erica resource resurrected after delete + restart"


# ---------- Test 4: Other seeded resources still present (not affected) ----------
def test_other_seeds_still_present():
    resources = _get_resources()
    titles = [(r.get("title") or "") for r in resources]
    assert any("How to Read a COA" in t for t in titles), f"'How to Read a COA' missing. Titles: {titles}"
    assert any("Peppy Pens" in t for t in titles), f"'Peppy Pens' missing. Titles: {titles}"


# ---------- Test 5: Delete an actively-shown seed (COA), restart, verify absent, then restore ----------
def test_generic_seed_delete_persists_and_restore(auth_headers):
    resources = _get_resources()
    coa = next((r for r in resources if "How to Read a COA" in (r.get("title") or "")), None)
    assert coa is not None, "COA resource not found for test"
    coa_id = coa["id"]
    original_payload = {
        "title": coa["title"],
        "category": coa.get("category", "Guide"),
        "summary": coa.get("summary", ""),
        "url": coa.get("url", ""),
        "content": coa.get("content", ""),
    }

    try:
        # Delete
        d = requests.delete(f"{BASE_URL}/api/resources/{coa_id}", headers=auth_headers, timeout=15)
        assert d.status_code == 200, f"Delete COA failed: {d.status_code}"

        # Restart backend
        restart_backend_and_wait()

        # Verify absent
        resources_after = _get_resources()
        still_there = any("How to Read a COA" in (r.get("title") or "") for r in resources_after)
        assert not still_there, "COA seed was resurrected after restart - deleted_seeds mechanism broken"
    finally:
        # RESTORE — cleanup so preview stays healthy.
        # Must remove the deleted_seeds entry first, else next restart won't matter but recreate via API works.
        rc = requests.post(f"{BASE_URL}/api/resources", json=original_payload, headers=auth_headers, timeout=15)
        assert rc.status_code in (200, 201), f"Restore COA failed: {rc.status_code} {rc.text}"
        # Verify restored
        resources_final = _get_resources()
        assert any("How to Read a COA" in (r.get("title") or "") for r in resources_final), "COA not restored!"
