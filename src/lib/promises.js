
const resolved = Promise.resolve();

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
      window.setTimeout(() => window.requestAnimationFrame(resolve), delay);
    });
  }
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

/**
 * Returns a Promise that resolves after a microtask.
 *
 * @return {!Promise<void>}
 */
export function microTask() {
  let resolver;
  const out = new Promise((resolve) => resolver = resolve);
  resolved.then(() => resolver());  // microTask
  return out;
}

/**
 * @return {{promise: !Promise<void>, resolver: function(): void}}
 */
export function resolver() {
  let resolver;
  const promise = new Promise((resolve) => resolver = resolve);
  return {resolver, promise};
}

const debouceMap = new Map();

/**
 * Returns a Promise that debounces a call to the passed callable.
 *
 * @template T
 * @param {function(): T} callable
 * @param {number=} delay
 * @return {!Promise<T>}
 */
export function debounce(callable, delay=0) {
  let state = debouceMap.get(callable);
  if (!state) {
    state = {c: callable};
    const p = new Promise((resolve) => state.r = resolve);
    state.p = p.then(() => {
      debouceMap.delete(callable);
      return state.c();
    });
    debouceMap.set(callable, state);
  }

  window.clearTimeout(state.t);
  state.t = window.setTimeout(state.r, Math.max(0, delay));

  return state.p;
}