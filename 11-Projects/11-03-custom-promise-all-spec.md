# Spec: Custom Promise.all

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of Promises, async loops, and array mapping
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a contractor building a house:

- **`Promise.all` is like ordering materials from three separate suppliers**:
    1. Supplier A delivers bricks (takes 2 days).
    2. Supplier B delivers cement (takes 5 days).
    3. Supplier C delivers lumber (takes 1 day).
    You cannot start building until **all** materials have arrived.
- **Fulfillment is receiving the complete inventory**: Once all three items are delivered, you have the complete materials array. You do not build with lumber on day 1; you wait until day 5 (when the slowest delivery, cement, arrives) and receive the items in their ordered layout.
- **Rejection is a supplier going bankrupt**: If Supplier B calls you on Day 2 and says: *"We are out of business"* (rejection), you immediately cancel the entire project. You do not wait for Supplier A to finish delivering bricks; you stop the project on the spot (short-circuit rejection).

In JavaScript, **`Promise.all`** coordinates these parallel asynchronous workflows.

---

## 2. Problem

In technical coding interviews, developers are often asked to implement native APIs from scratch.

If you try to implement `Promise.all` by:
- Using a simple `for` loop that awaits promises sequentially, they will execute one after another ($O(N)$ serial latency) instead of running in parallel.
- Returning results in the order they resolve (fastest first) rather than preserving the original input array order.
- Failing to handle non-promise values or empty inputs.

---

## 3. Solution

We write a custom **`promiseAll()`** utility:
1. **Parallel Execution**: Launching all promises concurrently.
2. **Order Preservation**: Storing resolved values at their original index locations.
3. **Completion Counter**: Tracking resolved counts, resolving the outer Promise only when the count matches the input length.
4. **Short-Circuit Rejection**: Immediately rejecting the outer Promise if any input promise rejects.

---

## 4. Definition

- **`Promise.all`**: A promise combinator that takes an iterable of promises and returns a single Promise that resolves when all input promises have resolved, or rejects as soon as one input promise rejects.
- **Short-Circuit Rejection**: An execution behavior where the first error rejection terminates the entire group operation immediately, ignoring subsequent resolutions.
- **Iterable**: An object that defines iteration behavior, such as an Array.

---

## 5. Visualization

### Promise.all Execution Lifecycle

```
   [ Input Array: [ P1, P2, P3 ] ]
          |
          +------------+------------+
          |            |            |
          v            v            v
     [ Run P1 ]   [ Run P2 ]   [ Run P3 ] (Parallel Execution)
          |            |            |
      Resolves     Resolves     Rejects!
      (200ms)      (100ms)      (50ms)
          |            |            |
          |            |            +-----------------------+
          |            |                                    |
          v            v                                    v
     (Collects)   (Collects)                       [ Reject Outer Promise ]
                                                   (Short-circuit at 50ms)
```

---

## 6. Internal Working

How our custom utility manages coordination:

1. **Closure Array Allocation**: Inside the returning Promise, we allocate a `results` array of the same length as the input.
2. **Index Pinning**: As each promise runs, we capture its loop index using a local scope variable (closure). When a promise resolves, we write its value to `results[index]`, ensuring the original order is preserved regardless of which promise finished first.
3. **Ref Counting**: We maintain a `completedCount` variable. We increment this counter on each resolution. If `completedCount === input.length`, we call the outer `resolve(results)` callback.

---

## 7. Code Examples

### Bad Practice: Sequential Await Loop
Using a `for...of` loop with `await` runs promises sequentially, causing high latency.

```javascript
// Bad: Runs promises sequentially!
async function badPromiseAll(promises) {
  const results = [];
  for (const p of promises) {
    // Blocks loop execution, waiting for p to finish before starting the next!
    results.push(await p); 
  }
  return results;
}
```

### Good Practice: Parallel Execution with Index Mapping
Map promises to index slots to run them concurrently while preserving output order.

```javascript
// Good: Basic Promise.all clone
function customPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("Arguments must be an array"));
    }

    const results = [];
    let completedCount = 0;
    const total = promises.length;

    if (total === 0) {
      resolve([]);
      return;
    }

    promises.forEach((promise, index) => {
      // Coerce non-promise values to resolved promises
      Promise.resolve(promise)
        .then((value) => {
          results[index] = value; // Pin to original index!
          completedCount++;

          if (completedCount === total) {
            resolve(results);
          }
        })
        .catch(reject); // Short-circuit rejection
    });
  });
}
```

### Best Practice: The Robust Combinator
Handle edge cases like non-promise primitives, empty arrays, and prototype objects safely.

```javascript
// Best Practice: Production-ready Promise.all polyfill
const promiseAll = (iterable) => {
  return new Promise((resolve, reject) => {
    // 1. Validate iterable type
    if (iterable === null || typeof iterable[Symbol.iterator] !== "function") {
      throw new TypeError("Object is not iterable");
    }

    const promises = Array.from(iterable); // Convert to actual array
    const results = new Array(promises.length);
    let completed = 0;
    const total = promises.length;

    if (total === 0) {
      return resolve([]);
    }

    for (let i = 0; i < total; i++) {
      // 2. Wrap in Promise.resolve to handle primitive numbers/strings
      Promise.resolve(promises[i])
        .then((val) => {
          results[i] = val; // Store at index i
          completed++;

          // 3. Resolve outer promise only when all are finished
          if (completed === total) {
            resolve(results);
          }
        })
        // 4. Any rejection triggers immediate outer rejection
        .catch((err) => {
          reject(err);
        });
    }
  });
};
```

---

## 8. Dry Run

