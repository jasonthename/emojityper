
/**
 * @fileoverview Polyfills included for Emojityper on non-module browsers.
 */

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

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(search, from) {
    return this.substr(from || 0, search.length) === search;
  };
}

if (!Array.from) {
  Array.from = function(arg) {
    // TODO: this isn't the whole polyfill, but it's good for now: just for rollup generated code
    return Array.prototype.slice.call(arg);
  };
}
