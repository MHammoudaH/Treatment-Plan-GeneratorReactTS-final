/**
 * FDI tooth notation helpers, shared by the implant-map picker, the 3D scene and the
 * "suggest from diagnosis" auto-layout.
 *
 * FDI (ISO 3950) numbers each permanent tooth `<quadrant><position>`:
 *   quadrant 1 = upper right, 2 = upper left, 3 = lower left, 4 = lower right
 *   position  1 = central incisor … 8 = third molar
 */

/**
 * What a tooth position represents in the coordinator's treatment plan. A position with no
 * mark at all (absent from the plan record) is a natural, untreated tooth.
 *
 *   'crown'          — a crown restoration on the patient's own (natural) tooth.
 *   'implant'        — an implant fixture placed, not yet carrying its own crown mark.
 *   'implant-crown'  — an implant-supported crown: the combination of the two concepts.
 *   'bridge'         — part of a bridge/pontic restoration.
 *   'missing'        — the tooth position is absent (extracted/congenitally missing), with
 *                       no restoration planned there.
 *
 * A treatment plan with several adjacent `'implant-crown'` positions represents multiple
 * implants supporting a larger prosthetic restoration — that composition needs no extra mark
 * of its own; each position is still individually correct (its own fixture + abutment + crown).
 *
 * This is a VISUALIZATION of the coordinator's entered quantities, not a clinical
 * determination of exact tooth positions — see `suggestPlan`.
 */
export type ToothMark = 'implant' | 'crown' | 'implant-crown' | 'bridge' | 'missing';

/** Upper arch, patient's right → left, as shown on a standard chart. */
export const UPPER_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
/** Lower arch, patient's right → left. */
export const LOWER_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_FDI = [...UPPER_FDI, ...LOWER_FDI];

const TYPE_BY_POSITION: Record<number, string> = {
  1: 'Central incisor',
  2: 'Lateral incisor',
  3: 'Canine',
  4: 'First premolar',
  5: 'Second premolar',
  6: 'First molar',
  7: 'Second molar',
  8: 'Third molar',
};

export function toothArch(fdi: number): 'upper' | 'lower' {
  const quadrant = Math.floor(fdi / 10);
  return quadrant === 1 || quadrant === 2 ? 'upper' : 'lower';
}

export function toothName(fdi: number): string {
  return TYPE_BY_POSITION[fdi % 10] ?? `Tooth ${fdi}`;
}

/** 0..15 left-to-right index within the tooth's own arch. */
export function toothColumn(fdi: number): number {
  return (toothArch(fdi) === 'upper' ? UPPER_FDI : LOWER_FDI).indexOf(fdi);
}

/** Whether `mark` involves a fixture placed in bone (an implant, with or without its crown). */
export function markHasImplant(mark: ToothMark | undefined): boolean {
  return mark === 'implant' || mark === 'implant-crown';
}

/** Whether `mark` involves a crown-level restoration (natural-tooth crown, implant-supported
 *  crown, or a bridge unit). */
export function markHasCrown(mark: ToothMark | undefined): boolean {
  return mark === 'crown' || mark === 'implant-crown';
}

export function countMarks(plan: Record<number, ToothMark>): { implants: number; crowns: number; bridges: number; missing: number } {
  let implants = 0;
  let crowns = 0;
  let bridges = 0;
  let missing = 0;
  for (const mark of Object.values(plan)) {
    if (markHasImplant(mark)) implants++;
    if (markHasCrown(mark)) crowns++;
    if (mark === 'bridge') bridges++;
    if (mark === 'missing') missing++;
  }
  return { implants, crowns, bridges, missing };
}

/** none → implant → crown → implant-supported crown → bridge → missing → none. Lets the
 *  coordinator manually represent every state the 3D view can distinguish by clicking a tooth. */
export function cycleMark(current: ToothMark | undefined): ToothMark | null {
  if (current === undefined) return 'implant';
  if (current === 'implant') return 'crown';
  if (current === 'crown') return 'implant-crown';
  if (current === 'implant-crown') return 'bridge';
  if (current === 'bridge') return 'missing';
  return null;
}

