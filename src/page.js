
/**
 * @fileoverview Controls the size and `has-value` class of the body itself based on current input.
 */

const value = (ev) => {
  const text = ev.detail.trim();
  document.body.classList.toggle('has-value', Boolean(text));
};
typer.addEventListener('value', value);
value({detail: typer.value});

// set minHeight to actual viewport height, but allow for keyboard etc
const resize = (ev) => {
  const height = window.innerHeight;
  document.body.style.minHeight = `${height}px`;
};
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
resize();


let deferredPrompt = null;

function cleanupPrompt() {
  document.body.classList.remove('has-install');
  deferredPrompt = null;
}

window.addEventListener('beforeinstallprompt', (ev) => {
  ga('send', 'event', 'install', 'available');
  document.body.classList.add('has-install');
  deferredPrompt = ev;
  ev.preventDefault();
  return false;
});

window.addEventListener('appinstalled', (ev) => {
  ga('send', 'event', 'install', 'installed');
  cleanupPrompt();
});

const installEl = document.getElementById('install');
installEl.addEventListener('click', (ev) => {
  if (!deferredPrompt) {
    return;
  }
  deferredPrompt.prompt();

  if (!deferredPrompt.userChoice) {
    return;  // older Chrome
  }

  deferredPrompt.userChoice.then((result) => {
    ga('send', 'event', 'install', result);
    // TODO: should we listen to appinstalled? I suppose we don't know what the user said.
  }).catch((err) => {
    console.warn('beforeinstallprompt prompt', err);
  }).then(cleanupPrompt);
});
