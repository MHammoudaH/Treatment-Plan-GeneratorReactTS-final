// Maps a plastic-surgery item to before-after photo folders for the Premium
// Proposal PDF gallery page. Photos live under public/assets/gallery/ and are
// indexed by scripts/build-gallery-manifest.mjs into plasticGalleryManifest.ts.
//
// "Auto-match to procedure category": a specific per-item mapping wins; anything
// not listed falls back to its category. Intimate/Men procedures with no photo
// set resolve to an empty list and the PDF prints a "gallery on request" note.

import { GALLERY_MANIFEST } from './plasticGalleryManifest';
import type { PlasticSurgeryItem } from './plasticSurgery';

/** How many photos to place on the gallery page (kept low — they print large). */
const GALLERY_LIMIT = 6;

/** Specific item id -> ordered gallery folder keys (see GALLERY_MANIFEST). */
const FOLDERS_BY_ITEM_ID: Record<string, string[]> = {
  // Face — nose (real Drive-import rhinoplasty set — 91 photos — leads the legacy set)
  rhinoplasty: ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY'],
  septoplasty: ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY'],
  'rhinoplasty-double-chin': ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY', 'aesthetic/double chin'],
  'second-rhinoplasty': ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY'],
  'rhinoplasty-cartilage': ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY'],
  'laser-rhinoplasty': ['aesthetic-drive-import/rhinoplasty', 'aesthetic/RHINOPLASTY'],
  // Face — eyes / brow / jaw / other
  blepharoplasty: ['aesthetic-drive-import/blepharoplasty', 'aesthetic/blepharoplasty', 'before-after/Eyes'],
  otoplasty: ['aesthetic-drive-import/otoplasty'],
  'jaw-silicone': ['aesthetic-drive-import/face-lift', 'aesthetic/nick lifting', 'before-after/Facelift', 'aesthetic/face lift'],
  'jaw-line': ['aesthetic-drive-import/face-lift', 'aesthetic/nick lifting', 'before-after/Facelift', 'aesthetic/face lift'],
  'dimple-one': ['aesthetic-drive-import/face-lift', 'aesthetic/face lift', 'before-after/Facelift'],
  'dimple-two': ['aesthetic-drive-import/face-lift', 'aesthetic/face lift', 'before-after/Facelift'],
  'face-neck-lift': ['aesthetic-drive-import/face-lift', 'aesthetic-drive-import/neck-lift', 'before-after/Facelift', 'aesthetic/face lift', 'aesthetic/nick lifting'],

  // Breast — augmentation
  'breast-nipple': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'breast-reduction': ['aesthetic-drive-import/breast-surgeries'],
  'silimed-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'motiva-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'motiva-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'mentor-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'mentor-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'cereform-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  'cereform-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/breast enlargment', 'before-after/breast'],
  // Breast — with lift
  'breast-lift': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'before-after/breast'],
  'silimed-lift-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'motiva-lift-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'motiva-lift-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'mentor-lift-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'mentor-lift-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'cereform-lift-round': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'cereform-lift-teardrop': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_', 'aesthetic/breast enlargment'],
  'lifting-only': ['aesthetic-drive-import/breast-surgeries', 'aesthetic/BREAST LIFTING_'],

  // Body — liposuction / contouring
  'three-area-lipo': ['aesthetic-drive-import/liposuction', 'aesthetic/lipo', 'before-after/liposuction and fat'],
  'six-pack': ['aesthetic-drive-import/six-pack-surgeries', 'aesthetic-drive-import/liposuction', 'aesthetic/lipo', 'before-after/liposuction and fat'],
  'lipo-jplasma': ['aesthetic-drive-import/j-plasma', 'aesthetic-drive-import/liposuction', 'aesthetic/lipo', 'before-after/liposuction and fat'],
  'j-plasma': ['aesthetic-drive-import/j-plasma'],
  'vaser-lipo-4d': ['aesthetic-drive-import/liposuction'],
  'abdominoplasty': ['aesthetic-drive-import/liposuction-abdominoplasty'],
  'arm-lifting': ['aesthetic-drive-import/arm-lift'],
  'thigh-lifting': ['aesthetic-drive-import/thigh-lift'],
  'bbl-fat-transfer': ['aesthetic-drive-import/bbl-brazilian-butt-lifting'],
  'fat-injection-hands': ['aesthetic-drive-import/hand-fat-injection'],
  // Body — buttock (silicone implants — distinct technique from the fat-transfer BBL set above)
  'butt-silicone-europe': ['aesthetic/BBL', 'before-after/liposuction and fat'],
  'butt-silicone-american': ['aesthetic/BBL', 'before-after/liposuction and fat'],

  // Men (real Drive-import gynecomastia set replaces the old generic-lipo fallback)
  gynecomastia: ['aesthetic-drive-import/gynocomestia'],

  // Packages
  'three-area-lipo-bbl': ['aesthetic-drive-import/liposuction', 'aesthetic/BBL', 'aesthetic/lipo'],
  'three-area-lipo-breast-bbl': ['aesthetic-drive-import/liposuction', 'aesthetic-drive-import/breast-surgeries', 'aesthetic/BBL', 'aesthetic/breast enlargment', 'aesthetic/lipo'],
  'three-area-lipo-rhinoplasty': ['aesthetic-drive-import/liposuction', 'aesthetic-drive-import/rhinoplasty', 'aesthetic/lipo', 'aesthetic/RHINOPLASTY'],
  'three-area-lipo-breast-rhinoplasty': ['aesthetic-drive-import/breast-surgeries', 'aesthetic-drive-import/rhinoplasty', 'aesthetic/breast enlargment', 'aesthetic/RHINOPLASTY', 'aesthetic/lipo'],
  'mommy-makeover': ['aesthetic-drive-import/mommy-makeover'],
};

