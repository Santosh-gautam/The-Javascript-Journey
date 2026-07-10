# Control Flow

- **Difficulty Level**: Beginner
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding operators and coercion truthy evaluations
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are driving down a road and come to a fork.

If there is a sign that says: *"If you have a VIP Pass, turn left. Otherwise, turn right,"* you are executing conditional logic. You check your possession (the variable), match it against the sign (the condition), and decide which physical path to move your car down.

Now, imagine arriving at a large multi-platform transit terminal. Instead of checking signs one-by-one, you read a master screen:

- Platform 1: VIPs
- Platform 2: Members
- Platform 3: Regular Guests
You jump directly to your platform line. This is a `switch` statement.

If your vehicle checks the sign dynamically while moving, that is **Control Flow**.

---

## 2. Problem

Computers run scripts line-by-line from top to bottom.

Without control flow, a program is a single rail. It cannot adjust to different user inputs, handle error states, or treat users differently based on their access permissions. If a network request fails, the application would just attempt to run the next line anyway and crash.

---

## 3. Solution

JavaScript provides conditional statements (`if-else`, `switch`) and ternary expressions. They evaluate expressions, resolve them to a boolean (`true` or `false`), and direct the engine to jump execution to specific blocks.

---

## 4. Definition

- **Control Flow**: The order in which individual statements or instructions are executed in a program.
- **Short-Circuit Evaluation**: Using logical operators (`&&` or `||`) to evaluate expressions from left to right, stopping as soon as the final result is guaranteed.
- **Guard Clause**: A conditional check placed at the start of a function to return early if certain invalid criteria are met, preventing nested code indentation.

---

## 5. Visualization

### Branching Pathways

#### The Nested If-Else Branch (If / Else If / Else)

```
                  [ Check Condition ]
                           |
            +--------------+--------------+
            | True                        | False
            v                             v
     [ Execute Block A ]          [ Check Condition B ]
                                          |
                           +--------------+--------------+
                           | True                        | False
                           v                             v
                    [ Execute Block B ]          [ Execute Default ]
```

#### Guard Clause Refactoring (Linear Execution)

```
[ Check Guard 1 ] ---> True ---> [ Exit Early ]
       |
       v False
[ Check Guard 2 ] ---> True ---> [ Exit Early ]
       |
       v False
[ Execute Core Logic ]
```

---

## 6. Internal Working

How does the V8 Engine execute control flow?

1. **Bytecode Jumps**: V8 compiles `if` blocks into jump instructions (e.g. `JumpIfFalse [offset]`). If the condition evaluates to falsy, V8 shifts its program execution pointer directly to the offset address.
2. **Branch Prediction**: CPUs and JIT compilers try to predict which branch will execute *before* the evaluation completes to speed up processing.
    - If a condition is `true` 99% of the time, the engine optimizes for that path.
    - If the condition suddenly becomes `false`, a **Branch Misprediction** occurs. The engine must throw away the pre-fetched pipeline instructions, causing a small performance cost.
3. **Switch Jump Tables**: For large `switch` statements with sequential values, V8 does not check cases one-by-one. It creates a **Jump Table** in memory. V8 checks the input key, matches it to the table index, and jumps directly to the case address in a single operation.

---

## 7. Code Examples

### Bad Practice: Deep Nested Indentation (Pyramid of Doom)

Writing nested checks makes code hard to read and test.

```javascript
function checkout(user, cart) {
  if (user) {
    if (user.isLoggedIn) {
      if (cart.items.length > 0) {
        processOrder(cart);
      } else {
        return "Cart is empty";
      }
    } else {
      return "User is not logged in";
    }
  } else {
    return "No user provided";
  }
}
```

### Good Practice: Refactored with Guard Clauses

Return early on errors to keep core execution paths clean and linear.

```javascript
function checkout(user, cart) {
  // Guard Clauses
  if (!user) return "No user provided";
  if (!user.isLoggedIn) return "User is not logged in";
  if (cart.items.length === 0) return "Cart is empty";

  // Core business logic executes cleanly
  processOrder(cart);
  return "Order complete";
}
```

### Best Practice: Clean Switch Statements

Always use `break` to prevent fallthrough errors and handle the `default` fallback state.

```javascript
function getDiscount(userRole) {
  switch (userRole) {
    case "vip":
      return 0.20; // returns automatically exit the switch, no break needed!
    case "member":
      return 0.10;
    case "guest":
      return 0.00;
    default:
      console.warn(`Unknown role: ${userRole}. Defaulting to 0% discount.`);
      return 0.00;
  }
}
```

---

## 8. Dry Run

Let's dry run execution of short-circuit evaluation:

```javascript
1: let userRole = "guest";
2: let hasDiscountCard = false;
3: let discount = (userRole === "vip" || hasDiscountCard) ? 0.10 : 0.00;
```

### Step-by-Step State

- **Line 1-2**:
  - Global scope stores `userRole: "guest"` and `hasDiscountCard: false`.
