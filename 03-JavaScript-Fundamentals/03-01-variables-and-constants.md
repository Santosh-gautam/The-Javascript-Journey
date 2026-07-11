# Variables & Constants

- **Difficulty Level**: Beginner
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding JavaScript runtime setups
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are managing a high-security hotel.

- **`var` is like a guest booking a room under a loose policy**: Before the room is ready or cleaned, the guest is allowed to dump their luggage in the hallway (hoisting with `undefined`). Anyone walking down the hall can see the bags, move them, or overwrite them. The guest's presence leaks across the whole floor (global/function scope).
- **`let` and `const` are like strict digital check-ins**: The hotel doesn't register your presence until the room keycard is scanned at your door (initialization line). If you try to go to the room or leave luggage there before check-in is complete, the security alarms go off (Temporal Dead Zone). Furthermore, you are locked into your specific private cabin (block scope).
- **`const` is like a room with a bolted safe**: You can store items inside the safe and change them, but you can never move the safe itself to a different room (reassignment check).

---

## 2. Problem

In early JavaScript (ES5 and below), `var` was the only way to declare variables. This caused major problems:

1. **Scope Leaking**: Variables declared inside an `if` block or a `for` loop leaked out to the surrounding function.
2. **Silent Errors**: If you used a variable before declaring it, JavaScript didn't crash; it silently returned `undefined`.
3. **Accidental Overwrites**: Declaring a variable twice with the same name in the same scope was allowed.

```javascript
// Variable leaks outside block
if (true) {
  var secret = "12345";
}
console.log(secret); // "12345" (Should be private!)

// Silent hoisting error
console.log(count); // undefined (No crash, just silent bug!)
var count = 10;
```

---

## 3. Solution

ES6 (2015) introduced `let` and `const` to enforce scoping rules:

1. **Block Scoping**: Locks variables inside the closest curly braces `{}`.
2. **Temporal Dead Zone (TDZ)**: Throws a runtime error (`ReferenceError`) if you try to read or write a variable before its declaration line is executed.
3. **Reassignment Protection**: `const` prevents reassigning a variable pointer to a new value.

---

## 4. Definition

- **Scope**: The physical boundary in your code where a variable is accessible.
- **Hoisting**: The process where the JavaScript engine allocates memory for declarations before running the code.
- **Temporal Dead Zone (TDZ)**: The state between the start of the block execution and the actual line where a variable is initialized.

---

## 5. Visualization

### Hoisting and TDZ Lifecycle

```
+-------------------------------------------------------------+
| { // Start of Block                                         |
|                                                             |
|   // ---- TEMPORAL DEAD ZONE (TDZ) FOR 'age' starts here ---|
|   console.log(age); // CRASH! ReferenceError                |
|   age = 30;         // CRASH! ReferenceError                |
|   // -------------------------------------------------------|
|                                                             |
|   let age = 25; // <--- TDZ FOR 'age' ENDS HERE             |
|                                                             |
|   console.log(age); // Works! Output: 25                    |
| }                                                           |
+-------------------------------------------------------------+
```

---

## 6. Internal Working

When V8 executes a block of code, it processes it in two distinct phases:

### Phase 1: Creation Phase (Memory Allocation)

- V8 scans the block for declarations.
- It finds `var variables` and puts them in the **Variable Environment**, initializing them to `undefined`.
- It finds `let` and `const variables` and puts them in the **Lexical Environment**, but marks them as **uninitialized** (this starts the TDZ).

### Phase 2: Execution Phase

- V8 runs the code line-by-line.
- When it hits `console.log(myLet)`, it checks the Lexical Environment, sees `myLet` is "uninitialized", and throws a `ReferenceError`.
- When it hits `let myLet = 100`, it changes the memory status from "uninitialized" to `100`. The TDZ is now over.

---

## 7. Code Examples

### Bad Practice: Variable Leaking inside Loops

Using `var` inside a loop makes the index variable leak, which can corrupt outer scopes.

```javascript
var i = 999;
for (var i = 0; i < 3; i++) {
  // doing work
}
console.log(i); // Output: 3 (Our outer value 999 was destroyed!)
```

### Good Practice: Block Scoping index variables

Using `let` restricts the loop variable strictly to the loop's block.

```javascript
let i = 999;
for (let i = 0; i < 3; i++) {
  // doing work
}
console.log(i); // Output: 999 (Outer scope preserved)
```

### Best Practice: Immutable Declarations by Default

