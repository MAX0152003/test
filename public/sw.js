// Service Worker for ClassPulse 2.0 Native System Alarms & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Active background alarms map
const pendingAlarms = new Map();

// Handle incoming push, test alarms or background message from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'ClassPulse Class Status Alarm', {
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [400, 150, 400, 150, 600],
      requireInteraction: true,
      ...options
    });
  } else if (event.data.type === 'SCHEDULE_ALARM') {
    const { alarmId, title, options, delayMs } = event.data;
    if (pendingAlarms.has(alarmId)) {
      clearTimeout(pendingAlarms.get(alarmId));
    }
    const timer = setTimeout(() => {
      pendingAlarms.delete(alarmId);
      self.registration.showNotification(title || 'ClassPulse Class Alarm', {
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [500, 200, 500, 200, 800],
        requireInteraction: true,
        ...options
      });
    }, Math.max(50, delayMs || 0));
    pendingAlarms.set(alarmId, timer);
  } else if (event.data.type === 'CANCEL_ALARM') {
    const { alarmId } = event.data;
    if (pendingAlarms.has(alarmId)) {
      clearTimeout(pendingAlarms.get(alarmId));
      pendingAlarms.delete(alarmId);
    }
  }
});

// Notification click event: focuses the app window or navigates to relevant screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  let targetScreen = event.notification.data?.screen || 'schedule';
  if (action === 'open_scan') {
    targetScreen = 'attendance';
  } else if (action === 'view_timetable' || action === 'view_sched') {
    targetScreen = 'schedule';
  } else if (action === 'dismiss') {
    return;
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
        return self.clients.openWindow(urlToOpen);
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