- **Line 3 (Evaluating Expression inside parentheses)**:
  - Left operand check: `userRole === "vip"`
    - `"guest" === "vip"` resolves to `false`.
  - Because of the OR (`||`) operator, the engine must evaluate the right operand to determine the final result.
  - Right operand check: `hasDiscountCard`
    - `hasDiscountCard` is `false`.
  - The parenthesis resolves to `false || false` -> `false`.
- **Ternary resolution**:
  - Since the condition is `false`, the engine evaluates the expression after the colon (`:`), assigning `0.00` to `discount`.

---

## 9. Common Mistakes

- **Mistake 1: Switch Fallthrough Bug.**

    ```javascript
    let level = "admin";
    switch(level) {
      case "admin":
        setupAdminRights(); // Missing break!
      case "user":
        setupUserRights();  // Runs anyway, giving admins normal user setups or overwriting.
    }
    ```
- **Mistake 2: Assignment inside conditions.**

    ```javascript
    let role = "guest";
    if (role = "admin") {
      // Runs! Because role = "admin" assigns the value and returns "admin" (truthy).
    }
    ```

---

## 10. Debugging

### Step-Over Debugging in Branches

To trace which path is active without guesses:

1. Set a breakpoint on the first guard check line in your function.
2. Trigger the execution.
3. Use **Step Over (F10)**:
    - Watch the yellow highlight line. If it jumps *into* the guard return block, your condition was met.
    - If it skips over the block to the next line, the condition evaluated to falsy.
    - This allows you to check if your truthy evaluation logic matches your expectations in real-time.

---

## 11. Real World Usage

- **React Conditional Rendering**: Developers use ternaries or short-circuits directly in JSX template wrappers:

  ```javascript
  {isLoggedIn ? <Dashboard /> : <LoginButton />}
  {hasNewMessages && <NotificationDot />}
  ```

- **Express.js Middlewares**: Guard checks verify authorization headers before moving requests downstream.

---

## 12. Interview Preparation

### Question: What is short-circuit evaluation in JavaScript?
- **Wrong Answer**: It is an optimization that cuts off the code if it runs too slowly.
- **Good Answer**: Short-circuit evaluation occurs when logical operators (`&&` or `||`) resolve an expression without evaluating all operands. For `&&`, if the first operand is falsy, the overall result must be falsy, so the engine skips evaluating the remaining terms. For `||`, if the first operand is truthy, the overall result must be truthy, so the engine stops immediately.

---

## 13. Practice

### Exercises

1. **Easy**: Write a ternary check that checks if a number is even or odd.
2. **Medium**: Refactor a set of nested `if-else` loops checking username validity into clean guard clauses.
3. **Hard**: Explain what happens if you compare variables inside a switch statement where one is a string `"5"` and the case checks for number `5`. (Hint: `switch` uses strict comparison `===`).

---

## 14. Mini Assignment

Refactor the following nested block using guard clauses:

```javascript
function verifyTicket(ticket) {
  if (ticket) {
    if (ticket.isValid) {
      if (!ticket.isExpired) {
        return "Access Granted";
      } else {
        return "Ticket Expired";
      }
    } else {
      return "Invalid Ticket";
    }
  } else {
    return "No Ticket";
  }
}
```

---

## 15. Mini Project

Create a route permission checker function `canUserAccess(user, page)` that returns `true` or `false` based on hierarchical roles (Admin, Manager, Guest) using guard checks and clean control flows.

```javascript
// router-auth.js
const ROLE_PERMISSIONS = {
  admin: ["dashboard", "users", "billing"],
  manager: ["dashboard", "users"],
  guest: ["dashboard"]
};

function canUserAccess(user, page) {
  // Guard 1: User existence check
  if (!user) return false;

  // Guard 2: Validation of roles
  const userRole = user.role;
  if (!ROLE_PERMISSIONS[userRole]) {
    console.warn(`User role "${userRole}" has no defined security schema.`);
    return false;
  }

  // Core Check
  const allowedPages = ROLE_PERMISSIONS[userRole];
  return allowedPages.includes(page);
}

// Test cases
console.log(canUserAccess({ role: "admin" }, "billing")); // true
console.log(canUserAccess({ role: "guest" }, "users"));   // false
console.log(canUserAccess(null, "dashboard"));           // false
```

---

## 16. Chapter Summary

- Control flow statements change linear execution.
- **Guard Clauses** keep code readable by nesting-free check returns.
- `switch` statements evaluate cases using strict comparison (`===`).
- V8 optimizes branching using **Branch Prediction** profiling.

---

## 17. Quiz

1. Does `switch` perform implicit type coercion on case checks?
2. What is the output of `console.log("hello" || "world")`? Why?
3. How does branch misprediction affect V8 performance?

---

## 18. Next Chapter Preview

In the next chapter, we will learn about **Loops**. We will look at iteration mechanics, see how `for`, `while`, and `do-while` loops operate, and how to control complex double loops using label statements.

---

## 19. Completion Checklist

- [ ] I can refactor nested conditionals into clean guard clauses.
- [ ] I understand switch case evaluation rules (strict equality).
- [ ] I can explain short-circuiting with `&&` and `||`.
- [ ] I know how to step through conditional branches in the debugger.