/** Category fallback when an item id has no specific mapping. */
const FOLDERS_BY_CATEGORY: Record<PlasticSurgeryItem['category'], string[]> = {
  Face: ['before-after/Facelift', 'aesthetic/face lift', 'aesthetic/RHINOPLASTY'],
  Breast: ['aesthetic/breast enlargment', 'before-after/breast', 'aesthetic/BREAST LIFTING_'],
  Body: ['aesthetic/lipo', 'before-after/liposuction and fat', 'aesthetic/BBL'],
  Packages: ['aesthetic/lipo', 'aesthetic/BBL', 'aesthetic/RHINOPLASTY'],
  Men: ['aesthetic/lipo'],
  Intimate: [],
  // No before/after photo set for bariatric procedures — the PDF prints a
  // "gallery on request" note, same as Intimate.
  Bariatric: [],
};

const PREFERRED_EXT = /\.(jpe?g|webp)$/i;

/** Round-robin across the mapped folders so a package shows a mix, not six noses. */
function interleave(lists: string[][], limit: number): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < limit; i += 1) {
    let advanced = false;
    for (const list of lists) {
      if (i < list.length) {
        out.push(list[i]);
        advanced = true;
        if (out.length >= limit) break;
      }
    }
    if (!advanced) break;
  }
  return out;
}

/**
 * Before-after photo URLs for `item`'s Premium Proposal gallery page, capped at
 * GALLERY_LIMIT. Prefers .jpg/.webp shots; only uses .png exports if a folder has
 * nothing else. Returns [] for procedures with no photo set (Intimate, most Men).
 */
export function galleryForItem(item: PlasticSurgeryItem): string[] {
  const folderKeys = FOLDERS_BY_ITEM_ID[item.id] ?? FOLDERS_BY_CATEGORY[item.category] ?? [];

  const lists = folderKeys
    .map((key) => {
      const all = GALLERY_MANIFEST[key] ?? [];
      const preferred = all.filter((url) => PREFERRED_EXT.test(url));
      return preferred.length ? preferred : all;
    })
    .filter((list) => list.length > 0);

  // The "aesthetic/*" and "before-after/*" sets overlap by filename — dedupe so a
  // procedure never shows the same shot twice.
  const seen = new Set<string>();
  return interleave(lists, GALLERY_LIMIT * 2)
    .filter((url) => {
      const name = decodeURIComponent(url.split('/').pop() ?? url);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .slice(0, GALLERY_LIMIT);
}
