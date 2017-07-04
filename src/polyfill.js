
/**
 * @fileoverview Polyfills needed for modern browsers, even those supporting ES6 modules.
 */

if (!window.requestIdleCallback) {
  // TODO: this is a pretty terrible requestIdleCallback
  window.requestIdleCallback = (callback) => {
    const start = performance.now();
    const fn = callback.bind(null, {
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (performance.now() - start)),
    });
    return window.setTimeout(fn, 1);
  };

  window.cancelIdleCallback = id => window.clearTimeout(id);
}

