# Polyfill for Promise

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 20 minutes
- **Prerequisites**: Understanding of Promises, async execution, microtasks, and object state machines
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are ordering a custom-made birthday cake from a bakery:

- **The Promise is the receipt slip the baker hands you**: The moment you pay, the transaction status is **`Pending`**. The cake is not ready, but you have a slip representing it.
- **The State Machine represents the cake status**:
  - **`Pending`**: The baker is mixing the batter in the kitchen.
  - **`Fulfilled`**: The cake is baked, glazed, and boxed. The baker hands it to you (resolving with a value).
  - **`Rejected`**: The oven caught fire, and the cake was burned. The baker apologizes and explains what happened (rejecting with a reason).
- **Once settled, the status is locked**: You cannot un-burn a cake, and you cannot un-box a completed cake. The transaction is closed.
- **Callbacks (`.then()`) are instructions you write on the receipt**: You write: *"If the cake is completed, deliver it to my house (onFulfilled). If it is burned, refund my money (onRejected)."* If the cake is still baking, the baker pins your instructions to the wall (callbacks array). If the cake is already completed when you ask, they execute your instructions immediately.

In JavaScript, **Promises** implement this asynchronous state machine.

---

## 2. Problem

Legacy browser engines (such as IE11) do not support the native `Promise` constructor.

If your application utilizes modern asynchronous flows (like `fetch`, `async/await`, or Promise chains):
- The browser fails immediately on load, throwing `ReferenceError: Promise is not defined`.
- Writing asynchronous code using nested callbacks leads to unmaintainable code (callback hell).

---

## 3. Solution

We write a custom **`Promise` Polyfill** from scratch.

By building a class-based state machine, we manage internal states (`"pending"`, `"fulfilled"`, `"rejected"`), maintain callback queues, schedule executions asynchronously using the browser's microtask queue, and support chained `.then()` resolutions.

---

## 4. Definition

- **Promise State Machine**: A design pattern where an object has defined states, and transitions between them are restricted based on execution rules.
- **Microtask Execution**: Scheduling code to run at the end of the current Call Stack execution frame, before the browser yields to the rendering or macrotask queues.

---

## 5. Visualization

### Promise State Machine Transitions

```
                    [ STATE: "pending" ]
                       /            \
                      /              \
             resolve(value)        reject(reason)
                    /                  \
                   v                    v
         [ STATE: "fulfilled" ]    [ STATE: "rejected" ]
         - value: locked           - reason: locked
         - runs onFulfilled        - runs onRejected
```

*Rules*: Once the state transitions to `fulfilled` or `rejected`, it is locked. No further transitions or value updates are allowed.

---

## 6. Internal Working

How our Promise polyfill manages asynchronous execution:

1. **Callbacks Array**: If a user calls `.then()` while the Promise is still `"pending"`, the polyfill stores the callbacks in arrays: `this.onFulfilledCallbacks = []` and `this.onRejectedCallbacks = []`.
2. **Microtask Scheduling**: The Promises/A+ specification requires that callbacks must be executed asynchronously. The polyfill uses **`queueMicrotask`** (or a fallback like `setTimeout`) to schedule callback execution at the end of the active Call Stack.
3. **Chaining Resolution**: To support chaining (`.then().then()`), each `.then()` call returns a **brand-new Promise instance**. The polyfill resolves or rejects this new instance based on the return value of the previous callback.

---

## 7. Code Examples

### The Promise Specification Polyfill
We construct a complete, standard-compliant Promise class.

```javascript
// promise-specification-polyfill.js
class MyPromise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("Promise resolver undefined is not a function");
    }

    // 1. Initial State
    this.state = "pending";
    this.value = undefined;
    this.reason = undefined;

    // Callback queues for pending promises
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    // 2. Resolve handler
    const resolve = (value) => {
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        // Trigger all saved callbacks asynchronously
        this.onFulfilledCallbacks.forEach(cb => queueMicrotask(cb));
      }
    };

    // 3. Reject handler
    const reject = (reason) => {
      if (this.state === "pending") {
        this.state = "rejected";
        this.reason = reason;
        // Trigger all saved callbacks asynchronously
        this.onRejectedCallbacks.forEach(cb => queueMicrotask(cb));
      }
    };

    // 4. Immediate execution of executor
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error); // Reject on synchronous errors
    }
  }
}
```

### Good Practice: Implementing then()
Support registering callbacks and executing them immediately if the promise is already settled.

