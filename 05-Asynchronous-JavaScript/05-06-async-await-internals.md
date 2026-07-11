# Async / Await Internals

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding of Call Stack execution frames and Async/Await syntax
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are playing a complex console video game that does not have an auto-save feature.

When you need to stop playing to do chores, you don't keep the game running in active RAM. Instead, you press the **Pause Menu** button, select **"Save State"** (yield), and turn off the console (the call stack clears).

The console saves your exact coordinates, character inventory, active quests, and direction to the hard drive (Memory Heap).

When you return, you load the save file. The console reads the save state, reconstructs the game world to the exact frame where you paused, and lets you resume playing from that exact spot.

In JavaScript, **Generators** do exactly this. They are functions that can save their state mid-execution, step off the Call Stack, and resume later from the exact same bytecode instruction.

**Async/Await** is simply a generator wrapped in a promise loop that loads these "save states" automatically every time a promise completes.

---

## 2. Problem

Async/Await feels like magic: execution stops on `await` lines without blocking the thread, and local variables are somehow preserved across async ticks.

But how does a single-threaded runtime engine pause a function mid-way, clear its Call Stack, run other tasks, and then return to resume execution on the very next line?

Understanding this compilation secret is the key to mastering complex async stack traces and memory profiles.

---

## 3. Solution

We must examine **ES6 Generators (`function*`)** and the **Co-routine Runner** pattern.

Under the hood, transpilers (like Babel) and modern engine compilers (like V8) translate `async/await` directly into Generator functions where:
- `async` becomes `function*`.
- `await` becomes `yield`.
- The engine uses an automated **Promise Runner** function in the background that recursively calls the generator's `.next()` method as each promise resolves.

---

## 4. Definition

- **Generator Function**: A special function declared with `function*` that returns a `Generator` iterator object and can yield control back to the caller.
- **`yield` Keyword**: A statement that pauses generator execution, returns a value to the caller, and saves the active stack frame details.
- **Co-routine**: An execution entry point that allows cooperative multi-tasking by yielding control voluntarily.
- **Generator Runner**: A helper function that manages generator resolution loops by listening to returned promises.

---

## 5. Visualization

### Generator State Resumptions

For this generator sequence:
```javascript
function* myGen() {
  yield "Step 1";
  yield "Step 2";
}
```

```
   1. Initial Call              2. First .next()             3. Second .next()
  
  +------------------+         +------------------+         +------------------+
  | GEC: myGen() ----+-------> | myGen() Context  | ----+-> | myGen() Context  |
  +------------------+         | - State: Suspended     |   | - State: Suspended
                               | - Offset: yield 1|     |   | - Offset: yield 2
                               +------------------+     |   +------------------+
                                        |               |            |
                                        v               |            v
                                 Returns: "Step 1"      +-----> Returns: "Step 2"
```

---

## 6. Internal Working

V8 compiles and manages generators using these heap and stack steps:

1. **Generator Object Allocation**: When a generator is invoked, V8 does not run the code. It allocates a `JSGeneratorObject` in the Heap.
2. **Context Saving**:
    - When V8 hits a `yield` statement:
    - It takes the active register frames, the program counter (current byte line), and local variable scopes.
    - It packages them into the `JSGeneratorObject` and stores them in the **Memory Heap**.
    - It pops the generator's execution frame off the **Call Stack**, clearing the thread.
3. **Context Restoration**:
    - When `.next(value)` is called:
    - V8 pulls the `JSGeneratorObject` from the Heap.
    - It recreates the stack frame, restores the variable scopes, injects the passed `value` as the output of the `yield` statement, and jumps the execution pointer back to the saved bytecode line.

---

## 7. Code Examples

### Bad Practice: Manual Generator Loop Tracking (Bypassing Runners)
Trying to resolve complex asynchronous operations by manually nesting `.then()` wrappers inside generator iterators is verbose and replicates callback hell.

```javascript
// Bad: Manual iterator loops
function* fetchSequence() {
  yield fetchUser(1);
}

const iterator = fetchSequence();
const firstPromise = iterator.next().value;
firstPromise.then(user => {
  console.log("User received manually:", user);
});
```

### Good Practice: Simple Generators with `.next()`
Use generators to manage custom iterable cycles synchronously.

```javascript
// Good: Standard step progression
function* stepProgress() {
  console.log("Start");
  const first = yield "Step 1 complete";
  console.log("Received value inside generator:", first);
  yield "Step 2 complete";
}

const gen = stepProgress();
console.log(gen.next().value);   // Prints: "Start" and returns "Step 1 complete"
console.log(gen.next("A").value); // Injects "A" as value of first, returns "Step 2 complete"
```

### Best Practice: The Async/Await Compiler Wrapper (Under the hood)
This is how compilers translate `async/await` into generators combined with a runner.

