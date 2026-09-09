# PDF generators

This directory is a TypeScript port of the legacy DutyAI PDF subsystem: two independent
print-window ("browser-native PDF") generators that turn an already-priced quotation into a
full HTML document and call `window.print()`. Nothing here calculates prices or scrapes the
DOM — see `types.ts` for the full input contract (`QuotationPdfData`).

```
src/lib/pdf/
  types.ts                          shared input types (QuotationPdfData and friends)
  simple/
    labels.ts                       RU/EN/FR/ES label + translation dictionaries
    transliteration.ts              Cyrillic patient-name transliteration (Russian)
    arabicLabels.ts                 Arabic label dictionary
    arabicTransliteration.ts        Arabic patient-name lookup
    generateSimpleQuotationPdf.ts   generateSimpleQuotationPdf(data) — all 5 languages
  premium/
    labels.ts                       EN/RU/FR/ES label dictionary
    generatePremiumQuotationPdf.ts  Doctor type, generatePremiumQuotationHtml/Pdf(data, doctors)
```

## Calling these from React

Both entry points are plain functions with no React dependency — call them from an
`onClick` handler once you have a `QuotationPdfData` object (and, for the Premium proposal,
a `Doctor[]` array):

```tsx
import { generateSimpleQuotationPdf } from '../lib/pdf/simple/generateSimpleQuotationPdf';
import { generatePremiumQuotationPdf } from '../lib/pdf/premium/generatePremiumQuotationPdf';

<button onClick={() => generateSimpleQuotationPdf(quotationData)}>Generate PDF</button>
<button onClick={() => generatePremiumQuotationPdf(quotationData, doctors)}>Generate Premium Proposal</button>
```

Both call `window.open` / `document.write` / `window.print()`, so they only work in a browser
context (not SSR, not a test/node environment) and require pop-ups to be allowed — each
function shows a `window.alert` and returns early if `window.open` is blocked.

## Production composition order that was actually discovered

Tracing the legacy files against each other (not just reading each file in isolation) turned
up a few things worth knowing before treating any single legacy file as "ground truth":

- **`pdf-polish.js` monkey-patches `window.generateQuotationPdf` only** — never
  `window.generateArabicQuotationPdf`. Its fixes (pluralization, option-total dedup, forced
  page-break before `.payment-section`) apply only to the Simple Quotation PDF's Latin-script
  path. This port folds them directly into the shared Latin builder in
  `generateSimpleQuotationPdf.ts`; the Arabic branch never needed them (its markup doesn't have
  the duplicate option-total, and it never had a working page-break rule to begin with —
  Arabic's `.payment-section{break-inside:avoid}` is unconditional, always-on, and unrelated to
  `pdf-polish.js`).
- **`pdf-polish.js`'s "· N options" pluralization regex never actually matched.** Its regex
  (`/·\s*\d+\s+(?:options?|...)/`) requires only whitespace between "·", the number and the
  word, but the real markup in `pdf-generator.js` has element tags in between
  (`</span><span><bdi>...`). Verified this by running the regex against the real generated
  fragment — it returns no match. So in production, the *original* naive pluralization in
  `pdf-generator.js` (wrong Russian 2–4 form) is what actually printed; `pdf-polish.js`'s fix
  was dead code. This port implements the **intended** correct pluralization directly (see
  `optionsCountWord()`), not the dead-code no-op — flagged here since it's a deliberate
  deviation from literal legacy *output*, in favor of legacy *intent*.
- **`coordinator-updates.js` ships two separate IIFEs.** The first patches `calculateOption`,
  `buildQuotationData`, `window.pdfMoney`/`premiumMoney` and injects a currency-hiding
  `<style>` into any popup window. The **second IIFE, appended at the very end of the file,
  fully replaces `window.generatePremiumQuotationPdf`** — this is the version that actually ran
  for the Premium Proposal button in production (it wraps `generatePremiumQuotationHtml`,
  regexes `$1,234` → `€1.234` over the rendered HTML, then DOM-walks the result to blank out
  product/hotel prices). This port treats that replacement as the spec: `data.display`
  (`currency`, `usdToCurrencyRate`, `showProductPrices`, `showHotelPrices`) is threaded through
  `generatePremiumQuotationHtml`/`generateSimpleQuotationPdf` as typed input, so the correct
  currency and visibility render **the first time**, instead of via a second pass over
  finished HTML.
- **The coordinator's price-visibility CSS injection (`installPdfVisibilityCss`) only ever
  affected the Premium Proposal.** It patches `window.open` globally and injects CSS hiding
  `.treatment-row > strong:last-child` / `.visit-line > strong:last-child` / `.hotel-price` /
  `.per-night` / `.unit-price` / `.price-column`. None of those classes exist in the Simple
  Quotation PDF's or the Arabic PDF's markup (both use a plain `<table class="proposal-table">`
  with no such classes) — so for those two, `showProductPrices`/`showHotelPrices` were always a
  no-op in production; only currency conversion (via the patched `pdfMoney`) ever applied to
  them. **This port preserves that distinction**: `generateSimpleQuotationPdf` applies currency
  conversion from `data.display` but does not hide any price (there is nothing in production
  for it to faithfully replicate); `generatePremiumQuotationHtml` applies both currency
  conversion and the two show/hide flags, matching what the coordinator's DOM-surgery pass
  actually did (blank the line to "Included", not remove the row).

