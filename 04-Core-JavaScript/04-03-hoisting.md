# Hoisting in Depth

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding variables and execution contexts
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are preparing to run a large business meeting.

Before the meeting officially starts, you enter the conference room early (Creation Phase) and set up the whiteboard:
1. You print out full **handouts** (Function Declarations) and lay them on the tables. They are complete and ready for anyone to read immediately.
2. You write down **project name tags** on the board (Variables) but cover the details with sticky notes (initialized to `undefined` or marked as "Do Not Touch").

When the meeting starts (Execution Phase), a colleague walks in and tries to read a handout. It works instantly. But if they try to ask about a project name tag before you have officially unveiled it during the presentation, they either get a blank look (for `var`'s `undefined` state) or are escorted out by security for touching unreleased details (for `let`/`const`'s Temporal Dead Zone).

This pre-meeting setup is **Hoisting**.

---

## 2. Problem

In programming, you usually cannot use a feature before you define it.

If JavaScript executed code in a single linear pass without memory allocation preparation:
- You would have to order your functions strictly in reverse order of calls (defining utility functions at the top, and global callers at the bottom).
- Any circular dependency (Function A calling Function B, and Function B calling Function A) would be impossible to write because one would always be undefined at compilation time.

---

## 3. Solution

JavaScript solves this using a two-pass engine execution cycle:
1. **Creation Pass**: The engine scans the code, locates all declarations, and allocates memory space for them *before* running any statements.
2. **Execution Pass**: The engine runs the code line-by-line.

This memory pre-allocation makes declarations appear to be "hoisted" (lifted) to the top of their respective scopes.

---

## 4. Definition

- **Hoisting**: The behavior of the JavaScript engine where memory is allocated for variable and function declarations during the Creation Phase, making them accessible in their scope before their actual line of declaration in the source.
- **Variable Hoisting**: The hoisting of `var` declarations (initialized to `undefined`) and `let`/`const` declarations (remain uninitialized).
- **Function Hoisting**: The hoisting of function declarations, storing their complete definition in memory.

---

## 5. Visualization

### How Code Looks vs. How V8 Processes It

#### Written Code
```javascript
console.log(user); 
var user = "Sara";

showMsg();
function showMsg() {
  console.log("Hello");
}
```

#### V8 Compiled Mental Model
```javascript
// Phase 1: Creation (Hoisting declarations to the top)
var user = undefined; 
function showMsg() {
  console.log("Hello");
}

// Phase 2: Execution
console.log(user); // Output: undefined
user = "Sara";

showMsg(); // Output: "Hello"
```

---

## 6. Internal Working

During the compilation phase, V8 processes declarations according to these engine rules:

1. **Functions First**: Function declarations are hoisted first. The engine allocates space in the environment record and binds it directly to the function's heap address.
2. **Variables Second**:
    - If a variable name matches an existing function name, V8 skips the variable declaration to protect the function binding.
    - `var` declarations are allocated and initialized to `undefined`.
    - `let` and `const` declarations are allocated but marked **uninitialized** (entering the TDZ).
3. **Class Declarations**: Classes are hoisted like `let`/`const`. V8 allocates their name in the Lexical Environment but keeps them uninitialized. Calling or extending a class before its declaration throws a `ReferenceError`.

---

## 7. Code Examples

### Bad Practice: Invoking Class Instances Before Definition
Assuming classes behave like hoisted function declarations will crash your execution.

```javascript
try {
  // Bad: Classes are hoisted but uninitialized!
  const myCar = new Car("Red"); 
} catch (e) {
  console.log("Crash caught:", e.message); // ReferenceError: Cannot access 'Car' before initialization
}

class Car {
  constructor(color) {
    this.color = color;
  }
}
```

### Good Practice: Invoking Declarations Safely
Invoke standard functions from anywhere in the scope, but keep class instantiations strictly after their definitions.

```javascript
// Good: Declarations can be invoked early
logSystemStatus(); 

function logSystemStatus() {
  console.log("System Status: Operational");
}

class DatabaseConnection {}
// Instantiated after definition
const db = new DatabaseConnection(); 
```

