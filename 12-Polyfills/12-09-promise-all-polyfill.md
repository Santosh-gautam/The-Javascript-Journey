# Polyfill for Promise.all

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Completion of Chapter 11-03 (Promise.all spec), understanding of static methods and prototype hooks
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a coordinator running a relay team at a track meet:

- **Native `Promise.all` is like a race where the team wins only if all members finish**:
    1. Runner 1 starts (parallel execution).
    2. Runner 2 starts.
    3. Runner 3 starts.
    You do not declare the race finished until **every** runner crosses the finish line (all resolved). You record their final times in the exact order they lined up at the start (order preservation).
- **The disqualification**: If Runner 2 falls and gets injured (rejection), you cancel the team's race immediately. You do not wait for Runner 1 or 3 to finish crossing the line; you stop the clock and record a failure on the spot (short-circuit rejection).

In JavaScript, **`Promise.all`** provides this parallel execution coordination.

---

## 2. Problem

Older browser runtimes do not support the static `Promise.all` method.

If your application triggers multiple asynchronous requests in parallel (such as loading page settings and user roles simultaneously):
- The browser crashes with `TypeError: Promise.all is not a function`.
- Sequential loading slows down page load times.

---

## 3. Solution

We write an **`Promise.all` Polyfill**.

By checking if the method is missing and attaching our custom implementation to `Promise.all`, we replicate the standard parallel coordinator behavior: validating iterable inputs, wrapping primitives, maintaining output index ordering, and enabling short-circuit rejections.

---

## 4. Definition

- **`Promise.all`**: A static method of the Promise constructor that resolves when all input promises resolve, or rejects immediately when any input promise rejects.
- **Polyfill Integration**: Binding the custom method to `Promise.all` conditionally, only if the native browser implementation is missing.

---

## 5. Visualization

### Parallel Promise Execution Flow

```
   Input array: [ Promise A,  Promise B,  Promise C ]
                      │          │          │
                      v          v          v
   Parallel execution:  Run(A)     Run(B)     Run(C)
                      (100ms)    (300ms)     (50ms)
                      │          │          │
                      +----------+----------+
                                 |
                        (Wait for slowest: B)
                                 |
                                 v
   Outer Resolution:  [ Value A, Value B, Value C ] (At 300ms)
```

---

## 6. Internal Working

How the polyfill integrates with the global Promise object:

1. **Conditional Check**: The polyfill guards itself: `if (!Promise.all)`. This ensures we do not overwrite the browser's fast, optimized C++ native implementation on modern browsers.
2. **Iterable Conversion**: The input argument must be iterable. The polyfill checks if the input is not null and has `[Symbol.iterator]` property. It then uses `Array.from(iterable)` to convert it to a standard array, allowing us to safely read length and run loops.

---

## 7. Code Examples

### The Promise.all Polyfill Hook
Write a conditional block that attaches the parallel coordination logic to the global `Promise` class.

```javascript
// promise-all-polyfill.js
if (!Promise.all) {
  Promise.all = function(iterable) {
    return new Promise((resolve, reject) => {
      // 1. Validate if input is an iterable
      if (iterable === null || typeof iterable[Symbol.iterator] !== "function") {
        return reject(new TypeError("Object is not iterable"));
      }

      // 2. Convert iterable to standard array
      const promises = Array.from(iterable);
      const results = [];
      let completedCount = 0;
      const total = promises.length;

      // 3. Resolve immediately for empty inputs
      if (total === 0) {
        resolve([]);
        return;
      }

      // 4. Loop and run all promises in parallel
      for (let i = 0; i < total; i++) {
        // Coerce primitives to resolved promises
        Promise.resolve(promises[i])
          .then((val) => {
            results[i] = val; // Pin to original index slot
            completedCount++;

            // Resolve outer promise once all are completed
            if (completedCount === total) {
              resolve(results);
            }
          })
          .catch((error) => {
            // Short-circuit rejection
            reject(error);
          });
      }
    });
  };
}
```

### Best Practice: Error Recovery inside Parallel Pipelines
In production, if you want individual promise failures to not break the entire list, map rejections to fallback values before passing them to `Promise.all`.

```javascript
// Best Practice: Safe parallel query
const fetchSafe = (promise, fallbackValue = null) => {
  return Promise.resolve(promise).catch(() => fallbackValue);
};

const tasks = [
  fetchData("api/users"), // Resolves
  fetchData("api/buggy-endpoint"), // Rejects!
  fetchData("api/config")  // Resolves
];

// Wrap tasks in fetchSafe to prevent Promise.all from short-circuiting!
Promise.all(tasks.map(p => fetchSafe(p, { error: true })))
  .then(results => {
    console.log("Results compiled safely:", results);
    // Output: [ { usersData }, { error: true }, { configData } ]
  });

function fetchData(route) {
  return new Promise((res, rej) => {
    setTimeout(() => route.includes("buggy") ? rej(new Error("Timeout")) : res({ route }), 50);
  });
}
```

