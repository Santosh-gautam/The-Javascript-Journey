# Promise Combinators

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Promise chains and states
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a project manager coordinating a team of three developers:

- **`Promise.all` is like launching a complete product release**: You need all three features (promises) completed. If even one developer fails (rejects), the whole release crashes and you cancel the project immediately, ignoring the other features.
- **`Promise.allSettled` is like running a daily status report**: You send out email updates. You want to know exactly who succeeded and who failed. You don't cancel the meeting if someone failed; you collect status results from everyone.
- **`Promise.race` is like a race to claim a prize**: Three developers try to finish a task. You only reward the fastest developer. Whether they succeed or fail (reject), the first one across the finish line determines the outcome of the race.
- **`Promise.any` is like calling customer support lines**: You call three support numbers. You only care about the first operator who answers the phone successfully (fulfills). You ignore the busy signals (rejections). Only if all three numbers return busy signals do you declare failure.

In JavaScript, these project manager rules are **Promise Combinators**.

---

## 2. Problem

Asynchronous tasks often run independently:
- Loading three separate widgets on a dashboard.
- Querying a backup database if the main database is slow.
- Sending parallel analytics telemetry logs.

If you await them sequentially:
- Page loads take three times longer because of blocking.
- A single widget crash can block the other two widgets from rendering.

---

## 3. Solution

JavaScript provides **Promise Combinators**—static methods on the `Promise` class that accept arrays of promises and manage their execution concurrently, resolving with aggregate lists or single values based on specific success/failure criteria.

---

## 4. Definition

- **`Promise.all`**: Resolves when all input promises fulfill; rejects immediately if any input promise rejects.
- **`Promise.allSettled`**: Resolves after all input promises have settled (either fulfilled or rejected), returning a status object array.
- **`Promise.race`**: Settles (resolves or rejects) as soon as the first promise in the input array settles.
- **`Promise.any`**: Resolves as soon as the first promise in the input array fulfills; rejects with an `AggregateError` only if all input promises reject.

---

## 5. Visualization

### Combinator Decision Matrix

| Method | Resolves When? | Rejects When? | Return Value |
| :--- | :--- | :--- | :--- |
| **`Promise.all`** | **All** fulfill | **Any** rejects | Array of resolved values |
| **`Promise.allSettled`** | **All** settle (any outcome) | **Never** | Array of `{ status, value/reason }` |
| **`Promise.race`** | **First** settles (any outcome) | **First** settles (any outcome) | Value/Reason of the fastest promise |
| **`Promise.any`** | **First** fulfills | **All** reject | Value of fastest fulfilling promise |

---

## 6. Internal Working

V8 processes combinators using internal loop trackers:

1. **Concurrency Allocation**: When you call a combinator, V8 launches the promises in parallel. The engine doesn't wait; they are processed by Web APIs concurrently.
2. **State Listening**:
    - **`Promise.all`**: V8 maintains an internal counter. Every time a promise resolves, the engine decreases the counter. If the counter hits 0, it resolves. If any promise rejects, V8 triggers the parent rejection handler immediately, ignoring subsequent completions.
    - **`Promise.allSettled`**: V8 maps results to a collection array. It appends `{ status: "fulfilled", value }` or `{ status: "rejected", reason }` elements. It resolves only when the counter of settled items matches the input array length.
    - **`Promise.any`**: V8 tracks rejections. If a promise rejects, it adds the error to an internal list. It resolves instantly if any promise fulfills. If all fail, it returns the error list wrapped in an `AggregateError`.

---

## 7. Code Examples

### Bad Practice: Sequential Await Bloating
Running independent requests sequentially delays execution.

```javascript
// Bad: Total wait is 1.5s + 2.0s = 3.5s!
const users = await fetchUsers(); // Takes 1.5s
const posts = await fetchPosts(); // Takes 2.0s
```

### Good Practice: Parallel Execution via `Promise.all`
Run requests in parallel. The wait time is reduced to the slowest request (2.0s).

```javascript
// Good: Total wait is only 2.0s!
Promise.all([fetchUsers(), fetchPosts()])
  .then(([users, posts]) => {
    console.log("Users:", users, "Posts:", posts);
  })
  .catch(error => {
    console.error("One of the fetches crashed:", error.message);
  });
```

### Best Practice: Secure Widget Rendering using `Promise.allSettled`
Ensure that a crash in a non-critical endpoint doesn't prevent other parts of the dashboard from rendering.

```javascript
// Best Practice: Dashboard widgets
const loadDashboard = () => {
  const widgets = [
    fetchWeather(), // Resolves
    fetchNews(),    // Crashes/Rejects
    fetchStocks()   // Resolves
  ];

  Promise.allSettled(widgets)
    .then(results => {
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          renderWidget(index, result.value);
        } else {
          console.warn(`Widget ${index} failed:`, result.reason.message);
          renderErrorState(index);
        }
      });
    });
};
```

---

## 8. Dry Run

Let's dry run the execution timeline of `Promise.race`:

```javascript
const fast = new Promise(res => setTimeout(() => res("Fast"), 100));
const slow = new Promise((_, rej) => setTimeout(() => rej("Slow Error"), 500));

Promise.race([fast, slow]).then(res => console.log(res));
```

### Step-by-Step State
- **0ms**:
  - GEC schedules `fast` timer (100ms) and `slow` timer (500ms) in Web APIs.
  - Both promises start in `"pending"` status.
