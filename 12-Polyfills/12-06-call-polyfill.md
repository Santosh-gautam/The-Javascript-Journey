# Polyfill for call

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of object property access, symbol keys, and dynamic `this` bindings
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a guest actor visiting a movie set:

- **Native `call` is like performing a guest role on a TV show**: You are an actor (the function). You do not belong to the TV show's permanent cast (the object). The director temporarily writes a guest character for you into the script (attaching the function as a temporary property), you perform your scene on set (executing the function on the object context), and then they write you out of the show (deleting the property).
- **Primitive Wrapping is like a hotel providing a robe**: If a guest walks in wearing wet swimwear (a primitive number or string), the luxury hotel wraps them in a comfortable object robe (wrapping in `Object(thisArg)`) before letting them onto the set.
- **The Global fallback**: If a guest walks in with no reservations (null or undefined), they are directed to the main public hotel lounge (the Global `window` or `globalThis` object).

In JavaScript, the **`call` polyfill** implements this temporary property attachment.

---

## 2. Problem

Older, restricted JavaScript engines do not support `Function.prototype.call`.

If your application needs to borrow methods from other prototypes (like calling `Array.prototype.slice.call(arguments)` to convert array-like objects into actual arrays):
- The script crashes with a `TypeError`.
- Decoupling methods from their target objects becomes difficult.

---

## 3. Solution

We write a **`Function.prototype.call` Polyfill**.

By attaching our custom implementation to `Function.prototype.myCall`, we recreate the native binding: wrapping primitives, defaulting to global objects, injecting the function temporarily using unique Symbol keys to prevent overwriting existing keys, and returning the execution result.

---

## 4. Definition

- **`Function.prototype.call`**: A method that calls a function with a given `this` value and arguments provided individually.
- **Method Borrowing**: A pattern where an object borrows a method from another object or prototype to avoid duplicating code.

---

## 5. Visualization

### Dynamic Context Injection during myCall

When calling `greet.myCall(user, "Hello")`:

```
   1. INJECT STEP:
      Add unique symbol key to user object pointing to greet function:
      user[Symbol("tempFn")] = greet;
  
   2. EXECUTE STEP:
      Call the method on the object context:
      user[Symbol("tempFn")]("Hello");  <--- Inside greet, "this" points to user!
  
   3. CLEANUP STEP:
      Delete the temporary property:
      delete user[Symbol("tempFn")];
```

---

## 6. Internal Working

How the engine resolves call contexts:

1. **Global Fallback (`globalThis`)**: If the context argument is `null` or `undefined`, the polyfill defaults to `globalThis` (which resolves to `window` in browsers or `global` in Node.js).
2. **Object Wrapping**: If the context is a primitive (like `42` or `"text"`), V8 does not allow setting properties on it directly. The polyfill coerces it using `Object(thisArg)`, creating a temporary Object wrapper (e.g. `Number` or `String` object).
3. **Unique Property Key**: To prevent overwriting an existing property on the context object (e.g. if the object already has a property named `fn`), the polyfill generates a unique key using `Symbol("tempFn")`.

---

## 7. Code Examples

### Bad Practice: Unsafe Property Overwriting
Using a hardcoded string key to attach the function can overwrite existing properties on the context object, causing bugs.

```javascript
// Bad: Overwrites existing properties and lacks primitive safety
Function.prototype.badCall = function(thisArg, ...args) {
  const context = thisArg || window;
  // BUG: If context already had a property named "fn", it is overwritten and lost!
  context.fn = this; 
  const result = context.fn(...args);
  delete context.fn;
  return result;
};
```

### Good Practice: Basic Call Polyfill
Use a unique key wrapper and handle primitive context objects safely.

```javascript
// Good: Simple call polyfill
Function.prototype.myCall = function(thisArg, ...args) {
  if (typeof this !== "function") {
    throw new TypeError("Must be called on a function");
  }

  // 1. Resolve context. Default to globalThis, wrap primitives in Object()
  const context = (thisArg !== null && thisArg !== undefined) 
    ? Object(thisArg) 
    : globalThis;

  // 2. Create unique property key using Symbol to prevent collision
  const fnKey = Symbol("tempFn");

  // 3. Inject function as temporary property on context
  context[fnKey] = this;

  // 4. Execute the function. Inside, "this" points to context!
  const result = context[fnKey](...args);

  // 5. Delete temporary property
  delete context[fnKey];

  return result;
};
```

### Best Practice: Spec-Compliant Call Polyfill
Ensure complete compliance with standard specifications, checking all parameters and prototype contexts safely.

```javascript
// Best Practice: Standard-compliant Polyfill
if (!Function.prototype.call) {
  Function.prototype.call = function(thisArg, ...args) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.call - target is not a function");
    }

    // Default to globalThis for null/undefined
    const context = (thisArg === null || thisArg === undefined)
      ? globalThis
      : Object(thisArg);

    const fnKey = Symbol("tempFn");
    
    // Inject and execute
    context[fnKey] = this;
    const result = context[fnKey](...args);
    
    delete context[fnKey];
    return result;
  };
}
```

---

## 8. Dry Run

Let's dry run `getName.myCall("Zara")`:

```javascript
function getName() { return this.valueOf(); }
```

