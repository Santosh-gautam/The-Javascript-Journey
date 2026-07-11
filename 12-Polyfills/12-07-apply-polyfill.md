# Polyfill for apply

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Completion of Chapter 12-06 (call polyfill), understanding of spread operator and array-like objects
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a guest actor visiting a movie set:

- **`call` is like receiving your costume items one by one**: The wardrobe team hands you a hat, then hands you boots, then hands you a vest individually (individual arguments).
- **`apply` is like receiving your costume items packaged together inside a single suitcase**: The wardrobe team hands you a single zip-up suitcase containing the hat, boots, and vest (arguments passed as an array). Before you step onto the set, you unzip the suitcase, spread the items out, and wear them (spreading the array into individual parameters).
- **The validation error**: If they hand you a solid block of wood instead of a suitcase (passing a non-array-like primitive), you cannot open or unzip it. You throw your hands up in confusion (throwing a `TypeError`).

In JavaScript, the **`apply` polyfill** implements this suitcase-style arguments routing.

---

## 2. Problem

Older browser engines do not support `Function.prototype.apply`.

If your application needs to borrow methods and pass parameters dynamically compiled as lists (such as calling math functions like `Math.max.apply(null, [1, 5, 3])`):
- The script crashes with a `TypeError`.
- Passing dynamic arrays of parameters to functions becomes complex.

---

## 3. Solution

We write a **`Function.prototype.apply` Polyfill**.

By attaching our custom implementation to `Function.prototype.myApply`, we replicate the native binding: wrapping primitive contexts, validating if the arguments parameter is an array-like object (throwing specifications TypeErrors if not), injecting the function temporarily using unique Symbol keys, spreading the arguments array, and returning the result.

---

## 4. Definition

- **`Function.prototype.apply`**: A method that calls a function with a given `this` value and arguments provided as an array (or an array-like object).
- **CreateListFromArrayLike**: The internal ECMAScript operation that converts an array-like object into a flat list of arguments, throwing errors if the target cannot be converted.

---

## 5. Visualization

### Dynamic Suitcase Unzipping during myApply

When calling `greet.myApply(user, ["Hello", "Zara"])`:

```
   1. INJECT STEP:
      Add unique symbol key to user object pointing to greet function:
      user[Symbol("tempFn")] = greet;
  
   2. UNZIP & SPREAD STEP:
      Unzip the array suitcase and spread elements individually:
      user[Symbol("tempFn")](...["Hello", "Zara"]) === user[Symbol("tempFn")]("Hello", "Zara");
  
   3. CLEANUP STEP:
      Delete the temporary property:
      delete user[Symbol("tempFn")];
```

---

## 6. Internal Working

How the engine validates and processes arguments arrays:

1. **Arguments Type Validation**:
    - If the second argument is `null` or `undefined`, it is treated as an empty array `[]`.
    - If the second argument is a primitive value (like a number or string), it cannot be converted to a list of arguments. The polyfill throws a `TypeError: CreateListFromArrayLike called on non-object`.
2. **Context and Injection**: Similar to the `call` polyfill, the context is wrapped in an object if it is a primitive, and the function is temporarily attached to a unique symbol key to prevent collisions.

---

## 7. Code Examples

### Bad Practice: Missing Arguments Type Checks
Failing to validate the second parameter or attempting to spread non-objects crashes with generic browser engine errors instead of spec-compliant exceptions.

```javascript
// Bad: Lacks parameter validation and primitive wrapping
Function.prototype.badApply = function(thisArg, argsArray) {
  const context = thisArg || window;
  const fnKey = Symbol("tempFn");
  context[fnKey] = this;
  // BUG: If argsArray is null, spreading (...argsArray) will throw an error!
  // BUG: If argsArray is a string, it will spread the characters individually instead of throwing!
  const result = context[fnKey](...argsArray); 
  delete context[fnKey];
  return result;
};
```

### Good Practice: Standard Apply Polyfill
Check if the second argument is array-like, resolve default arrays, and wrap primitive contexts.

```javascript
// Good: Recreates apply specifications
Function.prototype.myApply = function(thisArg, argsArray) {
  if (typeof this !== "function") {
    throw new TypeError("Must be called on a function");
  }

  // 1. Resolve context
  const context = (thisArg !== null && thisArg !== undefined) 
    ? Object(thisArg) 
    : globalThis;

  // 2. Validate argsArray
  let resolvedArgs = [];
  if (argsArray !== null && argsArray !== undefined) {
    if (typeof argsArray !== "object") {
      throw new TypeError("CreateListFromArrayLike called on non-object");
    }
    // Convert array-like objects (e.g. arguments or NodeLists) to actual arrays
    resolvedArgs = Array.from(argsArray);
  }

  const fnKey = Symbol("tempFn");
  context[fnKey] = this;

  // 3. Spread parameters into function execution
  const result = context[fnKey](...resolvedArgs);

  delete context[fnKey];
  return result;
};
```

