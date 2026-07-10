# JS Core Engine

- **Difficulty Level**: Beginner to Advanced
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Basic understanding of memory scopes, execution contexts, and async tasks
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a busy office worker managing paper files on a desk:

- **The Call Stack is the stack of pending folders on your desk**: You place folder A on your desk. While reading folder A, it tells you to read sub-folder B. You place folder B on top of A. You must finish reading folder B, remove it from the stack, and then finish reading folder A.
- **The Heap is the archive filing cabinet in the corner**: If a folder holds a heavy document folder (nested object/array), you store it in the filing cabinet and only write a label matching the cabinet drawer ID (memory reference pointer) on your desk folder.
- **The Execution Context is your active work session**: Opening a folder creates a session.
  - **Creation Phase**: You organize your pencils and read the index labels of pages inside the folder (hoisting variables).
  - **Execution Phase**: You read the text and write values on the lines.
- **The Event Loop is a delivery clerk outside your office**: The clerk waits until your desk stack is completely empty. Once empty, they check the incoming mail basket (callback queue) and deliver the next folder onto your desk.

In JavaScript, the **V8 Engine** coordinates this office workflow.

---

## 2. Problem

Developers often get confused by the execution order of synchronous and asynchronous lines of code, or introduce memory leaks because they do not understand how execution contexts, scope chains, heap closures, and call stacks interact.

---

## 3. Solution

This chapter serves as a **Quick-Reference Cheat Sheet** summarizing the internal workings, structures, and lifecycle behaviors of the JavaScript Core Engine.

---

## 4. Definition

- **V8 Engine**: The open-source, high-performance JavaScript and WebAssembly engine developed by Google, written in C++ and used in Google Chrome and Node.js.
- **Call Stack**: A LIFO (Last In, First Out) stack structure used to keep track of function executions.
- **Memory Heap**: A large, unstructured memory region used to store reference objects like arrays, functions, and objects.

---

## 5. Visualization

### Call Stack vs Heap Mapping

```
   CALL STACK (LIFO)                    MEMORY HEAP (Unstructured)
   ┌───────────────────────┐            ┌───────────────────────────┐
   │ execute() context     │ ──Ref───>  │ User Object {             │
   ├───────────────────────┤            │   name: "Zara",           │
   │ init() context        │            │   roles: [...]            │
   ├───────────────────────┤            │ }                         │
   │ Global context        │            └───────────────────────────┘
   └───────────────────────┘
```

The stack holds execution contexts containing primitive variables and reference address pointers. The heap stores the actual reference objects.

---

## 6. Internal Working

How V8 handles execution contexts:

1. **Creation Phase**: When a function is called, the engine creates its Execution Context:
    - Creates the Outer Scope Chain Link (Lexical Environment).
    - Scans for variable declarations (hoisting) and initializes `var` as `undefined` and functions as complete references.
    - Resolves the `this` binding value.
2. **Execution Phase**: The engine reads code line-by-line, assigning values and executing function calls.
3. **Garbage Collection**: V8 uses a Generational Collector:
    - **Nursery / Young Generation**: Cleaned frequently using the fast Scavenger algorithm.
    - **Old Generation**: Cleaned using Mark-Sweep-Compact cycles when objects survive young generation GC sweeps.

---

## 7. Code Examples

### Reference Card: Call Stack & Heap Structures
Comparing primitive values vs reference types in memory allocation.

| Memory Type | Data Allocation | Lifetime | Access Speed |
| :--- | :--- | :--- | :--- |
| **Call Stack** | Primitive values (`number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`), execution contexts, reference pointers. | Managed automatically by execution scope. Pops when function exits. | Extremely fast. |
| **Memory Heap** | Reference types (`object`, `array`, `function`, `Map`, `Set`). | Managed by Garbage Collector. Persists until unreferenced. | Slower (requires pointer resolution). |

```javascript
// Memory Allocation Example
const age = 25; // Stack: Stores value 25
const user = { name: "Zara" }; 
// Stack: Stores pointer address (e.g. 0x00FF)
// Heap: Stores { name: "Zara" } at address 0x00FF
```

### Reference Card: Execution Context Phases
Understanding Creation vs Execution phases during compilation.

```javascript
// Target Code
showUser("Zara");

function showUser(name) {
  var role = "Admin";
  console.log(name, role);
}
```

```
   1. Creation Phase (Before running first line):
      - showUser variable points to complete function declaration (hoisted).
      - Executes parameter mapping: name = "Zara".
      - var role is hoisted and initialized as: role = undefined.
  
   2. Execution Phase (Line-by-line run):
      - Executes showUser("Zara").
      - role is assigned: role = "Admin".
      - Runs console.log("Zara", "Admin").
```

### Reference Card: Event Loop Priorities
Differentiating asynchronous task queues.

| Task Queue | Trigger Examples | Execution Priority |
| :--- | :--- | :--- |
| **Microtask Queue** | `Promise.prototype.then()`, `queueMicrotask()`, `MutationObserver` | **High**. Drains completely before yielding to render or macrotask loops. |
| **Macrotask Queue** | `setTimeout()`, `setInterval()`, `setImmediate()`, I/O events, User clicks | **Low**. Executes at most one task per event loop tick. |
| **Render Queue** | `requestAnimationFrame()` | **Medium**. Syncs with browser monitor refresh rates (e.g. 60Hz/120Hz). |

---

## 8. Dry Run

Let's dry run the execution timeline of this async snippet:

```javascript
console.log("Start");
setTimeout(() => console.log("Timeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("End");
```

