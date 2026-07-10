# The Event Loop & Queues

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding of the Call Stack and asynchronous callbacks
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a busy clerk at a bank counter:

1. **Call Stack**: You are processing the customer standing directly in front of you (synchronous task execution). You cannot look away or talk to anyone else until this customer's paperwork is finished.
2. **Web APIs**: A customer needs their passport verified. This takes 10 minutes. You don't make them block the queue. You send them to the Verification Office down the hall (Web API background thread).
3. **Microtask Queue (VIP Line)**: Customers returning from the Verification Office with complete stamps go into a special priority lane.
4. **Macrotask Queue (Regular Line)**: Regular mail pickups and non-urgent deliveries queue in a second lane outside the door.

Here are your working rules:
- Finish processing the customer in front of you.
- Once the counter is empty, you **must** serve **everyone** in the VIP Line (Microtask Queue) first. Even if new VIPs arrive while you are serving them, you keep serving VIPs.
- Once the VIP Line is completely empty, you perform a quick room cleanup and paint updates (UI Render updates).
- Only then do you serve **one** customer from the Regular Line (Macrotask Queue). After processing that one customer, you check the VIP line again.

This workflow is the **Event Loop**.

---

## 2. Problem

JavaScript is single-threaded, meaning it has only one Call Stack and can do only one thing at a time.

If JavaScript had to fetch a database payload, wait for a network response, and run page click animations simultaneously, a single-threaded system would stutter and lock up.

We need a way to schedule asynchronous tasks without spawning multi-threaded processor safety locks.

---

## 3. Solution

JavaScript utilizes the **Event Loop** architecture.

By offloading blocking tasks (like network calls, files, and timers) to the browser runtime (Web APIs) or Node's background threads, the main thread continues running.

The Event Loop coordinates the transfer of finished tasks from the background queues back onto the Call Stack, ensuring priority tasks execute first.

---

## 4. Definition

- **Event Loop**: A continuous engine-loop mechanism that monitors the Call Stack and the task queues, determining when to push completed asynchronous tasks onto the stack.
- **Macrotask (Callback) Queue**: A queue containing tasks like `setTimeout`, `setInterval`, network I/O, and user events.
- **Microtask Queue**: A high-priority queue containing tasks like Promise handlers (`.then`, `.catch`), `queueMicrotask`, and `MutationObserver` callbacks.

---

## 5. Visualization

### The Event Loop Architecture

```
  [ Call Stack ]               [ Web APIs (Browser) ]
  (Main Thread)                - Timers (setTimeout)
  - greet()                    - Fetch Requests
  - GEC                        - DOM Events
        |                                |
        v (When empty)                   v (When finished)
        |                      +------------------------+
        |<---------------------|  Microtask Queue (VIP) | <--- Promises
        |                      |  - promiseCallback     |
        |                      +------------------------+
        |                                ^
        |                                | (If empty, checks)
        |                      +------------------------+
        |<---------------------| Macrotask Queue (Reg)  | <--- setTimeouts
                               |  - timeoutCallback     |
                               +------------------------+
```

---

## 6. Internal Working

V8 executes tasks in a strict loop sequence (the Event Loop cycle):

1. **Call Stack Clearance**: V8 executes all synchronous statements on the Call Stack. The stack must be completely empty before checking queues.
2. **Microtask Queue Processing**:
    - V8 looks at the Microtask Queue.
    - It processes tasks one-by-one until the queue is **completely empty**.
    - If a microtask adds *another* microtask to the queue, V8 will execute that new task during the same cycle. This can lead to main-thread starvation if not managed carefully.
3. **UI Render Check**: The browser determines if it needs to update the display (usually every 16.7ms for 60fps). If yes, it performs styling calculations and repaints.
4. **Macrotask Execution**:
    - V8 checks the Macrotask Queue.
    - It pulls and executes **exactly one** task from the top of the queue.
    - Once that single task completes, execution returns to step 1 (clearing the stack and checking the Microtasks queue again).

