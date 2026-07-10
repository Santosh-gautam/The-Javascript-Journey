# Polyfill for flatten array

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of recursion, array prototypes, and array checkers (`Array.isArray`)
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a packing clerk working in a shipping warehouse:

- **A nested array is like boxes inside boxes**: You have a large shipping crate (original array). Inside, there are some direct items (primitives like numbers) and some nested cardboard boxes (sub-arrays). Inside those nested boxes, there are even smaller gift boxes (deeper sub-arrays).
- **Flattening with Depth is unpacking box layers**:
  - **`flat(1)` (Depth 1)**: You open only the top-level cardboard boxes. You take out their contents and place them directly in the shipping crate. If a gift box was inside a cardboard box, you do not unpack it; it remains boxed.
  - **`flat(Infinity)`**: You open every single box, regardless of how deep it is, until there are only loose items sitting directly in the shipping crate.
- **Sparse slots are empty packaging spacers**: If you open a box and find a cardboard spacer compartment containing nothing (sparse empty slot), you throw it away. You do not place `"empty"` tags in your shipping crate.

In JavaScript, **`Array.prototype.flat`** implements this box unpacking algorithm.

---

## 2. Problem

Older browser runtimes do not support `Array.prototype.flat`.

If your application processes nested arrays (such as compiling comment trees, tag listings, or multi-dimensional grid structures):
- The browser crashes with `TypeError: arr.flat is not a function`.
- Resolving nestings using custom manual loops leads to verbose, hard-to-read code.

---

## 3. Solution

We write an **`Array.prototype.flat` Polyfill**.

By attaching our custom implementation to `Array.prototype.myFlat`, we replicate standard flattening: validating array contexts, accepting optional depth limits (defaulting to 1), recursively unpacking elements, and skipping sparse empty slots.

---

## 4. Definition

- **`Array.prototype.flat`**: A method that creates a new array with all sub-array elements concatenated into it recursively up to the specified depth.
- **Recursive Flattening**: An algorithmic process where sub-arrays are unpacked by repeatedly calling the same flattening function with a decremented depth counter.

---

## 5. Visualization

### Recursive Depth Flattening Timeline

Unpack `[1, [2, [3]]]` with `depth = 1`:

```
   Original Array: [ 1,  [2, [3]] ]
                     │      │
                     │      └── (Is array? Yes. Depth (1) > 0?)
                     │            │
                     │            └── [ Unpack 1 Level ] -> [ 2, [3] ]
                     │
                     v
   Concatenated:   [ 1,  2,  [3] ] (Nested array [3] remains boxed since depth reached 0)
```

---

## 6. Internal Working

How the flattening engine operates:

1. **Depth Parameter Defaulting**: The native spec dictates that if the depth argument is omitted, it defaults to `1`: `depth = depth === undefined ? 1 : Number(depth)`.
2. **Sparse Hole Skipping**: During iteration, the polyfill checks `k in O` to skip empty slots. When sub-arrays are unpacked, their internal sparse holes are also skipped, producing a dense output array.
3. **Recursive Reduction**: On encountering a nested array element, the polyfill calls itself recursively, passing `depth - 1`. It then appends the returned elements using `concat` or pushes.

---

## 7. Code Examples

### The Flatten Array Polyfill
Write a robust, recursively nested flat prototype helper.

```javascript
// flatten-array-polyfill.js
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth) {
    if (this == null) {
      throw new TypeError("Array.prototype.flat called on null or undefined");
    }

    const O = Object(this);
    const len = O.length >>> 0;
    
    // 1. Default depth to 1 if undefined, coerce other types to integer
    const maxDepth = depth === undefined ? 1 : Math.max(0, Math.floor(Number(depth)) || 0);
    const result = [];

    // Helper recursion function
    function flatten(arr, currentDepth) {
      const arrLen = arr.length >>> 0;
      for (let i = 0; i < arrLen; i++) {
        if (i in arr) { // Skip sparse holes!
          const val = arr[i];
          if (Array.isArray(val) && currentDepth > 0) {
            // 2. Recursively flatten sub-array, decrementing depth limit
            flatten(val, currentDepth - 1);
          } else {
            // 3. Push primitives or elements when depth limit is reached
            result.push(val);
          }
        }
      }
    }

    flatten(O, maxDepth);
    return result;
  };
}
```

