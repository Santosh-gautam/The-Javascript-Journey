# Polyfill for forEach

- **Difficulty Level**: Beginner to Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of prototype methods, array iteration, and closures
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a postman delivering mail to a row of mailboxes:

- **Native `forEach` is walking to every mailbox and placing a letter inside**: You start at house 1 and drop the mail. You walk to house 2. If house 2 is empty/abandoned (sparse slot), you do not drop mail on the empty dirt; you skip it. You continue to the end of the street.
- **The Non-Breakable rule**: Once you start your route, you cannot stop mid-way. Even if you find the letter you were looking for at house 3, you are legally obligated to continue walking to the end of the street. There is no "break" or "return" to cut the route short (unlike standard `for` loops).
- **Return Value is empty**: You do not collect anything from the mailboxes. You return to the post office empty-handed (always returns `undefined`).

In JavaScript, **`forEach`** performs this side-effect-only iteration.

---

## 2. Problem

Legacy browser engines do not support `Array.prototype.forEach`.

If your codebase utilizes `forEach` to iterate collections (such as rendering DOM elements or updating local variables):
- The application crashes with a `TypeError` on older machines.
- Re-writing loops manually using standard `for` loops is repetitive.

---

## 3. Solution

We write an **`Array.prototype.forEach` Polyfill**.

By attaching it to `Array.prototype.myForEach`, we recreate the complete specification logic, ensuring type validation, context binding, sparse array skipping, and `undefined` returns.

---

## 4. Definition

- **`Array.prototype.forEach`**: A method that executes a provided function once for each array element.
- **Side Effect**: An operation that mutates state outside its local scope (e.g. modifying an external variable or updating the DOM), which is the primary purpose of using `forEach` since it has no return value.

---

## 5. Visualization

### forEach Side-Effect Flow

```
   Original Array: [ 10,  <empty>,  30 ]
                       |      |       |
                       v      v       v
   Iteration:       Run(10)  Skip!  Run(30)
                       │              │
                       v              v
               [ Mutate External Variable / DOM ]
```

Each existing element is passed to the callback, triggering side effects, while empty slots are ignored.

---

## 6. Internal Working

How the forEach engine executes loops:

1. **Hole Skipping**: The engine checks `k in O` to skip unassigned sparse slots, avoiding calling the callback on empty indices.
2. **Unbreakable Loop**: The callback is executed inside a standard sequential loop. Returning `false` or calling `return` inside the callback function only exits the current callback execution frame, not the outer loop, meaning the loop continues to the next element.

---

## 7. Code Examples

### Bad Practice: Breakable or Retaining Loops
Writing a polyfill that returns values or fails to check callback types.

```javascript
// Bad: Returns values and fails to validate types
Array.prototype.badForEach = function(callback) {
  for (let i = 0; i < this.length; i++) {
    // BUG: If callback returns false, this breaks the loop! (Native forEach cannot break)
    if (callback(this[i], i, this) === false) {
      break; 
    }
  }
};
```

### Good Practice: Standard forEach Polyfill
Check if the callback is a function, skip sparse holes, and return `undefined`.

```javascript
// Good: Spec-compliant forEach polyfill
Array.prototype.myForEach = function(callback, thisArg) {
  if (this === null || this === undefined) {
    throw new TypeError("Array.prototype.myForEach called on null or undefined");
  }
  if (typeof callback !== "function") {
    throw new TypeError(callback + " is not a function");
  }

  const O = Object(this);
  const len = O.length >>> 0;

  for (let i = 0; i < len; i++) {
    if (i in O) {
      // Execute callback, binding to thisArg context
      callback.call(thisArg, O[i], i, O);
    }
  }

  // Always returns undefined implicitly or explicitly
  return undefined; 
};
```

