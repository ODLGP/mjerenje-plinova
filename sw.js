const CACHE_NAME = 'mop-mjerenje-v12';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Slike uređaja
  './slike/uredjaji/GA5000.jpg',
  './slike/uredjaji/Optima-Biogas.png',
  // Slike odlagališta
  './slike/odlagalista/Krizevci.jpg',
  './slike/odlagalista/Koprivnica.jpg',
  './slike/odlagalista/Virovitica.jpg',
  './slike/odlagalista/Grubisno-Polje.jpg',
  './slike/odlagalista/Belisce.jpg',
  './slike/odlagalista/Beli-Manastir.jpg',
  './slike/odlagalista/Pag.jpg',
  './slike/odlagalista/Otocac.jpg',
  './slike/odlagalista/Zadar.jpg',
  './slike/odlagalista/Karepovac.jpg',
  './slike/odlagalista/Knin.jpg',
  './slike/odlagalista/Obrovac.jpg',
  './slike/odlagalista/Labin.jpg',
  './slike/odlagalista/Zapresic.jpg',
  './slike/odlagalista/Griza.jpg',
  './slike/odlagalista/Cres.jpg',
  './slike/odlagalista/Bedekovcina.jpg',
  './slike/odlagalista/Rovinj.jpg',
  './slike/odlagalista/Pazin.jpg',
  './slike/odlagalista/Biljane-Donje.jpg',
  'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js'
];

// Instalacija Service Workera
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache otvoren');
        return cache.addAll(urlsToCache);
      })
  );
});

// Aktivacija Service Workera
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Brišem stari cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Dohvaćanje resursa
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Vraća cache ako postoji, inače dohvaća s mreže
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            // Provjeri je li odgovor valjan
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Kloniraj odgovor
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});
