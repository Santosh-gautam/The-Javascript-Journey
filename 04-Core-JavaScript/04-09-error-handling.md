# Error Handling

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding the Call Stack and execution context lifecycles
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are running a package delivery sorting center:

- **Try is like sending a package down the sorting conveyor belt**: You attempt to run the normal processing sequence (the core logic block).
- **Throw is like detecting a hazardous item**: A sensor detects a leaking chemical container (the error event). Instead of letting the container pass down the line and contaminate other packages, the operator pulls an alarm lever and throws the box off the conveyor (throws an Error object).
- **Catch is like the hazard response room**: The thrown package lands directly on a designated slides chute (the catch parameter) that leads into a safety room. Specialist staff handle the package, log the incident, and prevent the entire warehouse from burning down.
- **Finally is like cleaning the station at the end of the shift**: Whether a hazard occurred or everything processed perfectly, the sorting station must be swept, tools reset, and power powered down before leaving (resource cleanup).

In JavaScript, this process is **Try-Catch-Finally**.

---

## 2. Problem

Runtime environments encounter unexpected situations:
- Network requests fail or time out.
- A user inputs bad data (e.g. uploading a text file when an image was requested).
- API payloads return property keys missing nested values.

Without a structured error interception architecture, any single runtime exception:
- Instantly halts execution.
- Crashes the entire server process (in Node.js) or locks the browser UI page.
- Leaves database connections and open files dangling in memory, causing leaks.

---

## 3. Solution

JavaScript provides structured exception handling via **`try-catch-finally`** statements and a standard **`Error`** class wrapper.

When an exception is thrown, the engine interrupts the normal Call Stack execution flow and "bubbles" the error up through the active context frames until it finds a catch handler.

A `finally` block ensures that cleanup commands are always executed regardless of success or failure.

---

## 4. Definition

- **Error Object**: An instance of the built-in `Error` class (or its subclasses) containing a `message` and a `stack` trace.
- **Exception**: A runtime error event that disrupts the normal execution flow of program statements.
- **Propagation (Bubbling)**: The automatic traversal of an error upwards through the Call Stack execution frames until intercepted by a catch block.

---

## 5. Visualization

### Error Propagation Stack Bubble

```
       CALL STACK                      ERROR BUBBLE FLOW
  
  +------------------+         [ Engine detects Error inside c() ]
  |   c() Context    | ---------------------+ (No catch block inside c)
  +------------------+                      |
  |   b() Context    | <--------------------+ (No catch block inside b)
  +------------------+                      |
  |   a() Context    | <--------------------+ Found [ Catch Block ] inside a()!
  +------------------+                        - Logs message
  |  Global Context  |                        - Execution resumes safely in a()
  +------------------+
```

If the error passes the Global Context without finding a catch block, the engine registers an **Uncaught Exception** and crashes.

---

## 6. Internal Working

How V8 processes throws and try-catch frames:

1. **Try Block Registry**: When V8 enters a `try` block, it registers a **catch handler target** in its execution context record.
2. **Stack Unwinding**: When a `throw` statement executes:
    - V8 pauses statement evaluations.
    - It creates an `Error` object and captures the active **Stack Trace** by taking a snapshot of the Call Stack frames.
    - V8 inspects the current context for a registered catch target.
    - If missing, V8 pops the current stack frame, unwinds the context, and checks the parent frame.
    - It repeats this until a catch target is found.
3. **Catch Execution**: Once found, V8 restores the execution stack to the context frame containing the catch block and passes the error object into the catch parameter.
4. **Finally Execution**: If a `finally` block exists, V8 runs its statements *before* leaving the try/catch context, even if there are return statements inside the try or catch blocks!

---

## 7. Code Examples

### Bad Practice: Swallowing Errors silently
Catching errors and doing nothing ignores root problems and makes debugging impossible.

```javascript
// Bad: Database fails, but we print nothing and proceed as if success!
try {
  saveUserToDatabase(user);
} catch (error) {
  // Silent swallow! Bug is completely hidden.
}
```

### Good Practice: Logging and Graceful Fallback
Log details clearly for developers and return safe fallback states so the app stays functional.

```javascript
try {
  const data = fetchUserData(101);
  renderDashboard(data);
} catch (error) {
  console.error("Dashboard render failed. Details:", error.message);
  showErrorPlaceholder("Failed to load user profile. Please try again later.");
}
```

### Best Practice: Custom Error Subclasses with Context
Create custom Error classes extending the native `Error` to identify specific domain failures (e.g. ValidationError, DatabaseError) and manage resource cleanups.

```javascript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    // Captures clean stack trace ignoring constructor frame under V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

function processRegistration(email) {
  if (!email.includes("@")) {
    throw new ValidationError("Invalid email format", "email");
  }
  return "User created";
}

let connection = openDBConnection();
try {
  processRegistration("bad_email");
} catch (error) {
  if (error instanceof ValidationError) {
    console.warn(`Validation failed on field: ${error.field}. Msg: ${error.message}`);
  } else {
    console.error("System error:", error.message);
  }
} finally {
  connection.close(); // Best Practice: Connection closed regardless of errors
  console.log("DB Connection closed safely.");
}
```

---

## 8. Dry Run

Let's dry run V8's stack unwinding process:

```javascript
1: function third() { throw new Error("Fault"); }
2: function second() { third(); }
3: function first() {
4:   try { second(); }
5:   catch (e) { console.log("Caught:", e.message); }
6: }
7: first();
```

