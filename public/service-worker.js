// Network first, falling back to the cache when offline. The app is a handful
// of small files, so always asking the network keeps it fresh without having to
// remember to bump a version number. /api requests are never cached.
//
// This file keeps the name of the old Create React App service worker so that
// installed copies of the old version update into this one.

const CACHE = "scabbard"
const SHELL = ["/", "/app.js", "/style.css", "/manifest.json", "/favicon.ico", "/logo192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // Clear out the old Workbox caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || caches.match("/"))),
  )
})
