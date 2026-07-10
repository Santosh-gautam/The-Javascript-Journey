# Errors and Stack Traces

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of Call Stack execution frames and OOP inheritance
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a detective investigating a crime scene inside a high-rise office building:

- **The Error is the crime alarm sounding**: A window was broken on the 14th floor.
- **The Error Type is the category of crime**:
  - **`ReferenceError` is like looking for a missing office key that was never made**: You ask: *"Open Room 405"* but room 405 does not exist on any blueprint.
  - **`TypeError` is like trying to use a screwdriver to write an email**: You have the screwdriver, but it does not support writing emails. The action is incompatible with the tool.
  - **`RangeError` is like trying to cram 500 chairs into a 5-chair meeting room**: The volume exceeds physical limits.
- **The Stack Trace is the security guard's logbook**: It records the elevator movements. It tells you: *"Officer went to floor 14, who was dispatched by the Captain on floor 5, who was told by the Director in the lobby."* You trace the path backward from the crime scene back to the lobby to see where the mistake began.

In JavaScript, **Stack Traces** provide this structural diagnostic trail.

---

## 2. Problem

When errors occur in JavaScript, applications halt execution.

If you do not know how to interpret stack traces:
- You waste hours guessing where the crash originated, especially when the error message is generic (like `Cannot read properties of null`).
- You miss the execution path that led to the crash, fixing the wrong functions.
- You throw unhandled rejections that crash Node.js backend servers.

---

## 3. Solution

We master **Error Types** and **Stack Trace Parsing**.

By reading stack trace frames from top to bottom, we reconstruct the Call Stack history.

We build **Custom Errors** that inherit from the native `Error` class, capturing clean stack traces to isolate application domain problems.

---

## 4. Definition

- **Stack Trace**: A report of the active stack frames at a certain point in time during the execution of a program.
- **Stack Frame**: An individual record in the Call Stack containing execution details (function name, file path, line, and column numbers).
- **Custom Error**: A developer-defined error class extending the base `Error` object to categorize specific domain failures (e.g. `ValidationError`).

---

## 5. Visualization

### Anatomy of a Stack Trace

```
   TypeError: Cannot read properties of undefined (reading 'price')  <-- [ Error Class & Message ]
       at calculateItemTax (file:///src/cart.js:12:20)                <-- [ Frame 1: Crash Site (Line 12) ]
       at processOrderTotals (file:///src/checkout.js:45:10)          <-- [ Frame 2: Caller (Line 45) ]
       at handleCheckoutClick (file:///src/app.js:89:3)               <-- [ Frame 3: Event Origin (Line 89) ]
```

- **Frame 1**: Tells you *where* the crash occurred (Line 12 inside `cart.js`).
- **Frame 2**: Tells you *who* called the crash function (Line 45 inside `checkout.js`).
- **Frame 3**: Tells you the root entry point of the transaction (Line 89 inside `app.js`).

---

## 6. Internal Working

How V8 handles errors and stack frames:

1. **Exception Throwing**: When an illegal instruction is executed, V8 halts processing, captures the active Call Stack execution pointers, and constructs an `Error` object.
2. **Stack String Construction**: V8 lazily compiles the stack trace string. It reads the instruction pointer offsets from each stack frame and converts them into human-readable filenames and line/column numbers.
3. **Trace Capture API**: The V8 method `Error.captureStackTrace(this, constructor)` allows custom error instances to omit internal constructor calls from the trace string, keeping logs clean and relevant.

---

## 7. Code Examples

### 1. Common Built-in Error Types

```javascript
// A. ReferenceError: Variable does not exist
// console.log(nonExistentVar); 

// B. TypeError: Incompatible action
// const num = 45;
// num.toUpperCase(); // TypeError: num.toUpperCase is not a function

// C. RangeError: Out of bounds
// new Array(-5); // RangeError: Invalid array length
```

### Bad Practice: Generic Error Throwing
Throwing generic string errors makes it impossible for calling functions to programmatically handle different types of failures.

```javascript
// Bad: Throwing generic errors
function processPayment(amount) {
  if (amount <= 0) {
    throw new Error("Invalid amount"); // Generic, hard to handle specifically
  }
  if (!hasActiveSession()) {
    throw new Error("Session expired"); // Identical class, hard to filter
  }
}
```

### Good Practice: Custom Error Classes
Inherit from the base `Error` class to create categorized domain exceptions.

```javascript
// Good: Custom Exception Classes
class PaymentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

class SessionExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = "SessionExpiredError";
  }
}
```

### Best Practice: Clean Stack Traces with captureStackTrace
Use `Error.captureStackTrace` to keep your custom error logs clean of internal library framework frames.

```javascript
// Best Practice: Clean Trace Custom Error
class DatabaseQueryError extends Error {
  constructor(query, message) {
    super(message);
    this.name = "DatabaseQueryError";
    this.query = query;

    // Capture stack trace, omitting this constructor call from the output
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseQueryError);
    }
  }
}

// Usage
function executeDbSelect(query) {
  if (!query.includes("FROM")) {
    throw new DatabaseQueryError(query, "Invalid SQL syntax: Missing FROM keyword");
  }
}

try {
  executeDbSelect("SELECT * Users");
} catch (error) {
  if (error instanceof DatabaseQueryError) {
    console.error(`[DB ERROR] Query: "${error.query}"`);
    console.error(error.stack); // Prints trace starting from caller line!
  }
}
```

