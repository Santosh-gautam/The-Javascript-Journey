# Property Descriptors

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Objects and prototypes
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are writing a custom real estate lease agreement:

- **A Standard Property is like renting an apartment with default rules**: You can paint walls (writable), show rooms to guests (enumerable), and tear down partitions (configurable).
- **`writable: false` is like a strict lease clause**: You are allowed to live in the apartment, but you cannot paint the walls or change the layout. The color is locked (read-only).
- **`enumerable: false` is like having a hidden panic room**: The room is inside the apartment, and you can use it. But it is not listed on the public blueprint, and realtors touring the apartment do not see it (skipped in loops).
- **`configurable: false` is like locking the lease terms forever**: Once signed, the tenant cannot delete rooms, cannot change the lease duration, and cannot convert a non-paintable apartment into a paintable one. It is sealed in place.

In JavaScript, **Property Descriptors** are these lease rules for object properties.

---

## 2. Problem

By default, all properties on JavaScript objects are fully mutable:
- Anyone can overwrite values (`user.isAdmin = true`).
- Properties are exposed in loops, which can leak internal metadata.
- Third-party scripts can delete critical methods on core objects (`delete Array.prototype.push`).

---

## 3. Solution

JavaScript provides the **Property Descriptors** API.

Using **`Object.defineProperty()`**, you can customize the behavior of individual properties by setting flags for modification (`writable`), looping (`enumerable`), and deletion (`configurable`).

You can also lock down entire objects using `preventExtensions()`, `seal()`, or `freeze()`.

---

## 4. Definition

- **Property Descriptor**: A configuration object associated with a property that defines its behaviors (writable, enumerable, configurable).
- **`Object.defineProperty`**: A static method used to define a new property or modify an existing one with a descriptor.
- **Object.freeze**: A method that makes an object completely immutable (shallowly).
- **Object.seal**: A method that prevents adding or deleting properties, but allows updating existing writable properties.

---

## 5. Visualization

### Object Lock Level Comparisons

```
   [ Object: User ]
          |
     preventExtensions(User)   --> Prevents: Adding new keys
          |
     seal(User)                --> Prevents: Adding / Deleting keys
          |                        Sets: configurable = false
          |
     freeze(User)              --> Prevents: Adding / Deleting / Updating keys
                                   Sets: configurable = false, writable = false
```

---

## 6. Internal Working

How V8 compiles and enforces property descriptors:

1. **Descriptor Record Layout**: Inside V8, objects are stored with a **Descriptor Array**. Each descriptor contains pointers to key strings and a set of internal flag bits representing the attributes:
    - **`W` (Writable)**
    - **`E` (Enumerable)**
    - **`C` (Configurable)**
2. **Assignment Checks**: When you run `obj.name = "Ali"`, V8's runtime compiler checks the `W` flag bit for `"name"`. If the bit is `0` (writable is false):
    - In non-strict mode, V8 discards the assignment silently.
    - In strict mode (`"use strict"`), V8 immediately throws a `TypeError`.
3. **Configurability Lock**: Once `configurable` is set to `false`, V8 locks the descriptor. Any subsequent call to `defineProperty` on that property throws a `TypeError`, preventing scripts from unlocking properties.

---

## 7. Code Examples

### Bad Practice: Unprotected Library Metadata
Using standard properties for internal configuration keys allows client scripts to overwrite or delete them.

```javascript
// Bad: Library configs are mutable
const databaseClient = {
  version: "1.0.0",
  connect() { console.log("Connected"); }
};

// Client script can modify or delete core configurations!
databaseClient.version = "2.0.0";
delete databaseClient.connect; // Connection code is destroyed!
```

### Good Practice: Protected Property Definitions
Use `Object.defineProperty` to define immutable metadata and non-deletable methods.

```javascript
// Good: Protected properties
const databaseClient = {};

Object.defineProperty(databaseClient, "version", {
  value: "1.0.0",
  writable: false, // Read-only
  enumerable: true, // Visible in loops
  configurable: false // Cannot be deleted or re-configured
});

Object.defineProperty(databaseClient, "connect", {
  value() { console.log("Connected"); },
  writable: false,
  enumerable: false, // Hidden from loops
  configurable: false
});

// databaseClient.version = "2.0.0"; // Ignored (or throws in strict mode)
// delete databaseClient.connect;     // Ignored
```

### Best Practice: Shallow Immutability via Freezing
Freeze configuration objects to guarantee they cannot be modified, deleted, or extended by external scripts.

```javascript
// Best Practice: Frozen application settings
const APP_SETTINGS = {
  apiEndpoint: "https://api.app.com",
  maxRetries: 5,
  features: {
    darkMode: true // Nested object!
  }
};

// Freeze the configuration
Object.freeze(APP_SETTINGS);

// APP_SETTINGS.maxRetries = 10; // Blocked!
// APP_SETTINGS.newOption = "test"; // Blocked!

// WARNING: Freeze is shallow! Nested objects can still be mutated:
APP_SETTINGS.features.darkMode = false; // Allowed!

// Solution: Use deep freeze utility
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const prop = obj[name];
    if (prop && typeof prop === "object") {
      deepFreeze(prop);
    }
  });
  return Object.freeze(obj);
}
```

---

## 8. Dry Run

Let's dry run the behavior of configurable locks:

