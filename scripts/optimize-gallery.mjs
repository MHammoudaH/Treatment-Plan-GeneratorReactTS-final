// One-shot: shrink the before-after photos under public/assets/gallery/ to a
// size that makes sense for a print PDF (they render at most ~150mm wide) and is
// safe to commit. Resizes in place, keeps the file format and name, and only
// writes back when the result is actually smaller.
//
//   npm run gallery:optimize      # after dropping in new photos
//   npm run gallery               # then re-index
//
// Originals stay in your Downloads folder / the source zips.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const GALLERY_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'gallery');
const MAX_EDGE = 1280;
const QUALITY = 76;
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return IMAGE_RE.test(entry.name) ? [full] : [];
  });
}

/** @param {import('sharp').Sharp} pipeline @param {string} ext */
function encode(pipeline, ext) {
  if (ext === '.png') return pipeline.png({ compressionLevel: 9, palette: true, quality: QUALITY });
  if (ext === '.webp') return pipeline.webp({ quality: QUALITY });
  return pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
}

const files = walk(GALLERY_DIR);
let before = 0;
let after = 0;
let rewritten = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const original = readFileSync(file);
  before += original.length;

  try {
    const optimized = await encode(
      sharp(original)
        .rotate() // bake in EXIF orientation before we strip metadata
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }),
      ext,
    ).toBuffer();

    if (optimized.length < original.length) {
      writeFileSync(file, optimized);
      after += optimized.length;
      rewritten += 1;
    } else {
      after += original.length;
    }
  } catch (error) {
    after += original.length;
    console.warn(`skip ${file}: ${error.message}`);
  }
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
console.log(`optimized ${rewritten}/${files.length} images: ${mb(before)} -> ${mb(after)}`);
