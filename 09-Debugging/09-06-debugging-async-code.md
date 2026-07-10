# Debugging Asynchronous Code

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Promises, async/await, and the Event Loop
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a detective tracking a package delivery network:

- **Synchronous Stack Trace is like a physical chain of delivery drivers**: Driver A hands the box to Driver B, who hands it to Driver C, who drops it. If Driver C drops the box, they are all standing in the same room. You can interview them all together on the spot (Call Stack is intact).
- **Asynchronous Stack Trace is like dropping a letter in a mailbox**: You write a letter, drop it in the mailbox (schedule a `setTimeout` or Promise), and go home to sleep. The mail truck collects it 10 hours later, the sorting center processes it, and a delivery driver drops the letter in the recipient's mud. When the recipient complains, the delivery driver has no idea who wrote the letter; the original creator is no longer connected to the event (stack trace gets cut off at the asynchronous boundary).
- **Promise Inspection is like checking a package's smart tracker**: Inside the box is a screen showing the status: `"En Route"` (Pending), `"Delivered"` (Fulfilled), or `"Damaged"` (Rejected), along with the internal content.

In JavaScript, **Async Stack Traces** bridge these asynchronous boundaries.

---

## 2. Problem

As applications rely on `async/await` and Promises:
- Error stack traces often get cut off at asynchronous boundaries, only displaying the internal Event Loop or microtask tick frames, making it impossible to identify which function triggered the async action.
- JavaScript provides no native code properties to check if a Promise is pending or completed programmatically, hiding their states.
- Async operations can execute in the wrong order (race conditions), causing out-of-sync state updates.

---

## 3. Solution

We master **Async Debugging Tools**:
1. **V8 Async Stack Traces**: Configuring engines to reconstruct execution chains across async boundaries.
2. **Promise Slot Inspection**: Using DevTools to check `[[PromiseState]]` and `[[PromiseResult]]` slots.
3. **Race Condition Diagnostics**: Adding logpoint markers to trace the order of asynchronous actions.

---

## 4. Definition

- **Async Stack Trace**: A reconstructed stack trace that links the call stack of an asynchronous callback to the stack context where the async operation was originally scheduled.
- **Internal Slots**: Private debugger-only slots (like `[[PromiseState]]`) that expose engine-level properties not accessible in standard code.
- **Race Condition**: An undesirable situation that occurs when a system's behavior depends on the sequence or timing of uncontrollable asynchronous events.

---

## 5. Visualization

### Reconstructed Async Stack Trace

When an error is thrown inside a delayed promise callback:

```
   third() (thrown inside macro/microtask queue)
          |
   ================= ASYNC BOUNDARY (Event Loop Tick) =================
          |
   second() (scheduled the promise/timeout)
          |
   first()  (original transaction root)
```

The debugger stitches the two halves together, showing the full path from `first()` to `third()` across the Event Loop gap.

---

## 6. Internal Working

How V8 tracks asynchronous context:

1. **Zero-Cost Async Stack Traces**: When a function suspends on an `await` statement, V8 allocates a Promise. To trace errors, V8 stores the current Call Stack's **return address and structure pointers** inside the suspended Promise's Heap space.
2. **Stack Reconstruction**: If the Promise rejects, V8 retrieves these stored pointers and appends them to the current call stack trace, creating the `async` call trace segment.
3. **Promise Slots**: When you inspect a Promise in DevTools, the engine queries the V8 internal properties:
    - **`[[PromiseState]]`**: Shows `pending`, `fulfilled`, or `rejected`.
    - **`[[PromiseResult]]`**: Shows the resolved value or rejection error.

---

## 7. Code Examples

### Bad Practice: Uncaught Rejections with Missing stack traces
Omitting error wrappers inside async promises hides the original call location.

```javascript
// Bad: Swallows trace or prints cut-off error
function fetchUser(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // If an error is thrown here, the stack trace ends at setTimeout!
      reject(new Error(`Failed to fetch user: ${userId}`)); 
    }, 100);
  });
}

fetchUser(101).catch(err => {
  console.error(err.stack); // Stack trace starts at setTimeout, missing the caller!
});
```