### Best Practice: Spec-Compliant Apply Polyfill
Ensure complete compliance with standard specifications, checking all parameters and prototype contexts safely.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Function.prototype.apply) {
  Function.prototype.apply = function(thisArg, argsArray) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.apply - target is not a function");
    }

    const context = (thisArg === null || thisArg === undefined)
      ? globalThis
      : Object(thisArg);

    let resolvedArgs = [];
    if (argsArray !== null && argsArray !== undefined) {
      if (typeof argsArray !== "object") {
        throw new TypeError("CreateListFromArrayLike called on non-object");
      }
      resolvedArgs = Array.from(argsArray);
    }

    const fnKey = Symbol("tempFn");
    context[fnKey] = this;
    
    // Spread array elements into individual arguments
    const result = context[fnKey](...resolvedArgs);
    
    delete context[fnKey];
    return result;
  };
}
```

---

## 8. Dry Run

Let's dry run `Math.max.myApply(null, [10, 5, 20])`:

- **Initialization**:
  - `this` points to `Math.max`.
  - `thisArg` is `null`. `argsArray` = `[10, 5, 20]`.
  - Resolves context: `null` defaults to `globalThis`.
  - Validates `argsArray`: Type is object. `resolvedArgs` = `[10, 5, 20]`.
  - Generates key: `fnKey` = `Symbol("tempFn")`.
- **Execution**:
  - Injects: `globalThis[Symbol("tempFn")] = Math.max`.
  - Spreads and calls: `globalThis[Symbol("tempFn")](10, 5, 20)`.
  - Inside `Math.max`: Evaluates numbers individually, returning `20`.
- **Cleanup**:
  - Deletes `globalThis[Symbol("tempFn")]`.
  - Returns `20`.

---

## 9. Common Mistakes

- **Mistake 1: Passing a primitive string or number as the arguments parameter without checks.**
    If the user calls `func.apply(null, "text")`, the polyfill should throw a `TypeError` rather than spreading the characters `"t"`, `"e"`, `"x"`, `"t"` into the parameters.
- **Mistake 2: Mutating the passed arguments array.**
    If your code modifies the `argsArray` directly, it mutates the array reference in the caller's code, causing side effects. Always copy it using `Array.from()`.

---

## 10. Debugging

### Tracing Array-like structures in Scope Panel
If your polyfill is throwing `CreateListFromArrayLike` errors on custom objects:
1. Set a breakpoint inside your polyfill at the type check line.
2. Open the **Variables** pane.
3. Check the type and properties of the `argsArray` variable:
    - Verify if it has a `.length` property and indexed keys (e.g. `0`, `1`). If missing, it is not a valid array-like object.

---

## 11. Real World Usage

- **Dynamic Math Reductions**: Finding maximum or minimum values inside dynamic lists: `Math.max.apply(null, array)`.
- **Inheritance constructors**: Calling parent class constructors inside child classes before ES6 classes: `Parent.apply(this, arguments)`.

---

## 12. Interview Preparation

### Question: What is the main difference between `call` and `apply`, and how is it handled in their polyfills?
- **Wrong Answer**: Call is for objects, apply is for arrays.
- **Good Answer**:
  - **Call** accepts arguments **individually** (comma-separated): `fn.call(context, arg1, arg2)`.
  - **Apply** accepts arguments as a **single array-like object**: `fn.apply(context, [arg1, arg2])`.
  - In their polyfills, this difference is handled in the parameters. The `call` polyfill uses rest parameters `(...args)` to collect arguments, while the `apply` polyfill accepts a single `argsArray` parameter, validates that it is an object (throwing a `TypeError` if not), and unzips it by spreading it into the dynamic function call: `context[fnKey](...resolvedArgs)`.

---

## 13. Practice

### Exercises
1. **Easy**: Write an apply polyfill and use it to borrow a concatenation method.
2. **Medium**: Write a test script validating that your apply polyfill throws a `TypeError` when a string is passed as the second argument.
3. **Hard**: Write a custom apply polyfill that supports array-like objects (e.g. a plain object `{0: "hello", 1: "world", length: 2}`), verifying that it converts and spreads them correctly.

---

## 14. Mini Assignment

Write a prototype helper `Function.prototype.myApply` that logs the number of arguments passed in the array before executing the function.

---

## 15. Mini Project

Create a test runner suite `ApplyPolyfillTester` that validates your custom apply implementation against 5 Edge Cases (type safety, null arguments default, primitive arguments error, array-like object support, and return value propagation).

```javascript
// apply-polyfill-test-suite.js
Function.prototype.myApply = function(thisArg, argsArray) {
  if (typeof this !== "function") throw new TypeError("Must be callable");

  const context = (thisArg === null || thisArg === undefined)
    ? globalThis
    : Object(thisArg);

  let resolvedArgs = [];
  if (argsArray !== null && argsArray !== undefined) {
    if (typeof argsArray !== "object") {
      throw new TypeError("CreateListFromArrayLike called on non-object");
    }
    resolvedArgs = Array.from(argsArray);
  }

  const fnKey = Symbol("tempFn");
  context[fnKey] = this;

  const result = context[fnKey](...resolvedArgs);
  delete context[fnKey];
  return result;
};

