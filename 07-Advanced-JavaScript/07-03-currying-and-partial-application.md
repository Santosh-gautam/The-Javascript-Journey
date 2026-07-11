# Currying & Partial Application

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of closures and lexical scope
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you own a custom wedding card printing shop:

- **Standard Function is like asking a designer to draw a complete card on the spot**: You walk in and say: *"Design me a card with gold borders, a floral pattern, and the names 'Zara & Ishan'."* The designer must draw the entire layout from scratch all at once.
- **Currying is like a step-by-step layout station**:
    1. At Station 1, the designer configures the borders. They choose Gold and return a layout template (Function 1).
    2. At Station 2, they stamp the Floral pattern onto the template and return a finalized pattern (Function 2).
    3. At Station 3, they print the names on the final card.
    If you have 100 cards to print with the same Gold borders and Floral patterns, you do not repeat stations 1 and 2. You reuse the template and simply feed different names into Station 3.
- **Partial Application is like a pre-assembled template**: You walk into a shop that already has cards pre-printed with Gold borders. You only need to choose the floral pattern and names.

In JavaScript, these configuration templates are created using currying and partial application.

---

## 2. Problem

Functions often require multiple arguments:
- An API logger requires a severity level, a module category, and the actual error message.
- A discount calculator requires a discount rate, a tax rate, and the base price.

If you call these functions repeatedly throughout your application:
- You end up passing the same configurations (like severity `"ERROR"` or tax rate `0.18`) over and over, duplicating code.
- Decoupling configuration logic from runtime execution becomes difficult.

---

## 3. Solution

We use **Currying** and **Partial Application**:
1. **Currying**: Converting a function of arity $N$ into a series of nested functions that each accept exactly 1 argument.
2. **Partial Application**: Pre-binding a subset of arguments to a function, returning a new function that accepts the remaining arguments.

---

## 4. Definition

- **Arity**: The number of arguments a function expects (accessible via `fn.length`).
- **Currying**: Transforming `fn(a, b, c)` into `fn(a)(b)(c)`.
- **Partial Application**: Pre-filling arguments of `fn(a, b, c)` to return a function `fn(b, c)` or `fn(c)`.

---

## 5. Visualization

### Currying vs. Partial Application Argument Mappings

```
   Original Function: add(a, b, c) -> Arity: 3
  
   Currying: String of Single-Argument Functions
   [ add(1) ] --------> Returns: f(b)
     [ f(2) ] --------> Returns: g(c)
       [ g(3) ] ------> Resolves: 6
  
   Partial Application: Binding multiple arguments at once
   [ add(1, 2) ] -----> Returns: h(c) (Pre-filled 2 arguments)
     [ h(3) ] --------> Resolves: 6
```

---

## 6. Internal Working

How V8 manages curried calls and arity records:

1. **Lexical Scope Scavenging**: When you call `add(1)(2)(3)`, V8 creates three nested activation records in the Heap. Each nested function forms a closure over the arguments passed to its parent, preserving them until the final function executes and resolves the calculation.
2. **Arity Property (`fn.length`)**: Every JavaScript function has an internal `[[Length]]` slot populated at creation. V8 reads this property to determine how many arguments the function expects, which is used by generic auto-curry wrappers to decide when to resolve the final evaluation.

---

## 7. Code Examples

### Bad Practice: Monolithic Configuration Calls
Passing the same configuration arguments repeatedly makes code verbose and hard to maintain.

```javascript
// Bad: Redundant configuration passing
function logMessage(severity, module, message) {
  console.log(`[${severity}] [${module}] ${message}`);
}

logMessage("ERROR", "DATABASE", "Connection timeout");
logMessage("ERROR", "DATABASE", "Query failed");
logMessage("ERROR", "AUTH", "Invalid credentials"); // Module changes, config repeats
```

### Good Practice: Partial Application with `.bind()`
Use `.bind()` to pre-fill configuration arguments, creating specialized helper functions.

```javascript
// Good: Pre-binding config parameters
function logMessage(severity, module, message) {
  console.log(`[${severity}] [${module}] ${message}`);
}

// Pre-fill "ERROR" and "DATABASE"
const logDbError = logMessage.bind(null, "ERROR", "DATABASE");

logDbError("Connection timeout"); // Output: [ERROR] [DATABASE] Connection timeout
logDbError("Query failed");       // Output: [ERROR] [DATABASE] Query failed
```

### Best Practice: Generic Auto-Currying Utility
Write a reusable curry wrapper that automatically converts any standard function into a curried function based on its arity.

```javascript
// Best Practice: Reusable Auto-Currying
function curry(fn) {
  return function curried(...args) {
    // If enough arguments are passed, execute the original function
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // Otherwise, return a function that collects the next arguments
    return function(...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  };
}

// Test case
const calculateVolume = (length, width, height) => length * width * height;
const curriedVolume = curry(calculateVolume);

console.log(curriedVolume(2)(3)(4)); // Output: 24 (Single calls)
console.log(curriedVolume(2, 3)(4)); // Output: 24 (Mixed calls)
```

---

## 8. Dry Run

Let's dry run the auto-curry execution of `curriedVolume(2)(3)(4)`:

- **Initial state**: `fn.length` is `3`.
- **First Call `curriedVolume(2)`**:
  - `args` = `[2]`.
  - Is `args.length` (1) >= `fn.length` (3)? No.
  - Returns a new anonymous function waiting for next arguments.
