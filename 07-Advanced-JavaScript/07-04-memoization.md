# Memoization

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of pure functions, closures, and Map collections
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a mathematician solving math problems on a chalkboard:

- **Standard Function Execution is like solving the same long equation every time**: A student asks: *"What is 453 multiplied by 879?"* You pick up the chalk, write down the long multiplication steps, calculate for 2 minutes, and answer: `"398,187"`. Five minutes later, another student asks: *"What is 453 multiplied by 879?"* Instead of remembering, you erase the board and calculate the whole thing from scratch again.
- **Memoization is keeping a cheat sheet on the corner of the board**: The first time you calculate `453 * 879`, you write the equation and the answer in a small table in the corner. The next time a student asks for the result of `453 * 879`, you don't calculate it. You glance at the cheat sheet and answer `"398,187"` instantly.

In JavaScript, memoization is the process of keeping an in-memory cache of function results.

---

## 2. Problem

Some computations are extremely expensive:
- Finding the nth Fibonacci number recursively.
- Processing complex regex patterns over large files.
- Filtering or sorting large lists of products.

If these computations are run repeatedly with the same parameters, they waste CPU cycles, drain mobile batteries, and slow down your application.

---

## 3. Solution

We apply **Memoization** by wrapping pure functions inside a closure-based cache manager.

The wrapper function checks an internal cache store (a `Map` or object) before executing:
- If the result exists for the given arguments, it returns the cached value instantly.
- If not, it executes the function, saves the result in the cache, and returns it.

---

## 4. Definition

- **Memoization**: An optimization technique used to speed up computer programs by storing the results of expensive function calls and returning the cached result when the same inputs occur again.
- **Cache Store**: The in-memory data structure (typically a `Map` or plain object) used to store key-value pairs of inputs and outputs.
- **Pure Function Requirement**: Memoization only works on pure functions. If a function relies on external state (non-pure), caching its output based on inputs alone will return stale or incorrect results.

---

## 5. Visualization

### Memoization Execution Path

```
                      [ Call memoizedFunc(x) ]
                                 |
                     +-----------+-----------+
                     |                       |
               Key exists in cache?    Key missing in cache?
                     |                       |
            +--------+--------+     +--------+--------+
            |                 |     |                 |
            v                 v     v                 v
     [ Return Cached ]             [ Execute original fn ]
     (Time: O(1) instant)          (Time: O(N) computes)
                                            |
                                            v
                                   [ Save to Cache Map ]
                                            |
                                            v
                                    [ Return Result ]
```

---

## 6. Internal Working

V8 supports memoization through standard closure memory heaps:

