/**
 * Millimetres to inches, for the Part G.10 unit toggle.
 *
 * The catalogues are metric and that is what this site publishes. An inch view
 * exists because a buyer in Ohio reads travels in inches, not because the
 * catalogue states them — so the conversion is **presentation, never data**:
 *
 *  * only a value that is unambiguously millimetres is converted. A figure with
 *    any other unit, or with prose attached, is left exactly as printed;
 *  * the metric figure is what is stored, indexed and sent to sales. Switching
 *    the toggle changes nothing but what is on screen;
 *  * the panel says the inch figures are converted, so nobody quotes one back to
 *    KAO MING as though the catalogue printed it.
 *
 * `25.4` is exact by definition, so the conversion adds no error of its own —
 * only the rounding, which is why small figures keep more decimals than large
 * ones rather than everything being flattened to one.
 */

export type Unit = 'mm' | 'in';

const MM_PER_INCH = 25.4;

/** A number, or several separated by x, followed by `mm` and nothing else. */
const MM_PATTERN = /^([±]?)\s*([\d.,]+(?:\s*[x×]\s*[\d.,]+)*)\s*mm$/i;

function inchesOf(millimetres: number): string {
  const inches = millimetres / MM_PER_INCH;
  // Keep the resolution the metric figure had: 0.005 mm is a tolerance and
  // becomes 0.0002 in, while 3,000 mm is a travel and becomes 118.1 in.
  const decimals = Math.abs(inches) < 0.01 ? 5 : Math.abs(inches) < 1 ? 4 : 1;
  return Number(inches.toFixed(decimals)).toLocaleString('en-US', {
    maximumFractionDigits: decimals,
  });
}

/**
 * Returns the value in inches, or `null` when it is not a plain millimetre
 * figure — in which case the caller must print the original untouched.
 */
export function millimetresToInches(value: string): string | null {
  const match = MM_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, sign, figures] = match;
  const parts = figures.split(/\s*[x×]\s*/);
  const converted: string[] = [];

  for (const part of parts) {
    const millimetres = Number(part.replace(/,/g, ''));
    if (!Number.isFinite(millimetres)) return null;
    converted.push(inchesOf(millimetres));
  }

  return `${sign}${converted.join(' × ')} in`;
}

/** Applies the current unit to a transcribed value. `mm` is always identity. */
export function inUnit(value: string, unit: Unit): string {
  if (unit === 'mm') return value;
  return millimetresToInches(value) ?? value;
}

/** True when anything in the set can actually be converted — the toggle is
 *  hidden otherwise rather than offered and then doing nothing. */
export function hasConvertibleValues(values: string[]): boolean {
  return values.some((value) => millimetresToInches(value) !== null);
}
