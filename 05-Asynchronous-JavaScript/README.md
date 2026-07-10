# Module 05: Asynchronous JavaScript

This module covers asynchronous programming patterns in JavaScript. We will explore how JavaScript manages concurrent operations using a single thread, tracing execution from callbacks to the V8 Event Loop, Promises, and Async/Await generator architectures.

## 📋 Module Overview

In this module, we will explore:
- How callbacks handle execution handoffs.
- The mechanics of the V8 Event Loop and task queues.
- Promises lifecycles and combinator methods.
- The syntactic and structural details of Async/Await.
- Async/Await compilation using Generators.
- Fetch APIs and request streams.
- Asynchronous debugging and race conditions.

---

## 🏁 Chapter Checklist

- [x] [05-01: Callbacks & Callback Hell](05-01-callbacks-and-callback-hell.md) — Callbacks, execution handlers, and Callback Hell ("Pyramid of Doom").
- [x] [05-02: The Event Loop & Queues](05-02-event-loop-and-queues.md) — Call Stack, Browser Web APIs, Callback (Macrotask) Queue, and Microtask Queue dynamics.
- [x] [05-03: Promises](05-03-promises.md) — Promise states, chaining methods, and error handling.
- [x] [05-04: Promise Combinators](05-04-promise-combinators.md) — Comparative analysis of `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`.
- [x] [05-05: Async / Await](05-05-async-await.md) — Linear asynchronous code structure and `try-catch` error handling.
- [x] [05-06: Async / Await Internals](05-06-async-await-internals.md) — Under-the-hood engine mechanics: generators + promise yield mechanisms.
- [x] [05-07: Fetch API & Async Patterns](05-07-fetch-api-and-async-patterns.md) — Fetch API, network streams, abort signals, and retry loops.
- [x] [05-08: Async Debugging & Common Bugs](05-08-async-debugging-and-bugs.md) — Common async bugs (race conditions, unhandled rejections) and async trace debugging.
