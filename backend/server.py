from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- Setup ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-dev-secret")

app = FastAPI(title="Peptide Hub API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


def strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ---------------- Models ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str = ""
    affiliate_url: str
    logo_url: str = ""
    rating: float = 0.0
    tags: List[str] = []
    discount_code: str = ""
    promo_badge: str = ""  # short deal flag e.g. "BOGO", "FREE BAC water"
    featured: bool = False
    comparison_enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VendorIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    affiliate_url: str
    logo_url: str = ""
    rating: float = 0.0
    tags: List[str] = []
    discount_code: str = ""
    promo_badge: str = ""
    featured: bool = False
    comparison_enabled: bool = True


class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    summary: str = ""
    url: str = ""
    content: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ResourceIn(BaseModel):
    title: str
    category: str
    summary: str = ""
    url: str = ""
    content: str = ""


class SocialLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str        # e.g. instagram, tiktok, youtube, twitter, threads, pinterest, email
    url: str
    label: str = ""      # optional display name override
    order: int = 0
    enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SocialLinkIn(BaseModel):
    platform: str
    url: str
    label: str = ""
    order: int = 0
    enabled: bool = True


class Peptide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str = ""
    typical_dose_mcg: float = 0.0
    category: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PeptideIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    typical_dose_mcg: float = 0.0
    category: str = ""


class PriceEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    peptide_id: str
    vendor_id: str
    size_mg: float
    price_usd: float
    product_url: str = ""
    scrape_selector: str = ""  # CSS selector for scraping
    last_scraped: Optional[str] = None
    last_status: str = "manual"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PriceEntryIn(BaseModel):
    peptide_id: str
    vendor_id: str
    size_mg: float
    price_usd: float = 0.0
    product_url: str = ""
    scrape_selector: str = ""


# ---------------- Auth Endpoints ----------------
@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=False, samesite="lax", max_age=604800, path="/",
    )
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user["role"], "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


# ---------------- Vendors ----------------
@api_router.get("/vendors")
async def list_vendors():
    docs = await db.vendors.find({}, {"_id": 0}).sort("featured", -1).to_list(500)
    return docs


@api_router.post("/vendors", response_model=Vendor)
async def create_vendor(payload: VendorIn, admin: dict = Depends(get_current_admin)):
    obj = Vendor(**payload.model_dump())
    await db.vendors.insert_one(obj.model_dump())
    return obj


@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, payload: VendorIn, admin: dict = Depends(get_current_admin)):
    result = await db.vendors.update_one({"id": vendor_id}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    return doc


@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, admin: dict = Depends(get_current_admin)):
    await db.vendors.delete_one({"id": vendor_id})
    await db.prices.delete_many({"vendor_id": vendor_id})
    return {"ok": True}


# ---------------- Resources ----------------
@api_router.get("/resources")
async def list_resources():
    return await db.resources.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api_router.post("/resources", response_model=Resource)
async def create_resource(payload: ResourceIn, admin: dict = Depends(get_current_admin)):
    obj = Resource(**payload.model_dump())
    await db.resources.insert_one(obj.model_dump())
    return obj


