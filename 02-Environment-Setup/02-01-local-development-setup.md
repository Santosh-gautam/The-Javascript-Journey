# Local Development Setup

- **Difficulty Level**: Beginner
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Basic terminal navigation
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are setting up a professional woodworking workshop.

If you try to build a custom dining table using a toy plastic hammer and a pocketknife on your kitchen counter, you will end up with ruined wood and a messy kitchen.

To build quality furniture, you need three key elements:

1. **A workbench**: A clean, organized surface where you place your wood, draw lines, and fit pieces together (VS Code).
2. **Power tools**: The actual motors that cut, sand, and drill the raw material into shape (Node.js runtime).
3. **Measuring calipers and levels**: Precision instruments that tell you if a corner is exactly 90 degrees or if a shelf is perfectly horizontal (Chrome DevTools).

If your tools aren't calibrated or you don't know how to read your level, your furniture will be wobbly. Setting up a professional coding environment is the calibration of your tools.

---

## 2. Problem

Writing JavaScript inside basic browser-based code sandboxes (like JSFiddle or CodePen) works for small tests. However, as you scale:

- You cannot easily read/write local files.
- You cannot run third-party packages from npm.
- Debugging memory leaks or profiling CPU bottlenecks is impossible.
- Code execution is limited by browser sandbox security restrictions.

To build production-grade applications, you need a local runtime engine and a debugger that connects directly to the execution stack.

---

## 3. Solution

We will construct a professional local development stack by:

1. Installing **Node.js LTS (Long Term Support)**—which extracts the Google V8 engine out of the browser so you can run JavaScript directly on your computer's terminal.
2. Setting up **Visual Studio Code (VS Code)** with a dedicated `.vscode/launch.json` debugger configuration.
3. Connecting the editor debugger directly to Node's runtime processes using the **Chrome DevTools Protocol (CDP)**.

---

## 4. Definition

A **JavaScript Runtime Environment** is a software container that houses the JavaScript Engine (V8) and exposes extra APIs (Web APIs in the browser like `window`, or Node.js APIs like `fs` and `process`).

---

## 5. Visualization

How VS Code, Chrome DevTools, and Node.js communicate during execution:

```
+------------------------------------+
|            Your Computer           |
|                                    |
|  +--------------------+            |
|  |   VS Code Editor   |            |
|  |                    |            |
|  |  [launch.json]     |            |
|  +--------------------+            |
|            |                       |
|            | CDP Connection        |
|            | (Websocket Port 9229) |
|            v                       |
|  +--------------------+            |
|  |  Node.js Process  |            |
|  |                    |            |
|  |  [ V8 Engine ]     |            |
|  |  [ System APIs ]   |            |
|  +--------------------+            |
+------------------------------------+
```

---

## 6. Internal Working

When you execute code via a local environment:

1. **Node.js Runtime Initialization**: When you run `node index.js`, Node wraps the V8 engine, initializes the event loop, and exposes global variables (like `module`, `exports`, `require`, and `process`).
2. **Debugging attachment**: If you start Node with the `--inspect` flag (`node --inspect index.js`), V8 starts a WebSocket server listening on port `9229`.
3. **Chrome DevTools Protocol (CDP)**: VS Code attaches to this port. When the debugger hits a breakpoint in your code:
    - V8 pauses bytecode execution in the Call Stack.
    - V8 sends a JSON message over the WebSocket details about the current Call Stack, Scope, and active variables.
    - VS Code renders these details in its left panel.

---

## 7. Code Examples

### Bad Practice: Manual Terminal Print Tracing

Running a file manually and cluttering code with raw logs to see what's happening.

```javascript
// manual-debug.js
const user = { name: "Raj", accessCode: 104 };

// Hardcoded logs that must be deleted before production
console.log("RAJ CHECK 1", user); 
if (user.accessCode > 100) {
  console.log("RAJ CHECK 2 - inside block");
  grantAccess(user);
}

function grantAccess(u) {
  console.log("RAJ CHECK 3 - inside grantAccess");
  u.isAuth = true;
}
```

### Good Practice: Using Launch Configurations

Maintain clean code and use editor launch profiles to inspect variables without polluting codebase logs.

