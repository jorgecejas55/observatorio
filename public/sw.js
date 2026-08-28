// Service Worker — Observatorio de Turismo Municipal (Fase C, PWA instalable)
// Estrategia: red primero, fallback a caché en GET same-origin — solo para el
// shell de la app (HTML/JS/CSS), nunca para /api/: esas rutas sirven datos en
// vivo (dashboards, RBAC) y jamás deben caer a un snapshot viejo si la red
// falla una vez. Bug real: sin esta exclusión, un timeout puntual del GAS
// (hoja grande, cold start) dejaba servida para siempre la última respuesta
// cacheada de /api/.../resumen, sin importar que el backend ya tuviera datos
// correctos — porque la respuesta se cacheaba sin chequear response.ok.
// Bump CACHE_VERSION en cada deploy que toque este archivo o estrategia de caché,
// para forzar la limpieza de cachés viejas en `activate`.
const CACHE_VERSION = 'v2'
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

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // /api/: datos en vivo (dashboards, sesión) — siempre a red, sin caché ni
  // fallback a un snapshot viejo. Ver nota arriba del bug que esto evita.
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
