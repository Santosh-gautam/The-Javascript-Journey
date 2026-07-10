# Breakpoints & Watch

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of basic JS loops and variables scoping
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a customs officer inspecting cargo trucks at a border checkpoint:

- **A Standard Breakpoint is like stopping every single vehicle**: Every truck that approaches must pull over, park, and turn off the engine. It does not matter if it is a semi-truck carrying cars or a small pickup carrying bread; you stop them all to inspect their papers (pausing on every execution loop tick).
- **A Conditional Breakpoint is like stopping only vehicles that match specific criteria**: You tell your staff: *"Only stop trucks that weigh over 10 tons or originate from Country X."* All other vehicles drive through at full speed. You only pause to inspect when your condition is met.
- **A Logpoint is like a camera taking a photo of the license plates**: You do not stop any vehicles. The flow of traffic is never interrupted. The camera automatically scans the plate, prints the license number on your office log monitor, and the truck drives right through (no code execution pause, but variables are printed).
- **The Watch Panel is like keeping a constant GPS tracker on specific boxes**: While the trucks are moving, you keep your eyes locked on the temperature sensors of 3 specific vaccine boxes, watching the temperature update in real-time as the trucks cross different climate zones (tracking variables).

In JavaScript, **Breakpoints and Watch Expressions** provide these precise inspection rules.

---

## 2. Problem

Debugging loops or high-frequency callbacks by inserting standard breakpoints:
- Pauses the code hundreds of times, requiring you to click "Continue" repeatedly to reach the specific iteration you want to inspect (e.g. when index `i = 989`).
- Floods the application console with log text if you write print statements inside the file.
- Slows down production release cycles since you must constantly clean up temporary debugging logs.

---

## 3. Solution

We use advanced **Breakpoint Strategies**:
1. **Conditional Breakpoints**: Pausing execution only when a specific expression is true.
2. **Logpoints**: Printing structured logs without modifying the codebase.
3. **Watch Expressions**: Pinning critical variables in the Watch panel to track state changes as we step through execution frames.

---

## 4. Definition

- **Conditional Breakpoint**: A breakpoint that only pauses execution when its associated expression evaluates to `true` (or changes).
- **Logpoint**: A non-pausing breakpoint that logs a message to the console when hit.
- **Watch Pane**: A panel in VS Code and DevTools where developers write expressions to monitor their values continuously during debugging steps.

---

## 5. Visualization

### Breakpoint Execution Rules

```
   [ Code Loop Execution ]
              |
      Line 42: Breakpoint Hit
              |
      Is it a Logpoint? --------------> Yes: Print text to console; Continue
              |                                 (No Pause)
              No
              |
      Is it Conditional?
              |
     +--------+--------+
     |                 |
   Condition True?   Condition False?
     |                 |
     v                 v
   [ PAUSE CODE ]    [ Skip / Continue ]
```

---

## 6. Internal Working

How debuggers handle advanced breakpoints:

1. **V8 VM Compilation Injection**: When you set a conditional breakpoint, the debugger compiles the expression (e.g. `i === 99`) into an internal helper function.
2. **Bytecode Instruction Check**: When V8 hits the breakpoint line:
    - It evaluates the helper function in the active lexical scope.
    - If it returns `false`, V8 bypasses the break command, stepping to the next bytecode instruction.
    - If `true`, it sends the pause command to the debugger.
3. **Logpoint Compilation**: A logpoint is compiled as an inline `console.log` instruction injected at runtime. V8 runs the console log in the active scope and immediately resumes execution.

---

## 7. Code Examples

### Bad Practice: Manual Code Edits for Log Profiling
Adding temporary logging variables directly inside source code files to debug a loop requires cleaning up the file afterward.

```javascript
// Bad: Temporary debugging lines littering source files
function calculateSalaries(employees) {
  employees.forEach((emp, index) => {
    // Temporary print statements we have to delete later!
    if (index === 15) {
      console.log("DEBUG: Target employee data:", emp); 
    }
    processPayroll(emp);
  });
}
```

### Good Practice: Logpoints in DevTools/VS Code
Set a logpoint on the target line instead of writing print code inside your script files:

1. In VS Code, right-click the gutter area next to a line number and select **Add Logpoint...** (or click the margin in Chrome DevTools Sources and select **Add logpoint**).
2. Write your message containing expressions in curly braces:
    `Employee index {index} is named {emp.name}`
3. Run the debugger. The console will print the logs automatically, and the code runs at full speed without pausing.

### Best Practice: Conditional Breakpoints for Loop Analysis
Set a conditional breakpoint to pause execution only when debugging a specific edge case.

```javascript
// Best Practice: Conditional Breakpoint Scenario
function processTransactions(transactions) {
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    
    // SCENARIO: Bug occurs only when transaction fails and amount is over 10,000
    // Setting a normal breakpoint pauses on all normal transactions.
    
    // Instead, right-click the line below in your editor, select "Add Conditional Breakpoint...",
    // and set the condition: tx.status === "FAILED" && tx.amount > 10000
    const processed = executeTransfer(tx); 
    
    saveRecord(processed);
  }
}
```

---

## 8. Dry Run

Let's dry run setting a Watch Expression:

