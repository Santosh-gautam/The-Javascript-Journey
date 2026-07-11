# Memory Leaks

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of closures, garbage collection, and browser DevTools
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are renting a storage warehouse:

- **Memory Allocation is like renting a storage locker**: You put boxes inside (allocate heap space).
- **Garbage Collection is like a warehouse inspector checking lockers**: The inspector starts at the main office (the Root). If a locker is connected to the office by a lease contract (reachable reference), it is kept. If a locker has no active lease and is locked with no owner, the inspector clears the locker (sweeps the memory).
- **An Accidental Global Variable is like leaving items in the hallway**: You put a box in the common hallway instead of a locker. Since the hallway belongs to the main office (global scope), the inspector can never throw it away, even if you leave the warehouse.
- **A Forgotten Timer is like setting up a mechanical toy that never stops**: You leave a toy trains looping in a locker. Because the train is running (active interval), the locker cannot be cleared.
- **An Out-of-DOM Reference is like taking down a shelf but keeping it in your truck**: You dismantle a shelf from the warehouse wall (DOM node removed), but you keep the shelf bolted to your truck bed (JavaScript array reference). The shelf continues to occupy space.

In JavaScript, these are **Memory Leaks**.

---

## 2. Problem

JavaScript uses automatic memory management (garbage collection), leading to a common misconception that developers don't need to worry about memory.

However, if your code maintains references to objects that are no longer needed:
- Memory consumption rises continuously (memory leak).
- The garbage collector runs more frequently, causing CPU spikes and interface stuttering.
- The browser or node process eventually crashes with an `Out of Memory` exception.

---

## 3. Solution

We manage the application memory lifecycle by:
1. **Understanding GC Reachability**: Ensuring unused variables are disconnected from the root node.
2. **Defensive Resource Cleanup**: Clearing timers, detaching event listeners, and emptying cache structures.
3. **Heap Inspection**: Using Chrome DevTools Memory Profiler to identify and eliminate memory leaks.

---

## 4. Definition

- **Memory Lifecycle**: The sequence of allocating memory, using it (reading/writing), and releasing it when it is no longer needed.
- **Garbage Collector (GC)**: An automatic engine service that reclaims memory allocated to objects that are no longer reachable from the root.
- **Mark-and-Sweep**: The standard algorithm used by modern engines to identify reachable objects by traversing the reference graph from global roots.

---

## 5. Visualization

### Mark-and-Sweep Reachability Graph

```
           [ GLOBAL ROOT ]
            /           \
           v             v
      [ Object A ]   [ Object B ]
          |
          v
      [ Object C ]   [ Object D ] (Dangling / No parent link)
```

1. **Mark Phase**: The GC starts at the `GLOBAL ROOT`. It traverses links, marking `Object A`, `Object B`, and `Object C` as reachable.
2. **Sweep Phase**: Since `Object D` has no link connecting it to the root, the GC identifies it as unreachable, reclaims its Heap space, and clears it.

---

## 6. Internal Working

V8 manages garbage collection using a two-generation model:

1. **Generational GC (Scavenger)**:
    - **Young Generation**: Stores newly allocated short-lived objects (like local variables). It is small and collected frequently using a fast copy algorithm.
    - **Old Generation**: Stores objects that survive multiple young-generation collections. It is large and collected using the heavier Mark-Sweep-Compact algorithm.
2. **Retainer Linkage**: A memory leak occurs when an old-generation object retains a reference to a young-generation object, preventing it from being collected.
3. **Root Pinning**: Active execution stack contexts, global variables (`window`), DOM nodes mounted on the active tree, and active timer records act as roots. Any object connected to them is pinned in memory.

---

## 7. Code Examples

### 1. Accidental Global Variables Leak
Forgetting to declare a variable with `var`, `let`, or `const` binds it to the global `window` object, preventing garbage collection.

```javascript
// Bad: Accidental global leak
function processUser() {
  // Missing variable declaration creates window.userData!
  userData = new Array(1000000).fill("leak"); 
}
processUser();
// userData remains in memory even after the function finishes!
```

### 2. Forgotten Timers Leak
Leaving an interval active keeps all variables referenced inside its closure locked in memory.

```javascript
// Bad: Active interval leaks userState
function trackUser() {
  const userState = { id: 101, logs: new Array(500000) };
  
  setInterval(() => {
    // This runs forever, retaining userState in memory!
    console.log("User active:", userState.id);
  }, 1000);
}
trackUser();
```

