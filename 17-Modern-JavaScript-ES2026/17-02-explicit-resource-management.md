# Explicit Resource Management — `using` / `await using`

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding of Closures, Promises, Async/Await, and Symbol
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a chef in a professional kitchen. You borrow three expensive knives from the equipment room, use them to prepare a dish, and then forget to return them. The next chef can't find the knives. The kitchen descends into chaos.

A good kitchen has a strict checkout system: when your shift ends, borrowed equipment is automatically returned to its place — whether or not you remembered.

In JavaScript, "borrowed equipment" represents resources: file handles, database connections, network sockets, event listener subscriptions. When your code finishes, these are not automatically returned. You must manually call `.close()`, `.disconnect()`, or `.unsubscribe()`. But if an error throws, or you forget a `finally` block, the resources leak.

`using` is JavaScript's automatic equipment return system — it guarantees resource cleanup at block exit, regardless of errors.

---

## 2. Problem

When working with resources in JavaScript, you must always clean them up manually:

```javascript
// Problem: If an error throws before disconnect(), the connection leaks
const db = await openDatabase();
const data = await db.query("SELECT * FROM users"); // Might throw!
await db.disconnect(); // Never reached if the line above throws
```

The only reliable pattern was a verbose `try/finally` block. This led to deeply nested, hard-to-read code, especially with multiple resources.

---

## 3. Solution

ECMAScript 2025 introduces **Explicit Resource Management** — the `using` and `await using` declarations. These are inspired by RAII (Resource Acquisition Is Initialization) from C++/Rust and `using` statements from C#.

A `using` declaration binds a resource to a variable. When the surrounding block exits — normally, via a `return`, or via a thrown exception — the resource's `[Symbol.dispose]()` method is **automatically called**.

`await using` does the same but calls `[Symbol.asyncDispose]()` and awaits it.

---

## 4. Definition

- **`using`**: A block-scoped declaration that calls `[Symbol.dispose]()` on the value when the block exits. Works with synchronous cleanup.
- **`await using`**: A block-scoped declaration that calls `[Symbol.asyncDispose]()` and awaits it when the block exits. Works with asynchronous cleanup.
- **`Symbol.dispose`**: A well-known symbol. If an object has this method, it is a "Disposable" resource compatible with `using`.
- **`Symbol.asyncDispose`**: Same as above, for async-aware disposables.
- **`DisposableStack` / `AsyncDisposableStack`**: Utility classes for managing multiple disposables with manual control.

---

## 5. Visualization

### How `using` works at block exit

```
function processFile() {
  using file = openFile("data.txt");  // ← Registered for disposal
  //
  doWork(file);
  //
} // ← Block exits here
  //   Engine automatically calls file[Symbol.dispose]()
  //   Even if doWork() threw an error!

   Block Scope Lifecycle:
   ┌──────────────────────────────────┐
   │  using file = openFile(...)      │
   │       ↓                          │
   │  [doWork executes]               │
   │       ↓                          │
   │  [Error thrown / normal return]  │
   │       ↓                          │
   │  file[Symbol.dispose]() called   │ ← Guaranteed
   └──────────────────────────────────┘
```

---

## 6. Internal Working

The engine tracks `using` declarations in an internal "dispose stack" for each block scope:

1. When `using x = expr` executes, the engine evaluates `expr`, stores it in `x`, and pushes `x[Symbol.dispose]` onto the block's dispose stack.
2. When the block exits (via `return`, `throw`, or fall-through), the engine unwinds the dispose stack in **LIFO (Last In, First Out)** order — calling each dispose function.
3. If the dispose function itself throws, the error is combined with any pending error using `SuppressedError(disposeError, originalError)` — a new built-in error type that captures both.
4. `await using` triggers `await x[Symbol.asyncDispose]()` in the same LIFO order, inside an async context.

---

## 7. Code Examples

### Bad Practice: Manual cleanup that leaks on errors

```javascript
// Bad: disconnect() never called if query() throws
async function getUsers() {
  const db = await Database.connect();
  const users = await db.query("SELECT * FROM users"); // Could throw
  await db.disconnect(); // Skipped on error — connection leaks!
  return users;
}
```

### Good Practice: Manual cleanup with try/finally

```javascript
// Good: Reliable but verbose
async function getUsers() {
  const db = await Database.connect();
  try {
    return await db.query("SELECT * FROM users");
  } finally {
    await db.disconnect(); // Always runs
  }
}
```

