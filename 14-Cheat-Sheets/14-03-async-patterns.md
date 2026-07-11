# Async Patterns

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of Promises, async/await, and Event Loops
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are ordering food from a food delivery application:

- **A Promise is the transaction ticket**:
  - **`Pending`**: The kitchen is preparing your order.
  - **`Fulfilled`**: The driver delivers the hot meal to your door.
  - **`Rejected`**: The kitchen ran out of ingredients, and your order was cancelled.
- **Promise Combinators are ordering strategies for different group scenarios**:
  - **`Promise.all` (The Family dinner)**: You order 3 items. If even 1 item is cancelled, you cancel the entire order (all must succeed).
  - **`Promise.allSettled` (The Team lunch)**: You order 3 items. You want to see the status of all three orders, regardless of which ones succeeded or failed.
  - **`Promise.race` (The Fast food delivery race)**: You order the same sandwich from 2 different delivery apps. Whichever driver arrives first gets accepted, and the slower driver is ignored.
  - **`Promise.any` (The Cab booking race)**: You call 3 different cab companies. As soon as the first cab accepts (succeeds), you cancel the other requests. You only fail if all 3 cab companies reject you.

In JavaScript, **Async Patterns** coordinate these workflows.

---

## 2. Problem

Developers often use incorrect Promise combinators (such as using `Promise.all` when they want to log partial successes) or write slow asynchronous code (like using sequential `await` calls instead of parallel execution).

---

## 3. Solution

This chapter serves as a **Quick-Reference Cheat Sheet** summarizing Promise states, async/await guidelines, Promise combinator behavior, and generator-based async/await internals.

---

## 4. Definition

- **Promise Combinator**: A static helper method of the Promise constructor used to coordinate multiple promises running in parallel.
- **Short-Circuit Rejection**: An execution behavior where the first error rejection terminates the entire combinator operation immediately.

---

## 5. Visualization

### Promise Combinators Resolution Behavior

```
   Input Promises: [ P1 (100ms), P2 (200ms, rejects!), P3 (50ms) ]
  
   1. Promise.all(inputs)
      Rejects at 200ms with P2's error (short-circuit).
  
   2. Promise.allSettled(inputs)
      Resolves at 200ms with:
      [ {status: "fulfilled", value: V1}, {status: "rejected", reason: E2}, {status: "fulfilled", value: V3} ]
  
   3. Promise.race(inputs)
      Resolves at 50ms with P3's value (fastest).
  
   4. Promise.any(inputs)
      Resolves at 50ms with P3's value (first fulfilled).
```

---

## 6. Internal Working

How the browser runs async/await internally:

1. **Generator translation**: Async/await is syntactic sugar over **Generators** and **Promises**. When V8 compiles an `async` function, it translates it into a generator function wrapped in an execution runner:
    ```javascript
    // Async function:
    async function getVal() { return await fetch(); }
    
    // Translated compilation:
    function getVal() {
      return spawn(function*() {
        const res = yield fetch();
        return res;
      });
    }
    ```
2. **Spawning Runner**: The `spawn` runner calls `.next()` on the generator, wraps the yielded value in `Promise.resolve(val)`, and chains `.then()` callbacks to recursively drive the generator to completion.

---

## 7. Code Examples

### Reference Card: Promise Combinators Matrix

| Combinator Method | Fulfills When | Rejects When | Output on Success |
| :--- | :--- | :--- | :--- |
| **`Promise.all`** | **All** input promises fulfill. | **Any** input promise rejects (short-circuit). | Array of fulfillment values in original input order. |
| **`Promise.allSettled`** | **All** input promises settle (regardless of success/failure). | Never rejects. | Array of status objects: `{ status: "fulfilled", value }` or `{ status: "rejected", reason }`. |
| **`Promise.race`** | **Any** input promise settles first (success or failure). | If the fastest promise rejects. | Value or reason of the first settled promise. |
| **`Promise.any`** | **Any** input promise fulfills first. | **All** input promises reject. | Value of the first fulfilled promise (ignores intermediate rejections). Rejects with `AggregateError`. |