```javascript
let total = 0;
for (let i = 0; i < 3; i++) {
  total += i; // Breakpoint here
}
```

### Step-by-Step State (with Watch Expression `total * 2`)
- **Iteration 1 (`i = 0`)**:
  - Debugger pauses.
  - Variable `total` is `0`.
  - Watch panel displays: `total * 2: 0`.
- **Step Over (F10)**:
  - Loop increments `i` to `1`.
  - Debugger pauses on next loop step.
  - Variable `total` is `1`.
  - Watch panel updates: `total * 2: 2`.
- **Step Over (F10)**:
  - Loop increments `i` to `2`.
  - Debugger pauses.
  - Variable `total` is `3`.
  - Watch panel updates: `total * 2: 6`.

---

## 9. Common Mistakes

- **Mistake 1: Setting conditional expressions that cause side effects.**
    Setting a condition like `i++ === 5` inside your breakpoint changes the actual state of the application during debugging passes. Ensure conditions are pure, read-only checks.
- **Mistake 2: Assuming local variables inside watch expressions are always resolved.**
    If you watch a variable `total` and step into a function scope where `total` is not declared, the Watch pane will display: `total: ReferenceError: total is not defined` until you step back to its owner function scope.

---

## 10. Debugging

### Using Exception Breakpoints
To catch bugs exactly where they throw errors, without manually setting breakpoints:
1. Open the **Run & Debug** pane in VS Code.
2. At the bottom of the pane, locate the **Breakpoints** section.
3. Check the box labeled **Uncaught Exceptions** (and optionally **Caught Exceptions**):
    - Now, if any line of code in your project throws an error, the debugger will automatically pause on the exact line that threw the error, allowing you to inspect the scope state at the moment of failure.

---

## 11. Real World Usage

- **E-commerce Cart Profiling**: Using conditional breakpoints to inspect cart structures only when the items array is empty.
- **WebSocket Event Debugging**: Setting logpoints to track incoming socket frame messages in high-speed gaming apps without lagging the game.

---

## 12. Interview Preparation

### Question: What are Logpoints, and how do they differ from standard breakpoints?
- **Wrong Answer**: Logpoints compile the code to HTML pages.
- **Good Answer**: Logpoints are non-pausing breakpoints. When hit, they evaluate expressions enclosed in curly braces and print a message to the debugger console. Unlike standard breakpoints, they do not pause code execution. This allows developers to log variable states in high-frequency loops or live server transactions without modifying the source code or slowing down execution flow.

---

## 13. Practice

### Exercises
1. **Easy**: Write a loop of 100 iterations. Set a conditional breakpoint that pauses only when index `i` is a multiple of `13`.
2. **Medium**: Set a logpoint inside an array map function that outputs the elements being processed.
3. **Hard**: Write a script with nested objects. Open the Watch panel and monitor a deeply nested path expression (e.g. `user.orders[0].item.price`), stepping through mutations to observe updates.

---

## 14. Mini Assignment

Write a loop processing user structures, and define a conditional breakpoint expression to pause only when the user's role is `"manager"` and they are marked as inactive.

---

## 15. Mini Project

Create a loop script `ProcessLoop` that iterates over 100 random user payloads. Write down the step-by-step instructions to set up a conditional breakpoint and watch list to isolate and debug a payload containing invalid credit card numbers.

```javascript
// breakpoint-watch-setup.js
const mockUsers = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `User-${i + 1}`,
  card: i === 47 ? "1234-invalid-5678" : "4000-1234-5678-9010" // The buggy payload is at index 47
}));

function auditCardNumbers(users) {
  console.log("Auditing card lists...");
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const card = user.card;
    
    // DEBUGGING INSTRUCTIONS:
    // 1. Open this file in VS Code.
    // 2. Right-click the line below (Line 18) in the gutter, select "Add Conditional Breakpoint...".
    // 3. Set condition: card.includes("invalid")
    // 4. In the WATCH pane, add expression: user.id
    // 5. Start debugger (F5). It will pause on index 47. Verify the Watch pane shows user.id: 48.
    const isValid = validateSecureCard(card);
    
    if (!isValid) {
      console.warn(`[Audit Alert] Invalid card at user ID ${user.id}`);
    }
  }
}

function validateSecureCard(number) {
  return !number.includes("invalid");
}

auditCardNumbers(mockUsers);
```

---

## 16. Chapter Summary

- **Conditional Breakpoints** pause only when an expression is `true`.
- **Logpoints** print logs to the console without pausing code execution.
- The **Watch Pane** monitors custom expressions during execution steps.
- Use **Exception Breakpoints** to pause exactly where errors are thrown.

---

## 17. Quiz

1. How do you declare a variable interpolation inside a logpoint message?
2. Does a conditional breakpoint slow down execution if the condition is false?
3. Which pane shows the hierarchy of active functions calling each other?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Debugging Async Code**. We will explore async call stack reconstruction, tracking unresolved promises, and handling async stack trace limits.

---

## 19. Completion Checklist

- [ ] I can configure conditional breakpoints in VS Code.
- [ ] I know how to use logpoints to print variable values without changing code.
- [ ] I can add expressions to the Watch pane to monitor state changes.
- [ ] I understand how to toggle exception breakpoints.
