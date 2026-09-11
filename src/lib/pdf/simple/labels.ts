/**
 * Label dictionaries for the Simple Quotation PDF (Russian / English / French / Spanish).
 * Ported verbatim from `pdfLabels()` and the sibling per-language translation maps in the
 * legacy `pdf-generator.js`. Arabic has its own dedicated dictionary — see `arabicLabels.ts`.
 */
import type { QuotationLanguage } from '../types';

/** The Latin-script languages the Simple Quotation PDF's shared template supports. Arabic renders through the separate RTL template in `generateSimpleQuotationPdf.ts`. */
export type SimpleLatinLanguage = Exclude<QuotationLanguage, 'Arabic'>;

/** Every static UI string printed by the Simple Quotation PDF, in one language. */
export interface SimpleLabels {
  proposal: string;
  preparedFor: string;
  date: string;
  treatmentPlan: string;
  treatment: string;
  quantity: string;
  unitPrice: string;
  total: string;
  implants: string;
  crowns: string;
  bridge: string;
  procedures: string;
  accommodation: string;
  visit1: string;
  visit2: string;
  flightTicket: string;
  hotel: string;
  room: string;
  nights: string;
  perNight: string;
  services: string;
  details: string;
  included: string;
  transfer: string;
  prosthesis: string;
  translator: string;
  paymentByVisit: string;
  optionTotal: string;
  visit: string;
  oneVisit: string;
  twoVisits: string;
  important: string;
  generated: string;
  disclaimer: string;
  intro: string;
  installment: string;
  package: string;
  installmentAmount: string;
  remainingCash: string;
  cashPerVisit: string;
  option: string;
  translationNotice: string;
}

