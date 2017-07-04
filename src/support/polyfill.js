
/**
 * @fileoverview Polyfills included for Emojityper on non-module browsers.
 */

import '../../node_modules/core-js/modules/es6.string.starts-with';
import '../../node_modules/core-js/modules/es6.string.from-code-point';
import '../../node_modules/core-js/modules/es6.array.from';
import '../../node_modules/core-js/modules/es6.promise';
import '../../node_modules/core-js/modules/es6.symbol';

// IE11 CustomEvent
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

// IE11 Element.remove
if (!Element.prototype.hasOwnProperty('remove')) {
  Object.defineProperty(Element.prototype, 'remove', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function remove() {
      this.parentNode && this.parentNode.removeChild(this);
    },
  });
}

// for async/await magic
// nb. this puts regeneratorRuntime into the top-level scope
import '../../node_modules/regenerator-runtime/runtime.js';
