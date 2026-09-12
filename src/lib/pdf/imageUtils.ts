/**
 * Client-side image resizing for uploaded patient photos (see `QuotationPdfData.patientPhotos`).
 * Photos are never uploaded to a server — they're read, downscaled, and re-encoded entirely in
 * the browser, then carried as `data:` URLs the same way the 3D implant-map snapshot already
 * is. Downscaling matters here specifically because a phone photo can be several MB; without
 * it, a handful of uploads would bloat both the wizard's in-memory state and the generated
 * PDF far more than the resolution actually printed on an A4 page needs.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Reads `file`, downscales it (longest side capped at `MAX_DIMENSION`, aspect preserved) and
 *  re-encodes as a JPEG data URL. Non-image files reject. */
export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`Not an image file: ${file.name}`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Resizes every image in `files` (via `resizeImageFile`), skipping any that fail (e.g. a
 *  non-image file accidentally selected) rather than rejecting the whole batch. */
export async function resizeImageFiles(files: FileList | File[]): Promise<string[]> {
  const results = await Promise.allSettled(Array.from(files).map(resizeImageFile));
  return results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map((r) => r.value);
}
