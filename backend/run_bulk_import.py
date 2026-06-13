"""One-off runner: scrape all vendors and upsert peptides + prices.
Run from /app/backend with:  python3 run_bulk_import.py
"""
import asyncio
import os
import re
import sys
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("bulk")

from motor.motor_asyncio import AsyncIOMotorClient
from scraper import bulk_scrape


async def main():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        print("ERROR: EMERGENT_LLM_KEY missing from .env")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    vendors = await db.vendors.find({}, {"_id": 0}).to_list(100)
    print(f"Scraping {len(vendors)} vendors with concurrency=3 ...\n")

    results = await bulk_scrape(vendors, llm_key, max_concurrent=3)

    totals = {"peps_added": 0, "prices_added": 0, "prices_updated": 0}
    now = datetime.now(timezone.utc).isoformat()

    print("\n" + "=" * 80)
    print(f"{'VENDOR':<22} {'PRODUCTS':<10} {'STATUS'}")
    print("=" * 80)

    for res in results:
        vendor = next((v for v in vendors if v["slug"] == res["vendor_slug"]), None)
        if not vendor:
            continue
        n = len(res["products"])
        status = res["error"] or "ok"
        print(f"  {vendor['name'][:21]:<22} {n:<10} {status}")

        if res["error"] or not res["products"]:
            continue

        for p in res["products"]:
            pep_slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
            if not pep_slug:
                continue
            existing_pep = await db.peptides.find_one({"slug": pep_slug}, {"_id": 0, "id": 1})
            if not existing_pep:
                import uuid as _uuid
                pep_id = str(_uuid.uuid4())
                await db.peptides.insert_one({
                    "id": pep_id,
                    "name": p["name"],
                    "slug": pep_slug,
                    "description": "",
                    "typical_dose_mcg": 0.0,
                    "category": "",
                    "created_at": now,
                })
                totals["peps_added"] += 1
            else:
                pep_id = existing_pep["id"]

            size_mg = float(p["size_mg"] or 0.0)
            existing_price = await db.prices.find_one({
                "peptide_id": pep_id, "vendor_id": vendor["id"], "size_mg": size_mg
            }, {"_id": 0, "id": 1})
            if existing_price:
                await db.prices.update_one(
                    {"id": existing_price["id"]},
                    {"$set": {"price_usd": p["price_usd"],
                              "product_url": p["product_url"],
                              "last_scraped": now, "last_status": "ai-scrape",
                              "updated_at": now}}
                )
                totals["prices_updated"] += 1
            else:
                import uuid as _uuid
                await db.prices.insert_one({
                    "id": str(_uuid.uuid4()),
                    "peptide_id": pep_id,
                    "vendor_id": vendor["id"],
                    "size_mg": size_mg,
                    "price_usd": p["price_usd"],
                    "product_url": p["product_url"] or "",
                    "scrape_selector": "",
                    "last_scraped": now,
                    "last_status": "ai-scrape",
                    "updated_at": now,
                })
                totals["prices_added"] += 1

    print("=" * 80)
    print(f"\nDONE.  Peptides added: {totals['peps_added']}   "
          f"Prices added: {totals['prices_added']}   "
          f"Prices updated: {totals['prices_updated']}")


if __name__ == "__main__":
    asyncio.run(main())
