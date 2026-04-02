import { NextResponse } from 'next/server';

const SW_CONTENT = `
// Self-destructing service worker - kills the old Vite PWA SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(client => client.navigate('/'));
    })()
  );
});
`;

export async function GET() {
  return new NextResponse(SW_CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
