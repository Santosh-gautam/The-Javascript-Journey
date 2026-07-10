# Bug Detective Challenges

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Completion of Chapters 09-01 to 09-09
- **Version Tag**: `v1.0`

---

## 1. Introduction

Welcome, Detective!

It is time to apply your debugging mindset, stack trace reading, DevTools workflows, and V8 memory profiles to solve three real-world buggy code challenges.

For each challenge, you are provided with:
- The buggy script.
- The symptom report.
- The step-by-step diagnostic process.
- The corrected solution.

---

## 2. Challenge 1: The Broken Async Retry Loop

### Buggy Code
An API fetch client is supposed to retry a failing network request 3 times with a delay, but it crashes on execution.

```javascript
// buggy-retry-client.js
const fetchWithRetry = (url, retries = 3, delayMs = 1000) => {
  return new Promise((resolve, reject) => {
    const attempt = (attemptNumber) => {
      fetch(url)
        .then(resolve)
        .catch((error) => {
          if (attemptNumber >= retries) {
            reject(error);
          } else {
            console.log(`Attempt ${attemptNumber} failed. Retrying...`);
            // BUG: Variable scoping / schedule error
            setTimeout(attempt(attemptNumber + 1), delayMs);
          }
        });
    };
    attempt(1);
  });
};
```

### Symptom Report
When `fetchWithRetry` runs, it throws an error immediately on the first failure:
`TypeError: "callback" argument must be a function`
Furthermore, it does not wait for the configured delay, failing instantly.

### Diagnostic Steps
1. **Analyze the Exception**: The error `TypeError: "callback" argument must be a function` points to `setTimeout`.
2. **Inspect the Code Line**: Look at `setTimeout(attempt(attemptNumber + 1), delayMs)`.
3. **Evaluate the Argument**: `attempt(attemptNumber + 1)` is called **immediately** inside the setTimeout parameters, executing the next recursion frame synchronously on the spot, rather than passing a function reference.
4. **Confirm the Result**: `attempt()` returns `undefined` (because it has no return value). So the code compiles to: `setTimeout(undefined, delayMs)`. V8 throws the callback type error.
5. **Refine**: We must wrap `attempt(attemptNumber + 1)` inside an anonymous callback function.

### Corrected Code

```javascript
// fixed-retry-client.js
const fetchWithRetry = (url, retries = 3, delayMs = 1000) => {
  return new Promise((resolve, reject) => {
    const attempt = (attemptNumber) => {
      fetch(url)
        .then(resolve)
        .catch((error) => {
          if (attemptNumber >= retries) {
            reject(error);
          } else {
            console.log(`Attempt ${attemptNumber} failed. Retrying...`);
            // FIX: Pass an anonymous function reference to delay execution
            setTimeout(() => attempt(attemptNumber + 1), delayMs);
          }
        });
    };
    attempt(1);
  });
};
```

---

## 3. Challenge 2: The Memory Leak Closure

### Buggy Code
A single-page application tab switcher leaks megabytes of memory as the user switches tabs, eventually freezing the browser tab.

```javascript
// buggy-tab-leak.js
let activeTabsRegistry = [];

class TabHandler {
  constructor(id) {
    this.id = id;
    this.data = new Array(1000000).fill(`Tab-Content-${id}`);
    this.init();
  }

  init() {
    // BUG: capturing this in a global event listener closure
    window.addEventListener("resize", () => {
      this.refreshLayout();
    });
  }

  refreshLayout() {
    console.log(`Layout refreshed for tab ${this.id}`);
  }
}

function mountTab(id) {
  const tab = new TabHandler(id);
  activeTabsRegistry.push(tab);
}

function unmountTab() {
  // Clear registry
  activeTabsRegistry = []; 
}
```

### Symptom Report
Even after calling `unmountTab()`, heap snapshots show that millions of string elements remain allocated in the heap. Searching for `TabHandler` in the snapshot returns a positive count.

### Diagnostic Steps
1. **Take Heap Snapshots**: Take Snapshot 1. Call `mountTab("A")`, then call `unmountTab()`. Take Snapshot 2.
2. **Compare**: The comparison view shows `TabHandler` delta is `+1`.
3. **Trace Retainers**: Select `TabHandler` and inspect the Retainers pane:
    - `this` inside the resize handler callback is pointing to `TabHandler`.
    - The callback is registered in `window`'s event listener array.
    - Since `window` is a GC Root, the callback (and thus `TabHandler` and its massive `this.data` array) remains pinned in memory.
4. **Conclusion**: Clear the event listener when unmounting.

### Corrected Code

```javascript
// fixed-tab-leak.js
let activeTabsRegistry = [];

class TabHandler {
  constructor(id) {
    this.id = id;
    this.data = new Array(1000000).fill(`Tab-Content-${id}`);
    this.resizeHandler = this.refreshLayout.bind(this);
    this.init();
  }

  init() {
    window.addEventListener("resize", this.resizeHandler);
  }

  refreshLayout() {
    console.log(`Layout refreshed for tab ${this.id}`);
  }

  destroy() {
    // FIX: Remove event listener reference from window Root
    window.removeEventListener("resize", this.resizeHandler);
    this.data = null;
  }
}

function mountTab(id) {
  const tab = new TabHandler(id);
  activeTabsRegistry.push(tab);
}

function unmountTab() {
  // Clean up all active instances before clearing registry
  activeTabsRegistry.forEach(tab => tab.destroy());
  activeTabsRegistry = []; 
}
```

---

## 4. Challenge 3: V8 Hidden Class De-optimization

### Buggy Code
A game coordinates updater runs slowly when processing 1,000,000 game particles.

```javascript
// buggy-v8-deopt.js
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function updatePositions(particles) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    // BUG: Dynamically adding z parameter triggers deopt
    if (i % 2 === 0) {
      p.z = i; 
    }
    p.x += 1;
  }
}
```

### Symptom Report
Profiling show execution times are double what is expected. Running Node with V8 optimization logs shows de-optimizations are occurring inside `updatePositions`.

### Diagnostic Steps
1. **Analyze Shapes**: Inside `updatePositions`, particles have property fields `x` and `y`.
2. **Observe Transitions**: For even indices (`i % 2 === 0`), the property `z` is dynamically appended to the particle object.
3. **V8 Action**: This transitions the object to a new hidden class (Shape `{x, y, z}`) while odd index particles keep Shape `{x, y}`.
4. **Loop Lookup deopt**: The loop compiler site is forced to handle two separate shapes (Polymorphic). V8 Inline Caches miss repeatedly, slowing down property lookups.
5. **Fix**: Initialize `z` as `null` (or 0) in the constructor so all instances share the same hidden class shape from the start.

### Corrected Code

```javascript
// fixed-v8-deopt.js
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // FIX: Initialize all properties inside constructor to share hidden class map
    this.z = null; 
  }
}

function updatePositions(particles) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (i % 2 === 0) {
      p.z = i; 
    }
    p.x += 1;
  }
}
```

---

## 5. Summary Checklists

When debugging application failures:
- [ ] Write test assertions to verify assumptions.
- [ ] Trace stack frame details from top to bottom.
- [ ] Use conditional breakpoints to isolate loops.
- [ ] Capture heap comparisons to find memory leaks.
- [ ] Initialize object fields together to keep V8 compiled shapes fast.

Congratulations on completing the Debugging curriculum! You are now equipped to trace, profile, and fix complex production issues.