### 3. Out-of-DOM References Leak
Storing reference pointers to DOM elements in JavaScript after they are removed from the webpage prevents the browser from freeing the DOM memory.

```javascript
// Bad: Detached DOM node leak
const elementCache = {
  button: document.getElementById("delete-btn")
};

function removeButton() {
  elementCache.button.remove(); // Removed from visual DOM
  // BUG: elementCache.button still holds the element reference!
  // The button element is now a "Detached HTMLButtonElement" in Heap.
}
```

### Best Practice: Defensive Cleanup Design
Always clear timers, nullify variables, and detach event listeners during resource lifecycles.

```javascript
// Best Practice: Clean, leak-free timer tracking
class UserTracker {
  constructor() {
    this.userState = { id: 101, logs: new Array(500000) };
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      console.log("Tracking:", this.userState.id);
    }, 1000);
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId); // Clear timer
      this.intervalId = null;
    }
    this.userState = null; // Free memory
    console.log("Tracker resources cleaned up.");
  }
}
```

---

## 8. Dry Run

Let's dry run the garbage collection process of a detached node:

```javascript
let cache = { node: document.createElement("div") };
cache.node.id = "temp-node";

// Step 1
cache = null;
```

### Step-by-Step State
- **Initial state**:
  - The object `{ node: HTMLDivElement }` is allocated in the Heap.
  - The variable `cache` points to this object (Strong Reference).
  - The `HTMLDivElement` has no link to the visual document body.
- **Step 1 (`cache = null`)**:
  - The strong reference from `cache` to the object is cut.
  - V8's GC runs:
    - Starts at the Global Root.
    - Cannot reach the object or the `HTMLDivElement` because there are no pointers referencing them.
    - Reclaims memory occupied by both the object and the DOM node.
    - Heap memory usage drops.

---

## 9. Common Mistakes

- **Mistake 1: Relying on closures without clearing event listeners.**
    Attaching callbacks that capture large local variables to global events (like `window.resize`) leaks the variables until the listener is detached.
- **Mistake 2: Storing values in global caches indefinitely.**
    Creating cache structures using standard objects or Maps without implementing size limits (like LRU caching) will cause memory usage to grow continuously.

---

## 10. Debugging

### Finding Detached DOM Elements in DevTools
To identify detached DOM elements that are causing memory leaks:
1. Open Chrome DevTools.
2. Navigate to the **Memory** tab.
3. Select **Heap snapshot** and click **Take snapshot**.
4. Type `"detached"` in the **Class filter** input box:
    - If you see classes like `Detached HTMLDivElement` or `Detached HTMLButtonElement`, you have a memory leak.
    - Expand the elements and look at the **Retainers** pane below.
    - This pane shows the chain of references keeping the elements in memory. Trace the chain to locate the array or object in your script that still holds a reference to the element.

---

## 11. Real World Usage

- **SPA Routing Engines**: Single-page application frameworks (like React, Angular, or Vue) clean up event listeners and cancel pending timer callbacks when you navigate between pages to prevent memory leaks.
- **Node.js Server Audits**: APIs run memory profiling audits using tools like clinic.js to verify that memory usage remains stable under heavy traffic loads.

---

## 12. Interview Preparation

### Question: What is a detached DOM node, and how does it cause memory leaks?
- **Wrong Answer**: It is a node that has been hidden using CSS `display: none`.
- **Good Answer**: A detached DOM node is a DOM element that has been removed from the visible document tree (using `element.remove()`), but is still referenced by a variable in JavaScript. Because JavaScript holds a strong reference to it, the browser's garbage collector cannot reclaim its memory. This keeps the element (and all its child nodes) in memory, causing a leak. To prevent this, you must set the variable referencing the node to `null` after removing the element from the DOM.

---

## 13. Practice

### Exercises
1. **Easy**: Write a function that creates an accidental global variable containing a large array.
2. **Medium**: Write a script that simulates a memory leak using a detached `ul` element containing 10 `li` items.
3. **Hard**: Write a script that checks memory usage before and after running a leak-prone function, using Node's `process.memoryUsage()` API.

---

## 14. Mini Assignment

Write a function `runTimer()` that runs an interval 5 times, then automatically clears the interval and releases all referenced variables to prevent memory leaks.

---

## 15. Mini Project

Create a memory-safe tab component manager `TabController` that dynamically mounts panels, binds click events, and detaches all event listeners and DOM references when tabs are closed.

