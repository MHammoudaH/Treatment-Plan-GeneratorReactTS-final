/**
 * Premium Proposal PDF for the Plastic Surgery module — a branded, multi-page
 * document (cover · procedures & investment · before-after gallery · closing),
 * mirroring the dental Premium Proposal's look.
 *
 * Supports COMBINING several procedures into one quotation (`items`, plural) — the
 * coordinator picks as many as the patient wants in one visit, and this renders every one
 * of them with its own overview card plus one shared investment breakdown for the whole
 * combined plan (hotel/transfer/markup apply once, to the visit as a whole, not per procedure).
 *
 * The before-after gallery page is decorative showcase material ("just for the
 * canvas"): photos are auto-matched to each selected procedure's category by
 * `galleryForItem()` and captioned as illustrative, not patient-specific.
 *
 * Must run in a browser: calls `window.open`, `document.write`, `window.print()`.
 * Wire it to a button's `onClick`.
 */
import type { QuotationLanguage } from '../types';
import type { PlasticSurgeryItem } from '../../../data/plasticSurgery';

export type PlasticCurrency = 'EUR' | 'USD' | 'AUD';

export interface PlasticPremiumInput {
  /** One or more procedures combined into this single quotation. */
  items: PlasticSurgeryItem[];
  patientName: string;
  language: QuotationLanguage;
  currency: PlasticCurrency;
  /** Coordinator-assigned doctor, or '' when not yet assigned. */
  doctorName: string;
  /** ISO date string from the date input, or ''. */
  travelDate: string;
  coordinatorNote: string;
  hotelName: string | null;
  hotelNights: number;
  transferIncluded: boolean;
  markupPercent: number;
  /** All amounts already converted to `currency`. */
  amounts: {
    /** One priced line per selected procedure — printed as its own row in the investment
     *  table, e.g. so a 2-procedure quote shows two "Surgery" lines, not one combined figure. */
    surgeryItems: { name: string; amount: number }[];
    hotel: number;
    transfer: number;
    /** Markup amount (not percent). */
    markup: number;
    /** Final total, honouring any coordinator override. */
    total: number;
  };
  /** Resolved before-after image URLs (may be empty). */
  gallery: string[];
}

interface Labels {
  proposal: string;
  preparedFor: string;
  procedure: string;
  overview: string;
  category: string;
  stay: string;
  hospitalStay: string;
  preferredDate: string;
  doctor: string;
  pending: string;
  investment: string;
  surgery: string;
  hotel: string;
  transfer: string;
  markup: string;
  total: string;
  notes: string;
  beforeAfter: string;
  beforeAfterIntro: string;
  galleryOnRequest: string;
  resultsVary: string;
  nights: string;
  closing: string;
  closingTagline: string;
  important: string;
  disclaimer: string;
}

