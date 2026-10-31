/**
 * Label dictionaries for the Simple Quotation PDF (Russian / English / French / Italian / Spanish).
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
  veneers: string;
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
  /** Section title for the coordinator's free-text notes block — omitted entirely when empty. */
  notes: string;
  /** Printed in the unit-price/total columns of a procedure line whose `priceConfigured` is
   *  false (no catalog price for the display currency AND no coordinator override) — NEVER a
   *  $0/€0 amount for a price that was never actually set. */
  priceTbd: string;
}

/** Legacy source: `pdfLabels()`'s `dictionaries` object. */
export const SIMPLE_LABELS: Record<SimpleLatinLanguage, SimpleLabels> = {
  Russian: {
    proposal: 'ПЕРСОНАЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ', preparedFor: 'Подготовлено для', date: 'Дата', treatmentPlan: 'ПЛАН ЛЕЧЕНИЯ',
    treatment: 'Лечение', quantity: 'Кол-во', unitPrice: 'Цена за единицу', total: 'Стоимость', implants: 'Импланты', crowns: 'Коронки', veneers: 'Виниры', bridge: 'Мостовидный протез',
    procedures: 'Дополнительные процедуры', accommodation: 'ПРОЖИВАНИЕ И УСЛУГИ', visit1: 'ПЕРВЫЙ ВИЗИТ', visit2: 'ВТОРОЙ ВИЗИТ', flightTicket: 'Авиабилет',
    hotel: 'Отель', room: 'Номер', nights: 'Ночей', perNight: 'Цена за ночь', services: 'Услуги', details: 'Детали', included: 'Включено',
    transfer: 'VIP-трансфер', prosthesis: 'Зубной протез', translator: 'Переводчик', paymentByVisit: 'Оплата по визитам', optionTotal: 'Стоимость варианта',
    visit: 'Визит', oneVisit: '1 визит', twoVisits: '2 визита', important: 'ВАЖНО', generated: 'Документ сформирован автоматически на основании выбранного варианта лечения.',
    disclaimer: 'Окончательный план лечения и объём процедур подтверждаются врачом после клинического осмотра и необходимых диагностических исследований.',
    intro: 'Предлагаем индивидуальный план лечения, подготовленный на основании предоставленной информации. Ниже представлены выбранные варианты лечения, проживание, услуги и порядок оплаты.',
    installment: 'РАССРОЧКА ДЛЯ США / КАНАДЫ', package: 'Пакет +', installmentAmount: 'Сумма рассрочки', remainingCash: 'Оставшаяся сумма', cashPerVisit: 'Оплата наличными по визитам',
    option: 'ВАРИАНТ', translationNotice: 'Перевод плана лечения выполнен на основании подтверждённых данных врача.', notes: 'Примечания', priceTbd: 'Цена уточняется',
  },
  English: {
    proposal: 'PERSONALIZED TREATMENT PROPOSAL', preparedFor: 'Prepared for', date: 'Date', treatmentPlan: 'TREATMENT PLAN', treatment: 'Treatment', quantity: 'Qty.', unitPrice: 'Unit price', total: 'Total',
    implants: 'Implants', crowns: 'Crowns', veneers: 'Veneers', bridge: 'Full-arch bridge', procedures: 'Additional procedures', accommodation: 'ACCOMMODATION & SERVICES', visit1: 'VISIT 1', visit2: 'VISIT 2', flightTicket: 'Flight ticket', hotel: 'Hotel', room: 'Room', nights: 'Nights', perNight: 'Price / night', services: 'Services', details: 'Details', included: 'Included',
    transfer: 'VIP transfer', prosthesis: 'Dental prosthesis', translator: 'Translator', paymentByVisit: 'Payment by visit', optionTotal: 'Option total', visit: 'Visit', oneVisit: '1 visit', twoVisits: '2 visits', important: 'IMPORTANT',
    generated: 'This document was generated automatically from the selected treatment option.', disclaimer: 'The final treatment plan and procedure scope are confirmed by the doctor after clinical examination and required diagnostic assessment.',
    intro: 'We are pleased to provide your personalized treatment proposal based on the information provided. The following pages summarize the selected treatment, accommodation, services and payment plan.',
    installment: 'US / CANADA INSTALLMENT PLAN', package: 'Package +', installmentAmount: 'Installment amount', remainingCash: 'Remaining cash', cashPerVisit: 'Cash per visit', option: 'OPTION', translationNotice: 'Treatment plan translated from the confirmed doctor data.', notes: 'Notes', priceTbd: 'Price to be confirmed',
  },
  French: {
    proposal: 'PLAN DE TRAITEMENT PERSONNALISÉ', preparedFor: 'Préparé pour', date: 'Date', treatmentPlan: 'PLAN DE TRAITEMENT', treatment: 'Traitement', quantity: 'Qté.', unitPrice: 'Prix unitaire', total: 'Total',
    implants: 'Implants', crowns: 'Couronnes', veneers: 'Facettes', bridge: 'Bridge complet', procedures: 'Procédures supplémentaires', accommodation: 'HÉBERGEMENT ET SERVICES', visit1: 'PREMIÈRE VISITE', visit2: 'DEUXIÈME VISITE', flightTicket: 'Billet d’avion', hotel: 'Hôtel', room: 'Chambre', nights: 'Nuits', perNight: 'Prix / nuit', services: 'Services', details: 'Détails', included: 'Inclus',
    transfer: 'Transfert VIP', prosthesis: 'Prothèse dentaire', translator: 'Interprète', paymentByVisit: 'Paiement par visite', optionTotal: 'Total de l’option', visit: 'Visite', oneVisit: '1 visite', twoVisits: '2 visites', important: 'IMPORTANT',
    generated: 'Ce document a été généré automatiquement à partir de l’option de traitement sélectionnée.', disclaimer: 'Le plan de traitement final et l’étendue des procédures sont confirmés par le médecin après l’examen clinique et les examens diagnostiques nécessaires.',
    intro: 'Nous vous proposons un plan de traitement personnalisé basé sur les informations fournies. Les pages suivantes résument le traitement sélectionné, l’hébergement, les services et les modalités de paiement.',
    installment: 'PLAN DE PAIEMENT POUR LES ÉTATS-UNIS / CANADA', package: 'Forfait +', installmentAmount: 'Montant du financement', remainingCash: 'Solde restant', cashPerVisit: 'Paiement comptant par visite', option: 'OPTION', translationNotice: 'Plan de traitement traduit à partir des données confirmées du médecin.', notes: 'Notes', priceTbd: 'Prix à confirmer',
  },
  Italian: {
    proposal: 'PIANO DI TRATTAMENTO PERSONALIZZATO', preparedFor: 'Preparato per', date: 'Data', treatmentPlan: 'PIANO DI TRATTAMENTO', treatment: 'Trattamento', quantity: 'Q.tà', unitPrice: 'Prezzo unitario', total: 'Totale',
    implants: 'Impianti', crowns: 'Corone', veneers: 'Faccette', bridge: 'Ponte su arcata completa', procedures: 'Procedure aggiuntive', accommodation: 'ALLOGGIO E SERVIZI', visit1: 'PRIMA VISITA', visit2: 'SECONDA VISITA', flightTicket: 'Biglietto aereo', hotel: 'Hotel', room: 'Camera', nights: 'Notti', perNight: 'Prezzo / notte', services: 'Servizi', details: 'Dettagli', included: 'Incluso',
    transfer: 'Transfer VIP', prosthesis: 'Protesi dentale', translator: 'Interprete', paymentByVisit: 'Pagamento per visita', optionTotal: 'Totale dell’opzione', visit: 'Visita', oneVisit: '1 visita', twoVisits: '2 visite', important: 'IMPORTANTE',
    generated: 'Questo documento è stato generato automaticamente dall’opzione di trattamento selezionata.', disclaimer: 'Il piano di trattamento definitivo e l’entità delle procedure sono confermati dal medico dopo la visita clinica e gli accertamenti diagnostici necessari.',
    intro: 'Le proponiamo un piano di trattamento personalizzato basato sulle informazioni fornite. Le pagine seguenti riassumono il trattamento selezionato, l’alloggio, i servizi e le modalità di pagamento.',
    installment: 'PIANO RATEALE PER STATI UNITI / CANADA', package: 'Pacchetto +', installmentAmount: 'Importo finanziato', remainingCash: 'Saldo restante', cashPerVisit: 'Pagamento in contanti per visita', option: 'OPZIONE', translationNotice: 'Piano di trattamento tradotto dai dati confermati dal medico.', notes: 'Note', priceTbd: 'Prezzo da confermare',
  },
  Spanish: {
    proposal: 'PLAN DE TRATAMIENTO PERSONALIZADO', preparedFor: 'Preparado para', date: 'Fecha', treatmentPlan: 'PLAN DE TRATAMIENTO', treatment: 'Tratamiento', quantity: 'Cant.', unitPrice: 'Precio unitario', total: 'Total',
    implants: 'Implantes', crowns: 'Coronas', veneers: 'Carillas', bridge: 'Puente de arco completo', procedures: 'Procedimientos adicionales', accommodation: 'ALOJAMIENTO Y SERVICIOS', visit1: 'PRIMERA VISITA', visit2: 'SEGUNDA VISITA', flightTicket: 'Billete de avión', hotel: 'Hotel', room: 'Habitación', nights: 'Noches', perNight: 'Precio / noche', services: 'Servicios', details: 'Detalles', included: 'Incluido',
    transfer: 'Traslado VIP', prosthesis: 'Prótesis dental', translator: 'Intérprete', paymentByVisit: 'Pago por visita', optionTotal: 'Total de la opción', visit: 'Visita', oneVisit: '1 visita', twoVisits: '2 visitas', important: 'IMPORTANTE',
    generated: 'Este documento se generó automáticamente a partir de la opción de tratamiento seleccionada.', disclaimer: 'El plan de tratamiento final y el alcance de los procedimientos serán confirmados por el médico después del examen clínico y las pruebas diagnósticas necesarias.',
    intro: 'Le ofrecemos un plan de tratamiento personalizado basado en la información proporcionada. Las siguientes páginas resumen el tratamiento seleccionado, alojamiento, servicios y forma de pago.',
    installment: 'PLAN DE CUOTAS PARA EE. UU. / CANADÁ', package: 'Paquete +', installmentAmount: 'Importe financiado', remainingCash: 'Saldo restante', cashPerVisit: 'Pago en efectivo por visita', option: 'OPCIÓN', translationNotice: 'Plan de tratamiento traducido a partir de los datos confirmados por el médico.', notes: 'Notas', priceTbd: 'Precio por confirmar',
  },
};

/** Returns the label set for a language, defaulting to English for anything not in `SIMPLE_LABELS` (mirrors legacy `pdfLabels()`'s `|| dictionaries.English` fallback). */
export function getSimpleLabels(language: string): SimpleLabels {
  return (SIMPLE_LABELS as Record<string, SimpleLabels>)[language] ?? SIMPLE_LABELS.English;
}