---

## 7. Code Examples

### Bad Practice: Blocking the Event Loop
Executing heavy CPU computations on the main Call Stack blocks the Event Loop, freezing the UI.

```javascript
// Bad: Blocks the thread for several seconds
function blockMainThread() {
  console.log("Starting calculation...");
  let start = Date.now();
  // Infinite check loop for 3 seconds
  while (Date.now() - start < 3000) {
    // CPU is running at 100%
  }
  console.log("Finished calculation!");
}

blockMainThread();
// Any user clicks during these 3 seconds are delayed!
```

### Good Practice: Non-Blocking Execution Partitioning
If you have massive computations, break them into smaller chunks and schedule them using timers to let the Event Loop process render ticks.

```javascript
// Good: Yields control back to the Event Loop periodically
function calculateInChunks(totalIterations, chunkCount) {
  let current = 0;

  function runChunk() {
    const end = Math.min(current + chunkCount, totalIterations);
    for (let i = current; i < end; i++) {
      // Perform math
    }
    current = end;

    if (current < totalIterations) {
      // Schedule the next chunk, yielding control
      setTimeout(runChunk, 0); 
    } else {
      console.log("Chunk processing complete.");
    }
  }

  runChunk();
}
```

### Best Practice: Prioritizing Microtasks
Use `queueMicrotask()` for high-priority tasks that must execute immediately after the current call frame, but before yielding to rendering or timers.

```javascript
// Best Practice: Clear priority separation
console.log("Start");

setTimeout(() => console.log("Timeout (Macrotask)"), 0);

Promise.resolve().then(() => console.log("Promise (Microtask)"));

queueMicrotask(() => console.log("Direct Microtask"));

console.log("End");

// Output Order:
// 1. "Start"
// 2. "End"
// 3. "Promise (Microtask)"
// 4. "Direct Microtask"
// 5. "Timeout (Macrotask)"
```

---

## 8. Dry Run

Let's dry run the execution priority order:

```javascript
1: setTimeout(() => console.log("A"), 0);
2: Promise.resolve().then(() => {
3:   console.log("B");
4:   queueMicrotask(() => console.log("C"));
5: });
6: console.log("D");
```

### Step-by-Step State
- **Phase 1 (Global Context Execution)**:
  - Line 1: `setTimeout` schedules `"A"` in Web API. Moved to Macrotask Queue.
  - Line 2: `Promise.resolve()` schedules callback `"B"` directly into the Microtask Queue.
  - Line 6: Logs `"D"`. GEC pops. Call Stack is empty.
- **Phase 2 (Check Microtask Queue)**:
  - V8 checks the Microtask Queue: finds `"B"`. Pushes to stack.
  - Logs `"B"`.
  - Line 4 runs: `queueMicrotask()` schedules `"C"` into the Microtask Queue.
  - Callback `"B"` pops.
- **Phase 3 (Emptying Microtask Queue)**:
  - V8 checks the Microtask Queue: finds `"C"`. Pushes to stack.
  - Logs `"C"`.
  - Callback `"C"` pops. Microtask Queue is now empty.
- **Phase 4 (Macrotask Execution)**:
  - V8 checks the Macrotask Queue: finds `"A"`. Pushes to stack.
  - Logs `"A"`.
  - Call Stack is empty.

---

## 9. Common Mistakes

- **Mistake 1: Assuming `setTimeout(fn, 1000)` executes in exactly 1000ms.**
    If the Call Stack is blocked by a heavy calculation that takes 5 seconds, the timer callback sits in the queue waiting. It will execute only *after* the stack is empty (at 5 seconds).
- **Mistake 2: Starving the Macrotask Queue.**
    Creating recursive microtask calls (e.g. a promise resolver that calls itself recursively) keeps the Microtask Queue perpetually full. The Event Loop can never reach the rendering or Macrotask stages, freezing the page.

---

## 10. Debugging

