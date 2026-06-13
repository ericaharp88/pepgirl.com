"""Targeted Playwright re-scrape: ONLY runs against vendors that don't yet have
prices in the DB.  Sequential (concurrency=1) to keep memory usage low.

Usage:  python3 run_pw_rescrape.py
"""
import asyncio
import os
import re
import sys
import uuid
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s | %(message)s")

from motor.motor_asyncio import AsyncIOMotorClient
from scraper import scrape_vendor


async def main():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        print("ERROR: EMERGENT_LLM_KEY missing"); sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Pick vendors that have ZERO prices today
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(100)
    targets = []
    for v in vendors:
        n = await db.prices.count_documents({"vendor_id": v["id"]})
        if n == 0:
            targets.append(v)

    print(f"\nVendors needing re-scrape: {len(targets)}")
    for v in targets:
        print(f"  - {v['name']}")

    now = datetime.now(timezone.utc).isoformat()
    totals = {"peps_added": 0, "prices_added": 0, "prices_updated": 0}

    for v in targets:
        print(f"\n>>> {v['name']}")
        try:
            res = await scrape_vendor(v, llm_key)
        except Exception as e:
            print(f"   ERROR: {e}")
            continue

        n = len(res["products"])
        print(f"   {n} products  err={res['error']}")
        if not res["products"]:
            continue

        for p in res["products"]:
            pep_slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
            if not pep_slug:
                continue
            existing_pep = await db.peptides.find_one({"slug": pep_slug}, {"_id": 0, "id": 1})
            if not existing_pep:
                pep_id = str(uuid.uuid4())
                await db.peptides.insert_one({
                    "id": pep_id, "name": p["name"], "slug": pep_slug,
                    "description": "", "typical_dose_mcg": 0.0, "category": "",
                    "created_at": now,
                })
                totals["peps_added"] += 1
            else:
                pep_id = existing_pep["id"]

            size_mg = float(p["size_mg"] or 0.0)
            existing_price = await db.prices.find_one(
                {"peptide_id": pep_id, "vendor_id": v["id"], "size_mg": size_mg},
                {"_id": 0, "id": 1})
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
                await db.prices.insert_one({
                    "id": str(uuid.uuid4()),
                    "peptide_id": pep_id, "vendor_id": v["id"], "size_mg": size_mg,
                    "price_usd": p["price_usd"],
                    "product_url": p["product_url"] or "",
                    "scrape_selector": "",
                    "last_scraped": now, "last_status": "ai-scrape",
                    "updated_at": now,
                })
                totals["prices_added"] += 1

    print(f"\nDONE.  Peptides added: {totals['peps_added']}   "
          f"Prices added: {totals['prices_added']}   "
          f"Updated: {totals['prices_updated']}")


if __name__ == "__main__":
    asyncio.run(main())
