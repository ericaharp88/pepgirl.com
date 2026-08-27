import os, requests, pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL','https://peptide-dosing-1.preview.emergentagent.com').rstrip('/')

def test_settings_home_meet_title_empty():
    r = requests.get(f"{BASE}/api/settings", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "home_meet_title" in data
    # Should be empty by default (production DB had no value)
    assert data["home_meet_title"] == "", f"Expected empty, got: {data['home_meet_title']!r}"

def test_vendors_new_three_present():
    r = requests.get(f"{BASE}/api/vendors", timeout=15)
    assert r.status_code == 200
    vs = r.json()
    slugs = {v.get("slug"): v for v in vs}
    for slug in ["ironwithin", "vector-research", "re-seq"]:
        assert slug in slugs, f"Missing vendor slug {slug}"
        v = slugs[slug]
        assert v.get("discount_code") == "ERICA"
        assert v.get("affiliate_url"), f"{slug} missing affiliate_url"
        assert v.get("name"), f"{slug} missing name"

def test_vendors_regression_existing_seeds():
    r = requests.get(f"{BASE}/api/vendors", timeout=15)
    slugs = {v.get("slug") for v in r.json()}
    # Sample existing seeded vendors
    for s in ["peptide-tech", "solas-science", "celmade"]:
        assert s in slugs, f"Regression: missing existing seed vendor {s}"

def test_vendors_reseq_featured_and_categorization():
    r = requests.get(f"{BASE}/api/vendors", timeout=15)
    vs = {v["slug"]: v for v in r.json()}
    reseq = vs.get("re-seq")
    assert reseq is not None
    assert reseq.get("featured") is True
    tags = [t.lower() for t in reseq.get("tags", [])]
    assert any("skin" in t for t in tags), f"RE:SEQ missing Skin Care tag: {reseq.get('tags')}"
    for s in ["ironwithin", "vector-research"]:
        tags = [t.lower() for t in vs[s].get("tags", [])]
        assert any("peptide" in t for t in tags), f"{s} missing Peptides tag: {vs[s].get('tags')}"
