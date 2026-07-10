# Spec: Event Emitter

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of closures, objects, array operations, and Observer patterns
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a radio dispatch operator at a taxi fleet headquarters:

- **The Event Emitter is the central dispatch radio desk**: It routes messages between drivers and departments.
- **`subscribe(event, callback)` is a driver tuning into a channel**: A driver tunes their radio to Channel `"VIP-Pickups"` (subscribes to event). They provide their taxi number (callback) to listen for updates.
- **`publish(event, ...args)` is broadcasting an alert**: You broadcast on Channel `"VIP-Pickups"`: *"Passenger ready at Terminal 3"* (publishing event with arguments). Every driver tuned to that channel hears the message and responds.
- **`unsubscribe()` is turning off the radio**: A driver turns off Channel `"VIP-Pickups"` (unsubscribes) when going off duty. They no longer hear alerts.
- **`once(event, callback)` is a one-time emergency assignment**: You broadcast: *"I need exactly one driver to collect a box from post office"* (once-only subscription). The first driver who responds takes the box, and you immediately remove their name from the list for that task, ensuring they don't get assigned duplicate boxes.

In JavaScript, **Event Emitter** classes manage this publish-subscribe messaging.

---

## 2. Problem

In large applications, modules need to share information:
- A user authentication module updates, and the cart, profile, and chat modules must sync.
- If you import modules directly into each other and call their methods manually (tight coupling), modifying one file requires rewriting all other files.

---

## 3. Solution

We implement a decoupled **Event Emitter** class:
1. **Event Registry Map**: Storing event channels and their associated array of callbacks.
2. **Subscribe API**: Registering callbacks and returning clean unsubscribe handlers.
3. **Publish API**: Distributing payloads to all listening callbacks in parallel.
4. **Once API**: Wrapping callbacks to auto-unsubscribe after their first trigger.

---

## 4. Definition

- **Event Emitter**: A class that maintains a registry of listener functions and triggers them when named events occur.
- **Publish-Subscribe (Pub/Sub)**: A messaging pattern where senders (publishers) send messages to channels without knowing who the receivers (subscribers) are.
- **Once Subscription**: A subscription wrapper that detaches itself from the emitter immediately upon its first execution.

---

## 5. Visualization

### Event Emitter Message Broker Mapping

```
   [ Action Trigger ] ---> emitter.publish("USER_LOGIN", { name: "Zara" })
                                             |
                                             v
                               [ Event Emitter Registry ]
                               └── "USER_LOGIN"
                                     ├── Callback A (Profile UI) ---> Executes: Update Name
                                     ├── Callback B (Cart Sync)  ---> Executes: Load items
                                     └── Callback C (Analytics)  ---> (One-time, then auto-unsubscribes)
```

---

## 6. Internal Working

How the emitter manages registries and scopes:

1. **Registry Allocation**: The emitter stores events in a dictionary: `this.events = {}`. The keys are event names, and the values are arrays containing callback function references: `[fn1, fn2]`.
2. **Unsubscribe Closure**: When you subscribe, the return object holds a closure capturing the event name and the callback reference. When `unsubscribe()` is called, V8 executes array filtering: `events[name].filter(cb => cb !== callback)`.
3. **Once-only Wrapper**: To implement `once`, the emitter wraps your callback inside an anonymous function:
    - When triggered, the wrapper calls `unsubscribe()`.
    - It then executes your original callback with the arguments.

---

## 7. Code Examples

### The Event Emitter Specification
We construct a complete, robust Event Emitter class.

```javascript
// event-emitter-specification.js
class EventEmitter {
  constructor() {
    this.events = {}; // Registry dictionary mapping event names to callback arrays
  }

  // 1. Subscribe API
  subscribe(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function");
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Return unsubscribe wrapper object
    return {
      unsubscribe: () => {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
        
        // Clean up empty event keys from heap memory
        if (this.events[event].length === 0) {
          delete this.events[event];
        }
      }
    };
  }

  // 2. Publish API
  publish(event, ...args) {
    if (!this.events[event]) return;

    // Create a copy of the callbacks array before looping
    // This prevents bugs if a callback unsubscribes itself mid-loop!
    const listeners = [...this.events[event]];
    listeners.forEach(callback => {
      try {
        callback.apply(this, args);
      } catch (error) {
        console.error(`[Emitter Error] Error inside callback for event "${event}":`, error.message);
      }
    });
  }
}
```