### Best Practice: Using `await using` for automatic cleanup

```javascript
// Best Practice: Automatic, guaranteed cleanup
class Database {
  static async connect() {
    const conn = await createConnection();
    return {
      query: (sql) => conn.execute(sql),
      [Symbol.asyncDispose]: async () => {
        await conn.close();
        console.log("Database connection closed automatically.");
      }
    };
  }
}

async function getUsers() {
  await using db = await Database.connect();
  // db[Symbol.asyncDispose]() is guaranteed to run when this block exits
  return await db.query("SELECT * FROM users");
} // ← db is automatically closed here, even if query() throws

// Managing multiple resources with DisposableStack
async function processData() {
  await using stack = new AsyncDisposableStack();
  const db = stack.use(await Database.connect());
  const logger = stack.use(await Logger.open("app.log"));
  // Both db and logger are auto-closed when block exits, in LIFO order
  const data = await db.query("SELECT * FROM logs");
  await logger.write(JSON.stringify(data));
}
```

---

## 8. Dry Run

```javascript
function demo() {
  console.log("1. Before using block");
  {
    using res = {
      value: "open",
      [Symbol.dispose]() {
        console.log("3. Dispose called! Value was:", this.value);
      }
    };
    console.log("2. Inside block, res.value =", res.value);
  } // Block exits here
  console.log("4. After block");
}
demo();
```

### Step-by-Step State
- **Line "1"**: Logs `"1. Before using block"`.
- **`using res = {...}`**: Engine stores `res` and registers `res[Symbol.dispose]` on the block's dispose stack.
- **Line "2"**: Logs `"2. Inside block, res.value = open"`.
- **Block exits**: Engine pops dispose stack, calls `res[Symbol.dispose]()`. Logs `"3. Dispose called! Value was: open"`.
- **Line "4"**: Logs `"4. After block"`. `res` is out of scope.

Output order: 1 → 2 → 3 → 4.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting `[Symbol.dispose]` on custom objects.**
  `using x = myObj` only works if `myObj[Symbol.dispose]` is a function. Otherwise, the engine throws a `TypeError` at the `using` declaration.
- **Mistake 2: Using `using` for non-resource objects.**
  `using` is not a general-purpose block scope tool. It is specifically for objects that need cleanup. Misusing it adds confusion.
- **Mistake 3: Using `using` in a non-async function with async dispose.**
  `using` calls `[Symbol.dispose]()` synchronously. If your dispose logic is async, you must use `await using` inside an `async` function.

---

## 10. Debugging

### Verifying disposal order in Chrome DevTools

1. Create a small demo with two `using` declarations in the same block.
2. Add `console.trace()` inside each `[Symbol.dispose]` method.
3. Run the code — DevTools shows the exact call stack at each disposal, confirming LIFO order.
4. To test error behavior, throw inside the block and observe that both disposals still run (check the Console for all logs).

---

## 11. Real World Usage

- **Database connections**: `await using db = await pool.connect()` — connection returns to pool when the function exits.
- **File I/O in Node.js**: `using fileHandle = await fs.promises.open("data.json", "r")` — file is closed at block exit. (Node.js 22+ supports `Symbol.asyncDispose` on file handles.)
- **Observables / Subscriptions**: A subscription object with `[Symbol.dispose]()` calling `unsubscribe()` ensures no memory leaks from forgotten subscriptions.
- **Test fixtures**: Testing frameworks can use `using` to set up/tear down test state deterministically.

---

## 12. Interview Preparation

### Question: What problem does `using` solve and how does it compare to `try/finally`?
- **Wrong Answer**: `using` is just syntactic sugar for `try/finally`.
- **Good Answer**: `using` solves deterministic resource cleanup. While `try/finally` can achieve the same result, it requires manual boilerplate for every resource. `using` is declarative — you define the disposal method once on the object (`[Symbol.dispose]`), and the engine guarantees it runs when any block that holds a `using` binding exits. It also handles **multiple resources in LIFO order** and properly captures both the original error and any disposal errors via `SuppressedError`. This makes code far cleaner and less error-prone.

### Question: What is `SuppressedError`?
- A new built-in error type introduced alongside Explicit Resource Management. If a `[Symbol.dispose]()` call throws while an original error is already pending, the engine wraps both in a `SuppressedError`, preserving both the disposal error and the original error.

---

## 13. Practice

