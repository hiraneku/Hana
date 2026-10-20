/**
 * The look-sensitivity setting.
 *
 * "Terlalu licin" is a personal complaint, so the slider has to exist — and
 * it has to be reachable while you are playing, not buried in the menu. Any
 * number of `<input data-sens>` sliders (menu, HUD) can be on screen at once;
 * this keeps them, the saved value and the game in sync.
 */

export const SENS_MIN = 0.3;
export const SENS_MAX = 2.5;
export const SENS_DEFAULT = 1;

const KEY = 'hana:sens';
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function stored() {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (Number.isFinite(v) && v > 0) return clamp(v, SENS_MIN, SENS_MAX);
  } catch {
    /* private mode, or storage blocked: fall back to the default */
  }
  return SENS_DEFAULT;
}

/**
 * Wire every sensitivity slider on the page to one shared value.
 *
 * @param {(value: number) => void} apply called once now and on every change
 * @returns {(value: number) => void} setter, for tests
 */
export function bindSensitivity(apply) {
  const sliders = Array.from(document.querySelectorAll('[data-sens]'));
  const labels = Array.from(document.querySelectorAll('[data-sens-val]'));
  if (!sliders.length) return () => {};

  let value = stored();

  const paint = () => {
    const text = value.toFixed(2).replace(/0$/, '');
    for (const s of sliders) s.value = String(value);
    for (const l of labels) l.textContent = text;
  };

  const set = (v) => {
    value = clamp(Number(v) || SENS_DEFAULT, SENS_MIN, SENS_MAX);
    apply(value);
    paint();
  };

  for (const s of sliders) {
    s.addEventListener('input', () => {
      set(s.value);
      try {
        localStorage.setItem(KEY, String(value));
      } catch {
        /* not being able to remember is not worth breaking the game for */
      }
    });
  }

  set(value);
  return set;
}