### Good Practice: Once-only Subscription Wrapper
Wrap the target callback in an anonymous handler that detaches itself on execution.

```javascript
// Inside EventEmitter class
once(event, callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function");
  }

  // Define wrapper
  const wrapper = (...args) => {
    sub.unsubscribe(); // Unsubscribe first!
    callback.apply(this, args); // Execute original callback
  };

  // Subscribe the wrapper
  const sub = this.subscribe(event, wrapper);
  return sub; // Return unsubscribe handler
}
```

### Best Practice: Secure Event-Driven App Flow
Wrap components in an emitter context, allowing them to communicate without direct dependencies.

```javascript
// Best Practice: Decoupled Components Interaction
const broker = new EventEmitter();

// Component A: Auth Service
class AuthService {
  login(username) {
    console.log("Auth: User logged in.");
    // Publish login event to the broker
    broker.publish("USER_AUTHENTICATED", { username, role: "admin" });
  }
}

// Component B: UI Header Widget
class HeaderWidget {
  constructor() {
    // Subscribe to login event
    broker.subscribe("USER_AUTHENTICATED", (user) => {
      this.updateHeader(user.username);
    });
  }

  updateHeader(name) {
    console.log(`Header: Displaying name "${name}" in UI.`);
  }
}

const header = new HeaderWidget();
const auth = new AuthService();
auth.login("Santosh");
```

---

## 8. Dry Run

Let's dry run the execution path for a `once` subscription:

- **Setup**:
  - `emitter.once("ALERT", alertHandler)` is called.
  - Emitter registers: `events["ALERT"] = [wrapper]`.
- **First Publish (`emitter.publish("ALERT", "FIRE")`)**:
  - Emitter loops through listeners: calls `wrapper("FIRE")`.
  - Inside `wrapper`:
    - Calls `sub.unsubscribe()`.
    - `events["ALERT"]` filters out `wrapper`. Since it is empty, `delete events["ALERT"]` runs.
    - Executes `alertHandler("FIRE")`.
    - Logs alert details.
- **Second Publish (`emitter.publish("ALERT", "WATER")`)**:
  - Emitter checks `events["ALERT"]` -> returns `undefined`.
  - Function returns immediately. `alertHandler` does not execute again.

---

## 9. Common Mistakes

- **Mistake 1: Mutating the active callback array during the publish loop.**
    If a callback contains code that unsubscribes itself from the event, looping through `this.events[event]` directly can cause index shifting, skipping the next callback in the array. Always loop over a shallow copy (`[...this.events[event]]`).
- **Mistake 2: Missing error safety wrappers inside the publish loop.**
    If callback 1 throws an unhandled error, it will halt the loop execution, preventing callback 2 and 3 from running. Wrap callback execution in a `try-catch` block.

---

## 10. Debugging

### Auditing Active Subscriptions count
To check if your application is leaking event listeners:
1. Add a diagnostic helper method to your Emitter class:
    ```javascript
    debugSubscriptions() {
      const report = {};
      for (let event in this.events) {
        report[event] = this.events[event].length;
      }
      console.table(report);
    }
    ```
2. Trigger component mounts and unmounts.
3. Log the report. If the subscription counts grow continuously, find where components are missing `unsubscribe()` cleanup calls during unmounting.

---

## 11. Real World Usage

- **Node.js `EventEmitter`**: Node's built-in `events` module is the foundation for all I/O streams, web servers (`http.Server`), and file system watches.
- **DOM Event Target**: Browsers use a native event emitter model under the hood to manage `addEventListener` and `dispatchEvent`.

---

## 12. Interview Preparation

