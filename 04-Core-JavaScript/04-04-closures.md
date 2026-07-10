# Closures

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding of Scope Chain and Lexical Environments
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you visit a custom soda machine at a restaurant.

You press a button to select a flavor base, say "Lemonade". The machine prints out a specialized dispensing cup (the inner function) that is permanently tuned to mix Lemonade.

You take this cup home. The main soda machine is miles away (the outer function has finished executing), but whenever you press the button on the cup, it still dispenses Lemonade because the cup carries the lemon syrup nozzle and recipe with it (the lexical scope is preserved).

It doesn't matter where or when you use the cup; it remembers its original mixing parameters.

In JavaScript, this dispensing cup is a **Closure**. It is an inner function that remembers and carries its parent's variables with it, wherever it goes.

---

## 2. Problem

Variables declared inside a function are normally cleaned up immediately when the function finishes executing.

Its stack frame is popped off the Call Stack, and all local variables are erased.

However, in web applications, we often need to preserve state:
- Tracking how many times a specific button was clicked.
- Storing configurations inside event listeners.
- Maintaining private variable access without polluting the global scope.

If variables were always destroyed when a function returned, we would have to store all persistent state in global variables, leading to security issues and namespace conflicts.

---

## 3. Solution

JavaScript utilizes **Closures**.

When an inner function is defined inside an outer function, it retains a reference to its outer Lexical Environment. Even if the outer function finishes executing and is popped off the Call Stack, the inner function preserves these variables in the **Memory Heap**, keeping them alive as long as the inner function is referenced.

---

## 4. Definition

A **Closure** is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In JavaScript, closures are created dynamically every time a function is created.

---

## 5. Visualization

### Call Stack vs. Heap Allocation for Closures

Consider this code:
```javascript
function makeCounter() {
  let count = 0;
  return function() { count++; return count; };
}
const counter = makeCounter();
counter();
```

#### Step 1: `makeCounter()` runs
- Stack pushes `makeCounter()` context.
- `count = 0` allocated.

#### Step 2: `makeCounter()` returns inner function and pops
- Stack pops `makeCounter()` context.
- Normally, `count` would be erased, but:
```
           CALL STACK                       MEMORY HEAP
   +-----------------------+          +-----------------------+
   |                       |          |                       |
   |   Global Context      |          |  [ Closure Scope ]    |
   |   - counter --------+-------------> [anonymous function]|
   |                       |          |   - count: 0 <--------+ (referenced by
   +-----------------------+          +-----------------------+  inner function)
```
Because the global `counter` variable references the inner function, and the inner function references `count`, the Garbage Collector cannot sweep `count` away. It remains preserved in the Heap.

---

## 6. Internal Working

V8 handles closures using these compilation and allocation rules:

1. **Scope Parsing**: When compiling the outer function, V8 scans the nested functions. If it detects that an inner function accesses a variable from the outer function's scope (called a "free variable"), V8 flags that variable.
2. **Context Promotion**: Instead of allocating the flagged variable on the Call Stack frame (which gets destroyed upon return), V8 allocates it inside a **Context Object** in the **Memory Heap**.
3. **Closure Object**: When the outer function returns the inner function:
    - V8 returns a `JSFunction` object representing the inner function.
    - This object contains an internal property named `[[Scopes]]`.
    - `[[Scopes]]` holds a pointer directly to the Context Object in the Heap containing the preserved variables.

---

## 7. Code Examples

### Bad Practice: Closures in Loops (The Var Trap)
Using `var` in a loop shares a single hoisted variable reference across all closures, leading to unexpected values when asynchronous callbacks execute.

```javascript
// Bad: Prints '3' three times after 1 second
for (var i = 1; i <= 3; i++) {
  setTimeout(function() {
    console.log("var index:", i); 
  }, 1000);
}
```

### Good Practice: Block Scoping Closures
Using `let` allocates a new block Lexical Environment and a distinct `i` variable for each loop iteration, preserving correct values inside each closure.

```javascript
// Good: Prints 1, 2, 3 after 1 second
for (let i = 1; i <= 3; i++) {
  setTimeout(function() {
    console.log("let index:", i);
  }, 1000);
}
```

### Best Practice: Data Encapsulation
Use closures to emulate private methods, hiding internal state from direct external mutations.

```javascript
// Best Practice: Private State Encapsulation
function createBankAcc(owner, initialBalance) {
  let balance = initialBalance; // Private variable

  return {
    deposit(amount) {
      if (amount > 0) balance += amount;
      return balance;
    },
    getBalance() {
      return balance;
    }
  };
}

const account = createBankAcc("Arjun", 1000);
account.deposit(500);
console.log(account.getBalance()); // 1500
console.log(account.balance);       // undefined (Safe from direct mutation!)
```

---

## 8. Dry Run

Let's dry run the private bank account execution:

