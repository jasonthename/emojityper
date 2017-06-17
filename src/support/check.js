
if (!window.location.search || window.location.search.indexOf('ignore_check') === -1) {
  const support = true && window.Map && window.WeakMap;
  if (!support) {
    window.location = 'error.html';
  }
}
