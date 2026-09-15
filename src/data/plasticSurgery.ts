export interface PlasticSurgeryItem {
  id: string;
  name: string;
  category: 'Face' | 'Breast' | 'Body' | 'Intimate' | 'Men' | 'Packages' | 'Bariatric';
  /** Fixed EUR catalog price, or `null` when the clinic has no predefined price and the
   *  coordinator must enter one manually on the quotation step (see PlasticSurgeryModule's
   *  per-item "Final price" override) — never treated as €0. */
  priceEur: number | null;
  stay: string;
  hospitalStay: string;
  note?: string;
  /** False for procedures the clinic does not currently perform (e.g. Cat Eyes / Fox Eyes,
   *  Lip Lifting) — kept as a catalog entry for completeness but must never be selectable.
   *  Defaults to true (selectable) when omitted. */
  available?: boolean;
}

export const PLASTIC_SURGERIES: PlasticSurgeryItem[] = [
  { id: 'dimple-one', name: 'Dimple - One Side', category: 'Face', priceEur: 400, stay: '1 night - 1 day', hospitalStay: 'No need' },
  { id: 'dimple-two', name: 'Dimple - Two Sides', category: 'Face', priceEur: 700, stay: '1 night - 1 day', hospitalStay: 'No need' },
  { id: 'rhinoplasty', name: 'Rhinoplasty', category: 'Face', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'septoplasty', name: 'Septoplasty', category: 'Face', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'rhinoplasty-double-chin', name: 'Rhinoplasty + Double Chin Liposuction', category: 'Face', priceEur: 4000, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'second-rhinoplasty', name: 'Second Rhinoplasty', category: 'Face', priceEur: 4000, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'rhinoplasty-cartilage', name: 'Rhinoplasty with Cartilage', category: 'Face', priceEur: 3600, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'laser-rhinoplasty', name: 'Laser Rhinoplasty', category: 'Face', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'blepharoplasty', name: 'Blepharoplasty (Upper, Lower or Both)', category: 'Face', priceEur: 2000, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'face-neck-lift', name: 'Face & Neck Lift', category: 'Face', priceEur: 5000, stay: '8 nights - 9 days', hospitalStay: '1 night', note: 'Patient age must be over 50. Combined with blepharoplasty. Not performed for men. Price is for face + neck lift; blepharoplasty and other additions are quoted on top.' },
  { id: 'jaw-silicone', name: 'Jaw Silicone', category: 'Face', priceEur: 1600, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'jaw-line', name: 'Jaw Line (Jaw Silicone + 4 ml Filler)', category: 'Face', priceEur: 2500, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'otoplasty', name: 'Otoplasty (Ear Reshaping)', category: 'Face', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'bichectomy', name: 'Bichectomy (Buccal Fat Removal)', category: 'Face', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'eyebrow-lift', name: 'Eyebrow Lift', category: 'Face', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'breast-nipple', name: 'Breast Nipple Correction', category: 'Breast', priceEur: 1100, stay: '5 nights - 6 days', hospitalStay: '-' },
  { id: 'breast-reduction', name: 'Breast Reduction', category: 'Breast', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'breast-lift', name: 'Breast Lifting Without Silicone', category: 'Breast', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night' },
  { id: 'silimed-round', name: 'Breast Augmentation - Silimed Circular Silicone', category: 'Breast', priceEur: 2950, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'silimed-lift-round', name: 'Breast Silicone + Lifting - Silimed Circular', category: 'Breast', priceEur: 3500, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'motiva-round', name: 'Breast Augmentation - Motiva Circular Silicone', category: 'Breast', priceEur: 3200, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'motiva-teardrop', name: 'Breast Augmentation - Motiva Teardrop Silicone', category: 'Breast', priceEur: 3400, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'motiva-lift-round', name: 'Breast Silicone + Lifting - Motiva Circular', category: 'Breast', priceEur: 3700, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'motiva-lift-teardrop', name: 'Breast Silicone + Lifting - Motiva Teardrop', category: 'Breast', priceEur: 3900, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'mentor-round', name: 'Breast Augmentation - Mentor Circular Silicone', category: 'Breast', priceEur: 3400, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'mentor-teardrop', name: 'Breast Augmentation - Mentor Teardrop Silicone', category: 'Breast', priceEur: 3600, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'mentor-lift-round', name: 'Breast Silicone + Lifting - Mentor Circular', category: 'Breast', priceEur: 3900, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'mentor-lift-teardrop', name: 'Breast Silicone + Lifting - Mentor Teardrop', category: 'Breast', priceEur: 4100, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'cereform-round', name: 'Breast Augmentation - Cereform Circular Silicone', category: 'Breast', priceEur: 4400, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'cereform-teardrop', name: 'Breast Augmentation - Cereform Teardrop Silicone', category: 'Breast', priceEur: 4600, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'cereform-lift-round', name: 'Breast Silicone + Lifting - Cereform Circular', category: 'Breast', priceEur: 4900, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'cereform-lift-teardrop', name: 'Breast Silicone + Lifting - Cereform Teardrop', category: 'Breast', priceEur: 5000, stay: '6 nights - 7 days', hospitalStay: '1 night' },
  { id: 'lifting-only', name: 'Only Lifting Without Liposuction', category: 'Breast', priceEur: 2500, stay: '6 nights - 7 days', hospitalStay: '2 nights', note: 'Each additional lifting zone: +1,000 EUR.' },
  { id: 'abdominoplasty', name: 'Abdominoplasty (Tummy Tuck)', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'arm-lifting', name: 'Arm Lifting (Brachioplasty)', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'thigh-lifting', name: 'Thigh Lifting', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'vaser-lipo-4d', name: 'Vaser Liposuction 4D', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'bbl-fat-transfer', name: 'BBL (Brazilian Butt Lift by Fat Transfer)', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'varicose-veins', name: 'Varicose Veins (Endovenous Ablation)', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'fat-injection-hands', name: 'Fat Injection into Hands', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—' },
  { id: 'umbilical-hernia', name: 'Umbilical Hernia', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—', note: 'No standalone price — quoted together with the combined procedure.' },
  { id: 'j-plasma', name: 'J-Plasma', category: 'Body', priceEur: null, stay: '—', hospitalStay: '—', note: 'Must be combined with liposuction — see "1-3 Areas Liposuction + 1-3 Areas J-Plasma" for the priced combination.' },
  { id: 'three-area-lipo', name: '3 Areas Liposuction', category: 'Body', priceEur: 2500, stay: '6 nights - 7 days', hospitalStay: '1 night', note: 'Each extra liposuction area: +300 EUR. Each lifting zone: +1,000 EUR.' },
  { id: 'three-area-lipo-bbl', name: '3 Areas Liposuction + BBL', category: 'Packages', priceEur: 3500, stay: '7 nights - 8 days', hospitalStay: '1 night', note: 'Each extra liposuction area: +300 EUR. Each lifting zone: +1,000 EUR.' },
  { id: 'three-area-lipo-breast-bbl', name: '3 Areas Lipo + Breast Silicone +/- Lifting + BBL', category: 'Packages', priceEur: 5500, stay: '8 nights - 9 days', hospitalStay: '2 nights' },
  { id: 'three-area-lipo-rhinoplasty', name: '3 Areas Lipo + Rhinoplasty', category: 'Packages', priceEur: 4100, stay: '8 nights - 9 days', hospitalStay: '2 nights' },
  { id: 'three-area-lipo-breast-rhinoplasty', name: '3 Areas Lipo + Breast Silicone +/- Lifting + Rhinoplasty', category: 'Packages', priceEur: 6500, stay: '8 nights - 9 days', hospitalStay: '2 nights' },
  { id: 'three-area-lipo-motiva-round-no-lift', name: '3 Areas Lipo + Motiva Circular Breast Silicone (Without Lifting)', category: 'Packages', priceEur: 4700, stay: '8 nights - 9 days', hospitalStay: '2 nights' },
  { id: 'three-area-lipo-motiva-round-lift', name: '3 Areas Lipo + Motiva Circular Breast Silicone (With Lifting)', category: 'Packages', priceEur: 5200, stay: '8 nights - 9 days', hospitalStay: '2 nights' },
  { id: 'mommy-makeover', name: 'Mommy Makeover', category: 'Packages', priceEur: null, stay: '—', hospitalStay: '—', note: 'Combined procedure (typically tummy tuck + breast + liposuction) — final price set by the surgeon based on the chosen combination.' },
  { id: 'six-pack', name: 'Six Pack Surgery (Abdominal Etching and Sculpting)', category: 'Body', priceEur: 3200, stay: '6 nights - 7 days', hospitalStay: '2 nights' },
  { id: 'gynecomastia', name: 'Gynecomastia', category: 'Men', priceEur: 2900, stay: '6 nights - 7 days', hospitalStay: '2 nights' },
  { id: 'lipo-jplasma', name: '1-3 Areas Liposuction + 1-3 Areas J-Plasma', category: 'Body', priceEur: 3600, stay: '5 nights - 6 days', hospitalStay: '2 nights', note: 'J-Plasma requires liposuction. Extra lipo area: +300 EUR; extra lipo + J-Plasma area: +400 EUR; BBL: +1,000 EUR.' },
  { id: 'butt-silicone-europe', name: 'Butt Silicone (Sebbin or Polytech)', category: 'Body', priceEur: 4500, stay: '10 nights - 11 days', hospitalStay: '2 nights' },
  { id: 'butt-silicone-american', name: 'Butt Silicone (Implantech FDA Approved)', category: 'Body', priceEur: 4950, stay: '10 nights - 11 days', hospitalStay: '2 nights' },
  { id: 'labiaplasty', name: 'Labiaplasty', category: 'Intimate', priceEur: 1900, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'vaginoplasty', name: 'Vaginal Rejuvenation (Vaginoplasty)', category: 'Intimate', priceEur: 1900, stay: '—', hospitalStay: '—' },
  { id: 'hymen-repair', name: 'Hymen Repair', category: 'Intimate', priceEur: 1900, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'vaginoplasty-labiaplasty', name: 'Vaginal Rejuvenation + Labiaplasty', category: 'Intimate', priceEur: 3500, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'vaginoplasty-labiaplasty-hymen', name: 'Vaginal Rejuvenation + Labiaplasty + Hymen Repair', category: 'Intimate', priceEur: 5000, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'penis-fat', name: 'Penis Enlargement with Fat', category: 'Men', priceEur: 1900, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'penis-lengthening', name: 'Penis Extension or Lengthening', category: 'Men', priceEur: 1900, stay: '8 nights - 9 days', hospitalStay: '1 night' },
  { id: 'penis-combined', name: 'Penis Lengthening + Enlargement with Fat', category: 'Men', priceEur: 3500, stay: '8 nights - 9 days', hospitalStay: '1 night' },

  // Bariatric / gastric — non-surgical (endoscopic) then surgical (laparoscopic).
  // Prices are the starting figure from the Bariatric Treatments book; where the
  // book gives a range it is noted. Surgical bariatrics generally need BMI >= 30
  // with an obesity-related condition, and exclude pregnancy, prior gastric
  // surgery, active cancer, and uncontrolled diabetes (see the training book).
  { id: 'gastric-botox', name: 'Gastric Botox', category: 'Bariatric', priceEur: 1350, stay: '2 nights - 3 days', hospitalStay: 'No need', note: 'Non-surgical, endoscopic (15-20 min under sedation). Appetite suppression lasts 4-6 months; not a permanent solution. Typical range EUR 1,350-2,700 depending on the physician.' },
  { id: 'gastric-balloon', name: 'Gastric Balloon', category: 'Bariatric', priceEur: 1300, stay: '3 nights - 5 days', hospitalStay: 'No need', note: 'Non-surgical endoscopic balloon, removed after 6 or 12 months. Typical range EUR 1,300-4,000 depending on balloon type and duration.' },
  { id: 'elipse-balloon', name: 'Elipse Balloon', category: 'Bariatric', priceEur: 3000, stay: '2 nights - 3 days', hospitalStay: 'No need', note: 'Swallowed capsule balloon, no endoscopy or sedation; deflates and passes naturally after about 4 months. Typical range EUR 3,000-3,500.' },
  { id: 'gastric-sleeve', name: 'Gastric Sleeve (Sleeve Gastrectomy)', category: 'Bariatric', priceEur: 2700, stay: '7 nights - 10 days', hospitalStay: '1-2 nights', note: 'Laparoscopic, irreversible. Price includes pre-op tests, surgery, hospital stay and follow-up. Lifelong supplementation and diet plan required.' },
  { id: 'gastric-bypass', name: 'Gastric Bypass', category: 'Bariatric', priceEur: 3400, stay: '5 nights - 7 days', hospitalStay: '1-2 nights', note: 'Laparoscopic, irreversible. Price includes medications and supplements. Lifelong vitamin/mineral supplementation required.' },
  { id: 'gastric-mini-bypass', name: 'Gastric Mini Bypass', category: 'Bariatric', priceEur: 2900, stay: '5 nights - 7 days', hospitalStay: '1-2 nights', note: 'Laparoscopic, irreversible. Price includes medications and supplements. Simpler/shorter rerouting than a full bypass.' },
  { id: 'gastric-bypass-sadis', name: 'Gastric Bypass SADI-S', category: 'Bariatric', priceEur: 3600, stay: '6 nights - 7 days', hospitalStay: '2 nights', note: 'Sleeve gastrectomy + single-anastomosis duodeno-ileal bypass. Considered irreversible; lifelong supplementation required.' },
  { id: 'gastric-plication', name: 'Gastric Plication', category: 'Bariatric', priceEur: 3000, stay: '5 nights - 7 days', hospitalStay: '2 nights', note: 'Stomach folded and stitched, no tissue removed; reversible. Typical range EUR 3,000-5,000 depending on the surgeon.' },
  { id: 'bari-clip', name: 'Gastric Bari-Clip', category: 'Bariatric', priceEur: 7000, stay: '7 nights - 8 days', hospitalStay: '2 nights', note: 'Silicone clip reshapes the stomach without cutting; reversible and can remain in place up to 20 years.' },
  { id: 'gastric-band', name: 'Gastric Band', category: 'Bariatric', priceEur: null, stay: '—', hospitalStay: '—', note: 'No predefined price — depends on band type and surgeon; reversible/adjustable.' },

  // Not currently performed by the clinic — kept as catalog entries for completeness;
  // `available: false` means PlasticSurgeryModule must never let these be selected.
  { id: 'cat-eyes-fox-eyes', name: 'Cat Eyes / Fox Eyes (surgical)', category: 'Face', priceEur: null, stay: '—', hospitalStay: '—', available: false, note: 'Not currently offered by the clinic.' },
  { id: 'lip-lifting', name: 'Lip Lifting', category: 'Face', priceEur: null, stay: '—', hospitalStay: '—', available: false, note: 'Not currently offered by the clinic.' },
];

export const PLASTIC_CATEGORIES = ['All', 'Face', 'Breast', 'Body', 'Packages', 'Intimate', 'Men', 'Bariatric'] as const;

/**
 * Recommended hotel nights for an operation, parsed from the price-list "Requested Nights"
 * column stored in `stay` (e.g. "7 nights - 8 days" → 7, "1 night - 1 day" → 1, "—" → 0).
 * Used to pre-fill the quotation form; the coordinator can still edit it.
 */
export function recommendedNights(item: Pick<PlasticSurgeryItem, 'stay'>): number {
  const match = item.stay.match(/(\d+)\s*night/i);
  return match ? Number(match[1]) : 0;
}
