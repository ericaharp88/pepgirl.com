"""Merge vendor codename peptides into canonical names.
GLP-1 / GLP-1SG       -> Semaglutide
GLP-2 / GLP-2TZ / GLP-2 "T" -> Tirzepatide
GLP-3 / GLP-3RT       -> Retatrutide

Behaviour:
- Finds or creates the canonical peptide.
- Moves every price entry from the codename peptide to the canonical one.
- Deletes the now-empty codename peptide.
"""
import asyncio, os, uuid, re
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

CANON = {
    "Semaglutide":   ["GLP-1", "GLP-1SG", "GLPSG", "GLP1", "GLP1SG"],
    "Tirzepatide":   ["GLP-2", "GLP-2TZ", "GLP-1 T", "GLP-1T", "GLP-2 \u201cT\u201d", "GLP2", "GLP2TZ", "GLP-2 T"],
    "Retatrutide":   ["GLP-3", "GLP-3RT", "GLP3", "GLP3RT"],
}

def norm(s):  # for case-insensitive compare ignoring quotes/extras
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    now = datetime.now(timezone.utc).isoformat()

    # Build reverse lookup of codename -> canonical
    code_to_canon = {}
    for canon, codes in CANON.items():
        for c in codes:
            code_to_canon[norm(c)] = canon

    peptides = await db.peptides.find({}, {"_id": 0}).to_list(1000)

    moved = {}
    deleted = []

    for p in peptides:
        c = code_to_canon.get(norm(p["name"]))
        if not c:
            continue
        # Find or create the canonical peptide
        canon = await db.peptides.find_one({"slug": c.lower()}, {"_id": 0})
        if not canon:
            canon = {
                "id": str(uuid.uuid4()),
                "name": c, "slug": c.lower(),
                "description": "",
                "typical_dose_mcg": 0.0,
                "category": "GLP-1",
                "created_at": now,
            }
            await db.peptides.insert_one(canon)

        # Move every price from p -> canon, dedup by (vendor_id, size_mg) keeping cheapest
        old_prices = await db.prices.find({"peptide_id": p["id"]}, {"_id": 0}).to_list(500)
        for pr in old_prices:
            existing = await db.prices.find_one({
                "peptide_id": canon["id"],
                "vendor_id": pr["vendor_id"],
                "size_mg": pr["size_mg"],
            }, {"_id": 0})
            if existing:
                # Keep the cheaper one
                if pr["price_usd"] < existing["price_usd"]:
                    await db.prices.update_one(
                        {"id": existing["id"]},
                        {"$set": {
                            "price_usd": pr["price_usd"],
                            "product_url": pr.get("product_url", ""),
                            "last_status": pr.get("last_status", "merged"),
                            "updated_at": now,
                        }}
                    )
                await db.prices.delete_one({"id": pr["id"]})
            else:
                await db.prices.update_one(
                    {"id": pr["id"]},
                    {"$set": {"peptide_id": canon["id"], "updated_at": now}}
                )

        # Delete the codename peptide
        await db.peptides.delete_one({"id": p["id"]})
        moved[p["name"]] = c
        deleted.append(p["name"])

    print("=" * 60)
    print(f"Merged {len(deleted)} codename peptides into canonical names:")
    for old, new in moved.items():
        print(f"  '{old}' -> {new}")

    # Final counts
    counts = {}
    for c in ["Semaglutide", "Tirzepatide", "Retatrutide"]:
        pep = await db.peptides.find_one({"slug": c.lower()}, {"_id": 0, "id": 1})
        if pep:
            counts[c] = await db.prices.count_documents({"peptide_id": pep["id"]})
    print("\nPrice counts on canonical peptides:")
    for c, n in counts.items():
        print(f"  {c}: {n}")


if __name__ == "__main__":
    asyncio.run(main())