- **Second Call `(3)`**:
  - `nextArgs` = `[3]`.
  - Calls `curried(2, 3)` recursively.
  - `args` = `[2, 3]`.
  - Is `args.length` (2) >= `fn.length` (3)? No.
  - Returns another anonymous function.
- **Third Call `(4)`**:
  - `nextArgs` = `[4]`.
  - Calls `curried(2, 3, 4)` recursively.
  - `args` = `[2, 3, 4]`.
  - Is `args.length` (3) >= `fn.length` (3)? Yes.
  - Executes `calculateVolume(2, 3, 4)`. Returns `24`.

---

## 9. Common Mistakes

- **Mistake 1: Currying functions that use rest parameters (`...args`).**
    If a function uses rest parameters, `fn.length` returns `0`. The auto-curry utility will execute the function immediately on the first call, ignoring subsequent curried arguments.
- **Mistake 2: Confusing currying with partial application.**
  - Currying converts the function into a chain of single-argument functions: `f(a)(b)(c)`.
  - Partial application pre-fills some arguments, returning a function that accepts all remaining arguments at once: `f(a, b)(c)`.

---

## 10. Debugging

### Inspecting Closure Variables in Call Stack
When debugging nested curried functions:
1. Set a breakpoint inside the final execution line of your curried function.
2. Trigger execution.
3. Look at the **Scope** pane in Chrome DevTools:
    - Expand the **Closure** section.
    - You will see multiple Closure entries list, each representing a step in the curried chain.
    - Inspect these scopes to verify that the arguments passed to previous steps (like `length` or `width`) are preserved correctly in memory.

---

## 11. Real World Usage

- **Redux Middleware**: Redux middleware uses currying to access the store api, the next action dispatcher, and the action itself:
  ```javascript
  const loggerMiddleware = store => next => action => {
    console.log("dispatching", action);
    return next(action);
  };
  ```
- **Custom Event Handlers**: React elements use currying to pre-bind identifiers to change handlers:
  `onChange={handleFieldChange(fieldId)}`.

---

## 12. Interview Preparation

### Question: Write a currying function that handles infinite arguments: `add(1)(2)(3)...()`
- **Wrong Answer**: Writing nested loops with fixed parameters.
- **Good Answer**:
    ```javascript
    function add(a) {
      return function(b) {
        if (b === undefined) return a; // Stop condition
        return add(a + b);
      };
    }
    console.log(add(1)(2)(3)()); // Output: 6
    ```

---

## 13. Practice

### Exercises
1. **Easy**: Write a curried function `greet(greeting)(name)` that prints `"Hello, Zara"`.
2. **Medium**: Refactor a discount calculator `applyDiscount(rate, tax, price)` into a curried function, pre-binding a `0.10` discount rate.
3. **Hard**: Write a curry wrapper that supports placeholder arguments (e.g. `curry(fn)(_, 2)(1)` where `_` is a wildcard).

---

## 14. Mini Assignment

Write a curried validation logger that accepts a prefix tag (e.g. `"API"`), then a severity label (e.g. `"WARN"`), and prints messages tagged accordingly.

---

## 15. Mini Project

Create a modular CSS style generator helper `ElementStyler` that uses currying to pre-bind target elements, styling categories (e.g. `"color"`, `"fontSize"`), and applies final style values dynamically.

```javascript
// curried-styler.js
const curry = (fn) => {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...nextArgs) => curried.apply(this, args.concat(nextArgs));
  };
};

const applyStyle = (element, property, value) => {
  if (element && element.style) {
    element.style[property] = value;
    console.log(`Applied: ${property} = ${value}`);
  }
};

const curriedStyler = curry(applyStyle);

// Test case using a mock element
const mockDiv = { style: {} };

// Pre-bind target element
const styleDiv = curriedStyler(mockDiv);

// Pre-bind style category
const setDivColor = styleDiv("color");
const setDivFont = styleDiv("fontSize");

// Apply final values
setDivColor("red");
setDivFont("16px");

console.log("Mock Element Styles:", mockDiv.style); // { color: 'red', fontSize: '16px' }
```

---

## 16. Chapter Summary

- **Arity** is the number of arguments a function expects (`fn.length`).
- **Currying** translates a function of arity $N$ into $N$ nested single-argument functions.
- **Partial Application** pre-fills a subset of arguments, returning a function waiting for the rest.
- These patterns allow for highly configurable and reusable function templates.

---

## 17. Quiz

1. What does `fn.length` return for a function declared as `function test(a, b = 2) {}`?
2. What is the main difference between currying and partial application?
3. Why do curried functions use closures?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Memoization**. We will explore how to cache function execution results to optimize CPU-heavy operations.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Functions ka reuse karna alag arguments ke saath — repetitive partial config pass karna hota tha.
- **Concept**: Currying ek function ko unary functions ki chain mein convert karta hai — (a,b,c) banta hai (a)(b)(c).
- **Key Pattern**: const add = a => b => a + b; const add5 = add(5); add5(3); // 8 — pre-configured functions.
- **Common Mistake**: Currying aur Partial Application ko same samajhna — Partial Application kuch arguments fix karta hai, sabko unary nahi banata.
## 19. Completion Checklist

- [ ] I can write curried function signatures manually.
- [ ] I understand how to pre-bind parameters using partial application.
- [ ] I can write an auto-currying wrapper function.
- [ ] I know how to trace nested closures inside the debugger.
