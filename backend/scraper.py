"""AI-powered peptide catalog scraper.
Fetches each vendor's shop page, cleans the HTML, and uses an LLM to extract
structured product data: {name, size_mg, price_usd, product_url}.
"""
import os
import re
import json
import asyncio
import logging
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

logger = logging.getLogger(__name__)

# Playwright is heavy — import lazily only when we actually need it
_PW_BROWSER = None
_PW_LOCK = asyncio.Lock()


async def _get_browser():
    global _PW_BROWSER
    async with _PW_LOCK:
        if _PW_BROWSER is None:
            from playwright.async_api import async_playwright
            pw = await async_playwright().start()
            _PW_BROWSER = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            )
    return _PW_BROWSER


async def playwright_fetch_html(url: str, timeout: int = 30000) -> Optional[str]:
    """Fetch a JS-rendered page using a headless Chromium browser."""
    try:
        browser = await _get_browser()
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
        )
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        # Let lazy-loaded products render
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        # Scroll to trigger lazy loading
        try:
            await page.evaluate(
                "() => new Promise(res => { let y=0; const t=setInterval(()=>{ "
                "window.scrollBy(0,800); y+=800; "
                "if (y>document.body.scrollHeight){clearInterval(t);res();} },200); })"
            )
            await page.wait_for_timeout(1500)
        except Exception:
            pass
        html = await page.content()
        await context.close()
        return html
    except Exception as e:
        logger.warning("playwright_fetch_html %s error: %s", url, e)
        return None

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

CATALOG_PATHS = [
    "", "/shop", "/shop/", "/products", "/products/", "/collections/all",
    "/store", "/peptides", "/all-products", "/catalog", "/research-peptides",
]

# Canonical name normalisation.  Keys are lower-cased "stripped" forms.
NAME_MAP = {
    "bpc 157": "BPC-157", "bpc-157": "BPC-157",
    "tb 500": "TB-500", "tb-500": "TB-500", "tb500": "TB-500",
    "semaglutide": "Semaglutide",
    "tirzepatide": "Tirzepatide",
    "retatrutide": "Retatrutide",
    "cagrilintide": "Cagrilintide",
    "ipamorelin": "Ipamorelin",
    "cjc-1295": "CJC-1295", "cjc 1295": "CJC-1295",
    "cjc 1295 no dac": "CJC-1295 No-DAC", "cjc-1295 no dac": "CJC-1295 No-DAC",
    "cjc-1295 with dac": "CJC-1295 DAC", "cjc 1295 dac": "CJC-1295 DAC",
    "ghk-cu": "GHK-Cu", "ghk cu": "GHK-Cu", "ghk": "GHK-Cu",
    "mots-c": "MOTS-c", "mots c": "MOTS-c",
    "selank": "Selank",
    "semax": "Semax",
    "aod-9604": "AOD-9604", "aod 9604": "AOD-9604",
    "nad+": "NAD+", "nad": "NAD+",
    "glutathione": "Glutathione",
    "epitalon": "Epitalon", "epithalon": "Epitalon",
    "thymosin alpha 1": "Thymosin Alpha-1", "ta-1": "Thymosin Alpha-1",
    "thymosin beta 4": "TB-500",
    "ghrp-2": "GHRP-2", "ghrp 2": "GHRP-2",
    "ghrp-6": "GHRP-6", "ghrp 6": "GHRP-6",
    "hexarelin": "Hexarelin",
    "tesamorelin": "Tesamorelin",
    "ss-31": "SS-31", "ss 31": "SS-31",
    "pt-141": "PT-141", "pt 141": "PT-141", "bremelanotide": "PT-141",
    "melanotan ii": "Melanotan II", "melanotan 2": "Melanotan II",
    "5-amino-1mq": "5-Amino-1MQ", "5 amino 1mq": "5-Amino-1MQ",
    "kpv": "KPV",
    "larazotide": "Larazotide",
    "oxytocin": "Oxytocin",
    "snap-8": "SNAP-8",
    "argireline": "Argireline",
}


def fetch_html(url: str, timeout: int = 8) -> Optional[str]:
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=timeout, allow_redirects=True)
        if r.status_code == 200 and r.text:
            return r.text
        logger.warning("fetch_html %s -> %s", url, r.status_code)
    except Exception as e:
        logger.warning("fetch_html %s error: %s", url, e)
    return None


