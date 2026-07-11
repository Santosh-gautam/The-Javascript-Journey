# Functions & Execution Context

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding of stack memory and variables
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a chef running a professional restaurant kitchen.

You have a master cookbook (Global Execution Context). At first, you stand in the main room prepping basic global stocks and preheating the ovens.

Suddenly, an order ticket comes in for "Lasagna". To make it, you must enter a specialized cooking station (Function Execution Context). You bring ingredients from the main pantry (parameters) into this station. You set up a dedicated chopping board and timers (local variables) that belong *only* to the Lasagna recipe.

If the Lasagna recipe tells you to make "Béchamel Sauce", you step into an even smaller corner (nested Function Context) to make the sauce, pausing your progress on the Lasagna.

Once the sauce is complete, you return to the Lasagna station. When the Lasagna is finished, you plate it, clean the station (garbage collection), and return to the main prep room.

In JavaScript, the active stations you step into are **Execution Contexts**, and the stack of tickets on your counter is the **Call Stack**.

---

## 2. Problem

Computers need to track which variables belong to which functions, what order to execute nested calls, and where to return when a function completes.

Without a structured execution environment:
- Declaring `let x = 5` inside one function would overwrite `let x = 10` inside another.
- The computer would forget where it was in a program after a nested function call finished, losing its place like a reader without a bookmark.

---

## 3. Solution

JavaScript utilizes **Execution Contexts** to scope data and the **Call Stack** to manage execution order.

Every time you call a function, a new execution box is pushed onto the stack. This box houses its own isolated variable storage. When the function returns, its box is popped off the stack, and control returns to the box directly underneath.

---

## 4. Definition

- **Execution Context (EC)**: An abstract environment in which JavaScript code is evaluated and executed.
- **Global Execution Context (GEC)**: The default context created when the script starts. It creates the global object (`window` or `global`) and the `this` binding.
- **Function Execution Context (FEC)**: A context created dynamically whenever a function is invoked.
- **Call Stack**: A LIFO (Last In, First Out) stack data structure used by the JS Engine to manage execution contexts.

---

## 5. Visualization

### The Call Stack Transitions

Let's look at the stack frames for this execution:
```javascript
function first() {
  second();
}
function second() {
  // code
}
first();
```

```
   Call Stack State 1       Call Stack State 2       Call Stack State 3
  
  +-------------------+    +-------------------+    +-------------------+
  |                   |    |  second() Context |    |                   |
  +-------------------+    +-------------------+    +-------------------+
  |  first() Context  |    |  first() Context  |    |  first() Context  |
  +-------------------+    +-------------------+    +-------------------+
  |  Global Context   |    |  Global Context   |    |  Global Context   |
  +-------------------+    +-------------------+    +-------------------+
```

---

## 6. Internal Working

V8 builds and executes contexts in two phases:

### Phase 1: The Creation Phase (Compilation)
1. **Scope Chain Creation**: Resolves lexical environment bindings.
2. **Memory Allocation (Variable Hoisting)**:
    - Finds function declarations and saves them entirely in memory.
    - Finds `var` variables, setting them to `undefined`.
    - Finds `let`/`const` variables, leaving them uninitialized (TDZ).
3. **Argument Object Bindings**: Maps arguments passed into the function context.
4. **`this` Binding**: Resolves object context pointer.

### Phase 2: The Execution Phase (Execution)
- V8 runs the bytecode instructions line-by-line.
- It assigns values to variables (replacing `undefined` or uninitialized tags with actual data) and invokes functions.

---

## 7. Code Examples

### Bad Practice: Invoking Function Expressions Before Assignment
Invoking variables containing functions before they are initialized will crash if declared with `let`/`const`, or throw a `TypeError` if declared with `var`.

```javascript
// Bad: runTimer is a var and gets hoisted as undefined!
try {
  runTimer(); // TypeError: runTimer is not a function
} catch (e) {
  console.log(e.message);
}

var runTimer = function() {
  console.log("Timer running!");
};
```

### Good Practice: Direct Function Declarations
Declarations are hoisted completely, meaning they can be safely called from anywhere in their parent scope.

```javascript
// Good: Hoisting allows this call to resolve successfully
startEngine(); 

function startEngine() {
  console.log("Engine started smoothly.");
}
```

