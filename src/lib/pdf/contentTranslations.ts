/**
 * Translations for the DATA the PDFs print — option names, crown/veneer materials, additional
 * procedures and hotel room types — in every language the PDFs support. The static chrome
 * (headings, column titles, …) lives in each generator's own label dictionary; this module
 * covers the catalog-driven strings that would otherwise print in English on, say, an Arabic
 * or Russian proposal. Shared by the Simple Quotation and the Premium Proposal so both stay in
 * sync.
 *
 * Every lookup is case-insensitive and falls back to the original (original-cased) value when
 * there's no translation — a coordinator-typed custom option name is never altered.
 */
import type { QuotationLanguage } from './types';

type Table = Partial<Record<QuotationLanguage, Record<string, string>>>;

function lookup(table: Table, value: string | null | undefined, language: QuotationLanguage): string {
  const original = String(value ?? '').trim();
  const key = original.toLowerCase();
  return table[language]?.[key] ?? original;
}

/** Option names auto-assigned from the implant brand's origin (see `nameForImplantBrand`). */
const OPTION_NAMES: Table = {
  Russian: {
    german: 'Немецкая система',
    swiss: 'Швейцарская система',
    american: 'Американская система',
    korean: 'Корейская система',
    turkish: 'Турецкая система',
  },
  French: {
    german: 'Système allemand',
    swiss: 'Système suisse',
    american: 'Système américain',
    korean: 'Système coréen',
    turkish: 'Système turc',
  },
  Spanish: {
    german: 'Sistema alemán',
    swiss: 'Sistema suizo',
    american: 'Sistema americano',
    korean: 'Sistema coreano',
    turkish: 'Sistema turco',
  },
  Arabic: {
    german: 'النظام الألماني',
    swiss: 'النظام السويسري',
    american: 'النظام الأمريكي',
    korean: 'النظام الكوري',
    turkish: 'النظام التركي',
  },
};

/** Crown and veneer catalog names (`displayName ?? name`). Implant brand names are proper
 *  nouns and are never translated — their origin is appended separately (`originLabels.ts`). */
const PRODUCT_NAMES: Table = {
  Russian: {
    'zirconium crowns ivoclar german': 'Циркониевые коронки Ivoclar (немецкие)',
    'zirconium crowns emax': 'Циркониевые коронки Emax',
    'zirconium crowns monolithic': 'Монолитные циркониевые коронки',
    'zirconium crowns multilayer': 'Многослойные циркониевые коронки',
    'straumann zirconia': 'Циркониевые коронки Straumann',
    veneers: 'Виниры',
  },
  French: {
    'zirconium crowns ivoclar german': 'Couronnes en zircone Ivoclar (allemandes)',
    'zirconium crowns emax': 'Couronnes en zircone Emax',
    'zirconium crowns monolithic': 'Couronnes en zircone monolithique',
    'zirconium crowns multilayer': 'Couronnes en zircone multicouche',
    'straumann zirconia': 'Couronnes en zircone Straumann',
    veneers: 'Facettes',
  },
  Spanish: {
    'zirconium crowns ivoclar german': 'Coronas de zirconio Ivoclar (alemanas)',
    'zirconium crowns emax': 'Coronas de zirconio Emax',
    'zirconium crowns monolithic': 'Coronas de zirconio monolítico',
    'zirconium crowns multilayer': 'Coronas de zirconio multicapa',
    'straumann zirconia': 'Coronas de zirconio Straumann',
    veneers: 'Carillas',
  },
  Arabic: {
    'zirconium crowns ivoclar german': 'تيجان زركونيا Ivoclar (ألمانية)',
    'zirconium crowns emax': 'تيجان زركونيا Emax',
    'zirconium crowns monolithic': 'تيجان زركونيا مونوليثيك',
    'zirconium crowns multilayer': 'تيجان زركونيا متعددة الطبقات',
    'straumann zirconia': 'تيجان زركونيا Straumann',
    veneers: 'قشور الأسنان (فينير)',
  },
};