### Good Practice: async/await for Trace Preservation
Using `async/await` allows V8 to preserve the complete call stack across execution boundaries.

```javascript
// Good: Complete call stack preservation
const fetchUser = async (userId) => {
  await delay(100); // Simulate network
  throw new Error(`Failed to fetch user: ${userId}`);
};

const displayDashboard = async () => {
  await fetchUser(101); // Call stack linked here!
};

displayDashboard().catch(err => {
  console.error(err.stack); // Prints full trace from displayDashboard down to fetchUser
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
```

### Best Practice: Promise State Inspection
Since you cannot access the state of a Promise in code, inspect its internal slots using the debugger.

```javascript
// Best Practice: Inspecting Promise state in debugger
const getApiResponse = () => {
  return new Promise(resolve => {
    setTimeout(() => resolve({ status: "success" }), 5000);
  });
};

const apiPromise = getApiResponse();

// How to inspect:
// 1. Set a breakpoint on the line below.
// 2. Open the VARIABLES pane in VS Code (or Scope pane in DevTools).
// 3. Locate the "apiPromise" variable and expand it.
// 4. Look for the double-bracketed internal debugger slots:
//    - [[PromiseState]]: "pending" (changes to "fulfilled" after 5s)
//    - [[PromiseResult]]: undefined (changes to { status: "success" })
console.log("Promise status checked in debugger.");
```

---

## 8. Dry Run

Let's dry run tracing a race condition:

```javascript
let activeQuery = "";
async function handleSearch(query) {
  activeQuery = query;
  const result = await fetchResults(query); // Line 1
  if (activeQuery === query) { // Line 2
    renderResults(result);
  }
}
```

### Race Condition Scenario
- **0ms**: User types `"a"`. `handleSearch("a")` runs. `activeQuery` is set to `"a"`.
  - Fetch starts. Suspends on Line 1.
- **100ms**: User types `"ab"`. `handleSearch("ab")` runs. `activeQuery` is updated to `"ab"`.
  - Fetch starts. Suspends on Line 1.
- **300ms**: Fetch for `"ab"` finishes first (fast response).
  - Resumes on Line 2. Is `activeQuery === "ab"`? Yes. Renders `"ab"` results.
- **400ms**: Fetch for `"a"` finishes late (slow response).
  - Resumes on Line 2. Is `activeQuery === "a"`? No (it is `"ab"`).
  - Skip rendering. Prevent overwriting new search results with old data. (Race condition avoided!)

---

## 9. Common Mistakes

- **Mistake 1: Throwing errors inside synchronous callbacks that are wrapped in a Promise.**
    ```javascript
    new Promise((resolve, reject) => {
      throw new Error("fail"); // Good: Caught automatically
    });
    
    new Promise((resolve, reject) => {
      setTimeout(() => {
        throw new Error("fail"); // Bad: Escapes the promise boundary and crashes the process!
      }, 100);
    });
    ```
    *Fix*: Always pass errors to `reject(error)` inside asynchronous callbacks.

- **Mistake 2: Missing async stack trace limits in Node.js.**
    By default, old Node versions cap stack trace frames at 10. Increase it during debugging:
    `Error.stackTraceLimit = Infinity;`

---

## 10. Debugging

### Tracing Async Call Stacks in Chrome DevTools
To view your asynchronous call trace history:
1. Open Chrome DevTools.
2. Navigate to the **Sources** tab.
3. On the right panel, check the box labeled **Async** under the Call Stack section (usually checked by default).
4. Set a breakpoint inside an asynchronous callback (e.g. inside a `.then()` or after an `await` line).
5. Trigger the execution:
      - Look at the **Call Stack** pane.
      - You will see the active stack frame list.
      - Below, you will see a divider line labeled **`Async call`**.
      - Expand it to inspect the function frames that originally scheduled the asynchronous action, allowing you to trace the transaction back to its root.

