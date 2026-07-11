# Polyfill for bind

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of prototype inheritance, closure bindings, dynamic `this`, and constructor functions
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a custom template stamp manufacturer:

- **Native `bind` is like creating a customized stamp template**: You have a general address stamp that accepts a city, state, and name (function parameters). If you move your business to Delhi, you do not want to write `"Delhi, India"` by hand on every package. You configure a custom stamp (binding context) that has `"Delhi, India"` permanently engraved on it. When you stamp a package, you only need to press down the customer's name (concatenating execution arguments).
- **The Constructor check edge case**: If someone takes your stamp, melts down the rubber, and uses it to sculpt a brand-new custom sculpture (calling the bound function with `new`), the sculpture is a brand-new object. It should not inherit the `"Delhi, India"` text layout; it should inherit the original sculpture mold prototype rules instead.

In JavaScript, the **`bind` polyfill** implements this context and constructor logic.

---

## 2. Problem

Older browser runtimes do not support `Function.prototype.bind`.

If your application code relies on `.bind()` to preserve execution contexts (such as binding React event handlers or setting up curried helper utilities):
- The script crashes with a `TypeError`.
- Creating custom context binding wrappers manually in every file leads to repetitive code.

---

## 3. Solution

We write a **`Function.prototype.bind` Polyfill**.

By attaching our custom implementation to `Function.prototype.myBind`, we recreate the complete specification logic: context overriding, argument concatenation (currying), and the constructor `new` operator inheritance check.

---

## 4. Definition

- **`Function.prototype.bind`**: A method that creates a new function that, when called, has its `this` keyword set to the provided value, with a given sequence of arguments preceding any provided when the new function is called.
- **Constructor Check**: The requirement that if a bound function is instantiated using the `new` operator, the bound `this` argument is ignored, and the function behaves as a normal constructor.

---

## 5. Visualization

### Bind Context and Currying Flow

```
   Original Function: greet(greeting, name)
  
   1. Bind Phase:
      const helloGreet = greet.myBind(userContext, "Hello")  <--- Pre-binds "Hello"
  
   2. Execution Phase:
      helloGreet("Zara")                                     <--- Appends "Zara"
  
   3. Result:
      greet.apply(userContext, ["Hello", "Zara"])            <--- Executes combined
```

---

## 6. Internal Working

How the engine handles bound constructor instances:

1. **Context Resolution (`this instanceof bound`)**: When the returned bound function is called, the engine checks:
    - If `this instanceof bound` is `true`, it indicates the function was called as a constructor using the `new` operator.
    - The engine ignores the bound `thisArg` and uses the newly created `this` context instead, preserving native constructor behavior.
2. **Prototype Chain Binding**: To ensure the instantiated object inherits properties from the original function's prototype, the bound function's prototype is linked to the target function's prototype: `bound.prototype = Object.create(target.prototype)`.

---

## 7. Code Examples

### Bad Practice: Simple Context Mapping
A basic wrapper that returns a function but ignores argument concatenation and constructor instantiation.

```javascript
// Bad: Lacks argument currying and constructor support
Function.prototype.badBind = function(thisArg) {
  const target = this;
  return function() {
    // BUG: Discards arguments passed during binding!
    // BUG: If called with "new", it still forces "thisArg" context!
    return target.apply(thisArg, arguments);
  };
};
```

### Good Practice: Standard Bind Polyfill
Include argument concatenation (currying) and type checks.

```javascript
// Good: Handles currying but lacks constructor "new" checks
Function.prototype.myBindBasic = function(thisArg, ...bindArgs) {
  if (typeof this !== "function") {
    throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
  }

  const targetFn = this;

  return function(...execArgs) {
    // Concatenate pre-bound arguments with execution arguments
    return targetFn.apply(thisArg, bindArgs.concat(execArgs));
  };
};
```

### Best Practice: Spec-Compliant Bind Polyfill
Implement the constructor check using prototype linking and `instanceof` checks.

