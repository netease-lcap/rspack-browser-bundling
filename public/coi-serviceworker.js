/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
/*
 * Service Worker to enable SharedArrayBuffer on environments like GitHub Pages
 * that don't allow customizing headers (COOP/COEP).
 * 
 * Source: https://github.com/gzuidhof/coi-serviceworker
 */

let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, {
                credentials: "omit",
            })
            : r;
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp"
                    );
                    if (!coepCredentialless) {
                        newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
                    }
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });

} else {
    (() => {
        // You can customize the behavior of this script through a global `coi` variable.
        const coi = {
            shouldRegister: () => true,
            shouldDeregister: () => false,
            coepCredentialless: () => false,
            doReload: () => window.location.reload(),
            quiet: false,
            ...window.coi
        };

        const n = navigator;
        const controlling = n.serviceWorker && n.serviceWorker.controller;

        // If we are already cross-origin isolated, we don't need to do anything.
        if (window.crossOriginIsolated !== false) {
            return;
        }

        // If there's a controlling service worker but it's not ours, don't interfere
        if (controlling) {
            const currentScriptUrl = new URL('coi-serviceworker.js', window.location.href).href;
            if (!controlling.scriptURL.includes('coi-serviceworker')) {
                return;
            }
            
            // Deregister the service worker if needed
            if (coi.shouldDeregister()) {
                controlling.postMessage({ type: "deregister" });
                return;
            }

            controlling.postMessage({
                type: "coepCredentialless",
                value: coi.coepCredentialless(),
            });
        }

        // Reload the page when we detect a controller change if not already cross-origin isolated
        n.serviceWorker.addEventListener("controllerchange", () => {
            if (window.crossOriginIsolated !== false) {
                coi.doReload();
            }
        });

        // Register the service worker
        if (coi.shouldRegister()) {
            n.serviceWorker.register(new URL('coi-serviceworker.js', window.location.href).href).then(
                (registration) => {
                    if (!coi.quiet) {
                        console.log("COOP/COEP Service Worker registered", registration.scope);
                    }

                    // If the registration is waiting, force it to become active
                    registration.waiting && registration.waiting.postMessage({ type: "skipWaiting" });

                    // If there's no controller, reload the page
                    if (!n.serviceWorker.controller) {
                        coi.doReload();
                    }
                },
                (err) => {
                    if (!coi.quiet) {
                        console.error("COOP/COEP Service Worker failed to register:", err);
                    }
                }
            );
        }
    })();
}
