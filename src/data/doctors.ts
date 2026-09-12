/**
 * DutyAI clinical team.
 * Ported from the legacy `assets/doctors/doctors.js`, cross-checked against and enriched
 * with the "Better by MTA" doctor-profile PDFs supplied alongside the legacy codebase
 * (richer education/employment history was found there for Elvin Guliyev and Vail Aksoy
 * than doctors.js's abbreviated fields captured — merged in below, flagged per field).
 *
 * `photoUrl` points at /public/assets/doctors — best-effort matched from the supplied
 * headshot photos; swap the file if a photo needs to be corrected to the right doctor.
 */

export interface EducationEntry {
  degree: string;
  university: string;
  /** Either a single year ("2018") or a range ("2010-2015"), as originally recorded. */
  years?: string;
  year?: string;
}

export interface ExperienceEntry {
  role: string;
  clinic: string;
  location: string;
  period: string;
}

/** What the Premium Proposal's "Your Dental Team" page actually prints for a doctor, in one
 *  non-English language — see `toPdfDoctor`. `name` is never translated (a proper noun). */
export interface DoctorPdfTranslation {
  specialty: string;
  /** The complete one-sentence bio line, pre-written in this language (not composed from
   *  fragments — natural phrasing differs too much per language for safe concatenation). */
  bio: string;
  /** Translated version of `expertise`/`treatments`, capped to 4 — kept for data completeness;
   *  the Premium PDF only falls back to it when `bio` is empty, which never happens today
   *  since `bio` is always populated (see `toPdfDoctor`). */
  expertise?: string[];
}

export interface DoctorProfile {
  id: number;
  name: string;
  clinic: string;
  specialty: string;
  /** e.g. "15 years" — only recorded for Vail Aksoy in the source data. */
  experience?: string;
  education: EducationEntry[];
  /** Clinical focus areas / skills list (legacy `expertise`, used by Vahap Çin, Elvin Guliyev, Vail Aksoy). */
  expertise?: string[];
  /** Courses and awards (legacy `certifications`, used by all four doctors). */
  certifications?: string[];
  /** Patient-facing treatment list shown on the doctor's card. */
  treatments: string[];
  languages?: string[];
  /** Clinics/cities the doctor has practiced in (legacy `locations`, Elvin Guliyev only). */
  locations?: string[];
  /** Detailed employment history, richest for Elvin Guliyev and Vail Aksoy — merged in from
   *  their "Better by MTA" CV PDFs, which had more detail than doctors.js's own field. */
  experienceHistory?: ExperienceEntry[];
  photoUrl: string;
  source: string;
  /** Russian/French/Spanish/Arabic versions of what the Premium Proposal PDF prints for this
   *  doctor — see `DoctorPdfTranslation`. English has no entry here; it's the existing
   *  `specialty`/`expertise`/`treatments` fields above, via `bioFor()`. A good-faith
   *  professional translation — recommend a native-speaker review pass before relying on it
   *  for a patient-facing medical document at scale. */
  translations?: Partial<Record<'Russian' | 'French' | 'Spanish' | 'Arabic', DoctorPdfTranslation>>;
}

