# Polyfill for reduce

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of prototype methods, callbacks, and accumulator algorithms
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a cashier totaling up customer items at a checkout counter:

- **Native `reduce` is like scanning items to calculate a single total**:
  - **Scenario A (Initial Value Provided)**: You start with a base gift card balance of INR 100 (initial value). You scan item 1, subtract its price from the balance, then scan item 2 and subtract its price. The balance decreases step-by-step, ending in a single final number.
  - **Scenario B (No Initial Value)**: You start with an empty cash register. You pick up the first item on the counter (index 0 becomes accumulator), scan the second item, add its price, scan the third, and add its price.
- **The empty counter exception**: A customer walks up to your counter. There are no items on the counter (empty array) and they do not have a gift card (no initial value). You cannot calculate a total. You throw your hands up in confusion (throwing a `TypeError`).
- **Sparse Check**: If there is an empty space on the counter where an item was removed, you skip it and scan the next item.

In JavaScript, the **`reduce` polyfill** implements this accumulator logic.

---

## 2. Problem

Legacy browser runtimes do not support `Array.prototype.reduce`.

If your application relies on `reduce` to aggregate data (such as summing transaction totals, grouping users, or flattening nested matrices):
- The script crashes with a `TypeError` on older machines.
- Recreating accumulator logic manually using global variables inside loops leads to repetitive, bug-prone code.

---

## 3. Solution

We write an **`Array.prototype.reduce` Polyfill**.

By attaching it to `Array.prototype.myReduce`, we recreate the complete specification rules: initial value checks, sparse array skipping, accumulator initialization, and empty array TypeErrors.

---

## 4. Definition

- **`Array.prototype.reduce`**: A method that executes a reducer function on each element of the array, returning a single accumulated value.
- **Accumulator**: The running value returned by the previous iteration of the reducer callback (or the initial value).

---

## 5. Visualization

### Reduce Loop without Initial Value

Accumulate `[1, , 3, 4]` (Sum):

```
   Array: [ 1,  <empty>,  3,  4 ]
  
   Step 1: No initial value.
           Scan index 0 -> Found 1. Accumulator = 1. Start loop at index 1.
  
   Step 2: Index 1 is empty -> Skip.
  
   Step 3: Index 2 -> Value 3. Accumulator = Accumulator (1) + 3 = 4.
  
   Step 4: Index 3 -> Value 4. Accumulator = Accumulator (4) + 4 = 8.
  
   Final Output: 8
```

---

## 6. Internal Working

How the engine handles reduce initialization:

1. **Initial Value Check**: The polyfill checks if a second argument (`initialValue`) was passed. It determines this by verifying `arguments.length > 1`. Using `initialValue === undefined` is incorrect, as a user could explicitly pass `undefined` as the initial value.
2. **Accumulator Injection**:
    - If `initialValue` is missing, the loop first traverses the array to find the first assigned index. It assigns that element to the accumulator and continues the loop from the next index.
    - If the loop finishes without finding any assigned element, it throws a `TypeError: Reduce of empty array with no initial value`.

---

## 7. Code Examples

### Bad Practice: Unsafe Reduce Loop
A loop that assumes the array is always populated, ignores sparse indices, and does not check for empty arrays.

```javascript
// Bad: Fails on empty arrays and sparse holes
Array.prototype.badReduce = function(callback, initialValue) {
  let accumulator = initialValue;
  for (let i = 0; i < this.length; i++) {
    // BUG: If initialValue was not passed, accumulator starts as undefined,
    // and undefined + this[0] yields NaN!
    accumulator = callback(accumulator, this[i], i, this);
  }
  return accumulator;
};
```

### Good Practice: Basic Reduce Polyfill
Implement initial value checks and use the `in` operator to handle sparse indices and empty arrays.

```javascript
// Good: Handles empty arrays and sparse indices safely
Array.prototype.myReduce = function(callback, initialValue) {
  if (this === null || this === undefined) {
    throw new TypeError("Array.prototype.myReduce called on null or undefined");
  }
  if (typeof callback !== "function") {
    throw new TypeError(callback + " is not a function");
  }

  const O = Object(this);
  const len = O.length >>> 0;
  let k = 0;
  let accumulator;
  let isAccumulatorInitialized = false;

  // Check if initial value is provided (inspecting arguments length)
  if (arguments.length > 1) {
    accumulator = initialValue;
    isAccumulatorInitialized = true;
  }

  while (k < len) {
    if (k in O) {
      if (isAccumulatorInitialized) {
        // Run reducer callback
        accumulator = callback(accumulator, O[k], k, O);
      } else {
        // Initialize accumulator with the first existing element
        accumulator = O[k];
        isAccumulatorInitialized = true;
      }
    }
    k++;
  }

  // If array is empty and no initial value was passed, throw TypeError
  if (!isAccumulatorInitialized) {
    throw new TypeError("Reduce of empty array with no initial value");
  }

  return accumulator;
};
```