1. **Cache Scope Persistence**: When you wrap a function in a `memoize` helper, V8 creates a closure. The cache variable (typically a `Map`) remains allocated in the Heap as long as the memoized function reference is active, preventing garbage collection of the cached results.
2. **Key Lookup Complexity**: Map lookups (`map.has()`, `map.get()`) operate in **$O(1)$** average time complexity. For expensive operations (like Fibonacci's $O(2^n)$ recursion), swapping a recursive call with a simple lookup reduces execution times from seconds to microseconds.

---

## 7. Code Examples

### Bad Practice: Memoizing Non-Pure Functions
Caching functions that rely on external variables returns incorrect results when the external state updates.

```javascript
// Bad: Memoizing a function that depends on external state
let taxRate = 0.18;

function calculateTotal(price) {
  return price * (1 + taxRate);
}

const memoizedCalc = memoize(calculateTotal); // Assume memoize wrapper
console.log(memoizedCalc(100)); // Output: 118 (Calculated and cached)

taxRate = 0.05; // State updates!
console.log(memoizedCalc(100)); // Output: 118! (Returned stale cache, should be 105)
```

### Good Practice: Basic Single-Argument Memoization
Create a simple memoize wrapper that works on single-parameter pure functions.

```javascript
// Good: Simple single-argument memoize
function memoize(fn) {
  const cache = new Map();

  return function(arg) {
    if (cache.has(arg)) {
      return cache.get(arg);
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

const double = (x) => x * 2;
const memoizedDouble = memoize(double);
```

### Best Practice: Multi-Argument Generic Memoization
Handle functions with multiple parameters by serializing arguments into unique string keys.

```javascript
// Best Practice: Multi-argument memoize helper
function memoizeMulti(fn) {
  const cache = new Map();

  return function(...args) {
    // Serialize arguments to create a unique key
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Test case: CPU-heavy recursive Fibonacci
const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2));

// Recursive helper to memoize self-calls
const memoizedFib = memoizeMulti((n, self) => {
  if (n <= 1) return n;
  return self(n - 1, self) + self(n - 2, self);
});

const runFib = (n) => memoizedFib(n, memoizedFib);

console.time("Fibonacci");
console.log(runFib(40)); // Resolves in < 1ms (Instead of minutes!)
console.timeEnd("Fibonacci");
```

---

## 8. Dry Run

Let's dry run the caching steps for `memoizedDouble(5)`:

- **First Invocation `memoizedDouble(5)`**:
  - V8 checks `cache.has(5)`. Returns `false`.
  - Executes `double(5)`. Calculates `5 * 2 = 10`.
  - Saves in cache: `cache.set(5, 10)`.
  - Returns `10`.
- **Second Invocation `memoizedDouble(5)`**:
  - V8 checks `cache.has(5)`. Returns `true`.
  - Reads value from cache: `cache.get(5)`. Returns `10`.
  - The function `double` is never executed.

---

## 9. Common Mistakes

- **Mistake 1: Storing large cache structures without size limits.**
    Caching large datasets infinitely can consume significant memory, eventually causing `OutOfMemory` crashes. Use Least Recently Used (LRU) cache strategies for large datasets.
- **Mistake 2: Serializing complex object parameters using `JSON.stringify()`.**
    If objects have circular references or change property order, `JSON.stringify` can throw errors or return inconsistent key strings.

---

## 10. Debugging

### Monitoring Cache Hits in Console
To verify if your memoized function is actually hitting the cache:
1. Add logging lines inside your memoize wrapper:
    ```javascript
    if (cache.has(key)) {
      console.log(`[Cache Hit] Key: ${key}`);
      return cache.get(key);
    }
    console.log(`[Cache Miss] Key: ${key}. Calculating...`);
    ```
2. Run the function. If you do not see `[Cache Hit]` logs for repeated inputs, check if your argument serialization logic is producing different key strings.

---

## 11. Real World Usage

- **React `useMemo` & `React.memo`**: React uses memoization to skip re-rendering child components or re-calculating values if props or state dependencies haven't changed.
- **Lodash `_.memoize`**: Standard utility library used by backend servers to cache geo-IP lookups or database role permissions.

---

## 12. Interview Preparation

### Question: Write a custom `memoize` function that supports caching with a time-to-live (TTL) expiration
- **Wrong Answer**: Writing standard caching without tracking timestamps.
- **Good Answer**:
    ```javascript
    function memoizeWithTTL(fn, ttlMs) {
      const cache = new Map();
      return function(...args) {
        const key = JSON.stringify(args);
        const now = Date.now();
        if (cache.has(key)) {
          const { value, timestamp } = cache.get(key);
          if (now - timestamp < ttlMs) return value; // Fresh
          cache.delete(key); // Expired
        }
        const result = fn.apply(this, args);
        cache.set(key, { value: result, timestamp: now });
        return result;
      };
    }
    ```

---

## 13. Practice

### Exercises
1. **Easy**: Write a pure function `add(a, b)` and wrap it in a memoize helper.
2. **Medium**: Memoize a recursive factorial function. Profile the speed difference between the first and second run.
3. **Hard**: Write a custom LRU (Least Recently Used) memoize wrapper that caps cache size at 5 items, deleting the oldest item when the limit is exceeded.

---

## 14. Mini Assignment

Write a memoized string parser function `parseTemplate(str)` that compiles templates, avoiding repetitive parsing of the same strings.

---

## 15. Mini Project

Create a mock prime number validator component `PrimeValidator`. Use memoization to cache results of calculations, showing the execution time offset between cache hits and cache misses.

```javascript
// memoized-prime-validator.js
const isPrime = (num) => {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
};

function memoizeValidator(fn) {
  const cache = new Map();

  return function(num) {
    if (cache.has(num)) {
      return { result: cache.get(num), source: "cache" };
    }
    const res = fn(num);
    cache.set(num, res);
    return { result: res, source: "calculation" };
  };
}

const checkPrime = memoizeValidator(isPrime);

// Test Run 1: Miss
console.time("Run 1");
const run1 = checkPrime(9999999967); // Large prime
console.log(`Val: ${run1.result} | Source: ${run1.source}`);
console.timeEnd("Run 1");

// Test Run 2: Hit
console.time("Run 2");
const run2 = checkPrime(9999999967);
console.log(`Val: ${run2.result} | Source: ${run2.source}`);
console.timeEnd("Run 2");
```

---

## 16. Chapter Summary

- **Memoization** optimizes performance by caching pure function outputs.
- The cache store is maintained in the Heap via **closures**.
- It is only applicable to **pure functions**.
- Multi-parameter functions require **argument serialization** to create unique keys.

---

## 17. Quiz

1. Why is memoization not applicable to functions that fetch database logs?
2. What is the average time complexity of looking up keys in a `Map` cache?
3. What happens if you memoize a function with an infinite number of unique inputs?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Debounce & Throttle**. We will explore how to rate-limit execution triggers for high-frequency browser events like scrolling, resizing, and keypresses.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Memoization ek caching technique hai — ek function ke results ko store karo inputs ke basis pe. Jab same input dobara aaye, computed answer nahi karo — cache se return karo. Classic use case: recursive Fibonacci — bina memoization ib(40) exponential time leta hai, memoization ke saath linear. Trade-off: speed ke liye memory use hoti hai.

### Andar kya hota hai (Internal Working)

Memoize wrapper ek closure ke andar ek Map (ya object) cache rakhta hai. V8 is cache Map ka reference Heap pe tab tak rakhta hai jab tak memoized function ka reference active hai — garbage collected nahi hoga.

Map.has() aur Map.get() — average **O(1)** time complexity. Hash-based lookup. Cache key generation expensive ho sakti hai agar complex objects arguments hain — JSON.stringify use karte hain toh O(n) serialization cost.

**Memory concern**: Cache unbounded hai — function sab unique inputs ke results store karta rehta hai. Production mein LRU cache (Least Recently Used) prefer karo — size limit ke saath.

### Code Example samjho

`javascript
// Without memoization: fib(40) billions of redundant calls
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2); // fib(38) kai baar call hoga!
}

// With memoization: O(n) time
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key); // Cache hit!
    const result = fn.apply(this, args);
    cache.set(key, result);                     // Store result
    return result;
  };
}

const memoFib = memoize(function fib(n) {
  if (n <= 1) return n;
  return memoFib(n - 1) + memoFib(n - 2);
});
console.log(memoFib(40)); // Instant!
`

**Line by line:**
- const cache = new Map() — closure mein cache. Har call ke liye persist.
- JSON.stringify(args) — arguments ko string key mein convert. [40] → "[40]".
- if (cache.has(key)) return cache.get(key) — cache hit: O(1) return, zero computation.
- n.apply(this, args) — cache miss: actually compute karo.
- cache.set(key, result) — future calls ke liye store karo.
- memoFib(40) — pehle memoFib(39) call, jo memoFib(38) call karta hai... har value ek baar compute hoti hai, cache mein store. N unique values = N computations total.

### Sabse badi galti log karte hain

Non-pure functions memoize karna — functions jinke results external state pe depend karte hain:

`javascript
let taxRate = 0.18;
const memoCalc = memoize(price => price * (1 + taxRate));
memoCalc(100); // 118 — cached
taxRate = 0.05;
memoCalc(100); // Still 118 — stale cache! Bug!
`

Memoization sirf pure functions ke saath hi correct kaam karta hai.

### Yaad rakhne ki cheez

**Memoization = cache + pure function + same input → same output assumption.** Sirf expensive, pure functions ko memoize karo. Non-pure ya side effects wale functions memoize karne se stale/wrong results milenge.

## 20. Completion Checklist

- [ ] I can write a single-argument memoize wrapper.
- [ ] I understand how argument serialization generates cache keys.
- [ ] I can explain the time-complexity benefits of memoizing recursive functions.
- [ ] I know how to check memory profiles of closures in Chrome DevTools.
