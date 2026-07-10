# Module 06: Browser

This module covers browser-side JavaScript runtime environments. We will explore how JavaScript interacts with browser structures, beginning with the DOM (Document Object Model), traversing and manipulating nodes, handling user events, caching data locally, and sync-rendering frames on screen.

## 📋 Module Overview

In this module, we will explore:
- DOM tree structures and node traversals.
- Selectors and Node Collection types.
- DOM Lifecycle, fragments, and XSS prevention.
- Bubbling, capturing, and delegation.
- Options for Event Listeners.
- Local Storage, Session Storage, Cookies, and IndexedDB.
- Timers vs. requestAnimationFrame loops.
- The Critical Rendering Path (CRP), Reflows, and Repaints.

---

## 🏁 Chapter Checklist

- [x] [06-01: DOM & Traversal](06-01-dom-and-traversal.md) — DOM structure, node types (element, text, comment), and node/element traversal APIs.
- [x] [06-02: DOM Selection](06-02-dom-selection.md) — Selector APIs (`querySelector`, `querySelectorAll`, `getElementById`) and static vs. live NodeLists/HTMLCollections.
- [x] [06-03: DOM Manipulation](06-03-dom-manipulation.md) — Elements lifecycle (create, append, remove), document fragments, and `innerHTML` XSS security.
- [x] [06-04: Event Flow](06-04-event-flow.md) — Bubbling, capturing phases, the `Event` object, and Event Delegation performance patterns.
- [x] [06-05: Event Listeners](06-05-event-listeners.md) — Event listener bindings, removal, and options (`once`, `passive`, `capture`).
- [x] [06-06: Browser Storage](06-06-browser-storage.md) — Comparative analysis of `localStorage`, `sessionStorage`, Cookies, and IndexedDB basics.
- [x] [06-07: Timers & Animation](06-07-timers-and-animation.md) — Timers (`setTimeout`, `setInterval`) vs. the `requestAnimationFrame` render sync loop.
- [x] [06-08: Rendering Pipeline](06-08-rendering-pipeline.md) — The Critical Rendering Path, Reflows, Repaints, Layout Thrashing, and hardware acceleration layers.