/** Dental add-on procedures (`PRICING.procedures`, category "Dental"). */
const PROCEDURE_NAMES: Table = {
  Russian: {
    'bone grafting': 'Костная пластика',
    'sinus lifting with bone graft (1 side)': 'Синус-лифтинг с костной пластикой (1 сторона)',
    'sinus lifting with bone graft (2 sides)': 'Синус-лифтинг с костной пластикой (2 стороны)',
    'surgical extraction': 'Хирургическое удаление зуба',
    'implants removal': 'Удаление имплантов',
    'root canal': 'Лечение корневых каналов',
    gingivectomy: 'Гингивэктомия',
    fillings: 'Пломбирование',
    'general anesthesia': 'Общий наркоз',
    'hiv protocol for a patient with hiv': 'Протокол для пациента с ВИЧ',
    'titanium bar (not a bridge) — full arch': 'Титановая балка (не мост) — на всю челюсть',
  },
  French: {
    'bone grafting': 'Greffe osseuse',
    'sinus lifting with bone graft (1 side)': 'Sinus lift avec greffe osseuse (1 côté)',
    'sinus lifting with bone graft (2 sides)': 'Sinus lift avec greffe osseuse (2 côtés)',
    'surgical extraction': 'Extraction chirurgicale',
    'implants removal': 'Retrait d’implants',
    'root canal': 'Traitement de canal',
    gingivectomy: 'Gingivectomie',
    fillings: 'Obturations',
    'general anesthesia': 'Anesthésie générale',
    'hiv protocol for a patient with hiv': 'Protocole VIH pour un patient séropositif',
    'titanium bar (not a bridge) — full arch': 'Barre en titane (pas un bridge) — arcade complète',
  },
  Spanish: {
    'bone grafting': 'Injerto óseo',
    'sinus lifting with bone graft (1 side)': 'Elevación de seno con injerto óseo (1 lado)',
    'sinus lifting with bone graft (2 sides)': 'Elevación de seno con injerto óseo (2 lados)',
    'surgical extraction': 'Extracción quirúrgica',
    'implants removal': 'Retiro de implantes',
    'root canal': 'Endodoncia',
    gingivectomy: 'Gingivectomía',
    fillings: 'Empastes',
    'general anesthesia': 'Anestesia general',
    'hiv protocol for a patient with hiv': 'Protocolo VIH para un paciente con VIH',
    'titanium bar (not a bridge) — full arch': 'Barra de titanio (no es un puente) — arcada completa',
  },
  Arabic: {
    'bone grafting': 'تطعيم العظم',
    'sinus lifting with bone graft (1 side)': 'رفع الجيب الأنفي مع تطعيم العظم (جهة واحدة)',
    'sinus lifting with bone graft (2 sides)': 'رفع الجيب الأنفي مع تطعيم العظم (جهتان)',
    'surgical extraction': 'خلع جراحي',
    'implants removal': 'إزالة الزرعات',
    'root canal': 'علاج قناة الجذر',
    gingivectomy: 'قص اللثة',
    fillings: 'حشوات',
    'general anesthesia': 'تخدير عام',
    'hiv protocol for a patient with hiv': 'بروتوكول خاص لمريض فيروس نقص المناعة',
    'titanium bar (not a bridge) — full arch': 'قضيب تيتانيوم (ليس جسرًا) — فك كامل',
  },
};

/** Procedure billing units (`ProcedureCatalogItem.unit`). */
const PROCEDURE_UNITS: Table = {
  Russian: { '1 cc': '1 куб. см', 'one side': 'одна сторона', 'two sides': 'две стороны', 'per arch': 'за челюсть', 'per jaw': 'за челюсть' },
  French: { '1 cc': '1 cc', 'one side': 'un côté', 'two sides': 'deux côtés', 'per arch': 'par arcade', 'per jaw': 'par mâchoire' },
  Spanish: { '1 cc': '1 cc', 'one side': 'un lado', 'two sides': 'dos lados', 'per arch': 'por arcada', 'per jaw': 'por maxilar' },
  Arabic: { '1 cc': '1 سم³', 'one side': 'جهة واحدة', 'two sides': 'جهتان', 'per arch': 'لكل فك', 'per jaw': 'لكل فك' },
};

/** Hotel room types (`QuotationHotelDetails.roomLabel ?? roomType`). */
const ROOM_TYPES: Table = {
  Russian: { single: 'Одноместный', double: 'Двухместный', triple: 'Трёхместный' },
  French: { single: 'Chambre simple', double: 'Chambre double', triple: 'Chambre triple' },
  Spanish: { single: 'Individual', double: 'Doble', triple: 'Triple' },
  Arabic: { single: 'غرفة مفردة', double: 'غرفة مزدوجة', triple: 'غرفة ثلاثية' },
};

/** The word used for the app's default "Option N" names (see `createOptionInput`). */
const OPTION_WORD: Record<QuotationLanguage, string> = {
  English: 'Option',
  Russian: 'Вариант',
  French: 'Option',
  Spanish: 'Opción',
  Arabic: 'الخيار',
};

export function translateOptionName(name: string | null | undefined, language: QuotationLanguage): string {
  const numbered = String(name ?? '').trim().match(/^option (\d+)$/i);
  if (numbered) return `${OPTION_WORD[language] ?? OPTION_WORD.English} ${numbered[1]}`;
  return lookup(OPTION_NAMES, name, language);
}

export function translateProductName(name: string | null | undefined, language: QuotationLanguage): string {
  return lookup(PRODUCT_NAMES, name, language);
}

export function translateProcedureName(name: string | null | undefined, language: QuotationLanguage): string {
  return lookup(PROCEDURE_NAMES, name, language);
}

export function translateProcedureUnit(unit: string | null | undefined, language: QuotationLanguage): string {
  return lookup(PROCEDURE_UNITS, unit, language);
}

export function translateRoomType(room: string | null | undefined, language: QuotationLanguage): string {
  return lookup(ROOM_TYPES, room, language);
}