- **100ms**:
  - `fast` timer triggers. `fast` promise transitions to `"fulfilled"` with value `"Fast"`.
  - The Event Loop detects `fast` settled. Since it is the first in `Promise.race`, the race is over.
  - V8 schedules the `.then()` callback with value `"Fast"` in the Microtask Queue.
- **Microtask Ticks**:
  - Logs `"Fast"`.
- **500ms**:
  - `slow` timer triggers. It rejects, but its rejection has no effect on the race. It is ignored.

---

## 9. Common Mistakes

- **Mistake 1: Expecting `Promise.all` to return partial data if one fails.**
    If you pass 10 promises and 9 resolve, but 1 rejects, `Promise.all` rejects immediately. All successful values are thrown away.
- **Mistake 2: Missing the `AggregateError` property in `Promise.any`.**
    When handling rejections inside `Promise.any`, you must read `error.errors` (an array) to inspect the specific failures of each promise.

---

## 10. Debugging

### Pinpointing Failures in Parallel Executions
When `Promise.all` rejects:
1. Set a breakpoint inside the `.catch()` block.
2. Trigger execution.
3. Look at the `error` object inside the debugger variables tab.
    - The stack trace will show which file and line initiated the rejection.
    - If you are running `Promise.allSettled`, expand the results array in the Watch tab. Identify which index elements contain `"rejected"` status flags to trace the specific failure coordinates.

---

## 11. Real World Usage

- **Microservice aggregators**: API gateways query user profiles, billing history, and notifications in parallel using `Promise.allSettled` to construct the unified UI profile page.
- **Caching redundancy**: Querying local IndexedDB and a remote CDN in a `Promise.race` loop to load assets from whichever source returns first.

---

## 12. Interview Preparation

### Question: What is the difference between `Promise.race` and `Promise.any`?
- **Wrong Answer**: They both return the fastest promise.
- **Good Answer**: `Promise.race` settles as soon as the first input promise completes, whether it resolves (succeeds) or rejects (fails). `Promise.any` ignores rejections and resolves only when the first input promise *fulfills* (succeeds). It will only reject if *all* input promises fail, returning an `AggregateError`.

---

## 13. Practice

### Exercises
1. **Easy**: Write a script that checks three timers using `Promise.race` and prints the fastest time.
2. **Medium**: Write a script that query three mockup servers. If two crash but one succeeds, use `Promise.any` to load the data.
3. **Hard**: Write a custom polyfill function `myPromiseAll(promiseArray)` that emulates the behavior of `Promise.all`.

---

## 14. Mini Assignment

Write a function `fetchBackup(primaryUrl, backupUrl)` that launches fetches for both. Return whichever yields successfully first using `Promise.any`.

---

## 15. Mini Project

Create a system check dashboard utility `pingSystem()` that queries three mock status checkers (Database, Cache, API Router). Use `Promise.allSettled` to create a status checklist array, printing warnings for any failed component.

```javascript
// system-combinators.js
const checkDB = () => new Promise(res => setTimeout(() => res("DB Online"), 100));
const checkCache = () => new Promise(res => setTimeout(() => res("Cache Online"), 200));
const checkAPI = () => new Promise((_, rej) => setTimeout(() => rej(new Error("API Timeout")), 150));

function pingSystem() {
  console.log("Starting health checks...");

  Promise.allSettled([checkDB(), checkCache(), checkAPI()])
    .then(results => {
      const report = {
        db: results[0].status === 'fulfilled' ? "OK" : "FAILED",
        cache: results[1].status === 'fulfilled' ? "OK" : "FAILED",
        api: results[2].status === 'fulfilled' ? "OK" : "FAILED"
      };
      
      console.log("--- System Health Report ---");
      console.table(report);

      if (results[2].status === 'rejected') {
        console.warn("Alert details: API failure reason ->", results[2].reason.message);
      }
    });
}

pingSystem();
```

---

## 16. Chapter Summary

- **Promise Combinators** run asynchronous tasks concurrently.
- **`Promise.all`** checks for complete success. Fails early on any rejection.
- **`Promise.allSettled`** tracks all outcomes, returning status profiles.
- **`Promise.race`** checks speed. **`Promise.any`** checks successful speed.

---

## 17. Quiz

1. What error class is returned when all promises inside `Promise.any` fail?
2. How many promises are returned as resolved if you run `Promise.allSettled` over 5 files?
3. If one promise in `Promise.all` fails after 10ms, and another resolves after 500ms, when does `Promise.all` reject?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Async / Await**. We will explore how to write asynchronous code that reads like synchronous code, using try-catch blocks to handle exceptions.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Multiple async operations ko manage karna — kab sab ka wait karna hai, kab sirf pehle wale ka.
- **Concept**: 4 combinators: Promise.all (sab ya fail), Promise.allSettled (sab settle), Promise.race (pehla), Promise.any (pehla success).
- **Key Pattern**: Parallel requests ke liye Promise.all([fetch1, fetch2, fetch3]) — sequential se bahut faster.
- **Common Mistake**: Promise.all mein ek bhi reject ho to poora fail — agar partial success chahiye to Promise.allSettled use karo.
## 19. Completion Checklist

- [ ] I can distinguish between the 4 Promise combinators.
- [ ] I understand when to use `Promise.all` versus `Promise.allSettled`.
- [ ] I know how to read `AggregateError` error arrays in `Promise.any`.
- [ ] I can trace parallel execution stack arrays in the debugger.
