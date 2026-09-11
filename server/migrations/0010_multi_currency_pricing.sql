-- 0010_multi_currency_pricing.sql
-- Schema readiness for the multi-currency pricing + All-on-X + per-visit-override
-- architecture introduced in src/lib/pricing/engine.ts and src/data/pricing.ts.
--
-- NOTE ON SCOPE: the wizard (src/) does not yet persist treatment plans/visits to
-- PostgreSQL — pricing is calculated and printed to PDF entirely client-side (see
-- src/lib/pricing/buildQuotationPdfData.ts). This migration only makes the existing
-- operational tables (added in 0003/0005, not yet wired to any API) ready to receive
-- that data later, structured the same way the frontend catalog and engine already
-- work: independent USD/EUR/AUD columns (never a converted value), and a per-visit
-- calculated/override/final triple. No existing data is destroyed.

-- procedure_catalog: independent per-currency prices, replacing the single
-- default_price/currency pair for new work. The old columns are kept (not dropped)
-- for backward compatibility and backfilled from the existing USD-only data.
ALTER TABLE procedure_catalog
  ADD COLUMN price_usd numeric(14,2) CHECK (price_usd IS NULL OR price_usd >= 0),
  ADD COLUMN price_eur numeric(14,2) CHECK (price_eur IS NULL OR price_eur >= 0),
  ADD COLUMN price_aud numeric(14,2) CHECK (price_aud IS NULL OR price_aud >= 0);

COMMENT ON COLUMN procedure_catalog.default_price IS
  'Deprecated — superseded by price_usd/price_eur/price_aud. Kept for backward compatibility, not written to by new code.';
COMMENT ON COLUMN procedure_catalog.price_usd IS 'Independent USD price. Never derived from price_eur/price_aud.';
COMMENT ON COLUMN procedure_catalog.price_eur IS 'Independent EUR price. Never derived from price_usd/price_aud. NULL = not configured yet — do not invent a value.';
COMMENT ON COLUMN procedure_catalog.price_aud IS 'Independent AUD price. Never derived from price_usd/price_eur. NULL = not configured yet — do not invent a value.';

-- Backfill: every existing row is USD-denominated (currency defaults to 'USD' and
-- nothing else has been used yet), so this is a safe, lossless copy, not a conversion.
UPDATE procedure_catalog SET price_usd = default_price
 WHERE currency = 'USD' AND default_price IS NOT NULL AND price_usd IS NULL;

-- treatment_visits: per-visit calculated/override/final total, in whatever currency
-- the treatment plan was quoted in. final_total is a generated column so
-- "override replaces calculated, never blends with it" is enforced structurally,
-- matching calculateOption()'s finalTotal = overrideTotal ?? calculatedTotal.
ALTER TABLE treatment_visits
  ADD COLUMN currency         char(3),
  ADD COLUMN calculated_total numeric(14,2) CHECK (calculated_total IS NULL OR calculated_total >= 0),
  ADD COLUMN override_total   numeric(14,2) CHECK (override_total IS NULL OR override_total >= 0),
  ADD COLUMN final_total      numeric(14,2) GENERATED ALWAYS AS (COALESCE(override_total, calculated_total)) STORED;

COMMENT ON COLUMN treatment_visits.calculated_total IS 'Visit total before any override — sum of that visit''s dental + services lines, in `currency`.';
COMMENT ON COLUMN treatment_visits.override_total IS 'Coordinator''s final-price override for THIS visit only, in `currency`, or NULL. Never a whole-plan override.';
COMMENT ON COLUMN treatment_visits.final_total IS 'override_total if set, else calculated_total. Always the authoritative amount — sum these across a plan''s visits for the plan total.';
