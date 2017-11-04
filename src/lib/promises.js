
/**
 * Returns a Promise that resolves on `requestIdleCallback`.
 *
 * @return {!Promise<!IdleDeadline>}
 */
export function idle() {
  return new Promise((resolve) => window.requestIdleCallback(resolve));
}

/**
 * Returns a Promise that resolves on `requestAnimationFrame`.
 *
 * @param {number=} delay whether to also delay by `setTimeout`
 * @return {!Promise<!IdleDeadline>}
 */
export function rAF(delay=undefined) {
  if (delay !== undefined) {
    return new Promise((resolve) => {
      window.setTimeout(() => window.requestAnimationFrame(resolve));
    });
  }
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}