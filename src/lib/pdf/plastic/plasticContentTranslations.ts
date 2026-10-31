/**
 * Translations for the catalog DATA the Plastic Premium Proposal prints: procedure names, notes,
 * areas and stay lengths. Keyed by procedure id. The static chrome lives in the generator's own
 * `LABELS`; the catalog itself (`src/data/plasticSurgery.ts`) stays English for the coordinator.
 *
 * English is the catalog itself, so every other PDF language is covered here.
 * `frenchItalian.test.ts` fails if a procedure is added without its translations. A good-faith
 * professional translation: have a native-speaking clinician review it before relying on it for
 * patient-facing medical documents.
 */
import type { PlasticSurgeryItem } from '../../../data/plasticSurgery';
import type { QuotationLanguage } from '../types';
import { formatStayCount, type StayUnit } from '../plurals';

type ContentLanguage = Exclude<QuotationLanguage, 'English'>;
type ItemText = { name: string; note?: string };

export const PLASTIC_CONTENT_LANGUAGES: readonly ContentLanguage[] = ['Russian', 'French', 'Italian', 'Spanish', 'Arabic'];

const isContentLanguage = (language: QuotationLanguage): language is ContentLanguage =>
  (PLASTIC_CONTENT_LANGUAGES as readonly string[]).includes(language);

const FR_EXTRA_LIPO_LIFT = 'Chaque zone de liposuccion supplémentaire : +300 EUR. Chaque zone de lifting : +1 000 EUR.';
const IT_EXTRA_LIPO_LIFT = 'Ogni zona di liposuzione aggiuntiva: +300 EUR. Ogni zona di lifting: +1.000 EUR.';
const FR_NOT_OFFERED = 'Actuellement non proposé par la clinique.';
const IT_NOT_OFFERED = 'Attualmente non offerto dalla clinica.';
const RU_EXTRA_LIPO_LIFT = 'Каждая дополнительная зона липосакции: +300 EUR. Каждая зона подтяжки: +1 000 EUR.';
const ES_EXTRA_LIPO_LIFT = 'Cada zona adicional de liposucción: +300 EUR. Cada zona de lifting: +1.000 EUR.';
const AR_EXTRA_LIPO_LIFT = 'كل منطقة شفط دهون إضافية: 300 يورو إضافية. كل منطقة شد: 1,000 يورو إضافية.';
const RU_NOT_OFFERED = 'В настоящее время клиника не выполняет эту операцию.';
const ES_NOT_OFFERED = 'Actualmente la clínica no ofrece este procedimiento.';
const AR_NOT_OFFERED = 'لا تقدم العيادة هذا الإجراء حاليًا.';

