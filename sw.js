importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.2.0/workbox-sw.js');

workbox.precaching.precacheAndRoute([
  {
    "url": "index.html",
    "revision": "6c2b580abdeebfcc965bcd0789d35eb7"
  },
  {
    "url": "bundle-324d42b768.js",
    "revision": "c98aa7ece7c726ce3aacf677b95c4c36"
  },
  {
    "url": "manifest.json",
    "revision": "a7bcbda51ef70d13cbbb4f5ee78c4827"
  },
  {
    "url": "support-022b63e7c4.js",
    "revision": "836dcd49446c08e4590877b733060e95"
  },
  {
    "url": "res/icon-100.png",
    "revision": "d823ac9463adf2fc4c5895d14e0ad937"
  },
  {
    "url": "res/icon-128.png",
    "revision": "4ede97c725914d6b563ecbebc79ab65f"
  },
  {
    "url": "res/icon-150.png",
    "revision": "22ab89a69fc4ecdf44c1cd172d0338dd"
  },
  {
    "url": "res/icon-192.png",
    "revision": "78015ecb19c885bbda9739f3bdd23a19"
  },
  {
    "url": "res/icon-256.png",
    "revision": "86f6d723d862012ab85535108000ef25"
  },
  {
    "url": "res/icon-44.png",
    "revision": "ceb30aaf55029d8c8fb484c0d38108b8"
  },
  {
    "url": "res/icon-50.png",
    "revision": "862f57ffa8b958c5a26805ab5e3a8b81"
  },
  {
    "url": "res/icon-512.png",
    "revision": "0b23c85f71f7a57e28cc9e897f9ffbe0"
  }
]);
workbox.googleAnalytics.initialize();

const realURLs = [
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
  'https://cdn.jsdelivr.net/npm/',
];
function escape(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
realURLs.forEach((prefix) => {
  // TODO: This only caches the request on the 2nd load. However it's probably coming out of cache
  // for a while anyway because the resources are served with stupid high expiries.
  const r = new RegExp('^' + escape(prefix) + '.*');
  workbox.routing.registerRoute(r, workbox.strategies.cacheFirst());
});

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());  // become active immediately
});

self.addEventListener('activate', (event) => {
  return self.clients.claim();  // claim, causing window.location.reload()
});
