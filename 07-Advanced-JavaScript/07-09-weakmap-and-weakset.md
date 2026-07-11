# WeakMap & WeakSet

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of object memory references and garbage collection (GC)
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you run a VIP coat check service at a hotel:

- **A Standard Map is like a coat check ledger with customer names written in permanent ink**: You write: `"Room 101 -> Red Jacket"`. Even if the guest checks out, leaves the hotel, and is never seen again, you keep the entry in the ledger and hold onto the jacket in your closet forever. The jacket occupies physical space (memory leak) until you manually cross the name out.
- **A WeakMap is like attaching a tag that dissolves when the guest leaves**: You attach a smart-tag to the guest's room key. The tag links `"Room Key -> Red Jacket"`. As long as the guest holds the room key (strong reference), the tag is valid. The moment the guest leaves and returns the room key to the hotel (the key is garbage collected), the link breaks automatically. The jacket is cleared out immediately, freeing closet space without you needing to update the ledger.

In JavaScript, **WeakMap** and **WeakSet** provide this automatic memory cleanup.

---

## 2. Problem

Standard `Map` and `Set` collections hold **Strong References** to their keys and values.

If you store a DOM element inside a standard Map as a key (for example, caching metadata about a button):
- Even if that button is removed from the page using `button.remove()`, the Map still holds a reference to the button in memory.
- The browser's garbage collector cannot reclaim the memory, leading to memory leaks.

---

## 3. Solution

JavaScript provides **`WeakMap`** and **`WeakSet`**.

These collections hold **Weak References** to their keys (WeakMap) or values (WeakSet).

If there are no other active references to a stored object elsewhere in the application, the garbage collector will reclaim the object and remove it from the weak collection automatically.

---

## 4. Definition

- **Strong Reference**: A reference that prevents the garbage collector from reclaiming the memory of the referenced object.
- **Weak Reference**: A reference that does not prevent the garbage collector from reclaiming the object if no other strong references to it exist.
- **WeakMap**: A collection of key-value pairs where the keys must be objects (or registered symbols) and are held weakly.
- **WeakSet**: A collection of unique objects that are held weakly.

---

## 5. Visualization

### Map (Strong Reference) vs. WeakMap (Weak Reference)

```
   STANDARD MAP (Strong Reference)
   [ Global Scope ] -------> [ User Object ] <------- [ Map Key ]
                                                         |
                                                         v
                                                   [ Map Value ]
   (If we set User Object = null, the Map Key still holds a strong reference.
    The object remains in the Heap, leaking memory.)
  
   WEAKMAP (Weak Reference)
   [ Global Scope ] -------> [ User Object ] < - - - - [ WeakMap Key ]
                                                         |
                                                         v
                                                   [ WeakMap Value ]
   (If we set User Object = null, the WeakMap's weak reference is ignored.
    V8 garbage collects the object and deletes the key-value pair.)
```

---

## 6. Internal Working

How V8 manages weak references:

1. **Garbage Collection Passes**: V8's garbage collector regularly runs root-reachability checks. If an object is only reachable via a WeakMap key, the collector marks the object as dead, reclaims its Heap space, and clears the WeakMap slot.
2. **No Iteration (Non-Determinism)**: Because garbage collection runs asynchronously and unpredictably, WeakMap and WeakSet are **not iterable** (no `.keys()`, `.values()`, `.forEach()`, or `.size` properties). The browser cannot guarantee what elements are inside at any given millisecond, so it blocks all iteration APIs.
3. **Key Restrictions**: WeakMap keys must be Objects (or symbols). Primitive values (like strings or numbers) cannot be garbage collected, so V8 throws a `TypeError` if you try to use them as keys.

---

## 7. Code Examples

### Bad Practice: Memory Leaks with Standard Maps
Storing DOM elements in a standard Map prevents them from being garbage collected when removed from the page.

```javascript
// Bad: Memory leak!
const elementMetadata = new Map();

let button = document.createElement("button");
elementMetadata.set(button, { clickedCount: 0 });

document.body.appendChild(button);
button.remove(); // Removed from page DOM

button = null; // We clear the reference in our script
// BUT: elementMetadata still holds a strong reference to the button!
// The button element is leaked in memory.
```

### Good Practice: Safe Cache with WeakMap
Use a WeakMap to cache metadata for DOM elements. When the elements are deleted, the cached metadata is automatically garbage collected.

