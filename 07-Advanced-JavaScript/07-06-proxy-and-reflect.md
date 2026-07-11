# Proxy & Reflect

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Object properties and property descriptors
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a CEO of a large company:

- **The Target Object is you, the CEO**: You have a personal calendar, bank accounts, and contact details.
- **The Proxy is your Personal Assistant (PA)**: Anyone who wants to talk to you, get details, or schedule meetings must speak to your PA first.
- **Traps are the rules you give your PA**:
  - **`get` trap**: If a client asks: *"What is the CEO's schedule today?"* (get property), the PA checks their credentials. If they are allowed, the PA tells them. If they are a telemarketer, the PA tells them a fake schedule.
  - **`set` trap**: If a manager asks: *"Update the CEO's calendar for 2:00 PM"* (set property), the PA validates the request. If the time slot is free and the manager has permission, the PA schedules it. Otherwise, they reject it.
- **Reflect is the PA's direct line to you**: When the PA decides a request is valid, they use their walkie-talkie (Reflect) to query or update your calendar directly, ensuring no miscommunications occur.

In JavaScript, this is **Meta-programming**.

---

## 2. Problem

In standard JavaScript, objects are passive data structures:
- You can write invalid data to properties (`user.age = -50`).
- Accessing missing properties returns `undefined` silently, making bugs hard to detect.
- Intercepting object mutations dynamically (e.g. to trigger UI updates when a property changes) is complex and requires wrapping everything in custom getters and setters.

---

## 3. Solution

JavaScript provides **`Proxy`** and **`Reflect`** APIs.

A `Proxy` object wraps a target object, intercepting low-level operations (like property access, assignment, and deletion) using handler traps.

`Reflect` provides matching static methods to delegate these intercepted operations back to the target object safely.

---

## 4. Definition

- **Meta-programming**: A programming technique in which computer programs have the ability to treat other programs as their data, analyzing or mutating their behavior at runtime.
- **Proxy**: An object used to define custom behavior for fundamental operations on a target object.
- **Trap**: A handler method that intercepts a specific operation (e.g. `get`, `set`).
- **Reflect**: A built-in global object that provides methods for intercepting JavaScript operations, mirroring Proxy traps.

---

## 5. Visualization

### Proxy Interception Data Flow

```
   [ Code Operation ] ---> [ Proxy Wrapper ]
                                 |
                     +-----------+-----------+
                     |                       |
               Trap matches?            No trap matches?
                     |                       |
            +--------+--------+              v
            |                 |      [ Direct Action on Target ]
            v                 v
     [ Execute Trap Handler ]
     - Validation
     - Logs / Traps
            |
            v
     [ Reflect Call ] -------> [ Target Object ]
```

---

## 6. Internal Working

How V8 processes Proxies at the engine level:

1. **Proxy Object Layout**: A Proxy object does not have its own properties. V8 allocates a `JSProxy` record in the Heap containing pointers to:
    - The `target` object.
    - The `handler` object.
2. **Trap Lookup**: When you execute `proxy.name`:
    - The engine detects the object is a `JSProxy`.
    - It bypasses standard prototype lookup and checks the `handler` for a `get` function.
    - If found, it pushes the `get` handler onto the Call Stack.
3. **Receiver Parameter**: The `get` trap accepts a `receiver` argument (representing the proxy instance itself). Using `Reflect.get(target, prop, receiver)` preserves correct `this` bindings when accessing inherited getter methods.

---

## 7. Code Examples

### Bad Practice: Manual Property Validation Getters
Writing custom setter functions on every object requires duplicate validation code and restricts direct assignment.

```javascript
// Bad: Verbose validation setup
const user = {
  setAge(val) {
    if (typeof val !== "number" || val < 0) {
      throw new Error("Invalid age");
    }
    this.age = val;
  }
};
user.setAge(25);
user.age = -10; // BUG: Direct assignment bypasses validation!
```

### Good Practice: Simple Proxy Validation
Use a Proxy `set` trap to intercept and validate all property assignments.

```javascript
// Good: Centralized property validation
const userTarget = { name: "Ishan", age: 25 };

const userProxy = new Proxy(userTarget, {
  set(target, property, value) {
    if (property === "age") {
      if (typeof value !== "number" || value < 0) {
        throw new TypeError("Age must be a positive number");
      }
    }
    // Set value using Reflect
    return Reflect.set(target, property, value);
  }
});

userProxy.age = 30; // Works!
// userProxy.age = -5; // Throws TypeError!
```