Use `const` for everything. Use `let` only if you explicitly plan to reassign the variable. Never use `var`.

```javascript
const API_URL = "https://api.github.com";
let requestCount = 0; // Reassignable count

function fetchUsers() {
  requestCount++; // Safe reassignment
  return API_URL + "/users";
}
```

---

## 8. Dry Run

Let's dry run the compilation and execution of this code block:

```javascript
1: var a = 10;
2: let b = 20;
3: {
4:   var a = 50;
5:   let b = 60;
6: }
```

### Step-by-Step State

- **Phase 1 (Creation Phase)**:
  - Global variable `a` is allocated and set to `undefined`.
  - Global variable `b` is allocated and marked "uninitialized".
- **Phase 2 (Execution Phase)**:
  - Line 1: `a` is updated to `10`.
  - Line 2: `b` is initialized to `20` (TDZ for global `b` ends).
- **Line 3 (Entering block scope)**:
  - The block creates a new block Lexical Environment.
  - V8 checks for block declarations. It finds `let b` on line 5. It puts block `b` in the block Lexical Environment, marked "uninitialized" (TDZ for block `b` starts).
  - V8 finds `var a` on line 4. Since `var` ignores blocks, it references the global Variable Environment variable `a`.
  - Line 4: Global `a` is reassigned to `50`.
  - Line 5: Block `b` is initialized to `60` (TDZ ends for block `b`).
- **Exiting the block**:
  - The block Lexical Environment is popped.
  - Checking `a` globally returns `50`. Checking `b` globally returns `20`.

---

## 9. Common Mistakes

- **Mistake 1: Confusing const immutability with values.**

    ```javascript
    const config = { theme: "dark" };
    config.theme = "light"; // Allowed! We are mutating the properties.
    config = { theme: "light" }; // Crash! Reassigning the pointer is forbidden.
    ```
- **Mistake 2: Re-declaring let in the same scope.**

    ```javascript
    let speed = 50;
    let speed = 100; // SyntaxError: Identifier 'speed' has already been declared
    ```

---

## 10. Debugging

### Inspecting Scope Chain in Chrome DevTools

You can visualize Scope partitions dynamically:

1. Create a file named `scopes.js` with this content:

    ```javascript
    let globalVar = "Earth";
    function check() {
      let functionVar = "Country";
      if (true) {
        let blockVar = "City";
        debugger; // Break here!
      }
    }
    check();
    ```

2. Run this in Chrome or configure it in VS Code and debug.
3. When execution pauses on the `debugger` line:
    - Look at the DevTools **Scope Pane** on the right sidebar.
    - You will see:
      - **Block**: containing `blockVar: "City"`.
      - **Local**: containing `functionVar: "Country"`.
      - **Script/Global**: containing `globalVar: "Earth"`.

This visual scope list shows you exactly what lexical levels V8 travels to resolve a variable name.

---

## 11. Real World Usage

- **React Configs**: Standard setups declare theme structures, APIs, and styles using `const` to prevent runtime overwrite bugs.
- **Closures**: Block scopes created by `let` inside loop iterations resolve classic closure pitfalls (e.g. setting up setTimeout timers inside loop indexes).

---

## 12. Interview Preparation

### Question: What is the difference between `var`, `let`, and `const`?
- **Wrong Answer**: `var` is old, `let` is new, and `const` makes things constant.
- **Good Answer**:
  - **Scope**: `var` is function-scoped. `let` and `const` are block-scoped.
  - **Hoisting**: `var` is hoisted and initialized to `undefined`. `let` and `const` are hoisted but uninitialized, leaving them in the Temporal Dead Zone (TDZ).
  - **Reassignment**: `var` and `let` references can be reassigned. `const` references cannot be reassigned; doing so throws a `TypeError`.

---

## 13. Practice

### Exercises

1. **Easy**: Predict the output:

    ```javascript
    console.log(score);
    var score = 10;
    ```

2. **Medium**: Predict the output:

    ```javascript
    let user = "admin";
    {
      console.log(user); // Will this crash or log "admin"?
      let user = "guest";
    }
    ```

3. **Hard**: How would you make an object truly immutable so that even its properties cannot be mutated or changed? Write the code.

---

## 14. Mini Assignment

Write a loop that prints numbers `1` to `3` with a 1-second delay for each number. Show how using `var` fails (prints `4` three times) and how using `let` resolves it.

---

## 15. Mini Project