- **Initialization**:
  - `this` points to `getName`.
  - `thisArg` is `"Zara"` (primitive string).
  - Resolves context: `Object("Zara")` (creates a `String` object wrapper).
  - Generates key: `fnKey` = `Symbol("tempFn")`.
- **Execution**:
  - Injects: `StringObject[Symbol("tempFn")] = getName`.
  - Calls: `StringObject[Symbol("tempFn")]()`.
  - Inside `getName`:
    - `this` points to the `StringObject`.
    - `this.valueOf()` returns `"Zara"`.
- **Cleanup**:
  - Deletes `StringObject[Symbol("tempFn")]`.
  - Returns `"Zara"`.

---

## 9. Common Mistakes

- **Mistake 1: Not wrapping primitives in `Object()`.**
    If you attempt to write a property on a primitive string:
    `"Zara"[fnKey] = this;`, V8 will throw a `TypeError` in strict mode because primitive values are read-only.
- **Mistake 2: Using `thisArg || window` for default checks.**
    If the user passes `false` or `""` (falsy values) as the context, `thisArg || window` will incorrectly coerce the value and default to `window`. Check for `null` and `undefined` explicitly.

---

## 10. Debugging

### Inspecting Contexts in debugger console
To verify that your custom call implementation is resolving contexts correctly:
1. Set a breakpoint inside your target function body.
2. Call it using `myCall`.
3. Check the value of `this` in the console:
    - It should be an Object representation of your passed context.
    - Confirm it does not contain the leaked temporary symbol key after execution completes.

---

## 11. Real World Usage

- **Method Borrowing**: borrowing Object prototype helpers:
  `Object.prototype.hasOwnProperty.call(obj, "prop")`.
- **Arguments to Array Conversions**: Converting function argument bindings:
  `Array.prototype.slice.call(arguments)`.

---

## 12. Interview Preparation

### Question: How does a custom `call` polyfill change the `this` binding of the target function without using native call/apply?
- **Wrong Answer**: By compiling the function to a string and replacing "this".
- **Good Answer**: In JavaScript, a function's `this` binding is determined by how it is invoked. If a function is called as an object method (e.g. `obj.method()`), `this` inside the method is set to `obj` automatically.
  - The polyfill utilizes this behavior. It temporarily attaches the target function to the context object as a property: `context[tempKey] = targetFunc`. It then executes the function via property access: `context[tempKey]()`. This naturally sets the `this` inside the function to the context object. Finally, it deletes the temporary property to leave the context object clean.

---

## 13. Practice

### Exercises
1. **Easy**: Write a call polyfill and use it to borrow a print method between two user objects.
2. **Medium**: Write a test script validating that a call polyfill correctly wraps primitive numbers, strings, and booleans in their object equivalents.
3. **Hard**: Write a custom call polyfill that works on frozen objects (objects frozen using `Object.freeze()` where you cannot append new properties). Hint: Use `Object.create` or bind wrappers.

---

## 14. Mini Assignment

Write a script that borrows the `Array.prototype.join` method to join characters of a custom string object using your custom call polyfill.

---

## 15. Mini Project

Create a test runner suite `CallPolyfillTester` that validates your custom call implementation against 5 Edge Cases (type safety, null/undefined defaults, primitive wrapping, symbol key collisions, and return value propagation).

```javascript
// call-polyfill-test-suite.js
Function.prototype.myCall = function(thisArg, ...args) {
  if (typeof this !== "function") throw new TypeError("Must be callable");

  const context = (thisArg === null || thisArg === undefined)
    ? globalThis
    : Object(thisArg);

  const fnKey = Symbol("tempFn");
  context[fnKey] = this;
  
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

// Verification tests
console.log("--- Running Call Polyfill Tests ---");

// Test 1: Method Borrowing
const cat = { sound: "Meow" };
function speak() { return this.sound; }
console.log("Test 1 (Borrow):", speak.myCall(cat) === "Meow" ? "PASS" : "FAIL");

// Test 2: Primitive Wrapping
function getPrimitiveType() { return typeof this; }
console.log("Test 2 (Primitive):", getPrimitiveType.myCall(42) === "object" ? "PASS" : "FAIL");

// Test 3: Null/Undefined Default
globalThis.testGlobalValue = "Global";
function getGlobal() { return this.testGlobalValue; }
console.log("Test 3 (Global):", getGlobal.myCall(null) === "Global" ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Function.prototype.call`** invokes a function with custom context and individual arguments.
- Default to **`globalThis`** if the context is null or undefined.
- Wrap **primitives** in Object wrappers to allow property attachments.
- Inject the function temporarily using a unique **`Symbol()`** key.
- **Delete** the temporary property after execution to keep the context object clean.

---

## 17. Quiz

1. What does `typeof globalThis` return in Node.js?
2. What happens if you try to add a property to a primitive number without wrapping it in an object first?
3. Why is `Symbol()` used as the temporary property key?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for apply**. We will explore array argument flattening, context object bindings, and temporary property injections.

---

## 19. Completion Checklist

- [ ] I can write a spec-compliant `Function.prototype.call` polyfill.
- [ ] I understand how the dynamic `this` binding is established using property access.
- [ ] I know how to wrap primitive values in objects.
- [ ] I know how to use `Symbol` keys to prevent property collisions.
