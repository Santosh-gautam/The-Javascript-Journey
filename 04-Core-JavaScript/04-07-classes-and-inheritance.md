# Classes & Inheritance

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding prototypes and the prototype chain
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a builder who constructs houses.

To build standard houses, you use a blueprint document. The blueprint specifies the number of rooms, the electrical layout, and has instructions on how to set up the foundation.

If you want to build a "Smart House", you don't throw away the original blueprint and design a new one from scratch. Instead, you create a new blueprint that says: *"Inherit all rules from the standard blueprint, but add instructions for solar panels and smart locks"* (extends).

When you build the Smart House, you first call the standard construction crew to build the basic structure (super call), and then your specialized team installs the smart devices.

In JavaScript, **Classes** are these blueprints. The standard blueprint is the base class, the Smart House is the subclass, and `super` is the invocation of the base constructor to lay the foundation first.

---

## 2. Problem

Prototypal inheritance in JavaScript is extremely flexible, but writing it manually is verbose:
- Linking parent prototype properties manually: `Sub.prototype = Object.create(Parent.prototype)`.
- Re-binding constructor properties manually.
- Calling parent functions inside subclasses using `Parent.call(this)`.

This syntax was confusing for developers coming from class-based languages (like Java, C++, or Python).

---

## 3. Solution

ES6 (2015) introduced **Classes** and the `class` keyword.

This provides a clean, familiar syntax for object-oriented programming. It encapsulates constructors, methods, static actions, and subclass inheritance in a single cohesive block.

Under the hood, classes do not change JavaScript's object model—they compile directly into prototype chains.

---

## 4. Definition

- **Class**: A blueprint template for creating objects, encapsulating data with code to work on that data.
- **Inheritance**: The mechanism that allows a class (subclass) to inherit properties and methods from another class (superclass).
- **`super`**: A keyword reference used to invoke the constructor or methods of the parent class.
- **Private Fields**: Properties declared with a `#` prefix that are locked inside the class block and cannot be accessed externally.

---

## 5. Visualization

### Subclass Instance Prototype Map

```
                     +---------------------------------------+
                     |  Instance: mySmartDevice              |
                     |  - brand: "LG"                        |
                     |  - smartFeature: "VoiceControl"       |
                     +---------------------------------------+
                                         |
                                         v [[Prototype]]
                     +---------------------------------------+
                     |  SmartDevice.prototype                |
                     |  - runSmartSync() [Method]            |
                     +---------------------------------------+
                                         |
                                         v [[Prototype]]
                     +---------------------------------------+
                     |  Device.prototype                     |
                     |  - turnOn() [Method]                  |
                     +---------------------------------------+
                                         |
                                         v [[Prototype]]
                     +---------------------------------------+
                     |  Object.prototype                     |
                     +---------------------------------------+
```

---

## 6. Internal Working

How V8 compiles and executes `class` constructs:

1. **Syntactic Sugar Compilation**: When V8 parses `class User {}`, it translates it into a standard Constructor Function.
2. **Method allocation**: Methods defined inside the class block are automatically placed on `User.prototype`. They are also marked as non-enumerable (meaning they don't show up in `for-in` loops, keeping instances clean).
3. **Inheritance execution**: When a subclass extends a parent (`class Sub extends Parent`):
    - V8 sets the prototype of the subclass prototype to the parent prototype: `Object.setPrototypeOf(Sub.prototype, Parent.prototype)`.
    - V8 also sets the prototype of the subclass constructor to the parent constructor, which allows static inheritance to work.
4. **Constructor allocation**: When calling `new Sub()`, V8 requires that the subclass constructor calls `super()` *before* accessing `this`. This ensures the parent constructor finishes setting up instance properties before the subclass modifies them.

---

## 7. Code Examples

### Bad Practice: Manual Prototypal Inheritance Setup
Manually linking constructors is prone to typos and is difficult to parse visually.

```javascript
function Vehicle(wheels) {
  this.wheels = wheels;
}
Vehicle.prototype.roll = function() {
  return "Rolling on " + this.wheels + " wheels.";
};

function Cycle(brand) {
  Vehicle.call(this, 2); // manual parent call
  this.brand = brand;
}
// Manual prototype link
Cycle.prototype = Object.create(Vehicle.prototype);
// Manual constructor fix
Cycle.prototype.constructor = Cycle;
```

### Good Practice: Class Syntactic Layouts
Utilize clean class declarations to establish blueprints and handle prototype links automatically.

```javascript
class Vehicle {
  constructor(wheels) {
    this.wheels = wheels;
  }
  
  roll() {
    return `Rolling on ${this.wheels} wheels.`;
  }
}

class Cycle extends Vehicle {
  constructor(brand) {
    super(2); // Automatically links parent instance properties
    this.brand = brand;
  }
}

const bike = new Cycle("Trek");
console.log(bike.roll()); // Rolling on 2 wheels.
```

### Best Practice: Data Protection using Private Fields
Use `#` private class variables to prevent external code from mutating internal states.

```javascript
class BankAccount {
  #balance; // Declares a private field in memory

  constructor(owner, initialBalance) {
    this.owner = owner;
    this.#balance = initialBalance;
  }

  deposit(amount) {
    if (amount > 0) this.#balance += amount;
  }

  // Getter method
  get balance() {
    return `Account balance: $${this.#balance}`;
  }
}

