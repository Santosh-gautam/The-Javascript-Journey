# `Promise.try` & `Array.fromAsync`

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Promises, Async/Await, Generators, and Async Iterators
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

**Story 1 — `Promise.try`**: Imagine a dispatcher who takes orders over the phone. Some orders are simple (already prepared, just need delivery — synchronous). Others need to be cooked fresh (asynchronous). The dispatcher's job is to always speak the same language — "I'll confirm when it's done." Regardless of whether it was already prepared or needs cooking, the caller always gets back the same type of promise: "I'll let you know."

`Promise.try(fn)` does exactly this. It calls `fn`, and whether `fn` returns a value, throws synchronously, or returns a Promise — you always get back a Promise. One consistent interface.

**Story 2 — `Array.fromAsync`**: Imagine collecting water samples from multiple rivers simultaneously. Each sample arrives asynchronously. You want to collect all samples into one bucket in order. `Array.fromAsync` is the bucket that waits for each async sample to arrive before adding it.

---

## 2. Problem

### Problem with `Promise.try`:
When building utility functions, you often do not know if a callback will be synchronous or asynchronous:

```javascript
// Problem: If fn() throws synchronously, this is NOT caught by .catch()
function runTask(fn) {
  return Promise.resolve().then(fn); // Workaround — forces fn into async
}
// But this adds an extra microtask tick. Promise.try() is cleaner and correct.
```

The only "safe" patterns were `Promise.resolve().then(fn)` (adds unnecessary tick) or `try/catch` + `Promise.reject` (verbose).

### Problem with `Array.fromAsync`:
`Array.from()` is synchronous — it cannot handle async iterables (like database cursors, paginated API responses, or async generators):

```javascript
// Problem: This does NOT work with async generators
async function* fetchPages() { /* yields pages */ }
const pages = Array.from(fetchPages()); // ❌ Returns array of Promises, not values
```

You had to manually loop with `for await...of` and push to an array.

---

## 3. Solution

- **`Promise.try(fn, ...args)`**: Calls `fn(...args)`. If it returns synchronously, wraps the value in `Promise.resolve`. If it throws synchronously, wraps the error in `Promise.reject`. If it returns a Promise, returns it directly. Always returns a Promise.
- **`Array.fromAsync(asyncIterable, mapFn?, thisArg?)`**: Awaits each value from an async iterable (or a sync iterable of promises), optionally maps each value with `mapFn`, and resolves to a full array when all values have been collected.

---

## 4. Definition

- **`Promise.try(fn)`**: A static method that executes `fn` and guarantees a Promise result regardless of whether `fn` is sync or async, and whether it throws or returns.
- **`Array.fromAsync(source)`**: A static async method that collects values from an async iterable (or iterable-of-Promises) into an array. Returns a Promise that resolves to the array.

---

## 5. Visualization

### `Promise.try` branching

```
Promise.try(fn)
       │
       ├── fn() returns value   → Promise.resolve(value)
       ├── fn() throws error    → Promise.reject(error)
       └── fn() returns Promise → that Promise directly

All three paths → uniform Promise interface for caller
```

### `Array.fromAsync` flow

```
async function* source() { yield 1; yield 2; yield 3; }

Array.fromAsync(source())
    │
    ├── await next() → 1 → push to buffer
    ├── await next() → 2 → push to buffer
    ├── await next() → 3 → push to buffer
    └── done → resolve Promise with [1, 2, 3]
```

---

## 6. Internal Working

### `Promise.try` internals:
1. Calls `fn(...args)` inside a `try` block.
2. If the call throws synchronously, returns `Promise.reject(error)`.
3. If the call returns a value that is not a thenable, returns `Promise.resolve(value)`.
4. If the call returns a thenable (Promise), returns that thenable directly (or wrapped via `Promise.resolve`).

**Key insight**: Unlike `new Promise(executor)`, `Promise.try` correctly propagates synchronous throws as rejections. Unlike `Promise.resolve().then(fn)`, it does not add an extra microtask tick before calling `fn`.

### `Array.fromAsync` internals:
1. Creates an async iterator from the source (using `Symbol.asyncIterator`, or `Symbol.iterator` if not async).
2. Iterates with `for await...of` semantics — awaiting each `.next()` call.
3. If a `mapFn` is provided, awaits `mapFn(value, index)` for each element.
4. Resolves the returned Promise with the accumulated array once the iterator is exhausted.

---

## 7. Code Examples

### Bad Practice: Unsafe sync/async mixing

