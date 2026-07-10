# VS Code Debugger

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Basic familiarity with VS Code interface and command line
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a production director managing a live theater play:

- **Console Logging is like asking actors to shout their line numbers**: During the play, actors constantly stop and shout: *"Line 10: I am standing by the table!"* It breaks the flow, disrupts the audience, and is hard to follow.
- **A "Launch" Debugger configuration is like directing a dress rehearsal**: You are in control from the very start. You launch the play from scene 1, sit in the director's chair (VS Code), and call: *"Freeze!"* at any checkpoint. The actors pause, allowing you to walk onto the stage and inspect their props.
- **An "Attach" Debugger configuration is like slipping into a live public show**: The play is already running in front of an audience (a running server). You sneak in through the side doors, plug your director's microphone into the stage soundboard (attaching via port `--inspect`), and monitor the performance without stopping the actors or interrupting the audience.

In JavaScript, **VS Code Debugger** configurations provide these execution controls.

---

## 2. Problem

Debugging Node.js backend servers or frontend browser apps by continuously restarting scripts and injecting console logs:
- Slows down development cycles.
- Makes it difficult to inspect variables inside private asynchronous scopes.
- Fails when debugging live-running microservices or Docker containers where you cannot easily edit files to inject logs.

---

## 3. Solution

We configure the **VS Code Debugger**.

By creating a **`launch.json`** configuration file, we define specific profiles to **Launch** local scripts or **Attach** to running server processes, allowing us to pause code, inspect variable scopes, and skip external library files.

---

## 4. Definition

- **`launch.json`**: The VS Code configuration file located in the `.vscode` folder that defines debugger settings.
- **Launch Configuration**: A debugger setting that starts a new process and attaches the debugger to it immediately.
- **Attach Configuration**: A debugger setting that connects VS Code to an already running process (typically via a debug port like `9229`).

---

## 5. Visualization

### Launch vs. Attach Debugger Mappings

```
   LAUNCH CONFIGURATION (Starts new process)
   [ VS Code Debugger ] ===== Launches & Controls ====> [ Node.js Process ]
                                                        (Runs target file)
  
   ATTACH CONFIGURATION (Connects to existing process)
   [ Terminal / Docker ] ---> Starts [ Node.js --inspect=9229 ] (Running)
                                                ^
                                                |
   [ VS Code Debugger ] ======= Attaches to port 9229 ====+
```

---

## 6. Internal Working

How VS Code interacts with Node.js and Chrome runtimes:

1. **V8 Inspector Protocol**: Node.js and Chrome expose an internal V8 Inspector daemon. When Node is run with the `--inspect` flag, it starts listening on port `9229` for WebSocket connections.
2. **VS Code Bridge**: VS Code's debugger client connects to this WebSocket port. It sends debugging commands and receives stack frames, mapping the compiled machine code lines back to your local text files in the editor.
3. **Source Skip list (`skipFiles`)**: When stepping through code, if the next execution line belongs to a path matched in the `skipFiles` array (like `node_modules`), VS Code automatically executes it at full speed without pausing, skipping internal library files.

---

## 7. Code Examples