### Step-by-Step State
- **Call Stack builds**:
  - GEC calls `first()`. Stack: `Global -> first()`
  - `first()` enters `try` block. V8 registers a catch target point.
  - `first()` calls `second()`. Stack: `Global -> first() -> second()`
  - `second()` calls `third()`. Stack: `Global -> first() -> second() -> third()`
- **Line 1 (Inside `third`)**:
  - `throw` executes.
  - V8 unwinds the stack:
    - Checks `third()` context -> no catch block. Pops `third()`.
    - Checks `second()` context -> no catch block. Pops `second()`.
    - Checks `first()` context -> finds registered catch target at Line 4.
  - V8 routes execution directly to the catch block on line 5, binding `e` to the "Fault" Error instance.
  - Logs: `"Caught: Fault"`.
  - Execution continues safely inside `first()`.

---

## 9. Common Mistakes

- **Mistake 1: Standard built-in Error mismatch types.**
  - `TypeError`: Accessing properties on `null` or `undefined`.
  - `ReferenceError`: Using an undeclared variable.
  - `RangeError`: Repeating string operations or calling functions beyond stack limits.
- **Mistake 2: Throwing raw strings instead of Error instances.**
    ```javascript
    throw "Oops, error!"; // Bad: Stacks cannot be captured for raw strings, making trace debugs impossible.
    throw new Error("Oops, error!"); // Good: Captures complete stack trace.
    ```

---

## 10. Debugging

### Using DevTools "Pause on Caught/Uncaught Exceptions"
To locate where errors originate without writing catch logs:
1. Open Chrome DevTools.
2. Navigate to the **Sources** tab.
3. On the right panel, find the pause icon (a octagon with a pause mark).
4. Toggle **Pause on uncaught exceptions** (turns blue). Optionally check **Pause on caught exceptions**.
5. Run your script.
    - The browser will freeze execution at the exact line that throws the error, *before* it bubbles or unwinds.
    - You can inspect active variables at the exact moment of failure.

---

## 11. Real World Usage

- **Express.js Error Middleware**: Express uses a central error handler router containing four parameters: `(err, req, res, next) => {}`. When any route handler catches an error, it passes it down using `next(err)` to prevent the server process from crashing.
- **Node.js Process Crash Prevention**: Production systems log global uncaught failures:
  ```javascript
  process.on('uncaughtException', (err) => {
    logErrorToTelemetry(err);
    process.exit(1); // exit safely to let container managers restart node cleanly
  });
  ```

---

## 12. Interview Preparation

### Question: What happens inside a function if an error is thrown inside a `try` block that has both a `catch` and a `finally` block containing return statements?
- **Wrong Answer**: The catch return runs and the finally block is skipped.
- **Good Answer**: The `finally` block always executes. In JavaScript, if a `finally` block returns a value, that return value overrides any returns or throws inside the preceding `try` or `catch` blocks.

---

## 13. Practice

### Exercises
1. **Easy**: Write a function that checks if an age parameter is less than 18, and throws a `RangeError`.
2. **Medium**: Write a try-catch block that parses a JSON string, handling JSON syntax errors gracefully.
3. **Hard**: Implement a nested try-catch example showing how to catch an error locally, perform a partial cleanup, and then re-throw the error to let a parent handler capture it.

---

## 14. Mini Assignment

Create a custom `NetworkError` class that inherits from the native `Error` class and stores status codes (e.g. 404, 500) as local class properties.

---

## 15. Mini Project

Create a file system simulator utility `FileManager` that opens, writes, and closes files, using try-catch-finally loops to ensure that files are safely closed even if write operations crash.

```javascript
// file-manager.js
class MockFile {
  constructor(name) {
    this.name = name;
    this.isOpen = false;
  }
  open() { this.isOpen = true; console.log(`Opened file: ${this.name}`); }
  write(data) {
    if (!this.isOpen) throw new Error("File is closed");
    if (typeof data !== 'string') throw new TypeError("Data must be a string");
    console.log(`Writing: "${data}" to ${this.name}`);
  }
  close() { this.isOpen = false; console.log(`Closed file: ${this.name}`); }
}

function saveReport(filename, data) {
  const file = new MockFile(filename);
  file.open();

  try {
    file.write(data);
  } catch (error) {
    console.error(`Error saving report to ${filename}:`, error.message);
  } finally {
    file.close(); // Clean up state
    console.log("File clean-up finished.");
  }
}

// Test runs
saveReport("stats.txt", "Active Users: 500"); // Success
saveReport("logs.txt", 10204); // Fails type validation, closed safely!
```

---

## 16. Chapter Summary

- Errors are caught using **`try-catch-finally`** loops.
- Errors **propagate (bubble)** up the Call Stack until caught.
- **`finally`** always runs and overrides preceding return values.
- Always throw **`Error` instances** (or subclasses) to capture Stack traces.

---

## 17. Quiz

1. What built-in error type is thrown when accessing properties on `null`?
2. Does a `finally` block run if a `try` block returns early?
3. How does V8 capture stack traces?

---

## 18. Next Chapter Preview

We have completed **Module 04: Core JavaScript**! You have mastered execution contexts, lexical scopes, hoisting, closures, prototypal linkage, class systems, ESM modules, and error structures. In the next module, **Asynchronous JavaScript**, we will begin Module 05 by examining **Callbacks & Threading**, exploring how JavaScript handles operations concurrently.

---

## 19. Completion Checklist

- [ ] I can write try-catch-finally structures.
- [ ] I understand error propagation bubbles up the Call Stack.
- [ ] I know how to create custom Error subclasses.
- [ ] I can configure Chrome DevTools to pause on uncaught runtime exceptions.
