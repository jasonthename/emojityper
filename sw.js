/**
 * Generated on: Sun Apr 29 2018 08:22:51 GMT+1000 (AEST)
 */

importScripts('https://unpkg.com/workbox-sw@2.0.1/build/importScripts/workbox-sw.prod.v2.0.1.js');
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
realURLs.forEach((prefix) => {
  // TODO: This only caches the request on the 2nd load. However it's probably coming out of cache
  // for a while anyway because the resources are served with stupid high expiries.
  const r = new RegExp('^' + escape(prefix) + '.*');
  workboxSW.router.registerRoute(
    r,
    workboxSW.strategies.cacheFirst({
      cacheableResponse: {
        statuses: [0, 200],
      }
    })
  );  
});

self.addEventListener('install', function(event) {
  // become active immediately
  // TODO: There's some concern that Cloudfare is caching .css longer than .js, so clients
  // are not getting the updated versions.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  // claim all clients, forcing them to reload
  return self.clients.claim();
});
