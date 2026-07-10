# Core JS Questions

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Completion of Modules 01 to 06
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are preparing for a job interview:

- **A "Bad" Candidate is like a parrot**: They memorize definitions word-for-word. When asked about closures, they say: *"Closures are functions inside functions."* They cannot explain how memory is managed, they cannot write an example on a whiteboard, and they collapse when asked to debug a closure memory leak.
- **A "Best" Candidate is like a senior engineer explaining blueprints to a junior**: They don't just state definitions; they describe the *why* and *how*. They draw the lexical scope frames on the board, explain the V8 heap pointers, warn about garbage collection, and demonstrate real-world production use cases. They make the interviewer feel confident in their engineering depth.

In this chapter, we study how to answer core JavaScript conceptual questions like a senior engineer.

---

## 2. Question 1: What is a Closure, and what are its practical use cases?

### The Question
> "Explain closures in JavaScript. How do they work, and why would you use them?"

### The "Good" Answer (Middle Level)
A closure is a feature in JavaScript where an inner function has access to the outer (enclosing) function's variables even after the outer function has finished executing. JavaScript does this automatically because of lexical scoping. We use closures to create private variables, curried functions, and stateful helper utilities.

### The "Best" Answer (Senior Level)
In JavaScript, a closure is the combination of a function bundled together with references to its surrounding state (its **lexical environment**).

At the runtime level, when a function is declared, it receives an internal `[[Environment]]` property pointing to the active execution context's variable environment map. When the outer function returns the inner function:
- The outer function's stack frame is popped off the Call Stack.
- However, V8 preserves the outer function's variable scope in the Heap because the returned inner function's `[[Environment]]` slot holds an active reference to it.
- This prevents the variables from being garbage collected.

#### Production Use Cases
1. **Encapsulation (Private State)**: Creating data structures that cannot be modified directly from the outside, exposing only specific methods (like a counter or bank transaction).
2. **Currying & Partial Application**: Pre-configuring functions with setup variables (e.g. log tags or host names) before executing calculations.
3. **Memoization**: Persisting a private cache map between function calls.

```javascript
// Example: Creating private state using a closure
const createWallet = (initialBalance) => {
  let balance = initialBalance; // Private variable in closure scope
  
  return {
    deposit(amount) {
      if (amount > 0) balance += amount;
    },
    getBalance() {
      return balance;
    }
  };
};

const wallet = createWallet(100);
wallet.deposit(50);
console.log(wallet.getBalance()); // Output: 150
console.log(wallet.balance);      // Output: undefined (Secure encapsulation!)
```

---

## 3. Question 2: Explain the differences between `var`, `let`, and `const`

### The Question
> "How do var, let, and const differ in scoping, hoisting, and memory allocation?"

### The "Good" Answer (Middle Level)
- `var` is function-scoped, can be redeclared, and is hoisted to the top of its scope, initializing as `undefined`.
- `let` and `const` are block-scoped (scoped to the nearest curly braces `{}`), cannot be redeclared in the same block, and are not initialized during hoisting.
- `const` requires immediate initialization and cannot be reassigned, whereas `let` can be reassigned.

### The "Best" Answer (Senior Level)
The differences lie in three main categories: Scoping, Hoisting lifecycle, and Global Object binding.

#### 1. Scoping
- `var` is **Function Scoped**. It ignores block boundaries like `if` or `for` loops.
- `let` and `const` are **Block Scoped**. They are strictly isolated to the nearest enclosing `{}` block.

#### 2. Hoisting & The Temporal Dead Zone (TDZ)
- `var` is hoisted and initialized as `undefined` at the start of the execution context compilation.
- `let` and `const` are also hoisted, but they are **not initialized**. They enter the **Temporal Dead Zone (TDZ)** from the start of the block scope until the execution line reaches their declaration. Accessing them inside the TDZ throws a `ReferenceError`.

#### 3. Global Object Binding
- Variables declared with `var` at the global level are attached to the global object (`window` or `globalThis`).
- Variables declared with `let` and `const` at the global level are stored in a script-level lexical scope, avoiding global object pollution.

```javascript
// TDZ Demonstration
{
  // console.log(x); // ReferenceError: Cannot access 'x' before initialization (TDZ active)
  let x = 10; // TDZ ends for x here
  console.log(x); // Output: 10
}
```

---

## 4. Question 3: How does Prototype-based Inheritance work?

### The Question
> "How does inheritance work in JavaScript? Contrast it with classical class-based inheritance."

### The "Good" Answer (Middle Level)
JavaScript does not use classical class inheritance. Instead, it uses prototypal inheritance. Every object has a link to a prototype object (accessible via `__proto__`). When you try to read a property on an object, JavaScript checks the object first. If missing, it looks up the prototype chain until it finds it, or hits `null`.

### The "Best" Answer (Senior Level)
JavaScript implements prototypal inheritance directly using object links, which is dynamic and happens at runtime.

#### 1. The Prototype Link (`[[Prototype]]`)
Every JavaScript object has an internal slot called `[[Prototype]]` (exposed in browsers as `__proto__`). When a constructor function is declared, it automatically receives a `.prototype` property. When you instantiate an object using `new MyClass()`, the engine sets the object's `__proto__` to point to `MyClass.prototype`.

