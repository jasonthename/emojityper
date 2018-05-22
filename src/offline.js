
import {debounce} from './lib/promises.js';

let prevOnLine = true;

function notifyStatus() {
  if ('onLine' in navigator && prevOnLine !== navigator.onLine) {
    ga('send', 'event', 'network', navigator.onLine ? 'online' : 'offline');
    prevOnLine = navigator.onLine;
    console.info('sending', prevOnLine);
  }
}

notifyStatus();
window.addEventListener('online', () => debounce(notifyStatus));
window.addEventListener('offline', () => debounce(notifyStatus));