### Best Practice: Standard-Compliant Polyfill
Ensure absolute alignment with standard specifications, checking all parameters and prototype contexts safely.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function(callback, initialValue) {
    if (this == null) {
      throw new TypeError("Array.prototype.reduce called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }

    const O = Object(this);
    const len = O.length >>> 0;
    let k = 0;
    let accumulator;
    let isAccumulatorInitialized = false;

    if (arguments.length > 1) {
      accumulator = initialValue;
      isAccumulatorInitialized = true;
    }

    for (; k < len; k++) {
      if (k in O) {
        if (isAccumulatorInitialized) {
          // Pass: accumulator, element, index, original array
          accumulator = callback(accumulator, O[k], k, O);
        } else {
          accumulator = O[k];
          isAccumulatorInitialized = true;
        }
      }
    }

    if (!isAccumulatorInitialized) {
      throw new TypeError("Reduce of empty array with no initial value");
    }

    return accumulator;
  };
}
```

---

## 8. Dry Run

Let's dry run `[10].myReduce((acc, val) => acc + val)`:

- **Initialization**:
  - `O` = `{ 0: 10, length: 1 }`. `len` = `1`.
  - `arguments.length` is `1` (no initial value passed).
  - `isAccumulatorInitialized` = `false`.
- **Loop (`k = 0`)**:
  - Is `0 in O`? Yes (value `10`).
  - Since `isAccumulatorInitialized` is `false`:
    - `accumulator` is set to `O[0]` (`10`).
    - `isAccumulatorInitialized` is set to `true`.
  - `k` increments to `1`.
- **Termination**:
  - Loop finishes (`k` >= `len`).
  - Returns `accumulator` (`10`).
  - The callback function is never executed, and we return the single array element.

---

## 9. Common Mistakes

- **Mistake 1: Checking for initial value presence using `initialValue === undefined`.**
    ```javascript
    // Bad: Breaks if the user explicitly passes undefined as the initial value!
    const res = [1].reduce((acc, x) => acc + x, undefined);
    ```
    *Fix*: Always inspect the `arguments.length` count.

- **Mistake 2: Missing the empty array exception check.**
    Failing to throw an error when reducing an empty array without an initial value leads to unexpected `undefined` returns that cause downstream crashes.

---

## 10. Debugging

### Inspecting Accumulator Transitions in Debugger
When debugging a complex reduction calculation (e.g. converting an array to an object):
1. Set a breakpoint inside your reducer callback.
2. Open the **Variables** pane in your debugger.
3. Add the `accumulator` variable to the **Watch** list.
4. Step through the loop. Verify that the accumulator updates correctly on each step (e.g. transitioning from `10` to `40` to `80`).

---

## 11. Real World Usage

- **Grouping Data**: Aggregating array items by properties (e.g. grouping users by their role).
- **Function Pipe Composition**: Chaining middleware functions together using `fns.reduce((res, f) => f(res), x)`.

---

## 12. Interview Preparation

### Question: What happens if you call `Array.prototype.reduce` on an empty array?
- **Wrong Answer**: It returns `0` or `undefined` automatically.
- **Good Answer**: It depends on whether an `initialValue` was provided:
    1. If an `initialValue` was provided, `reduce` returns the `initialValue` immediately without calling the callback.
    2. If NO `initialValue` was provided, it throws a `TypeError: Reduce of empty array with no initial value` exception.

---

## 13. Practice

### Exercises
1. **Easy**: Write a reduce polyfill and use it to calculate the sum of `[1, 2, 3, 4]`.
2. **Medium**: Write a test script validating that a reduce polyfill throws the correct `TypeError` when called on an empty array.
3. **Hard**: Implement a polyfill for `Array.prototype.reduceRight` which processes array elements in reverse order (right-to-left).

---

## 14. Mini Assignment

Write a reducer script that flattens a nested array of arrays `[[1, 2], [3, 4]]` using your custom reduce implementation.

---

## 15. Mini Project

Create a test runner suite `ReducePolyfillTester` that validates your custom reduce implementation against 5 Edge Cases (sparse arrays, empty arrays with initial value, empty arrays without initial value, explicit undefined initial values, and object aggregations).

```javascript
// reduce-polyfill-test-suite.js
Array.prototype.myReduce = function(callback, initialValue) {
  if (this == null) throw new TypeError("Cannot read properties of null");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");

  const O = Object(this);
  const len = O.length >>> 0;
  let k = 0;
  let accumulator;
  let isAccumulatorInitialized = false;

  if (arguments.length > 1) {
    accumulator = initialValue;
    isAccumulatorInitialized = true;
  }

  for (; k < len; k++) {
    if (k in O) {
      if (isAccumulatorInitialized) {
        accumulator = callback(accumulator, O[k], k, O);
      } else {
        accumulator = O[k];
        isAccumulatorInitialized = true;
      }
    }
  }

  if (!isAccumulatorInitialized) {
    throw new TypeError("Reduce of empty array with no initial value");
  }

  return accumulator;
};

// Verification tests
console.log("--- Running Reduce Polyfill Tests ---");

// Test 1: Sum Summation
const total = [1, 2, 3].myReduce((acc, x) => acc + x, 10);
console.log("Test 1 (Sum):", total === 16 ? "PASS" : "FAIL");

// Test 2: No Initial Value
const max = [5, 12, 3].myReduce((acc, x) => Math.max(acc, x));
console.log("Test 2 (Max):", max === 12 ? "PASS" : "FAIL");

// Test 3: Empty Array with Initial Value
const emptyWithVal = [].myReduce((acc, x) => acc + x, 42);
console.log("Test 3 (Empty + Val):", emptyWithVal === 42 ? "PASS" : "FAIL");

// Test 4: Empty Array without Initial Value Exception
try {
  [].myReduce((acc, x) => acc + x);
  console.log("Test 4 (Exception): FAIL");
} catch (e) {
  console.log("Test 4 (Exception): PASS (Caught:", e.message, ")");
}
```

---

## 16. Chapter Summary

- **`Array.prototype.reduce`** aggregates arrays to single values.
- Check for initial values using **`arguments.length`** inspections.
- Skip **sparse empty slots** using `in` operator checks.
- Throw a **`TypeError`** if reducing an empty array without an initial value.

---

## 17. Quiz

1. How many arguments does a reduce callback receive?
2. Can you pass `undefined` as a valid initial value?
3. What happens if you run reduce on an array of 1 item with no initial value?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for forEach**. We will explore array iteration callbacks, side effects, and index loops.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Array .reduce Polyfill array items computation loop running values accumulator reduce steps handles. Polyfill implementation edge cases ko safely resolve karne ke liye design hoti hai: **Initial value verification** (initial value missing checks, finding first non-empty element coordinate for base index) and **Sparse arrays check skipped**.

### Andar kya hota hai (Internal Working)

Reduce compilation loops details:
1. **Empty array check triggers**: If array is empty and no initial value is passed, the specification demands throwing a TypeError: Reduce of empty array with no initial value.
2. **First active element search**: If initial value is not passed, loop runs key lookups (i in this) to locate the first non-empty index coordinate, copying its value to accumulator variables.
3. **Indices traversal iteration**: Next loops continue index coordinates updating accumulator with results.

### Code Example samjho

`javascript
// Good: Reduce polyfill with sparse check and missing initial values
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== "function") throw new TypeError("Callback must be a function");
  
  let accumulator = initialValue;
  let startIndex = 0;
  
  // Find first active index if no initial value passed
  if (arguments.length < 2) {
    let found = false;
    for (let i = 0; i < this.length; i++) {
      if (i in this) {
        accumulator = this[i];
        startIndex = i + 1;
        found = true;
        break;
      }
    }
    if (!found) throw new TypeError("Reduce of empty array with no initial value");
  }
  
  for (let i = startIndex; i < this.length; i++) {
    if (i in this) {
      accumulator = callback(accumulator, this[i], i, this);
    }
  }
  return accumulator;
};
`

**Line by line:**
- rguments.length < 2 — checks if initialValue argument was omitted.
- if (i in this) — finds the first non-empty index slot to act as initial accumulator value.
- startIndex = i + 1 — ensures reduction starts from subsequent slot index, bypassing double computation on the initial element.
- ccumulator = callback(...) — recursively computes current value parameters.

### Sabse badi galti log karte hain

Initial value undefined values check validation skip templates. Empty arrays with no initial value throw exception parameters bypass cause runtime crashes. Always check arguments count boundaries.

### Yaad rakhne ki cheez

**If no initial value is passed, the first non-empty array slot becomes the accumulator, and traversal starts from the next slot.**

## 20. Completion Checklist

- [ ] I can write a spec-compliant `Array.prototype.reduce` polyfill.
- [ ] I understand how the accumulator is initialized.
- [ ] I know how to check for initial values using arguments count.
- [ ] I understand the empty array exception rules.