const account = new BankAccount("Alice", 500);
account.deposit(200);
console.log(account.balance); // Account balance: $700
// console.log(account.#balance); // SyntaxError: Private field '#balance' must be declared in an enclosing class
```

---

## 8. Dry Run

Let's dry run subclass constructor execution steps:

```javascript
1: const myBike = new Cycle("Giant");
```

### Step-by-Step State
- **Calling `new Cycle("Giant")`**:
  - V8 executes the constructor of `Cycle`.
  - V8 detects that `Cycle` extends `Vehicle`. It blocks access to `this`.
- **Line 2 (inside Cycle constructor: calling `super(2)`)**:
  - V8 executes `Vehicle`'s constructor with parameter `2`.
  - Inside `Vehicle`'s constructor, `this` is initialized to a new blank object.
  - `this.wheels = 2` is assigned to the object.
  - The parent constructor returns.
- **Back in `Cycle`'s constructor**:
  - The returned object from `super()` is bound to `this` inside `Cycle`'s context.
  - `this.brand = "Giant"` is assigned.
  - The constructor returns the completed object reference.
- **Verification**:
  - `myBike` holds the reference pointer. Its prototype links to `Cycle.prototype`, which links to `Vehicle.prototype`.

---

## 9. Common Mistakes

- **Mistake 1: Accessing `this` before calling `super()`.**
    ```javascript
    class Sub extends Base {
      constructor() {
        this.name = "Sub"; // ReferenceError: Must call super constructor in derived class before accessing 'this'
        super();
      }
    }
    ```
- **Mistake 2: Forgetting the `new` operator.**
    Calling a class as a function `User()` without the `new` keyword throws a `TypeError: Class constructor User cannot be invoked without 'new'`.

---

## 10. Debugging

### Debugging Class Methods in the Call Stack
When tracing errors inside class inheritance chains:
1. Set a breakpoint inside a method in the derived class.
2. Launch execution.
3. When execution pauses, examine the **Call Stack**:
    - You will see the current method name listed as `Cycle.roll` or similar.
    - Check the **Scope Pane** -> **Local**:
      - Inspect the `this` pointer. You will see its private fields (prefixed with `#`) and standard properties listed, allowing you to trace if super variables were successfully initialized.

---

## 11. Real World Usage

- **ORM Frameworks**: Database abstraction engines (like Sequelize or TypeORM) represent tables as classes that extend a base `Model` class, inheriting core query methods.
- **UI Architecture**: Angular and NestJS use class decorators to configure modules, controllers, and services.

---

## 12. Interview Preparation

### Question: Are classes in JavaScript equivalent to classes in languages like Java or C++?
- **Wrong Answer**: Yes, they compile directly to compiler structs and support classical OOP.
- **Good Answer**: No. JavaScript classes are syntactic sugar over prototypal inheritance. In Java, classes are static templates from which instances are duplicated. In JavaScript, a class is a constructor function, and instances are linked to a shared prototype object via their prototype reference chain.

---

## 13. Practice

### Exercises
1. **Easy**: Create a class `Person` with a getter for their full name.
2. **Medium**: Write a subclass `Manager` that extends `Employee`, adding a department property and invoking `super()`.
3. **Hard**: Implement static helper functions on a class and show that they cannot be called from instances.

---

## 14. Mini Assignment

Write a class containing a private balance field, getter/setter, and throw errors if the user tries to set the balance to a negative value.

---

## 15. Mini Project

Create a system class hierarchy representing a shopping system (`CartItem` and `DiscountedItem`) that calculates dynamic pricing.

```javascript
// ecommerce-classes.js
class CartItem {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }

  getTotalPrice() {
    return this.price;
  }
}

class DiscountedItem extends CartItem {
  constructor(name, price, discountRate) {
    super(name, price);
    this.discountRate = discountRate; // e.g. 0.15 for 15%
  }

  // Overriding parent method
  getTotalPrice() {
    const originalPrice = super.getTotalPrice();
    return originalPrice * (1 - this.discountRate);
  }
}

const item = new DiscountedItem("Headphones", 100, 0.20);
console.log("Calculated Discount Price:", item.getTotalPrice()); // 80
```

---

## 16. Chapter Summary

- Classes provide a clean, unified syntax for **Prototypal Inheritance**.
- **`extends`** manages prototype linking. **`super()`** runs the parent constructor.
- Properties prefixed with **`#`** are private and sealed inside the class.
- Classes are constructor functions under the hood and require the **`new`** keyword.

---

## 17. Quiz

1. What error is thrown if you invoke a class without the `new` keyword?
2. Can static methods access instance properties using `this`?
3. What happens if you omit the `constructor` inside a class declaration?

---

## 18. Next Chapter Preview

In the next chapter, we will learn about **Modules**. We will explore how JavaScript divides code across multiple files, comparing ES Modules (ESM) and CommonJS (CJS) loading mechanisms under the hood.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Prototype-based inheritance ka syntax verbose aur confusing tha — code maintain karna mushkil tha.
- **Concept**: ES6 class syntax Prototype ke upar ek sugar coating hai — internally prototype chain hi use hoti hai.
- **Key Pattern**: class Dog extends Animal { constructor() { super(); } } — super() parent constructor call karna zaroori hai.
- **Common Mistake**: Classes ko "real classes" samajhna (Java jaisi) — JavaScript mein ye sirf prototype chain ka cleaner syntax hai.
## 19. Completion Checklist

- [ ] I can write standard classes and subclass extensions.
- [ ] I understand what `super()` does and when it must be called.
- [ ] I know how to declare private class variables.
- [ ] I can trace class method execution frames in the debugger.