/** Legacy source: `pdfLabels()`'s `dictionaries` object. */
export const SIMPLE_LABELS: Record<SimpleLatinLanguage, SimpleLabels> = {
  Russian: {
    proposal: 'ПЕРСОНАЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ', preparedFor: 'Подготовлено для', date: 'Дата', treatmentPlan: 'ПЛАН ЛЕЧЕНИЯ',
    treatment: 'Лечение', quantity: 'Кол-во', unitPrice: 'Цена за единицу', total: 'Стоимость', implants: 'Импланты', crowns: 'Коронки', bridge: 'Мостовидный протез',
    procedures: 'Дополнительные процедуры', accommodation: 'ПРОЖИВАНИЕ И УСЛУГИ', visit1: 'ПЕРВЫЙ ВИЗИТ', visit2: 'ВТОРОЙ ВИЗИТ', flightTicket: 'Авиабилет',
    hotel: 'Отель', room: 'Номер', nights: 'Ночей', perNight: 'Цена за ночь', services: 'Услуги', details: 'Детали', included: 'Включено',
    transfer: 'VIP-трансфер', prosthesis: 'Зубной протез', translator: 'Переводчик', paymentByVisit: 'Оплата по визитам', optionTotal: 'Стоимость варианта',
    visit: 'Визит', oneVisit: '1 визит', twoVisits: '2 визита', important: 'ВАЖНО', generated: 'Документ сформирован автоматически на основании выбранного варианта лечения.',
    disclaimer: 'Окончательный план лечения и объём процедур подтверждаются врачом после клинического осмотра и необходимых диагностических исследований.',
    intro: 'Предлагаем индивидуальный план лечения, подготовленный на основании предоставленной информации. Ниже представлены выбранные варианты лечения, проживание, услуги и порядок оплаты.',
    installment: 'РАССРОЧКА ДЛЯ США / КАНАДЫ', package: 'Пакет +', installmentAmount: 'Сумма рассрочки', remainingCash: 'Оставшаяся сумма', cashPerVisit: 'Оплата наличными по визитам',
    option: 'ВАРИАНТ', translationNotice: 'Перевод плана лечения выполнен на основании подтверждённых данных врача.',
  },
  English: {
    proposal: 'PERSONALIZED TREATMENT PROPOSAL', preparedFor: 'Prepared for', date: 'Date', treatmentPlan: 'TREATMENT PLAN', treatment: 'Treatment', quantity: 'Qty.', unitPrice: 'Unit price', total: 'Total',
    implants: 'Implants', crowns: 'Crowns', bridge: 'Full-arch bridge', procedures: 'Additional procedures', accommodation: 'ACCOMMODATION & SERVICES', visit1: 'VISIT 1', visit2: 'VISIT 2', flightTicket: 'Flight ticket', hotel: 'Hotel', room: 'Room', nights: 'Nights', perNight: 'Price / night', services: 'Services', details: 'Details', included: 'Included',
    transfer: 'VIP transfer', prosthesis: 'Dental prosthesis', translator: 'Translator', paymentByVisit: 'Payment by visit', optionTotal: 'Option total', visit: 'Visit', oneVisit: '1 visit', twoVisits: '2 visits', important: 'IMPORTANT',
    generated: 'This document was generated automatically from the selected treatment option.', disclaimer: 'The final treatment plan and procedure scope are confirmed by the doctor after clinical examination and required diagnostic assessment.',
    intro: 'We are pleased to provide your personalized treatment proposal based on the information provided. The following pages summarize the selected treatment, accommodation, services and payment plan.',
    installment: 'US / CANADA INSTALLMENT PLAN', package: 'Package +', installmentAmount: 'Installment amount', remainingCash: 'Remaining cash', cashPerVisit: 'Cash per visit', option: 'OPTION', translationNotice: 'Treatment plan translated from the confirmed doctor data.',
  },
  French: {
    proposal: 'PLAN DE TRAITEMENT PERSONNALISÉ', preparedFor: 'Préparé pour', date: 'Date', treatmentPlan: 'PLAN DE TRAITEMENT', treatment: 'Traitement', quantity: 'Qté.', unitPrice: 'Prix unitaire', total: 'Total',
    implants: 'Implants', crowns: 'Couronnes', bridge: 'Bridge complet', procedures: 'Procédures supplémentaires', accommodation: 'HÉBERGEMENT ET SERVICES', visit1: 'PREMIÈRE VISITE', visit2: 'DEUXIÈME VISITE', flightTicket: 'Billet d’avion', hotel: 'Hôtel', room: 'Chambre', nights: 'Nuits', perNight: 'Prix / nuit', services: 'Services', details: 'Détails', included: 'Inclus',
    transfer: 'Transfert VIP', prosthesis: 'Prothèse dentaire', translator: 'Interprète', paymentByVisit: 'Paiement par visite', optionTotal: 'Total de l’option', visit: 'Visite', oneVisit: '1 visite', twoVisits: '2 visites', important: 'IMPORTANT',
    generated: 'Ce document a été généré automatiquement à partir de l’option de traitement sélectionnée.', disclaimer: 'Le plan de traitement final et le volume des procédures sont confirmés par le médecin après l’examen clinique et les examens diagnostiques nécessaires.',
    intro: 'Nous vous proposons un plan de traitement personnalisé basé sur les informations fournies. Les pages suivantes résument le traitement sélectionné, l’hébergement, les services et les modalités de paiement.',
    installment: 'PLAN DE PAIEMENT POUR LES ÉTATS-UNIS / CANADA', package: 'Forfait +', installmentAmount: 'Montant du financement', remainingCash: 'Solde restant', cashPerVisit: 'Paiement comptant par visite', option: 'OPTION', translationNotice: 'Plan de traitement traduit à partir des données confirmées du médecin.',
  },
  Spanish: {
    proposal: 'PLAN DE TRATAMIENTO PERSONALIZADO', preparedFor: 'Preparado para', date: 'Fecha', treatmentPlan: 'PLAN DE TRATAMIENTO', treatment: 'Tratamiento', quantity: 'Cant.', unitPrice: 'Precio unitario', total: 'Total',
    implants: 'Implantes', crowns: 'Coronas', bridge: 'Puente de arco completo', procedures: 'Procedimientos adicionales', accommodation: 'ALOJAMIENTO Y SERVICIOS', visit1: 'PRIMERA VISITA', visit2: 'SEGUNDA VISITA', flightTicket: 'Billete de avión', hotel: 'Hotel', room: 'Habitación', nights: 'Noches', perNight: 'Precio / noche', services: 'Servicios', details: 'Detalles', included: 'Incluido',
    transfer: 'Traslado VIP', prosthesis: 'Prótesis dental', translator: 'Intérprete', paymentByVisit: 'Pago por visita', optionTotal: 'Total de la opción', visit: 'Visita', oneVisit: '1 visita', twoVisits: '2 visitas', important: 'IMPORTANTE',
    generated: 'Este documento se generó automáticamente a partir de la opción de tratamiento seleccionada.', disclaimer: 'El plan de tratamiento final y el alcance de los procedimientos serán confirmados por el médico después del examen clínico y las pruebas diagnósticas necesarias.',
    intro: 'Le ofrecemos un plan de tratamiento personalizado basado en la información proporcionada. Las siguientes páginas resumen el tratamiento seleccionado, alojamiento, servicios y forma de pago.',
    installment: 'PLAN DE CUOTAS PARA EE. UU. / CANADÁ', package: 'Paquete +', installmentAmount: 'Importe financiado', remainingCash: 'Saldo restante', cashPerVisit: 'Pago en efectivo por visita', option: 'OPCIÓN', translationNotice: 'Plan de tratamiento traducido a partir de los datos confirmados por el médico.',
  },
};