1. **Easy**: Create a simple disposable logger object with `[Symbol.dispose]` that logs "Logger closed". Use it with a `using` declaration.
2. **Medium**: Build a `TimerResource` that starts a `setInterval` on creation and clears it via `[Symbol.dispose]`. Verify that the interval stops when the `using` block exits.
3. **Hard**: Implement a generic `withResource(resource, fn)` polyfill function that mimics `using` behavior using `try/finally`, and explain its limitations compared to the native `using` keyword.

---

## 14. Mini Assignment

Implement a `ConnectionPool` that maintains a pool of 3 mock connections. Expose a `borrow()` method that returns a connection object with `[Symbol.asyncDispose]` returning the connection to the pool. Write a test that borrows 2 connections using `await using` and verify that pool size returns to 3 after both blocks exit.

---

## 15. Mini Project

Build a **File Line Counter** utility in Node.js (v22+):

```javascript
// line-counter.mjs
import { open } from "node:fs/promises";

async function countLines(filePath) {
  // Node.js 22+ FileHandle supports Symbol.asyncDispose
  await using file = await open(filePath, "r");
  const content = await file.readFile({ encoding: "utf8" });
  return content.split("\n").length;
} // file is automatically closed here

const count = await countLines("./data.txt");
console.log(`Lines: ${count}`);
// No manual file.close() needed. No resource leak possible.
```

---

## 16. Chapter Summary

- `using` and `await using` are new block-scoped declarations for automatic resource cleanup.
- Any object with `[Symbol.dispose]` / `[Symbol.asyncDispose]` is a "Disposable".
- The engine maintains a per-block dispose stack and unwinds it in LIFO order on block exit.
- `SuppressedError` captures both the original error and any disposal error.
- `DisposableStack` / `AsyncDisposableStack` enable composing multiple disposables.

---

## 17. Quiz

1. In what order are multiple `using` declarations in the same block disposed of?
2. What happens if both the original code and a `[Symbol.dispose]` method throw errors?
3. Can you use `using` with a plain object that has no `[Symbol.dispose]` method?

---

## 18. Next Chapter Preview

In the next chapter, we explore **Array By-Copy Methods** (`toReversed`, `toSorted`, `toSpliced`, `with`) — ES2023 additions that let you transform arrays without mutating the original, solving one of the most common accidental-mutation bugs in JavaScript codebases.

---

## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Explicit Resource Management (using aur wait using) code resources (db connections, file handles, memory loops sockets) ko automatically cleanup and release karne ka ES2025 standard is. using variables block scope coordinates exits triggers directly, garbage collection sweeps coordinates dependencies resolve target checks. Eliminates verbose manual try-finally cleanup boilerplates.

### Andar kya hota hai (Internal Working)

Resource unwinding pipeline:
1. **Dispose stack instantiation**: When V8 compiles using x = resource, it registers object and pushes target x[Symbol.dispose] method reference onto current block execution's internal dispose stack.
2. **LIFO stack execution**: When block scope exits (via return, throw or normal fall-through), V8 pops stack elements LIFO (Last In First Out) order executing registered dispose calls automatically.
3. **Error suppression**: If both main code blocks and dispose function throw errors, V8 suppresses secondary errors returning unified SuppressedError metadata instances containing both errors information.

### Code Example samjho

`javascript
// Good: Auto cleanup Database connection using resource management
async function processQuery() {
  // Connection automatically closes when block scope exits!
  await using db = await Database.connect();
  const results = await db.query("SELECT * FROM users");
  return results;
}
`

**Line by line:**
- wait using db = ... — instantiates resource connections. Registers db[Symbol.asyncDispose] handler inside current block's dispose stack.
- db.query(...) — executes queries logic. If it throws, V8 still unwinds dispose stack.
- Block exit — engine runs async dispose callbacks automatically, closing db handles safely. No connections leak.

### Sabse badi galti log karte hain

Standard using syntax with objects missing Symbol.dispose implementation definitions. If object does not implement dispose interfaces, engine throws TypeErrors instantly at execution start. Always ensure target resource implements dispose specifications.

### Yaad rakhne ki cheez

**using automatically disposes resources at block scope exits in LIFO sequence.**

## 20. Completion Checklist

- [ ] I can explain what `using` and `await using` do and why they exist.
- [ ] I know how to add `[Symbol.dispose]` to a custom object.
- [ ] I understand LIFO disposal order and `SuppressedError`.
- [ ] I can refactor a `try/finally` resource pattern to use `await using`.
