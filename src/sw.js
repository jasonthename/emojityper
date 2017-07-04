
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js').catch(err => {
    console.warn('failed to register SW', err);
  });
}
