# Polyfill for filter

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of prototype methods, array iteration, and boolean coercion
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a fruit quality inspector standing at a sorting belt:

- **Native `filter` is like a sorting gate**: The conveyor belt carries a row of apples (original array). As each apple passes under your scanner, you check if it is ripe (executes callback). If ripe (truthy), you let it roll down into a *new* delivery crate (returns new filtered array). If rotten or under-ripe (falsy), you discard it.
- **A Custom Polyfill is building the sorting gate mechanism by hand**: You loop through all items on the belt. You must make sure:
  - You do not touch or bruise the apples on the original belt (immutability).
  - If there is an empty space on the belt (sparse array slot), you do not scan the air or put empty packaging in the delivery crate. You skip the empty slot completely.
  - You support custom sorting filters (context parameters).

In JavaScript, the **`filter` polyfill** performs this selective routing.

---

## 2. Problem

Legacy browser engines lack `Array.prototype.filter`.

If your application code tries to filter arrays (such as filtering out inactive users or pending transactions):
- The script crashes with a `TypeError` on older machines.
- Re-writing filter routines as manual `for` loops throughout your application causes redundant, verbose code.

---

## 3. Solution

We write an **`Array.prototype.filter` Polyfill**.

By attaching it to `Array.prototype.myFilter`, we recreate the complete specification logic, ensuring type validation, context binding, and proper sparse array handling.

---

## 4. Definition

- **`Array.prototype.filter`**: A native method that returns a new array containing all elements of the calling array that pass the test implemented by the callback function.
- **Truthy/Falsy**: In JavaScript, values that coerce to `true` or `false` inside logical contexts (e.g. inside `if` statements).

---

## 5. Visualization

### Filter Accumulation Flow

```
   Original Array: [ 10,  <empty>,  25,  8 ]
                       |      |       |   |
                       v      v       v   v
   Ripe Filter (> 10): Keep   Skip!  Keep Discard
                       |              |
                       v              v
   Returned Array:  [ 25 ]
```

Empty slots are skipped, and items that fail the condition (8 and 10) are omitted, returning a clean, dense filtered array.

---

## 6. Internal Working

How the filter engine operates:

1. **Boolean Coercion**: The callback returns a value. The polyfill does not check if the returned value is strictly `true`; it coerces it: `if (ToBoolean(callbackResult))`. This means values like non-zero numbers or non-empty strings pass the filter.
2. **Hole Skipping**: Similar to map, `filter` checks `i in O`. If an index represents a sparse hole, it is skipped. Empty slots do not appear in the final filtered output, reducing the array length.

---

## 7. Code Examples

### Bad Practice: Unsafe Filter Loops
A basic loop that fails to check callback types, does not bind context, and fails on sparse indices.

```javascript
// Bad: Lacks spec-compliance checks
Array.prototype.badFilter = function(callback) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    // BUG: Accesses sparse slots, passing undefined to the callback!
    if (callback(this[i], i, this)) {
      result.push(this[i]);
    }
  }
  return result;
};
```

### Good Practice: Standard Filter Polyfill
Include validation checks and use the `in` operator to handle sparse indices correctly.

```javascript
// Good: Spec-compliant filter polyfill
Array.prototype.myFilter = function(callback, thisArg) {
  if (this === null || this === undefined) {
    throw new TypeError("Array.prototype.myFilter called on null or undefined");
  }
  if (typeof callback !== "function") {
    throw new TypeError(callback + " is not a function");
  }

  const O = Object(this);
  const len = O.length >>> 0;
  const res = []; // Filtered elements accumulator

  for (let i = 0; i < len; i++) {
    if (i in O) {
      const val = O[i];
      // Coerce result to boolean check
      if (callback.call(thisArg, val, i, O)) {
        res.push(val);
      }
    }
  }

  return res;
};
```

