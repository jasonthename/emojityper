
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('failed to register SW', err);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.info('got SW controllerchange, reload');
    window.location.reload();
  });
}