```javascript
// Inside MyPromise class
then(onFulfilled, onRejected) {
  // Default callbacks if user omits them (value propagation)
  const realOnFulfilled = typeof onFulfilled === "function" ? onFulfilled : val => val;
  const realOnRejected = typeof onRejected === "function" ? onRejected : err => { throw err; };

  // Return a new Promise to support chaining!
  return new MyPromise((resolve, reject) => {
    
    const handleFulfilled = () => {
      try {
        const x = realOnFulfilled(this.value);
        // If the callback returns another Promise, wait for it to resolve
        if (x instanceof MyPromise) {
          x.then(resolve, reject);
        } else {
          resolve(x);
        }
      } catch (error) {
        reject(error);
      }
    };

    const handleRejected = () => {
      try {
        const x = realOnRejected(this.reason);
        if (x instanceof MyPromise) {
          x.then(resolve, reject);
        } else {
          resolve(x); // A resolved rejection recovery resolves the chained promise!
        }
      } catch (error) {
        reject(error);
      }
    };

    if (this.state === "pending") {
      this.onFulfilledCallbacks.push(() => handleFulfilled());
      this.onRejectedCallbacks.push(() => handleRejected());
    } else if (this.state === "fulfilled") {
      queueMicrotask(() => handleFulfilled());
    } else if (this.state === "rejected") {
      queueMicrotask(() => handleRejected());
    }
  });
}
```

### Best Practice: Promise Chaining and Static Resolvers
Implement static helper methods (`MyPromise.resolve()`, `MyPromise.reject()`) to build standard API pipelines.

```javascript
// Best Practice: Static helpers
class MyPromiseExtended extends MyPromise {
  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}
```

---

## 8. Dry Run

Let's dry run `new MyPromise(res => res("Done")).then(val => console.log(val))`:

- **Instantiation**:
  - State is `"pending"`. Executor runs immediately.
  - Executor calls `resolve("Done")`.
  - State changes to `"fulfilled"`. `value` is set to `"Done"`.
- **Chaining (`.then()`)**:
  - `then` is invoked. State is `"fulfilled"`.
  - Schedules a microtask: `queueMicrotask(() => handleFulfilled())`.
  - `then` returns a new pending Promise.
- **Microtask Execution**:
  - Call Stack clears. V8 drains the Microtask Queue.
  - Runs `handleFulfilled()`.
  - Calls `realOnFulfilled("Done")`. Runs `console.log("Done")`. Logs `"Done"`.
  - The return value `x` is `undefined`.
  - Calls `resolve(undefined)` for the chained Promise, resolving it.

---

## 9. Common Mistakes

- **Mistake 1: Executing callbacks synchronously inside `resolve` or `reject`.**
    If callbacks run synchronously, `new Promise(res => res()).then(cb)` will execute the callback *before* the synchronous lines below the promise declaration are run, violating the Promises/A+ spec. Always use `queueMicrotask` or `setTimeout` to defer execution.
- **Mistake 2: Changing states after the promise has already settled.**
    If a constructor calls `resolve()` and then immediately calls `reject()`, the state must remain locked to the first transition.

---

## 10. Debugging

### Tracing Promise queue lists in DevTools
To check how your custom Promise resolves under V8:
1. Set a breakpoint inside the `resolve` function of your polyfill.
2. Trigger resolution.
3. Inspect the **Local Scope**:
    - Check `this.onFulfilledCallbacks`.
    - If the array contains multiple functions but the state is still `"pending"`, check if the executor is failing to call `resolve()`.

---

## 11. Real World Usage

- **Babel Promise Polyfill**: Babel automatically injects promise polyfills into builds when target browsers (configured via Browserlist) are legacy systems.
- **Node.js custom deferrals**: Library wrappers that mimic deferred promise resolutions inside async API routes.

---

## 12. Interview Preparation

### Question: Why must Promise callbacks execute asynchronously, and how does your polyfill enforce it?
- **Wrong Answer**: Because async code is faster.
- **Good Answer**: Enforcing asynchronous execution ensures predictable program flow. According to the Promises/A+ spec, callbacks registered via `.then()` must not execute until the execution context stack contains only platform code. This prevents "Zalgo" (where a function behaves synchronously in some cases and asynchronously in others, causing unpredictable state races).
  - My polyfill enforces this by wrapping callback executions inside **`queueMicrotask()`** (or falling back to `setTimeout` if unsupported), ensuring they are pushed to the browser's Event Loop microtask queue and run only after the main synchronous Call Stack has fully cleared.