### Best Practice: Production-Ready Polyfill
Ensure complete compliance with standard APIs, check prototype bounds, and prevent global namespace conflicts.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Array.prototype.filter) {
  Array.prototype.filter = function(callback, thisArg) {
    if (this == null) {
      throw new TypeError("Array.prototype.filter called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }

    const O = Object(this);
    const len = O.length >>> 0;
    const res = [];

    for (let k = 0; k < len; k++) {
      if (k in O) {
        const val = O[k];
        // Pass: element, index, original array reference
        if (callback.call(thisArg, val, k, O)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}
```

---

## 8. Dry Run

Let's dry run `[10, , 30].myFilter(x => x > 15)`:

- **Initialization**:
  - `O` = `{ 0: 10, 2: 30, length: 3 }`.
  - `len` = `3`. `res` = `[]`.
- **Execution Loop**:
  - **i = 0**: Is `0 in O`? Yes (value `10`).
    - Runs `callback(10, 0, O)`. Returns `false` (10 is not > 15).
    - Skip accumulator.
  - **i = 1**: Is `1 in O`? No (sparse empty slot).
    - Skip block.
  - **i = 2**: Is `2 in O`? Yes (value `30`).
    - Runs `callback(30, 2, O)`. Returns `true` (30 > 15).
    - Action: `res.push(30)`. `res` is now `[30]`.
- **Return**: Returns `[30]`.

---

## 9. Common Mistakes

- **Mistake 1: Returning `undefined` instead of an empty array when no elements pass.**
    `filter` must always return an array, even if it is empty `[]`.
- **Mistake 2: Mutating the array elements during filtration.**
    If your callback performs mutative operations (like `pop()` or `shift()`), it changes the array's length property mid-loop, leading to missed index checks.

---

## 10. Debugging

### Tracing Filter Matches in Console
To debug why an item is excluded by your filter:
1. Add logging inside your callback function:
    ```javascript
    const activeUsers = users.myFilter(user => {
      const match = user.status === "active";
      console.log(`User: ${user.name} | Status: ${user.status} | Match: ${match}`);
      return match;
    });
    ```
2. If an item is missing from the results, check if your comparison operator is performing strict equality on mismatched types (e.g. comparing string `"1"` with number `1`).

---

## 11. Real World Usage

- **Search Autocomplete Filtering**: Checking input strings against product lists, returning matching items.
- **Data Cleanup Pipelines**: Removing invalid or null rows from API payloads before displaying tables.

---

## 12. Interview Preparation

### Question: What happens to sparse holes when you call `Array.prototype.filter`?
- **Wrong Answer**: They are converted to `undefined` in the output array.
- **Good Answer**: Sparse holes are skipped entirely during iteration because they are not properties of the array object. As a result, they do not trigger the callback and are omitted from the returned filtered array. The returned array is dense (its length matches the number of elements that passed the filter, with no empty slots).

---

## 13. Practice

### Exercises
1. **Easy**: Write a filter polyfill that returns only even numbers from an array.
2. **Medium**: Write a test script validating that a filter polyfill correctly skips sparse array holes.
3. **Hard**: Write a custom filter polyfill that supports asynchronous callbacks by returning a Promise that resolves to the filtered array.

---

## 14. Mini Assignment

Write a filter prototype helper that filters out duplicate numbers from an array, keeping only unique occurrences.

---

## 15. Mini Project

Create a test runner suite `FilterPolyfillTester` that validates your custom filter implementation against 5 Edge Cases (sparse arrays, empty arrays, truthy/falsy coercions, context binding, and exception handling).

```javascript
// filter-polyfill-test-suite.js
Array.prototype.myFilter = function(callback, thisArg) {
  if (this == null) throw new TypeError("Cannot read properties of null");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");

  const O = Object(this);
  const len = O.length >>> 0;
  const res = [];

  for (let i = 0; i < len; i++) {
    if (i in O) {
      if (callback.call(thisArg, O[i], i, O)) {
        res.push(O[i]);
      }
    }
  }
  return res;
};

// Verification tests
console.log("--- Running Filter Polyfill Tests ---");

// Test 1: Simple Filter
const evens = [1, 2, 3, 4].myFilter(x => x % 2 === 0);
console.log("Test 1 (Simple):", JSON.stringify(evens) === "[2,4]" ? "PASS" : "FAIL");

// Test 2: Truthy Coercion
const truthy = [0, 1, "", "hello", null, undefined].myFilter(x => x);
console.log("Test 2 (Truthy):", JSON.stringify(truthy) === '[1,"hello"]' ? "PASS" : "FAIL");

// Test 3: Sparse Array check
const sparse = [10, , 20].myFilter(x => x > 15);
console.log("Test 3 (Sparse):", sparse.length === 1 && sparse[0] === 20 ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Array.prototype.filter`** returns a new array with elements that pass the callback test.
- The callback output is coerced to a **Boolean** check.
- **Sparse empty slots** are skipped and omitted from the returned filtered array.
- Support custom **`thisArg`** contexts using `.call(thisArg, ...)` execution.

---

## 17. Quiz

1. Is `0` treated as truthy or falsy inside a filter callback?
2. What is the returned value if you filter an empty array?
3. Why does `[10, , 20].myFilter(() => true)` return an array of length 2?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for reduce**. We will explore accumulator states, initial value handling, and data reductions.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: ilter ko scratch se likhna — interview mein common ask hai; native behavior exactly mirror karna hota hai.
- **Concept**: ilter sirf wahi elements return karta hai jinke liye callback 	rue return kare — new array, original untouched.
- **Key Pattern**: Array.prototype.myFilter = function(fn) { const res = []; for(let i=0; i<this.length; i++) if(fn(this[i], i, this)) res.push(this[i]); return res; }.
- **Common Mistake**: length maintain karna ignore karna — sparse array mein missing indices bhi handle karo.
## 19. Completion Checklist

- [ ] I can write a spec-compliant `Array.prototype.filter` polyfill.
- [ ] I understand how boolean coercion applies to filter outputs.
- [ ] I know how to handle sparse arrays in filter loops.
- [ ] I understand how `thisArg` binds function context inside polyfills.
