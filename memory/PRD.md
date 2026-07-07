# The Optimized Society by Erica — PRD

## Original problem statement
Add a "How to Use a Peptide Calculator" section to the site. Scope expanded into:
1. Full rebrand from "Pep Girl" to **The Optimized Society by Erica** (rose-gold / dusty rose / cream, new logo, hero images, Skool community bar).
2. AI-powered Peptide Price Comparison tool at `/compare` (Playwright + Gemini Flash, accordion UI, strikethrough promo pricing, category/form filter pills).
3. Vendor login-walled scraping via encrypted credentials.
4. Admin dashboard for peptides, vendors, prices, promotions, resources, SEO, site settings.
5. SEO/domain readiness (sitemap, robots, Google Search Console verification).

## Users
- **Erica (admin)**: manages content, vendors, prices, promotions, categories from `/admin`.
- **Community members (public)**: browse `/compare`, `/calculator`, `/vendors`, `/resources`.

## Architecture
- **Frontend**: React + Tailwind, shadcn/ui.
- **Backend**: FastAPI + Motor (async MongoDB).
- **Scraper**: Playwright (dynamic Chromium install) + Gemini Flash via `emergentintegrations`.
- **Auth**: JWT custom auth for admin.
- **Env**: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMERGENT_LLM_KEY`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`.

## Key DB schemas
- `vendors`, `peptides` (name/aliases/**category**), `prices` (peptide_id/vendor_id/size_mg/price/product_url/form/available), `promotions`, `price_history`, `site_settings`, `resources`, `socials`.

## Key API endpoints
- `GET /api/comparison` – peptides + vendors + prices + active promos.
- `POST /api/prices/bulk-import` – AI scraper (authenticated logins supported).
- `PUT /api/peptides/{id}` – set category etc.
- `PUT /api/peptides/merge` – merge duplicates.
- `GET/PUT /api/settings` – site toggles.

## What's implemented ✅
- Full rebrand (colors, logo, hero, Skool bar, JSON-LD).
- Calculators (Reconstitution, BMI, TDEE) + "How to Use" section.
- Vendor directory + affiliate links + reorderable resources + socials.
- `/compare` public tool with accordion, strikethrough promo pricing, form + category pills, popular pills, fuzzy search, pagination.
- Active promotions strip + vendor codes strip.
- Admin: peptides (with category dropdown + bulk-set), vendors (with login config), prices, promotions, resources (reorder), site settings ON/OFF, peptide merge, AI bulk-import scraper.
- Sitemap, robots.txt, GSC verification meta, `useSeo` per-page.

## Recent changes (Feb 2026)
- **2026-02**: Generalized `/compare` category-tag filter — now ANY peptide.category tag (vial/capsule/liquid/skincare/aminos) surfaces on its matching pill, regardless of price.form. Previously only skincare/aminos were treated as category-style.
- **2026-02**: Fixed `/compare` category filter bug — Skin Care / Aminos pills now correctly display peptides tagged by category (was hiding all rows due to inner form filter). File: `Compare.jsx` PeptideAccordion rows useMemo.
- **2026-02**: Restored `.gitignore` — removed re-added `.env / .env.* / *.env` lines that were blocking production deployment (readiness probe timeout because no env vars in prod pod). This is the 3rd occurrence of this recurring issue.

## Prioritized backlog

### 🟡 P1 – In progress / next
- Spreadsheet-style bulk-editable price grid on Admin/Prices tab.
- "Duplicate last week" button on price rows for historical tracking snapshots.

### 🟢 P2 – Future
- Scheduled auto-refresh (cron) for AI scraper.
- Chrome extension for 1-click add-to-site while browsing vendor sites.
- Refactor monolithic files: split `Admin.jsx` (1732 lines) and `server.py` (1199 lines) into modules.
- Data hygiene: hide/skip prices with `size_mg=0` (currently show as `$Infinity/mg`).
- Centralize `PHYSICAL_FORMS = ["vial","capsule","liquid"]` constant shared between `visiblePeptides` and `PeptideAccordion`.

## Critical notes for future agents
- **Preview DB ≠ Production DB.** AI scrapes on preview do NOT populate production. User must re-run "AI Bulk Import" on production after deploy.
- **`.gitignore` env-block is a RECURRING BUG (3x).** Do NOT re-add `.env`, `.env.*`, `*.env` to `.gitignore`. Deployment pipeline needs them tracked.
- **React CI treats ESLint warnings as fatal.** Unused `eslint-disable` comments now also break builds. Lint before deploying.
- **Auth is an integration.** Always call `integration_playbook_expert_v2` before touching auth code.
- **Sensitive vendor login credentials** are stored encrypted in `vendors.login_config`. Treat with care.