---

## 11. Real World Usage

- **Redux-Saga Async Trace Logs**: Middleware tools log complete asynchronous dispatch paths to help developers trace which component actions triggered api calls.
- **Database Transaction Profiles**: Backend servers trace asynchronous database connection pools to isolate queries that hang or timeout.

---

## 12. Interview Preparation

### Question: Why do errors thrown inside a `setTimeout` callback escape `try-catch` blocks?
- **Wrong Answer**: Because `setTimeout` runs in a separate file.
- **Good Answer**: Because `try-catch` blocks operate synchronously on the active Call Stack. When `setTimeout(callback, 1000)` is called, the engine registers the timer and immediately pops the outer function (including the `try-catch` block) off the Call Stack. One second later, the Event Loop pushes the callback onto the stack. By this time, the `try-catch` block is gone from the stack, so the error goes uncaught and crashes the application.

---

## 13. Practice

### Exercises
1. **Easy**: Write an async function that throws an error, and print the resulting stack trace to verify the async call stack is recorded.
2. **Medium**: Write a script demonstrating a race condition between two dynamic image loaders, showing how to discard stale image response results.
3. **Hard**: Implement a wrapper function `trackPromiseState(promise)` that uses a sync check to query a promise's current state (pending/fulfilled/rejected) by caching states on resolution callbacks.

---

## 14. Mini Assignment

Write an async function that catches database network failures and appends a context label to the stack trace before re-throwing the error.

---

## 15. Mini Project

Create a mock asynchronous API dispatch system `AsyncDispatcher`. Set up a test script that triggers a network response failure, and document the step-by-step instructions to trace the async call stack back to the original dispatch button.

```javascript
// async-trace-project.js
const mockApiFetch = async (endpoint) => {
  await delay(100);
  if (endpoint === "secure-data") {
    throw new Error("Authorization token missing from request headers");
  }
  return { data: "public" };
};

const dispatchApiCall = async (endpoint) => {
  console.log(`Dispatching call to: ${endpoint}`);
  return await mockApiFetch(endpoint); // Line 12
};

const handleButtonClick = async () => {
  try {
    await dispatchApiCall("secure-data"); // Line 17
  } catch (error) {
    console.error("--- Diagnostic Stack Trace Captured ---");
    console.error(error.stack);
    // DEBUGGING INSTRUCTIONS:
    // 1. Run this file using VS Code Debugger.
    // 2. Set a breakpoint on Line 8 (throw new Error).
    // 3. Inspect the CALL STACK panel.
    // 4. Confirm the trace chain shows:
    //    - mockApiFetch (Line 8)
    //    - dispatchApiCall (Line 12)
    //    - handleButtonClick (Line 17)
  }
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

handleButtonClick();
```

---

## 16. Chapter Summary

- **Async Stack Traces** link call stacks across Event Loop ticks.
- `async/await` syntax helps preserve stack traces better than raw callbacks.
- Inspect internal slots **`[[PromiseState]]`** and **`[[PromiseResult]]`** in debuggers.
- Errors thrown inside async callbacks must be passed to **`reject()`** or they will go uncaught.

---

## 17. Quiz

1. What V8 feature enables tracing calls across asynchronous boundaries?
2. Can you access the value of `[[PromiseState]]` using code like `promise.state`?
3. Why does V8 require Promise stack trace storage to be zero-cost?

---

## 18. Next Chapter Preview

In the next chapter, we will study **DOM & Event Debugging**. We will explore how to break on DOM mutations, inspect event listener paths, and trace event origins.

---

## 19. Completion Checklist

- [ ] I understand how async stack traces are reconstructed across Event Loop ticks.
- [ ] I can check `[[PromiseState]]` and `[[PromiseResult]]` inside the debugger.
- [ ] I know how to handle and capture uncaught promise rejections.
- [ ] I can identify and resolve asynchronous race conditions.
