import { describe, expect, it } from 'vitest';
import { DOCTORS, toPdfDoctor } from '../../data/doctors';
import { PLASTIC_SURGERIES } from '../../data/plasticSurgery';
import { PRICING } from '../../data/pricing';
import { createInitialState } from '../../types/wizard';
import { buildQuotationPdfData } from '../pricing/buildQuotationPdfData';
import { createOptionInput, emptyVisitInput } from '../pricing/engine';
import { generatePlasticPremiumHtml } from './plastic/generatePlasticPremiumPdf';
import { PLASTIC_CONTENT_LANGUAGES, PLASTIC_ITEM_TEXT, translatePlasticItem } from './plastic/plasticContentTranslations';
import { generatePremiumQuotationHtml } from './premium/generatePremiumQuotationPdf';
import { buildArabicHtml, buildLatinHtml } from './simple/generateSimpleQuotationPdf';
import { translateProcedureName } from './contentTranslations';
import { formatStayCount } from './plurals';
import type { QuotationLanguage, QuotationPdfData } from './types';

const LANGUAGES = ['French', 'Italian'] as const;

/** The words a patient would actually read: no tags, CSS or scripts. */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/** English words that must never reach a French or Italian patient. */
const ENGLISH =
  /\b(Treatment|Accommodation|Included|Visits?|Crowns?|Veneers?|Translator|Payment|Nights?|Days?|Zirconium|Grafting|Extraction|Hospital|Recommended|Surgeon|Proposal|Professional|Before|After|Your|The|Breast|Liposuction|Face|Body|No need)\b/;

function dentalData(language: Exclude<QuotationLanguage, 'English'>): QuotationPdfData {
  const state = createInitialState();
  state.patient = { ...state.patient, name: 'Test Patient', country: 'Italy', language };
  state.display = { ...state.display, currency: 'EUR', fxRate: 0.9 };
  const hotel = PRICING.hotels[0];
  const procedure = PRICING.procedures.find((p) => p.id === 'bone-grafting') ?? PRICING.procedures[0];
  state.options = [
    {
      ...createOptionInput('opt-1', 'Option 1'),
      visits: 2,
      implant: { itemId: 'medigma', count: 6, markupPercent: 0, finalUnitPriceOverride: 300 },
      crown: { itemId: PRICING.crowns[0].id, count: 12, markupPercent: 0, finalUnitPriceOverride: 150 },
      veneer: { itemId: PRICING.veneers[0].id, count: 4, markupPercent: 0, finalUnitPriceOverride: 140 },
      procedures: [{ procedureId: procedure.id, quantity: 2, finalUnitPriceOverride: null }],
      visit1: { ...emptyVisitInput(), hotel: { hotelId: hotel.id, roomType: 'single', nights: 5, nightlyPriceOverride: null } },
      visit2: emptyVisitInput(),
    },
  ];
  const data = buildQuotationPdfData(state);
  data.patient.treatmentData = { upperImplants: 6, lowerImplantsMin: 4, lowerImplantsMax: 4, crowns: 12, crownMaterial: 'zirconia', veneers: 4 };
  return data;
}

function plasticHtml(language: Exclude<QuotationLanguage, 'English'>): string {
  const items = ['rhinoplasty', 'face-neck-lift', 'gastric-sleeve', 'lipo-jplasma'].map((id) => PLASTIC_SURGERIES.find((p) => p.id === id)!);
  return generatePlasticPremiumHtml({
    items,
    patientName: 'Test Patient',
    language,
    currency: 'EUR',
    doctorName: '',
    travelDate: '2026-12-01',
    coordinatorNote: '',
    hotelName: 'Hotel A',
    hotelNights: 7,
    transferIncluded: true,
    weight: { unit: 'kg', current: 120, bmi: 39.2, expected: 91.5, expectedBmi: 29.9, months: { from: 12, to: 18 } },
    amounts: { surgeryItems: items.map((item) => ({ name: item.name, amount: item.priceEur ?? 0 })), hotel: 400, transfer: 135, total: 16000 },
    gallery: [],
  });
}

describe.each(LANGUAGES)('%s PDFs print no English', (language) => {
  const htmlLang = language === 'French' ? 'fr' : 'it';

  it('Simple Quotation', () => {
    const html = buildLatinHtml(dentalData(language), language);
    expect(html).toContain(`<html lang="${htmlLang}"`);
    expect(visibleText(html).match(ENGLISH)).toBeNull();
  });

  it('Premium Proposal, including the doctors page', () => {
    const doctors = DOCTORS.map((doctor) => toPdfDoctor(doctor, language));
    const html = generatePremiumQuotationHtml(dentalData(language), doctors);
    expect(html).toContain(`<html lang="${htmlLang}"`);
    expect(visibleText(html).match(ENGLISH)).toBeNull();
  });

  it('Plastic Premium Proposal, including procedure names, notes, areas and stays', () => {
    const html = plasticHtml(language);
    expect(html).toContain(`<html lang="${htmlLang}"`);
    expect(visibleText(html).match(ENGLISH)).toBeNull();
  });
});

