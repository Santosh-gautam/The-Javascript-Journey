# Async / Await

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of Promises and error handling
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are reading a recipe in a cookbook.

The recipe tells you:
1. Put water on the stove.
2. **Wait** until the water boils.
3. Add the pasta.
4. **Wait** 10 minutes.
5. Strain the pasta.

You read this recipe line-by-line. Even though "waiting for water to boil" takes time, you don't read step 5 while step 2 is happening. You naturally pause your reading process at the word **"Wait"**, let the background cooking happen, and resume reading when the water is boiling. The instructions remain simple and linear.

If you had to write this using callbacks, the recipe would look like: *"Put water on stove. When it boils, run a callback to add pasta. When 10 minutes pass, run another callback to strain..."*

**Async/Await** allows you to write your asynchronous JavaScript code exactly like a recipe book: sequential, readable, and linear.

---

## 2. Problem

Promises made asynchronous code flat, but they still require:
- Nested `.then()` callback handlers.
- Complex scoping (if you need variables from `.then(1)` inside `.then(3)`, you have to pass them down or save them in outer variables).
- Different syntax patterns for synchronous error catching (`try-catch`) vs. asynchronous error catching (`.catch()`).

---

## 3. Solution

ES2017 (ES8) introduced **Async/Await**.

This is syntactic sugar built on top of Promises. By adding the **`async`** keyword to a function, you tell the engine that it can pause execution. Inside, you use the **`await`** keyword before any Promise. The engine pauses the function execution on that line until the Promise resolves, returning the result value directly, allowing you to use standard `try-catch` blocks for all errors.

---

## 4. Definition

- **`async` Function**: A function declared with the `async` keyword that automatically wraps its return values inside a resolved Promise.
- **`await` Expression**: A keyword used inside an `async` function that pauses execution until the associated Promise settles (either resolves or rejects).
- **Linearization**: The practice of writing asynchronous code in a vertical, synchronous-looking style.

---

## 5. Visualization

### Synchronous-looking Async Flow

```javascript
async function loadData() {
  console.log("Loading started");
  
  // Await pauses the execution of this block
  const user = await fetchUser(); // <-- PAUSE POINT
  
  // Execution resumes here after fetchUser resolves
  console.log("User loaded:", user.name);
}
```

```
   MAIN EXECUTION FLOW                    ASYNC FUNCTION INNER STATE
  
   [ Call loadData() ] -----------------> [ Start execution ]
            |                                     |
   [ Continue GEC Downstream ] <---------- [ await fetchUser() ] (Pauses block,
   (Main thread is NOT blocked!)           returns pending promise to global)
            |                                     |
            |                             (Fetch resolves)
            |                                     |
            |<----------------------------- [ Resume execution ]
                                           - Logs user.name
```

---

## 6. Internal Working

V8 processes Async/Await using these compiler transformations:

1. **Implicit Promise Wrapping**: When V8 parses `async function get() { return 1; }`, it wraps the return value in a resolved Promise: `Promise.resolve(1)`.
2. **Context Yielding**: When the engine hits `await myPromise`:
    - V8 suspends the execution context of the `async` function.
    - It saves the local variables, registers, and execution pointer in the Heap.
    - It schedules the remainder of the function as a callback in the **Microtask Queue** attached to `myPromise`'s resolution.
    - The engine immediately returns control to the function that called the `async` function, keeping the main thread free.
3. **Resume**: When `myPromise` resolves, the Event Loop pulls the suspended function context from the Microtask Queue, restores it onto the Call Stack, and resumes execution.

---

## 7. Code Examples

### Bad Practice: Unnecessary Promise Chaining inside Async Functions
Mixing `.then()` syntax inside async/await functions makes code confusing and redundant.

```javascript
// Bad: Redundant wrapping and syntax mixing
async function getUserProfile(id) {
  const profile = {};
  await fetchUser(id).then(user => {
    profile.name = user.name;
    return fetchAddress(user.addressId).then(addr => {
      profile.city = addr.city;
    });
  });
  return profile;
}
```

### Good Practice: Linear Awaits
Write sequential actions vertically, storing values directly in local variables.

```javascript
// Good: Linear, clean variable scoping
async function getUserProfile(id) {
  try {
    const user = await fetchUser(id);
    const address = await fetchAddress(user.addressId);
    
    return {
      name: user.name,
      city: address.city
    };
  } catch (error) {
    console.error("Profile fetch failed:", error.message);
    throw error;
  }
}
```

### Best Practice: Parallel Awaits (Avoid Waterfall Bottleneck)
Do not await sequential lines if the requests are independent. Launch them in parallel using `Promise.all` combined with await.

```javascript
// Best Practice: Parallel execution to save time
async function loadCartData(userId) {
  try {
    // Launching both in parallel (no waterfall)
    const cartPromise = fetchCart(userId);
    const userPromise = fetchUser(userId);

    // Await both together
    const [cart, user] = await Promise.all([cartPromise, userPromise]);

    return { user, cart };
  } catch (error) {
    console.error("Failed to load cart dashboard:", error.message);
    return null;
  }
}
```

---

## 8. Dry Run

Let's dry run the execution order of an async statement:

```javascript
1: async function run() {
2:   console.log("Inside Run");
3:   const val = await Promise.resolve("Data");
4:   console.log(val);
5: }
6: console.log("Start");
7: run();
8: console.log("End");
```

### Step-by-Step State
- **Line 6**: GEC prints `"Start"`.
- **Line 7 (Calling run)**:
  - Stack pushes `run()`.
  - Line 2: Prints `"Inside Run"`.
  - Line 3: Evaluates `Promise.resolve("Data")`. Hitting `await` pauses the `run` execution frame.
  - V8 schedules lines 4-5 as a microtask linked to the promise.
  - V8 returns control to GEC. `run()` pops off the stack.
- **Line 8**:
  - GEC prints `"End"`.
  - GEC finishes. Call Stack is empty.
- **Microtask Execution**:
  - Promise settles. Microtask executes.
  - `run()` context is restored onto the stack.
  - `val` is bound to `"Data"`.
  - Line 4: Prints `"Data"`.
  - Stack is cleared.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting the `await` keyword.**
    If you omit `await` before a promise, the variable receives the `Promise` object itself in a `"pending"` state, not the resolved data.
- **Mistake 2: Missing try-catch wrappers.**
    If an awaited promise rejects and is not wrapped in a `try-catch` block, the exception bubbles up. If uncaught at the entry function, it triggers an unhandled rejection error.

---

## 10. Debugging

### Stepping Through Await Statements
Debugging async functions in DevTools is identical to debugging synchronous code:
1. Set a breakpoint on a line containing `const user = await fetchUser()`.
2. Set a second breakpoint on the subsequent line: `console.log(user)`.
3. Trigger execution.
4. When paused on the first breakpoint, select **Step Over (F10)**.
    - The debugger hides the asynchronous interruption. It pauses on the next line *after* the promise has resolved.
    - Inspect the `user` variable in the Local Scope variables pane to verify the returned object shape.

---

## 11. Real World Usage

- **Express Controller Routers**: Clean routing middlewares write database queries in linear await flows.
- **Next.js Server Actions**: Server-side operations query databases and APIs using async functions before returning layout parameters.

---

## 12. Interview Preparation

### Question: What happens if you return a raw value from an async function?
- **Wrong Answer**: It returns the raw value immediately.
- **Good Answer**: An `async` function always returns a Promise. If you return a primitive value (like number `10` or string `"hello"`), the engine automatically wraps that value inside a resolved Promise: `Promise.resolve(value)`.

---

## 13. Practice

### Exercises
1. **Easy**: Write an async function that fetches a user profile and logs the result.
2. **Medium**: Write a script that checks two independent timers using `Promise.all` and returns their aggregated values.
3. **Hard**: Explain what happens if you throw an error inside an async function. How do parent callers catch it?

---

## 14. Mini Assignment

Write a function `getUserAge(id)` using async/await. Query a mock database. If the user doesn't exist, throw an Error. Catch the error in a parent try-catch block.

---

## 15. Mini Project

Create a mock file upload status checker `uploadFile(filename)` that uploads data in chunks. Use async/await loops to check chunk completions, logging progress percent.

```javascript
// file-upload-async.js
const uploadChunk = (chunkId) => new Promise(res => setTimeout(() => res(`Chunk ${chunkId} OK`), 200));

async function uploadFile(filename, totalChunks = 5) {
  console.log(`Starting upload for: ${filename}`);

  try {
    for (let i = 1; i <= totalChunks; i++) {
      const status = await uploadChunk(i); // Pauses for each chunk
      const percent = ((i / totalChunks) * 100).toFixed(0);
      console.log(`Progress: ${percent}% | Status: ${status}`);
    }
    console.log("Upload completed successfully!");
    return true;
  } catch (error) {
    console.error("Upload interrupted due to error:", error.message);
    return false;
  }
}

uploadFile("presentation.pdf");
```

---

## 16. Chapter Summary

- **Async/Await** is a cleaner syntactic wrapper over Promises.
- **`async`** functions always return a Promise.
- **`await`** pauses function execution until the promise settles.
- Use standard **`try-catch-finally`** loops for error handling inside async functions.

---

## 17. Quiz

1. Can you use the `await` keyword inside a normal, non-async function? (Hint: check top-level await exceptions!)
2. What is returned if you call `console.log(myAsyncFunc())`?
3. How can you run multiple await requests in parallel?

---

## 18. Next Chapter Preview

In the next chapter, we will look at the **Internal Working of Async/Await**. We will unpack how the V8 engine compiles async/await under the hood by translating them into ES6 **Generators and yield loops**.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Promise chaining bhi complex ho sakta tha — .then().then() mein error handling awkward tha.
- **Concept**: sync/await Promises ke upar syntactic sugar hai — async code synchronous jaisa readable lagta hai.
- **Key Pattern**: const data = await fetch(url).then(r => r.json()) — 	ry/catch se errors handle karo.
- **Common Mistake**: wait ko sync function ke bahar use karna — SyntaxError aata hai; Top-level await sirf ESM mein kaam karta hai.
## 19. Completion Checklist

- [ ] I can write async functions and linearize promise checks.
- [ ] I understand how to use `try-catch` to isolate async exceptions.
- [ ] I know how to use `Promise.all` with await to run parallel operations.
- [ ] I can step through await statements using debugger panels.