```javascript
1: const myAcc = createBankAcc("Sam", 100);
2: myAcc.deposit(50);
```

### Step-by-Step State
- **Line 1 (Entering createBankAcc)**:
  - Stack pushes `createBankAcc()` context.
  - V8 checks for inner references. It sees `deposit` and `getBalance` reference `balance`.
  - V8 allocates `balance: 100` inside a heap Context Object, not on the Stack.
  - Returns an object containing the two methods. `[[Scopes]]` pointer of these methods links to the Context Object.
  - Stack pops `createBankAcc()`. GEC stores `myAcc` pointing to the returned methods.
- **Line 2 (Entering deposit)**:
  - Stack pushes `deposit(50)` context.
  - `deposit` tries to resolve `balance`. It looks at its `[[Scopes]]` property, follows the link to the heap Context Object, and updates `balance` from `100` to `150`.
  - Stack pops `deposit(50)`.
  - The updated balance remains saved in the Heap.

---

## 9. Common Mistakes

- **Mistake 1: Memory leaks from unused closures.**
    If you attach closures to global elements or long-lived event listeners and retain large objects inside, those objects cannot be garbage collected, consuming memory.
- **Mistake 2: Assuming closures store copies.**
    Closures store references to active variables. If you change the variable value after defining the closure, the closure reads the updated value.

---

## 10. Debugging

### Inspecting Closure Scope variables in Chrome DevTools
You can view the active references stored inside a closure's `[[Scopes]]` list:
1. Write a script:
    ```javascript
    function makeAdder(x) {
      return function(y) {
        debugger; // Break here
        return x + y;
      };
    }
    const add5 = makeAdder(5);
    add5(10);
    ```
2. Run this in Chrome DevTools.
3. When execution pauses:
    - Look at the **Scope** tab on the right.
    - Expand the **Closure (makeAdder)** entry.
    - You will see the variable `x: 5` listed. This proves that V8 is maintaining the outer `x` variable in memory.

---

## 11. Real World Usage

- **React Hooks**: `useState` uses closures. When your component renders, React returns state variables and a setter function. The setter preserves access to the internal React fiber state using a closure.
- **Node.js Middleware**: Configurations passed to middleware creators return custom router functions that retain access to the configuration options via closures.

---

## 12. Interview Preparation

### Question: What is a closure and how does it work in memory?
- **Wrong Answer**: A closure is a function inside another function that is used to save code lines.
- **Good Answer**: A closure is an inner function that retains access to variables in its outer lexical scope even after the outer function has finished executing. In memory, V8 promotes variables accessed by closures from the Call Stack to a Context Object in the Heap. This ensures these variables survive stack frames popping off and remain alive as long as the inner function is referenced.

---

## 13. Practice

### Exercises
1. **Easy**: Write a function `greetUser(greeting)` that returns a function which greets a specific username.
2. **Medium**: Refactor the classic `setTimeout` inside a `var` loop problem using an IIFE (Immediately Invoked Function Expression) to show how closures can capture state copies.
3. **Hard**: Explain how closures can lead to memory leaks when combined with DOM node references.

---

## 14. Mini Assignment

Write a function `limitCalls(fn, limit)` that wraps another function and allows it to be executed only up to a maximum number of times. Subsequent calls should log a warning.

---

## 15. Mini Project

Create a memoization function manager `memoize(fn)` that caches execution results inside a private scope dictionary closure, speeding up subsequent identical calculations.

```javascript
// memoize-closure.js
function memoize(fn) {
  // Private cache object sealed in this closure
  const cache = {};

  return function(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      console.log("Retrieving from Cache for args:", args);
      return cache[key];
    }
    
    console.log("Calculating fresh result for args:", args);
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
}

// Test case: Expensive math
const slowAdd = (a, b) => a + b;
const fastAdd = memoize(slowAdd);

fastAdd(10, 5); // Calculates
fastAdd(10, 5); // Cached!
```

---

## 16. Chapter Summary

- Functions retain access to their outer scopes via **Closures**.
- V8 stores closure-bound variables in the **Heap** using Context Objects.
- Closures enable private state patterns and data encapsulation.
- Using `let` in loops resolves the shared reference trap of `var` loop indexes.

---

## 17. Quiz

1. Where does V8 store variables that are accessed by closures?
2. What is the scope property that holds reference links inside a closure function?
3. Does a closure store a copy of a variable or a reference to it?

---

## 18. Next Chapter Preview

Now that we understand how functions preserve variable references in memory, we need to look at how functions resolve their calling context. In the next chapter, we will explore the **`this` Keyword**, analyzing execution binding rules in strict and non-strict modes.

---

## 19. Completion Checklist

- [ ] I can define what a closure is and why it exists.
- [ ] I understand how closures manage heap allocations.
- [ ] I can describe the difference between loop iterations using `var` and `let`.
- [ ] I can inspect closure variables in the Chrome DevTools Scope panel.