def discover_shop_html(affiliate_url: str):
    """Try common shop paths.  Return (final_url, html) of the most product-rich page.
    Short-circuits if the affiliate URL itself is blocked (403/429)."""
    parsed = urlparse(affiliate_url)
    root = f"{parsed.scheme}://{parsed.netloc}"

    # Quick gate: if the root domain hard-blocks us, skip everything
    try:
        r = requests.get(root, headers=BROWSER_HEADERS, timeout=8, allow_redirects=True)
        if r.status_code in (401, 403, 429, 503):
            logger.warning("discover %s: root blocked (%s); skipping path probes", root, r.status_code)
            return None
    except Exception as e:
        logger.warning("discover %s root error: %s", root, e)
        return None

    candidates = []
    html = fetch_html(affiliate_url)
    if html:
        candidates.append((affiliate_url, html))
        # Strong catalog signal? Stop probing other paths.
        if html.count("$") > 30 or html.lower().count("add to cart") > 10:
            return (affiliate_url, html)

    for path in CATALOG_PATHS:
        if not path:
            continue
        url = root + path
        html = fetch_html(url)
        if html:
            candidates.append((url, html))
            if html.count("$") > 30 or html.lower().count("add to cart") > 10:
                break

    if not candidates:
        return None
    best = max(candidates, key=lambda c: c[1].count("$") + c[1].lower().count("add to cart"))
    return best


def clean_html_for_llm(html: str, base_url: str = "", max_chars: int = 50000) -> str:
    """Strip scripts/styles and keep only lines that look like product/price/link rows."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "iframe", "header", "footer", "nav"]):
        tag.decompose()

    lines = []
    seen = set()
    keyword_re = re.compile(
        r"\b(peptide|semaglutide|tirzepatide|retatrutide|cagri|bpc|tb[- ]?500|cjc|ipamorelin|ghk|"
        r"mots|selank|semax|aod|nad|glutathione|epitalon|thymosin|ghrp|hexarelin|tesamorelin|"
        r"ss[- ]?31|pt[- ]?141|melanotan|amino[- ]?1mq|kpv|larazotide|oxytocin|snap|argireline|"
        r"hgh|igf|dsip|hcg|ghrh|mgf)\b",
        re.I,
    )

    for el in soup.find_all(["a", "h1", "h2", "h3", "h4", "h5", "p", "span", "div", "li"]):
        text = el.get_text(" ", strip=True)
        if not text or len(text) > 300 or text in seen:
            continue
        href = el.get("href") if el.name == "a" else None
        has_price = "$" in text
        has_size = bool(re.search(r"\b\d+\s?(mg|mcg|ml|iu|g|capsules?)\b", text, re.I))
        is_peptide = bool(keyword_re.search(text))
        if not (has_price or (is_peptide and has_size) or (is_peptide and href)):
            continue
        if href and base_url and not href.startswith("http"):
            href = urljoin(base_url, href)
        line = f"{text}  [{href}]" if href else text
        if line in seen:
            continue
        seen.add(line)
        lines.append(line)

    cleaned = "\n".join(lines)
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


SYSTEM_PROMPT = """You are a precise data extractor for peptide e-commerce catalogs.

Given the cleaned text of an online peptide / wellness vendor catalog page, extract every distinct
product / SKU you can identify.

Return ONLY valid JSON in this exact shape (no markdown, no commentary, no code fence):

{"products":[
  {"name": "BPC-157", "size_mg": 5, "price_usd": 39.99, "product_url": "https://..."}
]}

Rules:
- name: the peptide / product name only. Strip dosage and brand fluff. Use the most common form
  (e.g. "BPC-157", "TB-500", "Semaglutide", "Tirzepatide", "GHK-Cu").
- size_mg: numeric mg value. "1000mcg" -> 1. "10mg" -> 10. If the size is in IU, ml, or capsules,
  use null for size_mg and append the size to the name (e.g. "Glutathione 100ml").
- price_usd: USD price as a number, e.g. 39.99. Strip "$", commas, "USD". If a sale price and
  original price are both shown, use the SALE price. If no clear price is visible, OMIT the row.
- product_url: absolute URL to the product page if visible inside [brackets], otherwise null.
- One row per (product_name × size). If "BPC-157" is offered in both 5mg and 10mg, emit TWO rows.
- Skip non-peptide consumables (bac water, syringes, alcohol swabs, needles) UNLESS the vendor is a
  skincare / supplement brand — in that case include creams, serums, sprays, capsules.
- If the page is clearly NOT a catalog (a blog post, terms-of-service, 404, etc.), return {"products":[]}.

