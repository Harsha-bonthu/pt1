// Simple service worker: caches core assets for offline viewing.
const CACHE = 'mock-dashboard-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/data/mock-data.json',
  '/assets/favicon.svg',
  '/assets/logo.svg',
  '/sw.js'
]

self.addEventListener('install', ev=>{
  ev.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}))
})

self.addEventListener('activate', ev=>{
  ev.waitUntil(self.clients.claim())
})

// Cache-first for app shell, network-first for API and runtime caching for images
self.addEventListener('fetch', ev=>{
  const req = ev.request
  const url = new URL(req.url)
  // image runtime caching
  if(url.pathname.startsWith('/assets/') || req.destination === 'image'){
    ev.respondWith(caches.open(CACHE).then(cache=>cache.match(req).then(resp=>resp || fetch(req).then(r=>{cache.put(req,r.clone());return r}))))
    return
  }

  // app shell
  ev.respondWith(caches.match(req).then(r=> r || fetch(req).catch(()=>caches.match('/index.html'))))
})
