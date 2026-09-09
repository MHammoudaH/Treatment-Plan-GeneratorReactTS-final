/**
 * Label dictionary for the Premium Proposal PDF.
 *
 * Every user-visible string the Premium template prints lives here, in all five supported
 * languages (English / Russian / French / Spanish / Arabic). Nothing in
 * `generatePremiumQuotationPdf.ts` is hardcoded English any more — Arabic additionally
 * drives the RTL layout (see `dir` handling in the generator).
 */
import type { QuotationLanguage } from '../types';

/** Every language the Premium Proposal supports (Arabic included, unlike the original port). */
export type PremiumLanguage = QuotationLanguage;

/** Grammar-aware treatment-summary fragments (word order differs per language). */
export interface PremiumSummaryLabels {
  upperImplants: (count: number) => string;
  /** `range` is already formatted ("4" or "6–8"); `isRange` is true when min ≠ max. */
  lowerImplants: (range: string, isRange: boolean) => string;
  crowns: (count: number, zirconia: boolean) => string;
}

/** Every static string printed by the Premium Proposal PDF, in one language. */
export interface PremiumLabels {
  // Cover
  proposal: string;
  prepared: string;
  // Section titles / page headers
  treatment: string;
  confirmed: string;
  options: string;
  option: string;
  accommodation: string;
  investment: string;
  team: string;
  experience: string;
  payment: string;
  implantMap: string;
  implantMapIntro: string;
  implant: string;
  crown: string;
  // Treatment table
  procedure: string;
  qty: string;
  total: string;
  dentalImplants: string;
  dentalCrowns: string;
  included: string;
  // Visits & services
  visit1: string;
  visit2: string;
  oneVisit: string;
  twoVisits: string;
  nights: string;
  transfer: string;
  prosthesis: string;
  translator: string;
  // Investment / payment
  selectedOption: string;
  paymentTBD: string;
  packagePlus: string;
  installmentAmount: string;
  remainingCash: string;
  cashPerVisit: string;
  // Team
  teamFallback: string;
  dentistry: string;
  // Experience
  experienceIntro: string;
  // Closing
  closing: string;
  closingTagline: string;
  important: string;
  disclaimer: string;
  // Misc
  generated: string;
  features: { title: string; body: string }[];
  summary: PremiumSummaryLabels;
}

const EN: PremiumLabels = {
  proposal: 'PERSONALIZED DENTAL TREATMENT PROPOSAL',
  prepared: 'Prepared exclusively for',
  treatment: 'Your Treatment Plan',
  confirmed: 'Doctor-confirmed treatment information',
  options: 'Treatment Options',
  option: 'Option',
  accommodation: 'Accommodation & Services',
  investment: 'Your Investment',
  team: 'Your Dental Team',
  experience: 'Your Istanbul Experience',
  payment: 'Payment by Visit',
  implantMap: 'Implant Map',
  implantMapIntro: 'Planned implant and crown positions for your treatment.',
  implant: 'Implant',
  crown: 'Crown',
  procedure: 'Procedure',
  qty: 'Qty.',
  total: 'Total',
  dentalImplants: 'Dental implants',
  dentalCrowns: 'Dental crowns',
  included: 'Included',
  visit1: 'Visit 1',
  visit2: 'Visit 2',
  oneVisit: '1 visit',
  twoVisits: '2 visits',
  nights: 'nights',
  transfer: 'VIP transfer',
  prosthesis: 'Dental prosthesis',
  translator: 'Translator',
  selectedOption: 'Selected option',
  paymentTBD: 'Payment schedule will be confirmed with the selected treatment option.',
  packagePlus: 'Package +',
  installmentAmount: 'Installment amount',
  remainingCash: 'Remaining cash',
  cashPerVisit: 'Cash per visit',
  teamFallback: 'The dental team profile will be added when doctor data is available.',
  dentistry: 'Dentistry',
  experienceIntro: 'Duty Clinic Istanbul — our facilities and patient areas.',
  closing: 'We look forward to welcoming you to Duty Clinic Istanbul.',
  closingTagline: 'Professional dental care with international standards.',
  important: 'IMPORTANT',
  disclaimer:
    'The final treatment plan and procedure scope are confirmed by the doctor after clinical examination and required diagnostic assessment.',
  generated: 'Prepared automatically from the coordinator-approved quotation.',
  features: [
    { title: 'Modern dentistry', body: 'Personalized treatment planning based on the confirmed clinical information.' },
    { title: 'International patient care', body: 'Coordinated treatment, accommodation and patient support in Istanbul.' },
    { title: 'Transparent quotation', body: 'The investment shown in this proposal comes from the selected quotation option.' },
    { title: 'Doctor-led decisions', body: 'The treating doctor remains responsible for the final clinical plan and procedure scope.' },
  ],
  summary: {
    upperImplants: (n) => `${n} implant${n > 1 ? 's' : ''} for the upper jaw`,
    lowerImplants: (range, isRange) =>
      `${range} implant${isRange ? 's' : ''} for the lower jaw according to clinical examination`,
    crowns: (n, z) => `${n} ${z ? 'zirconia ' : ''}crowns`,
  },
};

