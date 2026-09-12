import { describe, expect, it } from 'vitest';
import { translateOrigin, withOrigin } from './originLabels';

describe('translateOrigin', () => {
  it('translates a known origin per language', () => {
    expect(translateOrigin('Swiss', 'English')).toBe('Switzerland');
    expect(translateOrigin('Swiss', 'French')).toBe('Suisse');
    expect(translateOrigin('Swiss', 'Russian')).toBe('Швейцария');
    expect(translateOrigin('Swiss', 'Spanish')).toBe('Suiza');
    expect(translateOrigin('Swiss', 'Arabic')).toBe('سويسرا');
  });

  it('every catalog origin value translates in every supported language', () => {
    const origins = ['German', 'American', 'Swiss', 'Korean', 'Turkish'] as const;
    const languages = ['English', 'Russian', 'French', 'Spanish', 'Arabic'] as const;
    for (const origin of origins) {
      for (const language of languages) {
        expect(translateOrigin(origin, language)).toBeTruthy();
      }
    }
  });

  it('"Other", null, undefined and an unrecognised value all return null', () => {
    expect(translateOrigin('Other', 'English')).toBeNull();
    expect(translateOrigin(null, 'English')).toBeNull();
    expect(translateOrigin(undefined, 'English')).toBeNull();
    expect(translateOrigin('Atlantis', 'English')).toBeNull();
  });
});

describe('withOrigin', () => {
  it('appends the translated origin in parentheses', () => {
    expect(withOrigin('Straumann', 'Swiss', 'English')).toBe('Straumann (Switzerland)');
    expect(withOrigin('Straumann', 'Swiss', 'French')).toBe('Straumann (Suisse)');
  });

  it('returns the name unchanged when origin is missing, "Other", or unrecognised', () => {
    expect(withOrigin('Straumann', null, 'English')).toBe('Straumann');
    expect(withOrigin('Straumann', 'Other', 'English')).toBe('Straumann');
    expect(withOrigin('Straumann', 'Atlantis', 'English')).toBe('Straumann');
  });

  it('returns an empty string when there is no name at all, never "(Origin)" alone', () => {
    expect(withOrigin(null, 'Swiss', 'English')).toBe('');
    expect(withOrigin('', 'Swiss', 'English')).toBe('');
  });
});
