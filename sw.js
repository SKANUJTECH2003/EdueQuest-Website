/**
 * EduQuest Service Worker
 * Enables offline access and PWA functionality
 */

const CACHE_NAME = 'eduquest-v1';
const OFFLINE_PAGE = '/index.html';

// Files to cache for offline access
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/quest.html',
    '/redeem.html',
    '/leaderboard.html',
    '/study_material.html',
    '/subjects.html',
    '/about.html',
    '/auth.js',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Service Worker: Cache error', error);
            })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Service Worker: Deleting cache', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim(); // Control all clients
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For API calls, use Stale-While-Revalidate strategy
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // Return cached response if available (stale-while-revalidate)
                    const fetchPromise = fetch(event.request)
                        .then(networkResponse => {
                            // Cache successful network responses
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                cache.put(event.request, responseClone);
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Return cached response on network error
                            return response || new Response(
                                JSON.stringify({ error: 'Offline - cached data may be unavailable' }),
                                { 
                                    headers: { 'Content-Type': 'application/json' },
                                    status: 503
                                }
                            );
                        });

                    // Return cached response immediately, or fetch if not cached
                    return response || fetchPromise;
                });
            })
        );
        return;
    }

    // For static assets, use cache-first strategy
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                // Return from cache if available
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            cache.put(event.request, responseClone);
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline page as fallback
                        return cache.match(OFFLINE_PAGE) || 
                               new Response('Offline - page not available', { status: 503 });
                    });
            });
        })
    );
                    // Network failed, try cache
                    return caches.match(event.request)
                        .then(response => {
                            return response || new Response('Offline - API data not available', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                });
        );
    } else {
        // For static assets, serve from cache, fallback to network
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }

                    return fetch(event.request)
                        .then(response => {
                            // Cache successful responses
                            if (response && response.status === 200 && response.type !== 'error') {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Offline and not in cache, show offline page for HTML
                            if (event.request.headers.get('accept').includes('text/html')) {
                                return caches.match(OFFLINE_PAGE);
                            }
                            return new Response('Offline', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-scores') {
        event.waitUntil(syncScores());
    }
    if (event.tag === 'sync-redemptions') {
        event.waitUntil(syncRedemptions());
    }
});

// Helper function to sync pending scores
async function syncScores() {
    try {
        const pendingScores = await getPendingScores();
        for (const score of pendingScores) {
            await fetch('/api/update-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(score)
            });
        }
        await clearPendingScores();
    } catch (error) {
        console.error('Error syncing scores:', error);
    }
}

// Helper function to sync pending redemptions
async function syncRedemptions() {
    try {
        const pendingRedemptions = await getPendingRedemptions();
        for (const redemption of pendingRedemptions) {
            await fetch('/api/redeem-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(redemption)
            });
        }
        await clearPendingRedemptions();
    } catch (error) {
        console.error('Error syncing redemptions:', error);
    }
}

// IndexedDB helpers for offline data
async function getPendingScores() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EduQuest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const store = db.transaction('pendingScores').objectStore('pendingScores');
            const result = store.getAll();
            result.onsuccess = () => resolve(result.result);
            result.onerror = () => reject(result.error);
        };
    });
}

async function clearPendingScores() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EduQuest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const store = db.transaction(['pendingScores'], 'readwrite').objectStore('pendingScores');
            store.clear();
            resolve();
        };
    });
}

async function getPendingRedemptions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EduQuest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const store = db.transaction('pendingRedemptions').objectStore('pendingRedemptions');
            const result = store.getAll();
            result.onsuccess = () => resolve(result.result);
            result.onerror = () => reject(result.error);
        };
    });
}

async function clearPendingRedemptions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EduQuest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const store = db.transaction(['pendingRedemptions'], 'readwrite').objectStore('pendingRedemptions');
            store.clear();
            resolve();
        };
    });
}