const RU: PremiumLabels = {
  proposal: 'ПЕРСОНАЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ',
  prepared: 'Подготовлено специально для',
  treatment: 'Ваш план лечения',
  confirmed: 'Подтверждённая врачом информация',
  options: 'Варианты лечения',
  option: 'Вариант',
  accommodation: 'Проживание и услуги',
  investment: 'Стоимость лечения',
  team: 'Ваша стоматологическая команда',
  experience: 'Ваше пребывание в Стамбуле',
  payment: 'Оплата по визитам',
  implantMap: 'Карта имплантации',
  implantMapIntro: 'Запланированные позиции имплантов и коронок для вашего лечения.',
  implant: 'Имплант',
  crown: 'Коронка',
  procedure: 'Процедура',
  qty: 'Кол-во',
  total: 'Итого',
  dentalImplants: 'Зубные импланты',
  dentalCrowns: 'Зубные коронки',
  included: 'Включено',
  visit1: 'Первый визит',
  visit2: 'Второй визит',
  oneVisit: '1 визит',
  twoVisits: '2 визита',
  nights: 'ночей',
  transfer: 'VIP-трансфер',
  prosthesis: 'Зубной протез',
  translator: 'Переводчик',
  selectedOption: 'Выбранный вариант',
  paymentTBD: 'График оплаты будет согласован с выбранным вариантом лечения.',
  packagePlus: 'Пакет +',
  installmentAmount: 'Сумма платежа',
  remainingCash: 'Остаток наличными',
  cashPerVisit: 'Наличными за визит',
  teamFallback: 'Профиль команды будет добавлен, когда появятся данные о врачах.',
  dentistry: 'Стоматология',
  experienceIntro: 'Duty Clinic Istanbul — наша клиника и зоны для пациентов.',
  closing: 'Будем рады приветствовать вас в Duty Clinic Istanbul.',
  closingTagline: 'Профессиональная стоматологическая помощь по международным стандартам.',
  important: 'ВАЖНО',
  disclaimer:
    'Окончательный план лечения и объём процедур подтверждаются врачом после клинического осмотра и необходимых диагностических исследований.',
  generated: 'Документ сформирован автоматически на основании подтверждённого варианта лечения.',
  features: [
    { title: 'Современная стоматология', body: 'Персональное планирование лечения на основе подтверждённой клинической информации.' },
    { title: 'Обслуживание иностранных пациентов', body: 'Координация лечения, проживания и поддержки пациента в Стамбуле.' },
    { title: 'Прозрачная смета', body: 'Стоимость в этом предложении соответствует выбранному варианту лечения.' },
    { title: 'Решения принимает врач', body: 'Лечащий врач несёт ответственность за окончательный план и объём процедур.' },
  ],
  summary: {
    upperImplants: (n) => `${n} имплантатов на верхнюю челюсть`,
    lowerImplants: (range) => `${range} имплантатов на нижнюю челюсть по результатам клинического осмотра`,
    crowns: (n, z) => `${n} ${z ? 'циркониевых ' : ''}коронок`,
  },
};