@api_router.put("/resources/{rid}")
async def update_resource(rid: str, payload: ResourceIn, admin: dict = Depends(get_current_admin)):
    result = await db.resources.update_one({"id": rid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.resources.find_one({"id": rid}, {"_id": 0})


@api_router.delete("/resources/{rid}")
async def delete_resource(rid: str, admin: dict = Depends(get_current_admin)):
    await db.resources.delete_one({"id": rid})
    return {"ok": True}


# ---------------- Social Links ----------------
@api_router.get("/socials")
async def list_socials():
    items = await db.socials.find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return items


@api_router.get("/socials/all")
async def list_socials_admin(admin: dict = Depends(get_current_admin)):
    return await db.socials.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.post("/socials", response_model=SocialLink)
async def create_social(payload: SocialLinkIn, admin: dict = Depends(get_current_admin)):
    obj = SocialLink(**payload.model_dump())
    await db.socials.insert_one(obj.model_dump())
    return obj


@api_router.put("/socials/{sid}")
async def update_social(sid: str, payload: SocialLinkIn, admin: dict = Depends(get_current_admin)):
    result = await db.socials.update_one({"id": sid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.socials.find_one({"id": sid}, {"_id": 0})


@api_router.delete("/socials/{sid}")
async def delete_social(sid: str, admin: dict = Depends(get_current_admin)):
    await db.socials.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Peptides ----------------
@api_router.get("/peptides")
async def list_peptides():
    return await db.peptides.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@api_router.post("/peptides", response_model=Peptide)
async def create_peptide(payload: PeptideIn, admin: dict = Depends(get_current_admin)):
    obj = Peptide(**payload.model_dump())
    await db.peptides.insert_one(obj.model_dump())
    return obj


@api_router.put("/peptides/{pid}")
async def update_peptide(pid: str, payload: PeptideIn, admin: dict = Depends(get_current_admin)):
    result = await db.peptides.update_one({"id": pid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.peptides.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/peptides/{pid}")
async def delete_peptide(pid: str, admin: dict = Depends(get_current_admin)):
    await db.peptides.delete_one({"id": pid})
    await db.prices.delete_many({"peptide_id": pid})
    return {"ok": True}


# ---------------- Prices ----------------
@api_router.get("/prices")
async def list_prices():
    prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    return prices


@api_router.post("/prices", response_model=PriceEntry)
async def create_price(payload: PriceEntryIn, admin: dict = Depends(get_current_admin)):
    obj = PriceEntry(**payload.model_dump())
    await db.prices.insert_one(obj.model_dump())
    return obj


@api_router.put("/prices/{pid}")
async def update_price(pid: str, payload: PriceEntryIn, admin: dict = Depends(get_current_admin)):
    updates = payload.model_dump()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.prices.update_one({"id": pid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.prices.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/prices/{pid}")
async def delete_price(pid: str, admin: dict = Depends(get_current_admin)):
    await db.prices.delete_one({"id": pid})
    return {"ok": True}


def _extract_price(text: str) -> Optional[float]:
    if not text:
        return None
    # Find first number with optional decimal
    match = re.search(r"(\d{1,5}(?:[.,]\d{1,2})?)", text.replace(",", ""))
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


@api_router.post("/prices/{pid}/scrape")
async def scrape_price(pid: str, admin: dict = Depends(get_current_admin)):
    price = await db.prices.find_one({"id": pid})
    if not price:
        raise HTTPException(status_code=404, detail="Not found")
    url = price.get("product_url")
    selector = price.get("scrape_selector")
    if not url or not selector:
        raise HTTPException(status_code=400, detail="product_url and scrape_selector required")
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 PeptideHub/1.0"})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        node = soup.select_one(selector)
        if not node:
            raise HTTPException(status_code=422, detail="Selector matched nothing on page")
        new_price = _extract_price(node.get_text(strip=True))
        if new_price is None:
            raise HTTPException(status_code=422, detail=f"Could not parse price from: '{node.get_text(strip=True)[:80]}'")
        now = datetime.now(timezone.utc).isoformat()
        await db.prices.update_one(
            {"id": pid},
            {"$set": {"price_usd": new_price, "last_scraped": now, "last_status": "ok", "updated_at": now}},
        )
        return {"id": pid, "price_usd": new_price, "last_scraped": now, "last_status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        now = datetime.now(timezone.utc).isoformat()
        await db.prices.update_one(
            {"id": pid}, {"$set": {"last_scraped": now, "last_status": f"error: {str(e)[:120]}"}}
        )
        raise HTTPException(status_code=500, detail=f"Scrape failed: {str(e)[:200]}")


@api_router.post("/prices/scrape-all")
async def scrape_all(admin: dict = Depends(get_current_admin)):
    prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    results = {"ok": 0, "skipped": 0, "errors": 0}
    for p in prices:
        if not p.get("product_url") or not p.get("scrape_selector"):
            results["skipped"] += 1
            continue
        try:
            r = requests.get(p["product_url"], timeout=12,
                             headers={"User-Agent": "Mozilla/5.0 PeptideHub/1.0"})
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "lxml")
            node = soup.select_one(p["scrape_selector"])
            now = datetime.now(timezone.utc).isoformat()
            if node:
                new_price = _extract_price(node.get_text(strip=True))
                if new_price is not None:
                    await db.prices.update_one(
                        {"id": p["id"]},
                        {"$set": {"price_usd": new_price, "last_scraped": now,
                                  "last_status": "ok", "updated_at": now}},
                    )
                    results["ok"] += 1
                    continue
            await db.prices.update_one(
                {"id": p["id"]}, {"$set": {"last_scraped": now, "last_status": "parse-failed"}}
            )
            results["errors"] += 1
        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            await db.prices.update_one(
                {"id": p["id"]}, {"$set": {"last_scraped": now, "last_status": f"error: {str(e)[:80]}"}}
            )
            results["errors"] += 1
    return results


# ---------------- Public comparison endpoint ----------------
@api_router.get("/comparison")
async def comparison():
    peptides = await db.peptides.find({}, {"_id": 0}).to_list(1000)
    vendors = await db.vendors.find(
        {"$or": [{"comparison_enabled": True},
                 {"comparison_enabled": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(500)
    vendor_ids = {v["id"] for v in vendors}
    all_prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    prices = [p for p in all_prices if p["vendor_id"] in vendor_ids]
    # Only return peptides that actually have at least one price across enabled vendors
    used_pep_ids = {p["peptide_id"] for p in prices}
    peptides = [p for p in peptides if p["id"] in used_pep_ids]
    return {"peptides": peptides, "vendors": vendors, "prices": prices}


# ---------------- AI Bulk Import ----------------
@api_router.post("/prices/bulk-import")
async def bulk_import_prices(admin: dict = Depends(get_current_admin),
                             vendor_slug: Optional[str] = None,
                             dry_run: bool = False):
    """Scrape every vendor's catalog with an LLM and upsert peptides + prices.
    If `vendor_slug` is provided, only scrape that one vendor.
    If `dry_run=true`, returns the extracted data WITHOUT writing to DB."""
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured on server")

    from scraper import bulk_scrape  # lazy import — keeps startup fast

    query = {"slug": vendor_slug} if vendor_slug else {
        "$or": [{"comparison_enabled": True}, {"comparison_enabled": {"$exists": False}}]
    }
    vendor_docs = await db.vendors.find(query, {"_id": 0}).to_list(100)
    if not vendor_docs:
        raise HTTPException(status_code=404, detail="No vendors found")

    scrape_results = await bulk_scrape(vendor_docs, llm_key)

    summary = {
        "vendors_attempted": len(scrape_results),
        "vendors_successful": 0,
        "peptides_added": 0,
        "prices_added": 0,
        "prices_updated": 0,
        "details": [],
    }

    for res in scrape_results:
        vendor = next((v for v in vendor_docs if v["slug"] == res["vendor_slug"]), None)
        if not vendor:
            continue

        detail = {
            "vendor_slug": res["vendor_slug"],
            "vendor_name": vendor["name"],
            "shop_url": res["shop_url"],
            "error": res["error"],
            "products_found": len(res["products"]),
            "added": 0,
            "updated": 0,
            "sample": res["products"][:5],
        }

        if res["error"] or not res["products"]:
            summary["details"].append(detail)
            continue

        summary["vendors_successful"] += 1
        now = datetime.now(timezone.utc).isoformat()

        for p in res["products"]:
            if dry_run:
                continue
            # Upsert peptide by canonical name -> slug
            pep_slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
            if not pep_slug:
                continue
            existing_pep = await db.peptides.find_one({"slug": pep_slug}, {"_id": 0})
            if not existing_pep:
                pep_obj = Peptide(name=p["name"], slug=pep_slug, description="",
                                  typical_dose_mcg=0.0, category="")
                await db.peptides.insert_one(pep_obj.model_dump())
                pep_id = pep_obj.id
                summary["peptides_added"] += 1
            else:
                pep_id = existing_pep["id"]

            # Upsert price by (peptide_id, vendor_id, size_mg)
            size_mg = float(p["size_mg"] or 0.0)
            existing_price = await db.prices.find_one(
                {"peptide_id": pep_id, "vendor_id": vendor["id"], "size_mg": size_mg},
                {"_id": 0}
            )
            if existing_price:
                await db.prices.update_one(
                    {"id": existing_price["id"]},
                    {"$set": {"price_usd": p["price_usd"], "product_url": p["product_url"],
                              "last_scraped": now, "last_status": "ai-scrape",
                              "updated_at": now}}
                )
                detail["updated"] += 1
                summary["prices_updated"] += 1
            else:
                pe = PriceEntry(
                    peptide_id=pep_id, vendor_id=vendor["id"], size_mg=size_mg,
                    price_usd=p["price_usd"], product_url=p["product_url"] or "",
                    scrape_selector="", last_scraped=now, last_status="ai-scrape",
                )
                await db.prices.insert_one(pe.model_dump())
                detail["added"] += 1
                summary["prices_added"] += 1

        summary["details"].append(detail)

    return summary


# ---------------- Health ----------------
@api_router.get("/")
async def root():
    return {"service": "peptide-hub", "status": "ok"}


# ---------------- Startup ----------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@peptidehub.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password for {admin_email}")


async def seed_sample_data():
    """Idempotent seed: inserts vendors / peptides / resources only if their slug
    (or title) is missing. Safe to re-run; never overwrites user-edited records."""
    logger.info("Running idempotent sample-data seed...")

    # ───── One-time cleanup: remove legacy sample vendors that were never on Erica's list ─────
    legacy_slugs = ["peptide-sciences", "pure-peptides-usa", "amino-asylum", "limitless-life"]
    legacy_docs = await db.vendors.find({"slug": {"$in": legacy_slugs}}, {"id": 1, "_id": 0}).to_list(50)
    if legacy_docs:
        legacy_ids = [d["id"] for d in legacy_docs]
        await db.prices.delete_many({"vendor_id": {"$in": legacy_ids}})
        del_res = await db.vendors.delete_many({"slug": {"$in": legacy_slugs}})
        logger.info(f"Removed {del_res.deleted_count} legacy sample vendors and their prices.")

    # ───── Mark non-comparison vendors and wipe any of their prices ─────
    NON_COMPARISON_SLUGS = ["take-ploom", "belliwelli", "moon-brew", "ryze-mushroom-coffee", "comfrt"]
    nc_docs = await db.vendors.find({"slug": {"$in": NON_COMPARISON_SLUGS}},
                                    {"id": 1, "slug": 1, "_id": 0}).to_list(50)
    if nc_docs:
        nc_ids = [d["id"] for d in nc_docs]
        await db.vendors.update_many({"id": {"$in": nc_ids}},
                                     {"$set": {"comparison_enabled": False}})
        wiped = await db.prices.delete_many({"vendor_id": {"$in": nc_ids}})
        if wiped.deleted_count:
            logger.info(f"Wiped {wiped.deleted_count} price entries from non-comparison vendors.")
    # Garbage-collect peptides that no longer have any price
    used_pep_ids = await db.prices.distinct("peptide_id")
    orphan = await db.peptides.delete_many({"id": {"$nin": used_pep_ids}})
    if orphan.deleted_count:
        logger.info(f"Removed {orphan.deleted_count} orphan peptides (no prices).")

    vendors = [
        # ───── Peptide vendors (Erica's affiliates) ─────
        {"name": "Amino Well USA", "slug": "amino-well-usa",
         "description": "Research peptides from a US-based lab.",
         "affiliate_url": "https://aminowellusa.com/?ref=xmqfndph",
         "logo_url": "https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/im5sz2z1_amino%20well.webp",
         "rating": 4.6, "tags": ["Peptides", "USA"],
         "discount_code": "ERICA", "featured": True},
        {"name": "Felix Chems", "slug": "felix-chems",
         "description": "1 FREE Hospira bac water with every order. Felix Friday deals every Friday.",
         "affiliate_url": "https://felixchem.is/refer/8220/",
         "logo_url": "https://www.google.com/s2/favicons?domain=felixchem.is&sz=128",
         "rating": 4.6, "tags": ["Peptides", "BAC Water"],
         "discount_code": "ERICAS10", "promo_badge": "FREE BAC water", "featured": True},
        {"name": "Glow Aminos", "slug": "glow-aminos",
         "description": "Curated peptide selection with member savings.",
         "affiliate_url": "https://glowaminos.com/shop/?coupon=ERICA",
         "logo_url": "https://www.google.com/s2/favicons?domain=glowaminos.com&sz=128",
         "rating": 4.5, "tags": ["Peptides"],
         "discount_code": "ERICA", "featured": False},
        {"name": "Peptide Tech", "slug": "peptide-tech",
         "description": "Research peptides — 8x tested, 99%+ pure.",
         "affiliate_url": "https://peptidetech.co/?ref=jrmrcamc&utm_source=affiliate",
         "logo_url": "https://www.google.com/s2/favicons?domain=peptidetech.co&sz=128",
         "rating": 4.8, "tags": ["Peptides", "Tested", "High Purity"],
         "discount_code": "ERICA", "featured": True},
        {"name": "Modified Aminos", "slug": "modified-aminos",
         "description": "Capsules & nasal sprays — alternative delivery formats.",
         "affiliate_url": "https://modifiedaminos.shop/?ref=ERICA",
         "logo_url": "https://www.google.com/s2/favicons?domain=modifiedaminos.shop&sz=128",
         "rating": 4.5, "tags": ["Peptides", "Capsules", "Nasal Spray"],
         "discount_code": "ERICA", "featured": False},
        {"name": "Fusion Peptide", "slug": "fusion-peptide",
         "description": "Research-grade peptides with consistent QC.",
         "affiliate_url": "https://fusionpeptide.com/?ref=erica",
         "logo_url": "https://www.google.com/s2/favicons?domain=fusionpeptide.com&sz=128",
         "rating": 4.4, "tags": ["Peptides"],
         "discount_code": "ERICA", "promo_badge": "BOGO", "featured": False},
        {"name": "Tcore Bio Tech", "slug": "tcore-bio-tech",
         "description": "Biotech-grade research peptides.",
         "affiliate_url": "https://tcorebiotech.com/?ref=erica",
         "logo_url": "https://www.google.com/s2/favicons?domain=tcorebiotech.com&sz=128",
         "rating": 4.4, "tags": ["Peptides", "Biotech"],
         "discount_code": "ERICA20", "featured": False},
        {"name": "True Peptide Labs", "slug": "true-peptide-labs",
         "description": "Lab-tested peptides for research applications.",
         "affiliate_url": "https://truepeptidelabs.com/?ref=glpgirly",
         "logo_url": "https://www.google.com/s2/favicons?domain=truepeptidelabs.com&sz=128",
         "rating": 4.5, "tags": ["Peptides", "Tested"],
         "discount_code": "ERICA15", "featured": False},

        # ───── Skin Care ─────
        {"name": "Scantifix", "slug": "scantifix",
         "description": "Raw peptide skin care and microneedling pens.",
         "affiliate_url": "https://www.scantifix.com?sca_ref=9118700.xZuOQ8i17C",
         "logo_url": "https://www.google.com/s2/favicons?domain=scantifix.com&sz=128",
         "rating": 4.6, "tags": ["Skin Care", "Peptides", "Microneedling"],
         "discount_code": "ERICA", "featured": True},
        {"name": "Routine Skin", "slug": "routine-skin",
         "description": "GHK-Cu 5% serums and creams for skin renewal.",
         "affiliate_url": "https://www.routineskin.com/ericascorsur",
         "logo_url": "https://www.google.com/s2/favicons?domain=routineskin.com&sz=128",
         "rating": 4.6, "tags": ["Skin Care", "GHK-Cu"],
         "discount_code": "ERICA10", "featured": False},
        {"name": "Auro Wellness", "slug": "auro-wellness",
         "description": "Topical Glutathione (Glutaryl, Auro GSH) — supports detox, immune function, mitochondrial energy, and defends skin from oxidative stress.",
         "affiliate_url": "https://aurowellness.com/ref/10361483",
         "logo_url": "https://www.google.com/s2/favicons?domain=aurowellness.com&sz=128",
         "rating": 4.7, "tags": ["Skin Care", "Glutathione", "Wellness"],
         "discount_code": "ERICA", "featured": True},

        # ───── Supplements ─────
        {"name": "Take Ploom", "slug": "take-ploom",
         "description": "GLP-1 support supplements.",
         "affiliate_url": "https://www.takeploom.com/ERICA10",
         "logo_url": "https://www.google.com/s2/favicons?domain=takeploom.com&sz=128",
         "rating": 4.5, "tags": ["Supplements", "GLP-1"],
         "discount_code": "ERICA10", "featured": True, "comparison_enabled": False},
        {"name": "BelliWelli", "slug": "belliwelli",
         "description": "Gut-friendly snacks and supplements.",
         "affiliate_url": "https://belliwelli.com/SFXBWYBY",
         "logo_url": "https://www.google.com/s2/favicons?domain=belliwelli.com&sz=128",
         "rating": 4.4, "tags": ["Supplements", "Gut Health"],
         "discount_code": "SFXBWYBY", "featured": False, "comparison_enabled": False},
        {"name": "Moon Brew", "slug": "moon-brew",
         "description": "Functional mushroom + adaptogen brews.",
         "affiliate_url": "https://moonbrew.co/SFRM3XWP",
         "logo_url": "https://www.google.com/s2/favicons?domain=moonbrew.co&sz=128",
         "rating": 4.5, "tags": ["Supplements", "Mushroom", "Adaptogen"],
         "discount_code": "SFRM3XWP", "featured": False},
        {"name": "Ryze Mushroom Coffee", "slug": "ryze-mushroom-coffee",
         "description": "Mushroom coffee blend — link saves 15% off.",
         "affiliate_url": "https://get.aspr.app/SH1dHj",
         "logo_url": "https://www.google.com/s2/favicons?domain=ryzesuperfoods.com&sz=128",
         "rating": 4.6, "tags": ["Supplements", "Mushroom", "Coffee"],
         "discount_code": "", "featured": True, "comparison_enabled": False},

        # ───── Clothes ─────
        {"name": "Comfrt", "slug": "comfrt",
         "description": "Comfort-focused everyday clothing.",
         "affiliate_url": "https://comfrt.com/ERICA947",
         "logo_url": "https://www.google.com/s2/favicons?domain=comfrt.com&sz=128",
         "rating": 4.5, "tags": ["Clothes"],
         "discount_code": "ERICA947", "featured": False},
    ]

    vendor_ids = {}
    inserted_vendor = 0
    for v in vendors:
        existing = await db.vendors.find_one({"slug": v["slug"]}, {"id": 1, "_id": 0})
        if existing:
            vendor_ids[v["slug"]] = existing["id"]
            continue
        obj = Vendor(**v)
        await db.vendors.insert_one(obj.model_dump())
        vendor_ids[v["slug"]] = obj.id
        inserted_vendor += 1

    peptides = [
        {"name": "BPC-157", "slug": "bpc-157", "description": "Body Protective Compound for tissue repair research.",
         "typical_dose_mcg": 250, "category": "Healing"},
        {"name": "TB-500", "slug": "tb-500", "description": "Thymosin Beta-4 fragment for tissue regeneration research.",
         "typical_dose_mcg": 2000, "category": "Healing"},
        {"name": "Semaglutide", "slug": "semaglutide", "description": "GLP-1 agonist for metabolic research.",
         "typical_dose_mcg": 250, "category": "Metabolic"},
        {"name": "Tirzepatide", "slug": "tirzepatide", "description": "Dual GIP/GLP-1 agonist for metabolic research.",
         "typical_dose_mcg": 2500, "category": "Metabolic"},
        {"name": "Ipamorelin", "slug": "ipamorelin", "description": "Selective GH secretagogue.",
         "typical_dose_mcg": 200, "category": "GH"},
        {"name": "CJC-1295 No-DAC", "slug": "cjc-1295", "description": "GHRH analog without DAC modification.",
         "typical_dose_mcg": 100, "category": "GH"},
    ]
    peptide_ids = {}
    inserted_peptide = 0
    for p in peptides:
        existing = await db.peptides.find_one({"slug": p["slug"]}, {"id": 1, "_id": 0})
        if existing:
            peptide_ids[p["slug"]] = existing["id"]
            continue
        obj = Peptide(**p)
        await db.peptides.insert_one(obj.model_dump())
        peptide_ids[p["slug"]] = obj.id
        inserted_peptide += 1

    # Sample price seeding was removed along with the legacy sample vendors.
    # User can add their own peptide prices via the Admin → Prices panel.
    resources = [
        {"title": "Guide to Peptide Protocols",
         "category": "Protocols",
         "summary": "A comprehensive collection of research peptide protocols covering dosing schedules, reconstitution methods, and stacking strategies. A practical reference when planning research protocols.",
         "url": "https://guidetopeptide.com/peptide-protocols/", "content": ""},
        {"title": "Pep-Pedia",
         "category": "Encyclopedia",
         "summary": "An open encyclopedia covering peptide chemistry, mechanisms of action, and research applications. Easy to navigate when learning about a new compound.",
         "url": "https://pep-pedia.org/", "content": ""},
        {"title": "Peptide Wiki",
         "category": "Reference",
         "summary": "A community-driven wiki documenting peptides, their properties, and current research literature. Great for cross-referencing information from multiple sources.",
         "url": "https://peptidewiki.co/", "content": ""},
        {"title": "Peptide Dosages",
         "category": "Dosing",
         "summary": "A dedicated reference for research peptide dosage ranges, frequency, and cycle considerations. Useful when cross-checking dosing protocols across compounds.",
         "url": "https://peptidedosages.com/", "content": ""},
        {"title": "Peptide Supply Lists",
         "category": "Supplies",
         "summary": "A curated Amazon shopping list of everyday peptide research supplies \u2014 syringes, alcohol swabs, sharps containers, bac water storage, and more. Updated regularly with field-tested favorites.",
         "url": "https://www.amazon.com/shop/digitalcodeerica/list/384HS5OUV0ZU2?ref_=aipsflist",
         "content": ""},
        {"title": "Peppy Pens",
         "category": "Tools",
         "summary": "Refillable peptide injection pens designed for research use \u2014 precise dosing, reusable cartridges, and a cleaner alternative to traditional vials and syringes.",
         "url": "https://www.peppypens.com/", "content": ""},
        {"title": "My Peptide Community \u2014 Erica\u2019s Elevated Life",
         "category": "Community",
         "summary": "A private peer community led by Erica focused on peptide education, real-world experience sharing, live Q&A, and ongoing support. Join the conversation.",
         "url": "https://www.skool.com/ericas-elevated-life-9005", "content": ""},
    ]
    inserted_resource = 0
    for r in resources:
        existing = await db.resources.find_one({"title": r["title"]}, {"id": 1, "_id": 0})
        if existing:
            continue
        obj = Resource(**r)
        await db.resources.insert_one(obj.model_dump())
        inserted_resource += 1

    logger.info(f"Seed complete. Inserted: {inserted_vendor} vendors, "
                f"{inserted_peptide} peptides, {inserted_resource} resources.")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.vendors.create_index("slug")
    await db.peptides.create_index("slug")
    await seed_admin()
    await seed_sample_data()


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------------- Register router & middleware ----------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