### Question: Write a custom Event Emitter class that supports subscribe, publish, and once
- **Wrong Answer**: Writing hard-coded arrays or missing the unsubscribe return object.
- **Good Answer**: (Refer to the EventEmitter class in Section 7 and once wrapper in Section 8). Focus on explaining:
    1. The event registry object mapping event names to arrays of callbacks.
    2. Returning an object containing the `unsubscribe` closure function that filters out the callback.
    3. The `once` wrapper pattern that unsubscribes before invoking the original callback to prevent duplicate triggers.
    4. Copying the callback array during publishing to prevent index shifting bugs if listeners unsubscribe themselves mid-loop.

---

## 13. Practice

### Exercises
1. **Easy**: Write a basic emitter, subscribe to a `"TICK"` event, and verify the callback fires when published.
2. **Medium**: Add an `unsubscribeAll(event)` method to the Emitter class to clear all callbacks for a specific event channel.
3. **Hard**: Implement a prioritized event emitter where subscriptions are registered with a priority number (e.g. 1 to 10), and the publish function executes higher priority callbacks first.

---

## 14. Mini Assignment

Write a script where a client unsubscribes from a channel after receiving three messages, verifying that subsequent messages are ignored.

---

## 15. Mini Project

Create a modular document editor notification manager `DocumentBroker`. Implement events `"PAGE_ADDED"`, `"TEXT_MUTATED"`, and `"DOCUMENT_SAVED"`. Show how page counters and autosave systems sync state updates decoupled using the Event Emitter specification.

```javascript
// document-emitter-project.js
// Paste your EventEmitter class here
const docEvents = new EventEmitter();

// Component 1: AutoSaveManager (Only needs to save once on first mutation)
class AutoSaveManager {
  constructor() {
    // One-time save notification setup
    docEvents.once("TEXT_MUTATED", () => {
      this.triggerFirstSave();
    });
  }

  triggerFirstSave() {
    console.log("AutoSave: First document mutation detected. Triggering backup save...");
  }
}

// Component 2: WordCounter (Tracks all changes)
class WordCounter {
  constructor() {
    this.wordsCount = 0;
    this.sub = docEvents.subscribe("TEXT_MUTATED", (text) => {
      this.updateCount(text);
    });
  }

  updateCount(text) {
    this.wordsCount = text.split(/\s+/).filter(Boolean).length;
    console.log(`WordCounter: Current words count is ${this.wordsCount}`);
  }

  destroy() {
    this.sub.unsubscribe();
    console.log("WordCounter: Unsubscribed from text edits.");
  }
}

// Test case
const counter = new WordCounter();
const saver = new AutoSaveManager();

docEvents.publish("TEXT_MUTATED", "Hello World"); // Both components respond
docEvents.publish("TEXT_MUTATED", "Hello World Journey"); // Only WordCounter responds (once triggered!)
counter.destroy(); // Unsubscribe cleanly
docEvents.publish("TEXT_MUTATED", "New text"); // Ignored
```

---

## 16. Chapter Summary

- An **Event Emitter** decoupled component interactions using channels.
- The registry map links **event names** to **arrays of callbacks**.
- **`subscribe`** returns an object containing an **`unsubscribe()`** method.
- **`once`** wraps callbacks in a handler that unsubscribes on its first execution.
- **Shallow copy** callback arrays during publishing to prevent index shifting bugs.

---

## 17. Quiz

1. Why is it important to delete empty event arrays from the registry dictionary?
2. What happens if one listener callback throws an error inside the publish loop?
3. Does `unsubscribe` use the `filter` method or the `splice` method to safely remove callbacks?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will study the **Spec - Virtual DOM**. We will explore virtual nodes, rendering algorithms, and diff-reconciliation trees.

---

## 19. Completion Checklist

- [ ] I can write a custom Event Emitter class.
- [ ] I understand how to return unsubscribe closures.
- [ ] I can implement once-only subscriptions using wrappers.
- [ ] I know how to check active subscription counts to debug leaks.
