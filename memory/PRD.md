# Pepgirl — Peptide Calculator

## Problem Statement
Add an educational "How to Use a Peptide Calculator" section directly below the Reconstitution Calculator on /calculator for the Pepgirl site. Match the existing rounded white card + pink accent style. Subsections:
- What is a peptide calculator
- How much BAC water
- Reconstitution Instructions (4 numbered steps)

## What's Implemented (2026-01)
- `/calculator` route in `App.js`
- `src/pages/Calculator.jsx`:
  - Working Reconstitution Calculator (vial mg, BAC water mL, desired dose mcg/mg, syringe size → syringe units, volume mL, concentration mg/mL)
  - Educational "How to Use a Peptide Calculator" card directly below, matching rounded white + pink-accent style
  - 3 subsections: What is a peptide calculator · How much BAC water (1/2/3 mL comparison cards) · Reconstitution Instructions (4 numbered steps)
- `data-testid` on all interactive elements and key result/section nodes
- Self-contained, no backend changes needed

## Architecture
- React 19 + Tailwind, lucide-react icons
- Pure-client calculator (no API calls)
- Reconstitution math: concentration = vial_mg / bac_mL; volume_mL = dose_mg / concentration; units = volume_mL × syringe_units_per_mL

## Notes for User
The user said they wanted to share their existing Pepgirl codebase but couldn't attach files. The calculator was built as a standalone, drop-in page using sensible defaults (rounded white cards, pink-500/600 accents). The user can copy `src/pages/Calculator.jsx` into their real Pepgirl site as-is.

## Backlog / Next Tasks
- P1: Integrate into real Pepgirl design system once user shares it (header/nav, brand fonts, exact pink hex)
- P2: Add per-peptide presets (BPC-157, Semaglutide, etc.) to pre-fill vial/dose
- P2: Save user's recent reconstitutions to localStorage
- P2: Print/share dose card
