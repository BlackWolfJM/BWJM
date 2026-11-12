/**
 * Native range values are multiples of step from min, not multiples of step
 * from zero. Use the precision of *both* numbers when displaying them.
 */
function decimalPlaces(value: number): number {
  const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
  const fractional = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, fractional - Number(exponent));
}

export function sliderDecimalPlaces(min: number, step: number): number {
  // toFixed accepts up to 100 places; this also supports scientific steps
  // such as 1e-7 and bases such as 5e-4.
  return Math.min(100, Math.max(decimalPlaces(min), decimalPlaces(step)));
}

export function formatSliderValue(value: number, min: number, step: number): string {
  if (!Number.isFinite(value)) return String(value);
  const formatted = value.toFixed(sliderDecimalPlaces(min, step));
  return /^-0(?:\.0+)?$/.test(formatted) ? formatted.slice(1) : formatted;
}

/**
 * Advance one legal step relative to min and wrap at the end. Rounding the
 * resulting decimal avoids accumulating IEEE-754 residues over many frames.
 * After assigning it, callers must read input.valueAsNumber: the native
 * range is the authority for the effective value sent to MathMDCore.
 */
export function nextSliderValue(current: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(current)) return min;
  const nextIndex = Math.round((current - min) / step) + 1;
  const next = Number((min + nextIndex * step).toFixed(sliderDecimalPlaces(min, step)));
  return next <= max ? next : min;
}