describe.each(['Russian', 'Arabic'] as const)('%s dental PDFs stay in %s', (language) => {
  /** Latin text allowed in a non-Latin PDF: brands, contact details, currency and test data. */
  const allowed =
    /Duty|Clinic|Istanbul|T[üu]rkiye|Turkey|dutyclinic|com|info|VIP|PDF|DENTAL|Medigma|Ivoclar|Emax|Straumann|Digital|Smile|Design|Dr|Murat|Vahap|Cin|Çin|Elvin|Guliyev|Vail|Aksoy|Tryp|Wyndham|Topkapi|Test|Patient|EUR|cc/g;
  const latinLeft = (html: string) => visibleText(html).replace(allowed, ' ').match(/[A-Za-z]{3,}/);

  it('Simple Quotation', () => {
    const data = dentalData(language);
    expect(latinLeft(language === 'Arabic' ? buildArabicHtml(data) : buildLatinHtml(data, language))).toBeNull();
  });

  it('Premium Proposal, including the doctors page', () => {
    const doctors = DOCTORS.map((doctor) => toPdfDoctor(doctor, language));
    expect(latinLeft(generatePremiumQuotationHtml(dentalData(language), doctors))).toBeNull();
  });
});

describe('Spanish dental PDFs print no English', () => {
  it('Simple Quotation and Premium Proposal', () => {
    const data = dentalData('Spanish');
    expect(visibleText(buildLatinHtml(data, 'Spanish')).match(ENGLISH)).toBeNull();
    const doctors = DOCTORS.map((doctor) => toPdfDoctor(doctor, 'Spanish'));
    expect(visibleText(generatePremiumQuotationHtml(data, doctors)).match(ENGLISH)).toBeNull();
  });
});

describe('number grammar in the treatment summary', () => {
  it('Russian', () => {
    const data = dentalData('Russian');
    const simple = visibleText(buildLatinHtml(data, 'Russian'));
    const premium = visibleText(generatePremiumQuotationHtml(data));
    for (const text of [simple, premium]) {
      expect(text).toContain('6 имплантов на верхнюю челюсть');
      expect(text).toContain('4 импланта на нижнюю челюсть');
      expect(text).toContain('12 циркониевых коронок');
      expect(text).toContain('4 винира');
    }
  });

  it('Arabic', () => {
    const data = dentalData('Arabic');
    for (const text of [visibleText(buildArabicHtml(data)), visibleText(generatePremiumQuotationHtml(data))]) {
      expect(text).toContain('6 زرعات في الفك العلوي');
      expect(text).toContain('4 زرعات في الفك السفلي');
      expect(text).toContain('12 تاجًا من الزركونيا');
      expect(text).toContain('4 قشور');
    }
  });

  it('hotel nights agree with the number in every generator', () => {
    expect(formatStayCount(1, 'night', 'English')).toBe('1 night');
    expect(formatStayCount(2, 'night', 'Russian')).toBe('2 ночи');
    expect(formatStayCount(5, 'night', 'Russian')).toBe('5 ночей');
    expect(formatStayCount(21, 'night', 'Russian')).toBe('21 ночь');
    expect(formatStayCount(11, 'night', 'Russian')).toBe('11 ночей');
    expect(formatStayCount(2, 'night', 'Arabic')).toBe('ليلتان');
    expect(formatStayCount(11, 'night', 'Arabic')).toBe('11 ليلة');
    expect(formatStayCount('4–6', 'night', 'Arabic')).toBe('⁦4–6⁩ ليالٍ');
    expect(visibleText(generatePremiumQuotationHtml(dentalData('Russian')))).toContain('5 ночей');
  });
});

describe('Arabic terminology', () => {
  it('the Titanium Bar never uses a word that can read as anatomy, and the sinus lift is the maxillary sinus', () => {
    expect(translateProcedureName('Titanium Bar (Not a Bridge) — Full Arch', 'Arabic')).toContain('عارضة تيتانيوم');
    expect(translateProcedureName('Titanium Bar (Not a Bridge) — Full Arch', 'Arabic')).not.toContain('قضيب');
    expect(translateProcedureName('Sinus Lifting with Bone Graft (1 Side)', 'Arabic')).toContain('الجيب الفكي');
  });
});

