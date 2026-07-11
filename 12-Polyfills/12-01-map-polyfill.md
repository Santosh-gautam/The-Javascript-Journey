# Polyfill for map

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of prototype methods, array iteration, and `this` context
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a chef in a bakery kitchen:

- **Native `map` is a specialized donut glazed dispenser machine**: The conveyor belt carries a row of raw dough rings (original array). As each ring passes under the nozzle, the machine applies a sweet glaze (executes callback) and places the glazed donut on a *new* clean tray (returns new array).
- **A Custom Polyfill is building the glazed dispenser by hand**: You set up your own conveyor loop. You must make sure:
  - You do not alter the original tray of raw dough rings (immutability).
  - If there is an empty space on the tray where a donut was dropped (sparse array slot), you do not spray glaze onto the empty metal. You skip the empty slot, leaving a matching empty space on the new tray.
  - You support adding custom toppings (context parameters).

In JavaScript, **Polyfills** recreate these native capabilities.

---

## 2. Problem

In older browser environments (such as legacy IE versions):
- Modern Array prototype methods like `map` are undefined.
- Scripts trying to call `array.map()` throw `TypeError: array.map is not a function`, crashing the site.

---

## 3. Solution

We write an **`Array.prototype.map` Polyfill**.

By attaching our custom implementation directly to `Array.prototype.myMap`, we recreate the complete specification logic, including sparse array preservation and `thisArg` context binding.

---

## 4. Definition

- **Polyfill**: A piece of code (usually JavaScript on the Web) used to provide modern functionality on older browsers that do not natively support it.
- **Sparse Array**: An array where some index slots are empty/unassigned (e.g. `[1, , 3]`), which is different from containing `undefined` or `null`.

---

## 5. Visualization

### Sparse Array Mapping Flow

```
   Original Array (Sparse): [ 1,  <empty>,  3 ]
                              |      |      |
                              v      v      v
   Processing Loop:        Map(1)  Skip!  Map(3) (Using 'index in array' check)
                              |      |      |
                              v      v      v
   Returned Array (Sparse): [ 2,  <empty>,  6 ]
```

Notice that the empty slot is preserved as empty, rather than converting to `undefined`.

---

## 6. Internal Working

How V8 handles prototype methods and sparse indices:

1. **Dynamic Prototype Lookup**: When you call `[1, 2].myMap()`, V8 checks the array instance. Finding no `myMap` property, it follows the prototype link (`__proto__`) to `Array.prototype.myMap` and executes it.
2. **`in` Operator check**: Sparse arrays have missing index keys in their underlying hash map. Checking `i in this` returns `false` if the index slot was never assigned, allowing the polyfill to skip the slot. Using `this[i] === undefined` would fail to distinguish between an unassigned slot and a slot explicitly set to `undefined`.

---

## 7. Code Examples

### Bad Practice: Unsafe Loop Mapping
A simple `for` loop mapping that fails on sparse arrays or missing type checks.

```javascript
// Bad: Fails on sparse arrays and lacks context bindings
Array.prototype.badMap = function(callback) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    // BUG: If index i is empty, this pushes undefined, destroying the sparse slot structure!
    result.push(callback(this[i], i, this)); 
  }
  return result;
};
```

### Good Practice: Basic Map Polyfill
Check if the callback is a function, and use the `in` operator to handle sparse indices.

```javascript
// Good: Handles sparse arrays safely
Array.prototype.myMap = function(callback, thisArg) {
  if (this === null || this === undefined) {
    throw new TypeError("Array.prototype.myMap called on null or undefined");
  }
  if (typeof callback !== "function") {
    throw new TypeError(callback + " is not a function");
  }

  const O = Object(this); // Handle primitive coercions
  const len = O.length >>> 0; // Convert length to 32-bit unsigned integer
  const A = new Array(len); // Allocate new array of same length

  for (let i = 0; i < len; i++) {
    // Check if index exists in the array (skips sparse holes!)
    if (i in O) {
      // Execute callback, binding to thisArg context
      A[i] = callback.call(thisArg, O[i], i, O);
    }
  }

  return A;
};
```