```javascript
// memory-safe-tab-manager.js
class TabController {
  constructor(buttonId, panelId) {
    this.button = document.getElementById(buttonId);
    this.panel = document.getElementById(panelId);
    this.clickHandler = this.handleClick.bind(this);
    this.init();
  }

  init() {
    if (this.button) {
      this.button.addEventListener("click", this.clickHandler);
    }
  }

  handleClick() {
    if (this.panel) {
      this.panel.classList.toggle("open");
      console.log("Tab toggled.");
    }
  }

  destroy() {
    // 1. Detach event listeners using the saved reference
    if (this.button) {
      this.button.removeEventListener("click", this.clickHandler);
    }
    
    // 2. Remove references to DOM elements to allow GC
    this.button = null;
    this.panel = null;
    this.clickHandler = null;
    console.log("TabController destroyed and memory cleared safely.");
  }
}

// Test case using mock elements
const mockBtn = { addEventListener: () => {}, removeEventListener: () => {} };
const mockPanel = { classList: { toggle: () => {} } };

const tab = new TabController("mock-btn", "mock-panel");
tab.button = mockBtn;
tab.panel = mockPanel;
tab.destroy(); // Safely unbinds and clears memory references
```

---

## 16. Chapter Summary

- The **Memory Lifecycle** consists of Allocation, Use, and Release.
- The **Garbage Collector** uses the **Mark-and-Sweep** algorithm to reclaim unreachable memory.
- **Memory Leaks** are caused by accidental globals, forgotten timers, detached DOM nodes, and closures.
- Identify memory leaks by searching for **detached elements** in DevTools Heap snapshots.

---

## 17. Quiz

1. What are the two generation spaces managed by V8's Garbage Collector?
2. Does setting a variable to `null` trigger garbage collection immediately?
3. Why do anonymous callbacks inside `setInterval` prevent garbage collection of closure variables?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Bundle Size Optimization**. We will explore code bundling concepts, tree-shaking, minification, and learn how to reduce application loading weights.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Memory Leak tab hoti hai jab browser memory assign karta hai lekin reference variables code structure mein active rehne ke karan **Garbage Collector** unhe reuse or delete nahi kar pata. Har memory cycle 3 stages run karta hai: allocate, use, free. Web apps mein persistent leaks memory bloat, tabs freeze aur UI slow crash problems create karte hain. Common leak sources: global variables, forgotten event listeners/timers aur detached DOM nodes.

### Andar kya hota hai (Internal Working)

GC management algorithms V8 levels:
1. **Generational Heap Layout**: Memory divide in **Young Generation** (rapidly allocated short-lived variables) and **Old Generation** (long-surviving instances).
2. **Mark-and-Sweep**: GC sweeps root (window / execution context variables) and traces memory nodes pointers. Unreachable structures marked for deletes.
3. **Leaked references paths**: Agar detached DOM nodes script variables mein active referenced hain, ya local closures timers check active nested data, root to target path invalid block remains — memory stays occupied.

### Code Example samjho

`javascript
// Bad: Forgotten timer holding closure references
function startDataFeed() {
  const giantArray = new Array(1000000).fill("data");
  setInterval(() => {
    // Timer references giantArray!
    console.log("Feeds active. Size check: ", giantArray.length);
  }, 1000);
}
startDataFeed(); // giantArray is leaked forever, memory never released!
`

**Line by line:**
- giantArray = new Array(1000000) — heap memory allocation.
- setInterval(...) — browser level persistent timer registration. Callback closure maintains pointer references to parent function scope.
- Even if startDataFeed completes, timer callback checks keep giantArray reference root reachability path valid — GC marks object active. Un-cleared timers leak memory.

### Sabse badi galti log karte hain

DOM nodes cache Map mein store karna bina clean steps register kiye. element.remove() run karne se DOM tree structure remove hota hai, lekin custom global arrays / Map pointers node save state release blocker. WeakMap keys use ensure node delete gc auto execution sweeps.

### Yaad rakhne ki cheez

**Un-register listeners, clear timers at cleanup phases, and prevent accidental global variables registration.** Memory debugging runs DevTools Heap Snapshots use trace retention chains.

## 20. Completion Checklist

- [ ] I can describe how the Mark-and-Sweep algorithm works.
- [ ] I understand the 4 common memory leak types in JavaScript.
- [ ] I know how to check for detached DOM elements in DevTools.
- [ ] I understand the importance of clearing timers and detaching event listeners.