### Best Practice: Reactive State Tracker (Vue-style Reactivity)
Build a reactive state manager that automatically triggers callback rendering ticks when properties update.

```javascript
// Best Practice: Reactive state tracker
const reactive = (target, onChange) => {
  return new Proxy(target, {
    get(target, prop, receiver) {
      // Return value using Reflect
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const oldValue = target[prop];
      const success = Reflect.set(target, prop, value, receiver);
      
      if (success && oldValue !== value) {
        onChange(prop, value);
      }
      return success;
    }
  });
};

// Usage
const state = reactive({ count: 0 }, (prop, val) => {
  console.log(`UI Updated: ${prop} changed to ${val}`);
});

state.count = 1; // Output: UI Updated: count changed to 1
state.count = 2; // Output: UI Updated: count changed to 2
```

---

## 8. Dry Run

Let's dry run the getter trap execution flow:

```javascript
const target = { secret: "1234" };
const handler = {
  get(target, prop) {
    if (prop === "secret") return "ACCESS DENIED";
    return Reflect.get(target, prop);
  }
};
const proxy = new Proxy(target, handler);
console.log(proxy.secret); // Line 1
console.log(proxy.name);   // Line 2
```

### Step-by-Step State
- **Line 1 (`proxy.secret`)**:
  - V8 intercepts property lookup on `secret`.
  - Executes `get` trap.
  - Matches `prop === "secret"`.
  - Returns `"ACCESS DENIED"`.
- **Line 2 (`proxy.name`)**:
  - V8 intercepts property lookup on `name`.
  - Executes `get` trap.
  - Does not match `"secret"`.
  - Calls `Reflect.get(target, "name")`.
  - Target returns `undefined` (default action).
  - Logs `undefined`.

---

## 9. Common Mistakes

- **Mistake 1: Returning false or nothing from the `set` trap.**
    In strict mode, if a `set` trap doesn't return `true` (indicating successful assignment), V8 will throw a `TypeError: 'set' on proxy: trap returned falsish`.
- **Mistake 2: Creating infinite recursion loops in traps.**
    ```javascript
    const p = new Proxy({}, {
      get(target, prop) {
        return p[prop]; // Bad: Accessing the proxy inside the trap triggers the trap recursively, causing stack overflow!
      }
    });
    ```

---

## 10. Debugging

### Inspecting Target Objects of Proxies
If you are looking at a Proxy in the debugger and need to check the original data:
1. Open Chrome DevTools Console.
2. Log the Proxy variable: `console.log(myProxy)`.
3. Expand the logged Proxy object:
    - Locate the special internal debugger properties:
      - **`[[Target]]`**: Points to the original wrapped target object.
      - **`[[Handler]]`**: Points to the handler object containing active traps.
4. Inspect the `[[Target]]` properties directly to see the un-proxied values.

---

## 11. Real World Usage

- **Vue.js 3 Reactivity**: Vue uses Proxies to wrap state objects. When properties are set inside components, the Proxy intercepts the assignments and schedules DOM re-renders.
- **REST API Mocks**: Creating mock API objects that dynamically generate routes: `api.users.get()` is intercepted by a Proxy that parses the properties `users` and `get` to make the network request.

---

## 12. Interview Preparation

### Question: Why should you use `Reflect` methods inside Proxy traps instead of directly modifying the target?
- **Wrong Answer**: Because Reflect runs faster.
- **Good Answer**: Reflect methods mirror the default actions of JavaScript objects. If you modify targets directly (e.g. `target[prop] = value`), you lose edge-case safety. For example, if the property is a getter/setter accessor, or if you need to pass a `receiver` context. Reflect guarantees the correct `this` binding is maintained, and returns a boolean value (success/failure) rather than throwing errors, matching the signature of the trap.

---

## 13. Practice

### Exercises
1. **Easy**: Create a Proxy that logs a warning to the console whenever you try to access a non-existent property on an object.
2. **Medium**: Write a Proxy `has` trap that hides private properties (properties starting with `_`) from the `in` operator checks.
3. **Hard**: Write a revocable Proxy using `Proxy.revocable()`. Show how to revoke access and observe the errors thrown.

---

## 14. Mini Assignment

Write a Proxy validator that checks if properties written to a user object are alphanumeric strings only.

---

## 15. Mini Project

Create a secure configuration loader `SecureConfig` that wraps sensitive system options in a Proxy, preventing modification of keys marked as read-only.