const LABELS: Record<QuotationLanguage, Labels> = {
  English: {
    proposal: 'Aesthetic Surgery Proposal',
    preparedFor: 'Prepared for',
    procedure: 'Procedure',
    overview: 'Procedure overview',
    category: 'Area',
    stay: 'Recommended stay',
    hospitalStay: 'Hospital stay',
    preferredDate: 'Preferred date',
    doctor: 'Surgeon',
    pending: 'To be confirmed by your coordinator',
    investment: 'Your investment',
    surgery: 'Surgery',
    hotel: 'Hotel',
    transfer: 'Airport transfer',
    markup: 'Coordination',
    total: 'Total',
    notes: 'Coordinator notes',
    beforeAfter: 'Before & After',
    beforeAfterIntro: 'A selection of results from our surgical team for procedures in this area.',
    galleryOnRequest: 'A tailored before-and-after selection is available from your coordinator on request.',
    resultsVary: 'Photographs are illustrative. Individual results vary and are discussed during your consultation.',
    nights: 'nights',
    closing: 'We look forward to caring for you in Istanbul',
    closingTagline: 'Aesthetic & Plastic Surgery',
    important: 'IMPORTANT',
    disclaimer:
      'This proposal is an estimate for coordination purposes. Final suitability, technique and pricing are confirmed by the medical team after consultation.',
  },
  Russian: {
    proposal: 'Предложение по пластической хирургии',
    preparedFor: 'Подготовлено для',
    procedure: 'Операция',
    overview: 'Об операции',
    category: 'Зона',
    stay: 'Рекомендуемое пребывание',
    hospitalStay: 'Пребывание в больнице',
    preferredDate: 'Желаемая дата',
    doctor: 'Хирург',
    pending: 'Уточняется координатором',
    investment: 'Стоимость',
    surgery: 'Операция',
    hotel: 'Отель',
    transfer: 'Трансфер из аэропорта',
    markup: 'Координация',
    total: 'Итого',
    notes: 'Примечания координатора',
    beforeAfter: 'До и После',
    beforeAfterIntro: 'Подборка результатов нашей хирургической команды по операциям в этой зоне.',
    galleryOnRequest: 'Индивидуальную подборку фото «до и после» можно запросить у координатора.',
    resultsVary: 'Фотографии приведены для примера. Результаты индивидуальны и обсуждаются на консультации.',
    nights: 'ночей',
    closing: 'Будем рады позаботиться о вас в Стамбуле',
    closingTagline: 'Эстетическая и пластическая хирургия',
    important: 'ВАЖНО',
    disclaimer:
      'Данное предложение является предварительной оценкой для целей координации. Окончательные показания, техника и цена подтверждаются медицинской командой после консультации.',
  },
  French: {
    proposal: 'Proposition de chirurgie esthétique',
    preparedFor: 'Préparé pour',
    procedure: 'Intervention',
    overview: "Présentation de l'intervention",
    category: 'Zone',
    stay: 'Séjour recommandé',
    hospitalStay: 'Séjour hospitalier',
    preferredDate: 'Date souhaitée',
    doctor: 'Chirurgien',
    pending: 'À confirmer par votre coordinateur',
    investment: 'Votre budget',
    surgery: 'Chirurgie',
    hotel: 'Hôtel',
    transfer: 'Transfert aéroport',
    markup: 'Coordination',
    total: 'Total',
    notes: 'Notes du coordinateur',
    beforeAfter: 'Avant & Après',
    beforeAfterIntro: 'Une sélection de résultats de notre équipe chirurgicale pour les interventions de cette zone.',
    galleryOnRequest: 'Une sélection avant/après personnalisée est disponible auprès de votre coordinateur.',
    resultsVary:
      'Les photographies sont illustratives. Les résultats varient selon les personnes et sont discutés lors de la consultation.',
    nights: 'nuits',
    closing: 'Au plaisir de vous accueillir à Istanbul',
    closingTagline: 'Chirurgie esthétique et plastique',
    important: 'IMPORTANT',
    disclaimer:
      "Cette proposition est une estimation à des fins de coordination. L'indication, la technique et le prix définitifs sont confirmés par l'équipe médicale après consultation.",
  },
  Spanish: {
    proposal: 'Propuesta de cirugía estética',
    preparedFor: 'Preparado para',
    procedure: 'Procedimiento',
    overview: 'Descripción del procedimiento',
    category: 'Zona',
    stay: 'Estancia recomendada',
    hospitalStay: 'Estancia hospitalaria',
    preferredDate: 'Fecha preferida',
    doctor: 'Cirujano',
    pending: 'Su coordinador lo confirmará',
    investment: 'Su inversión',
    surgery: 'Cirugía',
    hotel: 'Hotel',
    transfer: 'Traslado desde el aeropuerto',
    markup: 'Coordinación',
    total: 'Total',
    notes: 'Notas del coordinador',
    beforeAfter: 'Antes y Después',
    beforeAfterIntro: 'Una selección de resultados de nuestro equipo quirúrgico para procedimientos en esta zona.',
    galleryOnRequest: 'Su coordinador puede facilitarle una selección de antes y después personalizada.',
    resultsVary:
      'Las fotografías son ilustrativas. Los resultados varían según la persona y se comentan en la consulta.',
    nights: 'noches',
    closing: 'Esperamos cuidar de usted en Estambul',
    closingTagline: 'Cirugía estética y plástica',
    important: 'IMPORTANTE',
    disclaimer:
      'Esta propuesta es una estimación con fines de coordinación. La idoneidad, la técnica y el precio finales los confirma el equipo médico tras la consulta.',
  },
  Arabic: {
    proposal: 'عرض جراحة تجميل',
    preparedFor: 'أُعدّ لأجل',
    procedure: 'العملية',
    overview: 'نظرة عامة على العملية',
    category: 'المنطقة',
    stay: 'مدة الإقامة الموصى بها',
    hospitalStay: 'الإقامة في المستشفى',
    preferredDate: 'التاريخ المفضل',
    doctor: 'الجراح',
    pending: 'سيؤكده المنسق',
    investment: 'التكلفة',
    surgery: 'الجراحة',
    hotel: 'الفندق',
    transfer: 'التوصيل من المطار',
    markup: 'التنسيق',
    total: 'الإجمالي',
    notes: 'ملاحظات المنسق',
    beforeAfter: 'قبل وبعد',
    beforeAfterIntro: 'مجموعة مختارة من نتائج فريقنا الجراحي لعمليات هذه المنطقة.',
    galleryOnRequest: 'يمكن الحصول على مجموعة صور «قبل وبعد» مخصصة من المنسق عند الطلب.',
    resultsVary: 'الصور توضيحية. تختلف النتائج من شخص لآخر وتُناقَش أثناء الاستشارة.',
    nights: 'ليالٍ',
    closing: 'نتطلع إلى العناية بك في إسطنبول',
    closingTagline: 'الجراحة التجميلية والتقويمية',
    important: 'هام',
    disclaimer:
      'هذا العرض تقدير لأغراض التنسيق. يؤكد الفريق الطبي مدى الملاءمة والتقنية والسعر النهائي بعد الاستشارة.',
  },
};

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function symbolFor(currency: PlasticCurrency): string {
  return currency === 'EUR' ? '€' : currency === 'AUD' ? 'A$' : '$';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? esc(iso) : date.toLocaleDateString('en-GB');
}