Create a module config manager that imports a deep config object, freeze it using a recursion function (`deepFreeze`), and tests variable protection.

```javascript
// config-manager.js
function deepFreeze(obj) {
  Object.keys(obj).forEach(name => {
    let prop = obj[name];
    if (typeof prop === 'object' && prop !== null) {
      deepFreeze(prop);
    }
  });
  return Object.freeze(obj);
}

const SYSTEM_CONFIG = deepFreeze({
  db: {
    host: "localhost",
    port: 5432
  },
  mode: "development"
});

// Test mutations
try {
  SYSTEM_CONFIG.db.port = 9000; // Throws error in strict mode
} catch (e) {
  console.log("Safely prevented nested mutation:", e.message);
}
console.log("Config stays secure:", SYSTEM_CONFIG.db.port);
```

---

## 16. Chapter Summary

- `var` is function-scoped and initialized to `undefined` during hoisting.
- `let` and `const` are block-scoped and start in the **Temporal Dead Zone (TDZ)**.
- `const` prevents reassignment of variable bindings, but object properties can still be modified unless frozen using `Object.freeze()`.
- DevTools displays active scopes under the Scope Pane in the debugger.

---

## 17. Quiz

1. What causes a `Temporal Dead Zone` error?
2. Why does `var` ignore block curly braces?
3. Does `Object.freeze()` make arrays immutable?

---

## 18. Next Chapter Preview

Now that we know how variables hold reference identifiers in memory, we need to understand the actual types of data we are saving. In the next chapter, we will dive into **Data Types**, looking at stack memory allocations for primitives versus heap allocations for reference types.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Variables data store karne ke containers hain. JavaScript mein teeno keywords hain: ar (purana, problematic), let (block-scoped reassignable), const (block-scoped, rebinding nahi ho sakta). Inka fark sirf syntax ka nahi — ye engine level pe alag alag memory aur scope rules follow karte hain. Modern code mein ar almost kabhi nahi use karna chahiye.

### Andar kya hota hai (Internal Working)

V8 engine Creation Phase (compile time) mein variables ko memory allocate karta hai — lekin ar, let, const ke liye alag tarike se:

- **ar**: Function scope ke Execution Context mein undefined se initialize ho jaata hai — isliye hoist hota hai aur use karne se pehle bhi accessible hota hai (undefined milta hai, error nahi).
- **let aur const**: Block scope ke Lexical Environment mein register hote hain lekin **Temporal Dead Zone (TDZ)** mein rehte hain — initialized nahi hote jab tak declaration line execute na ho. TDZ mein access karo toh ReferenceError.
- **const**: Binding lock hota hai — matlab const x = 5 ke baad x = 10 error dega. Lekin agar const obj = {} toh obj.name = "Ravi" perfectly valid hai — binding same hai, object ka content change ho raha hai.

### Code Example samjho

`javascript
console.log(x); // undefined — var hoisted hai
var x = 10;

console.log(y); // ReferenceError — TDZ mein hai
let y = 20;

const PI = 3.14159;
PI = 3; // TypeError: Assignment to constant variable
`

**Line by line:**
- console.log(x) pehle ar x = 10 se — Creation Phase mein x already undefined se initialize tha, toh error nahi, undefined milta hai.
- console.log(y) pehle let y = 20 se — y TDZ mein hai, engine jaanta hai y exist karta hai lekin initialized nahi — ReferenceError throw hota hai.
- PI = 3 — const ki binding change nahi ho sakti; engine ek TypeError throw karta hai.

### Sabse badi galti log karte hain

const ko "immutable" samajhna. Jab tum const user = { name: "Ravi" } likhte ho aur phir user.name = "Priya" karte ho — koi error nahi aata. Kyunki const sirf user variable ki **binding** fix karta hai — wo hamesha usi heap object ko point karega. Object ke andar ki properties badalni allowed hain. Truly immutable object ke liye Object.freeze(user) use karo.

### Yaad rakhne ki cheez

**Default rule: const use karo. Agar value change karni ho toh let. ar kabhi mat use karo** — ye rule follow karne se scope bugs 90% kam ho jaate hain.

## 20. Completion Checklist

- [ ] I can describe the differences between function scope and block scope.
- [ ] I understand the hoisting behavior of `var` versus `let` and `const`.
- [ ] I can explain what the Temporal Dead Zone (TDZ) is and why it exists.
- [ ] I know how to check active scope hierarchies using Chrome DevTools.
