# Async Debugging & Common Bugs

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of the Event Loop, Promises, and Async/Await
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you run an art shop and hire two delivery drivers to deliver signs to a customer's storefront:

- **Race Condition is like out-of-order sign updates**: The customer changes their storefront name.
    1. At 10:00 AM, they request a sign saying `"ZARA'S BOUTIQUE"` (Request 1). Driver A takes this sign.
    2. At 10:05 AM, they realize they misspelled the name and request a sign saying `"ZARA BOUTIQUE"` (Request 2). Driver B takes this sign.
    3. Driver B drives fast and hangs the correct sign at 10:30 AM.
    4. Driver A gets stuck in traffic but eventually arrives at 11:00 AM. They take down the correct sign and hang the misspelled sign, completely unaware they are overwriting a newer update.
    The shop ends up with the wrong name because the slower, older request finished last.

In JavaScript, this out-of-order resolution is a **Race Condition**.

---

## 2. Problem

Asynchronous operations introduce state volatility:
- Functions execute at different times based on network latency.
- Unhandled Promise rejections can crash processes silently or leave them hanging in unstable states.
- Dangling event listeners or uncompleted timers prevent the garbage collector from reclaiming memory, causing memory leaks.

Without structured debugging tools, tracking these asynchronous failures is extremely difficult.

---

## 3. Solution

We implement defensive async design patterns:
1. **Race Condition Protections**: Using request IDs or `AbortController` signals to ignore stale results.
2. **Unhandled Rejection Handlers**: Binding global handlers to capture and log unhandled exceptions.
3. **Active Lifecycle Cleanups**: Ensuring timers are cleared and event listeners are detached.
4. **Asynchronous Trace Inspection**: Using modern debugging panels to reconstruct the complete execution timeline.

---

## 4. Definition

- **Race Condition**: An undesirable situation where the system's output depends on the sequence or timing of uncontrollable events (like network latency).
- **Memory Leak**: A failure to release allocated memory when it is no longer needed, causing the application to consume increasing amounts of RAM over time.
- **Async Stack Trace**: An extended error trace that links asynchronous callbacks back to the execution context frame that originally scheduled them.

---

## 5. Visualization

### Race Condition: Out-of-Order Network Resolution

```
   TIMELINE     ACTION                           NETWORK FLOW
  
   0ms          User types "a"   ------------->  [ Request 1: Slow Network ]
                                                 (Takes 1000ms to resolve)
  
   100ms        User types "ab"  ------------->  [ Request 2: Fast Network ]
                                                 (Takes 200ms to resolve)
  
   300ms        Request 2 resolves               <-- Renders "ab" results
  
   1000ms       Request 1 resolves               <-- Renders "a" results! (CRASH/BUG: Stale data overwrote newer input)
```

---

## 6. Internal Working

### How Memory Leaks Occur in Async JavaScript
When you declare a closure inside a timer or event listener:
- V8 keeps references to all outer scope variables in the Memory Heap (as explained in Chapter 04-04).
- If you call `setInterval(() => { ... }, 1000)` and forget to call `clearInterval()`, the callback continues to execute indefinitely in the background.
- Because the callback is active, V8 cannot garbage collect any variables referenced inside the closure, even if the parent component or page has been closed.

This causes memory leaks.

---

## 7. Code Examples

### Bad Practice: Vulnerable Search Autocomplete (Race Condition)
Assuming that requests resolve in the order they were sent.

```javascript
// Bad: Stale network responses can overwrite newer results!
let activeResult = null;

function searchInput(query) {
  fetch(`/api/search?q=${query}`)
    .then(res => res.json())
    .then(data => {
      // If a slower previous fetch resolves after a faster newer fetch,
      // it overwrites activeResult with stale data!
      activeResult = data;
      renderSearchList(activeResult);
    });
}
```

### Good Practice: Protecting State with Request IDs
Keep track of the last executed request ID and ignore any response that doesn't match it.

```javascript
// Good: Ignores stale results
let currentRequestID = 0;

function searchInputProtected(query) {
  const requestID = ++currentRequestID;

  fetch(`/api/search?q=${query}`)
    .then(res => res.json())
    .then(data => {
      // Only update state if this is the latest request
      if (requestID === currentRequestID) {
        renderSearchList(data);
      } else {
        console.warn("Discarded stale search response");
      }
    });
}
```

### Best Practice: Aborting Stale Requests and Cleaning Up Timers
Abort previous requests when new ones start, and clean up all async resources.

```javascript
// Best Practice: Fully protected autocomplete with cleanup
let searchController = null;

function searchInputBest(query) {
  // 1. Abort any active request before starting a new one
  if (searchController) {
    searchController.abort();
  }

  searchController = new AbortController();

  fetch(`/api/search?q=${query}`, { signal: searchController.signal })
    .then(res => res.json())
    .then(data => {
      renderSearchList(data);
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log(`Cancelled search for: "${query}"`);
      } else {
        console.error("Search failed:", error.message);
      }
    });
}
```

---

## 8. Dry Run

Let's dry run the garbage collection leak check on an interval:

```javascript
1: function startLeak() {
2:   const bigData = new Array(1000000).fill("data");
3:   const intervalId = setInterval(() => {
4:     console.log("Checking data status:", bigData.length);
5:   }, 1000);
6:   return intervalId;
7: }
8: const activeTimer = startLeak();
```