// Verification tests
console.log("--- Running Apply Polyfill Tests ---");

// Test 1: Math Max
const max = Math.max.myApply(null, [100, 500, 200]);
console.log("Test 1 (Math):", max === 500 ? "PASS" : "FAIL");

// Test 2: Array-like Object support
const arrayLike = { 0: "Zara", 1: "Aarav", length: 2 };
function greet(user1, user2) { return `Hello ${user1} and ${user2}`; }
const greeting = greet.myApply(null, arrayLike);
console.log("Test 2 (Array-like):", greeting === "Hello Zara and Aarav" ? "PASS" : "FAIL");

// Test 3: Primitive Arguments Exception
try {
  greet.myApply(null, "invalid");
  console.log("Test 3 (Exception): FAIL");
} catch (e) {
  console.log("Test 3 (Exception): PASS (Caught:", e.message, ")");
}
```

---

## 16. Chapter Summary

- **`Function.prototype.apply`** invokes a function with custom context and array arguments.
- Default to **`globalThis`** if the context is null or undefined.
- Validate `argsArray`. Throw a **`TypeError`** if it is a primitive.
- Unzip and pass arguments using the **spread operator (`...`)**.
- **Delete** the temporary property after execution to keep the context object clean.

---

## 17. Quiz

1. What exception is thrown when calling `apply` with a number as the second argument?
2. Does `Function.prototype.apply` return the function's output?
3. Why is `Array.from` used in the apply polyfill?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for Promise**. We will explore promise state machines, microtask queue scheduling, and resolving value handlers from scratch.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Function.prototype.apply Polyfill coordinates arguments passing as array layouts. Unlike call which accepts comma-separated lists, pply accepts parameters as single array-like structures. Core cases: **Arguments arrays type validations** (throws type error if args is non-object primitive), **Global fallback** and **Symbol mapping**.

### Andar kya hota hai (Internal Working)

Apply execution details:
1. **Parameter validations**: If second argument is omitted, treats as empty list []. If it represents a primitive non-object value, throws TypeError.
2. **Dynamic bindings**: Attached via Symbol to normalized context object.
3. **Method execution**: JavaScript executes method spreading the arguments array, then cleans up keys.

### Code Example samjho

`javascript
// Good: Apply polyfill with validations and symbol attachments
Function.prototype.myApply = function(thisArg, argsArray) {
  if (typeof this !== "function") throw new TypeError("Apply target must be callable");
  
  // Arguments validation
  if (argsArray !== null && argsArray !== undefined && typeof argsArray !== "object") {
    throw new TypeError("CreateListFromArrayLike called on non-object");
  }
  
  const context = (thisArg === null || thisArg === undefined) ? globalThis : Object(thisArg);
  const fnKey = Symbol("tempFn");
  context[fnKey] = this;
  
  // If argsArray is null/undefined, default to empty array
  const finalArgs = argsArray ? [...argsArray] : [];
  const result = context[fnKey](...finalArgs);
  
  delete context[fnKey];
  return result;
};
`

**Line by line:**
- 	ypeof argsArray !== "object" — checks if arguments array is valid object representation. Throws type error on non-objects.
- inalArgs = argsArray ? [...argsArray] : [] — normalizes values arrays list safely.
- context[fnKey](...finalArgs) — spreads arguments array inside temporary method execution.

### Sabse badi galti log karte hain

Second argument validations skip dynamic array copy spreads directly. If user passes non-array object primitive, raw javascript spread operation throws generic crash messages instead of spec-compliant exceptions. Always pre-validate input types.

### Yaad rakhne ki cheez

**Verify second argument is object array-like before execution, default to empty array for undefined parameters.**

## 20. Completion Checklist

- [ ] I can write a spec-compliant `Function.prototype.apply` polyfill.
- [ ] I understand how to validate array-like arguments.
- [ ] I know how to convert and spread array-like arguments.
- [ ] I understand the difference between call and apply polyfill parameters.