```javascript
// proxy-config-lock.js
const makeSecure = (configObj, readOnlyKeys = []) => {
  return new Proxy(configObj, {
    set(target, prop, value, receiver) {
      if (readOnlyKeys.includes(prop)) {
        console.warn(`Access Denied: Property "${prop}" is read-only.`);
        return false; // Blocks assignment in strict mode
      }
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      if (readOnlyKeys.includes(prop)) {
        console.warn(`Access Denied: Cannot delete read-only property "${prop}".`);
        return false;
      }
      return Reflect.deleteProperty(target, prop);
    }
  });
};

// Test case
const systemConfig = { port: 8080, apiKey: "SECRET_KEY_12" };
const secure = makeSecure(systemConfig, ["apiKey"]);

secure.port = 9000; // Allowed
secure.apiKey = "NEW_KEY"; // Denied
delete secure.apiKey; // Denied

console.log("Config State:", secure);
```

---

## 16. Chapter Summary

- **Meta-programming** allows customizing core object operations at runtime.
- **`Proxy`** wraps objects and intercepts operations using handler traps.
- **`Reflect`** provides mirror methods to delegate default actions back to the target safely.
- Use Proxies to build schema validation, API mocks, and reactive state systems.

---

## 17. Quiz

1. What parameter references the proxy instance itself inside the `get` trap?
2. How do you create a Proxy that can be disabled dynamically?
3. What happens if a `set` trap returns `false` in strict mode?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Symbols**. We will explore JavaScript's unique primitive type, global Symbol registries, and well-known Symbols.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Proxy ek object ke fundamental operations ko intercept karta hai — get (property padhna), set (property likhna), has (in operator), deleteProperty, pply (function call), etc. Ye **meta-programming** hai — code jo apne aap ya dusre code ka behavior modify karta hai. Reflect namespace default behavior ke liye — Proxy traps mein Reflect use karo taaki original behavior correctly preserve ho.

### Andar kya hota hai (Internal Working)

V8 ke andar Proxy ek JSProxy record hai jisme 	arget aur handler pointers hain. Jab proxy.name access karo:
1. V8 detect karta hai ye JSProxy object hai.
2. handler object mein get trap dhundha.
3. Mila? handler.get(target, 'name', proxy) call karo.
4. Nahi mila? Reflect.get(target, 'name', proxy) — normal property lookup.

**Important**: Proxy operations normally se slower hain — engine optimize nahi kar sakta kyunki har operation handler check karta hai. Tight performance loops mein avoid karo.

Reflect V8 ke internal operations ka JavaScript-level mirror hai — Reflect.get, Reflect.set, etc. Trap mein use karo to correctly handle edge cases like prototype chain, getters/setters, receiver.

### Code Example samjho

`javascript
// Bad: Manual validation setter
const user = {
  setAge(val) {
    if (typeof val !== "number" || val < 0) throw new Error("Invalid age");
    this.age = val;
  }
};
user.setAge(25);
user.age = -10; // Direct assignment bypasses validation! Bug!

// Good: Proxy set trap — validates all assignments
const userProxy = new Proxy({}, {
  set(target, key, value, receiver) {
    if (key === "age" && (typeof value !== "number" || value < 0)) {
      throw new TypeError(Invalid age: );
    }
    return Reflect.set(target, key, value, receiver); // Correct default
  }
});

userProxy.age = 25;  // OK
userProxy.age = -10; // TypeError: Invalid age: -10
`

**Line by line:**
- 
ew Proxy({}, { set(target, key, value, receiver) {...} }) — target khaali object, handler mein set trap.
- set trap: har assignment intercept hota hai chahe direct ho (userProxy.age = -10).
- if (key === "age" && ...) — age ke liye specific validation.
- Reflect.set(target, key, value, receiver) — original set operation correctly perform karo. eceiver correct karna zaroori hai agar prototype chain pe getters/setters hain.

### Sabse badi galti log karte hain

Reflect use karna bhool ke directly 	arget[key] = value karna trap mein. Ye incorrect hota hai agar object pe getters/setters ya inherited properties hain — receiver lost ho jaata hai. Hamesha Reflect.set(target, key, value, receiver) use karo set trap mein.

### Yaad rakhne ki cheez

**Proxy = operations intercept. Reflect = correct default behavior.** Har Proxy trap mein corresponding Reflect method use karo — edge cases correctly handle honge.

## 20. Completion Checklist

- [ ] I can create Proxy instances with get/set traps.
- [ ] I understand why `Reflect` methods are used inside traps.
- [ ] I can build validation traps using Proxies.
- [ ] I know how to view `[[Target]]` values in Chrome DevTools.