### Step-by-Step State
- **Line 8**: `startLeak()` runs.
- **Line 2**: Allocates a large array `bigData` (consumes ~8MB of Heap RAM).
- **Line 3**: Registers `setInterval`. The anonymous callback function references `bigData`.
- **Line 6**: Returns the timer ID. `startLeak` pops off the Call Stack.
- **V8 Garbage Collection Tick**:
  - The engine tries to clear memory.
  - V8 checks the Heap: `bigData` is no longer reachable from the Global scope directly.
  - However, the active interval timer holds a reference to the callback, and the callback scope chain holds a reference to `bigData`.
  - Since the interval is active, V8 cannot garbage collect `bigData`.
  - To prevent a memory leak, you must call `clearInterval(activeTimer)`.

---

## 9. Common Mistakes

- **Mistake 1: Leaving event listeners attached to deleted DOM nodes.**
    If you remove a button from the DOM but forget to call `removeEventListener`, the listener function context remains in the Heap, leaking memory.
- **Mistake 2: Missing global unhandled rejection hooks.**
    Failing to capture unhandled promise rejections can cause production servers to crash unexpectedly.

---

## 10. Debugging

### Tracing Memory Leaks in Chrome DevTools
To detect memory leaks in your application:
1. Open Chrome DevTools.
2. Navigate to the **Memory** tab.
3. Select **Heap snapshot** and click **Take snapshot**.
4. Perform the action you suspect leaks memory (e.g. opening and closing a search widget multiple times).
5. Click the trash can icon (Collect Garbage) to clear temporary variables.
6. Take a second Heap snapshot.
7. Select the **Comparison** view:
    - Compare Snapshot 2 against Snapshot 1.
    - Sort by **Delta** size.
    - If you see objects like `HTMLButtonElement` or array arrays growing consistently, expand them to inspect the **Retainers** tree. This will point directly to the unresolved callback keeping them in memory.

---

## 11. Real World Usage

- **Global Rejection Tracking**: Catching silent API errors globally:
  ```javascript
  // Browser global hook
  window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled rejection caught:", event.reason);
    event.preventDefault(); // Prevent default console crash logs
  });
  ```
- **React Component Unmounts**: Inside `useEffect` hooks, always return cleanup functions to clear timeouts and abort active fetch requests when components unmount.

---

## 12. Interview Preparation

### Question: What is a Race Condition in asynchronous programming, and how do you prevent it?
- **Wrong Answer**: It means the loop runs too fast for the thread to handle.
- **Good Answer**: A race condition occurs when the correctness of a program depends on the relative timing or order of asynchronous events (like network responses). For example, if a user searches for `"a"` then `"ab"`, and the search request for `"a"` takes longer than `"ab"`, it can resolve last and overwrite the newer search results.
    To prevent this, you can:
  - Track request sequence IDs and ignore responses that do not match the latest ID.
  - Use `AbortController` to cancel previous fetch requests before launching new ones.

---

## 13. Practice

### Exercises
1. **Easy**: Write a function that triggers a memory leak by running a `setInterval` that appends strings to an array infinitely.
2. **Medium**: Write a script that uses `window.onunhandledrejection` to catch and log errors from a promise that rejects without a `.catch()` block.
3. **Hard**: Implement a wrapper function `debounce(fn, delay)` that delay-throttles input fetches to prevent race conditions during rapid typing.

---

## 14. Mini Assignment

Write a script that creates a new event listener on window clicks. Write a cleanup function that removes the listener, and verify that the handler is inactive after cleanup.

---

## 15. Mini Project

Create a memory-safe event listener manager `SafeEventManager` that tracks registered async listeners and provides a single method to clean them up, preventing heap memory leaks.

```javascript
// memory-safe-events.js
class SafeEventManager {
  constructor() {
    this.listeners = [];
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
    console.log(`Registered listener for: "${event}"`);
  }

  cleanup() {
    console.log(`Cleaning up ${this.listeners.length} event listeners...`);
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    console.log("Memory cleanup finished successfully.");
  }
}

// Test case using a mock DOM button
const mockButton = {
  addEventListener: (name, cb) => console.log(`Attaching: ${name}`),
  removeEventListener: (name, cb) => console.log(`Detaching: ${name}`)
};

const manager = new SafeEventManager();
manager.addListener(mockButton, 'click', () => console.log("Clicked!"));
manager.cleanup(); // Clean up registered listeners to prevent leaks
```

---

## 16. Chapter Summary

- **Race Conditions** occur when out-of-order async resolutions corrupt state.
- Prevent race conditions using **Request IDs** or **`AbortController`** signals.
- **Memory Leaks** are caused by dangling timers, event listeners, and closures.
- Verify memory leaks by comparing **Heap Snapshots** in Chrome DevTools.

---

## 17. Quiz

1. What global event in browsers is triggered by an unhandled promise rejection?
2. Why does a dangling interval leak memory in the Heap?
3. What tab in Chrome DevTools helps you analyze long tasks and Event Loop blocks?

---

## 18. Next Chapter Preview

We have completed **Module 05: Asynchronous JavaScript**! You have mastered callbacks, Event Loop queues, Promises, combinators, Async/Await internals, Fetch API patterns, and async debugging. In the next module, **Module 06: Browser**, we will explore how JavaScript interacts with browser structures, beginning with the DOM (Document Object Model).

---

## 19. Completion Checklist

- [ ] I can explain how race conditions occur and how to prevent them.
- [ ] I understand how unhandled promise rejections can be caught globally.
- [ ] I know how to use Chrome DevTools Heap Snapshots to inspect memory leaks.
- [ ] I understand how to write cleanups for timers and listeners.