- **0ms (Synchronous execution)**:
  - Prints `"Start"`.
  - `setTimeout` registers callback in Web API timer list. Timer expires immediately, pushing callback to Macrotask Queue.
  - `Promise.resolve().then(...)` registers callback in Microtask Queue.
  - Prints `"End"`.
  - Call Stack is now empty.
- **Microtask Loop**:
  - Event Loop intercepts empty Call Stack.
  - Prioritizes Microtask Queue. Runs the Promise callback.
  - Prints `"Promise"`.
  - Microtask Queue is now empty.
- **Macrotask Loop**:
  - Event Loop pulls first task from Macrotask Queue.
  - Runs the setTimeout callback.
  - Prints `"Timeout"`.
- **Final Output Order**: `Start` -> `End` -> `Promise` -> `Timeout`.

---

## 9. Common Mistakes

- **Mistake 1: Blocking the Event Loop with heavy loops.**
    ```javascript
    // Bad: Blocks the Call Stack for 5 seconds, freezing the browser!
    const start = Date.now();
    while (Date.now() - start < 5000) {}
    ```
    *Fix*: Break down heavy calculations using chunking patterns or run them in Web Workers.

- **Mistake 2: Assuming `setTimeout(fn, 0)` executes in exactly 0 milliseconds.**
    `setTimeout` scheduling is restricted by browser minimum clamp times (4ms on nested timers) and wait times in the macrotask queue.

---

## 10. Debugging

### Profiling Call Stack Frames in Chrome Sources
To inspect active execution contexts:
1. Open Chrome DevTools.
2. Set a breakpoint inside a nested function callback.
3. Trigger the execution.
4. Look at the **Call Stack** accordion panel on the right:
    - It lists the active functions in execution order (top-to-bottom).
    - Click any frame to inspect its local scoped variables inside the **Scope** panel.

---

## 11. Real World Usage

- **Performance Auditing**: Minimizing heap sizes and optimizing garbage collection triggers in high-performance web applications.
- **Node.js Servers**: Managing asynchronous file streaming I/O loops safely.

---

## 12. Interview Preparation

### Question: Explain the Event Loop and how it handles Microtasks and Macrotasks
- **Wrong Answer**: It compiles tasks in parallel and runs them using thread pools.
- **Good Answer**: The Event Loop is a single-threaded coordinator that monitors the Call Stack and the task queues.
    1. First, it executes all synchronous code on the Call Stack.
    2. Once the Call Stack is empty, it checks the **Microtask Queue** (holding Promise callbacks) and drains it completely.
    3. It then yields to the **Render Queue** (like requestAnimationFrame) if a paint cycle is scheduled.
    4. Finally, it picks the first task from the **Macrotask Queue** (setTimeout/setInterval), pushes it to the Call Stack to execute, and restarts the loop.

---

## 13. Practice

### Exercises
1. **Easy**: Write a script containing console logs, a promise, and a setTimeout, and verify its execution order in the terminal.
2. **Medium**: Write a function that creates a closure and verify that its lexical scope variables are persisted in the heap using the debugger's watch list.
3. **Hard**: Write a script that uses `queueMicrotask` to schedule a recursive microtask, and observe how it blocks `setTimeout` callbacks from executing (demonstrating microtask priority starvation).

---

## 14. Mini Assignment

Write a timing script that measures the actual delay of a `setTimeout(..., 10)` call when a heavy loop runs on the main thread.

---

## 15. Mini Project

Create a single-file interactive Event Loop Simulator that visualizes task queues, call stacks, microtasks, and macrotasks step-by-step in the DOM.

```html
<!-- event-loop-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Event Loop Simulator</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .box { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
    .queue { display: flex; gap: 10px; min-height: 40px; border: 1px dashed red; padding: 5px; }
    .item { background: lightgrey; padding: 5px 10px; border-radius: 3px; }
  </style>
</head>
<body>
  <h2>Event Loop Simulator Console</h2>
  <button id="trigger-btn">Run Async Code</button>
  
  <div class="box">
    <h4>Call Stack (Console)</h4>
    <div id="console-log"></div>
  </div>

  <script>
    const logEl = document.getElementById("console-log");
    
    function log(msg) {
      const p = document.createElement("p");
      p.textContent = msg;
      logEl.appendChild(p);
    }

    document.getElementById("trigger-btn").addEventListener("click", () => {
      logEl.innerHTML = "";
      log("1. Synchronous Start");

      setTimeout(() => {
        log("4. Macrotask (setTimeout) Executed");
      }, 0);

      Promise.resolve().then(() => {
        log("3. Microtask (Promise) Executed");
      });

      log("2. Synchronous End");
    });
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- The **Call Stack** manages LIFO function contexts.
- The **Memory Heap** stores reference objects.
- **Execution Contexts** have a Creation phase (hoisting) and an Execution phase.
- **Microtasks** (Promises) drain completely before **Macrotasks** (setTimeout) run.

---

## 17. Quiz

1. Which queue has higher priority: Microtasks or Macrotasks?
2. What is the scope chain?
3. Why are objects stored in the Heap instead of the Stack?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **DOM Manipulation & Events Cheat Sheet**. We will explore node selections, elements insertions, bubble phases, and event listeners.

---

## 19. Completion Checklist

- [ ] I understand the difference between the Call Stack and the Heap.
- [ ] I can explain the two phases of an Execution Context.
- [ ] I understand the execution priority of the Event Loop.
- [ ] I know how to profile call stacks in DevTools.