export const DOCTORS: DoctorProfile[] = [
  {
    id: 1,
    name: 'Dr. Murat A.',
    clinic: 'Duty Medical',
    specialty: 'Dentistry',
    education: [{ degree: 'Bachelor of Science (BSc) in Dentistry', university: 'Gazi University', year: '2018' }],
    certifications: [
      'ITI International Dental Implantology Congress',
      'Dental Implant and Prosthesis Training',
      'Dental Soft Tissue Surgery Training',
      'Aesthetic Filling Design Training',
    ],
    treatments: ['Dental Implants', 'Prosthetics', 'Soft Tissue Surgery', 'Aesthetic Fillings'],
    languages: [],
    photoUrl: '/assets/doctors/dr-murat-a.jpg',
    source: 'Better by MTA',
    translations: {
      Russian: {
        specialty: 'Стоматология',
        bio: 'Стоматология. Специализация: зубные импланты, протезирование, хирургия мягких тканей.',
        expertise: ['Зубные импланты', 'Протезирование', 'Хирургия мягких тканей', 'Эстетические реставрации'],
      },
      French: {
        specialty: 'Dentisterie',
        bio: 'Dentisterie. Spécialisation : implants dentaires, prothèses, chirurgie des tissus mous.',
        expertise: ['Implants dentaires', 'Prothèses', 'Chirurgie des tissus mous', 'Restaurations esthétiques'],
      },
      Spanish: {
        specialty: 'Odontología',
        bio: 'Odontología. Especialización: implantes dentales, prótesis, cirugía de tejidos blandos.',
        expertise: ['Implantes dentales', 'Prótesis', 'Cirugía de tejidos blandos', 'Restauraciones estéticas'],
      },
      Arabic: {
        specialty: 'طب الأسنان',
        bio: 'طب الأسنان. التخصص: زراعة الأسنان، التركيبات، جراحة الأنسجة الرخوة.',
        expertise: ['زراعة الأسنان', 'التركيبات', 'جراحة الأنسجة الرخوة', 'الحشوات التجميلية'],
      },
    },
  },
  {
    id: 2,
    name: 'Dr. Vahap Çin',
    clinic: 'Duty Medical',
    specialty: 'Prosthetic Dentistry',
    education: [
      { degree: "Bachelor's Degree in Dentistry", university: 'Süleyman Demirel University, Faculty of Dentistry', years: '2010-2015' },
      { degree: 'Specialization in Prosthetic Dental Treatment', university: 'Dicle University, Faculty of Dentistry', years: '2018-2021' },
    ],
    expertise: ['Prosthetic dental treatments', 'Temporomandibular joint disorders', 'Digital Smile Design', 'Implant prosthetics'],
    languages: ['English', 'Arabic', 'Turkish', 'French'],
    certifications: [
      'Temporomandibular Joint Disorders and Occlusion',
      'Digital Smile Design and Veneers',
      'Prostheses on Implants',
      'Aesthetic Filling Systems in Fracture Cases',
      'Photography in Dentistry',
      'Dental Implants',
    ],
    treatments: ['Crowns', 'Gum Disease Treatment', 'Implantology and Oral Surgery', 'Oral Cancer Screening', 'Prosthodontics', 'Root Canal Therapy'],
    photoUrl: '/assets/doctors/dr-vahap-cin.jpg',
    source: 'Better by MTA',
    translations: {
      Russian: {
        specialty: 'Ортопедическая стоматология',
        bio: 'Ортопедическая стоматология. Специализация: протезирование зубов, заболевания височно-нижнечелюстного сустава, цифровой дизайн улыбки.',
        expertise: ['Протезирование зубов', 'Заболевания ВНЧС', 'Цифровой дизайн улыбки', 'Протезирование на имплантах'],
      },
      French: {
        specialty: 'Dentisterie prothétique',
        bio: "Dentisterie prothétique. Spécialisation : traitements prothétiques dentaires, troubles de l'articulation temporo-mandibulaire, Digital Smile Design.",
        expertise: ["Traitements prothétiques dentaires", "Troubles de l'ATM", 'Digital Smile Design', 'Prothèses sur implants'],
      },
      Spanish: {
        specialty: 'Odontología protésica',
        bio: 'Odontología protésica. Especialización: tratamientos protésicos dentales, trastornos de la articulación temporomandibular, diseño digital de sonrisa.',
        expertise: ['Tratamientos protésicos dentales', 'Trastornos de la ATM', 'Diseño digital de sonrisa', 'Prótesis sobre implantes'],
      },
      Arabic: {
        specialty: 'طب أسنان تعويضي',
        bio: 'طب أسنان تعويضي. التخصص: العلاجات التعويضية للأسنان، اضطرابات مفصل الفك الصدغي، تصميم الابتسامة الرقمي.',
        expertise: ['العلاجات التعويضية للأسنان', 'اضطرابات مفصل الفك الصدغي', 'تصميم الابتسامة الرقمي', 'التعويضات على الزرعات'],
      },
    },
  },
  {
    id: 3,
    name: 'Elvin Guliyev',
    clinic: 'Duty Medical',
    specialty: 'Oral, Dental and Maxillofacial Surgery',
    education: [
      { degree: 'Dentistry', university: 'Azerbaijan Medical University, Faculty of Dentistry', years: '2009-2014' },
      {
        degree: 'Oral and Maxillofacial Surgery',
        university: 'Erciyes University, Faculty of Dentistry, Department of Oral and Maxillofacial Surgery',
        years: '2016-2021',
      },
    ],
    expertise: [
      'Impacted tooth extractions',
      'Oroantral fistula treatment',
      'Jaw cysts',
      'Dental implants',
      'Sinus lifts',
      'Zygomatic implants',
      'Subperiosteal implants',
      'Bone grafting',
      'Ridge splitting',
      'Botox procedures',
      'Orthognathic surgery',
      'Jaw fractures',
      'TMJ arthrocentesis',
    ],
    certifications: ['Zygomatic Implants / Cadaver Course', 'Extraoral Surgical Approaches / Cadaver Course'],
    treatments: [
      'Dental Implants',
      'Cosmetic Dentistry',
      'Crowns',
      'Dentures',
      'Endodontics',
      'Gum Disease',
      'Implantology and Oral Surgery',
      'Maxillofacial Surgery',
      'Root Canal Therapy',
      'Veneers',
    ],
    locations: ['Kayseri, Turkey', 'Istanbul, Turkey', 'Antalya, Turkey'],
    // Full employment history from the "Better by MTA" CV PDF — richer than doctors.js's
    // bare `locations` array.
    experienceHistory: [
      { role: 'Oral and Maxillofacial Surgeon', clinic: 'Oral and Dental Health Center', location: 'Kayseri, Turkey', period: 'August 2021 – March 2022' },
      { role: 'Oral and Maxillofacial Surgeon', clinic: 'Okan University Faculty of Dentistry and Hospital', location: 'Istanbul, Turkey', period: 'March 2022 – September 2022' },
      { role: 'Oral and Maxillofacial Surgeon', clinic: 'Attelia Oral and Dental Health Center', location: 'Antalya, Turkey', period: 'September 2022 – April 2023' },
      { role: 'Oral and Maxillofacial Surgeon', clinic: 'Oral and Dental Health Center', location: 'Istanbul, Turkey', period: 'May 2023 – November 2023' },
    ],
    photoUrl: '/assets/doctors/elvin-guliyev.jpg',
    source: 'Better by MTA',
    translations: {
      Russian: {
        specialty: 'Челюстно-лицевая хирургия',
        bio: 'Челюстно-лицевая хирургия. Специализация: удаление ретинированных зубов, лечение ороантральных свищей, кисты челюсти.',
        expertise: ['Удаление ретинированных зубов', 'Лечение ороантральных свищей', 'Кисты челюсти', 'Зубные импланты'],
      },
      French: {
        specialty: 'Chirurgie orale, dentaire et maxillo-faciale',
        bio: 'Chirurgie orale, dentaire et maxillo-faciale. Spécialisation : extraction des dents incluses, traitement des fistules oro-antrales, kystes de la mâchoire.',
        expertise: ['Extraction des dents incluses', 'Traitement des fistules oro-antrales', 'Kystes de la mâchoire', 'Implants dentaires'],
      },
      Spanish: {
        specialty: 'Cirugía oral, dental y maxilofacial',
        bio: 'Cirugía oral, dental y maxilofacial. Especialización: extracción de dientes retenidos, tratamiento de fístulas oroantrales, quistes maxilares.',
        expertise: ['Extracción de dientes retenidos', 'Tratamiento de fístulas oroantrales', 'Quistes maxilares', 'Implantes dentales'],
      },
      Arabic: {
        specialty: 'جراحة الفم والأسنان والفكين',
        bio: 'جراحة الفم والأسنان والفكين. التخصص: خلع الأسنان المطمورة، علاج الناسور الفموي الجيبي، كيسات الفك.',
        expertise: ['خلع الأسنان المطمورة', 'علاج الناسور الفموي الجيبي', 'كيسات الفك', 'زراعة الأسنان'],
      },
    },
  },
  {
    id: 4,
    name: 'Vail Aksoy',
    clinic: 'Duty Medical',
    specialty: 'Prosthodontics and Dental Surgery',
    experience: '15 years',
    education: [
      { degree: "Bachelor's Degree in Dentistry", university: 'Damascus University', years: '2003-2008' },
      { degree: 'Dental Implant Course Diploma', university: 'Damascus University', years: '2013-2014' },
      { degree: 'Dental Equivalency Diploma', university: 'Necmettin Erbakan University', year: '2023' },
    ],
    expertise: [
      'Full-mouth restorations',
      'Lamina veneers',
      'Zirconia crowns',
      'Porcelain restorations',
      'Gingivectomy',
      'Implant-supported prosthetics',
      'Multi-unit abutment systems',
      'T-Base systems',
      'Bar-supported systems',
    ],
    experienceHistory: [
      { role: 'Dentist (Prosthodontist and Medical Tourism)', clinic: 'Private V.T.C. Oral and Dental Health Clinic', location: 'Başakşehir, Istanbul', period: 'May 2024 - Present' },
      { role: 'Dentist (Prosthodontics and Surgery)', clinic: 'Diş Dünyası Oral and Dental Health Clinic', location: 'Gaziantep', period: '2019-2022' },
      { role: 'Chief Dentist', clinic: 'Mavi Hilal International Association', location: 'Şanlıurfa', period: '2018-2019' },
    ],
    treatments: ['Implants', 'Surgical Treatments', 'Full-mouth Restoration', 'Gingivectomy', 'Prosthetics', 'Extractions', 'Root Canal Therapy', 'Restorations'],
    photoUrl: '/assets/doctors/vail-aksoy.jpg',
    source: 'Better by MTA',
    translations: {
      Russian: {
        specialty: 'Ортопедическая стоматология и хирургия',
        bio: 'Ортопедическая стоматология и хирургия · 15 лет опыта. Специализация: полная реставрация зубного ряда, ламинирующие виниры, циркониевые коронки.',
        expertise: ['Полная реставрация зубного ряда', 'Ламинирующие виниры', 'Циркониевые коронки', 'Керамические реставрации'],
      },
      French: {
        specialty: 'Prothèses dentaires et chirurgie',
        bio: "Prothèses dentaires et chirurgie · 15 ans d'expérience. Spécialisation : restaurations complètes, facettes lamina, couronnes en zircone.",
        expertise: ['Restaurations complètes', 'Facettes lamina', 'Couronnes en zircone', 'Restaurations en porcelaine'],
      },
      Spanish: {
        specialty: 'Prostodoncia y cirugía dental',
        bio: 'Prostodoncia y cirugía dental · 15 años de experiencia. Especialización: rehabilitación completa de boca, carillas lamina, coronas de zirconio.',
        expertise: ['Rehabilitación completa de boca', 'Carillas lamina', 'Coronas de zirconio', 'Restauraciones de porcelana'],
      },
      Arabic: {
        specialty: 'طب التعويضات السنية والجراحة',
        bio: 'طب التعويضات السنية والجراحة · خبرة 15 عامًا. التخصص: الترميم الكامل للفم، قشور لامينا، تيجان الزركونيا.',
        expertise: ['الترميم الكامل للفم', 'قشور لامينا', 'تيجان الزركونيا', 'ترميمات البورسلين'],
      },
    },
  },
];

