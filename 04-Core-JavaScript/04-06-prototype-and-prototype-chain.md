# Prototype & Prototype Chain

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 18 minutes
- **Prerequisites**: Understanding objects, memory heap, and references
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are renting a house.

The house has a kitchen with a fridge. If you open your fridge, you find food that you bought (local property).

But what if you need a lawnmower? Your rented house doesn't have one in the yard. Instead of buying one, you go to the landlord's tool shed (the prototype). You check their shed, find a lawnmower, and use it. If the landlord doesn't have it, they check the community association's central shed (parent prototype).

Only if nobody in the entire community has a lawnmower do you get a "Not Available" response (`undefined`).

You don't own the lawnmower; you just borrow it by following a chain of locations.

In JavaScript, objects work exactly like this. When you request a property that doesn't exist on the object itself, JavaScript searches the object's parent property shed—the **Prototype Chain**.

---

## 2. Problem

If you want to create 10,000 player objects for an online game, and each player has a `jump()` method:
- Allocating the `jump()` code block inside each player's local memory would bloat the Memory Heap.
- If you had to change the rules of `jump()`, you would have to locate and update 10,000 separate objects in memory.

---

## 3. Solution

JavaScript utilizes **Prototypes**.

Instead of copying properties or methods onto every instance, we place shared methods on a single parent object called the **Prototype**. Each instance simply stores a tiny link pointer (`__proto__`) referencing this shared object. When an instance calls the method, V8 follows the link and executes the shared code block.

---

## 4. Definition

- **Prototype**: A helper object linked to another object from which properties and methods can be inherited.
- **`__proto__` (dunder proto)**: The active link pointer on an object instance that points to its constructor's prototype.
- **`prototype` property**: A property that exists *only* on functions, used as a blueprint object to assign the `__proto__` link for new objects created via that function.
- **Prototype Chain**: The multi-linked series of objects that JavaScript crawls through to look up property values.

---

## 5. Visualization

### The Prototype Lookup Link Chain

Let's look at the memory pointers for an array instance `arr` and its prototype chain:

```
+------------------------------------+
|  [ arr instance ]                  |
|  - 0: 10                           |
|  - 1: 20                           |
|  - __proto__ ----------------------+-----> [ Array.prototype ]
+------------------------------------+       - push: [function]
                                             - pop: [function]
                                             - __proto__ -----------------> [ Object.prototype ]
                                                                            - toString: [function]
                                                                            - __proto__: null
```

When you call `arr.toString()`, the engine searches `arr` (missing), searches `Array.prototype` (missing), and finally locates it on `Object.prototype`.

---

## 6. Internal Working

V8 resolves properties using these prototype chain lookup steps:

1. **Property Check**: When you execute `obj.prop`, V8 checks if `prop` exists directly on `obj` (checked using internal `hasOwnProperty` maps).
2. **Chain Travel**: If missing, V8 reads the internal pointer `[[Prototype]]` (exposed as `__proto__`) to step to the parent prototype object.
3. **Default Termination**:
    - V8 repeats this lookup cycle up the chain.
    - The chain terminates at `Object.prototype`, whose `__proto__` is `null`.
    - If V8 hits `null` without finding the key, it returns `undefined`.
4. **Shadowing properties**: If you write `obj.prop = 5`, V8 writes the property directly onto `obj` itself, shadowing (hiding) the prototype property of the same name.

---

## 7. Code Examples

### Bad Practice: Attaching Methods inside Constructor Functions
Declaring functions inside constructors recreates the method inside the Heap for every instance, wasting memory.

```javascript
function Player(name) {
  this.name = name;
  // Bad: Each player gets a distinct duplicate copy of jump in memory!
  this.jump = function() {
    return this.name + " jumped!";
  };
}

const p1 = new Player("Alice");
const p2 = new Player("Bob");
console.log(p1.jump === p2.jump); // Output: false (Different function locations)
```

### Good Practice: Prototype Assignments
Assign methods to the shared prototype property so all instances reference a single function in memory.

```javascript
function Player(name) {
  this.name = name;
}

// Good: Single shared function in memory
Player.prototype.jump = function() {
  return this.name + " jumped!";
};

const p1 = new Player("Alice");
const p2 = new Player("Bob");
console.log(p1.jump === p2.jump); // Output: true (Shares identical memory block!)
```

### Best Practice: Pure Object Creation without Constructors
Use `Object.create(proto)` to build objects directly linked to a prototype namespace, avoiding construction syntax wrapper overheads.

```javascript
// Best Practice: Clear proto template
const playerActions = {
  jump() {
    return this.name + " jumped cleanly.";
  }
};

// Create p1 directly linked to playerActions prototype
const p1 = Object.create(playerActions);
p1.name = "Alice";

console.log(p1.jump()); // Alice jumped cleanly.
```

---

## 8. Dry Run

Let's trace property resolution step-by-step:

```javascript
1: const protoObj = { color: "blue" };
2: const myObj = Object.create(protoObj);
3: console.log(myObj.color);
4: myObj.color = "red";
5: console.log(myObj.color);
```

### Step-by-Step State
- **Line 1**:
  - `protoObj` is created in Heap containing `color: "blue"`.
- **Line 2**:
  - `myObj` is created in Heap. Its internal `[[Prototype]]` pointer (`__proto__`) is set to `protoObj`. `myObj` has no local properties.
