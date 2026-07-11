# Functional Programming

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of function scoping and array iteration methods
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are managing an assembly line in a toy factory:

- **Imperative Programming is like micro-managing workers**: You stand over a worker and shout: *"Take this plastic sheet. Cut it at coordinate X. If it is red, paint it blue. Loop this 10 times."* You describe every step manually.
- **Declarative Programming is like setting up automated machines**: You place a hopper at the start and tell the line: *"Output: Blue Toys"*. The machines handle the steps internally.
- **Pure Functions are like specialized cutting stamps**: You feed a piece of wood into the stamp. It always outputs a star. The stamp does not change the paint color of nearby walls, it does not alter the size of the next piece of wood, and it does not write logs in a ledger. It simply takes input and returns output.
- **Immutability is like making new prototypes instead of carving the original**: If a designer wants a star toy to be larger, you do not slice the original prototype. You make a copy, adjust the size of the copy, and output the new version, leaving the original intact.
- **Function Composition is like chaining machines**: You connect the Cutter machine directly to the Painter machine, which connects to the Packager. Wood goes in; packaged blue star toys come out.

In JavaScript, Functional Programming makes code predictable, testable, and bug-free.

---

## 2. Problem

As systems scale, codebases written in a mutable, imperative style suffer from:
- **Shared Mutable State**: Multiple functions modify the same global object, making bugs hard to track.
- **Side Effects**: Calling a function to fetch stats unexpectedly mutates the user profile state.
- **Hard to Test**: Functions depend on external global variables, requiring complex mock setups for testing.

---

## 3. Solution

We apply **Functional Programming (FP)** principles:
1. **Pure Functions**: Writing code blocks that have zero side effects.
2. **Immutability**: Treating all data structures as read-only.
3. **Function Composition**: Combining simple, single-responsibility functions to build complex operations.

---

## 4. Definition

- **Pure Function**: A function that, given the same inputs, always returns the same output and produces no observable side effects.
- **Side Effect**: Any state change that is observable outside the called function (e.g. mutating a parameter, writing to disk, logging to console, updating the DOM).
- **Immutability**: A pattern where data cannot be modified after it is created.
- **Composition**: The process of combining two or more functions to produce a new function (e.g. `f(g(x))`).

---

## 5. Visualization

### Function Composition Data Flow

When executing `pipe(add1, multiply2)` on input `x = 5`:

```
   [ Input: x = 5 ]
          |
          v
   +--------------+
   |   add1(5)    |  --> Returns 6
   +--------------+
          |
          v
   +--------------+
   | multiply2(6) |  --> Returns 12
   +--------------+
          |
          v
   [ Output: 12   ]
```

---

## 6. Internal Working

How V8 processes functional code blocks:

1. **Garbage Collection Allocation**: Because immutability requires creating new objects rather than mutating existing ones, functional programming increases the rate of memory allocations in the Heap. V8 optimized this by using a **Generational Garbage Collector** (Young Generation space) that collects short-lived objects quickly.
2. **Optimization through Purity**: Pure functions are easier for compilers to optimize. If a function is pure, V8's optimizing compiler (TurboFan) can perform **Dead Code Elimination** (removing calls whose results are never used) and **Inlining** (replacing the function call with its direct body instructions) safely.

---

## 7. Code Examples

### Bad Practice: Mutable Imperative Array Processing
Mutating state variables directly in loops makes code hard to test and prone to out-of-sync bugs.

```javascript
// Bad: Mutates the original array and relies on shared state
const items = [{ name: "Pen", price: 10 }, { name: "Book", price: 50 }];
let total = 0;

function calculateTotal() {
  for (let i = 0; i < items.length; i++) {
    items[i].price = items[i].price * 0.9; // Direct mutation of original data!
    total += items[i].price;
  }
}
calculateTotal();
```

### Good Practice: Immutability and Pure Operations
Use pure array methods like `map` and `reduce` to return new data structures, keeping the source data intact.

```javascript
// Good: Declarative, pure, immutable array processing
const items = [{ name: "Pen", price: 10 }, { name: "Book", price: 50 }];

const applyDiscount = (itemList) => 
  itemList.map(item => ({ ...item, price: item.price * 0.9 })); // Returns new objects

const sumTotal = (itemList) => 
  itemList.reduce((sum, item) => sum + item.price, 0);

const discountedItems = applyDiscount(items);
const total = sumTotal(discountedItems);

console.log(items[0].price); // Output: 10 (Original data stays safe!)
```

### Best Practice: Function Pipe Composition
Create reusable pipelines by combining simple, single-responsibility functions.

```javascript
// Best Practice: Custom composition pipeline
const uppercase = (str) => str.toUpperCase();
const exclaim = (str) => `${str}!`;
const repeat = (str) => `${str} ${str}`;

// Pipe executes functions left-to-right
const pipe = (...fns) => (x) => fns.reduce((res, f) => f(res), x);

const shoutAndRepeat = pipe(uppercase, exclaim, repeat);

console.log(shoutAndRepeat("hello")); // Output: "HELLO! HELLO!"
```

---

## 8. Dry Run

