const CACHE='bg-guide-v10';
const LOGOS=['stari-grad','vracar','savski-venac','novi-beograd','zemun','palilula','vozdovac','zvezdara','rakovica','cukarica'].map(s=>'./logos/'+s+'.png');
const LOCAL=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./fonts/ProSRB.woff2','./fonts/ProSRB.otf','./loader.webp','./loader.apng'].concat(LOGOS);
const EXTRA=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  await c.addAll(LOCAL);
  await Promise.allSettled(EXTRA.map(u=>c.add(u)));
  self.skipWaiting();
})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  self.clients.claim();
})());});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // тайлы карты и роутинг — только сеть (не засоряем кэш)
  if(/cartocdn|openstreetmap|tile/.test(url.hostname)){ e.respondWith(fetch(req).catch(()=>caches.match(req))); return; }
  // HTML/навигация — СЕТЬ ВПЕРЁД, чтобы всегда была свежая версия; кэш как запас офлайн
  const isDoc = req.mode==='navigate' || (req.destination==='document') || /\/(index\.html)?(\?.*)?$/.test(url.pathname);
  if(isDoc && url.origin===location.origin){
    e.respondWith(fetch(req).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{}); return resp;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  // остальное (leaflet, фото, иконки) — сначала кэш, потом сеть (и кэшируем)
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(resp=>{
    const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); return resp;
  }).catch(()=>caches.match('./index.html'))));
});
