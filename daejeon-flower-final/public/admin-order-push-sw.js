self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(self.registration.showNotification('대전꽃백화점', {
    body: data.tag === 'order-push-test' ? '주문 푸시 알림이 연결됐어요.' : '결제가 완료된 새 주문이 들어왔어요. 관리자에서 확인해 주세요.',
    tag: typeof data.tag === 'string' ? data.tag : 'new-order',
    icon: '/admin-order-push-192.png',
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const admin = clients.find(client => {
      const url = new URL(client.url);
      return url.origin === self.location.origin && url.pathname === '/admin';
    });
    if (admin) { await admin.focus(); return; }
    await self.clients.openWindow('/admin');
  })());
});