export const MARK_COLORS = {
  implant: '#2f6bff',
  crown: '#e8a13a',
  implantCrown: '#7c4dff',
  bridge: '#2bb7a0',
  missing: '#9aa3b0',
  tooth: '#f1ece1',
  gum: '#d98a95',
  bone: '#e7ddc9',
  metal: '#c9cdd3',
} as const;

/** Priority order for auto-placing implants across an arch (canines & centrals first, then
 *  spreading back toward the molars — a stylised full-arch layout). */
const IMPLANT_PRIORITY_UPPER = [13, 23, 11, 21, 16, 26, 14, 24, 17, 27, 12, 22, 15, 25, 18, 28];
const IMPLANT_PRIORITY_LOWER = [43, 33, 41, 31, 46, 36, 44, 34, 47, 37, 42, 32, 45, 35, 48, 38];
/** Anterior-first fill order for auto-placing crowns and bridge positions. Covers all 32
 *  positions (the molars 7/8 last) so a quantity up to a full mouth can always be placed —
 *  a shorter list would silently cap the visualization below the entered quantity. */
const CROWN_PRIORITY = [
  11, 21, 12, 22, 13, 23, 14, 24, 15, 25, 16, 26, 31, 41, 32, 42, 33, 43, 34, 44, 35, 45, 36, 46,
  17, 27, 37, 47, 18, 28, 38, 48,
];

/**
 * Builds a starting tooth plan from parsed diagnosis / entered quantities — implants at
 * typical full-arch positions, crowns on the remaining anterior teeth, bridge units on
 * whatever is left. The coordinator then adjusts exact teeth by clicking the chart.
 *
 * This is deterministic VISUALIZATION only:
 *  - it never shows more restored (crowned) positions than `crowns`;
 *  - it never assumes every crown needs an implant, or every implant gets its own separate
 *    crown position — when a crown position coincides with an implant position it becomes a
 *    single `'implant-crown'` mark instead of two;
 *  - `bridges` is an explicit, independent quantity — never derived from implants or crowns.
 */
export function suggestPlan(input: {
  upperImplants?: number;
  lowerImplants?: number;
  crowns?: number;
  bridges?: number;
}): Record<number, ToothMark> {
  const plan: Record<number, ToothMark> = {};

  for (const fdi of IMPLANT_PRIORITY_UPPER.slice(0, Math.max(0, input.upperImplants ?? 0))) plan[fdi] = 'implant';
  for (const fdi of IMPLANT_PRIORITY_LOWER.slice(0, Math.max(0, input.lowerImplants ?? 0))) plan[fdi] = 'implant';

  // Crowns: a position that already holds a bare implant is upgraded to an
  // implant-supported crown (consuming one implant + one crown together, matching the
  // real relationship) instead of being skipped or double-counted. Positions with no
  // implant get a plain natural-tooth crown. Any implants left over stay bare (not yet
  // restored) when `crowns` is smaller than the implant count.
  let remainingCrowns = Math.max(0, input.crowns ?? 0);
  for (const fdi of CROWN_PRIORITY) {
    if (remainingCrowns <= 0) break;
    if (plan[fdi] === 'implant') {
      plan[fdi] = 'implant-crown';
      remainingCrowns--;
      continue;
    }
    if (plan[fdi]) continue; // already marked (implant / implant-crown)
    plan[fdi] = 'crown';
    remainingCrowns--;
  }

  // Bridge positions: an independent quantity, never inferred from implants/crowns. Fills
  // whatever free positions remain, anterior-first — visualization only.
  let remainingBridges = Math.max(0, input.bridges ?? 0);
  for (const fdi of CROWN_PRIORITY) {
    if (remainingBridges <= 0) break;
    if (plan[fdi]) continue;
    plan[fdi] = 'bridge';
    remainingBridges--;
  }

  return plan;
}