```javascript
const user = {};
Object.defineProperty(user, "role", {
  value: "user",
  configurable: false,
  writable: true
});

user.role = "admin"; // Line 1
console.log(user.role);

Object.defineProperty(user, "role", {
  writable: false // Line 2
});

Object.defineProperty(user, "role", {
  enumerable: false // Line 3
});
```

### Step-by-Step State
- **Line 1 (`user.role = "admin"`)**:
  - Since `writable` is `true`, the value can be modified even if `configurable` is `false`.
  - `role` is updated to `"admin"`. Logs `"admin"`.
- **Line 2 (`writable: false`)**:
  - If a property is `configurable: false`, the only modification allowed is changing `writable` from `true` to `false`.
  - The operation succeeds. `role` is now read-only.
- **Line 3 (`enumerable: false`)**:
  - Since `configurable` is `false`, modifying other descriptor attributes (like `enumerable`) is blocked.
  - V8 throws a `TypeError: Cannot redefine property: role`.

---

## 9. Common Mistakes

- **Mistake 1: Assuming `Object.freeze()` performs a deep freeze.**
    Object.freeze is **shallow**. Nested objects inside the frozen object remain fully mutable.
- **Mistake 2: Missing the default values of property descriptors.**
    When using `Object.defineProperty()`, if you do not specify `writable`, `enumerable`, or `configurable`, they default to **`false`**! (Whereas properties created via assignment default to `true`).

---

## 10. Debugging

### Inspecting Property Descriptors
To check the descriptor configuration of an object property:
1. Open Chrome DevTools Console.
2. Type:
    - **`Object.getOwnPropertyDescriptor(obj, "propName")`**: Returns the descriptor object: `{ value, writable, enumerable, configurable }`.
    - **`Object.isFrozen(obj)`**: Checks if the object is frozen.
    - **`Object.isSealed(obj)`**: Checks if the object is sealed.
3. Verify the flags to determine if a script is blocked from writing to a property.

---

## 11. Real World Usage

- **Global Constant Configurations**: Libraries define global constants using read-only property descriptors to prevent third-party scripts from altering default behaviors.
- **ORM Schema Mappings**: Framework databases define model properties with getters/setters and set `enumerable: true` so they are included in JSON serialization automatically.

---

## 12. Interview Preparation

### Question: What is the difference between `Object.freeze()` and `Object.seal()`?
- **Wrong Answer**: They are identical security methods.
- **Good Answer**:
  - **`Object.seal()`** prevents adding new properties and marks all existing properties as non-configurable (so they cannot be deleted). However, you can still update the values of existing writable properties.
  - **`Object.freeze()`** does everything `Object.seal()` does, but additionally marks all properties as non-writable. You cannot add, delete, or update any properties on a frozen object.

---

## 13. Practice

### Exercises
1. **Easy**: Create an object and define a property that is read-only. Verify it throws an error in strict mode when written to.
2. **Medium**: Write a function `deepFreeze(obj)` that recursively freezes nested objects.
3. **Hard**: Write an object containing private variables using getter/setter descriptors, preventing users from assigning strings to number fields.

---

## 14. Mini Assignment

Create an object representing a bank transaction. Define the `transactionID` as non-writable and non-configurable, and `amount` as writable but non-configurable.

---

## 15. Mini Project

Create a secure application state manager `SafeState` that accepts initial values, freezes the state structure dynamically using deep freezing, and logs errors whenever external scripts try to mutate configurations.

```javascript
// safe-state-descriptors.js
class SafeState {
  static create(initialState) {
    // Perform recursive deep freeze
    const deepFreeze = (obj) => {
      Object.getOwnPropertyNames(obj).forEach(name => {
        const prop = obj[name];
        if (prop && typeof prop === "object") {
          deepFreeze(prop);
        }
      });
      return Object.freeze(obj);
    };

    return deepFreeze(initialState);
  }
}

// Test case
const state = SafeState.create({
  connection: {
    host: "localhost",
    credentials: { user: "admin" }
  },
  theme: "dark"
});

console.log("Is State Frozen?", Object.isFrozen(state)); // true
console.log("Is Nested object Frozen?", Object.isFrozen(state.connection.credentials)); // true

// Attempt mutations (should throw or fail silently depending on strict mode)
try {
  "use strict";
  state.connection.host = "192.168.1.1";
} catch (e) {
  console.log("Caught Mutation Block:", e.message); // Cannot assign to read only property
}
```

---

## 16. Chapter Summary

- **Property Descriptors** define writable, enumerable, and configurable attributes.
- By default, descriptors set via `defineProperty` default to **`false`**.
- **`preventExtensions()`** blocks additions. **`seal()`** blocks additions and deletions.
- **`freeze()`** blocks all changes (shallowly). Write recursive functions for deep freezing.

---

## 17. Quiz

1. What is the default value of the `writable` flag inside `Object.defineProperty`?
2. Can you delete a property that is marked as `configurable: false`?
3. What happens to nested objects when you freeze a parent object?

---

## 18. Next Chapter Preview

We have completed **Module 07: Advanced JavaScript**! You have mastered design patterns, functional programming, currying, memoization, rate limit wrappers, meta-programming, symbols, custom iteration sequences, weak maps, and property descriptors. In the next module, **Module 08: Performance**, we will begin by exploring **Performance Measurement**.

---

## 19. Completion Checklist

- [ ] I can configure property descriptors using `Object.defineProperty`.
- [ ] I understand the difference between `writable` and `configurable` flags.
- [ ] I can distinguish between preventExtensions, seal, and freeze.
- [ ] I know how to check property descriptors in DevTools.
