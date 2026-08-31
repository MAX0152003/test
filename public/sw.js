// Service Worker for ClassPulse 2.0 Native System Alarms & Background Notifications
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
      vibrate: [300, 100, 300, 100, 600],
      requireInteraction: true,
      ...options
    });
  }
});

// Notification click event: focuses the app window or navigates to relevant screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen一眼 = event.notification.data?.url || '/';
  const action = event.action;

  let targetScreen = event.notification.data?.screen || 'schedule';
  if (action === 'open_scan') {
    targetScreen = 'attendance';
  } else if (action === 'view_timetable' || action === 'view_sched') {
    targetScreen = 'schedule';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_SCREEN',
            screen: targetScreen,
            action: action,
            data: event.notification.data
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen一眼);
      }
    })
  );
});

// Periodic background sync if registered by Android Chrome / WebAPK
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'classpulse-schedule-sync') {
    console.log('[SW] Periodic background schedule sync fired');
  }
});
