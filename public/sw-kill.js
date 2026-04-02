// This service worker immediately unregisters all existing service workers
// and clears all caches, then deletes itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  // Unregister all service workers
  const registrations = await self.registration.unregister();
  
  // Clear all caches
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map(key => caches.delete(key)));
  
  // Reload all clients
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.navigate(client.url));
});
