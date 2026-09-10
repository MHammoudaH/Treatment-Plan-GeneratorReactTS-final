import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
  /** Value reported to the parent while the field is blank. Defaults to 0. */
  emptyValue?: number;
};

/**
 * Controlled number input that can actually be cleared while typing.
 *
 * The naive pattern `value={n} onChange={e => set(Number(e.target.value) || 0)}`
 * makes a field that shows `0` impossible to empty: deleting the last digit gives
 * `""`, which coerces right back to `0`, so the caret snaps to a `0` you can't
 * delete. Here we keep the raw string while the field is being edited (so it can
 * sit empty, or hold a partial value like "1." or "-"), and only hand a finite
 * number back to the parent. On blur we drop the draft so the display re-syncs to
 * the canonical numeric value.
 */
export function NumberField({ value, onChange, emptyValue = 0, onBlur, ...rest }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      {...rest}
      type="number"
      inputMode={rest.step != null && String(rest.step).includes('.') ? 'decimal' : 'numeric'}
      value={draft ?? (Number.isFinite(value) ? String(value) : '')}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') {
          onChange(emptyValue);
          return;
        }
        const next = Number(raw);
        if (Number.isFinite(next)) onChange(next);
      }}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
