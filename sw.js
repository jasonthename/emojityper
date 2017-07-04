importScripts('https://unpkg.com/workbox-sw@1.0.1');
importScripts('./manifest.js');

const workboxSW = new self.WorkboxSW();
workboxSW.precache(self.__file_manifest);

const realURLs = [
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
  'https://cdn.rawgit.com/samthor/rippleJS/',
];
function escape(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
realURLs.forEach(prefix => {
  const r = new RegExp('^' + escape(prefix) + '.*');
  workboxSW.router.registerRoute(r, workboxSW.strategies.cacheFirst());
});

// TODO: post message to console/etc saying new version ready