## Bugs found and fixed vs. bugs preserved as-is

Two genuine authoring bugs were found and fixed (not just faithfully reproduced), because both
are clearly unintended — fully-authored translation dictionaries that could structurally never
fire, not deliberate simplifications:

- **`pdfOptionName()` and `pdfProductLabel()` (Simple Quotation, RU/FR/ES) never actually
  translated anything.** Both look up a `.toLowerCase()`d value against dictionary keys that
  are capitalized (`'German'`, `'Zirconium Crowns Emax'`, ...). Object-key lookup is
  case-sensitive, so the lookup always misses and always fell through to the raw, lowercased
  English name — in *every* language, including Russian. (`pdfProcedureLabel`, by contrast, has
  already-lowercase keys and genuinely worked.) This port's `translateOptionName()` /
  `translateProductName()` (`simple/generateSimpleQuotationPdf.ts`) do a case-insensitive
  match, so option and product names now actually render in the target language, and fall back
  to the *original-cased* name (not a lowercased one) when untranslated.

Preserved as-is, because they read as consistent, intentional simplifications rather than
one-off typos:

- The **Simple Quotation PDF's `.patient-card`/`.patient-meta` block had a duplicated,
  never-closed `<div class="patient-meta">`**, which (per HTML5 parsing rules — unclosed
  non-void elements stay open until their container closes) would leave everything from the
  intro paragraph through the footer nested inside `.patient-card`'s light background/left
  border for the rest of the document. This is very likely a copy-paste slip, not the intended
  one-card design the CSS values (small padding, 5px radius) clearly describe. Ported as a
  single, properly-closed `.patient-meta` div inside a properly-closed `.patient-card`.
- **The Premium Proposal's dynamically-generated content is hardcoded in English regardless of
  `language`** — treatment summary bullets, "Dental implants"/"Dental crowns" row labels,
  procedure names, and service names ("Translator", `service.name`) are all literal English in
  `premium-generator.js`, even on a Russian proposal; only the structural chrome (from
  `premiumLabels()` — page titles, section headings) is actually localized. This is pervasive
  and consistent throughout the whole file, not an isolated slip, so it was ported faithfully
  rather than "fixed" into a broader localization effort that legacy never attempted. If full
  content localization is wanted for Premium, treat it as a deliberate new feature, not a port.
- `pdf-generator-ar.js` defines `arPdfRoomLabel()` but never calls it (the Arabic hotel row
  prints the hotel name only, no room-type label) — dead code, not ported.
- `pdf-generator-ar.js`'s option-count phrase is always singular ("... خيار"), never pluralized
  to "خيارات" for count > 1 — unlike the Latin template's (corrected) pluralization. Since
  `pdf-polish.js` never touches the Arabic generator at all, there's no "intended fix" signal
  here the way there was for the Latin path, so this was ported as literally written.

## Dead code: `pdf-styles.js` / `DUTY_DESIGN`

`DUTY_DESIGN` (navy `#0B1F3A`, blue `#1D6FA5`, gold `#B89B5E`) is **not referenced anywhere**
in `pdf-generator.js`, `pdf-generator-ar.js`, or `premium-generator.js` — every one of them
inlines its own literal hex colors in its own `<style>` block (`#15283f`/`#e43b3b`/`#1f5eff`
for the Simple PDF, `#09234a`/`#d8232a` for the Premium proposal — neither matches
`DUTY_DESIGN`'s palette at all). `pdf-styles.js` was not ported; the real, currently-shipping
color values were copied verbatim from each generator's own `<style>` block instead.

## Type design notes

- `QuotationPdfData` is a single shared contract for **both** generators (see `types.ts`),
  matching `buildQuotationData()`'s output as enriched by `coordinator-updates.js`'s `display`
  block. `display` is optional and defaults to USD at face value with all prices shown, so
  callers that don't need currency conversion or price-hiding can omit it entirely.
- `generatePremiumQuotationHtml`/`generatePremiumQuotationPdf` read `displayCurrency`/`rate`/
  `showProductPrices`/`showHotelPrices` from `data.display` rather than as separate positional
  parameters. This was a deliberate choice over a wider function signature: `display` already
  exists as one typed block that both generators share, so there is exactly one place upstream
  code needs to set these values, regardless of which PDF button the user clicks.
- `Doctor` (in `premium/generatePremiumQuotationPdf.ts`) is intentionally minimal
  (`name`/`specialty`/`photoUrl`/`bio`/`expertise`) — it replaces the legacy hardcoded
  `id → /assets/doctors/*.jpg` lookup table with a direct `photoUrl` field. The real doctors
  data module living elsewhere in the app only needs to produce objects matching this shape.
- Cover/clinic imagery paths (`/assets/logo/Logo-main.png`, `/assets/patients/0002.jpg`,
  `/assets/clinic/...png`) are carried over from the legacy source unchanged. They are not yet
  parameterized — place matching files under the new app's `public/` at those same paths, or
  revisit this if the asset pipeline moves.
