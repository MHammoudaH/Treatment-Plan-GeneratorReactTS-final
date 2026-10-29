/**
 * "Save this patient to my records" — turns the data a PDF was generated from into the
 * `QuoteSnapshot` stored on the coordinator's patient record (see `server/src/records/`).
 * The snapshot is plain English text + numbers, so the "My Patients" timeline shows exactly
 * what was quoted even after the catalog or prices change.
 */
import type { QuoteSnapshot } from './api';
import type { QuotationOption, QuotationPdfData, TreatmentLineItem } from './pdf/types';
import type { PlasticPremiumInput } from './pdf/plastic/generatePlasticPremiumPdf';

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', AUD: 'A$', GBP: '£' };

export function formatSnapshotMoney(amount: number, currency: string): string {
  const value = (Number(amount) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return SYMBOLS[currency] ? `${SYMBOLS[currency]}${value}` : `${currency} ${value}`;
}

function productLine(label: string, item: TreatmentLineItem, currency: string): string | null {
  if (item.quantity <= 0) return null;
  const name = item.name ? ` — ${item.name}` : '';
  const price = item.priceConfigured ? `: ${formatSnapshotMoney(item.total, currency)}` : '';
  return `${item.quantity} × ${label}${name}${price}`;
}

function dentalOption(option: QuotationOption, currency: string): QuoteSnapshot['options'][number] {
  const { treatment, visits, totals } = option;
  const lines = [
    productLine('Implant', treatment.implants, currency),
    productLine('Crown', treatment.crowns, currency),
    productLine('Veneer', treatment.veneers, currency),
    productLine('Bridge', treatment.bridge, currency),
    ...treatment.procedures.map((p) => {
      const qty = p.unit ? `${p.quantity} × ` : '';
      return `${qty}${p.name}${p.priceConfigured ? `: ${formatSnapshotMoney(p.total, currency)}` : ''}`;
    }),
  ].filter((line): line is string => line !== null);

  const visitList = visits.count === 2 && visits.visit2 ? [visits.visit1, visits.visit2] : [visits.visit1];
  if (visits.count === 2) lines.push('Two visits');
  visitList.forEach((visit, index) => {
    if (visit.hotel && visit.hotel.nights > 0) {
      const which = visits.count === 2 ? `Visit ${index + 1} hotel` : 'Hotel';
      lines.push(`${which} — ${visit.hotel.name}, ${visit.hotel.nights} nights`);
    }
  });
  if (totals.flightTicket > 0) lines.push(`Flight ticket: ${formatSnapshotMoney(totals.flightTicket, currency)}`);

  return { name: option.name, lines, total: totals.total };
}

/** Snapshot of a dental quotation (one entry per option, with its plan and total). */
export function dentalQuoteSnapshot(data: QuotationPdfData, pdf: QuoteSnapshot['pdf']): QuoteSnapshot {
  const currency = data.display?.currency ?? 'USD';
  return {
    module: 'dental',
    pdf,
    currency,
    language: data.patient.language,
    options: data.options.map((option) => dentalOption(option, currency)),
  };
}

/** Snapshot of a plastic-surgery proposal (one combined option). */
export function plasticQuoteSnapshot(input: PlasticPremiumInput): QuoteSnapshot {
  const { amounts, currency } = input;
  const lines = amounts.surgeryItems.map((s) => `${s.name}: ${formatSnapshotMoney(s.amount, currency)}`);
  if (input.hotelName && input.hotelNights > 0) {
    lines.push(`Hotel — ${input.hotelName}, ${input.hotelNights} nights: ${formatSnapshotMoney(amounts.hotel, currency)}`);
  }
  if (input.transferIncluded) lines.push(`Airport transfer: ${formatSnapshotMoney(amounts.transfer, currency)}`);
  return {
    module: 'plastic',
    pdf: 'premium',
    currency,
    language: input.language,
    options: [{ name: input.items.map((item) => item.name).join(' + ') || 'Plastic surgery', lines, total: amounts.total }],
    ...(input.packagePrice ? { remark: 'Full package price — line prices hidden in the PDF' } : {}),
  };
}

/** Two snapshots quote the same thing (ignoring which PDF layout printed them). */
export function sameQuote(a: QuoteSnapshot, b: QuoteSnapshot): boolean {
  return JSON.stringify({ ...a, pdf: null }) === JSON.stringify({ ...b, pdf: null });
}
