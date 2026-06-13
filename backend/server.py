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
    featured: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VendorIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    affiliate_url: str
    logo_url: str = ""
    rating: float = 0.0
    tags: List[str] = []
    featured: bool = False


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
    return await db.resources.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


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
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(500)
    prices = await db.prices.find({}, {"_id": 0}).to_list(5000)
    return {"peptides": peptides, "vendors": vendors, "prices": prices}


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
    if await db.vendors.count_documents({}) > 0:
        return
    logger.info("Seeding sample data...")
    vendors = [
        {"name": "PeptideSciences", "slug": "peptide-sciences", "description": "US-based research peptides with COA on every product.",
         "affiliate_url": "https://www.peptidesciences.com/?ref=peptidehub", "logo_url": "",
         "rating": 4.7, "tags": ["USA", "COA", "Research"], "featured": True},
        {"name": "Pure Peptides USA", "slug": "pure-peptides-usa", "description": "Third-party tested peptides shipped from US labs.",
         "affiliate_url": "https://purepeptidesusa.com/?ref=peptidehub", "logo_url": "",
         "rating": 4.5, "tags": ["USA", "Tested"], "featured": True},
        {"name": "Amino Asylum", "slug": "amino-asylum", "description": "Budget-friendly with broad peptide selection.",
         "affiliate_url": "https://aminoasylum.shop/?ref=peptidehub", "logo_url": "",
         "rating": 4.2, "tags": ["Budget", "Variety"], "featured": False},
        {"name": "Limitless Life", "slug": "limitless-life", "description": "High-purity peptides, premium pricing.",
         "affiliate_url": "https://limitlesslifenootropics.com/?ref=peptidehub", "logo_url": "",
         "rating": 4.6, "tags": ["Premium", "Purity"], "featured": False},
    ]
    vendor_ids = {}
    for v in vendors:
        obj = Vendor(**v)
        d = obj.model_dump()
        await db.vendors.insert_one(d)
        vendor_ids[v["slug"]] = obj.id

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
    for p in peptides:
        obj = Peptide(**p)
        await db.peptides.insert_one(obj.model_dump())
        peptide_ids[p["slug"]] = obj.id

    # Sample prices
    import random
    random.seed(42)
    for pslug, pid in peptide_ids.items():
        for vslug, vid in vendor_ids.items():
            size = random.choice([5, 10])
            base = {"bpc-157": 35, "tb-500": 60, "semaglutide": 110, "tirzepatide": 180,
                    "ipamorelin": 30, "cjc-1295": 28}[pslug]
            price = round(base * (size / 5) * random.uniform(0.85, 1.25), 2)
            obj = PriceEntry(peptide_id=pid, vendor_id=vid, size_mg=size,
                             price_usd=price, product_url="", scrape_selector="")
            await db.prices.insert_one(obj.model_dump())

    resources = [
        {"title": "How to Reconstitute Peptides Safely",
         "category": "Guide",
         "summary": "Step-by-step BAC water reconstitution for research peptides.",
         "url": "", "content": "Use bacteriostatic water (0.9% benzyl alcohol). Inject slowly down the inside of the vial. Swirl, do not shake. Store at 2–8°C and use within 30 days."},
        {"title": "Reading a Peptide Certificate of Analysis (COA)",
         "category": "Guide", "summary": "What HPLC purity, mass spec, and bioburden numbers really mean.",
         "url": "", "content": "Look for >98% HPLC purity, matching mass spec to the theoretical mass, and endotoxin tested below 0.5 EU/mg for injectables used in research."},
        {"title": "GLP-1 Research Landscape 2026",
         "category": "Research", "summary": "Overview of semaglutide, tirzepatide, retatrutide, and emerging triple agonists.",
         "url": "https://www.nejm.org/", "content": "An external read on the state of GLP-1 research."},
        {"title": "Insulin Syringe Unit Reference",
         "category": "Reference", "summary": "Common U-100 insulin syringe markings and how they map to mL.",
         "url": "", "content": "1 unit on a U-100 insulin syringe = 0.01 mL. A 50-unit syringe holds 0.5 mL. A 100-unit syringe holds 1.0 mL."},
    ]
    for r in resources:
        obj = Resource(**r)
        await db.resources.insert_one(obj.model_dump())

    logger.info("Sample data seeded.")


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