const FR: PremiumLabels = {
  proposal: 'PLAN DE TRAITEMENT DENTAIRE PERSONNALISÉ',
  prepared: 'Préparé spécialement pour',
  treatment: 'Votre plan de traitement',
  confirmed: 'Informations confirmées par le médecin',
  options: 'Options de traitement',
  option: 'Option',
  accommodation: 'Hébergement et services',
  investment: 'Votre investissement',
  team: 'Votre équipe dentaire',
  experience: 'Votre expérience à Istanbul',
  payment: 'Paiement par visite',
  implantMap: 'Carte implantaire',
  implantMapIntro: 'Positions prévues des implants et des couronnes pour votre traitement.',
  implant: 'Implant',
  crown: 'Couronne',
  procedure: 'Procédure',
  qty: 'Qté',
  total: 'Total',
  dentalImplants: 'Implants dentaires',
  dentalCrowns: 'Couronnes dentaires',
  included: 'Inclus',
  visit1: 'Première visite',
  visit2: 'Deuxième visite',
  oneVisit: '1 visite',
  twoVisits: '2 visites',
  nights: 'nuits',
  transfer: 'Transfert VIP',
  prosthesis: 'Prothèse dentaire',
  translator: 'Interprète',
  selectedOption: 'Option sélectionnée',
  paymentTBD: 'Le calendrier de paiement sera confirmé avec l’option de traitement choisie.',
  packagePlus: 'Forfait +',
  installmentAmount: 'Montant de l’acompte',
  remainingCash: 'Solde en espèces',
  cashPerVisit: 'Espèces par visite',
  teamFallback: 'Le profil de l’équipe sera ajouté lorsque les données des médecins seront disponibles.',
  dentistry: 'Dentisterie',
  experienceIntro: 'Duty Clinic Istanbul — nos installations et espaces patients.',
  closing: 'Nous serons heureux de vous accueillir à Duty Clinic Istanbul.',
  closingTagline: 'Soins dentaires professionnels aux normes internationales.',
  important: 'IMPORTANT',
  disclaimer:
    'Le plan de traitement final et le volume des procédures sont confirmés par le médecin après l’examen clinique et les examens diagnostiques nécessaires.',
  generated: 'Document généré automatiquement à partir du devis approuvé.',
  features: [
    { title: 'Dentisterie moderne', body: 'Planification personnalisée du traitement à partir des informations cliniques confirmées.' },
    { title: 'Prise en charge internationale', body: 'Coordination du traitement, de l’hébergement et de l’accompagnement du patient à Istanbul.' },
    { title: 'Devis transparent', body: 'Le montant indiqué dans cette proposition correspond à l’option de devis sélectionnée.' },
    { title: 'Décisions médicales', body: 'Le médecin traitant reste responsable du plan clinique final et de l’étendue des procédures.' },
  ],
  summary: {
    upperImplants: (n) => `${n} implant${n > 1 ? 's' : ''} pour la mâchoire supérieure`,
    lowerImplants: (range, isRange) =>
      `${range} implant${isRange ? 's' : ''} pour la mâchoire inférieure selon l’examen clinique`,
    crowns: (n, z) => `${n} couronne${n > 1 ? 's' : ''}${z ? ' en zircone' : ''}`,
  },
};

const ES: PremiumLabels = {
  proposal: 'PROPUESTA PERSONALIZADA DE TRATAMIENTO DENTAL',
  prepared: 'Preparado especialmente para',
  treatment: 'Su plan de tratamiento',
  confirmed: 'Información confirmada por el médico',
  options: 'Opciones de tratamiento',
  option: 'Opción',
  accommodation: 'Alojamiento y servicios',
  investment: 'Su inversión',
  team: 'Su equipo dental',
  experience: 'Su experiencia en Estambul',
  payment: 'Pago por visita',
  implantMap: 'Mapa de implantes',
  implantMapIntro: 'Posiciones previstas de implantes y coronas para su tratamiento.',
  implant: 'Implante',
  crown: 'Corona',
  procedure: 'Procedimiento',
  qty: 'Cant.',
  total: 'Total',
  dentalImplants: 'Implantes dentales',
  dentalCrowns: 'Coronas dentales',
  included: 'Incluido',
  visit1: 'Primera visita',
  visit2: 'Segunda visita',
  oneVisit: '1 visita',
  twoVisits: '2 visitas',
  nights: 'noches',
  transfer: 'Traslado VIP',
  prosthesis: 'Prótesis dental',
  translator: 'Intérprete',
  selectedOption: 'Opción seleccionada',
  paymentTBD: 'El calendario de pagos se confirmará con la opción de tratamiento seleccionada.',
  packagePlus: 'Paquete +',
  installmentAmount: 'Importe del pago',
  remainingCash: 'Saldo en efectivo',
  cashPerVisit: 'Efectivo por visita',
  teamFallback: 'El perfil del equipo se añadirá cuando haya datos de los médicos disponibles.',
  dentistry: 'Odontología',
  experienceIntro: 'Duty Clinic Istanbul — nuestras instalaciones y áreas para pacientes.',
  closing: 'Esperamos darle la bienvenida a Duty Clinic Istanbul.',
  closingTagline: 'Atención dental profesional con estándares internacionales.',
  important: 'IMPORTANTE',
  disclaimer:
    'El plan de tratamiento final y el alcance de los procedimientos serán confirmados por el médico después del examen clínico y las pruebas diagnósticas necesarias.',
  generated: 'Documento generado automáticamente a partir de la cotización aprobada.',
  features: [
    { title: 'Odontología moderna', body: 'Planificación personalizada del tratamiento a partir de la información clínica confirmada.' },
    { title: 'Atención al paciente internacional', body: 'Coordinación del tratamiento, el alojamiento y el apoyo al paciente en Estambul.' },
    { title: 'Presupuesto transparente', body: 'El importe mostrado en esta propuesta corresponde a la opción de presupuesto seleccionada.' },
    { title: 'Decisiones del médico', body: 'El médico tratante es responsable del plan clínico final y del alcance de los procedimientos.' },
  ],
  summary: {
    upperImplants: (n) => `${n} implante${n > 1 ? 's' : ''} para el maxilar superior`,
    lowerImplants: (range, isRange) =>
      `${range} implante${isRange ? 's' : ''} para el maxilar inferior según el examen clínico`,
    crowns: (n, z) => `${n} corona${n > 1 ? 's' : ''}${z ? ' de circonio' : ''}`,
  },
};

