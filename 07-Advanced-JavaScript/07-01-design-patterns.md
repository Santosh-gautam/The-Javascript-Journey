# Design Patterns

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of classes, closures, and object bindings
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are managing a high-end restaurant:

- **Singleton Pattern is like the Head Chef**: There is only one Head Chef in the kitchen. Every station (sauce, pastry, grill) reports to this exact same chef. You do not hire a new Head Chef for every order that comes in.
- **Factory Pattern is like the Order Ticket Router**: The waiters write down order descriptions (e.g. "Steak", "Salad"). They pass the ticket to the kitchen router. The router determines which station constructs the dish and returns the plate. The waiter does not need to know how to grill steak or wash lettuce; they just request the dish.
- **Observer Pattern is like the Order Ready Buzzer**: When a customer's order is complete, the kitchen sounds a bell. The waiters (observers) who are subscribed to that station hear the bell, check the plate, and carry the food to their tables.
- **Module Pattern is like the Kitchen Staff's Private Lounge**: The lounge has private lockers, staff conversations, and ingredient details hidden from customers. Only the public reception desk is exposed to the visitors in the dining room.

In JavaScript, design patterns structure your code to solve common modularity challenges.

---

## 2. Problem

As applications grow, organizing object relationships and state becomes difficult:
- Creating multiple database connection instances can crash connections.
- Direct instantiation of complex objects inside customer routes makes code hard to extend.
- Lack of messaging structures makes it difficult for modules to sync state updates.
- Global scope pollution exposes sensitive variables.

---

## 3. Solution

We apply software design patterns tailored to JavaScript's dynamic nature:
1. **Singleton**: Ensuring a class has only one instance and providing a global point of access.
2. **Factory**: Centralizing object creation to decouple instantiation logic.
3. **Observer**: Implementing event subscription systems for clean decoupling.
4. **Module**: Hiding variables within private closure boundaries while revealing clean public APIs.

---

## 4. Definition

- **Design Pattern**: A reusable solution to a commonly occurring problem in software design.
- **Singleton**: A pattern restricting instantiation of a class to a single object.
- **Factory**: A pattern that uses factory methods to create objects without specifying their exact class type.
- **Observer (Pub/Sub)**: A dependency pattern where a subject maintains a list of dependents (observers) and notifies them of state updates.
- **Module Pattern**: A closure-based structural pattern used to encapsulate private code blocks.

---

## 5. Visualization

### Observer Pattern (Publish/Subscribe) Flow

```
   [ Subject / Publisher ]
     - observers: [ Obs1, Obs2, Obs3 ]
     - subscribe(fn)
     - notify(data) -----------------------+
                                           |
             +-----------------------------+-----------------------------+
             |                             |                             |
             v                             v                             v
     [ Observer 1 (Obs1) ]         [ Observer 2 (Obs2) ]         [ Observer 3 (Obs3) ]
     (Executes callback)           (Executes callback)           (Executes callback)
```

---

## 6. Internal Working

V8 supports patterns using these runtime structures:

1. **Singleton Module Scoping**: When you export a class instance in ES Modules, V8 evaluates the module code **once** and caches the exported object in Heap memory. Any file that imports the instance receives a pointer to this same cached object, creating a Singleton naturally.
2. **Module Pattern Closures**: The Module pattern utilizes local lexical environments. Variables declared inside the IIFE remain allocated in the Heap as long as the returned public API object holds references to them, protecting private state from external mutation.
3. **Observer Callback arrays**: The Subject stores observers as an array of function references. When `notify(data)` is called, the engine loops through the array, pushing each callback onto the Call Stack sequentially.

---

## 7. Code Examples

### Bad Practice: Global Instance Spawning
Creating new logger configurations inside every file wastes memory and splits logs.

```javascript
// Bad: Creates separate configurations, splitting log streams
class Logger {
  constructor() {
    this.logs = [];
  }
  log(msg) { this.logs.push(msg); }
}

const log1 = new Logger();
const log2 = new Logger(); // Separate instance in heap!
```

### Good Practice: Singleton Implementation
Ensure only a single instance of a class exists throughout the application.

```javascript
// Good: Strict Singleton structure
class SingletonLogger {
  constructor() {
    if (SingletonLogger.instance) {
      return SingletonLogger.instance;
    }
    this.logs = [];
    SingletonLogger.instance = this;
  }
  log(msg) { this.logs.push(msg); }
}

const loggerInstance = new SingletonLogger();
Object.freeze(loggerInstance); // Secure properties
export default loggerInstance;
```

### Best Practice: The Observer (PubSub) System
Implement decoupling using a subscription model.

```javascript
// Best Practice: Observer implementation
class EventManager {
  constructor() {
    this.subscribers = {};
  }

  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
    };
  }

  publish(event, data) {
    if (!this.subscribers[event]) return;
    this.subscribers[event].forEach(callback => callback(data));
  }
}

// Usage
const broker = new EventManager();
const unsub = broker.subscribe("USER_LOGIN", (user) => console.log(`Welcome, ${user.name}`));
broker.publish("USER_LOGIN", { name: "Ishan" });
unsub(); // Unsubscribe cleanly
```