```javascript
// Good: Safe from memory leaks
const elementMetadata = new WeakMap();

let button = document.createElement("button");
elementMetadata.set(button, { clickedCount: 0 });

document.body.appendChild(button);
button.remove();

button = null; // Clear our reference
// Since it's a WeakMap, V8 will garbage collect the button and clear the entry!
```

### Best Practice: Encapsulating Private Class Data
Use a WeakMap to store private class fields, ensuring data remains completely inaccessible and is cleaned up when instances are deleted.

```javascript
// Best Practice: Private data storage
const privateData = new WeakMap();

class UserProfile {
  constructor(username, password) {
    // Store sensitive password in WeakMap, not on the instance!
    privateData.set(this, { password });
    this.username = username;
  }

  verifyPassword(input) {
    const data = privateData.get(this);
    return data ? data.password === input : false;
  }
}

let user = new UserProfile("zara", "pass123");
console.log(user.password); // Output: undefined (Secure!)
console.log(user.verifyPassword("pass123")); // true

user = null; // The instance is deleted, and its private password data is garbage collected automatically.
```

---

## 8. Dry Run

Let's dry run the behavior of a WeakSet:

```javascript
const visitedPages = new WeakSet();
let page1 = { url: "/home" };
let page2 = { url: "/about" };

visitedPages.add(page1);
visitedPages.add(page2);

console.log(visitedPages.has(page1)); // Line 1

page1 = null; // Clear reference
// Garbage collector runs in the background
console.log(visitedPages.has(page2)); // Line 2
```

### Step-by-Step State
- **Line 1 (`visitedPages.has(page1)`)**:
  - `page1` points to an active object `{ url: "/home" }`.
  - The WeakSet holds a weak reference to it.
  - Logs `true`.
- **Reference Clear**:
  - `page1 = null` removes the only strong reference to `{ url: "/home" }`.
  - During the next garbage collection cycle, V8 reclaims the memory of `{ url: "/home" }` and removes it from the WeakSet.
- **Line 2 (`visitedPages.has(page2)`)**:
  - `page2` still has an active reference.
  - Logs `true`.

---

## 9. Common Mistakes

- **Mistake 1: Trying to iterate over a WeakMap.**
    ```javascript
    const wm = new WeakMap();
    for (let key of wm) {} // TypeError: wm is not iterable
    ```
- **Mistake 2: Using primitive types as WeakMap keys.**
    ```javascript
    const wm = new WeakMap();
    wm.set("key", "value"); // TypeError: Invalid value used as weak map key
    ```

---

## 10. Debugging

### Verifying Weak Garbage Collection in DevTools
To verify if objects in your WeakMap are being garbage collected:
1. Open Chrome DevTools.
2. Navigate to the **Performance** tab.
3. Click the trash can icon (Collect Garbage) multiple times to force garbage collection.
4. Navigate to the **Memory** tab and take a Heap Snapshot.
5. Search for the class name of the objects stored in your WeakMap (e.g. `UserProfile` or `HTMLButtonElement`).
6. If you cleared the references and forced garbage collection, they should no longer appear in the snapshot list.

---

## 11. Real World Usage

- **DOM Event Listeners Trackers**: Storing tracking data on DOM elements without preventing the elements from being cleaned up when they are removed.
- **Memoization Caching**: Storing calculations of objects (such as configurations or API objects) using a WeakMap cache. When the original config object is deleted, the cache is freed.

---

## 12. Interview Preparation

### Question: Why are WeakMap and WeakSet not iterable, and why don't they have a `.size` property?
- **Wrong Answer**: Because they are too small to have a size.
- **Good Answer**: Because they hold weak references, their contents depend on when the browser's garbage collector runs. Garbage collection is non-deterministic (we cannot predict exactly when it will run). If the collection were iterable or had a `.size` property, the size and keys returned could change from one millisecond to the next based on GC passes. To prevent non-deterministic program behavior, JavaScript blocks all size and iteration APIs on weak collections.

---

## 13. Practice

### Exercises
1. **Easy**: Create a WeakMap, set an object key, check its presence, and verify that using a string throws an error.
2. **Medium**: Write a class `Circle` that uses a WeakMap to store its private `radius` property.
3. **Hard**: Implement a cache class `APICache` using a WeakMap where cached items are automatically cleared when the query objects are garbage collected.

---

## 14. Mini Assignment

Write a script that tracks if a user object is active using a WeakSet. Simulate deleting the user object and verify that its reference is no longer tracked.

---

## 15. Mini Project