### Good Practice: Simple Recursive Flat (FlatAll)
A clean, lightweight recursive function useful when you always want to flatten all levels (infinite depth).

```javascript
// Good: Flatten all levels recursively
function flattenAll(arr) {
  const result = [];
  
  function recurse(target) {
    for (let i = 0; i < target.length; i++) {
      if (i in target) {
        if (Array.isArray(target[i])) {
          recurse(target[i]);
        } else {
          result.push(target[i]);
        }
      }
    }
  }
  
  recurse(arr);
  return result;
}
```

### Best Practice: Safe Pipeline Flattening
Implement flat map pipelines using custom flat wrappers, ensuring compatibility with legacy runtimes.

```javascript
// Best Practice: Chained Pipeline
Array.prototype.myFlat = Array.prototype.flat || function(depth) {
  // Polyfill implementation here...
};

const userGroups = [
  { name: "Admin Group", users: ["Aarav", "Zara"] },
  { name: "Dev Group", users: ["Kabir", ["Reva", "Ishan"]] }
];

// Compile a flat list of all users, unpacking nested arrays
const allUsers = userGroups
  .map(group => group.users)
  .flat(2); // Flattens up to 2 levels deep

console.log("Compile Users List:", allUsers);
// Output: [ "Aarav", "Zara", "Kabir", "Reva", "Ishan" ]
```

---

## 8. Dry Run

Let's dry run `[1, [2, 3]].flat()`:

- **Initialization**:
  - `O` = `{ 0: 1, 1: [2, 3], length: 2 }`.
  - `depth` is undefined -> `maxDepth` defaults to `1`.
  - `result` = `[]`.
- **Recursive step `flatten(O, 1)`**:
  - **i = 0**: Is `0 in O`? Yes.
    - `val` = `1`. `Array.isArray(1)` is `false`.
    - Action: `result.push(1)`. `result` is `[1]`.
  - **i = 1**: Is `1 in O`? Yes.
    - `val` = `[2, 3]`. `Array.isArray([2, 3])` is `true`.
    - Since `currentDepth` (1) > 0, calls `flatten([2, 3], 0)`.
- **Nested recursion `flatten([2, 3], 0)`**:
  - Loops over `[2, 3]` with `currentDepth = 0`.
  - **i = 0**: `val` = `2`. Push to `result`. `result` = `[1, 2]`.
  - **i = 1**: `val` = `3`. Push to `result`. `result` = `[1, 2, 3]`.
  - Nested call completes.
- **Return**: Returns `[1, 2, 3]`.

---

## 9. Common Mistakes

- **Mistake 1: Using `String(depth)` checking instead of `Number(depth)`.**
    If the user passes a depth parameter as string `"2"`, the comparison `depth > 0` might behave unexpectedly. Always cast to integer numbers using `Math.floor(Number(depth))`.
- **Mistake 2: Missing the sparse index check.**
    Using simple `for...of` loops to flatten will read sparse empty holes as `undefined`, pushing `undefined` elements into the output array.

---

## 10. Debugging

### Tracing Array Nestings in Watch Panel
When debugging deeply nested arrays (e.g. 5+ levels deep):
1. Set a breakpoint inside your recursive `flatten` helper function.
2. Add `currentDepth` and `val` to the **Watch** pane in Chrome DevTools.
3. Step through the recursion. Check that the `currentDepth` decrements by exactly 1 on each nested call, and that the function returns immediately when `currentDepth` reaches `0`.

---

## 11. Real World Usage

- **Flattening Database Payloads**: Transforming relational joins returned as nested arrays into simple flat tables.
- **Tree Parsing Routines**: Converting nested comment replies into a chronological flat feed.

---

## 12. Interview Preparation