export const PLASTIC_ITEM_TEXT: Record<ContentLanguage, Record<string, ItemText>> = {
  French: {
    'dimple-one': { name: 'Création de fossette - un côté' },
    'dimple-two': { name: 'Création de fossettes - deux côtés' },
    rhinoplasty: { name: 'Rhinoplastie' },
    septoplasty: { name: 'Septoplastie' },
    'rhinoplasty-double-chin': { name: 'Rhinoplastie + liposuccion du double menton' },
    'second-rhinoplasty': { name: 'Rhinoplastie secondaire' },
    'rhinoplasty-cartilage': { name: 'Rhinoplastie avec cartilage' },
    'laser-rhinoplasty': { name: 'Rhinoplastie au laser' },
    blepharoplasty: { name: 'Blépharoplastie (supérieure, inférieure ou les deux)' },
    'face-neck-lift': {
      name: 'Lifting du visage et du cou',
      note: "Le patient doit avoir plus de 50 ans. Combiné à une blépharoplastie. Non réalisé chez l'homme. Le prix couvre le lifting du visage et du cou ; la blépharoplastie et les autres ajouts sont chiffrés en supplément.",
    },
    'jaw-silicone': { name: 'Implant en silicone de la mâchoire' },
    'jaw-line': { name: 'Ligne de la mâchoire (implant en silicone + 4 ml de filler)' },
    otoplasty: { name: 'Otoplastie (correction des oreilles)' },
    bichectomy: { name: 'Bichectomie (retrait des boules de Bichat)' },
    'eyebrow-lift': { name: 'Lifting des sourcils' },
    'breast-nipple': { name: 'Correction du mamelon' },
    'breast-reduction': { name: 'Réduction mammaire' },
    'breast-lift': { name: 'Lifting mammaire sans implants' },
    'silimed-round': { name: 'Augmentation mammaire - implants ronds Silimed' },
    'silimed-lift-round': { name: 'Implants mammaires + lifting - ronds Silimed' },
    'motiva-round': { name: 'Augmentation mammaire - implants ronds Motiva' },
    'motiva-teardrop': { name: 'Augmentation mammaire - implants anatomiques Motiva' },
    'motiva-lift-round': { name: 'Implants mammaires + lifting - ronds Motiva' },
    'motiva-lift-teardrop': { name: 'Implants mammaires + lifting - anatomiques Motiva' },
    'mentor-round': { name: 'Augmentation mammaire - implants ronds Mentor' },
    'mentor-teardrop': { name: 'Augmentation mammaire - implants anatomiques Mentor' },
    'mentor-lift-round': { name: 'Implants mammaires + lifting - ronds Mentor' },
    'mentor-lift-teardrop': { name: 'Implants mammaires + lifting - anatomiques Mentor' },
    'cereform-round': { name: 'Augmentation mammaire - implants ronds Cereform' },
    'cereform-teardrop': { name: 'Augmentation mammaire - implants anatomiques Cereform' },
    'cereform-lift-round': { name: 'Implants mammaires + lifting - ronds Cereform' },
    'cereform-lift-teardrop': { name: 'Implants mammaires + lifting - anatomiques Cereform' },
    'lifting-only': { name: 'Lifting seul sans liposuccion', note: 'Chaque zone de lifting supplémentaire : +1 000 EUR.' },
    abdominoplasty: { name: 'Abdominoplastie' },
    'arm-lifting': { name: 'Lifting des bras (brachioplastie)' },
    'thigh-lifting': { name: 'Lifting des cuisses' },
    'vaser-lipo-4d': { name: 'Liposuccion Vaser 4D' },
    'bbl-fat-transfer': { name: 'BBL (lifting brésilien des fesses par transfert de graisse)' },
    'varicose-veins': { name: 'Varices (ablation endoveineuse)' },
    'fat-injection-hands': { name: 'Injection de graisse dans les mains' },
    'umbilical-hernia': { name: 'Hernie ombilicale', note: "Pas de prix séparé — chiffré avec l'intervention combinée." },
    'j-plasma': {
      name: 'J-Plasma',
      note: 'À combiner obligatoirement avec une liposuccion — voir « Liposuccion de 1 à 3 zones + J-Plasma de 1 à 3 zones » pour le prix de la combinaison.',
    },
    'three-area-lipo': { name: 'Liposuccion de 3 zones', note: FR_EXTRA_LIPO_LIFT },
    'three-area-lipo-bbl': { name: 'Liposuccion de 3 zones + BBL', note: FR_EXTRA_LIPO_LIFT },
    'three-area-lipo-breast-bbl': { name: 'Liposuccion de 3 zones + implants mammaires avec ou sans lifting + BBL' },
    'three-area-lipo-rhinoplasty': { name: 'Liposuccion de 3 zones + rhinoplastie' },
    'three-area-lipo-breast-rhinoplasty': { name: 'Liposuccion de 3 zones + implants mammaires avec ou sans lifting + rhinoplastie' },
    'three-area-lipo-motiva-round-no-lift': { name: 'Liposuccion de 3 zones + implants mammaires ronds Motiva (sans lifting)' },
    'three-area-lipo-motiva-round-lift': { name: 'Liposuccion de 3 zones + implants mammaires ronds Motiva (avec lifting)' },
    'mommy-makeover': {
      name: 'Mommy Makeover',
      note: 'Intervention combinée (généralement abdominoplastie + poitrine + liposuccion) — prix final fixé par le chirurgien selon la combinaison choisie.',
    },
    'six-pack': { name: 'Chirurgie Six Pack (sculpture abdominale)' },
    gynecomastia: { name: 'Gynécomastie' },
    'lipo-jplasma': {
      name: 'Liposuccion de 1 à 3 zones + J-Plasma de 1 à 3 zones',
      note: 'Le J-Plasma nécessite une liposuccion. Zone de liposuccion supplémentaire : +300 EUR ; zone de liposuccion + J-Plasma supplémentaire : +400 EUR ; BBL : +1 000 EUR.',
    },
    'butt-silicone-europe': { name: 'Implants fessiers (Sebbin ou Polytech)' },
    'butt-silicone-american': { name: 'Implants fessiers (Implantech, approuvés par la FDA)' },
    labiaplasty: { name: 'Nymphoplastie' },
    vaginoplasty: { name: 'Rajeunissement vaginal (vaginoplastie)' },
    'hymen-repair': { name: "Réparation de l'hymen" },
    'vaginoplasty-labiaplasty': { name: 'Rajeunissement vaginal + nymphoplastie' },
    'vaginoplasty-labiaplasty-hymen': { name: "Rajeunissement vaginal + nymphoplastie + réparation de l'hymen" },
    'penis-fat': { name: 'Élargissement du pénis par la graisse' },
    'penis-lengthening': { name: 'Allongement du pénis' },
    'penis-combined': { name: 'Allongement du pénis + élargissement par la graisse' },
    'gastric-botox': {
      name: 'Botox gastrique',
      note: "Non chirurgical, par endoscopie (15-20 min sous sédation). L'effet coupe-faim dure 4 à 6 mois ; ce n'est pas une solution définitive. Fourchette habituelle : 1 350-2 700 EUR selon le médecin.",
    },
    'gastric-balloon': {
      name: 'Ballon gastrique',
      note: 'Ballon endoscopique non chirurgical, retiré après 6 ou 12 mois. Fourchette habituelle : 1 300-4 000 EUR selon le type de ballon et la durée.',
    },
    'elipse-balloon': {
      name: 'Ballon Elipse',
      note: "Ballon en gélule à avaler, sans endoscopie ni sédation ; il se dégonfle et s'élimine naturellement après environ 4 mois. Fourchette habituelle : 3 000-3 500 EUR.",
    },
    'gastric-sleeve': {
      name: 'Sleeve gastrique (gastrectomie longitudinale)',
      note: "Par laparoscopie, irréversible. Le prix comprend les examens préopératoires, l'intervention, l'hospitalisation et le suivi. Supplémentation et régime à vie nécessaires.",
    },
    'gastric-bypass': {
      name: 'Bypass gastrique',
      note: 'Par laparoscopie, irréversible. Le prix comprend les médicaments et les compléments. Supplémentation en vitamines et minéraux à vie nécessaire.',
    },
    'gastric-mini-bypass': {
      name: 'Mini bypass gastrique',
      note: "Par laparoscopie, irréversible. Le prix comprend les médicaments et les compléments. Dérivation plus simple et plus courte qu'un bypass complet.",
    },
    'gastric-bypass-sadis': {
      name: 'Bypass gastrique SADI-S',
      note: 'Sleeve gastrique + bypass duodéno-iléal à anastomose unique. Considéré comme irréversible ; supplémentation à vie nécessaire.',
    },
    'gastric-plication': {
      name: 'Plicature gastrique',
      note: "Estomac replié et suturé, sans retrait de tissu ; réversible. Fourchette habituelle : 3 000-5 000 EUR selon le chirurgien.",
    },
    'bari-clip': {
      name: 'Bari-Clip gastrique',
      note: "Un clip en silicone remodèle l'estomac sans incision de celui-ci ; réversible, il peut rester en place jusqu'à 20 ans.",
    },
    'gastric-band': { name: 'Anneau gastrique', note: "Pas de prix prédéfini — dépend du type d'anneau et du chirurgien ; réversible et ajustable." },
    'cat-eyes-fox-eyes': { name: 'Cat Eyes / Fox Eyes (chirurgical)', note: FR_NOT_OFFERED },
    'lip-lifting': { name: 'Lifting des lèvres', note: FR_NOT_OFFERED },
  },
  Italian: {
    'dimple-one': { name: 'Creazione di fossetta - un lato' },
    'dimple-two': { name: 'Creazione di fossette - due lati' },
    rhinoplasty: { name: 'Rinoplastica' },
    septoplasty: { name: 'Settoplastica' },
    'rhinoplasty-double-chin': { name: 'Rinoplastica + liposuzione del doppio mento' },
    'second-rhinoplasty': { name: 'Rinoplastica secondaria' },
    'rhinoplasty-cartilage': { name: 'Rinoplastica con cartilagine' },
    'laser-rhinoplasty': { name: 'Rinoplastica laser' },
    blepharoplasty: { name: 'Blefaroplastica (superiore, inferiore o entrambe)' },
    'face-neck-lift': {
      name: 'Lifting di viso e collo',
      note: "Il paziente deve avere più di 50 anni. Abbinato a blefaroplastica. Non eseguito sugli uomini. Il prezzo copre il lifting di viso e collo; la blefaroplastica e altre aggiunte sono quotate a parte.",
    },
    'jaw-silicone': { name: 'Protesi in silicone della mandibola' },
    'jaw-line': { name: 'Linea della mandibola (protesi in silicone + 4 ml di filler)' },
    otoplasty: { name: 'Otoplastica (correzione delle orecchie)' },
    bichectomy: { name: 'Bichectomia (rimozione delle bolle di Bichat)' },
    'eyebrow-lift': { name: 'Lifting delle sopracciglia' },
    'breast-nipple': { name: 'Correzione del capezzolo' },
    'breast-reduction': { name: 'Mastoplastica riduttiva' },
    'breast-lift': { name: 'Mastopessi senza protesi' },
    'silimed-round': { name: 'Mastoplastica additiva - protesi rotonde Silimed' },
    'silimed-lift-round': { name: 'Protesi mammarie + mastopessi - rotonde Silimed' },
    'motiva-round': { name: 'Mastoplastica additiva - protesi rotonde Motiva' },
    'motiva-teardrop': { name: 'Mastoplastica additiva - protesi anatomiche Motiva' },
    'motiva-lift-round': { name: 'Protesi mammarie + mastopessi - rotonde Motiva' },
    'motiva-lift-teardrop': { name: 'Protesi mammarie + mastopessi - anatomiche Motiva' },
    'mentor-round': { name: 'Mastoplastica additiva - protesi rotonde Mentor' },
    'mentor-teardrop': { name: 'Mastoplastica additiva - protesi anatomiche Mentor' },
    'mentor-lift-round': { name: 'Protesi mammarie + mastopessi - rotonde Mentor' },
    'mentor-lift-teardrop': { name: 'Protesi mammarie + mastopessi - anatomiche Mentor' },
    'cereform-round': { name: 'Mastoplastica additiva - protesi rotonde Cereform' },
    'cereform-teardrop': { name: 'Mastoplastica additiva - protesi anatomiche Cereform' },
    'cereform-lift-round': { name: 'Protesi mammarie + mastopessi - rotonde Cereform' },
    'cereform-lift-teardrop': { name: 'Protesi mammarie + mastopessi - anatomiche Cereform' },
    'lifting-only': { name: 'Solo lifting senza liposuzione', note: 'Ogni zona di lifting aggiuntiva: +1.000 EUR.' },
    abdominoplasty: { name: 'Addominoplastica' },
    'arm-lifting': { name: 'Lifting delle braccia (brachioplastica)' },
    'thigh-lifting': { name: 'Lifting delle cosce' },
    'vaser-lipo-4d': { name: 'Liposuzione Vaser 4D' },
    'bbl-fat-transfer': { name: 'BBL (Brazilian Butt Lift con trasferimento di grasso)' },
    'varicose-veins': { name: 'Varici (ablazione endovenosa)' },
    'fat-injection-hands': { name: 'Iniezione di grasso nelle mani' },
    'umbilical-hernia': { name: 'Ernia ombelicale', note: "Nessun prezzo separato — quotata insieme all'intervento combinato." },
    'j-plasma': {
      name: 'J-Plasma',
      note: 'Deve essere abbinato alla liposuzione — vedere «Liposuzione di 1-3 zone + J-Plasma di 1-3 zone» per il prezzo della combinazione.',
    },
    'three-area-lipo': { name: 'Liposuzione di 3 zone', note: IT_EXTRA_LIPO_LIFT },
    'three-area-lipo-bbl': { name: 'Liposuzione di 3 zone + BBL', note: IT_EXTRA_LIPO_LIFT },
    'three-area-lipo-breast-bbl': { name: 'Liposuzione di 3 zone + protesi mammarie con o senza mastopessi + BBL' },
    'three-area-lipo-rhinoplasty': { name: 'Liposuzione di 3 zone + rinoplastica' },
    'three-area-lipo-breast-rhinoplasty': { name: 'Liposuzione di 3 zone + protesi mammarie con o senza mastopessi + rinoplastica' },
    'three-area-lipo-motiva-round-no-lift': { name: 'Liposuzione di 3 zone + protesi mammarie rotonde Motiva (senza mastopessi)' },
    'three-area-lipo-motiva-round-lift': { name: 'Liposuzione di 3 zone + protesi mammarie rotonde Motiva (con mastopessi)' },
    'mommy-makeover': {
      name: 'Mommy Makeover',
      note: 'Intervento combinato (in genere addominoplastica + seno + liposuzione) — il prezzo finale è stabilito dal chirurgo in base alla combinazione scelta.',
    },
    'six-pack': { name: 'Chirurgia Six Pack (scultura addominale)' },
    gynecomastia: { name: 'Ginecomastia' },
    'lipo-jplasma': {
      name: 'Liposuzione di 1-3 zone + J-Plasma di 1-3 zone',
      note: 'Il J-Plasma richiede la liposuzione. Zona di liposuzione aggiuntiva: +300 EUR; zona aggiuntiva di liposuzione + J-Plasma: +400 EUR; BBL: +1.000 EUR.',
    },
    'butt-silicone-europe': { name: 'Protesi glutee (Sebbin o Polytech)' },
    'butt-silicone-american': { name: 'Protesi glutee (Implantech, approvate dalla FDA)' },
    labiaplasty: { name: 'Labioplastica' },
    vaginoplasty: { name: 'Ringiovanimento vaginale (vaginoplastica)' },
    'hymen-repair': { name: "Ricostruzione dell'imene" },
    'vaginoplasty-labiaplasty': { name: 'Ringiovanimento vaginale + labioplastica' },
    'vaginoplasty-labiaplasty-hymen': { name: "Ringiovanimento vaginale + labioplastica + ricostruzione dell'imene" },
    'penis-fat': { name: 'Ingrandimento del pene con grasso' },
    'penis-lengthening': { name: 'Allungamento del pene' },
    'penis-combined': { name: 'Allungamento del pene + ingrandimento con grasso' },
    'gastric-botox': {
      name: 'Botox gastrico',
      note: "Non chirurgico, per via endoscopica (15-20 min in sedazione). La riduzione dell'appetito dura 4-6 mesi; non è una soluzione definitiva. Fascia abituale: 1.350-2.700 EUR a seconda del medico.",
    },
    'gastric-balloon': {
      name: 'Palloncino gastrico',
      note: 'Palloncino endoscopico non chirurgico, rimosso dopo 6 o 12 mesi. Fascia abituale: 1.300-4.000 EUR a seconda del tipo di palloncino e della durata.',
    },
    'elipse-balloon': {
      name: 'Palloncino Elipse',
      note: 'Palloncino in capsula da ingerire, senza endoscopia né sedazione; si sgonfia e viene espulso naturalmente dopo circa 4 mesi. Fascia abituale: 3.000-3.500 EUR.',
    },
    'gastric-sleeve': {
      name: 'Sleeve gastrectomy (gastrectomia verticale)',
      note: "Per via laparoscopica, irreversibile. Il prezzo comprende gli esami preoperatori, l'intervento, il ricovero e il follow-up. Sono necessari integrazione e piano alimentare per tutta la vita.",
    },
    'gastric-bypass': {
      name: 'Bypass gastrico',
      note: 'Per via laparoscopica, irreversibile. Il prezzo comprende farmaci e integratori. È necessaria integrazione di vitamine e minerali per tutta la vita.',
    },
    'gastric-mini-bypass': {
      name: 'Mini bypass gastrico',
      note: 'Per via laparoscopica, irreversibile. Il prezzo comprende farmaci e integratori. Deviazione più semplice e più breve rispetto a un bypass completo.',
    },
    'gastric-bypass-sadis': {
      name: 'Bypass gastrico SADI-S',
      note: 'Sleeve gastrectomy + bypass duodeno-ileale ad anastomosi singola. Considerato irreversibile; è necessaria integrazione per tutta la vita.',
    },
    'gastric-plication': {
      name: 'Plicatura gastrica',
      note: 'Stomaco ripiegato e suturato, senza rimozione di tessuto; reversibile. Fascia abituale: 3.000-5.000 EUR a seconda del chirurgo.',
    },
    'bari-clip': {
      name: 'Bari-Clip gastrico',
      note: 'Una clip in silicone rimodella lo stomaco senza tagli; reversibile, può rimanere in sede fino a 20 anni.',
    },
    'gastric-band': { name: 'Bendaggio gastrico', note: 'Nessun prezzo predefinito — dipende dal tipo di bendaggio e dal chirurgo; reversibile e regolabile.' },
    'cat-eyes-fox-eyes': { name: 'Cat Eyes / Fox Eyes (chirurgico)', note: IT_NOT_OFFERED },
    'lip-lifting': { name: 'Lifting del labbro', note: IT_NOT_OFFERED },
  },
  Russian: {
    'dimple-one': { name: 'Создание ямочки — одна сторона' },
    'dimple-two': { name: 'Создание ямочек — две стороны' },
    rhinoplasty: { name: 'Ринопластика' },
    septoplasty: { name: 'Септопластика' },
    'rhinoplasty-double-chin': { name: 'Ринопластика + липосакция двойного подбородка' },
    'second-rhinoplasty': { name: 'Повторная ринопластика' },
    'rhinoplasty-cartilage': { name: 'Ринопластика с использованием хряща' },
    'laser-rhinoplasty': { name: 'Лазерная ринопластика' },
    blepharoplasty: { name: 'Блефаропластика (верхняя, нижняя или обе)' },
    'face-neck-lift': {
      name: 'Подтяжка лица и шеи',
      note: 'Возраст пациента должен быть старше 50 лет. Выполняется вместе с блефаропластикой. Мужчинам не выполняется. Цена указана за подтяжку лица и шеи; блефаропластика и другие дополнения рассчитываются отдельно.',
    },
    'jaw-silicone': { name: 'Силиконовый имплант нижней челюсти' },
    'jaw-line': { name: 'Линия челюсти (силиконовый имплант + 4 мл филлера)' },
    otoplasty: { name: 'Отопластика (коррекция ушей)' },
    bichectomy: { name: 'Бишэктомия (удаление комков Биша)' },
    'eyebrow-lift': { name: 'Подтяжка бровей' },
    'breast-nipple': { name: 'Коррекция сосков' },
    'breast-reduction': { name: 'Уменьшение груди' },
    'breast-lift': { name: 'Подтяжка груди без имплантов' },
    'silimed-round': { name: 'Увеличение груди — круглые импланты Silimed' },
    'silimed-lift-round': { name: 'Импланты груди + подтяжка — круглые Silimed' },
    'motiva-round': { name: 'Увеличение груди — круглые импланты Motiva' },
    'motiva-teardrop': { name: 'Увеличение груди — анатомические импланты Motiva' },
    'motiva-lift-round': { name: 'Импланты груди + подтяжка — круглые Motiva' },
    'motiva-lift-teardrop': { name: 'Импланты груди + подтяжка — анатомические Motiva' },
    'mentor-round': { name: 'Увеличение груди — круглые импланты Mentor' },
    'mentor-teardrop': { name: 'Увеличение груди — анатомические импланты Mentor' },
    'mentor-lift-round': { name: 'Импланты груди + подтяжка — круглые Mentor' },
    'mentor-lift-teardrop': { name: 'Импланты груди + подтяжка — анатомические Mentor' },
    'cereform-round': { name: 'Увеличение груди — круглые импланты Cereform' },
    'cereform-teardrop': { name: 'Увеличение груди — анатомические импланты Cereform' },
    'cereform-lift-round': { name: 'Импланты груди + подтяжка — круглые Cereform' },
    'cereform-lift-teardrop': { name: 'Импланты груди + подтяжка — анатомические Cereform' },
    'lifting-only': { name: 'Только подтяжка без липосакции', note: 'Каждая дополнительная зона подтяжки: +1 000 EUR.' },
    abdominoplasty: { name: 'Абдоминопластика' },
    'arm-lifting': { name: 'Подтяжка рук (брахиопластика)' },
    'thigh-lifting': { name: 'Подтяжка бёдер' },
    'vaser-lipo-4d': { name: 'Липосакция Vaser 4D' },
    'bbl-fat-transfer': { name: 'BBL (бразильская подтяжка ягодиц с пересадкой жира)' },
    'varicose-veins': { name: 'Варикозное расширение вен (эндовенозная абляция)' },
    'fat-injection-hands': { name: 'Введение жира в кисти рук' },
    'umbilical-hernia': { name: 'Пупочная грыжа', note: 'Отдельной цены нет — рассчитывается вместе с комбинированной операцией.' },
    'j-plasma': {
      name: 'J-Plasma',
      note: 'Выполняется только вместе с липосакцией — цену комбинации см. в позиции «Липосакция 1–3 зон + J-Plasma 1–3 зон».',
    },
    'three-area-lipo': { name: 'Липосакция 3 зон', note: RU_EXTRA_LIPO_LIFT },
    'three-area-lipo-bbl': { name: 'Липосакция 3 зон + BBL', note: RU_EXTRA_LIPO_LIFT },
    'three-area-lipo-breast-bbl': { name: 'Липосакция 3 зон + импланты груди с подтяжкой или без + BBL' },
    'three-area-lipo-rhinoplasty': { name: 'Липосакция 3 зон + ринопластика' },
    'three-area-lipo-breast-rhinoplasty': { name: 'Липосакция 3 зон + импланты груди с подтяжкой или без + ринопластика' },
    'three-area-lipo-motiva-round-no-lift': { name: 'Липосакция 3 зон + круглые импланты груди Motiva (без подтяжки)' },
    'three-area-lipo-motiva-round-lift': { name: 'Липосакция 3 зон + круглые импланты груди Motiva (с подтяжкой)' },
    'mommy-makeover': {
      name: 'Mommy Makeover',
      note: 'Комбинированная операция (обычно абдоминопластика + грудь + липосакция) — окончательную цену определяет хирург в зависимости от выбранной комбинации.',
    },
    'six-pack': { name: 'Операция Six Pack (скульптурирование живота)' },
    gynecomastia: { name: 'Гинекомастия' },
    'lipo-jplasma': {
      name: 'Липосакция 1–3 зон + J-Plasma 1–3 зон',
      note: 'J-Plasma требует липосакции. Дополнительная зона липосакции: +300 EUR; дополнительная зона липосакции + J-Plasma: +400 EUR; BBL: +1 000 EUR.',
    },
    'butt-silicone-europe': { name: 'Импланты ягодиц (Sebbin или Polytech)' },
    'butt-silicone-american': { name: 'Импланты ягодиц (Implantech, одобрены FDA)' },
    labiaplasty: { name: 'Лабиопластика' },
    vaginoplasty: { name: 'Интимное омоложение (вагинопластика)' },
    'hymen-repair': { name: 'Восстановление девственной плевы' },
    'vaginoplasty-labiaplasty': { name: 'Интимное омоложение + лабиопластика' },
    'vaginoplasty-labiaplasty-hymen': { name: 'Интимное омоложение + лабиопластика + восстановление девственной плевы' },
    'penis-fat': { name: 'Увеличение полового члена с помощью жира' },
    'penis-lengthening': { name: 'Удлинение полового члена' },
    'penis-combined': { name: 'Удлинение полового члена + увеличение с помощью жира' },
    'gastric-botox': {
      name: 'Ботокс желудка',
      note: 'Безоперационная эндоскопическая процедура (15–20 мин под седацией). Снижение аппетита сохраняется 4–6 месяцев; это не постоянное решение. Обычный диапазон: 1 350–2 700 EUR в зависимости от врача.',
    },
    'gastric-balloon': {
      name: 'Внутрижелудочный баллон',
      note: 'Безоперационный эндоскопический баллон, удаляется через 6 или 12 месяцев. Обычный диапазон: 1 300–4 000 EUR в зависимости от типа баллона и срока.',
    },
    'elipse-balloon': {
      name: 'Баллон Elipse',
      note: 'Баллон в капсуле, которую проглатывают, без эндоскопии и седации; примерно через 4 месяца сдувается и выходит естественным путём. Обычный диапазон: 3 000–3 500 EUR.',
    },
    'gastric-sleeve': {
      name: 'Рукавная гастрэктомия (Sleeve)',
      note: 'Лапароскопическая, необратимая операция. Цена включает предоперационные анализы, операцию, пребывание в больнице и наблюдение. Необходимы пожизненный приём добавок и план питания.',
    },
    'gastric-bypass': {
      name: 'Желудочное шунтирование',
      note: 'Лапароскопическая, необратимая операция. Цена включает лекарства и добавки. Необходим пожизненный приём витаминов и минералов.',
    },
    'gastric-mini-bypass': {
      name: 'Мини-шунтирование желудка',
      note: 'Лапароскопическая, необратимая операция. Цена включает лекарства и добавки. Более простое и короткое шунтирование, чем полное.',
    },
    'gastric-bypass-sadis': {
      name: 'Желудочное шунтирование SADI-S',
      note: 'Рукавная гастрэктомия + дуоденоилеальное шунтирование с одним анастомозом. Считается необратимой; необходим пожизненный приём добавок.',
    },
    'gastric-plication': {
      name: 'Пликация желудка',
      note: 'Желудок складывается и ушивается без удаления тканей; обратимая процедура. Обычный диапазон: 3 000–5 000 EUR в зависимости от хирурга.',
    },
    'bari-clip': {
      name: 'Bari-Clip для желудка',
      note: 'Силиконовая клипса меняет форму желудка без разрезания; обратимая процедура, клипса может оставаться до 20 лет.',
    },
    'gastric-band': { name: 'Бандажирование желудка', note: 'Заранее установленной цены нет — зависит от типа бандажа и хирурга; обратимая и регулируемая процедура.' },
    'cat-eyes-fox-eyes': { name: 'Cat Eyes / Fox Eyes (хирургическая)', note: RU_NOT_OFFERED },
    'lip-lifting': { name: 'Подтяжка губ', note: RU_NOT_OFFERED },
  },
  Spanish: {
    'dimple-one': { name: 'Creación de hoyuelo - un lado' },
    'dimple-two': { name: 'Creación de hoyuelos - dos lados' },
    rhinoplasty: { name: 'Rinoplastia' },
    septoplasty: { name: 'Septoplastia' },
    'rhinoplasty-double-chin': { name: 'Rinoplastia + liposucción de papada' },
    'second-rhinoplasty': { name: 'Rinoplastia secundaria' },
    'rhinoplasty-cartilage': { name: 'Rinoplastia con cartílago' },
    'laser-rhinoplasty': { name: 'Rinoplastia láser' },
    blepharoplasty: { name: 'Blefaroplastia (superior, inferior o ambas)' },
    'face-neck-lift': {
      name: 'Lifting de cara y cuello',
      note: 'El paciente debe tener más de 50 años. Se combina con blefaroplastia. No se realiza en hombres. El precio corresponde al lifting de cara y cuello; la blefaroplastia y otros añadidos se presupuestan aparte.',
    },
    'jaw-silicone': { name: 'Implante de silicona mandibular' },
    'jaw-line': { name: 'Línea mandibular (implante de silicona + 4 ml de relleno)' },
    otoplasty: { name: 'Otoplastia (corrección de orejas)' },
    bichectomy: { name: 'Bichectomía (extracción de las bolas de Bichat)' },
    'eyebrow-lift': { name: 'Lifting de cejas' },
    'breast-nipple': { name: 'Corrección del pezón' },
    'breast-reduction': { name: 'Reducción de mamas' },
    'breast-lift': { name: 'Elevación de mamas sin implantes' },
    'silimed-round': { name: 'Aumento de mamas - implantes redondos Silimed' },
    'silimed-lift-round': { name: 'Implantes mamarios + elevación - redondos Silimed' },
    'motiva-round': { name: 'Aumento de mamas - implantes redondos Motiva' },
    'motiva-teardrop': { name: 'Aumento de mamas - implantes anatómicos Motiva' },
    'motiva-lift-round': { name: 'Implantes mamarios + elevación - redondos Motiva' },
    'motiva-lift-teardrop': { name: 'Implantes mamarios + elevación - anatómicos Motiva' },
    'mentor-round': { name: 'Aumento de mamas - implantes redondos Mentor' },
    'mentor-teardrop': { name: 'Aumento de mamas - implantes anatómicos Mentor' },
    'mentor-lift-round': { name: 'Implantes mamarios + elevación - redondos Mentor' },
    'mentor-lift-teardrop': { name: 'Implantes mamarios + elevación - anatómicos Mentor' },
    'cereform-round': { name: 'Aumento de mamas - implantes redondos Cereform' },
    'cereform-teardrop': { name: 'Aumento de mamas - implantes anatómicos Cereform' },
    'cereform-lift-round': { name: 'Implantes mamarios + elevación - redondos Cereform' },
    'cereform-lift-teardrop': { name: 'Implantes mamarios + elevación - anatómicos Cereform' },
    'lifting-only': { name: 'Solo lifting sin liposucción', note: 'Cada zona adicional de lifting: +1.000 EUR.' },
    abdominoplasty: { name: 'Abdominoplastia' },
    'arm-lifting': { name: 'Lifting de brazos (braquioplastia)' },
    'thigh-lifting': { name: 'Lifting de muslos' },
    'vaser-lipo-4d': { name: 'Liposucción Vaser 4D' },
    'bbl-fat-transfer': { name: 'BBL (levantamiento brasileño de glúteos con transferencia de grasa)' },
    'varicose-veins': { name: 'Varices (ablación endovenosa)' },
    'fat-injection-hands': { name: 'Inyección de grasa en las manos' },
    'umbilical-hernia': { name: 'Hernia umbilical', note: 'Sin precio independiente: se presupuesta junto con el procedimiento combinado.' },
    'j-plasma': {
      name: 'J-Plasma',
      note: 'Debe combinarse con liposucción: consulte «Liposucción de 1-3 zonas + J-Plasma de 1-3 zonas» para el precio de la combinación.',
    },
    'three-area-lipo': { name: 'Liposucción de 3 zonas', note: ES_EXTRA_LIPO_LIFT },
    'three-area-lipo-bbl': { name: 'Liposucción de 3 zonas + BBL', note: ES_EXTRA_LIPO_LIFT },
    'three-area-lipo-breast-bbl': { name: 'Liposucción de 3 zonas + implantes mamarios con o sin elevación + BBL' },
    'three-area-lipo-rhinoplasty': { name: 'Liposucción de 3 zonas + rinoplastia' },
    'three-area-lipo-breast-rhinoplasty': { name: 'Liposucción de 3 zonas + implantes mamarios con o sin elevación + rinoplastia' },
    'three-area-lipo-motiva-round-no-lift': { name: 'Liposucción de 3 zonas + implantes mamarios redondos Motiva (sin elevación)' },
    'three-area-lipo-motiva-round-lift': { name: 'Liposucción de 3 zonas + implantes mamarios redondos Motiva (con elevación)' },
    'mommy-makeover': {
      name: 'Mommy Makeover',
      note: 'Procedimiento combinado (normalmente abdominoplastia + mamas + liposucción): el precio final lo fija el cirujano según la combinación elegida.',
    },
    'six-pack': { name: 'Cirugía Six Pack (marcación y esculpido abdominal)' },
    gynecomastia: { name: 'Ginecomastia' },
    'lipo-jplasma': {
      name: 'Liposucción de 1-3 zonas + J-Plasma de 1-3 zonas',
      note: 'El J-Plasma requiere liposucción. Zona adicional de liposucción: +300 EUR; zona adicional de liposucción + J-Plasma: +400 EUR; BBL: +1.000 EUR.',
    },
    'butt-silicone-europe': { name: 'Implantes de glúteos (Sebbin o Polytech)' },
    'butt-silicone-american': { name: 'Implantes de glúteos (Implantech, aprobados por la FDA)' },
    labiaplasty: { name: 'Labioplastia' },
    vaginoplasty: { name: 'Rejuvenecimiento vaginal (vaginoplastia)' },
    'hymen-repair': { name: 'Reconstrucción de himen' },
    'vaginoplasty-labiaplasty': { name: 'Rejuvenecimiento vaginal + labioplastia' },
    'vaginoplasty-labiaplasty-hymen': { name: 'Rejuvenecimiento vaginal + labioplastia + reconstrucción de himen' },
    'penis-fat': { name: 'Engrosamiento del pene con grasa' },
    'penis-lengthening': { name: 'Alargamiento del pene' },
    'penis-combined': { name: 'Alargamiento del pene + engrosamiento con grasa' },
    'gastric-botox': {
      name: 'Botox gástrico',
      note: 'No quirúrgico, por endoscopia (15-20 min con sedación). La reducción del apetito dura 4-6 meses; no es una solución permanente. Rango habitual: 1.350-2.700 EUR según el médico.',
    },
    'gastric-balloon': {
      name: 'Balón gástrico',
      note: 'Balón endoscópico no quirúrgico, que se retira a los 6 o 12 meses. Rango habitual: 1.300-4.000 EUR según el tipo de balón y la duración.',
    },
    'elipse-balloon': {
      name: 'Balón Elipse',
      note: 'Balón en cápsula que se traga, sin endoscopia ni sedación; se desinfla y se expulsa de forma natural tras unos 4 meses. Rango habitual: 3.000-3.500 EUR.',
    },
    'gastric-sleeve': {
      name: 'Manga gástrica (gastrectomía vertical)',
      note: 'Por laparoscopia, irreversible. El precio incluye pruebas preoperatorias, cirugía, estancia hospitalaria y seguimiento. Requiere suplementos y plan de dieta de por vida.',
    },
    'gastric-bypass': {
      name: 'Bypass gástrico',
      note: 'Por laparoscopia, irreversible. El precio incluye medicamentos y suplementos. Requiere suplementos de vitaminas y minerales de por vida.',
    },
    'gastric-mini-bypass': {
      name: 'Mini bypass gástrico',
      note: 'Por laparoscopia, irreversible. El precio incluye medicamentos y suplementos. Derivación más simple y corta que un bypass completo.',
    },
    'gastric-bypass-sadis': {
      name: 'Bypass gástrico SADI-S',
      note: 'Manga gástrica + bypass duodeno-ileal de una anastomosis. Se considera irreversible; requiere suplementos de por vida.',
    },
    'gastric-plication': {
      name: 'Plicatura gástrica',
      note: 'El estómago se pliega y se sutura, sin extirpar tejido; reversible. Rango habitual: 3.000-5.000 EUR según el cirujano.',
    },
    'bari-clip': {
      name: 'Bari-Clip gástrico',
      note: 'Un clip de silicona remodela el estómago sin cortar; reversible y puede permanecer colocado hasta 20 años.',
    },
    'gastric-band': { name: 'Banda gástrica', note: 'Sin precio predefinido: depende del tipo de banda y del cirujano; reversible y ajustable.' },
    'cat-eyes-fox-eyes': { name: 'Cat Eyes / Fox Eyes (quirúrgico)', note: ES_NOT_OFFERED },
    'lip-lifting': { name: 'Lifting de labios', note: ES_NOT_OFFERED },
  },
  Arabic: {
    'dimple-one': { name: 'عملية غمازة - جهة واحدة' },
    'dimple-two': { name: 'عملية غمازات - جهتان' },
    rhinoplasty: { name: 'تجميل الأنف' },
    septoplasty: { name: 'تصحيح الحاجز الأنفي' },
    'rhinoplasty-double-chin': { name: 'تجميل الأنف + شفط دهون الذقن المزدوجة' },
    'second-rhinoplasty': { name: 'إعادة تجميل الأنف' },
    'rhinoplasty-cartilage': { name: 'تجميل الأنف باستخدام الغضروف' },
    'laser-rhinoplasty': { name: 'تجميل الأنف بالليزر' },
    blepharoplasty: { name: 'تجميل الجفون (العلوي أو السفلي أو كلاهما)' },
    'face-neck-lift': {
      name: 'شد الوجه والرقبة',
      note: 'يجب أن يكون عمر المريض أكثر من 50 عامًا. يُجرى مع تجميل الجفون. لا يُجرى للرجال. السعر يشمل شد الوجه والرقبة؛ ويُحتسب تجميل الجفون وأي إضافات أخرى بشكل منفصل.',
    },
    'jaw-silicone': { name: 'غرسة سيليكون للفك' },
    'jaw-line': { name: 'تحديد خط الفك (غرسة سيليكون + 4 مل فيلر)' },
    otoplasty: { name: 'تجميل الأذن' },
    bichectomy: { name: 'إزالة دهون الخدين (البيشيكتومي)' },
    'eyebrow-lift': { name: 'رفع الحاجبين' },
    'breast-nipple': { name: 'تصحيح حلمة الثدي' },
    'breast-reduction': { name: 'تصغير الثدي' },
    'breast-lift': { name: 'شد الثدي بدون سيليكون' },
    'silimed-round': { name: 'تكبير الثدي - سيليكون دائري Silimed' },
    'silimed-lift-round': { name: 'سيليكون الثدي + شد - دائري Silimed' },
    'motiva-round': { name: 'تكبير الثدي - سيليكون دائري Motiva' },
    'motiva-teardrop': { name: 'تكبير الثدي - سيليكون بشكل قطرة Motiva' },
    'motiva-lift-round': { name: 'سيليكون الثدي + شد - دائري Motiva' },
    'motiva-lift-teardrop': { name: 'سيليكون الثدي + شد - بشكل قطرة Motiva' },
    'mentor-round': { name: 'تكبير الثدي - سيليكون دائري Mentor' },
    'mentor-teardrop': { name: 'تكبير الثدي - سيليكون بشكل قطرة Mentor' },
    'mentor-lift-round': { name: 'سيليكون الثدي + شد - دائري Mentor' },
    'mentor-lift-teardrop': { name: 'سيليكون الثدي + شد - بشكل قطرة Mentor' },
    'cereform-round': { name: 'تكبير الثدي - سيليكون دائري Cereform' },
    'cereform-teardrop': { name: 'تكبير الثدي - سيليكون بشكل قطرة Cereform' },
    'cereform-lift-round': { name: 'سيليكون الثدي + شد - دائري Cereform' },
    'cereform-lift-teardrop': { name: 'سيليكون الثدي + شد - بشكل قطرة Cereform' },
    'lifting-only': { name: 'شد فقط بدون شفط دهون', note: 'كل منطقة شد إضافية: 1,000 يورو إضافية.' },
    abdominoplasty: { name: 'شد البطن' },
    'arm-lifting': { name: 'شد الذراعين' },
    'thigh-lifting': { name: 'شد الفخذين' },
    'vaser-lipo-4d': { name: 'شفط الدهون بالفيزر 4D' },
    'bbl-fat-transfer': { name: 'BBL (رفع الأرداف البرازيلي بنقل الدهون)' },
    'varicose-veins': { name: 'دوالي الساقين (الكي داخل الوريد)' },
    'fat-injection-hands': { name: 'حقن الدهون في اليدين' },
    'umbilical-hernia': { name: 'فتق السرة', note: 'لا يوجد سعر منفصل - يُحتسب ضمن الإجراء المشترك.' },
    'j-plasma': {
      name: 'J-Plasma',
      note: 'يجب أن يُجرى مع شفط الدهون - راجع «شفط دهون 1-3 مناطق + J-Plasma 1-3 مناطق» لمعرفة سعر الجمع بينهما.',
    },
    'three-area-lipo': { name: 'شفط دهون 3 مناطق', note: AR_EXTRA_LIPO_LIFT },
    'three-area-lipo-bbl': { name: 'شفط دهون 3 مناطق + BBL', note: AR_EXTRA_LIPO_LIFT },
    'three-area-lipo-breast-bbl': { name: 'شفط دهون 3 مناطق + سيليكون الثدي مع شد أو بدونه + BBL' },
    'three-area-lipo-rhinoplasty': { name: 'شفط دهون 3 مناطق + تجميل الأنف' },
    'three-area-lipo-breast-rhinoplasty': { name: 'شفط دهون 3 مناطق + سيليكون الثدي مع شد أو بدونه + تجميل الأنف' },
    'three-area-lipo-motiva-round-no-lift': { name: 'شفط دهون 3 مناطق + سيليكون ثدي دائري Motiva (بدون شد)' },
    'three-area-lipo-motiva-round-lift': { name: 'شفط دهون 3 مناطق + سيليكون ثدي دائري Motiva (مع شد)' },
    'mommy-makeover': {
      name: 'Mommy Makeover (تجميل ما بعد الولادة)',
      note: 'إجراء مشترك (عادةً شد البطن + الثدي + شفط الدهون) - يحدد الجراح السعر النهائي حسب الجمع المختار.',
    },
    'six-pack': { name: 'عملية Six Pack (نحت عضلات البطن)' },
    gynecomastia: { name: 'علاج التثدي عند الرجال' },
    'lipo-jplasma': {
      name: 'شفط دهون 1-3 مناطق + J-Plasma 1-3 مناطق',
      note: 'يتطلب J-Plasma شفط الدهون. منطقة شفط دهون إضافية: 300 يورو إضافية؛ منطقة شفط دهون + J-Plasma إضافية: 400 يورو إضافية؛ BBL: 1,000 يورو إضافية.',
    },
    'butt-silicone-europe': { name: 'سيليكون الأرداف (Sebbin أو Polytech)' },
    'butt-silicone-american': { name: 'سيليكون الأرداف (Implantech معتمد من FDA)' },
    labiaplasty: { name: 'تجميل الشفرين' },
    vaginoplasty: { name: 'تجديد المهبل (تضييق المهبل)' },
    'hymen-repair': { name: 'ترميم غشاء البكارة' },
    'vaginoplasty-labiaplasty': { name: 'تجديد المهبل + تجميل الشفرين' },
    'vaginoplasty-labiaplasty-hymen': { name: 'تجديد المهبل + تجميل الشفرين + ترميم غشاء البكارة' },
    'penis-fat': { name: 'تكبير القضيب بالدهون' },
    'penis-lengthening': { name: 'إطالة القضيب' },
    'penis-combined': { name: 'إطالة القضيب + تكبيره بالدهون' },
    'gastric-botox': {
      name: 'بوتوكس المعدة',
      note: 'إجراء غير جراحي بالمنظار (15-20 دقيقة تحت التخدير). يستمر تقليل الشهية 4-6 أشهر، وهو ليس حلًا دائمًا. النطاق المعتاد: 1,350-2,700 يورو حسب الطبيب.',
    },
    'gastric-balloon': {
      name: 'بالون المعدة',
      note: 'بالون غير جراحي بالمنظار، يُزال بعد 6 أو 12 شهرًا. النطاق المعتاد: 1,300-4,000 يورو حسب نوع البالون والمدة.',
    },
    'elipse-balloon': {
      name: 'بالون Elipse',
      note: 'بالون على شكل كبسولة تُبلع، بدون منظار أو تخدير؛ يفرغ ويخرج طبيعيًا بعد نحو 4 أشهر. النطاق المعتاد: 3,000-3,500 يورو.',
    },
    'gastric-sleeve': {
      name: 'تكميم المعدة',
      note: 'بالمنظار، غير قابل للعكس. يشمل السعر فحوصات ما قبل العملية والجراحة والإقامة في المستشفى والمتابعة. يلزم تناول المكملات واتباع نظام غذائي مدى الحياة.',
    },
    'gastric-bypass': {
      name: 'تحويل مسار المعدة',
      note: 'بالمنظار، غير قابل للعكس. يشمل السعر الأدوية والمكملات. يلزم تناول مكملات الفيتامينات والمعادن مدى الحياة.',
    },
    'gastric-mini-bypass': {
      name: 'تحويل مسار المعدة المصغر',
      note: 'بالمنظار، غير قابل للعكس. يشمل السعر الأدوية والمكملات. تحويل أبسط وأقصر من التحويل الكامل.',
    },
    'gastric-bypass-sadis': {
      name: 'تحويل مسار المعدة SADI-S',
      note: 'تكميم المعدة + تحويل اثني عشري لفائفي بمفاغرة واحدة. يُعد غير قابل للعكس؛ يلزم تناول المكملات مدى الحياة.',
    },
    'gastric-plication': {
      name: 'طي المعدة',
      note: 'تُطوى المعدة وتُخاط دون إزالة أي نسيج؛ قابل للعكس. النطاق المعتاد: 3,000-5,000 يورو حسب الجراح.',
    },
    'bari-clip': {
      name: 'مشبك المعدة Bari-Clip',
      note: 'مشبك سيليكون يعيد تشكيل المعدة دون قطع؛ قابل للعكس ويمكن أن يبقى حتى 20 عامًا.',
    },
    'gastric-band': { name: 'ربط المعدة', note: 'لا يوجد سعر محدد مسبقًا - يعتمد على نوع الحزام والجراح؛ قابل للعكس والتعديل.' },
    'cat-eyes-fox-eyes': { name: 'Cat Eyes / Fox Eyes (جراحي)', note: AR_NOT_OFFERED },
    'lip-lifting': { name: 'شد الشفة', note: AR_NOT_OFFERED },
  },
};