/** Returns the label set for a language, defaulting to English for anything not in `SIMPLE_LABELS` (mirrors legacy `pdfLabels()`'s `|| dictionaries.English` fallback). */
export function getSimpleLabels(language: string): SimpleLabels {
  return (SIMPLE_LABELS as Record<string, SimpleLabels>)[language] ?? SIMPLE_LABELS.English;
}

/**
 * Translated display names for implant-system option names (e.g. "German" → "Немецкая система").
 * Legacy source: `pdfOptionName()`'s `maps` object. English has no explicit map (falls through
 * to the raw value, matching legacy behavior where `maps.English` is undefined).
 */
export const OPTION_NAME_TRANSLATIONS: Partial<Record<SimpleLatinLanguage, Record<string, string>>> = {
  Russian: {
    German: 'Немецкая система',
    Swiss: 'Швейцарская система',
    American: 'Американская система',
    Korean: 'Корейская система',
    Turkish: 'Турецкая система',
  },
  French: {
    German: 'Système allemand',
    Swiss: 'Système suisse',
    American: 'Système américain',
    Korean: 'Système coréen',
    Turkish: 'Système turc',
  },
  Spanish: {
    German: 'Sistema alemán',
    Swiss: 'Sistema suizo',
    American: 'Sistema americano',
    Korean: 'Sistema coreano',
    Turkish: 'Sistema turco',
  },
};

/**
 * Translated crown/implant product names. Legacy source: `pdfProductLabel()`'s `maps` object.
 * Keys are matched case-insensitively against the trimmed product name.
 */
export const PRODUCT_LABEL_TRANSLATIONS: Partial<Record<SimpleLatinLanguage, Record<string, string>>> = {
  Russian: {
    'zirconium crowns ivoclar german': 'Циркониевые коронки Ivoclar (немецкие)',
    'zirconium crowns emax': 'Циркониевые коронки Emax',
    'zirconium crowns monolithic': 'Монолитные циркониевые коронки',
    'zirconium crowns multilayer': 'Многослойные циркониевые коронки',
    'straumann zirconia': 'Циркониевые коронки Straumann',
  },
  French: {
    'zirconium crowns ivoclar german': 'Couronnes en zircone Ivoclar (allemandes)',
    'zirconium crowns emax': 'Couronnes en zircone Emax',
    'zirconium crowns monolithic': 'Couronnes en zircone monolithique',
    'zirconium crowns multilayer': 'Couronnes en zircone multicouche',
    'straumann zirconia': 'Couronnes en zircone Straumann',
  },
  Spanish: {
    'zirconium crowns ivoclar german': 'Coronas de zirconio Ivoclar (alemanas)',
    'zirconium crowns emax': 'Coronas de zirconio Emax',
    'zirconium crowns monolithic': 'Coronas de zirconio monolítico',
    'zirconium crowns multilayer': 'Coronas de zirconio multicapa',
    'straumann zirconia': 'Coronas de zirconio Straumann',
  },
};

/**
 * Translated additional-procedure names. Legacy source: `pdfProcedureLabel()`'s `maps` object.
 * English is included explicitly (legacy has an `English` entry too, even though it's an identity
 * mapping) so the lookup is uniform across all four languages.
 */
export const PROCEDURE_LABEL_TRANSLATIONS: Record<SimpleLatinLanguage, Record<string, string>> = {
  Russian: { 'bone grafting': 'Костная пластика' },
  French: { 'bone grafting': 'Greffe osseuse' },
  Spanish: { 'bone grafting': 'Injerto óseo' },
  English: { 'bone grafting': 'Bone grafting' },
};
