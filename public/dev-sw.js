// Self-destructing service worker.
// The old Vite PWA dev SW checks for updates at this URL.
// This file replaces it: installs immediately, then unregisters everything and reloads.

self.addEventListener('install', () => {
  // Skip waiting so this SW activates instantly, replacing the old one
  self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
  event.waitUntil(
    (async () => {
      // 1. Clear every cache the old SW created
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      // 2. Unregister this SW (and any others)
      await self.registration.unregister();

      // 3. Force-reload all open tabs to the correct URL
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clientList.forEach(client => {
        // Navigate back to root so Next.js can handle the redirect
        client.navigate('/');
      });
    })()
  );
});