Create a memory-safe DOM metadata logger `ElementTracker` that stores custom interaction logs on DOM elements using a WeakMap, preventing memory leaks when elements are dynamically deleted.

```javascript
// weakmap-metadata-tracker.js
class ElementTracker {
  constructor() {
    this.tracker = new WeakMap();
  }

  logClick(element) {
    if (!this.tracker.has(element)) {
      this.tracker.set(element, { clicks: 0, timestamps: [] });
    }
    const data = this.tracker.get(element);
    data.clicks++;
    data.timestamps.push(Date.now());
    console.log(`Log saved. Total clicks: ${data.clicks}`);
  }

  getLogs(element) {
    return this.tracker.get(element) || null;
  }
}

// Test case using mock elements
let buttonElement = { id: "btn-1" };
const tracker = new ElementTracker();

tracker.logClick(buttonElement);
tracker.logClick(buttonElement);

console.log("Active Logs:", tracker.getLogs(buttonElement));

// Simulate deleting the button
buttonElement = null; // Safe: V8 reclaims the button's logs
```

---

## 16. Chapter Summary

- **Strong References** prevent garbage collection; **Weak References** do not.
- **WeakMap** and **WeakSet** hold keys/values weakly, preventing memory leaks.
- Weak collections are **non-iterable** and lack a **`.size`** property.
- WeakMap keys must be **Objects** (or registered symbols).

---

## 17. Quiz

1. What exception is thrown when using a number as a WeakMap key?
2. Do WeakMaps prevent garbage collection of their values?
3. Why does `WeakSet` not have a `.clear()` method?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will study **Property Descriptors**. We will explore how to configure object properties using writable, enumerable, and configurable flags.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

WeakMap aur WeakSet standard Map aur Set ke weak variants hain. Dono mein simple rule hai: **keys/elements hamesha objects (ya unregistered symbols) hi honi chahiye, primitives nahi.** Aur doosra rule: ye references **weak** hote hain — matlab GC (Garbage Collector) object ko collect karne se nahi rokta agar koi strong reference na bacha ho. Iska use elements metadata cache karne, event listener associations track karne, ya private data maintain karne ke liye hota hai bina memory leak ki chinta kiye.

### Andar kya hota hai (Internal Working)

Normal Map keys ka **strong reference** rakhta hai. Agar tum DOM element Map mein store karo aur DOM se use remove kar do, standard Map use clean nahi hone dega (memory leak).

WeakMap mein:
1. Keys ko weak tables mein store kiya jaata hai. V8 garbage collection passes mein root reachability verify karta hai.
2. Agar key object sirf WeakMap se reachable hai, toh object ko **dead** mark kiya jaata hai.
3. Heap space reclaim ho jaati hai aur map slot empty ho jaata hai.
4. **Non-iterable behavior**: Kyunki GC unpredictable time pe run karta hai, WeakMap ki keys list deterministic nahi hoti, isiliye .keys(), .values(), .forEach() ya .size properties design-wise missing hain.

### Code Example samjho

`javascript
// Good: WeakMap metadata association
const elementMetadata = new WeakMap();

let button = document.createElement("button");
elementMetadata.set(button, { clickedCount: 0 }); // Key is object

document.body.appendChild(button);
button.remove(); // DOM se remove kiya

button = null; // Script reference clear kiya
// WeakMap auto-cleanup: button ab GC se collect ho jayega!
`

**Line by line:**
- const elementMetadata = new WeakMap() — WeakMap create kiya.
- elementMetadata.set(button, ...) — element ko key banaya. Registry weak hai.
- utton.remove() aur utton = null — ab browser memory mein button object ka koi strong pointer nahi bacha.
- GC pass aayega: key utton unreachable hai, memory free ho jayegi. Standard Map hota toh button memory leak ban jaata.

### Sabse badi galti log karte hain

WeakMap ke keys mein primitives (strings, numbers) use karna: weakMap.set('id', { name: 'Ravi' }) — TypeError dega. Primitives gc-eligible objects nahi hote aur inki life cycle predictable keys ki tarah treat nahi ki ja sakti.

### Yaad rakhne ki cheez

**WeakMap = Weak references = Auto-cleanup for Objects.** Iteration supported nahi hota. DOM node association track karne aur memory leaks avoid karne ke liye sabse best tool hai.

## 20. Completion Checklist

- [ ] I can explain the difference between strong and weak references.
- [ ] I understand why weak collections are non-iterable.
- [ ] I can use WeakMap to store private class variables.
- [ ] I know how to check heap references in DevTools.