### Reference Card: Parallel vs Sequential Await

```javascript
// 1. Bad: Sequential await (blocks thread execution, slow!)
async function loadSequential() {
  const users = await fetchUsers(); // Takes 100ms
  const roles = await fetchRoles(); // Takes 100ms (Starts only after user fetch finishes)
  return { users, roles }; // Total time: 200ms
}

// 2. Good: Parallel await (runs in parallel, fast!)
async function loadParallel() {
  const usersPromise = fetchUsers(); // Starts immediately
  const rolesPromise = fetchRoles(); // Starts immediately
  
  // Wait for both to resolve concurrently
  const [users, roles] = await Promise.all([usersPromise, rolesPromise]);
  return { users, roles }; // Total time: 100ms (slowest single fetch)
}
```

### Reference Card: Async/Generator Spawn Runner
How compilers implement async/await using generators.

```javascript
// Reusable spawn runner polyfill
function spawn(genF) {
  return new Promise((resolve, reject) => {
    const gen = genF();
    
    function step(nextF) {
      let next;
      try {
        next = nextF();
      } catch (e) {
        return reject(e);
      }
      
      if (next.done) {
        return resolve(next.value);
      }
      
      Promise.resolve(next.value).then(
        val => step(() => gen.next(val)),
        err => step(() => gen.throw(err))
      );
    }
    
    step(() => gen.next(undefined));
  });
}
```

---

## 8. Dry Run

Let's dry run `Promise.any([Promise.reject("E1"), Promise.resolve("V2")])`:

- **Execution Flow**:
  - `Promise.any` registers handlers on all input promises.
  - Promise 1 rejects with `"E1"`.
  - `Promise.any` catches the rejection. Since the array contains another pending promise, it ignores the error and continues waiting.
  - Promise 2 resolves with `"V2"`.
  - `Promise.any` catches the resolution. Since this is the first fulfillment, it immediately resolves the outer promise with `"V2"`, ignoring the previous rejection.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting that `Promise.all` short-circuits on rejection.**
    If you pass 10 promises to `Promise.all` and 1 rejects, the returned promise rejects immediately, discarding the results of the other 9 successful promises. Use `Promise.allSettled` if you need the results of all promises regardless of failure.
- **Mistake 2: Missing error boundaries around awaits.**
    ```javascript
    // Bad: Unhandled rejection crash if fetch fails!
    const data = await fetch("url"); 
    ```
    *Fix*: Wrap awaits in `try-catch` blocks or attach `.catch()` chains.

---

## 10. Debugging

### Tracing Async Call Stacks in Chrome
When tracing errors inside nested async awaits:
1. Open Chrome DevTools.
2. Navigate to the **Call Stack** panel.
3. Ensure the **Async** checkbox is checked:
    - This allows Chrome to preserve stack traces across asynchronous boundaries (e.g. tracing back through Promise resolutions), showing the original call trace rather than truncating at the event loop tick boundary.

---

## 11. Real World Usage

- **Aggregated Data Ingestion**: Fetching page layout blocks, user settings, and permissions concurrently on dashboard initializations.
- **Microservice coordination**: Querying multiple backend microservices in parallel and compiling a unified API response.

---

## 12. Interview Preparation

### Question: How does async/await work under the hood?
- **Wrong Answer**: It compiles JavaScript into multi-threaded assembly code.
- **Good Answer**: Async/await is syntactic sugar built on top of **Generators** and **Promises**.
  - When V8 compiles an `async` function, it translates it into a generator function where `await` statements are compiled into `yield` expressions.
  - It wraps the generator in a runner function (often called `spawn`). The runner calls `.next()` to advance the generator, wraps the yielded value in `Promise.resolve()`, and attaches `.then()` handlers.
  - When the promise resolves, the `.then()` callback passes the value back to the generator via `gen.next(value)` to resume execution, repeating this process recursively until the generator completes.

