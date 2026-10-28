const C='duty-v3';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./style.css','./app.js','./logic.js','./sites.js','./manifest.json','./icon-192.png','./icon-512.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c2=r.clone();caches.open(C).then(c=>c.put(e.request,c2));return r}).catch(()=>caches.match(e.request)))});