```javascript
// Bad: If getUser() throws synchronously, .catch() won't catch it
function loadUser(id) {
  return getUser(id) // might throw sync!
    .then(user => process(user))
    .catch(err => handleError(err)); // ❌ Sync throws escape .catch()
}
```

### Good Practice: Wrapping with `Promise.resolve().then()`

```javascript
// Good but verbose — adds a microtask tick
function loadUser(id) {
  return Promise.resolve()
    .then(() => getUser(id))
    .then(user => process(user))
    .catch(err => handleError(err));
}
```

### Best Practice: Using `Promise.try`

```javascript
// Best Practice: Clean, correct, no extra microtask tick
function loadUser(id) {
  return Promise.try(() => getUser(id)) // sync or async — both handled
    .then(user => process(user))
    .catch(err => handleError(err)); // ✓ catches both sync and async errors
}

// Array.fromAsync with an async generator
async function* fetchUsers(ids) {
  for (const id of ids) {
    yield await fetch(`/api/users/${id}`).then(r => r.json());
  }
}

// Collect all async results into an array
const users = await Array.fromAsync(fetchUsers([1, 2, 3]));
console.log(users); // [{ id: 1, name: "..." }, { id: 2, ...}, { id: 3, ...}] ✓

// Array.fromAsync with a mapFn
const userIds = [1, 2, 3];
const names = await Array.fromAsync(
  userIds,
  async id => {
    const user = await fetch(`/api/users/${id}`).then(r => r.json());
    return user.name;
  }
);
console.log(names); // ["Alice", "Bob", "Carol"] ✓
```

---

## 8. Dry Run

```javascript
const result = await Promise.try(() => {
  console.log("sync start");
  throw new Error("sync error!");
  return 42;
});
```

### Step-by-Step State
- **`Promise.try(() => {...})`**: Immediately calls the function.
- **`console.log("sync start")`**: Logs `"sync start"`.
- **`throw new Error("sync error!")`**: Throws synchronously inside `Promise.try`'s try/catch.
- **Promise.try catches it**: Returns `Promise.reject(new Error("sync error!"))`.
- **`await` throws**: The `await` re-throws the rejection. The surrounding `async` function's `catch` block (or the caller's `.catch()`) receives the error.

Without `Promise.try`, if this was `Promise.resolve().then(fn)`, the throw would still be caught — but with an extra microtask delay before `fn` runs.

---

## 9. Common Mistakes

- **Mistake 1: Thinking `Promise.try` is the same as `new Promise(executor)`.**
  In `new Promise(executor)`, synchronous throws inside `executor` are converted to rejections. But `Promise.try` is simpler — it doesn't require you to call `resolve`/`reject` manually.
- **Mistake 2: Using `Array.fromAsync` expecting parallel execution.**
  `Array.fromAsync` processes values **sequentially** — it awaits each value before moving to the next. For parallel fetching, use `Promise.all` with `Array.from`.
- **Mistake 3: Passing a sync iterable of non-Promise values to `Array.fromAsync`.**
  This works fine — it's equivalent to `Array.from` but returns a Promise. Not wrong, just unnecessary for purely sync data.

---

## 10. Debugging

### Debugging `Promise.try` catch behavior

1. In DevTools Console, run:
   ```javascript
   Promise.try(() => { throw new Error("test"); }).catch(e => console.log("Caught:", e.message));
   ```
2. Output: `"Caught: test"` — confirms sync throws are caught as rejections.
3. Compare with: `Promise.resolve(undefined).then(() => { throw new Error("test"); }).catch(e => console.log("Caught:", e.message));`
4. Both catch the error, but `Promise.try` calls `fn` synchronously — check the order of console logs around it to see the timing difference.

---

## 11. Real World Usage

- **`Promise.try`**: Use in plugin architectures, middleware, or utility wrappers that accept callbacks of unknown sync/async nature. Provides a uniform Promise-based contract.
- **`Array.fromAsync`**: Use when consuming async generators from API pagination, streaming CSV parsers, WebSocket message streams, or any `Symbol.asyncIterator`-compliant source.

---

## 12. Interview Preparation

### Question: Why is `Promise.try(fn)` preferred over `Promise.resolve().then(fn)`?
- **Wrong Answer**: They are the same thing.
- **Good Answer**: Both ensure that synchronous throws inside `fn` become Promise rejections. However, `Promise.resolve().then(fn)` introduces an extra **microtask tick** before `fn` is called — because `.then()` schedules the callback asynchronously. `Promise.try(fn)` calls `fn` **synchronously** and only wraps the result or error in a Promise. This means the function starts executing immediately, and there's one fewer microtask in the queue, which can matter in high-performance or order-sensitive code.