```javascript
// 1. The Async function we write:
async function getData() {
  const user = await fetchUser(1);
  const posts = await fetchPosts(user.id);
  return posts;
}

// 2. How the V8 compiler/Babel translates it under the hood:
function getDataCompiled() {
  // Convert async to generator
  return spawn(function* () {
    const user = yield fetchUser(1);
    const posts = yield fetchPosts(user.id);
    return posts;
  });
}

// 3. The Co-routine spawn/runner engine:
function spawn(generatorFunc) {
  return new Promise((resolve, reject) => {
    const iterator = generatorFunc();

    function step(nextFunc) {
      let result;
      try {
        result = nextFunc();
      } catch (e) {
        return reject(e);
      }

      if (result.done) {
        return resolve(result.value); // Final return resolved
      }

      // If promise yielded, wait for it to settle then loop
      Promise.resolve(result.value).then(
        val => step(() => iterator.next(val)), // Inject resolved data back
        err => step(() => iterator.throw(err)) // Inject rejection error
      );
    }

    step(() => iterator.next()); // Start the loop
  });
}
```

---

## 8. Dry Run

Let's dry run the compiled `spawn` runner execution:

```javascript
1: const runner = getDataCompiled();
```

### Step-by-Step State
- **Step 1 (Starting the generator)**:
  - `spawn` calls `iterator.next()`.
  - Generator starts, runs `fetchUser(1)` (which returns a pending promise), and hits the `yield` statement.
  - V8 saves generator state (offset: wait for user) in the Heap and returns `{ value: userPromise, done: false }`.
- **Step 2 (Waiting for resolution)**:
  - `spawn` receives `userPromise`. It runs `Promise.resolve(userPromise).then(callback)`.
  - Control exits the runner. Call Stack is empty.
- **Step 3 (Timer/Network resolves)**:
  - `userPromise` resolves with value `{ id: 10, name: "Ali" }`.
  - The success callback is pushed to the Microtask Queue.
  - Microtask runs: calls `iterator.next({ id: 10, name: "Ali" })`.
- **Step 4 (Resuming)**:
  - V8 restores the generator stack frame.
  - The variable `user` inside the generator is bound to `{ id: 10, name: "Ali" }`.
  - Generator resumes, calls `fetchPosts(10)`, and hits the second `yield` statement, starting the next step loop.

---

## 9. Common Mistakes

- **Mistake 1: Expecting generators to yield values automatically without calling `.next()`.**
    Simply invoking `myGen()` creates the iterator object but does not execute any code.
- **Mistake 2: Missing error bounds in runners.**
    If you yield a rejected promise and do not wrap it in a `try-catch` inside the generator, the runner's `iterator.throw(err)` call will crash the generator immediately.

---

## 10. Debugging

### Tracing Generator States
You can view the active state of generators inside the console:
1. Type in the console:
    ```javascript
    function* test() { yield 1; }
    const t = test();
    console.log(t);
    ```
2. Expand the logged Generator object:
    - Locate the properties:
      - `[[GeneratorState]]`: `"suspended"` (or `"executing"`, `"closed"`).
      - `[[GeneratorFunction]]`: reference to the `test` declaration.
      - `[[GeneratorReceiver]]`: context `this` bindings.

This visual inspection helps verify if a generator has run to completion (`"closed"`) or is still hanging in memory (`"suspended"`).

---

## 11. Real World Usage

- **Babel Compilations**: When compiling React/Node code to support older browser runtimes, Babel transpiles all `async/await` calls directly into generator functions using the `regenerator-runtime` library.
- **Redux Saga**: Redux Saga uses generator functions (`yield takeEvery(...)`, `yield call(...)`) to handle side effects in a structured, testable manner without using raw async/await.

---

## 12. Interview Preparation

### Question: How does `async/await` work under the hood?
- **Wrong Answer**: It compiles into multi-threaded runtime threads.
- **Good Answer**: Async/await is syntactic sugar built on top of ES6 Generators and Promises. The `async` function is compiled into a generator function (`function*`), and the `await` keywords are converted into `yield` statements. The engine uses an internal recursive runner function that executes the generator, receives the yielded promise, waits for it to resolve, and passes the resolved value back into the generator using `.next(value)` to resume execution.

---

## 13. Practice

### Exercises
1. **Easy**: Write a simple generator function that yields three different names.
2. **Medium**: Write a generator function that yields numbers of the Fibonacci sequence infinitely.
3. **Hard**: Implement a basic custom runner function that handles a generator yielding synchronous values only.

---

## 14. Mini Assignment

Write a generator that yields two promises. Write a manual promise handler loop (without using the spawn helper) that resolves both and outputs the results.

---

## 15. Mini Project

