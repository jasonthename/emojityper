
const arrowKeys = ['Left', 'Right', 'Up', 'Down'];

/**
 * @param {!Event} ev
 * @return {?string} one of "Arrow{Left,Right,Up,Down}" if this is a keyboard event of that arrow
 */
export function arrowFromEvent(ev) {
  if (!ev.key) {
    return null;
  }
  if (ev.key.startsWith('Arrow')) {
    return ev.key;
  }
  if (arrowKeys.indexOf(ev.key) === -1) {
    return null;
  }
  return 'Arrow' + ev.key;
}

/**
 * @param {!Event} ev
 * @return {boolean} whether this is probably a keyboard/non-mouse click
 */
export function isKeyboardClick(ev) {
  return ev instanceof MouseEvent && ev.screenX === 0 && ev.detail === 0;
}