const CATEGORIES: Record<ContentLanguage, Record<PlasticSurgeryItem['category'], string>> = {
  French: { Face: 'Visage', Breast: 'Poitrine', Body: 'Corps', Intimate: 'Intime', Men: 'Hommes', Packages: 'Forfaits', Bariatric: 'Bariatrique' },
  Italian: { Face: 'Viso', Breast: 'Seno', Body: 'Corpo', Intimate: 'Intimo', Men: 'Uomini', Packages: 'Pacchetti', Bariatric: 'Bariatrica' },
  Russian: { Face: 'Лицо', Breast: 'Грудь', Body: 'Тело', Intimate: 'Интимная зона', Men: 'Мужчины', Packages: 'Пакеты', Bariatric: 'Бариатрия' },
  Spanish: { Face: 'Rostro', Breast: 'Mamas', Body: 'Cuerpo', Intimate: 'Íntimo', Men: 'Hombres', Packages: 'Paquetes', Bariatric: 'Bariátrica' },
  Arabic: { Face: 'الوجه', Breast: 'الثدي', Body: 'الجسم', Intimate: 'المنطقة الحساسة', Men: 'الرجال', Packages: 'الباقات', Bariatric: 'جراحات السمنة' },
};

const NO_NEED: Record<ContentLanguage, string> = {
  French: 'Non nécessaire',
  Italian: 'Non necessario',
  Spanish: 'No es necesario',
  Russian: 'Не требуется',
  Arabic: 'غير مطلوب',
};