---

## 8. Dry Run

Let's dry run the Module Pattern structure:

```javascript
const CounterModule = (function() {
  let count = 0; // Private variable
  return {
    increment() { count++; },
    getVal() { return count; }
  };
})();

CounterModule.increment();
console.log(CounterModule.getVal());
```

### Step-by-Step State
- **IIFE Execution**:
  - The immediately invoked function runs.
  - V8 creates a local lexical environment containing `count = 0`.
  - The function returns an object containing two method closures: `increment` and `getVal`.
  - The IIFE context finishes, but the inner scope is preserved in the Heap because the returned object references it.
- **Increment Call**:
  - `CounterModule.increment()` runs.
  - V8 reads the closure scope, updating `count` to `1`.
- **Get Value Call**:
  - `CounterModule.getVal()` runs.
  - It reads the closure scope, returning `1`.
  - Logs: `1`. The private variable `count` cannot be modified directly from the outside.

---

## 9. Common Mistakes

- **Mistake 1: Trying to access private variables directly in the Module Pattern.**
    ```javascript
    console.log(CounterModule.count); // Output: undefined
    ```
- **Mistake 2: Memory leaks in the Observer pattern.**
    Subscribing to events without calling the unsubscribe function when components unmount keeps callback references in the array, preventing garbage collection.

---

## 10. Debugging

### Tracing Singletons in Debugger
When troubleshooting Singleton configuration updates:
1. Set a breakpoint inside your Singleton class constructor.
2. Run the application.
3. If the breakpoint hits more than once, your Singleton implementation is failing. Check if the instance tracker property is being reset, or if files are using different absolute import paths.

---

## 11. Real World Usage

- **Node.js require cache**: Node uses the Singleton pattern for modules. When you `require` a database config file, the exported connection is cached and reused across files.
- **Redux / State Managers**: Redux uses the Observer pattern. Components subscribe to the central store, and the store notifies them to re-render when state changes.

---

## 12. Interview Preparation

### Question: What is the Revealing Module Pattern in JavaScript and how does it utilize closures?
- **Wrong Answer**: It is a class constructor utility.
- **Good Answer**: The Revealing Module Pattern uses an Immediately Invoked Function Expression (IIFE) to create private scopes. Variables and functions declared inside the IIFE cannot be accessed from the outside. The function returns an object containing references to the private functions and variables we want to expose. These returned methods form closures over the IIFE's scope, maintaining access to the private variables in Heap memory.

---

## 13. Practice

### Exercises
1. **Easy**: Implement a Singleton class representing a DB Configuration manager.
2. **Medium**: Create a Factory class `VehicleFactory` that generates `Car` or `Truck` objects based on a type parameter.
3. **Hard**: Implement a complete Event Emitter class that supports `subscribe`, `publish`, and `once` subscriptions.

---

## 14. Mini Assignment

Write a Module pattern utility `AuthManager` containing private variables `username` and `token`, and public methods to set and read these values securely.

---

## 15. Mini Project

Create a modular configuration manager `ThemeManager` that implements the Singleton and Observer patterns together, allowing elements to subscribe to theme changes and update their styling when the theme toggles.

```javascript
// theme-design-pattern.js
class ThemeManager {
  constructor() {
    if (ThemeManager.instance) {
      return ThemeManager.instance;
    }
    this.theme = "light";
    this.listeners = [];
    ThemeManager.instance = this;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  setTheme(newTheme) {
    this.theme = newTheme;
    this.listeners.forEach(callback => callback(this.theme));
  }
}

// Test case
const manager1 = new ThemeManager();
const manager2 = new ThemeManager();

console.log("Singleton Check:", manager1 === manager2); // true

const unsub = manager1.subscribe(theme => console.log("UI updated to theme:", theme));
manager2.setTheme("dark"); // Trigger notification log
unsub();
```

---

## 16. Chapter Summary

- **Design Patterns** organize object relationships in software.
- **Singleton** restricts a class instantiation to a single object.
- **Factory** decouples object creation from business logic.
- **Observer** handles decoupling via subscription lists.
- **Module Pattern** uses IIFEs and closures to encapsulate private code.

---

## 17. Quiz

1. How does V8 support Singletons naturally in ES Modules?
2. Why does the Module pattern prevent global scope pollution?
3. What is the purpose of returning an unsubscribe function inside the subscribe helper?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Functional Programming**. We will explore pure functions, immutability, function composition, and learn how to write declarative, side-effect-free code.

---

## 19. Completion Checklist

- [ ] I can implement Singleton classes in JavaScript.
- [ ] I understand how Factory classes delegate object creation.
- [ ] I can write Observer subscription event brokers.
- [ ] I understand how the Module pattern creates private closure states.
