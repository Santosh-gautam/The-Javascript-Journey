# Symbols

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of Object properties and iteration
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are running a secure hotel storage locker system:

- **String keys are like paper tags with label names**: You label a locker `"Zara"`. But what if a new employee accidentally creates a second tag saying `"Zara"`? They might overwrite or open the wrong locker because the names are identical (collision).
- **Symbols are like unique physical fingerprint keys**: You generate a key. Even if you name the key `"Zara's key"` (the description), the lock mechanism ignores the text label. It reads the microscopic unique fingerprint ridges. No two fingerprint keys are ever identical, even if they have the same label.
- **Hidden Properties are like secret compartments**: Locker doors have visible drawers. But they also have a hidden partition accessible only using your fingerprint key. Standard luggage counts (enumerable checks like `Object.keys`) do not list items inside the hidden partition.
- **Global Symbol Registry is like a master vault index**: You register a master key under the label `"Admin"`. Any branch of the hotel can request the key for `"Admin"` and receive a copy of the exact same master key reference.

In JavaScript, **Symbols** provide this unique key safety.

---

## 2. Problem

In JavaScript, object keys are traditionally strings.

If multiple independent modules or libraries try to add properties to the same shared object (such as a global `window` object or user configuration data):
- They can accidentally overwrite each other's keys if they use the same name (property collision).
- Internal metadata properties get mixed with user-facing data during loops (`for...in` or `JSON.stringify()`).

---

## 3. Solution

ES6 introduced **Symbols**—a unique and immutable primitive data type.

Every created Symbol is guaranteed to be unique, making it impossible for property collision to occur.

Furthermore, Symbol properties are hidden from standard iteration methods, allowing for clean metadata encapsulation.

---

## 4. Definition

- **Symbol**: A unique, immutable primitive data type used to create collision-free object property keys.
- **Global Symbol Registry**: A shared global storage space where Symbols can be registered and retrieved by string keys.
- **Well-Known Symbols**: Built-in constants (like `Symbol.iterator`) used by the engine to customize internal operations.

---

## 5. Visualization

### String Keys vs. Symbol Keys on Objects

```
   [ Object: User ]
   ├── String Keys (Public / Enumerable)
   │     ├── "name"  --> "Aarav"
   │     └── "email" --> "aarav@gmail.com"
   │
   └── Symbol Keys (Private Metadata / Non-enumerable)
         ├── Symbol("id")   --> "USR-101"
         └── Symbol("role") --> "admin"
```

If you execute `Object.keys(User)`, V8 returns `["name", "email"]` only, leaving the Symbol metadata hidden from loops.

---

## 6. Internal Working

How V8 manages Symbols internally:

1. **Primitive Representation**: Unlike Objects, Symbols are true primitives. V8 does not allocate a full object wrapper when you call `Symbol()`. It creates a unique token inside its internal symbol table in Heap memory.
2. **Uniqueness Guarantee**: V8 checks its token counter to generate a unique internal ID on every `Symbol()` call. Two symbols are never equal (`===` returns `false`), even if they share the same description.
3. **Property Hiding**: When V8 iterates over object properties (like `for...in` or `Object.keys()`), its internal iteration flags filter out property descriptors whose keys are of type Symbol. They are only returned when using specialized APIs like `Object.getOwnPropertySymbols()`.

---

## 7. Code Examples

### Bad Practice: Unsafe String Keys for Metadata
Using common string keys for internal metadata can cause property collision if external code updates the object.

```javascript
// Bad: Collision trap
const user = { name: "Zara" };

// Module A sets metadata ID
user.id = "MODULE-A-ID";

// Module B updates ID unaware of Module A, overwriting the value!
user.id = "MODULE-B-ID"; 
console.log(user.id); // Output: "MODULE-B-ID" (Module A's ID is lost)
```

### Good Practice: Collision-Free Symbol Keys
Use unique Symbol keys to ensure properties cannot be overwritten by external scripts.

```javascript
// Good: Safe, unique metadata keys
const user = { name: "Zara" };

const idA = Symbol("id");
const idB = Symbol("id"); // Same description, but unique token!

user[idA] = "MODULE-A-ID";
user[idB] = "MODULE-B-ID";

console.log(user[idA]); // Output: "MODULE-A-ID"
console.log(user[idB]); // Output: "MODULE-B-ID" (No collision occurred!)
```

### Best Practice: Well-Known Symbols Customizations
Use well-known symbols like `Symbol.toStringTag` or `Symbol.toPrimitive` to customize how your custom objects behave in standard JavaScript operations.

```javascript
// Best Practice: Custom object classification
class DatabaseConnection {
  constructor(name) {
    this.name = name;
  }

  // Customize output of Object.prototype.toString
  get [Symbol.toStringTag]() {
    return "DBConnection";
  }

  // Customize mathematical or string coercion behavior
  [Symbol.toPrimitive](hint) {
    if (hint === "string") return `DBConnection: ${this.name}`;
    if (hint === "number") return 1; // connected state flag
    return this.name;
  }
}

const conn = new DatabaseConnection("UsersDB");
console.log(Object.prototype.toString.call(conn)); // Output: "[object DBConnection]"
console.log(`${conn}`); // Output: "DBConnection: UsersDB" (Custom primitive string)
```

---

## 8. Dry Run

Let's dry run Symbol registry evaluations:

```javascript
const s1 = Symbol("app");
const s2 = Symbol("app");
const g1 = Symbol.for("app");
const g2 = Symbol.for("app");

console.log(s1 === s2); // Line 1
console.log(g1 === g2); // Line 2
console.log(s1 === g1); // Line 3
```