---

## 13. Practice

### Exercises
1. **Easy**: Write an async function that queries a mock database after a 100ms delay.
2. **Medium**: Write a script that runs three promises in parallel using `Promise.allSettled`, and filters the output to print only the successful values.
3. **Hard**: Implement a custom generator-based `spawn` runner from scratch and use it to run a generator function containing multiple `yield` expressions that resolve promises.

---

## 14. Mini Assignment

Write a function `fetchSafe(url)` that catches fetch rejections and returns a fallback object instead of throwing.

---

## 15. Mini Project

Create a benchmark suite `AsyncCombinatorDemo` that runs three parallel API tasks using `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`, logging the results and execution timing metrics in a console table.

```javascript
// async-patterns-sandbox.js
const task = (ms, val, fail = false) => {
  return new Promise((res, rej) => {
    setTimeout(() => fail ? rej(new Error(val)) : res(val), ms);
  });
};

const runSuite = async () => {
  const list = [
    task(100, "Block A"),
    task(200, "Error B", true), // Fails
    task(50, "Block C")
  ];

  console.log("--- Testing Combinators ---");

  // Test Promise.allSettled
  const settled = await Promise.allSettled(list);
  console.log("Settled Results:", settled);

  // Test Promise.any
  const anyResult = await Promise.any(list);
  console.log("Any Result (First Success):", anyResult); // Should be "Block C" (fastest success)
};

runSuite().catch(e => console.error(e.message));
```

---

## 16. Chapter Summary

- A **Promise** transitions from `pending` to either `fulfilled` or `rejected`.
- **`Promise.all`** short-circuits on the first rejection.
- **`Promise.allSettled`** resolves only when all input promises have settled.
- **Async/await** is syntactic sugar built on top of **Generators** and **Promises**.
- Avoid **sequential awaits** inside loops; run tasks in parallel using `Promise.all`.

---

## 17. Quiz

1. What does `Promise.race` return if the fastest promise rejects?
2. What is the return type of an `async` function?
3. How does a generator function return multiple values?

---

## 18. Next Chapter Preview

We have completed **Module 14: Cheat Sheets**! You have compiled reference cards for engine stacks, DOM mutation speeds, and async promise pipelines. In the next module, **Module 15: Revision**, we will study the **Flashcards & Summaries** chapter.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Async Patterns Cheat Sheet Promise combinators comparison matrix (Promise.all, allSettled, race, any) and async/await engine compilation translations summaries features. Cheat sheet guides developers on when to choose specific async structures for parallel executions optimizations.

### Andar kya hota hai (Internal Working)

Event loop async pipelines:
1. **Microtasks prioritization checks**: Promises .then() callbacks register inside microtask queue which clears completely before Event Loop checks macrotask queue.
2. **Dynamic Generator compilation**: sync/await transforms to Generator coroutines mapping resume/suspend points on state machines.

### Code Example samjho

`javascript
// Promise Combinator matrix check
Promise.all([p1, p2, p3])
  .then(([r1, r2, r3]) => console.log("All resolved!"))
  .catch(err => console.error("First rejection short-circuits here!"));
`

**Line by line:**
- Promise.all — starts all input promises concurrently.
- .then(...) — executes only when all inputs resolve. Output array order matches input sequence.
- .catch(...) — short-circuits execution as soon as any input promise rejects.

### Sabse badi galti log karte hain

Parallel operations check scenarios parameters without error catch setups. Unhandled rejections crash process threads. Always attach catch blocks to Promise chains.

### Yaad rakhne ki cheez

**Promise.all short-circuits on first rejection, Promise.allSettled waits for all results, microtasks always execute before macrotasks.**

## 20. Completion Checklist

- [ ] I understand Promise states and transition rules.
- [ ] I can select the correct Promise combinator for a given scenario.
- [ ] I know how to execute async tasks in parallel.
- [ ] I can explain the generator-based implementation of async/await.
