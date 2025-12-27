
const CACHE_VERSION = 'v24';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  video: `video-${CACHE_VERSION}`
};

const OFFLINE_URL = '/index.html';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Domains for long-term asset caching
const ASSET_DOMAINS = [
  'aistudiocdn.com',
  'cdn.tailwindcss.com',
  'images.weserv.nl',
  'doubanio.com'
];

/**
 * Utility to limit cache size
 */
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[PWA] Pre-caching static core');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!Object.values(CACHE_NAMES).includes(key)) {
            console.log('[PWA] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

const isIgnored = (url) => {
  return (
    url.includes('googleads') ||
    url.includes('doubleclick') ||
    url.includes('/match') ||
    url.includes('api/v2/comment')
  );
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || isIgnored(url.href)) return;

  // 1. Navigation Strategy: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 2. Video Data Strategy: Cache Playlist Metadata and limited Segments
  // Helps with "Resume playback" and smoothing out jittery connections
  if (url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAMES.video).then((cache) => {
              cache.put(request, copy);
              // Limit segment cache to roughly 100 segments to prevent storage bloat
              if (url.pathname.endsWith('.ts')) {
                limitCacheSize(CACHE_NAMES.video, 100);
              }
            });
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. Image Strategy: Cache-First
  const isImage = ASSET_DOMAINS.some(d => url.hostname.includes(d)) || 
                  url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/);
  if (isImage) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAMES.images).then((cache) => {
              cache.put(request, copy);
              limitCacheSize(CACHE_NAMES.images, 200);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. API Strategy: Stale-While-Revalidate
  // Caches movie lists and details so they appear instantly on re-visit
  if (url.searchParams.has('ac') || url.hostname.includes('douban.com')) {
    event.respondWith(
      caches.open(CACHE_NAMES.api).then((cache) => {
        return cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 5. Default Strategy: Network with Cache Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAMES.static).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
