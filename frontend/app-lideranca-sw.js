/* Service Worker — APP Liderança (avisos de teste de candidato)
 * Só trata notificações push; não faz cache (evita servir versões antigas do sistema). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
    var data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'América Rental', body: event.data ? event.data.text() : '' }; }
    var title = data.title || 'América Rental';
    event.waitUntil(self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/favicon-48x48.png',
        tag: data.tag || 'app-lideranca',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/?abrir=app-lideranca-candidatos' }
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var url = (event.notification.data && event.notification.data.url) || '/?abrir=app-lideranca-candidatos';
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
        for (var i = 0; i < lista.length; i++) {
            var c = lista[i];
            if ('focus' in c) { c.navigate(url); return c.focus(); }
        }
        return self.clients.openWindow(url);
    }));
});
