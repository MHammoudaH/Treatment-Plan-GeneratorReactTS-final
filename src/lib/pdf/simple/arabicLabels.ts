/**
 * Label dictionary for the dedicated Arabic (RTL) Simple Quotation PDF.
 * Ported verbatim from legacy `pdf-generator-ar.js`'s `arPdfLabels()`. Arabic has no
 * language variants — this is a single fixed dictionary, unlike `SIMPLE_LABELS`.
 */

export interface ArabicLabels {
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
  visit: string;
  oneVisit: string;
  twoVisits: string;
  important: string;
  disclaimer: string;
  generated: string;
  intro: string;
  installment: string;
  package: string;
  installmentAmount: string;
  remainingCash: string;
  cashPerVisit: string;
  option: string;
  translationNotice: string;
  roomSingle: string;
  roomDouble: string;
}

/** Legacy source: `arPdfLabels()`. */
export const ARABIC_LABELS: ArabicLabels = {
  proposal: 'خطة العلاج الشخصية',
  preparedFor: 'مُعدّة لـ',
  date: 'التاريخ',
  treatmentPlan: 'خطة العلاج',
  treatment: 'العلاج',
  quantity: 'الكمية',
  unitPrice: 'سعر الوحدة',
  total: 'الإجمالي',
  implants: 'زراعة الأسنان',
  crowns: 'التيجان',
  bridge: 'الجسر التعويضي الكامل',
  procedures: 'إجراءات إضافية',
  accommodation: 'الإقامة والخدمات',
  visit1: 'الزيارة الأولى',
  visit2: 'الزيارة الثانية',
  flightTicket: 'تذكرة الطيران',
  hotel: 'الفندق',
  room: 'الغرفة',
  nights: 'الليالي',
  perNight: 'السعر / الليلة',
  services: 'الخدمات',
  details: 'التفاصيل',
  included: 'مشمول',
  transfer: 'نقل VIP',
  prosthesis: 'التركيبة المؤقتة للأسنان',
  translator: 'مترجم',
  paymentByVisit: 'الدفع حسب الزيارة',
  visit: 'الزيارة',
  oneVisit: 'زيارة واحدة',
  twoVisits: 'زيارتان',
  important: 'مهم',
  disclaimer: 'يتم تأكيد خطة العلاج النهائية ونطاق الإجراءات من قبل الطبيب بعد الفحص السريري والفحوصات التشخيصية اللازمة.',
  generated: 'تم إنشاء هذا المستند تلقائياً بناءً على خيار العلاج المحدد.',
  intro: 'نقدم لكم خطة علاج شخصية بناءً على المعلومات المقدمة. تلخص الصفحات التالية العلاج المختار والإقامة والخدمات وخطة الدفع.',
  installment: 'خطة التقسيط للولايات المتحدة / كندا',
  package: 'الباقة +',
  installmentAmount: 'مبلغ التقسيط',
  remainingCash: 'المبلغ المتبقي',
  cashPerVisit: 'الدفع النقدي لكل زيارة',
  option: 'الخيار',
  translationNotice: 'تمت ترجمة خطة العلاج بناءً على بيانات الطبيب المؤكدة.',
  roomSingle: 'مفردة',
  roomDouble: 'مزدوجة',
};
