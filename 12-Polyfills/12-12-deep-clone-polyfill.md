# Polyfill for deep clone

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of recursion, reference vs. value types, object descriptors, and the `WeakMap` registry
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a cloning technician in a research lab copying files:

- **Shallow Copy is like photocopying a folder of paper lists containing warehouse address tags**:
  - You photocopy the main sheets.
  - If the original sheet has a physical key card (reference pointer) pointing to a physical safe in the warehouse (nested object), your copy gets a copy of the *address key card* itself, not a duplicate safe.
  - If the client opens the safe and alters the cash inside (mutating nested properties), both your copied folder and the original folder are affected because both key cards point to the same physical safe.
- **Deep Copy is like building a duplicate warehouse and safe**: You create new folders, buy a new physical safe, and duplicate all the contents inside it, creating a completely independent copy.
- **Circular Reference Check is preventing infinite copy loops**: If Safe A contains a key card pointing to Safe B, and Safe B contains a key card pointing back to Safe A, trying to photocopy everything recursively will lock you in an infinite loop. To prevent this, you keep a clipboard log (using `WeakMap`). If you see a safe you already cloned, you link to the existing copy instead of cloning it again.

In JavaScript, the **`deepClone` polyfill** implements this recursive reference resolution.

---

## 2. Problem

Simple serialization methods (like `JSON.parse(JSON.stringify(obj))`) fail to clone complex structures:
- They discard functions, `undefined`, and symbols.
- They convert `Date` objects to ISO strings, lose `RegExp` patterns, and break `Map` and `Set` structures.
- If the object contains circular references, they throw `TypeError: Converting circular structure to JSON` and crash.

---

## 3. Solution

We write a robust **`deepClone` Polyfill**.

Using a recursive algorithm combined with a tracking `WeakMap`, we handle primitives, duplicate dates/regexes/maps/sets, resolve circular loops, and preserve symbol property keys.

---

## 4. Definition

- **Shallow Copy**: Copying only the top-level properties of an object; nested object references are shared between the copy and the original.
- **Deep Copy**: Creating a complete duplicate of an object, including all nested objects, recursively, resulting in independent object references.
- **Circular Reference**: An object structure where a property of an object directly or indirectly references the object itself.

---

## 5. Visualization

### Circular Reference Loop Resolution

```
   Original: Object A ──(friend property)──> Object B
                ^                              │
                │                              ▼
                └────────(friend property)─────┘ (Circular Loop)
  
   Cloning Process:
   1. Clone Object A -> Save (A -> A_Clone) in WeakMap.
   2. Clone Object B -> Save (B -> B_Clone) in WeakMap.
   3. Clone B.friend -> Check WeakMap. Object A is already cloned!
   4. Resolve: Link B_Clone.friend = A_Clone. Loop breaks safely!
```

---

## 6. Internal Working

How the deep clone algorithm handles references:

1. **Registry Mapping (`WeakMap`)**: The polyfill initializes a tracking `WeakMap` cache: `new WeakMap()`. Before cloning any object, it checks `cache.has(obj)`. If found, it returns `cache.get(obj)`, breaking circular loops.
2. **Date/RegExp Instantiation**: For date/regex types, the polyfill instantiates new objects using their constructor functions: `new Date(obj.getTime())` and `new RegExp(obj.source, obj.flags)`.
3. **Reflect Keys**: To copy all properties including non-enumerable or Symbol keys, the polyfill uses `Reflect.ownKeys(obj)`.

---

## 7. Code Examples

### Bad Practice: JSON Serialization
Using JSON string conversion discards non-serializable properties and throws errors on circular references.

```javascript
// Bad: Discards functions/symbols/undefined, converts Dates to strings, fails on circular loops
function badDeepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
```

### Good Practice: Basic Recursive Clone
A recursive cloner that checks for object types, but is vulnerable to circular loops.

```javascript
// Good: Simple recursive cloner (vulnerable to circular loops)
function deepCloneBasic(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  const clone = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepCloneBasic(obj[key]);
    }
  }
  return clone;
}
```

### Best Practice: The Robust Deep Clone Polyfill
A production-ready deep cloner using a `WeakMap` to resolve circular references and handling special object types.

```javascript
// Best Practice: Spec-compliant Deep Clone Polyfill
function deepClone(value, hash = new WeakMap()) {
  // 1. Primitive values (number, string, boolean, symbol, null, undefined) or functions
  if (value === null || typeof value !== "object") {
    return value;
  }

  // 2. Circular reference resolution
  if (hash.has(value)) {
    return hash.get(value);
  }

  // 3. Date objects
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // 4. RegExp objects
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  // 5. Map objects
  if (value instanceof Map) {
    const mapClone = new Map();
    hash.set(value, mapClone);
    value.forEach((val, key) => {
      mapClone.set(deepClone(key, hash), deepClone(val, hash));
    });
    return mapClone;
  }

  // 6. Set objects
  if (value instanceof Set) {
    const setClone = new Set();
    hash.set(value, setClone);
    value.forEach(val => {
      setClone.add(deepClone(val, hash));
    });
    return setClone;
  }

  // 7. Arrays and Plain Objects
  const clone = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  hash.set(value, clone); // Save in registry cache first to prevent recursion loops

  // 8. Copy all keys, including Symbols
  Reflect.ownKeys(value).forEach(key => {
    clone[key] = deepClone(value[key], hash);
  });

  return clone;
}
```

---

## 8. Dry Run

Let's dry run cloning `const obj = { a: 1 }; obj.self = obj; deepClone(obj)`:

- **First Call `deepClone(obj)`**:
  - `value` is an object. `hash.has(obj)` is `false`.
  - Is `obj` a Date/RegExp/Map/Set? No.
  - Creates clone: `clone` = `{}`.
  - Registers in cache: `hash.set(obj, clone)`.
  - Loops keys: `key = "a"`.
    - Recursively calls `deepClone(1)`. Returns primitive `1`.
    - Saves `clone.a = 1`.
  - Loops keys: `key = "self"`.
    - Recursively calls `deepClone(obj)` (passing the active `hash`).
- **Second Call (Recursive Call `deepClone(obj)`)**:
  - `value` points to `obj`.
  - `hash.has(obj)` is `true`! Enters block.
  - Returns the cached `clone` reference.
- **Back to First Call**:
  - Saves `clone.self = clone`.
  - Loop completes. Returns `clone`.
  - The circular reference is resolved safely without infinite recursion.

---

## 9. Common Mistakes

- **Mistake 1: Setting the clone object in the `WeakMap` *after* recursively cloning its properties.**
    If you do not register the cloned object reference in the `WeakMap` *before* traversing its properties, recursive child property checks will fail to locate it in the cache, resulting in infinite recursion loops on circular structures.
- **Mistake 2: Failing to preserve prototypes.**
    Using `const clone = {}` discards custom prototypes of objects. Use `Object.create(Object.getPrototypeOf(value))` instead to preserve prototype chains.

---

## 10. Debugging

### Tracing Recursion Depths in Call Stack
When debugging recursive cloning operations on deeply nested objects:
1. Set a conditional breakpoint at the start of your `deepClone` function:
    `if (hash.has(value))`
2. Step through the code.
3. Inspect the **Call Stack** pane:
    - You will see multiple recursive `deepClone` frames.
    - Confirm the circular check is reached and returns successfully, avoiding a stack overflow.

---

## 11. Real World Usage

- **Redux State Mutations**: Making deep copies of state objects to mutate nested properties safely while preserving other branches.
- **Configuration cloning**: Duplicating global configurations inside helper routines before appending local configurations.

---

## 12. Interview Preparation

### Question: Why do we use a `WeakMap` instead of a standard `Map` to track visited objects in `deepClone`?
- **Wrong Answer**: Because `WeakMap` runs faster.
- **Good Answer**: We use a `WeakMap` to prevent memory leaks.
  - **WeakMap** holds weak references to its key objects. If the object being cloned is later garbage collected, the entry in the `WeakMap` is automatically removed, allowing the memory to be reclaimed.
  - If we used a standard **Map**, it would maintain strong references to all cloned objects, preventing garbage collection and potentially leading to memory leaks in long-running applications.

---

## 13. Practice

### Exercises
1. **Easy**: Write a simple recursive deep clone that works on plain objects containing nested numbers and strings.
2. **Medium**: Write a test script validating that a deep cloned Date object is an independent instance with a different reference than the original.
3. **Hard**: Write a custom deep clone polyfill that preserves property descriptors (like `configurable`, `enumerable`, `writable`, getters/setters) using `Object.getOwnPropertyDescriptors`.

---

## 14. Mini Assignment

Write a function `isDeepEqual(obj1, obj2)` that recursively compares two objects to check if they have identical properties and values.

---

## 15. Mini Project

Create a test runner suite `DeepCloneTester` that validates your custom deep clone implementation against 5 Edge Cases (circular references, Symbol keys, Dates, Maps, and prototypes).

```javascript
// deep-clone-test-suite.js
// Paste your deepClone polyfill here

console.log("--- Running Deep Clone Tests ---");

// Test 1: Date & Symbol Keys
const sym = Symbol("id");
const original = {
  date: new Date(2026, 0, 1),
  [sym]: "symbolValue"
};
const cloneObj = deepClone(original);
console.log("Test 1 (Date Instance):", cloneObj.date instanceof Date && cloneObj.date !== original.date ? "PASS" : "FAIL");
console.log("Test 2 (Symbol Value):", cloneObj[sym] === "symbolValue" ? "PASS" : "FAIL");

// Test 3: Circular References
const user = { name: "Ishan" };
user.self = user;
const clonedUser = deepClone(user);
console.log("Test 3 (Circular):", clonedUser.self === clonedUser && clonedUser !== user ? "PASS" : "FAIL");
```

---

## 16. Chapter Summary

- **Shallow copies** copy only top-level references, causing shared mutations.
- **Deep copies** recursively duplicate nested objects to create independent references.
- Use a **`WeakMap`** registry to resolve circular references and prevent stack overflows.
- Handle special object types like **Date**, **RegExp**, **Map**, and **Set** individually.
- Use **`Reflect.ownKeys`** to preserve Symbol keys.

---

## 17. Quiz

1. Why does `JSON.parse(JSON.stringify({ a: undefined }))` return `{}`?
2. What exception is thrown on stack overflows inside recursive functions?
3. How does `WeakMap` handle garbage collection of keys?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will study the **Polyfill for flatten array**. We will explore recursive array flattening and custom depth limit constraints.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Objects copy karna — shallow copy se nested objects shared reference rehta hai, unexpected mutations hote hain.
- **Concept**: Deep clone: recursively har nested object/array ko copy karo — original se poori tarah independent copy.
- **Key Pattern**: unction deepClone(val) { if(typeof val !== 'object' || val === null) return val; if(Array.isArray(val)) return val.map(deepClone); return Object.fromEntries(Object.entries(val).map(([k,v]) => [k, deepClone(v)])); }.
- **Common Mistake**: Circular references handle na karna — infinite recursion hoga; WeakMap se visited track karo.
## 19. Completion Checklist

- [ ] I can write a custom deep clone polyfill.
- [ ] I understand the difference between shallow and deep copy reference bugs.
- [ ] I know how to resolve circular references using `WeakMap`.
- [ ] I know how to clone special objects like Dates and Maps.