/** Builds a one-line specialty + years-of-experience-derived bio blurb for the Premium
 *  Proposal's minimal `Doctor` shape (English only — other languages use the doctor's own
 *  pre-written `translations[language].bio`, since natural phrasing/word order differs too
 *  much per language for safe fragment concatenation). Legacy `premiumDoctorCards()` printed
 *  specialty + a fixed set of treatment chips; this keeps the same tone in a single sentence. */
function bioFor(doctor: DoctorProfile): string {
  const focus = doctor.expertise?.slice(0, 3).join(', ') ?? doctor.treatments.slice(0, 3).join(', ');
  return `${doctor.specialty}${doctor.experience ? ` · ${doctor.experience} of experience` : ''}. Focus: ${focus}.`;
}

/** Adapts a full `DoctorProfile` to the minimal `Doctor` shape the Premium Proposal PDF
 *  generator (`src/lib/pdf/premium`) expects, in `language` — the same `QuotationLanguage`
 *  driving every other string in that PDF (`data.patient.language`). Falls back to the base
 *  English fields when `language` is English, or when this doctor has no translation entry
 *  for the requested language yet (never a blank/missing card). `name` is never translated. */
export function toPdfDoctor(
  doctor: DoctorProfile,
  language: 'English' | 'Russian' | 'French' | 'Spanish' | 'Arabic' = 'English',
): { name: string; specialty: string; photoUrl: string; bio: string; expertise: string[] } {
  const t = language !== 'English' ? doctor.translations?.[language] : undefined;
  return {
    name: doctor.name,
    specialty: t?.specialty ?? doctor.specialty,
    photoUrl: doctor.photoUrl,
    bio: t?.bio ?? bioFor(doctor),
    expertise: t?.expertise ?? doctor.expertise ?? doctor.treatments,
  };
}