function money(amount: number, currency: PlasticCurrency): string {
  return `${symbolFor(currency)}${(Number(amount) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

const RTL_CSS = `
  [dir="rtl"] body { font-family: "Segoe UI", "Tahoma", Arial, sans-serif; }
  [dir="rtl"] .kicker, [dir="rtl"] .eyebrow, [dir="rtl"] .page-header,
  [dir="rtl"] .cover h1, [dir="rtl"] .important strong { letter-spacing: 0; }
  [dir="rtl"] .fact-box { border-left: 0; border-right: 4px solid #b3392c; }
  [dir="rtl"] .cover-patient { border-left: 0; border-right: 3px solid #b3392c; padding-left: 0; padding-right: 7mm; }
  [dir="rtl"] .important { text-align: right; }
`;

/** Builds the complete Premium Proposal HTML for `input`, in `input.language`. */
export function generatePlasticPremiumHtml(input: PlasticPremiumInput): string {
  const { items, currency } = input;
  const language: QuotationLanguage = input.language in LABELS ? input.language : 'English';
  const labels = LABELS[language];
  const rtl = language === 'Arabic';
  const patientName = esc(input.patientName) || esc(labels.preparedFor);
  const combinedTitle = esc(items.map((item) => item.name).join(' + '));
  const date = formatDate(input.travelDate);
  const generatedOn = new Date().toLocaleDateString('en-GB');
  const m = (amount: number) => money(amount, currency);

  // One overview card per selected procedure — its own name, note and category/stay/hospital
  // facts — followed by ONE shared fact-grid for the whole visit (date, doctor), since those
  // apply once regardless of how many procedures are combined into this quotation.
  const procedureCards = items
    .map(
      (item) => `
    <div class="procedure-card">
      <strong>${esc(item.name)}</strong>
      ${item.note ? `<p class="intro">${esc(item.note)}</p>` : ''}
      <div class="fact-grid fact-grid-compact">
        <div class="fact"><span>${esc(labels.category)}</span><strong>${esc(item.category)}</strong></div>
        <div class="fact"><span>${esc(labels.stay)}</span><strong>${esc(item.stay)}</strong></div>
        <div class="fact"><span>${esc(labels.hospitalStay)}</span><strong>${esc(item.hospitalStay)}</strong></div>
      </div>
    </div>`,
    )
    .join('');

  const visitFacts: Array<[string, string]> = [];
  if (date) visitFacts.push([labels.preferredDate, date]);
  visitFacts.push([labels.doctor, input.doctorName ? esc(input.doctorName) : esc(labels.pending)]);

  // One investment row per selected procedure, so a combined quote shows exactly what each
  // procedure costs rather than a single opaque "Surgery" figure.
  const investmentRows: string[] = input.amounts.surgeryItems.map(
    (surgery) => `<div class="line"><span>${esc(labels.surgery)} — ${esc(surgery.name)}</span><strong>${m(surgery.amount)}</strong></div>`,
  );
  if (input.hotelName && input.hotelNights > 0) {
    investmentRows.push(
      `<div class="line"><span>${esc(labels.hotel)} — ${esc(input.hotelName)} · ${input.hotelNights} ${esc(labels.nights)}</span><strong>${m(input.amounts.hotel)}</strong></div>`,
    );
  }
  if (input.transferIncluded) {
    investmentRows.push(
      `<div class="line"><span>${esc(labels.transfer)}</span><strong>${m(input.amounts.transfer)}</strong></div>`,
    );
  }
  if (input.markupPercent > 0 && input.amounts.markup > 0) {
    investmentRows.push(
      `<div class="line"><span>${esc(labels.markup)} (${esc(input.markupPercent)}%)</span><strong>${m(input.amounts.markup)}</strong></div>`,
    );
  }

  const galleryPage = `
<section class="page">
  <div class="page-header"><span>${esc(labels.beforeAfter)}</span><strong>${patientName}</strong></div>
  <div class="page-body">
    <div class="kicker">02</div>
    <h2>${esc(labels.beforeAfter)}</h2>
    <p class="intro">${esc(labels.beforeAfterIntro)}</p>
    ${
      input.gallery.length
        ? `<div class="gallery-grid">${input.gallery
            .map((src) => `<img src="${esc(src)}" alt="${esc(labels.beforeAfter)}">`)
            .join('')}</div>`
        : `<div class="fact-box"><p>${esc(labels.galleryOnRequest)}</p></div>`
    }
    <p class="fineprint">${esc(labels.resultsVary)}</p>
  </div>
</section>`;

  const notesBox = input.coordinatorNote.trim()
    ? `<div class="fact-box"><strong>${esc(labels.notes)}</strong><p>${esc(input.coordinatorNote)}</p></div>`
    : '';

  const htmlLang =
    language === 'Russian' ? 'ru' : language === 'French' ? 'fr' : language === 'Spanish' ? 'es' : rtl ? 'ar' : 'en';

  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<title>Duty Clinic — ${patientName}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #17243b; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 17mm; position: relative; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  .page-body { margin-top: 14mm; }
  .cover { color: #fff; background: linear-gradient(135deg, #061a3b 0%, #123, #b3392c 160%); padding: 0; }
  .cover-content { position: relative; z-index: 2; min-height: 297mm; padding: 22mm 19mm; display: flex; flex-direction: column; justify-content: space-between; }
  .logo-card { display: inline-block; background: #fff; padding: 8px 14px; border-radius: 4px; }
  .logo-card img { width: 52mm; display: block; }
  .cover-rule { width: 42mm; height: 2px; background: #b3392c; margin: 16mm 0 8mm; }
  .eyebrow { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; opacity: .82; }
  .cover h1 { font-size: 30px; line-height: 1.1; letter-spacing: 1.4px; margin: 0; max-width: 150mm; }
  .cover-patient { margin-top: 14mm; border-left: 3px solid #b3392c; padding-left: 7mm; }
  .cover-patient small { display: block; text-transform: uppercase; letter-spacing: 2px; opacity: .72; }
  .cover-patient strong { display: block; font-size: 24px; margin-top: 3mm; }
  .cover-footer { font-size: 10px; line-height: 1.6; opacity: .85; }
  .page-header { display: flex; justify-content: space-between; border-bottom: 1px solid #dfe4ea; padding-bottom: 4mm; font-size: 9px; color: #6c7583; text-transform: uppercase; letter-spacing: 1.4px; }
  .page-header strong { color: #17243b; }
  .kicker { color: #b3392c; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .page h2 { font-size: 26px; margin: 5mm 0 7mm; color: #102b4f; }
  .intro { font-size: 11px; line-height: 1.7; color: #5c6674; }
  .fineprint { font-size: 8.5px; line-height: 1.6; color: #8a929e; margin-top: 6mm; }
  .fact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 8mm 0; }
  .fact { border: 1px solid #e0e4e9; border-radius: 6px; padding: 5mm; }
  .procedure-cards { display: flex; flex-direction: column; gap: 4mm; margin-top: 6mm; }
  .procedure-card { border: 1px solid #e0e4e9; border-left: 3px solid #b3392c; border-radius: 6px; padding: 5mm 6mm; }
  .procedure-card > strong { display: block; color: #102b4f; font-size: 13px; }
  .procedure-card .fact-grid-compact { grid-template-columns: repeat(3, 1fr); margin: 4mm 0 0; }
  .procedure-card .fact-grid-compact .fact { padding: 3mm; }
  .procedure-card .fact-grid-compact span { font-size: 7px; }
  .procedure-card .fact-grid-compact strong { font-size: 10px; }
  .fact span { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #8a929e; margin-bottom: 2mm; }
  .fact strong { color: #102b4f; font-size: 12px; }
  .fact-box { margin-top: 7mm; background: #f5f7fa; border-left: 4px solid #b3392c; border-radius: 5px; padding: 6mm; }
  .fact-box strong { color: #102b4f; }
  .fact-box p { margin: 2mm 0 0; font-size: 10px; line-height: 1.6; color: #47505f; }
  .invoice { border: 1px solid #e1e5ea; border-radius: 6px; overflow: hidden; margin-top: 7mm; }
  .invoice .line { display: flex; justify-content: space-between; gap: 4mm; padding: 4mm 5mm; font-size: 10px; border-top: 1px solid #e8ebef; }
  .invoice .line:first-child { border-top: 0; }
  .invoice .line span { color: #47505f; }
  .invoice .line strong { color: #17243b; }
  .total-box { margin-top: 7mm; background: #102b4f; color: #fff; border-radius: 6px; padding: 6mm; display: flex; justify-content: space-between; align-items: center; }
  .total-box strong { font-size: 20px; }
  .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 7mm; }
  .gallery-grid img { width: 100%; height: 88mm; object-fit: contain; border-radius: 7px; display: block; background: #0d1526; }
  .gallery-grid img:only-child { grid-column: 1 / -1; height: 170mm; }
  .closing { min-height: 297mm; background: #071a3b; color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; }
  .closing-inner { max-width: 140mm; }
  .closing h2 { color: #fff; font-size: 27px; }
  .closing p { color: rgba(255,255,255,.76); line-height: 1.8; font-size: 11px; }
  .important { margin-top: 12mm; border: 1px solid rgba(179,57,44,.7); border-radius: 6px; padding: 5mm; text-align: left; }
  .important strong { color: #ff8a80; font-size: 10px; letter-spacing: 1.5px; }
  .important p { margin: 2mm 0 0; font-size: 9px; }
  .contact { margin-top: 10mm; font-size: 9px; line-height: 1.8; }
${RTL_CSS}
</style>
</head>
<body>

<section class="page cover">
  <div class="cover-content">
    <div>
      <div class="logo-card"><img src="/assets/logo/Logo-main.png" alt="Duty Clinic"></div>
      <div class="cover-rule"></div>
      <div class="eyebrow">Duty Clinic Istanbul</div>
      <h1>${esc(labels.proposal)}</h1>
      <div class="cover-patient">
        <small>${esc(labels.preparedFor)}</small>
        <strong>${patientName}</strong>
      </div>
    </div>
    <div class="cover-footer">
      <strong>${combinedTitle}</strong><br>
      Istanbul, Türkiye • +90 536 779 07 91 • dutyclinic.com<br>
      ${esc(generatedOn)}
    </div>
  </div>
</section>

<section class="page">
  <div class="page-header"><span>${esc(labels.procedure)}</span><strong>${patientName}</strong></div>
  <div class="page-body">
    <div class="kicker">01</div>
    <h2>${esc(labels.overview)}</h2>
    <div class="procedure-cards">${procedureCards}</div>
    <div class="fact-grid">
      ${visitFacts.map(([k, v]) => `<div class="fact"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('')}
    </div>
    <div class="kicker">${esc(labels.investment)}</div>
    <div class="invoice">${investmentRows.join('')}</div>
    <div class="total-box"><span>${esc(labels.total)}</span><strong>${m(input.amounts.total)}</strong></div>
    ${notesBox}
  </div>
</section>

${galleryPage}

<section class="page closing">
  <div class="closing-inner">
    <div class="logo-card"><img src="/assets/logo/Logo-main.png" alt="Duty Clinic"></div>
    <h2>${esc(labels.closing)}</h2>
    <p>Duty Clinic Istanbul<br>${esc(labels.closingTagline)}</p>
    <div class="important">
      <strong>${esc(labels.important)}</strong>
      <p>${esc(labels.disclaimer)}</p>
    </div>
    <div class="contact">+90 536 779 07 91<br>dutyclinic.com<br>info@dutyclinic.com</div>
  </div>
</section>

</body>
</html>`;
}

/** Renders, opens and prints the Premium Proposal for `input` (waits for images). */
export function generatePlasticPremiumPdf(input: PlasticPremiumInput): void {
  const html = generatePlasticPremiumHtml(input);
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Please allow pop-ups for DutyAI to generate the Premium Proposal.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const printWhenReady = (): void => {
    const images = Array.from(printWindow.document.images || []);
    const waitForImages = images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
    );

    Promise.all(waitForImages).then(() => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    });
  };

  if (printWindow.document.readyState === 'complete') {
    printWhenReady();
  } else {
    printWindow.addEventListener('load', printWhenReady, { once: true });
  }
}
