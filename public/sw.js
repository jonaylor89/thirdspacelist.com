const CACHE_NAME = 'thirdspacelist-v1'
const STATIC_CACHE = 'static-v1'
const RUNTIME_CACHE = 'runtime-v1'

// Assets to cache on install (only include existing assets)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json'
]

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/places',
  '/api/observations'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        // Cache assets individually to handle missing files gracefully
        const cachePromises = PRECACHE_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset)
          } catch (error) {
            console.warn(`Failed to cache ${asset}:`, error)
          }
        })
        await Promise.allSettled(cachePromises)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests with network-first strategy
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Handle navigation requests with cache-first strategy for static assets
  if (request.destination === 'document') {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Handle other requests with stale-while-revalidate
  event.respondWith(staleWhileRevalidateStrategy(request))
})

async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cacheResponse = await cache.match(request)
    if (cacheResponse) {
      return cacheResponse
    }
    throw error
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cacheResponse = await cache.match(request)
  
  if (cacheResponse) {
    return cacheResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // Return offline fallback if available
    return cache.match('/') || new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cacheResponse = await cache.match(request)
  
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => null)
  
  return cacheResponse || await networkPromise || new Response('Offline', { status: 503 })
}

// Handle background sync for offline observations
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-observations') {
    event.waitUntil(syncObservations())
  }
})

async function syncObservations() {
  try {
    const observations = await getStoredObservations()
    for (const observation of observations) {
      try {
        const response = await fetch('/api/observations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(observation),
        })
        
        if (response.ok) {
          await removeStoredObservation(observation.id)
        }
      } catch (error) {
        console.error('Failed to sync observation:', error)
      }
    }
  } catch (error) {
    console.error('Failed to sync observations:', error)
  }
}

async function getStoredObservations() {
  // This would typically use IndexedDB
  return JSON.parse(localStorage.getItem('pendingObservations') || '[]')
}

async function removeStoredObservation(id) {
  const observations = await getStoredObservations()
  const filtered = observations.filter(obs => obs.id !== id)
  localStorage.setItem('pendingObservations', JSON.stringify(filtered))
}

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ThirdSpaceList', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})