Return nothing else."""


async def extract_products_llm(text: str, vendor_name: str, vendor_url: str, llm_key: str):
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"scrape-{vendor_name}",
        system_message=SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")

    user_text = f"Vendor: {vendor_name}\nShop URL: {vendor_url}\n\nCATALOG TEXT:\n{text}"

    try:
        chunks = []
        async for ev in chat.stream_message(UserMessage(text=user_text)):
            if isinstance(ev, TextDelta):
                chunks.append(ev.content)
            elif isinstance(ev, StreamDone):
                break
        raw = "".join(chunks).strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"^```\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            logger.warning("No JSON object in LLM response for %s", vendor_name)
            return []
        data = json.loads(m.group(0))
        return data.get("products", []) or []
    except Exception as e:
        logger.error("LLM extract failed for %s: %s", vendor_name, e)
        return []


def normalize_peptide_name(name: str) -> str:
    if not name:
        return ""
    s = re.sub(r"[®™]", "", name).strip()
    s = re.sub(r"\s+", " ", s)
    key = s.lower()
    return NAME_MAP.get(key, s)


async def scrape_vendor(vendor: dict, llm_key: str) -> dict:
    """Returns {'vendor_slug', 'shop_url', 'products', 'error'}.

    Pipeline:
      1. Try fast HTTP fetch + LLM extract.
      2. If blocked / empty / no products found, fall back to headless Playwright.
    """
    name = vendor["name"]
    affiliate_url = vendor["affiliate_url"]
    logger.info("Scraping %s ...", name)

    # ---- Phase 1: fast HTTP path ----
    disc = discover_shop_html(affiliate_url)
    shop_url = None
    cleaned = ""
    products = []

    if disc:
        shop_url, html = disc
        cleaned = clean_html_for_llm(html, base_url=shop_url)
        if cleaned.strip():
            products = await extract_products_llm(cleaned, name, shop_url, llm_key)

    # ---- Phase 2: Playwright fallback ----
    needs_browser = (
        not disc or not cleaned.strip() or len(products) == 0
    )
    if needs_browser:
        logger.info("  %s -> falling back to Playwright (headless browser)", name)
        candidate_urls = [affiliate_url]
        parsed = urlparse(affiliate_url)
        root = f"{parsed.scheme}://{parsed.netloc}"
        for path in ["/shop", "/shop/", "/products", "/collections/all", "/store"]:
            candidate_urls.append(root + path)

        for cu in candidate_urls:
            html = await playwright_fetch_html(cu)
            if not html:
                continue
            new_cleaned = clean_html_for_llm(html, base_url=cu)
            if not new_cleaned.strip():
                continue
            new_products = await extract_products_llm(new_cleaned, name, cu, llm_key)
            if new_products:
                shop_url = cu
                products = new_products
                logger.info("  %s -> Playwright extracted %d products from %s",
                            name, len(new_products), cu)
                break

    if not products and not disc:
        return {"vendor_slug": vendor["slug"], "shop_url": None, "products": [],
                "error": "could not fetch catalog via HTTP or Playwright"}
    if not products:
        return {"vendor_slug": vendor["slug"], "shop_url": shop_url, "products": [],
                "error": "no products extracted"}

    out = []
    for p in products:
        nm = normalize_peptide_name(p.get("name") or "")
        if not nm:
            continue
        size = p.get("size_mg")
        try:
            size_mg = float(size) if size is not None else 0.0
        except (TypeError, ValueError):
            size_mg = 0.0
        try:
            price_usd = float(p.get("price_usd")) if p.get("price_usd") is not None else None
        except (TypeError, ValueError):
            price_usd = None
        if price_usd is None or price_usd <= 0:
            continue
        purl = p.get("product_url") or ""
        if purl and not purl.startswith("http"):
            purl = urljoin(shop_url, purl)
        out.append({
            "name": nm, "size_mg": size_mg, "price_usd": price_usd,
            "product_url": purl,
        })

    logger.info("  %s -> %d products kept after filtering", name, len(out))
    return {"vendor_slug": vendor["slug"], "shop_url": shop_url, "products": out, "error": None}


async def bulk_scrape(vendors: list, llm_key: str, max_concurrent: int = 3):
    sem = asyncio.Semaphore(max_concurrent)

    async def _run(v):
        async with sem:
            return await scrape_vendor(v, llm_key)

    try:
        return await asyncio.gather(*[_run(v) for v in vendors])
    finally:
        # Clean up the shared browser instance after a full run
        global _PW_BROWSER
        if _PW_BROWSER is not None:
            try:
                await _PW_BROWSER.close()
            except Exception:
                pass
            _PW_BROWSER = None
