// Service Worker for ClassPulse 2.0 System Alarms & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push or background message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'ClassPulse Class Status Alarm', {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200, 100, 400],
      requireInteraction: true,
      ...options
    });
  }
});

// Notification click event: focuses the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (event.notification.data?.screen) {
            client.postMessage({
              type: 'NAVIGATE_SCREEN',
              screen: event.notification.data.screen
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
