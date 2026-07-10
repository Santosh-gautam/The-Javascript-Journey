# Promises

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding callbacks and Event Loop queues
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you visit a popular sandwich shop.

Instead of waiting at the register while they make your sandwich, the cashier takes your payment and hands you a **buzzer** (the Promise).
- **Pending state**: While you wait, the buzzer is silent. The sandwich is not ready yet, but you hold a voucher promising it.
- **Fulfilled state**: When the sandwich is made, the cashier presses a button. Your buzzer vibrates (resolves). You return the buzzer and collect your hot sandwich (the resolved value).
- **Rejected state**: What if the kitchen runs out of bread? The cashier calls out: *"Sorry, we cannot make your order."* Your buzzer turns red (rejects). You go to the refund desk to handle the error (the reject reason).

You don't need to stand there staring at the chef; you just wait for the buzzer to change state.

In JavaScript, this buzzer is a **Promise**.

---

## 2. Problem

Using raw callbacks to sequence multiple asynchronous operations leads to:
1. **Callback Hell**: Nested structures that crawl horizontally.
2. **Inversion of Control**: Trusting third-party tools to invoke your callbacks correctly.
3. **Complex Error Handling**: Requiring manual error checks at every single step of the nested sequence.

---

## 3. Solution

A **Promise** is a proxy object representing the eventual completion (or failure) of an asynchronous operation.

Instead of passing callbacks *into* functions, functions return a Promise object. You attach handlers (`.then()`, `.catch()`) directly to this object. The engine manages execution and error bubbling automatically.

---

## 4. Definition

- **Promise**: An object that represents the eventual result of an asynchronous operation.
- **Resolve**: A callback function passed to the executor that transitions the Promise state from `pending` to `fulfilled`.
- **Reject**: A callback function passed to the executor that transitions the Promise state from `pending` to `rejected`.
- **Chaining**: The practice of linking multiple `.then()` methods sequentially. Each `.then()` returns a new Promise, allowing linear execution flows.

---

## 5. Visualization

### Promise State Transitions

```
                    +--------------------+
                    |  State: Pending    |
                    |  Value: undefined  |
                    +--------------------+
                              |
             +----------------+----------------+
             |                                 |
      Resolve() called                  Reject() called
             |                                 |
             v                                 v
   +-------------------+             +-------------------+
   | State: Fulfilled  |             |  State: Rejected  |
   | Value: Data       |             |  Value: Error     |
   +-------------------+             +-------------------+
             |                                 |
             v                                 v
         .then(val)                        .catch(err)
```

---

## 6. Internal Working

When you create a Promise, V8 allocates a `JSPromise` object in the Heap. Under the hood, this object contains three key internal properties:

1. **`[[PromiseState]]`**: Tracks status: `"pending"`, `"fulfilled"`, or `"rejected"`.
2. **`[[PromiseResult]]`**: Stores the resolved value or the rejection reason.
3. **`[[PromiseFulfillReactions]]` / `[[PromiseRejectReactions]]`**: Lists of callback functions registered by `.then()` and `.catch()` calls.

### State Resolution Flow
- When V8 compiles `.then(cb)`, it checks the `[[PromiseState]]`.
- If the state is `"pending"`, V8 saves the callback `cb` into the `[[PromiseFulfillReactions]]` array.
- When `resolve(data)` is called:
  - The state changes to `"fulfilled"`.
  - The result is set: `[[PromiseResult]] = data`.
  - V8 loops through the reactions array and schedules each callback into the **Microtask Queue**.

---

## 7. Code Examples

### Bad Practice: Nested Promise pyramid
Unnecessarily nesting Promise handlers replicates the structural mess of callback hell.

```javascript
// Bad: Promise nesting defeats the purpose of chaining!
getUser(1).then(user => {
  getPosts(user.id).then(posts => {
    getComments(posts[0].id).then(comments => {
      console.log(comments);
    });
  });
});
```

### Good Practice: Flat Chaining
Return the next Promise inside `.then()` to keep execution chains flat and readable.

```javascript
// Good: Linear pipeline
getUser(1)
  .then(user => {
    return getPosts(user.id); // Must return the Promise!
  })
  .then(posts => {
    return getComments(posts[0].id);
  })
  .then(comments => {
    console.log(comments);
  })
  .catch(error => {
    console.error("Pipeline failure:", error.message);
  });
```

### Best Practice: Clean Error Capture with Finally
Always clean up resources (like loading flags or database connections) inside a final `.finally()` block, which is guaranteed to execute.

```javascript
// Best Practice: State updates and cleanups
showSpinner(true);

fetchUserData(101)
  .then(user => {
    renderProfile(user);
  })
  .catch(error => {
    showErrorMessage(error.message);
  })
  .finally(() => {
    showSpinner(false); // Clean up state regardless of outcome
  });
```

---

## 8. Dry Run

Let's dry run a Promise resolution and microtask queue enqueueing:

```javascript
1: const promise = new Promise((resolve) => {
2:   resolve("Success");
3: });
4: promise.then((res) => console.log(res));
5: console.log("Done");
```