---

## 8. Dry Run

Let's dry run the polyfill checking for non-iterable inputs:

```javascript
Promise.all(12345).catch(err => console.log(err.message)); // Line 1
```

### Step-by-Step State
- **Line 1 (`Promise.all(12345)`)**:
  - `iterable` is `12345` (primitive number).
  - Polyfill checks: is `typeof 12345[Symbol.iterator]` a function? No (it is `undefined`).
  - Enters `if` block.
  - Calls `reject(new TypeError("Object is not iterable"))`.
  - The returned Promise rejects immediately.
  - Console logs `"Object is not iterable"`.

---

## 9. Common Mistakes

- **Mistake 1: Not checking if the input is iterable.**
    If you pass a plain object `{}` to a polyfill that assumes the input is always an array, it will crash with a `TypeError: Cannot read properties of undefined` inside the loop, violating the spec.
- **Mistake 2: Overwriting the native `Promise.all` on modern browsers.**
    Always wrap your polyfill inside a conditional check: `if (!Promise.all)`. Native implementations are written in optimized C++ and are significantly faster.

---

## 10. Debugging

### Tracing Rejections in Chrome Sources Pane
If your parallel promises are failing to resolve:
1. Open the **Sources** tab.
2. Set a breakpoint inside the `.catch(error => reject(error))` line of your polyfill.
3. Trigger the execution.
4. If the breakpoint hits, check the `error` object inside the **Scope** pane to identify which specific promise in the array rejected.

---

## 11. Real World Usage

- **Aggregated API Fetching**: Dashboards load charts, user info, and logs in parallel, display a loading spinner, and render the page once all fetch requests resolve.
- **Asset Preloaders**: HTML5 games download audio files, sprite textures, and configuration JSONs in parallel, starting the game only when all assets are ready.

---

## 12. Interview Preparation

### Question: What is the behavior of `Promise.all` if an empty array is passed?
- **Wrong Answer**: It remains pending forever.
- **Good Answer**: If an empty array (or empty iterable) is passed, `Promise.all` resolves **immediately and synchronously** with an empty array `[]`.

---

## 13. Practice

### Exercises
1. **Easy**: Write a test script that validates your `Promise.all` polyfill resolves an array of three static strings correctly.
2. **Medium**: Write a test script that validates your `Promise.all` polyfill rejects immediately when one promise fails, even if other promises take longer to resolve.
3. **Hard**: Write a polyfill for the newer `Promise.any` method, which resolves as soon as *any* input promise resolves, or rejects with an `AggregateError` if all promises reject.

---

## 14. Mini Assignment

Write a prototype helper check that logs the index of the slowest resolving promise inside your `Promise.all` polyfill.

---

## 15. Mini Project

Create a benchmark suite `ParallelBenchmark` that compares your custom `Promise.all` polyfill implementation speed against native sequential loops, displaying execution times in a console table.

```javascript
// promise-all-polyfill-benchmark.js
// Paste your Promise.all polyfill code here

const delayTask = (ms, val) => new Promise(res => setTimeout(() => res(val), ms));

const runBenchmark = async () => {
  const tasks = [
    delayTask(100, "User info"),
    delayTask(200, "Theme settings"),
    delayTask(50, "Roles")
  ];

  console.time("Parallel Execution");
  const data = await Promise.all(tasks);
  console.log("Resolved:", data);
  console.timeEnd("Parallel Execution"); // Should resolve in approx 200ms
};

runBenchmark();
```

---

## 16. Chapter Summary

- Only load polyfills conditionally (**`if (!Promise.all)`**).
- Verify the input is **iterable**; throw a `TypeError` if not.
- Convert inputs to standard arrays using **`Array.from()`**.
- **Short-circuit rejections** immediately terminate the operation.

---

## 17. Quiz

1. How do you check if an object is iterable in JavaScript?
2. What value is returned by `Promise.all([])`?
3. Why does `Promise.resolve(value)` help handle primitive values inside the loop?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for debounce**. We will explore debounce rate-limit closures, timer cancels, and event callback bindings.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Promise.all internals implement karna — order preserve karna aur short-circuit on rejection.
- **Concept**: Saare promises parallel start karo, results array mein position preserve karo, pehla rejection poora reject karta hai.
- **Key Pattern**: promises.forEach((p, i) => Promise.resolve(p).then(v => { results[i] = v; if(++count === n) resolve(results); }, reject)).
- **Common Mistake**: Results push karna instead of index assignment — async mein order guarantee nahi; index use karo.
## 19. Completion Checklist

- [ ] I can write a spec-compliant `Promise.all` polyfill.
- [ ] I understand how to validate iterable inputs.
- [ ] I understand the mechanics of short-circuit rejections.
- [ ] I know how to check V8 call stacks during promise rejections.