### Question: What is the difference between `Array.from` and `Array.fromAsync`?
- `Array.from(iterable)` is synchronous — it iterates a sync iterable and returns an array.
- `Array.fromAsync(asyncIterable)` is async — it awaits each value from an async iterable and returns a Promise that resolves to an array. It can also handle sync iterables of Promises.

---

## 13. Practice

1. **Easy**: Use `Promise.try` to wrap a function that may throw synchronously. Log the caught error via `.catch()`.
2. **Medium**: Write an async generator `delay(values, ms)` that yields each value after a `ms` delay. Collect results with `Array.fromAsync`.
3. **Hard**: Build a retry utility `retryPromise(fn, retries)` using `Promise.try` that retries `fn` up to `retries` times on rejection.

---

## 14. Mini Assignment

Build a `loadConfig(getConfigFn)` utility that:
1. Accepts `getConfigFn` — which may be sync (returns object) or async (returns Promise).
2. Uses `Promise.try(getConfigFn)` to handle both cases uniformly.
3. Validates the config has a `host` property. If not, rejects with `new Error("Invalid config")`.
4. Returns the validated config Promise.

---

## 15. Mini Project

Build a **Paginated User Fetcher** using `Array.fromAsync`:

```javascript
// user-fetcher.js

// Simulated async paginated API
async function* userPages(totalPages) {
  for (let page = 1; page <= totalPages; page++) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 100));
    yield [
      { id: (page - 1) * 2 + 1, name: `User${(page - 1) * 2 + 1}` },
      { id: (page - 1) * 2 + 2, name: `User${(page - 1) * 2 + 2}` },
    ];
  }
}

// Flatten paginated results into a single array
async function* flatUserPages(totalPages) {
  for await (const page of userPages(totalPages)) {
    yield* page;
  }
}

const allUsers = await Array.fromAsync(flatUserPages(3));
console.log(allUsers);
// [
//   { id: 1, name: 'User1' }, { id: 2, name: 'User2' },
//   { id: 3, name: 'User3' }, { id: 4, name: 'User4' },
//   { id: 5, name: 'User5' }, { id: 6, name: 'User6' }
// ]
```

---

## 16. Chapter Summary

- **`Promise.try(fn)`**: Calls `fn` synchronously, wraps result/error in a Promise. Handles sync throws, sync returns, and async returns uniformly. No extra microtask tick vs. `.then(fn)`.
- **`Array.fromAsync(source, mapFn?)`**: Awaits each value from an async iterable (sequentially) and resolves to a full array. The async equivalent of `Array.from`.
- Both are solutions to common boilerplate patterns in async JavaScript.

---

## 17. Quiz

1. Does `Promise.try(fn)` call `fn` synchronously or asynchronously?
2. Does `Array.fromAsync` process values in parallel or sequentially?
3. What type does `Array.fromAsync(source)` return?

---

## 18. Next Chapter Preview

In the final chapter of Module 17, we cover a collection of smaller but significant ES2025/2026 additions: **`RegExp.escape`** for safely escaping user input in regex patterns, **`Float16Array`** for low-precision GPU/ML data handling, **`Math.sumPrecise`** for loss-free numeric summation, **`Error.isError`** for robust error detection, and **`Uint8Array`** base64/hex encoding built directly into the standard library.

---

## 19. 🇮🇳 Hinglish Summary

- **Problem**: `Promise.resolve().then(fn)` ek extra microtask add karta tha; `Array.from` async iterables support nahi karta tha.
- **`Promise.try`**: `fn` ko synchronously call karta hai aur hamesha Promise return karta hai — sync throw bhi catch hoti hai.
- **`Array.fromAsync`**: Async generator ya iterable ke values ko sequentially await karta hai aur ek array mein collect karta hai.
- **Common Mistake**: `Array.fromAsync` parallel nahi hai — ek ek karke values await hoti hain. Parallel ke liye `Promise.all` use karo.
- **Key Pattern**: `Promise.try(() => maybeAsyncFn())` — sync ya async dono uniform promise interface mein.

---

## 20. Completion Checklist

- [ ] I can explain what `Promise.try` does and when to use it.
- [ ] I understand the microtask timing difference between `Promise.try` and `Promise.resolve().then`.
- [ ] I can use `Array.fromAsync` to collect values from an async generator.
- [ ] I know that `Array.fromAsync` processes sequentially, not in parallel.
