// Picture helpers for the Plastic Surgery module UI (not the PDF).
//
// Every procedure gets a representative image for its catalogue card and, when a
// real before/after set exists, a short strip of thumbnails for the selection
// showcase. Real sets come from GALLERY_MANIFEST via galleryForItem(); procedures
// with no set of their own (Bariatric, Intimate, penis procedures) fall back to a
// neutral clinic image so no card is ever blank and nothing misleading is shown.

import { GALLERY_MANIFEST } from './plasticGalleryManifest';
import { galleryForItem } from './plasticGallery';
import type { PlasticSurgeryItem } from './plasticSurgery';

const PREFERRED = /\.(jpe?g|webp)$/i;

/** Neutral, on-brand image used wherever a real before/after set is unavailable. */
export const CLINIC_IMAGE = '/assets/clinic/clinic%20waiting.png';

/** Fallback image pools keyed by category, for procedures with no own gallery. */
const CATEGORY_FALLBACK: Record<PlasticSurgeryItem['category'], string[]> = {
  Face: GALLERY_MANIFEST['aesthetic/face lift'] ?? [CLINIC_IMAGE],
  Breast: GALLERY_MANIFEST['aesthetic/breast enlargment'] ?? [CLINIC_IMAGE],
  Body: GALLERY_MANIFEST['aesthetic/lipo'] ?? [CLINIC_IMAGE],
  Packages: GALLERY_MANIFEST['aesthetic/lipo'] ?? [CLINIC_IMAGE],
  Men: [CLINIC_IMAGE],
  Intimate: [CLINIC_IMAGE],
  Bariatric: [CLINIC_IMAGE],
};

function preferredFirst(list: string[]): string[] {
  const jpg = list.filter((u) => PREFERRED.test(u));
  return jpg.length ? jpg : list;
}

/** One representative image for a procedure card / selection hero. */
export function heroImageForItem(item: PlasticSurgeryItem): string {
  const own = galleryForItem(item);
  if (own.length) return own[0];
  const fallback = preferredFirst(CATEGORY_FALLBACK[item.category] ?? [CLINIC_IMAGE]);
  return fallback[0] ?? CLINIC_IMAGE;
}

/**
 * Up to `n` before/after thumbnails for the selection showcase strip. Returns []
 * when the procedure has no real before/after set (so the strip is hidden rather
 * than filled with a repeated stock image).
 */
export function stripForItem(item: PlasticSurgeryItem, n = 5): string[] {
  return galleryForItem(item).slice(0, n);
}
