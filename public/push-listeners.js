/* Elara Web Push listener. Imported by the generated Workbox service worker. */
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'Elara', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Elara'
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/pwa-192.png',
    tag: data.tag || data.type || 'elara-notification',
    renotify: data.priority === 'high' || data.priority === 'urgent',
    vibrate: data.priority === 'high' || data.priority === 'urgent' ? [120, 60, 120] : [80],
    data: {
      url: data.actionUrl || data.action_url || '/',
      notificationId: data.notificationId || data.notification_id || null,
      type: data.type || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL(event.notification?.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      if ('focus' in client) {
        try {
          await client.focus()
          if ('navigate' in client) await client.navigate(targetUrl)
          return
        } catch (e) {}
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl)
  })())
})
