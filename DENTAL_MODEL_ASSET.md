# Dental arch 3D asset — what's needed and where it goes

The implant-map 3D viewer currently renders a **procedural** dental arch (built entirely from
Three.js primitives in `src/lib/dental/implantScene.ts`). Repeated procedural passes have not
reached a professional/semi-realistic visual bar, and further tweaking that same approach
(colors, lighting, camera, bevels, more primitives) was explicitly ruled out as the fix.

The renderer architecture is now GLB/GLTF-ready (see "What was built" below) and will
**automatically** switch to a real 3D asset the moment one is placed at the path below — no
further code changes needed. Until then, the app keeps using the existing procedural renderer
as a safety-net fallback, so nothing regresses.

## What to provide

A single **glTF binary (`.glb`)** file containing a semi-realistic human dental arch: upper and
lower rows of 16 teeth each (32 total), gingiva, and (ideally) implant fixture/abutment
geometry for at least one tooth position so the implant states have real parts to show.

Source options: a licensed dental/medical 3D asset store (Sketchfab, TurboSquid, CGTrader —
filter for "commercial use" + "glTF/GLB" export), a freelance 3D artist brief, or an in-house
Blender model exported to glTF. Whichever source, it must follow the contract below or the app
won't be able to identify individual teeth or apply treatment states to them.

### 1. File location

```
public/assets/dental/dental-arch.glb
```

This path is not hardcoded in multiple places — it's the one constant in
`src/lib/dental/gltf/DentalModelConfig.ts` (`DENTAL_MODEL_URL`). Change the file location and
that constant together if you need a different path.

### 2. Tooth identification (required)

Every one of the 32 teeth must be identifiable by its **FDI number** (11–18, 21–28, 31–38,
41–48) — the same numbering the rest of the app already uses (`src/lib/dental/teeth.ts`).
Two ways to encode it, either is enough (the loader checks both, in this order):

- **Preferred:** a custom property on the tooth's root node named `toothNumber` with an integer
  value (11, 12, … 48) — in Blender this is an Object Custom Property; glTF exporters put it
  under that node's `extras`, and the loader reads it as `object3D.userData.toothNumber`. This
  is the most robust option since it survives the node being renamed.
- **Fallback:** name the tooth's root node `tooth_11`, `tooth_12`, … `tooth_48` (or `FDI_11`
  etc.) — the loader parses this pattern if no custom property is present.

Each tooth's root node should be a **separate object/group** — not merged into one mesh — so it
can be shown/hidden/tinted independently.

### 3. Per-tooth structure (optional, for full treatment-state fidelity)

For full-fidelity treatment-state visuals (an implant fixture that's genuinely a different
mesh from the crown, a root that disappears when an implant replaces it, etc.), each tooth's
root node may contain named child nodes:

| Child name          | Shown when…                                            |
|----------------------|---------------------------------------------------------|
| `crown`              | the tooth has a crown, is a natural tooth, or a bridge unit |
| `root`               | the tooth is natural/crowned and has no implant           |
| `implant_fixture`     | the position has an implant (bare or crowned)              |
| `implant_abutment`    | same as above                                              |

If a tooth has none of these (just one unified mesh), the app falls back to a restrained
material-color tint per state instead — still usable, just less structurally accurate. See
`src/lib/dental/gltf/TreatmentVisualization.ts` for the exact logic either way.

### 4. Orientation, units, scale

- Y-up (glTF's standard), teeth roughly centered on the world origin, upper arch above the
  lower arch with a natural bite gap between them.
- Any consistent real-world scale is fine — the camera (`src/lib/dental/gltf/DentalMapCamera.ts`)
  fits itself to the model's actual bounding box, it does not assume a specific size.

### 5. Compression / size

- Keep it reasonably small for a web app (a fully-textured arch should comfortably fit under a
  few MB; a simpler untextured/vertex-colored version can be far smaller).
- Draco mesh compression is supported (`DRACOLoader` is already wired in
  `DentalModelLoader.ts`) — if the GLB uses it, also add the Draco decoder files
  (`draco_decoder.js`, `draco_decoder.wasm`, or the JS-only variant) under `public/draco/`
  (`DENTAL_MODEL_DRACO_DECODER_PATH`). Not needed for an uncompressed GLB.

## What was built (ready and waiting for the asset)

All new, under `src/lib/dental/gltf/` + `src/components/DentalMap3D.tsx`:

- **`DentalModelConfig.ts`** — the configurable asset path/decoder path.
- **`DentalModelLoader.ts`** — the single GLTFLoader/DRACOLoader entry point; rejects (does not
  fabricate a substitute) when the asset is missing or fails to parse.
- **`ToothInteraction.ts`** — `resolveToothNumber` (raycast hit → FDI, for click handling) and
  `indexToothNodes` (whole-model FDI → node map, built once per load) — the reliable ID mapping
  this task required, no screen-coordinate guessing.
- **`TreatmentVisualization.ts`** — applies the treatment plan (the app's existing source of
  truth, untouched) onto the loaded model: full sub-part toggling or a minimal-compliance tint,
  as above. Contains no clinical or pricing logic — purely visualization.
- **`DentalMapCamera.ts`** — `fitCameraToObject`: frames the model's actual bounding box from a
  fixed three-quarter angle. Used identically by the live viewer and the snapshot below, so
  they can never drift out of sync, and framing is correct regardless of the asset's scale.
- **`DentalMapSnapshot.ts`** — the GLB-based counterpart to the existing
  `implantMapSnapshot.ts`, for the Premium Proposal PDF. Same deterministic presentation-camera
  contract, off-screen render, PNG data URL.
- **`src/components/DentalMap3D.tsx`** — the React component: loads the configured asset,
  wires clicks through `resolveToothNumber` to the exact same `CYCLE_TOOTH` dispatch the 2D
  chart already uses, applies `TreatmentVisualization` reactively on plan changes. Falls back
  to the existing `ImplantMap3D` (procedural, unchanged) when no asset is present.
- Wired in: `StepImplantMap.tsx` (live view) and `Step4Confirm.tsx` (PDF snapshot, with the
  same procedural fallback).

Nothing about the treatment-plan state model, pricing engine, quotation logic, PDF layout, or
the "Suggest from diagnosis" flow was touched — this is a visualization-layer addition only.
