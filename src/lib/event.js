
const arrowKeys = ['Left', 'Right', 'Up', 'Down'];

/**
 * @param {!Event} event
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
