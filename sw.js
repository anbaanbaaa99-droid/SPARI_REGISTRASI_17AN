const CACHE = "spari81-v8.2";

const STATIC = [
  "./",
  "./index.html",
  "./status.html",
  "./admin.html",
  "./checkin.html",

  "./assets/app.css?v=8.2",
  "./assets/common.js?v=8.2",
  "./assets/index.js?v=8.2",
  "./assets/status.js?v=8.2",
  "./assets/admin.js?v=8.2",
  "./assets/checkin.js?v=8.2",

  "./assets/icon.svg",
  "./assets/media/brand.webp",
  "./assets/media/mall-alam-sutera.webp",

  "./manifest.webmanifest"
];

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE)

        .then(
          cache =>
            cache.addAll(STATIC)
        )

        .then(
          () =>
            self.skipWaiting()
        )
    );
  }
);

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(
          keys =>
            Promise.all(

              keys
                .filter(
                  key =>
                    key !== CACHE
                )

                .map(
                  key =>
                    caches.delete(key)
                )
            )
        )

        .then(
          () =>
            self.clients.claim()
        )
    );
  }
);

async function networkFirst(request) {

  const cache =
    await caches.open(CACHE);

  try {

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () =>
          controller.abort(),
        3000
      );

    const response =
      await fetch(
        request,
        {
          signal:
            controller.signal,

          cache:
            "no-store"
        }
      );

    clearTimeout(timer);

    if (response.ok) {

      cache.put(
        request,
        response.clone()
      );
    }

    return response;

  } catch {

    return (

      await cache.match(request)

      ||

      await cache.match(
        "./index.html"
      )
    );
  }
}

async function staleWhileRevalidate(request) {

  const cache =
    await caches.open(CACHE);

  const cached =
    await cache.match(request);

  const network =
    fetch(request)

      .then(response => {

        if (response.ok) {

          cache.put(
            request,
            response.clone()
          );
        }

        return response;
      })

      .catch(
        () => null
      );

  return (
    cached ||
    network ||
    Response.error()
  );
}

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;

    if (
      request.method !== "GET"
    ) return;

    const url =
      new URL(request.url);

    if (
      url.origin !==
      self.location.origin
    ) return;

    /*
      CONFIG + JADWAL
      JANGAN DI-CACHE
    */

    if (
      url.pathname
        .endsWith(
          "/config.js"
        )

      ||

      url.pathname
        .endsWith(
          "/assets/site-data.js"
        )
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache:
              "no-store"
          }
        )
      );

      return;
    }

    if (
      request.mode ===
      "navigate"
    ) {

      event.respondWith(
        networkFirst(request)
      );

      return;
    }

    if (
      [
        "style",
        "script",
        "image",
        "font"
      ].includes(
        request.destination
      )

      ||

      url.pathname
        .endsWith(
          ".webmanifest"
        )
    ) {

      event.respondWith(
        staleWhileRevalidate(
          request
        )
      );
    }
  }
);
