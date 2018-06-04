
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('failed to register SW', err);
  });

  const hadInitialController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadInitialController) {
      // only reload if we had a SW on load
      console.debug('got SW controllerchange, reload');
      window.location.reload();
    } else {
      // this is the very first SW, so reloading doesn't help us
    }
  });
}