Create a file at `.vscode/launch.json` in your workspace:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current JS File",
      "program": "${file}",
      "console": "integratedTerminal"
    }
  ]
}
```

Now, instead of logging manually, you set a gutter breakpoint on VS Code and press `F5`.

---

## 8. Dry Run

Let's dry run hitting a breakpoint inside VS Code using the Good Practice setup:

```javascript
1: const host = "localhost";
2: const port = 3000;
3: const server = { host, port }; // Breakpoint set here!
```

### Step-by-Step State

- **Press F5**:
  - VS Code executes: `node --inspect-brk=XXXX [filepath]`.
  - Node starts, loads V8, and pauses immediately before running line 1.
- **Click "Step Over" (F10)**:
  - Line 1 runs. Global Memory environment allocates `host: "localhost"`.
  - Line 2 runs. Global Memory allocates `port: 3000`.
- **At Line 3 (Breakpoint paused)**:
  - Execution stops *before* creating the `server` object.
  - Look at the VS Code **Variables Pane** under **Local**: you see `host: "localhost"` and `port: 3000`. `server` shows as `undefined` because line 3 hasn't completed yet.
- **Click F10 once more**:
  - Object is created. `server` now shows as `{ host: "localhost", port: 3000 }` in the variables list.

---

## 9. Common Mistakes

- **Mistake 1: Confusing Node.js with the Browser.** Writing browser-specific code like `alert("hello")` or `document.querySelector("h1")` in a Node environment will crash it with a `ReferenceError: document is not defined`.
- **Mistake 2: Confusing Terminal Shells.** Running JavaScript code directly in the Command Prompt/PowerShell terminal shell (e.g. typing `let x = 10` inside PowerShell) instead of entering the interactive Node REPL shell by typing `node` first.

---

## 10. Debugging

### Step-by-Step Console Diagnostics

To ensure your runtime tools are fully operational:

1. **Check installation**:
    Open your command terminal (Powershell or Bash) and run:

    ```bash
    node -v
    npm -v
    ```

    If these return versions (e.g., `v20.x.x`), your runtime engine is active.
2. **Access browser runtime**:
    Open Chrome. Press `Ctrl+Shift+J` (Windows) or `Cmd+Opt+J` (Mac) to open the DevTools Console directly.
3. **Run code**:
    Type `console.log(globalThis)` in both Chrome Console and Node terminal. Compare the properties!
    - Chrome's global is `Window`.
    - Node's global is `global`.

---

## 11. Real World Usage

- **Microservice Debugging**: In production backend clusters (built on AWS ECS or Kubernetes), developers configure Node to launch with `--inspect=0.0.0.0:9229` in staging containers. They can securely tunnel into the staging environment from their local machine to debug issues directly in real-time.
- **Editor Tooling**: Tools like Prettier and ESLint run on Node.js in the background inside your VS Code instance, reading your code files to detect format and lint errors dynamically.

---

## 12. Interview Preparation

### Question: What is the difference between the JavaScript Engine and the JavaScript Runtime Environment?
- **Wrong Answer**: They are the same thing. V8 is the runtime.
- **Good Answer**: The JavaScript Engine (like V8) is the compiler/executor that parses source code and compiles it into machine instructions. The Runtime Environment (like Chrome or Node.js) wraps the engine and provides external APIs (objects, functions, events) that code can interact with. For example, DOM APIs are provided by the Chrome browser runtime, while file system (`fs`) APIs are provided by the Node.js runtime.

---

## 13. Practice

### Exercises

1. **Easy**: Install Node.js LTS and run a terminal hello world script.
2. **Medium**: Set up the VS Code `launch.json` configuration file, set a breakpoint on a line of code, launch the debugger, and inspect the values in the Variables tab.
3. **Hard**: Write a script that checks if it is currently running inside Node.js or inside a Browser, and logs the result. (Hint: look at the presence of `window` or `process`).

---

## 14. Mini Assignment

Write a JavaScript file that imports the built-in Node `os` module:

```javascript
const os = require('os');
console.log("Free Memory:", os.freemem());
```

Configure your editor debugger to run this script, stop at the console line, and use the debugger to check the nested properties inside the `os` object in the Variables list.

---

## 15. Mini Project

Create a script named `env-check.js` that outputs runtime status metrics in a clean visual layout using console APIs.

```javascript
// env-check.js
const os = require('os');

function systemStatus() {
  const status = {
    platform: os.platform(),
    architecture: os.arch(),
    totalMemoryGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
    freeMemoryGB: (os.freemem() / (1024 ** 3)).toFixed(2),
    nodeVersion: process.version
  };

  console.log("--- System Metrics ---");
  console.table(status);
  
  // Try inspecting the 'process' object in VS Code watch variables!
  console.log("Current working directory:", process.cwd());
}

systemStatus();
```

---

## 16. Chapter Summary

- **Node.js** executes JavaScript outside of the browser using the V8 engine.
- The **Runtime Environment** provides APIs (DOM in browsers, file/OS systems in Node).
- VS Code uses the **Chrome DevTools Protocol (CDP)** to monitor code lines.
- Breakpoints stop script execution inside V8, allowing safe, logging-free debugging.

---

## 17. Quiz

1. Which port does Node's inspect inspector listen to by default?
2. Can you access the `window` global object inside a Node.js process? Why?
3. What happens to code execution when V8 hits a breakpoint?

---

## 18. Next Chapter Preview

Now that our local workstation is configured, we can begin coding. In the next module, we start **JavaScript Fundamentals**. We will look at how the engine creates memory spaces for our data, exploring variables, constants, scopes, and the Temporal Dead Zone.

---

## 19. Completion Checklist

- [ ] Node.js is installed locally and `node -v` works in the command terminal.
- [ ] VS Code debugger launch profile (`launch.json`) is set up and functional.
- [ ] I can set breakpoints in VS Code and step through code execution.
- [ ] I understand the architecture difference between Node.js and the Browser runtime.
