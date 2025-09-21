// Service Worker for Site Inspection PWA
const VERSION = '1.2.1';
const CACHE_NAME = `site-inspect-v${VERSION}`;
const API_CACHE_NAME = `site-inspect-api-v${VERSION}`;

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/static/css/components.css',
  '/static/css/base.css',
  '/static/js/auth.js',
  '/static/js/core/app.js',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/v1/templates',
  '/api/v1/users/roles',
  '/api/v1/users/permissions'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log(`Service Worker v${VERSION} installing...`);
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(CACHE_NAME).then(cache => {
        console.log('Caching static files for version', VERSION);
        return cache.addAll(STATIC_CACHE_URLS);
      }),
      // Cache API responses
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('Pre-caching API responses');
        return Promise.all(
          API_CACHE_URLS.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response.clone());
                }
              })
              .catch(err => console.log('Failed to cache', url, err));
          })
        );
      })
    ])
  );
  // Force immediate activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log(`Service Worker v${VERSION} activating...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: VERSION
          });
        });
      });
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static file requests
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(response => {
        // Cache successful responses
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        throw new Error('Network request failed and no cache available');
      });
    })
  );
});

// Handle API requests with offline support
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request.clone(), response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT requests when offline, store in IndexedDB for sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeOfflineRequest(request.clone());
      return new Response(
        JSON.stringify({
          message: 'Request stored for sync when online',
          offline: true,
          timestamp: Date.now()
        }),
        {
          status: 202,
          statusText: 'Accepted',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Store offline requests for background sync
async function storeOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body: await request.text(),
    timestamp: Date.now()
  };
  
  // Use postMessage to communicate with main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'STORE_OFFLINE_REQUEST',
        data: requestData
      });
    });
  });
}

// Background sync event
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(syncOfflineRequests());
  }
});

// Sync stored offline requests
async function syncOfflineRequests() {
  // Communicate with main thread to get stored requests
  const clients = await self.clients.matchAll();
  if (clients.length > 0) {
    clients[0].postMessage({ type: 'SYNC_OFFLINE_REQUESTS' });
  }
}

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data.type === 'SYNC_REQUEST') {
    const { url, method, headers, body } = event.data.request;
    
    fetch(url, {
      method,
      headers: new Headers(headers),
      body: body || undefined
    }).then(response => {
      // Notify main thread of sync result
      event.ports[0].postMessage({
        success: response.ok,
        status: response.status,
        request: event.data.request
      });
    }).catch(error => {
      event.ports[0].postMessage({
        success: false,
        error: error.message,
        request: event.data.request
      });
    });
  } else if (event.data.type === 'GET_VERSION') {
    // Respond with current version
    event.source.postMessage({
      type: 'VERSION_RESPONSE',
      version: VERSION
    });
  }
});

// Push notification event
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/static/images/icon-192.png',
    badge: '/static/images/badge.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/static/images/view-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/images/close-icon.png'
      }
    ],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});