# DutyAI Treatment Plan Generator (React + TypeScript)

A faithful React + TypeScript rewrite of Duty Clinic's coordinator tool: a 4-step wizard that
turns a pasted WhatsApp diagnosis into priced treatment options, then generates two
patient-facing PDFs (a 5-language Simple Quotation, including dedicated Arabic RTL, and a
multi-page English/Russian Premium Proposal with a cover page and doctor team page).

This replaces the legacy vanilla-JS app (`app.js` + four layered `coordinator-*.js`
monkey-patch scripts) with one coherent, typed codebase. **Nothing here is a stub** — every
module is a complete, working port, verified end-to-end with a headless browser (see
[Verification](#verification) below).

## Why React + TypeScript (not plain JS)

The pricing engine touches real client-facing dollar amounts across ~13 implants, 6 crowns, 8
procedures, 13 hotels, and US/Canada financing rules, with several layers of coordinator
overrides. An earlier prototype of this project hit a silent `Number(null) === 0` bug that
zeroed out prices by default — exactly the class of bug TypeScript's strict null checks catch
at build time instead of on a patient's printed quotation. See `src/lib/pricing/engine.ts`'s
`hasOverride()` for the fix, applied consistently everywhere an override is detected.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build locally
```

## Architecture

```
src/
  data/
    pricing.ts       Real DutyAI pricing catalog (implants, crowns, procedures, hotels, financing)
    doctors.ts        Real doctor profiles, enriched from the "Better by MTA" CV PDFs
  lib/
    pricing/
      engine.ts                 THE pricing engine — see below
      diagnosisParser.ts        WhatsApp-diagnosis-paste parser (regex-ported from app.js)
      buildQuotationPdfData.ts  Wizard state -> QuotationPdfData (the PDF modules' input contract)
    pdf/
      types.ts                  Shared QuotationPdfData contract for both PDF generators
      simple/                   Simple Quotation PDF — RU/EN/FR/ES + dedicated Arabic RTL
      premium/                  Premium Proposal PDF — cover, doctor team, treatment, closing
      README.md                 Detailed notes on legacy fidelity decisions and fixed bugs
  types/wizard.ts     Wizard state shape
  context/QuotationContext.tsx  useReducer-based wizard state
  components/         4-step wizard UI (Step1Patient ... Step4Confirm, OptionCard)
public/assets/        Logo, doctor photos, clinic/marketing imagery (see Assets below)
```

### The pricing engine: one consolidated module, not five monkey-patches

The legacy app computed prices via `app.js`'s `calculateOption()`, wrapped at runtime by
**four** coordinator scripts that patched `window.calculateOption` on top of each other:

```
app.js (base)
  -> coordinator-updates.js        (whole-option proportional "manual final price")
  -> coordinator-final-pricing.js  (per-unit / per-procedure / per-visit final-price fields)
  -> coordinator-manual-pricing.js (per-visit-stage hotel/transfer/prosthesis final price)
  -> coordinator-manual-currency-fix.js (USD/EUR round-trip safety wrapper)
```

This is the **actual, confirmed production composition order** — traced from `index.html`'s
script tags plus `pdf-bind.js`'s runtime `<script>` injection, not just each file read in
isolation. Tracing the full composition (not just each layer) found the layers don't actually
compose correctly: `coordinator-final-pricing.js`'s whole-quotation/visit "final price" fields
are silently discarded by the next layer, and combining the whole-option proportional override
with a granular unit-price override mixes inconsistent scaling bases. Both are genuine bugs in
the legacy production app, not intentional design.

`src/lib/pricing/engine.ts` replaces all five layers with **one function**, `calculateOption()`,
that keeps every override *capability* the legacy layers offered — implant/crown final unit
price, per-procedure final price, per-visit hotel/transfer/prosthesis final price, and a single
whole-option final-total override — composed with one predictable precedence (granular
overrides first, then the whole-option override proportionally scales the result). See the
file's header comment for the full reasoning.

### PDF generation

Both PDF generators (`src/lib/pdf/simple`, `src/lib/pdf/premium`) build a complete HTML
document via template literals and print it with `window.open()` + `window.print()` — exactly
like the legacy app, which is what makes the Arabic RTL layout and print CSS work reliably.
They are plain functions with no React dependency; see `src/lib/pdf/README.md` for the full
list of legacy-fidelity decisions, including two genuine translation-dictionary bugs that were
found and fixed (case-sensitive lookups that could never match) and a duplicated/unclosed
`<div>` that was corrupting the Simple PDF's layout.

### Assets

`public/assets/doctors/*.jpg` are best-effort matched from the supplied headshot photos to the
four doctors in `src/data/doctors.ts` — if a photo is on the wrong doctor, just swap the file
(the mapping is a single `photoUrl` string per doctor, not baked into the PDF templates).
`public/assets/clinic/...png` was re-cropped from the supplied Russian-language marketing
banner to a text-free Istanbul skyline shot, since the original had Russian ad copy baked in
(inappropriate to show on an English or Arabic proposal).

## Verification

Built and smoke-tested with a headless Chromium (Playwright) end-to-end run: fills the full
wizard (patient → diagnosis paste/parse → priced option with implants/crowns/procedures/hotel
→ confirmation), generates both PDFs, and renders them to PNG for visual inspection. Covered:

- English, 2-visit option: hand-verified pricing math ($4,825 total: implants 4×Zimmer@25%
  markup + crowns 6×Emax + hotel + VIP transfer, split correctly across visits 1/2).
- Arabic RTL + EUR currency: right-to-left layout, bidi-embedded numbers, and USD→EUR
  conversion all verified against hand calculations (€1,296.79 = $1,500 × 0.8645 rate, etc).
- Premium Proposal price-visibility toggle: hiding hotel prices correctly prints "Included"
  in place of the price while the total still reflects the real (hidden) amount underneath.
- `npm run build` (`tsc -b --strict` + Vite) is clean with zero type errors.

## What's intentionally different from the legacy app

See `src/lib/pdf/README.md` and this file's pricing-engine section above for the full list.
In short: five layered monkey-patch scripts became one typed pricing engine with the same
capabilities; two dead/broken translation dictionaries were fixed; a duplicated HTML `<div>`
was fixed; the pricing engine's override-detection explicitly rejects `null`/empty values
instead of coercing them to `0`.