### Best Practice: Standard-Compliant Polyfill
Ensure complete compliance with standard specifications, checking all parameters and prototype contexts safely.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function(callback, thisArg) {
    if (this == null) {
      throw new TypeError("Array.prototype.forEach called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }

    const O = Object(this);
    const len = O.length >>> 0;

    for (let k = 0; k < len; k++) {
      if (k in O) {
        const kValue = O[k];
        // Pass: element, index, original array reference
        callback.call(thisArg, kValue, k, O);
      }
    }
  };
}
```

---

## 8. Dry Run

Let's dry run `[1, 2].myForEach(x => console.log(x))`:

- **Initialization**:
  - `O` = `{ 0: 1, 1: 2, length: 2 }`. `len` = `2`.
- **Loop (`i = 0`)**:
  - Is `0 in O`? Yes.
  - Calls `callback(1, 0, O)`. Console logs `1`.
- **Loop (`i = 1`)**:
  - Is `1 in O`? Yes.
  - Calls `callback(2, 1, O)`. Console logs `2`.
- **Return**: Returns `undefined`.

---

## 9. Common Mistakes

- **Mistake 1: Trying to break out of a `forEach` loop using the `break` keyword.**
    `break` is a syntax error inside a function callback. To create a breakable loop, use a standard `for...of` loop or the `Array.prototype.some()` or `every()` methods.
- **Mistake 2: Expecting `forEach` to return a value.**
    ```javascript
    const doubled = [1, 2].forEach(x => x * 2); // doubled is undefined! Use map instead.
    ```

---

## 10. Debugging

### Tracing Infinite Call Stack loops
If your loop callback causes execution halts:
1. Set a breakpoint inside your loop callback.
2. Inspect the **Call Stack** pane:
    - You will see your callback frame at the top.
    - Below it, you will see your `myForEach` polyfill frame.
3. Step through to verify the loop counter increments correctly and does not loop infinitely.

---

## 11. Real World Usage

- **DOM Rendering Loops**: Iterating collections of elements to mount templates onto the visual page.
- **Event Listeners bindings**: Looping through button arrays to attach click event handlers to each button.

---

## 12. Interview Preparation

### Question: Can you stop or break out of an `Array.prototype.forEach` loop?
- **Wrong Answer**: Yes, by using a `break` statement or returning `false`.
- **Good Answer**: No, there is no way to stop or break out of a `forEach` loop other than by throwing an exception. Returning a value (like `false` or `return`) inside the callback function only exits the current iteration's callback context frame; it does not stop the outer loop from continuing. If you need a breakable loop, you should use standard `for`, `for...of` loops, or methods like `every()` or `some()`.

---

## 13. Practice

### Exercises
1. **Easy**: Write a `forEach` polyfill and use it to print all values in a simple array.
2. **Medium**: Write a test script validating that a `forEach` polyfill correctly skips sparse array holes.
3. **Hard**: Implement a polyfill for `Array.prototype.every` and `Array.prototype.some` using a similar loop structure, showing how they support early exits.

---

## 14. Mini Assignment

Write a prototype helper `Array.prototype.myForEach` that updates a global counter variable, and verify it behaves correctly.

---

## 15. Mini Project

Create a test runner suite `ForEachPolyfillTester` that validates your custom forEach implementation against 5 Edge Cases (sparse arrays, empty arrays, context bindings, return values, and early exit attempts).

```javascript
// foreach-polyfill-test-suite.js
Array.prototype.myForEach = function(callback, thisArg) {
  if (this == null) throw new TypeError("Cannot read properties of null");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");

  const O = Object(this);
  const len = O.length >>> 0;

  for (let i = 0; i < len; i++) {
    if (i in O) {
      callback.call(thisArg, O[i], i, O);
    }
  }
  return undefined; // Explicitly return undefined
};

// Verification tests
console.log("--- Running forEach Polyfill Tests ---");

// Test 1: Simple loop
let sum = 0;
[1, 2, 3].myForEach(x => sum += x);
console.log("Test 1 (Sum):", sum === 6 ? "PASS" : "FAIL");

// Test 2: Return value check
const result = [1, 2].myForEach(x => x * 2);
console.log("Test 2 (Return):", result === undefined ? "PASS" : "FAIL");

// Test 3: Sparse Array skipping
let loopCount = 0;
[10, , 30].myForEach(() => loopCount++);
console.log("Test 3 (Sparse):", loopCount === 2 ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Array.prototype.forEach`** runs side-effect callbacks on array elements.
- It **always returns `undefined`**.
- **Sparse empty slots** are skipped during iteration.
- You **cannot break** or exit a forEach loop early.

---

## 17. Quiz

1. What value is returned by `[1, 2].forEach(x => x)`?
2. Does native forEach mutate the original array?
3. How do you skip an element inside a forEach loop?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for bind**. We will explore function context bindings, curry arguments propagation, and constructor prototype chains.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: orEach polyfill — side effects ke liye iteration, undefined return karta hai.
- **Concept**: orEach har element pe callback call karta hai — kuch return nahi karta, chaining nahi hoti.
- **Key Pattern**: Array.prototype.myForEach = function(fn) { for(let i=0; i<this.length; i++) fn(this[i], i, this); }.
- **Common Mistake**: orEach se reak karne ki koshish karna — nahi hota; reak chahiye to regular or loop use karo ya some().
## 19. Completion Checklist

- [ ] I can write a spec-compliant `Array.prototype.forEach` polyfill.
- [ ] I understand that forEach always returns undefined.
- [ ] I know how to handle sparse arrays in forEach loops.
- [ ] I understand why you cannot break out of a forEach loop.