### Best Practice: Code Linearization
Define all dependencies, classes, and variables at the top of their scope boundaries before calling them, reducing hoisting dependency logic in your scripts.

```javascript
// Best Practice: Imports, configs, classes defined first
class Router {
  navigate(path) {
    console.log("Navigating to", path);
  }
}

const appRouter = new Router();
appRouter.navigate("/dashboard");
```

---

## 8. Dry Run

Let's dry run the hoisting priority order:

```javascript
1: console.log(typeof test);
2: var test = "value";
3: function test() {
4:   return "function";
5: }
```

### Step-by-Step State
- **Phase 1: Creation**:
  - V8 checks for function declarations. It finds `function test` on line 3.
  - It allocates `test` in GEC memory, setting it to the function reference pointer.
  - V8 checks for variable declarations. It finds `var test` on line 2.
  - Since `test` is already registered as a function, V8 ignores the `var` registration to protect the function reference.
- **Phase 2: Execution**:
  - Line 1: Logs `typeof test`. Since `test` holds the function reference, it prints `"function"`.
  - Line 2: `test` is assigned the value `"value"`. The function reference is overwritten.
  - If we checked `typeof test` after line 2, it would return `"string"`.

---

## 9. Common Mistakes

- **Mistake 1: Expecting function expressions to behave like declarations.**
    ```javascript
    myFunc(); // TypeError: myFunc is not a function
    var myFunc = function() {};
    ```
- **Mistake 2: Let/Const Shadowing TDZ triggers.**
    ```javascript
    let x = 10;
    function test() {
      console.log(x); // ReferenceError: Cannot access 'x' before initialization
      let x = 20;     // Shadowing x locally triggers a TDZ inside this block!
    }
    test();
    ```

---

## 10. Debugging

### Debugging TDZ and Hoisting issues
When encountering `ReferenceError: Cannot access 'x' before initialization`:
1. Open the file in VS Code or Chrome DevTools.
2. Look at the line numbers flagged in the error stack trace.
3. Set a breakpoint at the top of the containing function scope.
4. Launch execution and look at the **Scope** tab:
    - You will see the variable name listed under local variables, but its value will be marked as `<uninitialized>`.
    - Trace downwards to ensure you do not read or assign to this variable before the actual `let` / `const` declaration line is highlighted.

---

## 11. Real World Usage

- **Mutual Recursion**: Hoisting is what allows two functions to refer to each other recursively without ordering crashes.
- **Strict Linting Rules**: Tooling like ESLint flags use-before-define actions (e.g. rule `no-use-before-define`) as style warnings, encouraging clean structure layouts.

---

## 12. Interview Preparation

### Question: Why do `let` and `const` throw a ReferenceError when hoisted, while `var` returns undefined?
- **Wrong Answer**: Because `let` and `const` are not hoisted.
- **Good Answer**: Both are hoisted. The difference is their initialization status. During the context Creation Phase, `var` variables are allocated memory and initialized to `undefined`. `let` and `const` are allocated memory but left **uninitialized**. They remain in the Temporal Dead Zone (TDZ) until the engine evaluates their declaration statement. Attempting to access an uninitialized binding throws a `ReferenceError`.

---

## 13. Practice

### Exercises
1. **Easy**: Predict the output:
    ```javascript
    console.log(a);
    var a = 5;
    ```
2. **Medium**: Trace the output:
    ```javascript
    var x = 1;
    function test() {
      if (!x) {
        var x = 10;
      }
      console.log(x);
    }
    test();
    ```
3. **Hard**: Write a script demonstrating Mutual Recursion where two functions depend on each other's declarations.

---

## 14. Mini Assignment

Write a code snippet containing a function and a variable of the same name. Explain what memory adjustments V8 makes during the Creation Phase and verify the outputs.

---

## 15. Mini Project

Create a modular validator script `HoistingVerifier` that tests if a given script contains calls to functions before their definitions, reporting potential style issues.

```javascript
// hoisting-verifier.js
function verifyExecutionSequence() {
  // Declaration: works early due to hoisting
  const isHealthy = checkHealth(); 

  function checkHealth() {
    return true;
  }

  // Expression: must be declared before use
  const runDiagnostics = () => {
    return "Diagnostics complete";
  };
  
  const status = runDiagnostics();

  console.log("Health:", isHealthy);
  console.log("Status:", status);
}

verifyExecutionSequence();
```

