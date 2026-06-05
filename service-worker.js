const CACHE_NAME = 'geonotion-v1';
const CACHE_FILES = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/geonotion.json',
    '/static/favicon.png',
    '/static/icon.png'
];

self.addEventListener('install', async (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            
            for (const file of CACHE_FILES) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        await cache.put(file, response);
                        console.log("Cached:", file);
                    } else {
                        console.warn(`Failed to cache ${file}: (${response.status})`);
                    }
                } catch (error) {
                    console.warn(`Error caching ${file}:`, error);
                }
            }
            
            console.log("[SW] Caching finished");
        })()
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            try {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                return await fetch(event.request);
            } catch (error) {
                console.error("[SW] Request error:", error);
                return new Response("Offline: page not found", {
                    status: 404,
                    headers: { "Content-Type": "text/plain" }
                });
            }
        })()
    );
});

self.addEventListener('activate', async (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cacheKeys = await caches.keys();
                const deletePromises = cacheKeys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key));
                await Promise.all(deletePromises);
                console.log("[SW] Old cash cleared");
            } catch (error) {
                console.error("[SW] Error while clearing cache:", error);
            }
        })()
    );
});