Let's dry run the execution of a composite function: `compose(exclaim, uppercase)("test")`.
`compose` runs functions right-to-left: `compose = (f, g) => (x) => f(g(x))`.

### Step-by-Step State
- **Inner Call**:
  - `g` is bound to `uppercase`.
  - Calls `uppercase("test")`.
  - Returns `"TEST"`.
- **Outer Call**:
  - `f` is bound to `exclaim`.
  - Calls `exclaim("TEST")`.
  - Returns `"TEST!"`.
- **Final Result**: `"TEST!"`.

---

## 9. Common Mistakes

- **Mistake 1: Assuming `const` makes an object immutable.**
    `const` only prevents variable reassignment. The object properties can still be modified:
    ```javascript
    const user = { name: "Rohan" };
    user.name = "Ali"; // Works! The object was mutated.
    ```
- **Mistake 2: Calling non-pure methods inside pure loops.**
    For example, executing a network fetch or `console.log` inside a `.map()` callback introduces side effects, making it non-pure.

---

## 10. Debugging

### Tracing Mutations in Chrome Watch Panel
If your data is changing unexpectedly:
1. Set a breakpoint at the start of your function pipeline.
2. Add your data object (e.g. `items`) to the **Watch** pane in Chrome DevTools.
3. Step through the code line-by-line (F10).
4. If the values inside the Watch pane change color or update mid-function, trace the highlighted line to identify where the mutative operation occurred.

---

## 11. Real World Usage

- **React Component Architecture**: React components are designed to be pure functions of their props. Given the same props, a component should always render the same UI.
- **Redux Reducers**: Redux requires state updates to be written as pure functions that return a new state object: `(state, action) => newState`.

---

## 12. Interview Preparation

### Question: What is a Pure Function, and why are they useful?
- **Wrong Answer**: It is a function written without using classes.
- **Good Answer**: A pure function is a function that:
    1. Always returns the same output when passed the same inputs.
    2. Produces no side effects (does not modify global variables, files, database records, or the DOM).
  - **Benefits**: They are highly predictable, easy to test (no mocking needed), and simple to debug since their execution does not depend on or alter the rest of the application state.

---

## 13. Practice

### Exercises
1. **Easy**: Write a pure function `multiply(a, b)` and a non-pure version that reads an external multiplier variable.
2. **Medium**: Write a function `deepFreeze(obj)` that recursively calls `Object.freeze()` on nested objects to make them truly immutable.
3. **Hard**: Implement a `compose(...fns)` helper that combines multiple functions and executes them right-to-left.

---

## 14. Mini Assignment

Write a pure function `updateUserEmail(user, newEmail)` that returns a new user object with the updated email, leaving the original user object unmodified.

---

## 15. Mini Project

Create a modular data filter pipeline `DataPipeline` that takes a list of raw books records, filters by category, applies taxes, and formats descriptions using pure function composition.

```javascript
// functional-composition-pipeline.js
const rawBooks = [
  { title: "Functional JS", price: 100, genre: "Tech" },
  { title: "Mystery Island", price: 50, genre: "Fiction" },
  { title: "V8 Internals", price: 200, genre: "Tech" }
];

const filterTech = (books) => books.filter(b => b.genre === "Tech");
const applyTax = (books) => books.map(b => ({ ...b, price: b.price * 1.18 }));
const formatReport = (books) => books.map(b => `${b.title}: INR ${b.price.toFixed(0)}`);

const pipe = (...fns) => (x) => fns.reduce((res, f) => f(res), x);

// Combine operations into a single pipeline
const buildTechReport = pipe(filterTech, applyTax, formatReport);

const report = buildTechReport(rawBooks);
console.log("--- Generated Report ---");
console.log(report);
// Output: [ 'Functional JS: INR 118', 'V8 Internals: INR 236' ]
```

---

## 16. Chapter Summary

- **Functional Programming** focuses on pure functions and immutability.
- **Pure Functions** have same-input-same-output behavior and zero side effects.
- **Immutability** prevents modifying existing variables.
- **Composition** chains simple functions together to build complex data flows.

---

## 17. Quiz

1. Is `Math.random()` a pure function?
2. How does `Object.freeze()` help enforce immutability?
3. Does `pipe` execute functions left-to-right or right-to-left?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Currying & Partial Application**. We will explore how to translate multi-argument functions into nested single-argument function sequences, and look at real-world use cases.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Mutable state aur side effects se bugs track karna mushkil hota hai — state kab kahan change hua?
- **Concept**: FP mein pure functions (same input → same output, no side effects) aur immutable data prefer karte hain.
- **Key Pattern**: const result = data.filter(isValid).map(transform).reduce(aggregate, initial) — pure function pipeline.
- **Common Mistake**: "Pure function" ko "no async" samajhna — async bhi pure ho sakta hai agar same input pe same Promise state return kare.
## 19. Completion Checklist

- [ ] I can write pure functions with no side effects.
- [ ] I understand how to write immutable updates using spread operators.
- [ ] I can compose multiple functions into an execution pipeline.
- [ ] I know how to track object mutations in DevTools.
