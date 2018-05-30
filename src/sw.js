
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('failed to register SW', err);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (navigator.serviceWorker.controller) {
      // only reload if we already had a SW
      console.debug('got SW controllerchange, reload');
      window.location.reload();
    }
  });
}