Create a custom async runner function `runAsync(generatorFunc)` that runs yielded promises in sequence, returning a final resolved Promise with the generator's return value.

```javascript
// custom-async-runner.js
function runAsync(generatorFunc) {
  return new Promise((resolve, reject) => {
    const gen = generatorFunc();

    function handle(result) {
      if (result.done) {
        return resolve(result.value);
      }

      // Convert any yielded value to a Promise
      Promise.resolve(result.value)
        .then(value => {
          // Feed resolved value back and loop
          handle(gen.next(value));
        })
        .catch(error => {
          // Throw error inside generator
          try {
            handle(gen.throw(error));
          } catch (e) {
            reject(e);
          }
        });
    }

    handle(gen.next());
  });
}

// Test Run
const fetchID = () => new Promise(res => setTimeout(() => res(42), 100));
const fetchName = (id) => new Promise(res => setTimeout(() => res(`User_${id}`), 100));

runAsync(function* () {
  const id = yield fetchID();
  const name = yield fetchName(id);
  return { id, name };
}).then(res => console.log("Runner output:", res)); // { id: 42, name: "User_42" }
```

---

## 16. Chapter Summary

- **Async/Await** is translated to **ES6 Generators** and Promises.
- **Generators (`function*`)** can pause execution using the **`yield`** keyword.
- The V8 Engine saves suspended generator states in the **Memory Heap**.
- A **Runner** function manages recursive `.next()` resumptions as promises resolve.

---

## 17. Quiz

1. What symbol is used to declare a generator function?
2. What does calling `.next(value)` inside a runner do to the generator?
3. Where does V8 allocate the generator context when it is yielded?

---

## 18. Next Chapter Preview

Now that we understand how asynchronous functions compile and execute at the engine level, we can explore how they communicate across networks. In the next chapter, we will study the **Fetch API & Asynchronous Patterns**, investigating HTTP requests, streaming response payloads, abort signals, and retry logic.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

sync/await ke baare mein zaroori hai samajhna ki ye generators ka ek specialized version hai. Compiler sync function ko ek state machine mein transform karta hai — har wait point ek state transition hai. Function body chunks mein execute hoti hai — har chunk ek microtask cycle mein, wait ke beech mein event loop free rahta hai. Ye JavaScript's "cooperative multitasking" ka implementation hai.

### Andar kya hota hai (Internal Working)

V8 sync function ko roughly aisa transform karta hai:

`javascript
// Original
async function fetchUser(id) {
  const res = await fetch(/api/user/);
  return res.json();
}

// V8 internally roughly transforms to (simplified):
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    fetch(/api/user/)
      .then(res => resolve(res.json()))
      .catch(reject);
  });
}
`

**State machine model**: Har wait ek "resume point" hai. V8 current stack frame save karta hai (suspended). Jab awaited promise settle ho, V8 microtask schedule karta hai jo suspended frame ko resume karta hai — local variables, register state sab restore hote hain.

Multiple wait ke saath: V8 ek internal generator-like coroutine banata hai. Each yield equivalent (wait) ek promise attachment aur context save hai.

### Code Example samjho

`javascript
async function processPayment(orderId) {
  console.log("A: Starting payment");
  const order = await fetchOrder(orderId);     // Suspend point 1
  console.log("C: Order fetched");
  const result = await chargeCard(order);      // Suspend point 2
  console.log("E: Payment done");
  return result;
}

processPayment(42);
console.log("B: After call (sync continues)");
// Actual order: A → B → C → E (C & E after microtasks)
`

**Line by line:**
- console.log("A:") — sync, immediately.
- wait fetchOrder(orderId) — function **suspend**. Control event loop ko return.
- console.log("B:") — calling code continue karta hai. B print hota hai.
- etchOrder complete hone pe — microtask queue mein resume scheduled.
- Call Stack khaali hone pe microtask fire — function resume C se. order available.
- wait chargeCard(order) — phir suspend.
- chargeCard complete → resume → E print.

### Sabse badi galti log karte hain

Fire-and-forget pattern: processPayment(42) ko wait kiye bina call karna. Return ki gai Promise ignore ho jaati hai. Agar chargeCard fail ho — unhandled rejection, koi catch nahi. Hamesha sync functions ko ya toh wait karo ya .catch() lagao.

### Yaad rakhne ki cheez

**sync function = state machine. Har wait = suspend + resume later via microtask.** Suspended state mein local variables preserve hote hain — ye V8 ke coroutine mechanism ka kaam hai.

## 20. Completion Checklist

- [ ] I can write and iterate over generator functions.
- [ ] I understand how `yield` and `.next()` pass values.
- [ ] I can explain how async/await compiles to generators and runners.
- [ ] I know how to check `[[GeneratorState]]` in Chrome DevTools.