---

## 16. Chapter Summary

- **Hoisting** is the pre-allocation of memory for declarations during compilation.
- Function declarations are hoisted completely, including their bodies.
- `var` is hoisted and initialized to `undefined`.
- `let`, `const`, and `class` declarations are hoisted but left **uninitialized** (triggering the TDZ).
- Functions are hoisted before variables.

---

## 17. Quiz

1. Are class declarations hoisted in JavaScript?
2. What error occurs when accessing a variable in the Temporal Dead Zone?
3. What happens if a variable and a function share the same name in a scope during hoisting?

---

## 18. Next Chapter Preview

Now that we understand hoisting phases and memory allocation, we can explore how the engine preserves memory spaces for nested functions. In the next chapter, we will dive into **Closures**, exploring how functions retain access to their outer lexical scopes even after the outer function has completed execution.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Hoisting ka matlab ye nahi ki code literally upar move hota hai — ye sirf ek mental model hai jo explain karta hai ki V8 **Creation Phase** mein kya karta hai. Creation Phase mein, V8 Execute karne se pehle poori file scan karta hai aur declarations ko memory mein register karta hai. Result ye hota hai ki ar variables aur unction declarations poori file mein accessible lagte hain chahe code mein neeche declare kin ho. Lekin let, const, aur class declarations TDZ (Temporal Dead Zone) mein hote hain — register toh hote hain lekin access karo toh ReferenceError.

### Andar kya hota hai (Internal Working)

V8 Engine ka Creation Phase ek two-step process hai:

**Step 1 — Hoist karo:**
- unction declarations: Poora function body memory mein save ho jaati hai. Isliye function declaration use se pehle call kar sakte ho.
- ar declarations: Variable undefined se initialize ho jaata hai. Isliye access karo toh undefined milta hai, error nahi.
- let, const, class: Variable register hota hai (hoisted) lekin initialize nahi hota — **TDZ** mein rehta hai. Declare hone se pehle access karo toh ReferenceError: Cannot access 'x' before initialization.

**Step 2 — Execute karo:**
Line by line code chalta hai, values assign hoti hain.

TDZ ka scope: let x = 5 ki line se pehle ki saari code (us block ke andar) TDZ hai. Exact line pe initialized hota hai.

### Code Example samjho

`javascript
// Function declaration — fully hoisted
startEngine(); // Works! "Engine started smoothly!"
function startEngine() {
  console.log("Engine started smoothly!");
}

// var — hoisted as undefined
console.log(counter); // undefined (no error)
var counter = 10;
console.log(counter); // 10

// let — TDZ
console.log(myVar); // ReferenceError: Cannot access before initialization
let myVar = 42;
`

**Line by line:**
- startEngine() pehle: Creation Phase mein poori startEngine function memory mein thi. Works perfectly.
- console.log(counter) pehle: Creation Phase mein ar counter → undefined. Execution Phase mein line par aane se pehle undefined return.
- console.log(myVar) pehle: let myVar register hua hai (TDZ), lekin initialized nahi — ReferenceError.

### Sabse badi galti log karte hain

let aur const ko "not hoisted" samajhna. Dono hoist hote hain — fark sirf initialization ka hai. Proof: agar hoist na hote, toh outer scope se value milni chahiye. Lekin ye code dekho: let x = 1; { console.log(x); let x = 2; } — inner let x hoist hota hai aur TDZ mein jaata hai, isliye console.log(x) outer x nahi dekhta, ReferenceError aata hai.

### Yaad rakhne ki cheez

**ar → undefined se hoist. Function declaration → poori body hoist. let/const → TDZ mein hoist, uninitialized.** TDZ mein access = ReferenceError. Isliye let/const use karo — unintended hoisting behavior se bachte ho.

## 20. Completion Checklist

- [ ] I can describe the two-pass execution cycle of JavaScript engines.
- [ ] I understand the hoisting behavior of `var` versus `let` and `const`.
- [ ] I can explain why function declarations can be called before their definitions.
- [ ] I know how to debug Temporal Dead Zone (TDZ) reference errors.
