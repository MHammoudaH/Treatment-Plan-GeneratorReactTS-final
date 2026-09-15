import { describe, expect, it } from 'vitest';
import { PLASTIC_SURGERIES, recommendedNights } from './plasticSurgery';

describe('PLASTIC_SURGERIES catalog', () => {
  it('has no duplicate ids', () => {
    const ids = PLASTIC_SURGERIES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Mommy Makeover exists with no predefined price (coordinator sets it)', () => {
    const item = PLASTIC_SURGERIES.find((i) => i.id === 'mommy-makeover');
    expect(item).toBeDefined();
    expect(item?.priceEur).toBeNull();
    expect(item?.category).toBe('Packages');
  });

  it('every procedure named in the official catalog brief is present', () => {
    const expectedIds = [
      // Bariatric
      'gastric-botox', 'gastric-balloon', 'elipse-balloon', 'gastric-sleeve', 'gastric-plication',
      'gastric-bypass', 'gastric-mini-bypass', 'gastric-bypass-sadis', 'bari-clip', 'gastric-band',
      // Plastic/Aesthetic base
      'vaser-lipo-4d', 'bbl-fat-transfer', 'abdominoplasty', 'arm-lifting', 'thigh-lifting',
      'breast-reduction', 'breast-lift', 'gynecomastia', 'face-neck-lift', 'blepharoplasty',
      'rhinoplasty', 'septoplasty', 'otoplasty', 'mommy-makeover', 'bichectomy', 'six-pack',
      'j-plasma', 'labiaplasty', 'vaginoplasty', 'rhinoplasty-cartilage', 'varicose-veins',
      'penis-fat', 'penis-lengthening', 'penis-combined', 'fat-injection-hands', 'eyebrow-lift',
      'umbilical-hernia', 'hymen-repair', 'jaw-silicone', 'jaw-line',
      'butt-silicone-europe', 'butt-silicone-american',
      // Priced variants / combinations
      'dimple-one', 'dimple-two', 'rhinoplasty-double-chin', 'second-rhinoplasty', 'laser-rhinoplasty',
      'breast-nipple', 'silimed-round', 'silimed-lift-round', 'motiva-round', 'motiva-teardrop',
      'motiva-lift-round', 'motiva-lift-teardrop', 'mentor-round', 'mentor-teardrop',
      'mentor-lift-round', 'mentor-lift-teardrop', 'cereform-round', 'cereform-teardrop',
      'cereform-lift-round', 'cereform-lift-teardrop', 'lifting-only', 'three-area-lipo',
      'three-area-lipo-bbl', 'lipo-jplasma', 'three-area-lipo-motiva-round-no-lift',
      'three-area-lipo-motiva-round-lift', 'three-area-lipo-breast-bbl', 'three-area-lipo-rhinoplasty',
      'three-area-lipo-breast-rhinoplasty', 'vaginoplasty-labiaplasty', 'vaginoplasty-labiaplasty-hymen',
      // Not performed
      'cat-eyes-fox-eyes', 'lip-lifting',
    ];
    const ids = new Set(PLASTIC_SURGERIES.map((i) => i.id));
    for (const id of expectedIds) {
      expect(ids.has(id), `missing catalog id: ${id}`).toBe(true);
    }
  });

  it('unpriced procedures never carry an invented €0/placeholder price', () => {
    const unpriced = PLASTIC_SURGERIES.filter((i) => i.priceEur === null);
    expect(unpriced.length).toBeGreaterThan(0);
    for (const item of unpriced) {
      expect(item.priceEur, item.id).toBeNull();
    }
  });

  it('Cat Eyes/Fox Eyes and Lip Lifting are flagged unavailable — never selectable', () => {
    for (const id of ['cat-eyes-fox-eyes', 'lip-lifting']) {
      const item = PLASTIC_SURGERIES.find((i) => i.id === id);
      expect(item?.available, id).toBe(false);
    }
  });

  it('every other procedure defaults to available (available !== false)', () => {
    const stillAvailable = PLASTIC_SURGERIES.filter((i) => i.id !== 'cat-eyes-fox-eyes' && i.id !== 'lip-lifting');
    for (const item of stillAvailable) {
      expect(item.available, item.id).not.toBe(false);
    }
  });

  it('the two new priced 3-Areas-Lipo + Motiva Circular combinations have the correct prices', () => {
    expect(PLASTIC_SURGERIES.find((i) => i.id === 'three-area-lipo-motiva-round-no-lift')?.priceEur).toBe(4700);
    expect(PLASTIC_SURGERIES.find((i) => i.id === 'three-area-lipo-motiva-round-lift')?.priceEur).toBe(5200);
  });

  it('recommendedNights never throws on an unpriced item with a "—" stay placeholder', () => {
    const item = PLASTIC_SURGERIES.find((i) => i.id === 'arm-lifting')!;
    expect(recommendedNights(item)).toBe(0);
  });
});