### Best Practice: Expression Assignments Before Call
Declare all function expressions with `const` and call them strictly after their initialization line to keep code execution linear and readable.

```javascript
// Best Practice: Defined first, executed later
const calculateTax = (amount) => {
  return amount * 0.15;
};

// Safe invocation
const tax = calculateTax(100);
console.log("Tax amount:", tax);
```

---

## 8. Dry Run

Let's trace memory allocations for this script:

```javascript
1: var user = "Raj";
2: function greet(name) {
3:   let msg = "Hello " + name;
4:   return msg;
5: }
6: let greeting = greet(user);
```

### Step-by-Step State
- **Phase 1: Global Context Creation**:
  - `user` allocated in GEC Variable Environment -> `undefined`.
  - `greet` function pointer allocated in GEC Variable Environment -> references function body.
  - `greeting` allocated in GEC Lexical Environment -> uninitialized.
- **Phase 2: Global Context Execution**:
  - Line 1: `user` becomes `"Raj"`.
  - Line 6: `greet(user)` is called. V8 pauses GEC and pushes `greet()` Function Context.
- **Phase 1: `greet()` Context Creation**:
  - Arguments mapped: `name` gets value `"Raj"`.
  - `msg` allocated in Lexical Environment -> uninitialized.
- **Phase 2: `greet()` Context Execution**:
  - Line 3: `msg` initialized to `"Hello Raj"`.
  - Line 4: Returns `"Hello Raj"`.
  - `greet()` Context popped off Call Stack. Memory swept.
- **Back in Global Execution**:
  - Line 6: `greeting` initialized to `"Hello Raj"`.

---

## 9. Common Mistakes

- **Mistake 1: Confusing Function Declarations with Function Expressions.**
  - `function myFunc() {}` is a **Declaration** (hoisted).
  - `const myFunc = function() {}` is an **Expression** (not hoisted).
- **Mistake 2: Call Stack Overflow (Recursion Error).**
  - Calling a function recursively without a termination guard condition will grow the stack until limits are hit: `RangeError: Maximum call stack size exceeded`.

---

## 10. Debugging

### Tracing Context Stack Frames
You can inspect active contexts in DevTools:
1. Write a script:
    ```javascript
    function levelThree() {
      console.log("At bottom level");
      debugger; // Break here
    }
    function levelTwo() {
      levelThree();
    }
    function levelOne() {
      levelTwo();
    }
    levelOne();
    ```
2. Run this in Chrome DevTools.
3. When the debugger pauses on the `debugger` line:
    - Look at the **Call Stack** pane in the Sources sidebar.
    - You will see the stack list:
      - `levelThree` (Top)
      - `levelTwo`
      - `levelOne`
      - `(anonymous)` (Global GEC at bottom)
    - Clicking on `levelTwo` changes the variables scope list view to show the variables active inside `levelTwo`'s frame scope.

---

## 11. Real World Usage

- **Node.js Stack Traces**: When an error crashes a production Express router, the stack trace printed in the logs is a list of the Call Stack frames at the moment of the crash.
- **Execution Context Lifecycles**: Angular and React tracking loops utilize execution frames to monitor active rendering paths.

---

## 12. Interview Preparation

### Question: What is the difference between the Creation Phase and the Execution Phase?
- **Wrong Answer**: Creation is when the compiler runs, execution is when Node starts.
- **Good Answer**: Within any execution context (Global or Function), V8 runs in two cycles. In the **Creation Phase**, the engine allocates memory locations for variable declarations and registers function pointers. In the **Execution Phase**, the engine runs the code line-by-line, executing statements and assigning values to the allocated memory addresses.

---

## 13. Practice

### Exercises
1. **Easy**: Predict the output:
    ```javascript
    console.log(typeof foo);
    var foo = function() {};
    ```
2. **Medium**: Write a recursive function that safely counts down from a number to zero, explaining how the stack sizes change.
3. **Hard**: Explain what happens to the GEC when you close a browser tab.

---

## 14. Mini Assignment

Write a nested stack loop containing three functions: `a()`, `b()`, and `c()`. Set a debugger breakpoint inside `c()`, and list the stack frames.

---

## 15. Mini Project

Create a call stack emulator log `StackTracker` class that simulates context pushes and pops, logging variable environments.