describe('Italian wording', () => {
  it('treatment summary is plural-aware in both dental PDFs', () => {
    const data = dentalData('Italian');
    expect(visibleText(buildLatinHtml(data, 'Italian'))).toContain('4 impianti per l’arcata inferiore');
    expect(visibleText(generatePremiumQuotationHtml(data))).toContain('4 impianti per l’arcata inferiore');
  });

  it('the Plastic PDF translates stays and investment rows', () => {
    const text = visibleText(plasticHtml('Italian'));
    expect(text).toContain('7 notti - 8 giorni');
    expect(text).toContain('Chirurgia — Rinoplastica');
  });
});

describe('French wording', () => {
  it('a single number above 1 is still plural ("4 implants")', () => {
    const data = dentalData('French');
    expect(visibleText(buildLatinHtml(data, 'French'))).toContain('4 implants pour la mandibule');
    expect(visibleText(generatePremiumQuotationHtml(data))).toContain('4 implants pour la mâchoire inférieure');
  });
});

describe.each(['Russian', 'Spanish', 'Arabic'] as const)('%s Plastic PDF', (language) => {
  it('prints no English', () => {
    expect(visibleText(plasticHtml(language)).match(ENGLISH)).toBeNull();
  });
});

describe('stay lengths follow each language\'s number grammar', () => {
  const stay = (id: string, language: 'Russian' | 'Arabic' | 'Spanish') => translatePlasticItem(PLASTIC_SURGERIES.find((item) => item.id === id)!, language);

  it('Russian: 1 ночь / 2 ночи / 5 ночей', () => {
    expect(stay('dimple-one', 'Russian').stay).toBe('1 ночь - 1 день');
    expect(stay('gastric-botox', 'Russian').stay).toBe('2 ночи - 3 дня');
    expect(stay('rhinoplasty', 'Russian').stay).toBe('7 ночей - 8 дней');
    expect(stay('butt-silicone-europe', 'Russian').stay).toBe('10 ночей - 11 дней');
    expect(stay('gastric-sleeve', 'Russian').hospitalStay).toBe('1-2 ночи');
  });

  it('Arabic: one, dual, plural, 11+ and ranges', () => {
    expect(stay('dimple-one', 'Arabic').stay).toBe('ليلة واحدة - يوم واحد');
    expect(stay('gastric-botox', 'Arabic').stay).toBe('ليلتان - 3 أيام');
    expect(stay('butt-silicone-europe', 'Arabic').stay).toBe('10 ليالٍ - 11 يومًا');
    expect(stay('gastric-sleeve', 'Arabic').hospitalStay).toBe('⁦1-2⁩ ليالٍ');
  });

  it('Spanish', () => {
    expect(stay('dimple-one', 'Spanish')).toMatchObject({ stay: '1 noche - 1 día', hospitalStay: 'No es necesario' });
  });
});

describe('plastic catalog translations', () => {
  it.each(PLASTIC_CONTENT_LANGUAGES)('%s covers every procedure, and every note', (language) => {
    for (const item of PLASTIC_SURGERIES) {
      const text = PLASTIC_ITEM_TEXT[language][item.id];
      expect(text?.name, item.id).toBeTruthy();
      expect(Boolean(text?.note), `${item.id} note`).toBe(Boolean(item.note));
    }
  });

  it('has no entries for procedures that no longer exist', () => {
    const ids = new Set(PLASTIC_SURGERIES.map((item) => item.id));
    for (const language of PLASTIC_CONTENT_LANGUAGES) {
      expect(Object.keys(PLASTIC_ITEM_TEXT[language]).filter((id) => !ids.has(id))).toEqual([]);
    }
  });

  it('translates stay wording, singular and plural; leaves other languages on the English catalog', () => {
    const dimple = PLASTIC_SURGERIES.find((item) => item.id === 'dimple-one')!;
    expect(translatePlasticItem(dimple, 'Italian')).toMatchObject({ stay: '1 notte - 1 giorno', hospitalStay: 'Non necessario', category: 'Viso' });
    expect(translatePlasticItem(dimple, 'French')).toMatchObject({ stay: '1 nuit - 1 jour', hospitalStay: 'Non nécessaire', category: 'Visage' });
    const sleeve = PLASTIC_SURGERIES.find((item) => item.id === 'gastric-sleeve')!;
    expect(translatePlasticItem(sleeve, 'Italian').hospitalStay).toBe('1-2 notti');
    expect(translatePlasticItem(dimple, 'English')).toMatchObject({ name: dimple.name, stay: dimple.stay, category: 'Face' });
  });
});
