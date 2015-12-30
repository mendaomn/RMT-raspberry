/*
 *
 *  Air Horner
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

// Version 0.46

importScripts('/cache-polyfill.js');

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open('rmt').then(function(cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/index.html?homescreen=1',
                '/?homescreen=1',
                '/styles/styles.min.css',
                '/scripts/main.min.js',
                '/scripts/templates.min.js'
            ]).then(function() {
                return self.skipWaiting();
            });
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Cache & network race
self.addEventListener('fetch', function(event) {
    console.log(event.request.url);

    event.respondWith(
        caches.open('rmt').then(function(cache) {
            return cache.match(event.request).then(function(response) {
                return response || fetch(event.request).then(function(response) {
                    cache.put(event.request, response.clone());
                    return response;
                });
            });
        })
    );
});

// Promise.race is no good to us because it rejects if
// a promise rejects before fulfilling. Let's make a proper
// race function:
function properRace(promises) {
    // we implement by inverting Promise.all
    Promise.all(
        promises.map(function(promise) {
            // for each promise, cast it, then swap around rejection & fulfill
            return Promise.resolve(promise).then(function(val) {
                throw val;
            }, function(err) {
                return err;
            });
        })
    ).then(function(errs) { // then swap it back
        throw Error("Proper race: none fulfilled");
    }, function(val) {
        return val;
    });
}
