
/**
 * @fileoverview Polyfills included for Emojityper on non-module browsers.
 */

import '../../node_modules/core-js/modules/es6.string.starts-with';
import '../../node_modules/core-js/modules/es6.array.from';
import '../../node_modules/core-js/modules/es6.promise';
import '../../node_modules/core-js/modules/es6.symbol';

if (typeof window.CustomEvent !== 'function') {
  function CustomEvent(name, params) {
    params = params || {bubbles: false, cancelable: false, detail: undefined};
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, params.bubbles, params.cancelable, params.detail);
    return event;
  }
  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
}

// for async/await magic
// nb. this puts regeneratorRuntime into the top-level scope
import '../../node_modules/regenerator-runtime/runtime.js';
