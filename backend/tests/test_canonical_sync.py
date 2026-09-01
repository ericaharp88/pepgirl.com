"""Verify canonical logo/order/featured sync on backend startup.

Simulates production stale state, restarts backend, then asserts
that canonical fields are synced while non-canonical fields on RE:SEQ
and other vendors remain untouched.
"""
import os
import subprocess
import time

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://peptide-dosing-1.preview.emergentagent.com").rstrip("/")
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "peptide_hub"

CANONICAL_RESEQ_LOGO = "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/wa4m27i2_22705d52-022b-45aa-9109-3a305f9c90fa.png"
CANONICAL_VECTOR_LOGO = "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/6ebayqia_bec54a23-50e3-4a1e-89ac-f49aa1d356e3.png"

STALE_RESEQ_LOGO = "https://reseq.io/img/apple-icon.png"
STALE_VECTOR_LOGO = "https://old.example.com/vector.png"

CUSTOM_DESCRIPTION_MARKER = "TEST_ADMIN_EDIT_SURVIVES_RESTART_marker_9x1"
CUSTOM_PROMO_BADGE = "TEST_PROMO_BADGE_marker_xyz"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def other_vendor_snapshots(db):
    """Snapshot pre-restart state of unaffected vendors."""
    slugs = ["amino-well-usa", "felix-chems", "auro-wellness", "celmade"]
    snapshots = {}
    for v in db.vendors.find({"slug": {"$in": slugs}}):
        snapshots[v["slug"]] = {
            "logo_url": v.get("logo_url"),
            "order": v.get("order"),
            "featured": v.get("featured"),
        }
    return snapshots


def _restart_backend_and_wait():
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    # Wait for backend to come back up
    deadline = time.time() + 45
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/api/vendors", timeout=5)
            if r.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(1)
    raise RuntimeError("Backend did not come back up after restart")


@pytest.fixture(scope="module")
def stale_then_restart(db, other_vendor_snapshots):
    """Inject stale prod-like data + also mutate a non-canonical field on
    re-seq (description) and a non-canonical field via promo_badge to
    verify canonical sync doesn't overwrite non-canonical admin edits.
    """
    # Stale canonical fields
    db.vendors.update_one(
        {"slug": "re-seq"},
        {"$set": {
            "logo_url": STALE_RESEQ_LOGO,
            "order": 99,
            "featured": False,
            # Non-canonical admin edits that MUST survive
            "description": CUSTOM_DESCRIPTION_MARKER,
            "promo_badge": CUSTOM_PROMO_BADGE,
        }},
    )
    db.vendors.update_one(
        {"slug": "vector-research"},
        {"$set": {"logo_url": STALE_VECTOR_LOGO}},
    )
    _restart_backend_and_wait()
    yield


def _get_vendor(vendors, slug):
    return next((v for v in vendors if v.get("slug") == slug), None)


class TestCanonicalSync:
    def test_reseq_logo_synced(self, stale_then_restart):
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=10)
        assert r.status_code == 200
        reseq = _get_vendor(r.json(), "re-seq")
        assert reseq is not None, "re-seq vendor missing"
        assert reseq["logo_url"] == CANONICAL_RESEQ_LOGO, f"got {reseq['logo_url']}"

    def test_reseq_order_synced(self, stale_then_restart):
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=10)
        reseq = _get_vendor(r.json(), "re-seq")
        assert reseq["order"] == 1, f"expected order=1, got {reseq.get('order')}"

    def test_reseq_featured_synced(self, stale_then_restart):
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=10)
        reseq = _get_vendor(r.json(), "re-seq")
        assert reseq["featured"] is True, f"expected featured=True, got {reseq.get('featured')}"

    def test_vector_logo_synced(self, stale_then_restart):
        r = requests.get(f"{BASE_URL}/api/vendors", timeout=10)
        vector = _get_vendor(r.json(), "vector-research")
        assert vector is not None
        assert vector["logo_url"] == CANONICAL_VECTOR_LOGO, f"got {vector['logo_url']}"

    def test_reseq_non_canonical_admin_edits_survive(self, stale_then_restart, db):
        """description and promo_badge on re-seq must not be overwritten by canonical sync."""
        v = db.vendors.find_one({"slug": "re-seq"})
        assert v.get("description") == CUSTOM_DESCRIPTION_MARKER, (
            f"canonical sync overwrote description! got: {v.get('description')!r}"
        )
        assert v.get("promo_badge") == CUSTOM_PROMO_BADGE, (
            f"canonical sync overwrote promo_badge! got: {v.get('promo_badge')!r}"
        )

    def test_other_vendors_unaffected(self, stale_then_restart, db, other_vendor_snapshots):
        for slug, snap in other_vendor_snapshots.items():
            v = db.vendors.find_one({"slug": slug})
            assert v is not None, f"{slug} missing"
            assert v.get("logo_url") == snap["logo_url"], f"{slug} logo_url changed"
            assert v.get("order") == snap["order"], f"{slug} order changed"
            assert v.get("featured") == snap["featured"], f"{slug} featured changed"


def test_cleanup_restore_non_canonical(db):
    """Cleanup: restore re-seq description/promo_badge to something reasonable
    so we don't leave TEST_ markers in prod-like data."""
    # Restore to seed defaults from server.py
    db.vendors.update_one(
        {"slug": "re-seq"},
        {"$set": {
            "description": "Copper peptide skin care line (Elixir of Youth, Blue Copper Body Lotion, Copper Peptide Shampoo).",
            "promo_badge": None,
        }},
    )