### Step-by-Step State
- **Line 1-3**:
  - GEC executes the Promise executor function synchronously.
  - V8 creates the `JSPromise` object in the Heap.
  - `resolve("Success")` is called.
  - `[[PromiseState]]` transitions from `"pending"` to `"fulfilled"`.
  - `[[PromiseResult]]` is set to `"Success"`.
- **Line 4**:
  - `promise.then()` registers the callback.
  - Since the state is already `"fulfilled"`, V8 doesn't wait. It pushes the callback `(res) => console.log(res)` directly to the Microtask Queue.
- **Line 5**:
  - Logs `"Done"`.
  - GEC finishes. Call Stack is empty.
- **Microtask Loop**:
  - Event Loop pulls the callback from the queue.
  - Pushes it to the Call Stack with parameter `res = "Success"`.
  - Logs `"Success"`.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to return a value/Promise inside a `.then()` block.**
    ```javascript
    getUser(1)
      .then(user => { getPosts(user.id); }) // Missing return!
      .then(posts => { console.log(posts); }); // Output: undefined
    ```
- **Mistake 2: Missing the `.catch()` handler.**
    If a Promise rejects and there is no catch handler registered, V8 triggers a global `UnhandledPromiseRejection` event, which can crash Node.js servers in production.

---

## 10. Debugging

### Inspecting Promise Objects in Chrome Console
To diagnose active Promise states:
1. Type a Promise in Chrome console:
    ```javascript
    const p = Promise.resolve(42);
    console.log(p);
    ```
2. Expand the logged `Promise` object:
    - Locate the properties:
      - `[[PromiseState]]`: `"fulfilled"`
      - `[[PromiseResult]]`: `42`

If your code is stuck, inspect the object to see if `[[PromiseState]]` is stuck in `"pending"`, indicating that your executor function forgot to call `resolve()` or `reject()`.

---

## 11. Real World Usage

- **Fetch API**: Browsers fetch network data using Promises: `fetch(url).then(r => r.json())`.
- **Database libraries**: Modern ORMs (like Mongoose or Prisma) use Promises to execute queries: `User.find().then(users => {})`.

---

## 12. Interview Preparation

### Question: What is the output of the executor function if you call resolve twice inside a Promise?
- **Wrong Answer**: It will execute twice, logging two separate outputs.
- **Good Answer**: A Promise can only transition its state once (e.g. from `pending` to `fulfilled`). Once resolved or rejected, the Promise's state is sealed in the Heap. Calling `resolve()` a second time is ignored by the engine, and the value stays locked to the first invocation.

---

## 13. Practice

### Exercises
1. **Easy**: Create a Promise that resolves after a 2-second timeout and logs the result.
2. **Medium**: Write a function `getFile(path)` that wraps Node's callback-based `fs.readFile` and returns a Promise (Promisification).
3. **Hard**: Predict the output of this chain where one `.then` returns a value, and the next throws an error.

---

## 14. Mini Assignment

Write a function `validateAge(age)` returning a Promise. Resolve if age is 18+, reject if under 18, and handle both states using `.then` and `.catch`.

---

## 15. Mini Project

Create a mock HTTP client `mockFetch(url, delay)` that simulates a database request, returning a Promise that resolves with mockup JSON users data or rejects if the url is invalid.

```javascript
// mock-fetch-client.js
function mockFetch(url, delay = 1000) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to: ${url}...`);

    setTimeout(() => {
      if (url.includes("/api/users")) {
        resolve({
          status: 200,
          data: [{ id: 1, name: "Zara" }, { id: 2, name: "Ishan" }]
        });
      } else {
        reject(new Error(`404: Endpoint "${url}" not found`));
      }
    }, delay);
  });
}

// Test case: Valid endpoint
mockFetch("/api/users")
  .then(response => console.log("Loaded Data:", response.data))
  .catch(error => console.error("Error:", error.message));

// Test case: Invalid endpoint
mockFetch("/api/billing")
  .then(response => console.log(response))
  .catch(error => console.error("Caught Exception:", error.message));
```

---

## 16. Chapter Summary

- A **Promise** manages asynchronous results using states.
- State flows from **Pending** to either **Fulfilled** or **Rejected**.
- V8 stores states in internal **`[[PromiseState]]`** and **`[[PromiseResult]]`** slots.
- Attach **`.catch()`** to handle chained errors and **`.finally()`** for cleanups.

---

## 17. Quiz

1. What are the three possible states of a Promise?
2. Can a Promise change its state after transitioning to fulfilled?
3. What happens to returned values inside a `.then()` handler block?

---

## 18. Next Chapter Preview

In the next chapter, we will learn about **Promise Combinators**. We will explore how to manage multiple asynchronous operations in parallel using `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`.

---

## 19. Completion Checklist

- [ ] I can create and execute Promise constructors.
- [ ] I understand Promise state transition behaviors.
- [ ] I can write flat Promise chains with catch handles.
- [ ] I know how to check Promise status properties in Chrome DevTools.