```javascript
// Best Practice: Production-ready Bind Polyfill
if (!Function.prototype.bind) {
  Function.prototype.bind = function(thisArg, ...bindArgs) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    const targetFn = this;

    // Define the wrapper function
    const bound = function(...execArgs) {
      // 1. Constructor Check: If called with 'new', use 'this' instead of 'thisArg'
      const context = this instanceof bound ? this : thisArg;
      
      // 2. Execute target function with concatenated arguments
      return targetFn.apply(context, bindArgs.concat(execArgs));
    };

    // 3. Link prototype chain to support inheritance on constructor calls
    if (targetFn.prototype) {
      // Use Object.create to prevent mutating the target's prototype directly
      bound.prototype = Object.create(targetFn.prototype);
    }

    return bound;
  };
}
```

---

## 8. Dry Run

Let's dry run `new BoundUser()` using our polyfill:

```javascript
function User(name) { this.name = name; }
const BoundUser = User.bind(null, "Zara");
const instance = new BoundUser();
```

### Step-by-Step State
- **Binding Phase**:
  - `User.bind(null, "Zara")` runs.
  - `targetFn` points to `User`. `bindArgs` = `["Zara"]`.
  - Links prototype: `bound.prototype` is set to a new object inheriting from `User.prototype`.
  - Returns `BoundUser` (the `bound` function).
- **Instantiation Phase (`new BoundUser()`)**:
  - Browser creates a new object `instance` inheriting from `BoundUser.prototype` (and thus `User.prototype`).
  - Calls `BoundUser` with `this` bound to `instance`.
  - Inside `bound`:
    - Is `this instanceof bound` (`instance instanceof BoundUser`) `true`? Yes!
    - `context` is set to `this` (`instance`), ignoring `null`.
    - Calls `User.apply(instance, ["Zara"])`.
    - `User` constructor runs, setting `instance.name = "Zara"`.
  - Returns `instance`.

---

## 9. Common Mistakes

- **Mistake 1: Directly assigning `bound.prototype = targetFn.prototype`.**
    Mutating properties on the bound prototype would unexpectedly mutate the original function's prototype as well. Always use `Object.create(targetFn.prototype)`.
- **Mistake 2: Using arrow functions to define the returned bound function.**
    Arrow functions do not have their own `this` context or prototype, making it impossible to use them as constructors or run `instanceof` checks on them.

---

## 10. Debugging

### Tracing Bound Contexts in Call Stack
When debugging a bound function's execution:
1. Set a breakpoint inside your target function body.
2. Trigger execution of the bound wrapper.
3. Look at the **Scope** pane:
    - Locate the `this` variable.
    - If the context matches your bound object, it is bound correctly.
    - If the context is `window` or `undefined`, check if the function was called as a constructor or if the `thisArg` was set to null.

---

## 11. Real World Usage

- **React Event Binding**: In class components, binding event methods in constructors: `this.handleClick = this.handleClick.bind(this)`.
- **Function Currying**: Creating specialized utility functions (like math operators or validation helpers) by pre-binding configurations.

---

## 12. Interview Preparation

### Question: Why does a custom `bind` polyfill need to handle the `new` operator, and how does it do it?
- **Wrong Answer**: Because `new` makes the function run faster.
- **Good Answer**: Because a bound function can be instantiated as a constructor using the `new` operator. When this happens, the ECMAScript spec dictates that the bound `thisArg` must be ignored, and the newly created object instance must act as the `this` context instead.
  - We handle this by checking `this instanceof bound` inside the returned function. If true, we delegate the execution context to `this` (the new instance) rather than `thisArg`. We also link the prototypes using `bound.prototype = Object.create(targetFn.prototype)` to preserve prototype inheritance.

---

## 13. Practice

### Exercises
1. **Easy**: Write a basic bind polyfill that works for standard function calls.
2. **Medium**: Write a test script validating that arguments passed during binding and execution are concatenated in the correct order.
3. **Hard**: Write a test script validating that a bound constructor correctly instantiates objects and inherits properties from the original function's prototype.

---

## 14. Mini Assignment

Write a prototype helper `Function.prototype.myBind` that throws an error if called on a non-function, and verify it behaves correctly.

---

## 15. Mini Project

Create a test runner suite `BindPolyfillTester` that validates your custom bind implementation against 5 Edge Cases (type safety, simple context binding, argument currying, constructor instantiation, and prototype inheritance).