Let's dry run `promiseAll([delay(10, "A"), delay(50, "B")])`:

- **Initialization**:
  - `promises` = `[P1, P2]`. `total` = `2`.
  - `results` = `[empty, empty]`. `completed` = `0`.
- **Execution Loop**:
  - **i = 0**: Starts P1 (10ms delay).
  - **i = 1**: Starts P2 (50ms delay).
- **Time 10ms (P1 Resolves)**:
  - P1 resolves with `"A"`.
  - Saves: `results[0] = "A"`.
  - Increments `completed` to `1`.
  - Is `completed === total` (`1 === 2`)? No. Keep waiting.
- **Time 50ms (P2 Resolves)**:
  - P2 resolves with `"B"`.
  - Saves: `results[1] = "B"`.
  - Increments `completed` to `2`.
  - Is `completed === total` (`2 === 2`)? Yes!
  - Resolves outer promise with `["A", "B"]`.

---

## 9. Common Mistakes

- **Mistake 1: Resolving by checking `results.length`.**
    If the last promise in the array resolves first (e.g. index 2), setting `results[2] = val` causes the array length to become `3` immediately, even though indices 0 and 1 are still empty. Use a dedicated `completedCount` counter instead.
- **Mistake 2: Not converting inputs using `Promise.resolve()`.**
    If the input array contains a primitive value like `42`, calling `.then()` on it directly will throw an error. Wrap all inputs in `Promise.resolve(item)`.

---

## 10. Debugging

### Tracing Race Rejections
If your custom Promise utility is swallowing rejections:
1. Add logs inside the catch block:
    ```javascript
    .catch((err) => {
      console.log("[Combinator Rejection] Triggered by error:", err.message);
      reject(err);
    });
    ```
2. Run the code with a mixture of resolving and rejecting promises.
3. Confirm that the catch block triggers immediately on the first rejection, and that subsequent resolutions do not call resolve again.

---

## 11. Real World Usage

- **Aggregated API Fetching**: Dashboards load charts, user info, and logs in parallel, display a loading spinner, and render the page once all fetch requests resolve.
- **Asset Preloaders**: HTML5 games download audio files, sprite textures, and configuration JSONs in parallel, starting the game only when all assets are ready.

---

## 12. Interview Preparation

### Question: Write a custom implementation of `Promise.all` from scratch
- **Wrong Answer**: Writing sequential await loops or sorting results by execution time.
- **Good Answer**: I will implement it using the following steps:
    1. Return a new Promise wrapper.
    2. Validate if the input is iterable; if empty, resolve immediately with an empty array.
    3. Iterate through the inputs, wrapping each in `Promise.resolve()` to support primitive values.
    4. Store resolved values in a results array at their original index positions to preserve ordering.
    5. Track completion count using a counter variable, calling the outer `resolve` when the counter matches the input length.
    6. Attach a `.catch(reject)` to each promise to ensure the first rejection short-circuits the operation.

---

## 13. Practice

### Exercises
1. **Easy**: Write a test script that validates your `promiseAll` implementation using an array of 3 resolving promises.
2. **Medium**: Write a test script that verifies that `promiseAll` rejects immediately when one promise rejects, even if other promises are still pending.
3. **Hard**: Implement a custom `Promise.allSettled` polyfill that returns an array of status objects: `{ status: "fulfilled", value }` or `{ status: "rejected", reason }` for all input promises.

---

## 14. Mini Assignment

Write a function `fetchConfigAndRoles()` that fetches two endpoints in parallel using your custom `promiseAll` helper, returning a unified object.

---

## 15. Mini Project

Create a benchmarking suite `PromiseBenchmark` that runs three delayed timers in parallel, compares the performance of your custom `promiseAll` implementation against native `Promise.all`, and prints the execution timing comparisons.

```javascript
// promise-all-benchmark.js
const delay = (ms, value, fail = false) => {
  return new Promise((res, rej) => {
    setTimeout(() => fail ? rej(new Error(value)) : res(value), ms);
  });
};

// Paste your custom promiseAll utility here
const promiseAll = (promises) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    if (promises.length === 0) return resolve([]);
    
    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(val => {
          results[i] = val;
          completed++;
          if (completed === promises.length) resolve(results);
        })
        .catch(reject);
    });
  });
};

// Benchmark Run
const taskList = [
  delay(100, "Bricks"),
  delay(300, "Cement"),
  delay(50, "Lumber")
];

console.time("Custom Promise.all");
promiseAll(taskList)
  .then(data => {
    console.log("Resolved Materials:", data);
    console.timeEnd("Custom Promise.all"); // Should take approx 300ms (slowest task)
  })
  .catch(err => console.error("Failed:", err.message));
```

---

## 16. Chapter Summary

- **`Promise.all`** runs asynchronous tasks in parallel.
- Preserve output order by pinning resolved values to their **original index positions**.
- Use a **completed counter** to track when all promises are resolved.
- The first rejection **short-circuits** the operation, rejecting the outer promise immediately.

---

## 17. Quiz

1. What happens if you pass an empty array to `Promise.all`?
2. Why does using `results.push(value)` inside resolution callbacks break output ordering?
3. How do you support primitive values (non-promises) inside your custom combinator?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Spec - Event Emitter**. We will explore callback mappings, custom events, and implementing subscribe, publish, and once methods.

---

## 19. Completion Checklist

- [ ] I can write a custom `Promise.all` polyfill from scratch.
- [ ] I understand how to preserve array order during parallel execution.
- [ ] I understand the mechanics of short-circuit rejections.
- [ ] I can trace promise execution states in the variables pane.