### Step-by-Step State
- **Line 1 (`s1 === s2`)**:
  - `s1` and `s2` are local Symbols.
  - V8 generates a unique token for each.
  - They are not equal. Logs `false`.
- **Line 2 (`g1 === g2`)**:
  - `Symbol.for("app")` is called for `g1`. V8 checks the Global Symbol Registry for key `"app"`.
  - Since it is missing, V8 creates a new global symbol and registers it.
  - `Symbol.for("app")` is called for `g2`. V8 checks the registry, finds the existing symbol, and returns its reference.
  - Both variables point to the same global reference. Logs `true`.
- **Line 3 (`s1 === g1`)**:
  - `s1` is a local symbol. `g1` is in the global registry.
  - They are completely separate tokens. Logs `false`.

---

## 9. Common Mistakes

- **Mistake 1: Trying to use the `new` operator with Symbols.**
    ```javascript
    const sym = new Symbol("app"); // TypeError: Symbol is not a constructor
    ```
- **Mistake 2: Expecting `JSON.stringify()` to include Symbol keys.**
    Symbol properties are skipped during JSON serialization. If you need to serialize data, use string keys.

---

## 10. Debugging

### Locating Symbol Keys on Objects in Console
To find all Symbol keys attached to an object:
1. Open Chrome DevTools.
2. In the Console, define an object: `const obj = { [Symbol("test")]: 42 };`.
3. Use the standard query:
    - **`Object.getOwnPropertySymbols(obj)`**: Returns an array of all Symbol keys attached to `obj`.
    - **`Reflect.ownKeys(obj)`**: Returns all keys, including both strings and Symbols.
4. Inspect the returned array elements to confirm key mappings.

---

## 11. Real World Usage

- **Polyfills and Shims**: Global helper libraries attach custom polyfill methods (like iterators) to prototype structures using Symbol keys, guaranteeing they will not overwrite or conflict with future native browser updates.
- **Custom iterables**: Creating custom page lists that can be iterated using the spread operator (`...`) by implementing the `Symbol.iterator` method.

---

## 12. Interview Preparation

### Question: How do you hide an object property from `Object.keys()` but keep it readable?
- **Wrong Answer**: Setting the property value to `undefined` or `null`.
- **Good Answer**: You can define the property using a **Symbol** as the key. Symbol properties are skipped in `for...in` loops, `Object.keys()`, and `JSON.stringify()`. However, the property remains accessible to anyone who has a reference to the Symbol key.

---

## 13. Practice

### Exercises
1. **Easy**: Create a Symbol with description `"test"`. Verify that it is not equal to another Symbol with the same description.
2. **Medium**: Write a script that checks if a Symbol exists in the global registry using `Symbol.keyFor(sym)`.
3. **Hard**: Implement a class `Stack` that stores its items array inside a property keyed by a Symbol, hiding the internal array from external modifications.

---

## 14. Mini Assignment

Write a script that loops through an object containing both string and Symbol keys, showing how to filter out string keys and return only Symbol keys.

---

## 15. Mini Project

Create a hidden metadata inspector `MetadataStore` that allows you to store private configuration logs on any user object using Symbol keys, preventing accidental modification by standard business logic.

```javascript
// symbol-metadata-store.js
class MetadataStore {
  constructor() {
    this.metaKey = Symbol("system-metadata");
  }

  setMetadata(target, data) {
    target[this.metaKey] = {
      ...target[this.metaKey],
      ...data,
      lastModified: Date.now()
    };
  }

  getMetadata(target) {
    return target[this.metaKey] || null;
  }
}

// Test case
const store = new MetadataStore();
const user = { name: "Ishan" };

store.setMetadata(user, { role: "admin", ip: "192.168.1.1" });

console.log("Keys visible to loops:", Object.keys(user)); // [ 'name' ] (metadata is hidden!)
console.log("Retrieved Metadata:", store.getMetadata(user)); // Contains role, ip, lastModified
```

---

## 16. Chapter Summary

- **Symbols** are unique and immutable primitive data types.
- Symbols cannot be coerced and are guaranteed to be unique.
- Symbol keys are hidden from standard iterations (`Object.keys()`).
- **Well-Known Symbols** customize internal engine behaviors.
- Use the **Global Registry** (`Symbol.for()`) to share Symbols across contexts.

---

## 17. Quiz

1. How do you read Symbol keys from an object?
2. Does `Symbol("name") === Symbol("name")` resolve to `true`?
3. What well-known Symbol allows an object to be iterated in a `for...of` loop?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Generators & Iterators**. We will explore how custom iterators work and how to write custom sequences using generator yield flows.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Object keys collision — different libraries same string keys use karte hain, conflict ho jata hai.
- **Concept**: Symbol() globally unique identifier hai — Symbol('id') !== Symbol('id') hamesha 	rue.
- **Key Pattern**: const ID = Symbol('id'); obj[ID] = 123; — string keys se collision impossible, or...in mein bhi nahi aata.
- **Common Mistake**: Symbol.for('key') aur Symbol('key') ko same samajhna — Symbol.for global registry use karta hai, same key same symbol deta hai.
## 19. Completion Checklist

- [ ] I can create unique Symbol primitive keys.
- [ ] I understand how to hide metadata using Symbol properties.
- [ ] I know how to use `Symbol.for()` to access the global registry.
- [ ] I can query Symbol keys using `Object.getOwnPropertySymbols`.