/** "7 nights - 8 days" / "1 night" / "1-2 nights" / "No need" in `language`; "—" stays as it is. */
function translateStay(value: string, language: ContentLanguage): string {
  if (value.trim().toLowerCase() === 'no need') return NO_NEED[language];
  return value.replace(/(\d+(?:-\d+)?)\s+(night|day)s?\b/gi, (_match, count: string, unit: string) =>
    formatStayCount(count, unit.toLowerCase() as StayUnit, language),
  );
}

export interface PlasticItemText {
  name: string;
  note?: string;
  category: string;
  stay: string;
  hospitalStay: string;
}

/** What the PDF prints for `item` in `language` — the English catalog text when not covered. */
export function translatePlasticItem(item: PlasticSurgeryItem, language: QuotationLanguage): PlasticItemText {
  if (!isContentLanguage(language)) {
    return { name: item.name, note: item.note, category: item.category, stay: item.stay, hospitalStay: item.hospitalStay };
  }
  const text = PLASTIC_ITEM_TEXT[language][item.id];
  return {
    name: text?.name ?? item.name,
    note: text?.note ?? item.note,
    category: CATEGORIES[language][item.category],
    stay: translateStay(item.stay, language),
    hospitalStay: translateStay(item.hospitalStay, language),
  };
}