const AR: PremiumLabels = {
  proposal: 'خطة علاج الأسنان الشخصية',
  prepared: 'أُعدّت خصيصًا لـ',
  treatment: 'خطة علاجك',
  confirmed: 'معلومات العلاج المؤكدة من الطبيب',
  options: 'خيارات العلاج',
  option: 'الخيار',
  accommodation: 'الإقامة والخدمات',
  investment: 'التكلفة',
  team: 'فريق أطباء الأسنان',
  experience: 'تجربتك في إسطنبول',
  payment: 'الدفع حسب الزيارة',
  implantMap: 'خريطة الزرع',
  implantMapIntro: 'المواضع المخططة للزرعات والتيجان لعلاجك.',
  implant: 'زرعة',
  crown: 'تاج',
  procedure: 'الإجراء',
  qty: 'الكمية',
  total: 'الإجمالي',
  dentalImplants: 'زرعات الأسنان',
  dentalCrowns: 'تيجان الأسنان',
  included: 'مشمول',
  visit1: 'الزيارة الأولى',
  visit2: 'الزيارة الثانية',
  oneVisit: 'زيارة واحدة',
  twoVisits: 'زيارتان',
  nights: 'ليالٍ',
  transfer: 'خدمة النقل VIP',
  prosthesis: 'التركيبة السنية',
  translator: 'مترجم',
  selectedOption: 'الخيار المختار',
  paymentTBD: 'سيتم تأكيد جدول الدفع مع خيار العلاج المختار.',
  packagePlus: 'الباقة +',
  installmentAmount: 'قيمة القسط',
  remainingCash: 'المبلغ النقدي المتبقي',
  cashPerVisit: 'المبلغ النقدي لكل زيارة',
  teamFallback: 'ستتم إضافة ملف الفريق عند توفر بيانات الأطباء.',
  dentistry: 'طب الأسنان',
  experienceIntro: 'Duty Clinic Istanbul — مرافقنا ومناطق المرضى.',
  closing: 'نتطلع إلى الترحيب بكم في Duty Clinic Istanbul.',
  closingTagline: 'رعاية أسنان احترافية وفق المعايير الدولية.',
  important: 'هام',
  disclaimer:
    'يتم تأكيد خطة العلاج النهائية ونطاق الإجراءات من قبل الطبيب بعد الفحص السريري والتقييم التشخيصي اللازم.',
  generated: 'أُعدّ هذا المستند تلقائيًا من عرض السعر المعتمد من المنسق.',
  features: [
    { title: 'طب أسنان حديث', body: 'تخطيط علاج شخصي بناءً على المعلومات السريرية المؤكدة.' },
    { title: 'رعاية المرضى الدوليين', body: 'تنسيق العلاج والإقامة ودعم المريض في إسطنبول.' },
    { title: 'عرض سعر شفّاف', body: 'المبلغ الموضّح في هذا العرض مأخوذ من خيار عرض السعر المختار.' },
    { title: 'قرارات بإشراف الطبيب', body: 'يبقى الطبيب المعالج مسؤولًا عن الخطة السريرية النهائية ونطاق الإجراءات.' },
  ],
  summary: {
    upperImplants: (n) => `${n} زرعات في الفك العلوي`,
    lowerImplants: (range) => `${range} زرعات في الفك السفلي حسب الفحص السريري`,
    crowns: (n, z) => `${n} ${z ? 'تيجان من الزيركون' : 'تيجان'}`,
  },
};

/** Legacy source: `premiumLabels()`'s `labels` object, extended to five languages. */
export const PREMIUM_LABELS: Record<PremiumLanguage, PremiumLabels> = {
  English: EN,
  Russian: RU,
  French: FR,
  Spanish: ES,
  Arabic: AR,
};

/** Returns the label set for a language, defaulting to English. */
export function getPremiumLabels(language: string): PremiumLabels {
  return (PREMIUM_LABELS as Record<string, PremiumLabels>)[language] ?? PREMIUM_LABELS.English;
}