### Profiling Call Stack Execution Ticks
To analyze Event Loop bottlenecks:
1. Open Chrome DevTools.
2. Navigate to the **Performance** tab.
3. Click **Record** (the circle icon) and reload or interact with your page.
4. Stop recording and examine the timeline:
    - Look for red flags labeled **Long Task**.
    - Hover over these blocks to see the execution trace.
    - If a task takes longer than 50ms, it blocks the main thread.
    - You can inspect the call stack underneath the Long Task to locate which function is holding up the Event Loop.

---

## 11. Real World Usage

- **React State Batching**: React queues state updates inside microtasks. When you set state 3 times inside a function, React batches them and runs a single re-render pass inside a microtask check, avoiding 3 immediate repaints.
- **Node.js process.nextTick**: Node has a custom `nextTick` queue that runs even *before* the Microtask Queue, allowing developers to execute cleanups before V8 leaves the call stack frame.

---

## 12. Interview Preparation

### Question: Why do Promises execute before `setTimeout` even if both have a delay of 0ms?
- **Wrong Answer**: Because Promises are faster.
- **Good Answer**: This is due to queue priorities in the Event Loop. Promises resolve their handlers (`.then`, `.catch`) into the **Microtask Queue**, whereas `setTimeout` callbacks go into the **Macrotask Queue**. According to the specification, once the Call Stack is clear, the Event Loop must process all items in the Microtask Queue before it can pull and run the oldest task from the Macrotask Queue.

---

## 13. Practice

### Exercises
1. **Easy**: Predict the output order:
    ```javascript
    console.log("1");
    setTimeout(() => console.log("2"), 10);
    setTimeout(() => console.log("3"), 0);
    console.log("4");
    ```
2. **Medium**: Write a script that uses `queueMicrotask` to schedule log operations, showing they run before standard timeouts.
3. **Hard**: Write a script that causes Main Thread Starvation using Promises, proving that the page animations freeze.

---

## 14. Mini Assignment

Write a benchmark checking if `setTimeout(fn, 0)` is delayed if you run a loop of 1,000,000 prints on the stack before it. Print the delay offset.

---

## 15. Mini Project

Create a task scheduling manager `EventBatcher` that queues heavy logging operations into the Microtask Queue, execution-grouping them to run right after the current function call finishes.

```javascript
// event-batcher.js
class EventBatcher {
  constructor() {
    this.batch = [];
    this.scheduled = false;
  }

  addEvent(event) {
    this.batch.push(event);
    
    // Schedule batch processing using a microtask
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  flush() {
    console.log(`--- Processing Batch of ${this.batch.length} Events ---`);
    console.table(this.batch);
    this.batch = [];
    this.scheduled = false;
  }
}

const batcher = new EventBatcher();
console.log("Program starts");
batcher.addEvent({ type: "CLICK", element: "button-1" });
batcher.addEvent({ type: "HOVER", element: "link-5" });
console.log("Program ends");

// Output shows events batched and processed right after "Program ends"
```

---

## 16. Chapter Summary

- JavaScript uses the **Event Loop** for concurrent, non-blocking operations.
- The **Call Stack** runs synchronous code. The **Web APIs** execute background tasks.
- **Microtasks** (Promises) take priority over **Macrotasks** (setTimeout).
- The Microtask Queue must be completely empty before V8 runs a single Macrotask.

---

## 17. Quiz

1. Which queue does `setTimeout` callback go into?
2. Does a microtask run before or after browser repaints?
3. What happens if you queue a new microtask recursively from inside a microtask?

---

## 18. Next Chapter Preview

Now that we understand the Event Loop and task queues, we need to look at the modern abstraction built to handle asynchronous operations cleanly. In the next chapter, we will study **Promises**, exploring states, chaining methods, and error handling.

---

## 19. Completion Checklist

- [ ] I can describe the difference between Macrotasks and Microtasks.
- [ ] I understand the prioritization rules of the Event Loop.
- [ ] I can explain what a long task is and why it freezes the UI.
- [ ] I know how to check performance metrics in the browser DevTools.
