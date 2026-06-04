// Service worker mínim: permet instal·lar la PWA i serveix de shell.
// No fa caché agressiva perquè l'app necessita dades fresques de Supabase.
const CACHE = "birraporra-v10";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first: sempre intenta la xarxa; només l'app shell es podria servir de caché.
  // Les peticions a Supabase i API mai es cachegen.
  const url = e.request.url;
  if (url.includes("supabase") || url.includes("/api/") || e.request.method !== "GET") {
    return; // deixa passar normal
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
