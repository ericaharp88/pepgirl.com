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


class VendorLoginConfig(BaseModel):
    login_url: str = ""
    username: str = ""
    password: str = ""
    username_selector: str = ""  # optional CSS selector; blank = auto-detect
    password_selector: str = ""
    submit_selector: str = ""


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
    nickname_notes: str = ""  # peptide nickname/codex guide — visible to visitors
    login_config: Optional[VendorLoginConfig] = None  # optional scraper login
    featured: bool = False
    comparison_enabled: bool = True
    order: int = 0  # ascending — lower shows first (0 = unset, treated as bottom)
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
    nickname_notes: str = ""
    login_config: Optional[VendorLoginConfig] = None
    featured: bool = False
    comparison_enabled: bool = True
    order: int = 0


class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    summary: str = ""
    url: str = ""
    content: str = ""
    order: int = 0  # ascending — lower shows first
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ResourceIn(BaseModel):
    title: str
    category: str
    summary: str = ""
    url: str = ""
    content: str = ""
    order: int = 0


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


class Subscriber(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    source: str = "home_newsletter"
    exported: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SubscriberIn(BaseModel):
    email: str
    source: str = "home_newsletter"


class PeptideIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    typical_dose_mcg: float = 0.0
    category: str = ""


class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author: str
    quote: str
    rating: int = 5  # 1-5
    location: str = ""  # optional (e.g., "Skool member")
    order: int = 0
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReviewIn(BaseModel):
    author: str
    quote: str
    rating: int = 5
    location: str = ""
    order: int = 0
    active: bool = True


class PriceEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    peptide_id: str
    vendor_id: str
    size_mg: float
    price_usd: float
    form: str = "vial"  # vial | capsule | liquid | skincare | aminos
    available: bool = True
    product_url: str = ""
    display_label: str = ""  # vendor-specific nickname / title override
    scrape_selector: str = ""  # CSS selector for scraping
    last_scraped: Optional[str] = None
    last_status: str = "manual"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PriceEntryIn(BaseModel):
    peptide_id: str
    vendor_id: str
    size_mg: float
    price_usd: float = 0.0
    form: str = "vial"
    available: bool = True
    product_url: str = ""
    display_label: str = ""
    scrape_selector: str = ""


class Promotion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    promo_code: str
    discount_percent: float = 0.0  # 10 = 10% off
    description: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PromotionIn(BaseModel):
    vendor_id: str
    promo_code: str
    discount_percent: float = 0.0
    description: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active: bool = True


class SiteSettings(BaseModel):
    """Feature flags & site-wide toggles. Single-doc collection."""
    price_tool_enabled: bool = True
    community_bar_enabled: bool = True
    community_bar_url: str = "https://www.skool.com/ericas-elevated-life-9005"
    community_bar_message: str = "Join The Optimized Society community"
    community_bar_price: str = "$3 one-time"
    community_bar_cta: str = "Join now"
    home_hero_eyebrow: str = "Peptide Education · Wellness · Community"
    home_hero_title: str = "Optimize your health. Elevate your life."
    home_hero_intro: str = "I'm Erica. After losing 90 pounds on GLP-1 peptides, I built this corner of the internet to share the vendors, protocols, and tools that actually move the needle — nothing gate-kept."
    home_meet_title: str = ""
    home_meet_body: str = "Eleven years ago I chose weight-loss surgery. The weight came back. On June 1, 2025 I found GLP-1 peptides and everything changed. Now I share every vendor, code, and protocol I use."
    home_stat_1_value: str = "−90 lbs"
    home_stat_1_label: str = "My peptide journey"
    home_stat_2_value: str = "150+"
    home_stat_2_label: str = "Vendor codes curated"
    home_stat_3_value: str = "3"
    home_stat_3_label: str = "Free calculators & tools"
    home_newsletter_title: str = "Peptide education + exclusive deals every week."
    home_newsletter_body: str = "Practical protocols, research you can use, and vendor discounts — delivered free."
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


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
async def list_vendors(request: Request):
    # Sort: manual order (asc, 0 = unset), then featured, then name
    docs = await db.vendors.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (
        d.get("order") or 999999,
        0 if d.get("featured") else 1,
        (d.get("name") or "").lower(),
    ))
    # Strip sensitive login_config unless caller is an authenticated admin
    is_admin = False
    try:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split()[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            email = (payload.get("email") or "").lower()
            admin_email = (os.environ.get("ADMIN_EMAIL") or "admin@peptidehub.com").lower()
            is_admin = email == admin_email
    except Exception:
        is_admin = False
    if not is_admin:
        for d in docs:
            d["login_config"] = None
    return docs


@api_router.post("/vendors", response_model=Vendor)
async def create_vendor(payload: VendorIn, admin: dict = Depends(get_current_admin)):
    # Auto-assign order if not set — put new vendors at the bottom
    data = payload.model_dump()
    if not data.get("order"):
        last = await db.vendors.find({}, {"order": 1}).sort("order", -1).limit(1).to_list(1)
        data["order"] = ((last[0].get("order") or 0) + 10) if last else 10
    obj = Vendor(**data)
    await db.vendors.insert_one(obj.model_dump())
    return obj


class ReorderVendors(BaseModel):
    ids: List[str]


@api_router.post("/vendors/reorder")
async def reorder_vendors(payload: ReorderVendors, admin: dict = Depends(get_current_admin)):
    """Set order field on all provided ids based on their position (10, 20, 30, ...)."""
    for idx, vid in enumerate(payload.ids):
        await db.vendors.update_one({"id": vid}, {"$set": {"order": (idx + 1) * 10}})
    return {"ok": True, "count": len(payload.ids)}


@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, payload: VendorIn, admin: dict = Depends(get_current_admin)):
    result = await db.vendors.update_one({"id": vendor_id}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    return doc


@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, admin: dict = Depends(get_current_admin)):
    # Tombstone the vendor so the startup seeder can't resurrect it on restart/redeploy.
    doc = await db.vendors.find_one({"id": vendor_id}, {"_id": 0, "slug": 1, "name": 1})
    if doc and doc.get("slug"):
        await db.deleted_seeds.update_one(
            {"kind": "vendor", "slug": doc["slug"]},
            {"$set": {"kind": "vendor", "slug": doc["slug"], "name": doc.get("name", ""),
                      "deleted_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    await db.vendors.delete_one({"id": vendor_id})
    # Cascade: prices AND any active promotions for this vendor
    await db.prices.delete_many({"vendor_id": vendor_id})
    await db.promotions.delete_many({"vendor_id": vendor_id})
    return {"ok": True}


@api_router.post("/vendors/{vendor_id}/test-login")
async def test_vendor_login(vendor_id: str, admin: dict = Depends(get_current_admin)):
    """Attempt to log in to this vendor's site with the stored credentials.
    Returns a success flag + short message + base64 screenshot for debugging.
    """
    doc = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Vendor not found")
    lc = doc.get("login_config") or {}
    if not (lc.get("login_url") and lc.get("username") and lc.get("password")):
        raise HTTPException(status_code=400,
                            detail="This vendor has no login config yet — add login_url + username + password first.")
    from scraper import playwright_test_login
    result = await playwright_test_login(lc)
    return result


# ---------------- Resources ----------------
@api_router.get("/resources")
async def list_resources():
    # Sort by order (asc) then created_at as tiebreaker
    return await db.resources.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).to_list(500)


@api_router.post("/resources", response_model=Resource)
async def create_resource(payload: ResourceIn, admin: dict = Depends(get_current_admin)):
    # Auto-assign next order if not set
    if not payload.order:
        last = await db.resources.find({}, {"order": 1}).sort("order", -1).limit(1).to_list(1)
        payload.order = ((last[0].get("order") or 0) + 10) if last else 10
    obj = Resource(**payload.model_dump())
    await db.resources.insert_one(obj.model_dump())
    return obj


class ReorderResources(BaseModel):
    ids: List[str]  # in the desired order


@api_router.post("/resources/reorder")
async def reorder_resources(payload: ReorderResources, admin: dict = Depends(get_current_admin)):
    """Set order field on all provided ids based on their position (10, 20, 30, ...)."""
    for idx, rid in enumerate(payload.ids):
        await db.resources.update_one({"id": rid}, {"$set": {"order": (idx + 1) * 10}})
    return {"ok": True, "count": len(payload.ids)}


@api_router.put("/resources/{rid}")
async def update_resource(rid: str, payload: ResourceIn, admin: dict = Depends(get_current_admin)):
    result = await db.resources.update_one({"id": rid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.resources.find_one({"id": rid}, {"_id": 0})


@api_router.delete("/resources/{rid}")
async def delete_resource(rid: str, admin: dict = Depends(get_current_admin)):
    # Remember the title so the startup seeder won't re-insert it on next restart.
    doc = await db.resources.find_one({"id": rid}, {"_id": 0, "title": 1})
    if doc and doc.get("title"):
        await db.deleted_seeds.update_one(
            {"kind": "resource", "title": doc["title"]},
            {"$set": {"kind": "resource", "title": doc["title"], "deleted_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    await db.resources.delete_one({"id": rid})
    return {"ok": True}


# ---------------- Newsletter subscribers ----------------
@api_router.post("/subscribers")
async def create_subscriber(payload: SubscriberIn):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    existing = await db.subscribers.find_one({"email": email}, {"_id": 1})
    if existing:
        return {"ok": True, "already_subscribed": True}
    obj = Subscriber(email=email, source=payload.source or "home_newsletter")
    await db.subscribers.insert_one(obj.model_dump())
    return {"ok": True, "already_subscribed": False}


@api_router.get("/subscribers")
async def list_subscribers(admin: dict = Depends(get_current_admin)):
    docs = await db.subscribers.find({}, {"_id": 0}).to_list(5000)
    docs.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    return docs


@api_router.get("/subscribers/export.csv")
async def export_subscribers_csv(admin: dict = Depends(get_current_admin), mark_exported: bool = True):
    """CSV formatted for Beacons.ai import (email column). Optionally marks rows as exported."""
    docs = await db.subscribers.find({}, {"_id": 0}).to_list(10000)
    docs.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    lines = ["email,subscribed_at,source"]
    ids = []
    for d in docs:
        lines.append(f"{d.get('email','')},{d.get('created_at','')},{d.get('source','')}")
        ids.append(d.get("id"))
    if mark_exported and ids:
        await db.subscribers.update_many({"id": {"$in": ids}}, {"$set": {"exported": True}})
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=beacons-subscribers.csv"},
    )


@api_router.delete("/subscribers/{sid}")
async def delete_subscriber(sid: str, admin: dict = Depends(get_current_admin)):
    await db.subscribers.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Reviews (customer testimonials) ----------------
@api_router.get("/reviews")
async def list_reviews():
    docs = await db.reviews.find({"active": True}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda d: (d.get("order") or 999999, d.get("created_at") or ""))
    return docs


@api_router.get("/reviews/all")
async def list_reviews_admin(admin: dict = Depends(get_current_admin)):
    docs = await db.reviews.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (d.get("order") or 999999, d.get("created_at") or ""))
    return docs


@api_router.post("/reviews", response_model=Review)
async def create_review(payload: ReviewIn, admin: dict = Depends(get_current_admin)):
    data = payload.model_dump()
    if not data.get("order"):
        last = await db.reviews.find({}, {"order": 1}).sort("order", -1).limit(1).to_list(1)
        data["order"] = ((last[0].get("order") or 0) + 10) if last else 10
    obj = Review(**data)
    await db.reviews.insert_one(obj.model_dump())
    return obj


@api_router.put("/reviews/{rid}")
async def update_review(rid: str, payload: ReviewIn, admin: dict = Depends(get_current_admin)):
    result = await db.reviews.update_one({"id": rid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.reviews.find_one({"id": rid}, {"_id": 0})


@api_router.delete("/reviews/{rid}")
async def delete_review(rid: str, admin: dict = Depends(get_current_admin)):
    await db.reviews.delete_one({"id": rid})
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


class PeptideMergeRequest(BaseModel):
    keep_id: str
    merge_ids: List[str]


@api_router.post("/peptides/merge")
async def merge_peptides(payload: PeptideMergeRequest, admin: dict = Depends(get_current_admin)):
    """Merge one or more peptides INTO the keep_id peptide.
    - Moves all prices from merge_ids to keep_id.
    - Absorbs aliases + name of merged peptides into keep_id's aliases (deduped).
    - Deletes the merged peptides.
    """
    keep_id = payload.keep_id
    merge_ids = [m for m in payload.merge_ids if m and m != keep_id]
    if not merge_ids:
        raise HTTPException(status_code=400, detail="No peptides to merge")

    keep = await db.peptides.find_one({"id": keep_id}, {"_id": 0})
    if not keep:
        raise HTTPException(status_code=404, detail="Keep peptide not found")

    absorbed_docs = await db.peptides.find({"id": {"$in": merge_ids}}, {"_id": 0}).to_list(500)
    if not absorbed_docs:
        raise HTTPException(status_code=404, detail="Merge peptides not found")

    # Absorb aliases + name
    aliases = set(keep.get("aliases") or [])
    for d in absorbed_docs:
        if d.get("name") and d["name"].lower() != (keep.get("name") or "").lower():
            aliases.add(d["name"])
        for a in (d.get("aliases") or []):
            if a and a.lower() != (keep.get("name") or "").lower():
                aliases.add(a)

    # Move all prices from merged peptides → keep
    move_result = await db.prices.update_many(
        {"peptide_id": {"$in": merge_ids}},
        {"$set": {"peptide_id": keep_id}},
    )

    # Update keep with new aliases
    await db.peptides.update_one({"id": keep_id}, {"$set": {"aliases": sorted(aliases)}})

    # Delete merged peptides
    del_result = await db.peptides.delete_many({"id": {"$in": merge_ids}})

    return {
        "ok": True,
        "kept": keep.get("name"),
        "merged": [d.get("name") for d in absorbed_docs],
        "prices_moved": move_result.modified_count,
        "peptides_removed": del_result.deleted_count,
        "aliases": sorted(aliases),
    }


# ---------------- Prices ----------------
@api_router.get("/prices")
async def list_prices():
    prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    return prices


@api_router.post("/prices", response_model=PriceEntry)
async def create_price(payload: PriceEntryIn, admin: dict = Depends(get_current_admin)):
    obj = PriceEntry(**payload.model_dump())
    await db.prices.insert_one(obj.model_dump())
    # Log to price_history
    if obj.price_usd > 0:
        await db.price_history.insert_one({
            "id": str(uuid.uuid4()),
            "price_id": obj.id,
            "peptide_id": obj.peptide_id,
            "vendor_id": obj.vendor_id,
            "size_mg": obj.size_mg,
            "price_usd": obj.price_usd,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        })
    return obj


@api_router.put("/prices/{pid}")
async def update_price(pid: str, payload: PriceEntryIn, admin: dict = Depends(get_current_admin)):
    old = await db.prices.find_one({"id": pid}, {"_id": 0})
    updates = payload.model_dump()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.prices.update_one({"id": pid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    # Log price change to history when price changed
    if old and old.get("price_usd") != updates.get("price_usd"):
        await db.price_history.insert_one({
            "id": str(uuid.uuid4()),
            "price_id": pid,
            "peptide_id": updates["peptide_id"],
            "vendor_id": updates["vendor_id"],
            "size_mg": updates["size_mg"],
            "price_usd": updates["price_usd"],
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        })
    return await db.prices.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/prices/{pid}")
async def delete_price(pid: str, admin: dict = Depends(get_current_admin)):
    await db.prices.delete_one({"id": pid})
    return {"ok": True}


@api_router.get("/prices/{pid}/history")
async def price_history(pid: str):
    docs = await db.price_history.find({"price_id": pid}, {"_id": 0}).sort("recorded_at", -1).to_list(500)
    return docs


# ---------------- Promotions ----------------
@api_router.get("/promotions")
async def list_promotions():
    """Public — returns all promotions (frontend filters active ones)."""
    docs = await db.promotions.find({}, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/promotions", response_model=Promotion)
async def create_promotion(payload: PromotionIn, admin: dict = Depends(get_current_admin)):
    obj = Promotion(**payload.model_dump())
    await db.promotions.insert_one(obj.model_dump())
    return obj


@api_router.put("/promotions/{pid}")
async def update_promotion(pid: str, payload: PromotionIn, admin: dict = Depends(get_current_admin)):
    result = await db.promotions.update_one({"id": pid}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.promotions.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/promotions/{pid}")
async def delete_promotion(pid: str, admin: dict = Depends(get_current_admin)):
    await db.promotions.delete_one({"id": pid})
    return {"ok": True}


# ---------------- Site Settings ----------------
@api_router.get("/settings")
async def get_settings():
    """Public — returns feature flags used by the frontend."""
    doc = await db.settings.find_one({"_id": "site"}, {"_id": 0})
    defaults = SiteSettings().model_dump()
    if not doc:
        return defaults
    return {
        "price_tool_enabled": doc.get("price_tool_enabled", defaults["price_tool_enabled"]),
        "community_bar_enabled": doc.get("community_bar_enabled", defaults["community_bar_enabled"]),
        "community_bar_url": doc.get("community_bar_url", defaults["community_bar_url"]),
        "community_bar_message": doc.get("community_bar_message", defaults["community_bar_message"]),
        "community_bar_price": doc.get("community_bar_price", defaults["community_bar_price"]),
        "community_bar_cta": doc.get("community_bar_cta", defaults["community_bar_cta"]),
        "home_hero_eyebrow": doc.get("home_hero_eyebrow", defaults["home_hero_eyebrow"]),
        "home_hero_title": doc.get("home_hero_title", defaults["home_hero_title"]),
        "home_hero_intro": doc.get("home_hero_intro", defaults["home_hero_intro"]),
        "home_meet_title": doc.get("home_meet_title", defaults["home_meet_title"]),
        "home_meet_body": doc.get("home_meet_body", defaults["home_meet_body"]),
        "home_stat_1_value": doc.get("home_stat_1_value", defaults["home_stat_1_value"]),
        "home_stat_1_label": doc.get("home_stat_1_label", defaults["home_stat_1_label"]),
        "home_stat_2_value": doc.get("home_stat_2_value", defaults["home_stat_2_value"]),
        "home_stat_2_label": doc.get("home_stat_2_label", defaults["home_stat_2_label"]),
        "home_stat_3_value": doc.get("home_stat_3_value", defaults["home_stat_3_value"]),
        "home_stat_3_label": doc.get("home_stat_3_label", defaults["home_stat_3_label"]),
        "home_newsletter_title": doc.get("home_newsletter_title", defaults["home_newsletter_title"]),
        "home_newsletter_body": doc.get("home_newsletter_body", defaults["home_newsletter_body"]),
        "updated_at": doc.get("updated_at"),
    }


class SettingsIn(BaseModel):
    price_tool_enabled: bool = True
    community_bar_enabled: bool = True
    community_bar_url: str = "https://www.skool.com/ericas-elevated-life-9005"
    community_bar_message: str = "Join The Optimized Society community"
    community_bar_price: str = "$3 one-time"
    community_bar_cta: str = "Join now"
    home_hero_eyebrow: str = ""
    home_hero_title: str = ""
    home_hero_intro: str = ""
    home_meet_title: str = ""
    home_meet_body: str = ""
    home_stat_1_value: str = ""
    home_stat_1_label: str = ""
    home_stat_2_value: str = ""
    home_stat_2_label: str = ""
    home_stat_3_value: str = ""
    home_stat_3_label: str = ""
    home_newsletter_title: str = ""
    home_newsletter_body: str = ""


@api_router.put("/settings")
async def update_settings(payload: SettingsIn, admin: dict = Depends(get_current_admin)):
    updates = {
        "price_tool_enabled": payload.price_tool_enabled,
        "community_bar_enabled": payload.community_bar_enabled,
        "community_bar_url": payload.community_bar_url.strip(),
        "community_bar_message": payload.community_bar_message.strip(),
        "community_bar_price": payload.community_bar_price.strip(),
        "community_bar_cta": payload.community_bar_cta.strip(),
        "home_hero_eyebrow": payload.home_hero_eyebrow.strip(),
        "home_hero_title": payload.home_hero_title.strip(),
        "home_hero_intro": payload.home_hero_intro.strip(),
        "home_meet_title": payload.home_meet_title.strip(),
        "home_meet_body": payload.home_meet_body.strip(),
        "home_stat_1_value": payload.home_stat_1_value.strip(),
        "home_stat_1_label": payload.home_stat_1_label.strip(),
        "home_stat_2_value": payload.home_stat_2_value.strip(),
        "home_stat_2_label": payload.home_stat_2_label.strip(),
        "home_stat_3_value": payload.home_stat_3_value.strip(),
        "home_stat_3_label": payload.home_stat_3_label.strip(),
        "home_newsletter_title": payload.home_newsletter_title.strip(),
        "home_newsletter_body": payload.home_newsletter_body.strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.settings.update_one({"_id": "site"}, {"$set": updates}, upsert=True)
    return {"ok": True, **updates}


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
    # Strip sensitive login_config from public payload
    for v in vendors:
        if "login_config" in v:
            v["login_config"] = None
    vendor_ids = {v["id"] for v in vendors}
    all_prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    prices = [p for p in all_prices if p["vendor_id"] in vendor_ids]
    # Only return peptides that actually have at least one price across enabled vendors
    used_pep_ids = {p["peptide_id"] for p in prices}
    peptides = [p for p in peptides if p["id"] in used_pep_ids]

    # Active promotions (filtered by end_date and active flag)
    now_iso = datetime.now(timezone.utc).isoformat()
    all_promos = await db.promotions.find({}, {"_id": 0}).to_list(500)
    active_promos = [
        p for p in all_promos
        if p.get("active", True)
        and (not p.get("end_date") or p["end_date"] > now_iso)
        and (not p.get("start_date") or p["start_date"] <= now_iso)
        and p.get("vendor_id") in vendor_ids
    ]

    return {
        "peptides": peptides,
        "vendors": vendors,
        "prices": prices,
        "promotions": active_promos,
    }


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


# ---------------- SEO (mounted on main app, NOT /api) ----------------
SITE_URL = os.environ.get("SITE_URL", "https://optimizedsociety.com")
SEO_ROUTES = ["", "/vendors", "/calculator", "/compare", "/resources"]


@app.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /login\n"
        "Disallow: /api/\n\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )
    return Response(content=body, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = []

    # Core static routes
    for path in SEO_ROUTES:
        priority = "1.0" if path == "" else "0.8"
        changefreq = "daily" if path == "/compare" else "weekly"
        urls.append(
            f"  <url>\n"
            f"    <loc>{SITE_URL}{path or '/'}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    # Per-peptide deep links (only ones that actually have prices, so Google
    # doesn't crawl empty pages)
    try:
        vendor_docs = await db.vendors.find(
            {"$or": [{"comparison_enabled": True},
                     {"comparison_enabled": {"$exists": False}}]},
            {"_id": 0, "id": 1}
        ).to_list(500)
        vendor_ids = {v["id"] for v in vendor_docs}
        all_prices = await db.prices.find({}, {"_id": 0, "peptide_id": 1, "vendor_id": 1, "price_usd": 1}).to_list(5000)
        used_pep_ids = {
            p["peptide_id"] for p in all_prices
            if p.get("vendor_id") in vendor_ids and (p.get("price_usd") or 0) > 0
        }
        peptides = await db.peptides.find({"id": {"$in": list(used_pep_ids)}}, {"_id": 0, "name": 1}).to_list(1000)
        for p in peptides:
            slug = re.sub(r"[^a-z0-9]+", "-", (p.get("name") or "").lower()).strip("-")
            if not slug:
                continue
            urls.append(
                f"  <url>\n"
                f"    <loc>{SITE_URL}/compare?peptide={slug}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>0.7</priority>\n"
                f"  </url>"
            )
    except Exception as e:
        logger.warning(f"sitemap: failed to enumerate peptides ({e})")

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(content=body, media_type="application/xml")


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

    # ───── Permanently-banned vendors (auto-deleted on every startup) ─────
    banned_slugs = ["fusion-peptide", "tcore-bio-tech", "true-peptide-labs"]
    banned_docs = await db.vendors.find({"slug": {"$in": banned_slugs}}, {"id": 1, "_id": 0}).to_list(50)
    if banned_docs:
        banned_ids = [d["id"] for d in banned_docs]
        await db.prices.delete_many({"vendor_id": {"$in": banned_ids}})
        del_res = await db.vendors.delete_many({"slug": {"$in": banned_slugs}})
        logger.info(f"Removed {del_res.deleted_count} permanently-banned vendors and their prices.")

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
    # Garbage-collect peptides that no longer have any price.
    # Protect the 6 canonical seeded peptide slugs so they don't get
    # vacuumed away and re-inserted on every restart.
    CANON_SEED_SLUGS = ["bpc-157", "tb-500", "semaglutide", "tirzepatide", "ipamorelin", "cjc-1295"]
    used_pep_ids = await db.prices.distinct("peptide_id")
    orphan = await db.peptides.delete_many({
        "id": {"$nin": used_pep_ids},
        "slug": {"$nin": CANON_SEED_SLUGS},
    })
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
         "description": "1 FREE bac water with every order. Felix Friday deals every Friday.",
         "affiliate_url": "https://felixchem.is/refer/8220/",
         "logo_url": "https://www.google.com/s2/favicons?domain=felixchem.is&sz=128",
         "rating": 4.6, "tags": ["Peptides", "BAC Water", "7x Tested"],
         "discount_code": "ERICAS10", "promo_badge": "FREE BAC water", "featured": True},
        {"name": "Glow Aminos", "slug": "glow-aminos",
         "description": "Curated peptide selection with member savings.",
         "affiliate_url": "https://glowaminos.com/?ref=195",
         "logo_url": "https://www.google.com/s2/favicons?domain=glowaminos.com&sz=128",
         "rating": 4.5, "tags": ["Peptides", "7x Tested"],
         "discount_code": "ERICA", "featured": False},
        {"name": "Peptide Tech", "slug": "peptide-tech",
         "description": "Research peptides — 8x tested, 99%+ pure.",
         "affiliate_url": "https://peptidetech.co/?ref=jrmrcamc&utm_source=affiliate",
         "logo_url": "https://www.google.com/s2/favicons?domain=peptidetech.co&sz=128",
         "rating": 4.8, "tags": ["Peptides", "Tested", "High Purity", "7x Tested"],
         "discount_code": "ERICA", "featured": True},
        {"name": "Modified Aminos", "slug": "modified-aminos",
         "description": "Capsules & nasal sprays — alternative delivery formats.",
         "affiliate_url": "https://modifiedaminos.shop/?ref=ERICA",
         "logo_url": "https://www.google.com/s2/favicons?domain=modifiedaminos.shop&sz=128",
         "rating": 4.5, "tags": ["Peptides", "Capsules", "Nasal Spray", "7x Tested"],
         "discount_code": "ERICA", "featured": False},
        {"name": "Solas Science", "slug": "solas-science",
         "description": "Research-grade peptides — 7-parameter tested (purity, sterility, endotoxin, heavy metals, identity, net content, fentanyl). 99%+ purity, U.S. based, same/next-day shipping.",
         "affiliate_url": "https://solasscience.shop/",
         "logo_url": "https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/5g7jm9be_Logo-Design_page-0001-scaled-e1776484349549.webp",
         "rating": 4.4, "tags": ["Peptides", "7x Tested", "USA", "COA"],
         "discount_code": "ERICA", "featured": True},
        {"name": "Celmade", "slug": "celmade",
         "description": "Peptide skin-care & wellness formulations.",
         "affiliate_url": "https://celmade.com/",
         "logo_url": "https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/kye8uuoj_fgqdxddx.jpeg",
         "rating": 4.6, "tags": ["Skin Care", "Peptides"],
         "discount_code": "ERICA", "featured": True},

        # ───── Peptides (research vendors, tail of list) ─────
        {"name": "IronWithin Research", "slug": "ironwithin",
         "description": "Research-grade peptides with focus on purity and precise dosing.",
         "affiliate_url": "https://www.ironwithin.io/",
         "logo_url": "https://www.google.com/s2/favicons?domain=ironwithin.io&sz=128",
         "rating": 4.8, "tags": ["Peptides", "Research"],
         "discount_code": "ERICA", "featured": False},
        {"name": "Vector Research", "slug": "vector-research",
         "description": "High-purity peptides for laboratory use.",
         "affiliate_url": "https://vectorresearch.io/",
         "logo_url": "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/6ebayqia_bec54a23-50e3-4a1e-89ac-f49aa1d356e3.png",
         "rating": 4.7, "tags": ["Peptides", "Research"],
         "discount_code": "ERICA", "featured": False},

        # ───── Skin Care ─────
        {"name": "RE:SEQ", "slug": "re-seq",
         "description": "Regenerative peptide science for skin — GHK-Cu, AHK-Cu, Synake, and multi-peptide formulas. Face, body, hair, and lip.",
         "affiliate_url": "https://reseq.io/?ref=ERICA",
         "logo_url": "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/wa4m27i2_22705d52-022b-45aa-9109-3a305f9c90fa.png",
         "rating": 5.0, "tags": ["Skin Care", "Peptides", "GHK-Cu", "Copper Peptides"],
         "discount_code": "ERICA", "featured": True, "promo_badge": "PRE-ORDER",
         "order": 1,
         "nickname_notes": "GHK-Cu = Copper Tripeptide-1\nAHK-Cu = Complex\nSynake = Dipeptide Diaminobutyroyl Benzylamide Diacetate\nSNAP-8 = Acetyl Octapeptide-3"},
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
        # Skip if the admin deleted this vendor slug — never resurrect.
        killed = await db.deleted_seeds.find_one({"kind": "vendor", "slug": v["slug"]}, {"_id": 1})
        if killed:
            continue
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
        {"title": "How to Read a COA",
         "category": "Guide",
         "summary": "A step-by-step breakdown of what to look for on a peptide Certificate of Analysis \u2014 HPLC purity, mass spec, bioburden, and how to spot a clean COA from a sketchy one.",
         "url": "https://peptidewiki.co/guides/peptide-quality-purity-coa-guide",
         "content": ""},
        {"title": "My Peptide Community \u2014 Erica\u2019s Elevated Life",
         "category": "Community",
         "summary": "A private peer community led by Erica focused on peptide education, real-world experience sharing, and ongoing support. Join the conversation.",
         "url": "https://www.skool.com/ericas-elevated-life-9005", "content": ""},
    ]
    inserted_resource = 0
    for r in resources:
        # Skip if user has deleted this seeded resource — never resurrect.
        killed = await db.deleted_seeds.find_one({"kind": "resource", "title": r["title"]}, {"_id": 1})
        if killed:
            continue
        existing = await db.resources.find_one({"title": r["title"]}, {"id": 1, "_id": 0})
        if existing:
            continue
        obj = Resource(**r)
        await db.resources.insert_one(obj.model_dump())
        inserted_resource += 1

    logger.info(f"Seed complete. Inserted: {inserted_vendor} vendors, "
                f"{inserted_peptide} peptides, {inserted_resource} resources.")

    # ─────────────────────────────────────────────
    # Canonical logo/featured/order sync — always brings production
    # in line with the seed for these specific vendors even when they
    # already exist. Only touches the listed fields; other admin edits are left alone.
    # ─────────────────────────────────────────────
    canonical_updates = [
        {"slug": "re-seq",
         "logo_url": "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/wa4m27i2_22705d52-022b-45aa-9109-3a305f9c90fa.png",
         "featured": True, "order": 1},
        {"slug": "vector-research",
         "logo_url": "https://customer-assets-jai6qajn.emergentagent.net/job_peptide-dosing-1/artifacts/6ebayqia_bec54a23-50e3-4a1e-89ac-f49aa1d356e3.png"},
        {"slug": "glow-aminos",
         "affiliate_url": "https://glowaminos.com/?ref=195"},
    ]
    for cu in canonical_updates:
        slug = cu.pop("slug")
        result = await db.vendors.update_one({"slug": slug}, {"$set": cu})
        if result.modified_count:
            logger.info(f"Canonical sync: updated {slug} → {list(cu.keys())}")

    # Rewrite Glow Aminos price product_urls to use new ?ref=195 tracker
    glow = await db.vendors.find_one({"slug": "glow-aminos"}, {"_id": 0, "id": 1})
    if glow:
        rewritten = 0
        async for p in db.prices.find({"vendor_id": glow["id"]}, {"_id": 0, "id": 1, "product_url": 1}):
            url = p.get("product_url") or ""
            if "glowaminos.com" in url:
                base = url.split("?")[0]
                new_url = f"{base}?ref=195"
                if new_url != url:
                    await db.prices.update_one({"id": p["id"]}, {"$set": {"product_url": new_url}})
                    rewritten += 1
        if rewritten:
            logger.info(f"Glow Aminos: rewrote {rewritten} product_urls with ?ref=195")


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