---

## 8. Dry Run

Let's dry run the stack trace lookup for a nested call chain:

```javascript
function first() { second(); }
function second() { third(); }
function third() { throw new Error("Trace Me"); }
first();
```

### Call Stack Lifecycle
1. `first()` is invoked. V8 pushes `first` frame onto Call Stack.
2. `first` calls `second()`. V8 pushes `second` frame onto Call Stack.
3. `second` calls `third()`. V8 pushes `third` frame onto Call Stack.
4. `third` throws `Error`.
- V8 halts execution.
- V8 reads Call Stack frame pointers from top to bottom:
  - Frame 1: `third`
  - Frame 2: `second`
  - Frame 3: `first`
- Generates the trace string matching this layout.
- Execution rolls back up the stack, looking for a `try-catch` block. If none are found, the program crashes.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to pass the message to `super(message)` in custom errors.**
    If you omit `super(message)`, the resulting error instance will have an empty string `error.message` and the stack trace might lack the error message header.
- **Mistake 2: Throwing non-error primitives.**
    ```javascript
    throw "Something went wrong"; // Bad: Does not capture a stack trace! Always throw Error instances.
    ```

---

## 10. Debugging

### Tracing Uncaught Rejections in Node.js
If your Node.js server crashes due to an unhandled Promise rejection:
1. Run your Node process with the flag:
    ```bash
    node --unhandled-rejections=strict index.js
    ```
2. Add a global handler in your root entry file to log the exact stack trace before exiting:
    ```javascript
    process.on("unhandledRejection", (reason, promise) => {
      console.error("[CRITICAL UNHANDLED REJECTION]");
      console.error(reason.stack || reason);
      process.exit(1);
    });
    ```

---

## 11. Real World Usage

- **Sentry / Bugsnag Analytics**: Crash monitoring libraries intercept uncaught errors on client browsers, extract the stack trace frames, and compile aggregate statistics on production bug frequencies.
- **Express.js Error Middleware**: Node API servers capture database errors, log the full stack trace to secure server logs, and return clean error message objects to the client.

---

## 12. Interview Preparation

### Question: What is the purpose of `Error.captureStackTrace()`?
- **Wrong Answer**: It halts the server when an error occurs.
- **Good Answer**: `Error.captureStackTrace(targetObject, constructorOpt)` is a V8-specific API. It creates a `.stack` property on the target object. By passing the custom error constructor as the second argument, V8 hides all stack frames from the trace that occurred *inside* that constructor and below, presenting a cleaner stack trace that focuses on the caller's code rather than internal helper files.

---

## 13. Practice

### Exercises
1. **Easy**: Write a function that triggers a `TypeError` and print its stack trace in the console.
2. **Medium**: Create a custom error class `ValidationError` that inherits from `Error` and includes an array of validation field errors.
3. **Hard**: Write a script that parses a raw stack trace string and extracts only the filenames and line numbers into an array of objects.

---

## 14. Mini Assignment

Write a function `parseJSONConfig(jsonString)` that catches parsing errors, checking if the exception is a `SyntaxError`, and logs a custom message pointing to the invalid payload.

---

## 15. Mini Project

Create a structured error logger `AppException` that wraps system crashes, checks error instances, and generates a formatted JSON report containing error name, message, timestamp, and parsed trace frames.

```javascript
// stack-trace-parser.js
class AppException extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "AppException";
    this.timestamp = new Date().toISOString();
    this.originalError = originalError;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppException);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack ? this.stack.split("\n").slice(0, 4) : [], // First few frames
      cause: this.originalError ? this.originalError.message : null
    };
  }
}

// Test case
function processData() {
  try {
    const obj = undefined;
    obj.read(); // Type error
  } catch (rawError) {
    const appExc = new AppException("Data processing transaction failed", rawError);
    console.log("Formatted JSON Log:");
    console.log(JSON.stringify(appExc.toJSON(), null, 2));
  }
}

processData();
```

---

## 16. Chapter Summary

- Standard JS error types include **`TypeError`**, **`ReferenceError`**, and **`RangeError`**.
- **Stack Traces** print the Call Stack frame history from crash to origin.
- Inherit from **`Error`** to construct custom Exceptions.
- Use **`Error.captureStackTrace()`** to clean up constructor frames in custom errors.

---

## 17. Quiz

1. What built-in error is thrown when you execute `const x = y` and `y` is not declared?
2. What is the parent class of all custom exceptions?
3. Does throwing a primitive string capture line numbers?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Chrome DevTools**. We will explore the Sources pane, Network throttle features, the Console API, and workspaces bindings.

---

## 19. Completion Checklist

- [ ] I can read and interpret JavaScript stack traces.
- [ ] I understand the common native error types.
- [ ] I can create custom error classes extending `Error`.
- [ ] I know how to use `Error.captureStackTrace` to clean up logs.
