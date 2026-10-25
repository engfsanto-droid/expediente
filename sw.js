/* Service worker: deixa o app abrir sem internet e recebe os lembretes. */
var CACHE = 'expediente-v1.1';
var ARQUIVOS = ['./', 'index.html', 'app.js', 'malha.js', 'config.js', 'manifest.json', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // envios vão direto para o servidor
  var url = new URL(req.url);
  var mesmo = url.origin === self.location.origin;
  var fonte = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!mesmo && !fonte) return;
  // rede primeiro (pega versão nova), cache se estiver sem sinal
  e.respondWith(fetch(req).then(function (r) {
    if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || (req.mode === 'navigate' ? caches.match('index.html') : undefined); });
  }));
});

/* ---------- lembretes (Firebase Cloud Messaging) ---------- */
try { importScripts('config.js'); } catch (e) { self.CONFIG = null; }
if (self.CONFIG && self.CONFIG.firebase && self.CONFIG.firebase.apiKey) {
  try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
    firebase.initializeApp(self.CONFIG.firebase);
    firebase.messaging(); // mostra sozinho as notificações que chegam com o app fechado
  } catch (e) { /* sem lembretes */ }
}

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ('focus' in cs[i]) return cs[i].focus();
    return self.clients.openWindow('./');
  }));
});
