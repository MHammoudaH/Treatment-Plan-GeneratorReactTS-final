/**
 * Configuration for the GLB/GLTF-backed dental arch model. See `DENTAL_MODEL_ASSET.md` at the
 * repo root for the full asset specification (naming convention, required/optional parts,
 * orientation, sizing, where to place the file).
 *
 * There is no asset in the project yet — every module in `src/lib/dental/gltf/` is the
 * *architecture* that will use one the moment it's placed at `DENTAL_MODEL_URL`. Nothing here
 * fabricates a substitute model from primitives.
 */

/** Where the app looks for the dental arch asset — anything under `public/` is served at its
 *  path relative to the site root, so a file at `public/assets/dental/dental-arch.glb` is
 *  fetched from exactly this URL. Change this (and the file location) together if needed. */
export const DENTAL_MODEL_URL = '/assets/dental/dental-arch.glb';

/** Only consulted if the GLB itself uses the `KHR_draco_mesh_compression` extension — decoder
 *  files (`draco_decoder.js` / `.wasm`) must be present at this path under `public/` for that
 *  case. Harmless (never fetched) for an uncompressed GLB. */
export const DENTAL_MODEL_DRACO_DECODER_PATH = '/draco/';