- **Line 3**:
  - V8 reads `myObj.color`.
  - Checks local `myObj` keys -> empty.
  - Follows `__proto__` to `protoObj` -> finds `color: "blue"`.
  - Logs `"blue"`.
- **Line 4**:
  - V8 executes `myObj.color = "red"`.
  - This is a write operation. V8 creates a local property `color` directly on `myObj` with value `"red"`. It does *not* mutate the prototype.
- **Line 5**:
  - V8 reads `myObj.color`.
  - Checks local keys -> finds `color: "red"`.
  - Logs `"red"`. The prototype `color: "blue"` is now shadowed.

---

## 9. Common Mistakes

- **Mistake 1: Confusing `prototype` with `__proto__`.**
  - `prototype` is a blueprint property on constructor functions.
  - `__proto__` is the actual active linkage pointer on object instances.
- **Mistake 2: Mutating the prototype of built-in structures.**
    Adding custom properties to `Array.prototype` or `Object.prototype` (called "Prototype Pollution") causes compatibility breaks across library tools.

---

## 10. Debugging

### Inspecting Prototypes in Chrome DevTools
You can view the prototype chains of any object:
1. Write a script:
    ```javascript
    const myArr = [1, 2];
    console.dir(myArr);
    ```
2. Open Chrome DevTools Console.
3. Expand the logged array details:
    - Look at the properties.
    - Locate the `[[Prototype]]` entry (in older browsers, `__proto__`). Expand it. This is `Array.prototype`.
    - Look inside `Array.prototype` and locate *its* `[[Prototype]]`. Expand it. This is `Object.prototype`.
    - This visual tree shows you the exact path the engine uses to resolve methods like `push()` or `toString()`.

---

## 11. Real World Usage

- **Polyfills**: When a browser lacks a modern method (e.g. `Array.prototype.includes`), polyfill engines write it directly into the array prototype so older engines inherit the capability.
- **Modern ES Classes**: Under the hood, JavaScript classes are syntax templates. V8 converts class declarations directly into constructor functions and prototype linkage settings.

---

## 12. Interview Preparation

### Question: What is the difference between `__proto__` and `prototype`?
- **Wrong Answer**: They are the same property renamed in ES6.
- **Good Answer**: `prototype` is a property belonging exclusively to functions. It is the blueprint object that will be assigned as the prototype of any instances created if the function is called with the `new` keyword. `__proto__` (or `[[Prototype]]`) is an actual active reference link present on all objects that points to the prototype object they inherit from.

---

## 13. Practice

### Exercises
1. **Easy**: Create an object and log its prototype. What is the default parent prototype?
2. **Medium**: Write a constructor function `Car(brand)` that sets a brand, and add a method `drive()` to its prototype.
3. **Hard**: Implement a function that crawls up an object's prototype chain and prints out all parent objects until it reaches `null`.

---

## 14. Mini Assignment

Write a script that creates an object using `Object.create(null)`. Inspect it in DevTools. Does it have methods like `toString()` or `valueOf()`? Why?

---

## 15. Mini Project

Create a prototypal inheritance structure representing a database model system, sharing central methods like `save()` and `validate()` across dynamic records.

```javascript
// model-prototype.js
const ModelBase = {
  save() {
    console.log(`Saving record: ${JSON.stringify(this.data)} to database...`);
    return true;
  },
  validate() {
    return this.data && typeof this.data.id === 'number';
  }
};

function UserRecord(id, username) {
  // Create object with ModelBase as prototype
  const record = Object.create(ModelBase);
  record.data = { id, username };
  return record;
}

const user = UserRecord(101, "Aanya");
if (user.validate()) {
  user.save(); // Inherited save method executes
}
```

---

## 16. Chapter Summary

- Objects inherit properties and methods through **Prototypes**.
- **`__proto__`** is the active instance link. **`prototype`** is the constructor's blueprint.
- The **Prototype Chain** lookup terminates at `Object.prototype` (`null`).
- Assigning methods to prototypes saves memory by sharing a single copy.

---

## 17. Quiz

1. What is the prototype of `Object.prototype`?
2. Which function creates objects directly linked to a prototype without a constructor?
3. What happens when you write to a prototype property from an instance?

---

## 18. Next Chapter Preview

Now that we understand prototypal linkage, we can explore how modern JavaScript wraps this system in object-oriented structures. In the next chapter, we will study **Classes & Inheritance**, looking at constructor compilation, class extensions, super calls, and private properties.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Classes se pehle inheritance implement karna manual aur confusing tha — prototype chain ka concept hidden tha.
- **Concept**: Har object ka ek [[Prototype]] hota hai — property lookup chain se upar jata hai jab tak 
ull na mile.
- **Key Pattern**: Object.create(proto) se naya object banao jo proto ko prototype ke taur pe use kare.
- **Common Mistake**: __proto__ directly modify karna — performance hit deta hai; Object.create() ya Object.setPrototypeOf() prefer karo.
## 19. Completion Checklist

- [ ] I can describe the prototype inheritance lookup process.
- [ ] I know the difference between `__proto__` and `prototype`.
- [ ] I understand how prototype methods optimize memory allocations.
- [ ] I can inspect prototype chains in the browser console.