### The `.vscode/launch.json` Configuration File
Create this file in your project root folder (`.vscode/launch.json`) to define debugging configurations.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Current File",
      "program": "${file}",
      "skipFiles": [
        "<node_internals>/**",
        "${workspaceFolder}/node_modules/**"
      ]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Port 9229",
      "port": 9229,
      "restart": true,
      "skipFiles": [
        "<node_internals>/**"
      ]
    }
  ]
}
```

### Good Practice: Starting a Node Server with Inspections
When running a Node.js application in your terminal, use the `--inspect` flag to enable debugging connections.

```bash
# Good: Starts server listening for debuggers on default port 9229
node --inspect server.js
```

### Best Practice: Profiling Environment Configurations
Use the VS Code debugger variables and env properties to debug code with specific mock environment variables.

```json
// Best Practice: launch.json Profile with Env variables
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server (Staging Env)",
  "program": "${workspaceFolder}/server.js",
  "env": {
    "NODE_ENV": "staging",
    "PORT": "3000",
    "API_KEY": "MOCK_DEVELOPMENT_KEY_123"
  },
  "console": "integratedTerminal"
}
```

---

## 8. Dry Run

Let's dry run attaching a debugger to a running server:

- **Step 1**: Start Node.js with the inspect flag in terminal:
  ```bash
  node --inspect-brk server.js
  ```
  *(Note: `--inspect-brk` pauses the script on the very first line, waiting for the debugger to attach).*
- **Step 2**: Open VS Code, select the **Run & Debug** pane (Ctrl+Shift+D).
- **Step 3**: Select the **"Attach to Port 9229"** profile from the dropdown list.
- **Step 4**: Click the green arrow button to start debugging:
  - VS Code connects to port `9229` over WebSockets.
  - The status bar turns orange, indicating the debugger is attached.
  - The debugger pauses on line 1 of `server.js`.
  - Click play (F5) to resume execution.

---

## 9. Common Mistakes

- **Mistake 1: Setting the wrong `port` inside your attach configuration.**
    If your server runs on port 3000 but the debugger is configured to attach to port 3000 instead of the V8 inspect port `9229`, the connection will fail.
- **Mistake 2: Missing source directories when debugging compiled scripts.**
    If you are debugging TypeScript or bundled code and your configuration is missing source maps, VS Code cannot map the running code back to your files, causing breakpoints to become unbound (gray outline).

---

## 10. Debugging

### Troubleshooting Unbound Breakpoints
If your VS Code breakpoints are grayed out or say "Unbound breakpoint":
1. Check if source maps are enabled in your build configuration (e.g. `tsconfig.json` or `vite.config.js`).
2. Open `launch.json` and ensure the `webRoot` or `sourceMap` properties are configured correctly:
    ```json
    "sourceMaps": true,
    "webRoot": "${workspaceFolder}/src"
    ```
3. Restart the debugging session.

---

## 11. Real World Usage

- **Express.js API Debugging**: Setting breakpoints inside route controller files to inspect database query results before sending responses.
- **Dockerized Server Debugging**: Exposing port `9229` from a Docker container, allowing VS Code to attach to the containerized server process.

---

## 12. Interview Preparation

### Question: What is the difference between a "launch" request and an "attach" request in `launch.json`?
- **Wrong Answer**: Launch is for frontend, attach is for backend.
- **Good Answer**:
  - **`launch`** configuration starts a new process (e.g. launching a Node.js process with our file, or opening a new Chrome window) and automatically hooks the debugger into it immediately.
  - **`attach`** configuration assumes the target process is already running (e.g. a Node.js server started in a terminal or inside a Docker container) and attaches the debugger to the running process via a debugging port (usually `9229`), without stopping or restarting the application.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic `launch.json` file inside a project that runs the active file.
2. **Medium**: Write a Node script that runs an infinite loop. Start it with `node --inspect` and attach VS Code to it to pause execution.
3. **Hard**: Configure a launch profile that opens Chrome, navigates to `localhost:3000`, and attaches the VS Code debugger to the frontend script running in the browser.

---

## 14. Mini Assignment

Write a launch configuration that executes a script `test.js` with the argument `--verbose` and the environment variable `DEBUG=true`.

---

## 15. Mini Project

Create a basic Node API server `SimpleServer` using the built-in `http` module. Configure a `.vscode/launch.json` profile to run the server, set a breakpoint inside the request handler, and inspect the incoming request headers using VS Code's Variables panel.

```javascript
// simple-debug-server.js
const http = require("http");

const server = http.createServer((req, res) => {
  // Set a breakpoint on the line below inside VS Code!
  const method = req.method;
  const headers = req.headers;
  
  console.log(`Received request: ${method} to ${req.url}`);
  
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "OK", receivedHeaders: headers }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`To debug, attach VS Code to port 9229 or run via launch.json`);
});
```

---

## 16. Chapter Summary

- **`launch.json`** defines VS Code Run & Debug profiles.
- **`launch`** starts a new process; **`attach`** connects to an existing one.
- Node inspect runs on default port **`9229`** using the V8 Inspector Protocol.
- Use **`skipFiles`** to prevent stepping into node internal or library code.

---

## 17. Quiz

1. What is the default inspect port for Node.js?
2. What does the `${workspaceFolder}` variable resolve to in `launch.json`?
3. Which launch option allows you to run node with environment variables?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Breakpoints & Watch**. We will explore conditional breakpoints, logpoints, watch expressions, and learn how to use the scope inspector.

---

## 19. Completion Checklist

- [ ] I can create and configure a `.vscode/launch.json` file.
- [ ] I understand the difference between launch and attach request modes.
- [ ] I can run Node.js with the `--inspect` flag.
- [ ] I know how to use `skipFiles` to ignore `node_modules`.
