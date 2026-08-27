// Service Worker — Observatorio de Turismo Municipal (Fase C, PWA instalable)
// Estrategia: red primero, fallback a caché en GET same-origin.
// Bump CACHE_VERSION en cada deploy que toque este archivo o estrategia de caché,
// para forzar la limpieza de cachés viejas en `activate`.
const CACHE_VERSION = 'v1'
const CACHE_NAME = `observatorio-${CACHE_VERSION}`
const PRECACHE_URLS = ['/', '/login']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})