```javascript
// stack-emulator.js
class StackTracker {
  constructor() {
    this.stack = ["Global_Context"];
  }

  pushContext(name) {
    this.stack.push(name);
    console.log(`Pushed context: ${name} | Current Stack:`, this.stack.join(" -> "));
  }

  popContext() {
    const popped = this.stack.pop();
    console.log(`Popped context: ${popped} | Current Stack:`, this.stack.join(" -> "));
    return popped;
  }
}

const tracker = new StackTracker();
tracker.pushContext("fetchUserData_FEC");
tracker.pushContext("parseJSON_FEC");
tracker.popContext();
tracker.popContext();
```

---

## 16. Chapter Summary

- Every script starts with a single **Global Execution Context (GEC)**.
- Function calls generate isolated **Function Execution Contexts (FEC)**.
- The **Call Stack** manages execution context frames.
- Variables and functions are allocated memory in the **Creation Phase** before execution.

---

## 17. Quiz

1. What data structure is used to manage execution contexts?
2. Does a function expression get hoisted completely?
3. What happens when the Call Stack size limits are exceeded?

---

## 18. Next Chapter Preview

Now that we understand how execution frames are created, we need to look at how they connect. In the next chapter, we will explore the **Scope Chain & Lexical Environment**, investigating how V8 searches nested context layers to resolve variable pointers.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Jab bhi JavaScript code run hota hai, ek **Execution Context (EC)** banta hai — ek virtual container jisme code execute hota hai. Page load hone pe **Global Execution Context** banta hai. Har function call pe ek naya **Function Execution Context** banta hai. Sab contexts ek **Call Stack** mein stack hote hain (LIFO order). Jab function return karta hai, uska EC pop ho jaata hai. Stack empty hone ka matlab hai — code done.

### Andar kya hota hai (Internal Working)

V8 har Execution Context do phases mein process karta hai:

**Phase 1 — Creation Phase (Compile time):**
1. **Scope Chain** set up hoti hai — kahan kahan se variables dikh sakte hain.
2. **Memory Allocation**: ar → undefined, function declarations → poori function saved, let/const → TDZ (uninitialized).
3. **	his binding** resolve hota hai — kis object ke context mein hai.

**Phase 2 — Execution Phase:**
Code line by line chalta hai. Variables assign hote hain, functions call hote hain, expressions evaluate hoti hain.

Call Stack ke baare mein: ek LIFO stack hai. GEC sab se neeche. Function call pe naya EC push. Return pe pop. Stack overflow tab hota hai jab infinite recursion se stack itna bhar jaaye ki operating system se zyada memory na ho.

### Code Example samjho

`javascript
// Good: Function declarations hoist hoti hain
startEngine(); // Ye call pehle hai declaration se — works!

function startEngine() {
  console.log("Engine started smoothly!");
}

// Bad: Function expression hoist nahi hoti same way
try {
  runTimer(); // TypeError: runTimer is not a function
} catch (e) {
  console.log(e.message);
}
var runTimer = function() {
  console.log("Timer running!");
};
`

**Line by line:**
- startEngine() first line pe: Creation Phase mein startEngine poori function memory mein save ho gayi thi. Execution Phase mein call karo — works.
- unTimer() first: Creation Phase mein ar runTimer → undefined. Execution Phase mein unTimer() call karo → undefined() → TypeError: runTimer is not a function.

### Sabse badi galti log karte hain

Execution Context aur Scope ko same samajhna. Scope compile time pe decide hota hai (lexically — code kahan likha). Execution Context runtime pe banta hai (dynamically — function kab call hua). Ek function ka scope wahi hoga jahan likha tha, chahe kahin se bhi call karo.

### Yaad rakhne ki cheez

**Har function call = new Execution Context push on Call Stack.** Creation Phase mein memory allocate hoti hai (hoisting), Execution Phase mein values assign hoti hain. Call Stack mein neeche GEC, uske upar nested function calls.

## 20. Completion Checklist

- [ ] I can describe GEC vs. FEC.
- [ ] I understand the difference between function declarations and expressions in hoisting.
- [ ] I can trace function stack allocations in Chrome DevTools.
- [ ] I know what happens during the context Creation Phase vs. Execution Phase.