### Best Practice: The Spec-Compliant Array Map Polyfill
Ensure absolute compliance with the ECMAScript specification.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Array.prototype.map) {
  Array.prototype.map = function(callback, thisArg) {
    if (this == null) {
      throw new TypeError("Array.prototype.map called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }

    const O = Object(this);
    const len = O.length >>> 0;
    const A = new Array(len);

    for (let k = 0; k < len; k++) {
      if (k in O) {
        const kValue = O[k];
        // Pass: element, index, original array
        const mappedValue = callback.call(thisArg, kValue, k, O);
        A[k] = mappedValue;
      }
    }

    return A;
  };
}
```

---

## 8. Dry Run

Let's dry run `[1, , 3].myMap(x => x * 2)`:

- **Initialization**:
  - `O` = `{ 0: 1, 2: 3, length: 3 }` (Object wrapper).
  - `len` = `3`. `A` = `new Array(3)` (allocated array of size 3, all slots empty).
- **Execution Loop**:
  - **k = 0**: Is `0 in O`? Yes (holds value `1`).
    - Runs `callback(1, 0, O)`. Returns `2`.
    - Saves: `A[0] = 2`.
  - **k = 1**: Is `1 in O`? No (sparse empty slot).
    - Skip block. `A[1]` remains unassigned.
  - **k = 2**: Is `2 in O`? Yes (holds value `3`).
    - Runs `callback(3, 2, O)`. Returns `6`.
    - Saves: `A[2] = 6`.
- **Return**: Returns `A` which has structure `[2, <empty>, 6]`.

---

## 9. Common Mistakes

- **Mistake 1: Initializing the results array as an empty array `[]` and pushing values.**
    If you map a sparse array `[1, , 3]` using `.push()`, the result array will become `[2, 6]` (length 2), shifting the index of the third element from index 2 to 1 and losing the sparse structure.
- **Mistake 2: Forgetting to check if `callback` is a function.**
    Failing to validate the callback argument will cause the engine to throw confusing internal V8 errors rather than explicit TypeErrors.

---

## 10. Debugging

### Tracing Prototype Bindings in Console
To verify if your custom polyfill is active:
1. Open Chrome DevTools Console.
2. Log the prototype function: `console.log(Array.prototype.map)`.
3. If the output displays `ƒ map() { [native code] }`, the native browser code is active.
4. Override the prototype: `Array.prototype.map = myPolyfill`.
5. Log the function again. If it shows your custom code block, the polyfill is active.

---

## 11. Real World Usage

- **Cross-Browser Polyfills (Core-JS)**: Libraries like core-js load polyfills automatically on startup, checking if native implementations exist and patching them if missing.
- **Enterprise Web Apps**: Applications running on legacy browsers in schools or government offices load polyfill bundles to prevent script crashes.

---

## 12. Interview Preparation

### Question: How do you handle sparse arrays when writing a polyfill for `Array.prototype.map`?
- **Wrong Answer**: I check if `arr[i] === undefined` and skip it.
- **Good Answer**: I use the **`in` operator** (e.g. `if (i in O)`) to check if the index exists in the array object. This is because a sparse array slot (like `[1, , 3]`) is a missing key in the array object, whereas an explicit `undefined` (like `[1, undefined, 3]`) has the key `1` pointing to the value `undefined`. Using `in` ensures empty slots are skipped and preserved as empty, rather than being populated with `undefined`.

---

## 13. Practice

### Exercises
1. **Easy**: Write a map polyfill that works on simple arrays of numbers.
2. **Medium**: Write a test script that validates the `thisArg` context parameter inside your custom map helper.
3. **Hard**: Write a polyfill for `Array.prototype.map` and test it against a sparse array of length 10 containing only 2 elements, verifying empty slots are preserved.

---

## 14. Mini Assignment

Write a prototype helper `Array.prototype.myMap` that throws an error if called on `null`, and test it with a mock array wrapper.

---

## 15. Mini Project

Create a test runner suite `MapPolyfillTester` that validates a custom map implementation against 5 Edge Cases (sparse arrays, empty arrays, context binding, string objects, and callback exception bubbling).

```javascript
// map-polyfill-test-suite.js
Array.prototype.myMap = function(callback, thisArg) {
  if (this == null) throw new TypeError("Cannot read properties of null");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");
  
  const O = Object(this);
  const len = O.length >>> 0;
  const A = new Array(len);

  for (let i = 0; i < len; i++) {
    if (i in O) {
      A[i] = callback.call(thisArg, O[i], i, O);
    }
  }
  return A;
};

// Verification tests
console.log("--- Running Map Polyfill Tests ---");

// Test 1: Simple mapping
const doubles = [1, 2, 3].myMap(x => x * 2);
console.log("Test 1 (Simple):", JSON.stringify(doubles) === "[2,4,6]" ? "PASS" : "FAIL");

// Test 2: Sparse array
const sparse = [1, , 3].myMap(x => x * 2);
console.log("Test 2 (Sparse):", !(1 in sparse) && sparse[0] === 2 ? "PASS" : "FAIL");

// Test 3: Context Binding
const ctx = { multiplier: 3 };
const factored = [1, 2].myMap(function(x) { return x * this.multiplier; }, ctx);
console.log("Test 3 (Context):", JSON.stringify(factored) === "[3,6]" ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Array.prototype.map`** creates a new array by applying a callback to each item.
- **Sparse arrays** contain unassigned index keys in their underlying objects.
- Handle sparse arrays safely using the **`in` operator** check.
- Support custom **`thisArg`** contexts using `.call(thisArg, ...)` triggers.

---

## 17. Quiz

1. What does `[1, , 3].length` return?
2. What is the purpose of the `>>> 0` bitwise operation in V8 length checks?
3. Why does `[1, , 3].hasOwnProperty(1)` return `false`?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for filter**. We will explore Boolean filter closures, accumulator arrays, and conditional elements mappings.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Array .map Polyfill write targets core array prototype inheritance concepts test run detail check keys maps parameters. Polyfill is standard custom JS method that mimics modern array map behaviors on older browser engines. Key edge cases: **Sparse Arrays preservation** (empty indices lookup preservation) and **Callback arguments context mapping** (	hisArg references pass checks).

### Andar kya hota hai (Internal Working)

V8 prototype chain and map internals:
1. **Prototype lookup routing**: [1, 2].myMap() traces prototype link checks: Array.prototype.myMap pointer is located.
2. **Sparse index checks**: Empty array slots [1, , 3] represent missing keys in internal V8 arrays hash maps. Checking i in this (or Object.prototype.hasOwnProperty.call(this, i)) checks if slot was assigned, letting polyfill skip empty indexes during iteration.
3. **Context bindings parameters**: .call(thisArg, this[i], i, this) ensures callback runs inside custom context scope references.

### Code Example samjho

`javascript
// Good: Safe Map Polyfill supporting sparse arrays and context
Array.prototype.myMap = function(callback, thisArg) {
  if (typeof callback !== "function") throw new TypeError("Callback must be a function");
  
  const result = new Array(this.length); // Preserve sparse length structure
  
  for (let i = 0; i < this.length; i++) {
    if (i in this) { // Sparse check: check if index key exists!
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  return result;
};
`

**Line by line:**
- 
ew Array(this.length) — initializes output array preserving exact size parameters.
- if (i in this) — V8 check verifying slot contains initialized value (not empty). Avoids pushing undefined inside empty slots, preserving sparse gaps.
- callback.call(thisArg, ...) — executes callback inside optional 	hisArg context.

### Sabse badi galti log karte hain

or...of loops use inside polyfill which visits sparse elements converting them to undefined. Always use standard indexed loop check keys i in this or hasOwnProperty checks to maintain sparse layout.

### Yaad rakhne ki cheez

**i in this checks if array index is assigned, preserving sparse slots in output arrays.**

## 20. Completion Checklist

- [ ] I can write a spec-compliant `Array.prototype.map` polyfill.
- [ ] I understand the difference between sparse empty slots and undefined.
- [ ] I know how to use `in` operator checks to handle sparse arrays.
- [ ] I understand how `thisArg` binds function context inside polyfills.