### Question: What is the default depth limit of `Array.prototype.flat()`, and how do you flatten all levels regardless of depth?
- **Wrong Answer**: The default is Infinity.
- **Good Answer**: The default depth limit of `Array.prototype.flat()` is **`1`**.
  - If you want to flatten all levels recursively regardless of depth, you should pass **`Infinity`** as the depth argument: `arr.flat(Infinity)`.
  - In my polyfill, passing `Infinity` works because the check `currentDepth > 0` remains true across all recursive levels (since `Infinity - 1` is still `Infinity`), allowing the recursion to unpack all nested arrays until it reaches primitive values.

---

## 13. Practice

### Exercises
1. **Easy**: Write a flat polyfill and use it to flatten a 2D array of numbers.
2. **Medium**: Write a test script validating that a flat polyfill correctly skips sparse empty holes in both outer and nested arrays.
3. **Hard**: Implement a polyfill for the native `Array.prototype.flatMap()` method, which maps each element using a mapping function and then flattens the result by 1 level.

---

## 14. Mini Assignment

Write a prototype helper `Array.prototype.myFlat` that logs the max depth level reached during flattening.

---

## 15. Mini Project

Create a test runner suite `FlatPolyfillTester` that validates your custom flat implementation against 5 Edge Cases (default depth, custom depth limits, Infinity depth, sparse arrays, and primitive arguments coercion).

```javascript
// flat-polyfill-test-suite.js
Array.prototype.myFlat = function(depth) {
  if (this == null) throw new TypeError("Cannot read properties of null");
  
  const O = Object(this);
  const len = O.length >>> 0;
  const maxDepth = depth === undefined ? 1 : Math.max(0, Math.floor(Number(depth)) || 0);
  const result = [];

  function flatten(arr, currentDepth) {
    const arrLen = arr.length >>> 0;
    for (let i = 0; i < arrLen; i++) {
      if (i in arr) {
        const val = arr[i];
        if (Array.isArray(val) && currentDepth > 0) {
          flatten(val, currentDepth - 1);
        } else {
          result.push(val);
        }
      }
    }
  }

  flatten(O, maxDepth);
  return result;
};

// Verification tests
console.log("--- Running Flat Polyfill Tests ---");

// Test 1: Default Depth (1)
const flat1 = [1, [2, [3]]].myFlat();
console.log("Test 1 (Default):", JSON.stringify(flat1) === "[1,2,[3]]" ? "PASS" : "FAIL");

// Test 2: Infinity Depth
const flatInf = [1, [2, [3, [4]]]].myFlat(Infinity);
console.log("Test 2 (Infinity):", JSON.stringify(flatInf) === "[1,2,3,4]" ? "PASS" : "FAIL");

// Test 3: Sparse Array skipping
const sparse = [1, , [2, , 3]].myFlat();
console.log("Test 3 (Sparse):", sparse.length === 3 && sparse[1] === 2 && sparse[2] === 3 ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Array.prototype.flat`** unpacks nested arrays up to a specified depth.
- The **default depth** is `1`. Pass **`Infinity`** to flatten all levels.
- Skip **sparse empty slots** using `in` operator checks.
- Unpack nested elements recursively, decrementing the depth count by `1` on each level.

---

## 17. Quiz

1. What does `[1, [2]].flat(0)` return?
2. Does `Array.prototype.flat` mutate the original array?
3. Why does `Infinity - 1` evaluate to `Infinity`?

---

## 18. Next Chapter Preview

We have completed **Module 12: Polyfills**! You have built custom spec-compliant polyfills for array iterators, function context binders, async promise primitives, rate limiters, object duplicators, and array flatteners. In the next module, **Module 13: Machine Coding**, we will study the **Spec - Custom Carousel**.

---

## 19. Completion Checklist

- [ ] I can write a spec-compliant `Array.prototype.flat` polyfill.
- [ ] I understand how depth limit parameters are checked.
- [ ] I know how to flatten all levels recursively using `Infinity`.
- [ ] I know how to check V8 variables watch tables to debug recursion depths.