#### 2. Property Lookup (The Prototype Chain)
When you access a property (e.g. `obj.toString()`):
1. V8 searches the object's own properties.
2. If missing, V8 traverses the link to `obj.__proto__` and checks its properties.
3. V8 continues traversing this chain (e.g. up to `Object.prototype`) until it finds the property or reaches `null`.
4. If the end of the chain is reached and the property is still missing, it returns `undefined`.

#### 3. Shadowing
Setting a property directly on an instance (e.g. `obj.version = 2`) overrides (shadows) properties of the same name on the prototype, keeping the prototype unmodified.

```javascript
const animal = { eats: true };
const rabbit = Object.create(animal); // rabbit.__proto__ points to animal

console.log(rabbit.eats); // Output: true (Inherited property)
rabbit.eats = false;      // Shadows eats property on instance
console.log(rabbit.eats); // Output: false
console.log(animal.eats); // Output: true (Prototype remains safe)
```

---

## 5. Question 4: Explain the Event Loop and execution queue priorities

### The Question
> "Explain the Event Loop. What is the priority difference between the Microtask Queue and the Macrotask Queue?"

### The "Good" Answer (Middle Level)
JavaScript is single-threaded, meaning it can only do one thing at a time. The Event Loop is the engine mechanism that processes asynchronous callbacks. When an async task (like `setTimeout` or a fetch call) finishes, its callback is pushed into a queue. The Event Loop waits for the Call Stack to become empty, then picks the first callback from the queue and pushes it onto the stack to run.

### The "Best" Answer (Senior Level)
The Event Loop coordinates the execution of code, event handling, and rendering ticks inside the browser. It prioritizes tasks using two main execution queues:

#### 1. The Call Stack
Maintains the active synchronous execution contexts. As long as there are functions on the stack, the Event Loop is blocked from processing queues or rendering.

#### 2. The Microtask Queue
- Holds high-priority callbacks (Promises `.then` callbacks, `MutationObserver`, `queueMicrotask`).
- **Priority Rule**: At the end of every task, the Event Loop **must drain the entire Microtask Queue completely** before continuing, even if new microtasks are appended during execution.

#### 3. The Macrotask (Task) Queue
- Holds low-priority events (`setTimeout`, `setInterval`, user clicks, I/O events).
- **Execution Rule**: The Event Loop pulls exactly **one** macrotask from the queue, runs it, then immediately returns to check the Microtask Queue and rendering cycles before pulling the next macrotask.

```javascript
console.log("Start");

setTimeout(() => console.log("Timeout (Macrotask)"), 0);

Promise.resolve().then(() => console.log("Promise (Microtask)"));

console.log("End");

// Output Order:
// 1. Start
// 2. End
// 3. Promise (Microtask)
// 4. Timeout (Macrotask)
```

---

## 6. Question 5: What is the difference between `==` and `===`?

### The Question
> "Explain the difference between loose equality and strict equality. How does coercion work?"

### The "Good" Answer (Middle Level)
- `===` is strict equality. It compares both the value and the type of the operands. If types differ, it returns `false`.
- `==` is loose equality. If the types of the operands differ, JavaScript converts them to a common type first (type coercion) before performing the comparison.

### The "Best" Answer (Senior Level)
The difference is defined by whether type coercion is applied according to the **Abstract Equality Comparison Algorithm** (for `==`) versus the **Strict Equality Comparison Algorithm** (for `===`).

#### 1. Strict Equality (`===`)
No type conversion is performed. If the types differ, it returns `false`.
- *Exceptions*: `NaN === NaN` returns `false` (in JS, NaN is not equal to itself). `+0 === -0` returns `true`.

#### 2. Loose Equality (`==`)
If the types differ, the engine applies coercion rules recursively:
- **Null & Undefined**: `null == undefined` always returns `true`. Neither is equal to any other value.
- **String & Number**: Converts the String to a Number, then compares.
- **Boolean & Anything**: Converts the Boolean to a Number (true is 1, false is 0), then compares.
- **Object & Primitive**: Converts the Object to a Primitive using `Symbol.toPrimitive`, `valueOf()`, or `toString()`, then compares.

```javascript
console.log([] == false); // Output: true!
// Coercion Steps:
// 1. Array is an Object, Boolean is false. Convert false to Number (0): [] == 0.
// 2. Convert Array to primitive. [].toString() yields empty string "": "" == 0.
// 3. String vs Number: Convert "" to Number (0): 0 == 0.
// 4. Returns true.
```

---

## 7. Chapter Summary

- **Closures** preserve lexical environments in Heap memory.
- **`let`/`const`** are block-scoped and enter the Temporal Dead Zone (TDZ).
- **Prototypal Inheritance** uses dynamic reference chains on `__proto__`.
- The **Event Loop** prioritizes the **Microtask Queue** over the **Macrotask Queue**.
- **`==`** triggers the **Abstract Equality Comparison** algorithm; **`===`** bypasses coercion.

---

## 8. Quiz

1. Which queue hosts Promise `.then` callbacks?
2. Does V8 delete local scopes from the Heap if they are referenced inside a closure?
3. Why does `[] == false` evaluate to `true`?

---

## 9. Next Chapter Preview

In the next chapter, we will study **Coding Patterns**. We will explore essential data structure patterns in JavaScript like two-pointers, sliding window, and tree traversals.

---

## 10. Completion Checklist

- [ ] I can explain closures and prototype chains using technical terms.
- [ ] I understand the Temporal Dead Zone (TDZ).
- [ ] I can describe the execution sequence of the Event Loop queues.
- [ ] I understand Abstract Equality Coercion rules.