---

## 13. Practice

### Exercises
1. **Easy**: Write a basic Promise class that supports resolve, reject, and a single `.then` call.
2. **Medium**: Write a test script validating that a resolved Promise executes its `.then` callback asynchronously after synchronous logs have run.
3. **Hard**: Implement the complete Promises/A+ resolution procedure (handling circular promise checks, nested thenables, and recursive promise adoptions).

---

## 14. Mini Assignment

Write a static method `MyPromise.reject(reason)` and verify it rejects immediately, trigger catching callbacks.

---

## 15. Mini Project

Create a mock async fetch runner `PromiseSandbox`. Use your custom Promise polyfill to fetch mock api records, chaining 3 processing steps, and print the timing lifecycle in the console.

```javascript
// promise-polyfill-sandbox.js
// Paste your MyPromise class here (including the then method)

const mockFetchUser = (id) => {
  return new MyPromise((resolve, reject) => {
    console.log("[API] Starting fetch...");
    setTimeout(() => {
      if (id === 0) reject(new Error("User not found"));
      else resolve({ id, name: "Ishan", role: "admin" });
    }, 100);
  });
};

// Run Chain
console.log("1. Synchronous Start");
mockFetchUser(101)
  .then(user => {
    console.log("2. User retrieved:", user.name);
    return user.role;
  })
  .then(role => {
    console.log("3. User role parsed:", role);
  })
  .catch(err => console.error("Error occurred:", err.message));

console.log("4. Synchronous End"); // This prints BEFORE step 2 and 3!
```

---

## 16. Chapter Summary

- A **Promise** is a state machine with states: `"pending"`, `"fulfilled"`, and `"rejected"`.
- Once settled, the **state and value are locked** and cannot change.
- **`then()`** returns a brand-new Promise instance to support chaining.
- Enforce asynchronous execution using **`queueMicrotask()`** wrappers.

---

## 17. Quiz

1. What is the initial state of a newly constructed Promise?
2. Does a resolved rejection callback `.catch(() => "recovered")` resolve or reject the chained Promise?
3. Why is `queueMicrotask` preferred over `setTimeout` for scheduling promise resolutions?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for Promise.all**. We will explore parallel asynchronous coordination and short-circuit rejection mechanisms.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Promise Polyfill standard promises specification (Promises/A+) custom state machine design implement targets coordinates. Promise polyfill objects state transitions pending to fulfilled or rejected rule sequences lock coordinate details. Core cases: **Microtask callbacks scheduling** (queueMicrotask falls setup), **Callback arrays queues** and **Chaining recursion resolutions**.

### Andar kya hota hai (Internal Working)

Promise polyfill tracking internals:
1. **Queues arrays allocations**: If .then() is called during pending state, callbacks are registered inside array queues: 	his.onFulfilledCallbacks and 	his.onRejectedCallbacks.
2. **Microtasks resolution scheduling**: Callback functions are wrapped and pushed to Event Loop Microtask Queue using queueMicrotask or fallback setTimeout loops to run asynchronously.
3. **Recursive Resolution Procedure**: esolvePromise checks output type. If output is another Promise, it chains fulfillment automatically.

### Code Example samjho

`javascript
class MyPromise {
  constructor(executor) {
    this.state = "pending";
    this.value = undefined;
    this.onFulfilledCallbacks = [];
    
    const resolve = (value) => {
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        // Schedule callback execution on microtask queue
        this.onFulfilledCallbacks.forEach(cb => queueMicrotask(cb));
      }
    };
    try { executor(resolve); } catch(e) { /* handle */ }
  }
}
`

**Line by line:**
- 	his.state = "pending" — initial state representation.
- 	his.onFulfilledCallbacks = [] — stores callbacks when Promise is not yet resolved.
- queueMicrotask(cb) — schedules callback execution asynchronously in V8 microtask queue.

### Sabse badi galti log karte hain

Callbacks synchronously execution call inside resolve. If callbacks run immediately instead of microtask queues scheduling, it violates Promises/A+ specifications, breaking async sequencing codes. Always wrap triggers inside queueMicrotask blocks.

### Yaad rakhne ki cheez

**Promises callbacks must execute asynchronously inside microtask queues context frames.**

## 20. Completion Checklist

- [ ] I can write a custom Promise state machine class.
- [ ] I understand how states are locked upon settling.
- [ ] I know how to use `queueMicrotask` to schedule async execution.
- [ ] I understand how promise chaining works by returning new instances.