```javascript
// bind-polyfill-test-suite.js
Function.prototype.myBind = function(thisArg, ...bindArgs) {
  if (typeof this !== "function") throw new TypeError("Must be bound to a function");
  
  const targetFn = this;
  const bound = function(...execArgs) {
    const context = this instanceof bound ? this : thisArg;
    return targetFn.apply(context, bindArgs.concat(execArgs));
  };

  if (targetFn.prototype) {
    bound.prototype = Object.create(targetFn.prototype);
  }
  return bound;
};

// Verification tests
console.log("--- Running Bind Polyfill Tests ---");

// Test 1: Context Binding
const user = { name: "Zara" };
function getName() { return this.name; }
const boundGetName = getName.myBind(user);
console.log("Test 1 (Context):", boundGetName() === "Zara" ? "PASS" : "FAIL");

// Test 2: Argument Currying
function add(a, b) { return a + b; }
const addTen = add.myBind(null, 10);
console.log("Test 2 (Currying):", addTen(5) === 15 ? "PASS" : "FAIL");

// Test 3: Constructor Instantiation
function Car(make) { this.make = make; }
Car.prototype.drive = function() { return `Driving ${this.make}`; };
const BoundCar = Car.myBind(null, "Tesla");
const myCar = new BoundCar();
console.log("Test 3 (Constructor Make):", myCar.make === "Tesla" ? "PASS" : "FAIL");
console.log("Test 4 (Constructor Proto):", myCar.drive() === "Driving Tesla" ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **`Function.prototype.bind`** returns a new function with locked context.
- Pre-bound arguments are **concatenated** with execution arguments (currying).
- If called with **`new`**, the bound `thisArg` is ignored.
- Link prototypes using **`Object.create()`** to preserve prototype inheritance.

---

## 17. Quiz

1. What does `typeof Function.prototype.bind` return?
2. What happens to the `this` context of a bound function if you call it using `.call()`?
3. Why is `bound.prototype` linked to `Object.create(targetFn.prototype)` instead of directly assigned?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for call**. We will explore dynamic method bindings, temporary property injection on context objects, and instant execution wrappers.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Function.prototype.bind Polyfill is a standard implementation representing function currying and dynamic execution contexts bindings. ind returns a **new function** with locked execution context and pre-loaded arguments values. Core cases: **Prototype preservation** (ensuring returning function prototype chain links back to parent prototype) and **
ew constructor context overrides** (if returning function is called as constructor, 	his should point to new instance).

### Andar kya hota hai (Internal Working)

Bind execution internals:
1. **Bound Function object instantiation**: Target returns a new closure function tracking scope inputs.
2. **Dynamic arguments concat**: Arguments passed during ind and subsequent runtime execution are merged: oundArgs.concat(newArgs).
3. **Constructor calls checks**: If V8 detects bound function invoked with 
ew keyword, 	his context binding shifts automatically from bound argument back to the new instance created by the constructor.

### Code Example samjho

`javascript
// Good: Bind polyfill with constructor overrides and arguments concat
Function.prototype.myBind = function(thisArg, ...boundArgs) {
  if (typeof this !== "function") throw new TypeError("Bind target must be callable");
  
  const originalFn = this;
  
  function boundFunction(...newArgs) {
    // Check if called as constructor: this instanceof boundFunction
    const isConstructor = this instanceof boundFunction;
    const context = isConstructor ? this : thisArg;
    return originalFn.apply(context, boundArgs.concat(newArgs));
  }
  
  // Preserve prototype chain
  if (originalFn.prototype) {
    boundFunction.prototype = Object.create(originalFn.prototype);
  }
  
  return boundFunction;
};
`

**Line by line:**
- 	his instanceof boundFunction — detects if execution context was created via 
ew operator. If true, allows 
ew constructor pattern overrides.
- oundArgs.concat(newArgs) — merges pre-loaded arguments with runtime arguments.
- Object.create(originalFn.prototype) — ensures subclass prototype inheritance chain matches parent function configuration.

### Sabse badi galti log karte hain

Subclass prototype chain link skip target code. Skipping prototype connection breaks 
ew constructor instantiations, causing instances to lose access to parent class methods.

### Yaad rakhne ki cheez

**ind returns a new pre-loaded function, prototype linkage is necessary for subclass constructors compatibility.**

## 20. Completion Checklist

- [ ] I can write a spec-compliant `Function.prototype.bind` polyfill.
- [ ] I understand how arguments are concatenated in currying.
- [ ] I know how to handle the `new` operator check.
- [ ] I understand how prototype inheritance is preserved on bound constructors.
