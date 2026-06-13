# PRD — Peptide Hub (Affiliate Site)

## Original problem statement
> i want to build my peptide affiliate website to host my links of vendors, resources and peptide calculator and peptide price comparision tool

## Architecture
- **Backend**: FastAPI + Motor (Mongo) on `:8001`, all routes under `/api`. JWT auth (httpOnly cookie + Bearer fallback). BeautifulSoup + requests for vendor price scraping.
- **Frontend**: React + react-router + Tailwind + shadcn/ui. Auth context with localStorage token. Swiss / High-Contrast design (Outfit + IBM Plex Sans + JetBrains Mono, #002FA7 Klein Blue accent, sharp edges, no shadows/gradients).
- **DB collections**: `users`, `vendors`, `peptides`, `prices`, `resources`.

## User personas
1. **Anonymous researcher** — visits site to compare prices, calculate doses, follow affiliate links.
2. **Site owner / Admin** — manages vendors, peptides, prices, resources via `/admin`; triggers on-demand price scrapes.

## Core requirements (static)
- Vendor directory with affiliate link tracking.
- Reconstitution calculator (peptide mg → BAC water mL → desired mcg → insulin syringe units).
- Price comparison tool (peptide × vendor matrix with best-price highlight).
- Resources / guides library (internal + external).
- Admin auth + CRUD + scraper.
- Clean / scientific aesthetic.

## What's been implemented (2026-02)
- ✅ Public pages: Home, Vendors, Calculator, Compare, Resources.
- ✅ Admin login (`admin@peptidehub.com` / `admin123`, seeded from env).
- ✅ Admin dashboard with tabs for Vendors / Peptides / Prices / Resources, full CRUD.
- ✅ On-demand single + bulk scraper (`/api/prices/{id}/scrape`, `/api/prices/scrape-all`) using CSS selectors per price entry.
- ✅ Seed data: 4 vendors, 6 peptides, 24 prices, 4 resources.
- ✅ Testing agent verified — 100% backend (15/15 pytest) and 100% frontend.

## Backlog
### P0 (next)
- Configurable scheduled scrape (background job) instead of manual only.
- Vendor logo upload (object storage) and per-vendor banner.
### P1
- User reviews / ratings (with auth).
- Compare tool: filter by category, side-by-side vial-size selector.
- Calculator: save preset doses (per user/session).
### P2
- Resource MDX/markdown editor.
- SEO: per-vendor `/vendors/<slug>` and per-peptide `/peptides/<slug>` pages.
- Email newsletter for vendor sales / new peptide listings.

## Test credentials
- See `/app/memory/test_credentials.md`.
