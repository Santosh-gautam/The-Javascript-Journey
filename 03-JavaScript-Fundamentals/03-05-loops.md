# Loops & Iteration

- **Difficulty Level**: Beginner
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding control flow and variables
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a postal clerk processing mail:

- **A `for` loop is like stamping 100 letters**: You have a pile of exactly 100 envelopes. You set a counter to 0, stamp the envelope, increment the counter by 1, and repeat until the counter reads 100. You know the exact start, end, and steps before you begin.
- **A `while` loop is like stamping until your ink runs out**: You don't know how many letters you can stamp before the ink dries. Before stamping each envelope, you check the ink pad. If there is ink, you stamp. If it is dry, you stop.
- **A `do-while` loop is like stamping the first letter first**: You stamp one envelope *before* checking the ink level. Even if the ink is dry, you will have stamped at least one letter.

In JavaScript, loops are these stamping protocols.

---

## 2. Problem

If you need to process 1,000 user profiles or print a list of items on a dashboard, writing the code block manually 1,000 times:

- Bloats file size.
- Is impossible to maintain.
- Cannot handle dynamic data sizes (e.g., if one user has 5 items and another has 50 items).

---

## 3. Solution

We use iteration loops to run a block of code repeatedly. The loop checks a termination condition at each step, running the code block as long as the condition remains truthy, and exits immediately when it becomes falsy.

---

## 4. Definition

- **Iteration**: The repetition of a process or a code block.
- **On-Stack Replacement (OSR)**: A JIT compiler technique that replaces a running interpreter loop with an optimized version *while* the loop is executing.
- **Label Statement**: An identifier prefixed to a loop that allows `break` or `continue` statement checks to target outer nested levels.

---

## 5. Visualization

### Iteration Loops Flowchart

#### Pre-Test Loop (For / While)

```
          [ Check Condition ]
                   |
         +---------+---------+
         | True              | False
         v                   v
  [ Run Code Block ]   [ Exit Loop ]
         |
         +-------------------+
```

#### Post-Test Loop (Do-While)

```
  [ Run Code Block ]
         |
         v
  [ Check Condition ]
         |
         +---------+---------+
         | True              | False
         v                   v
  [ Repeat Block ]     [ Exit Loop ]
```

---

## 6. Internal Working

V8 processes loops using optimizations:

1. **Back-Edges**: When compiling loops into bytecode, V8 creates a backward jump instructions (a "back-edge") pointing back to the condition check.
2. **On-Stack Replacement (OSR)**: If a loop runs a massive number of times (e.g., 100,000 iterations), V8 doesn't wait for the containing function to finish before optimizing.
    - The engine tracks back-edge counts.
    - If the counter passes a threshold, V8 compiles the loop body into optimized machine code on a background thread.
    - While the loop is still running, V8 replaces the active stack frame with the optimized version dynamically.
3. **Loop Unrolling**: For small, fixed loops (e.g., looping 3 times), the compiler might copy the loop body 3 times inside the machine code to avoid jump check overhead.

---

## 7. Code Examples

### Bad Practice: Using `for-in` to Loop over Arrays

`for-in` is designed to inspect object properties. Using it on arrays is slow because it iterates index keys as strings and traverses the prototype chain.

```javascript
const scores = [88, 92, 95];

// Bad: index will be string keys "0", "1", "2"
for (const index in scores) {
  console.log(index + 1); // Output: "01", "11", "21" (Coercion bug!)
}
```

### Good Practice: Using standard Index Loops or `for-of`

Use `for-of` for arrays. It iterates values directly.

```javascript
const scores = [88, 92, 95];

// Good: Iterating indices cleanly
for (let i = 0; i < scores.length; i++) {
  console.log(scores[i] + 1); // Output: 89, 93, 96
}

// Best Practice: Direct clean value loop
for (const score of scores) {
  console.log(score + 1); // Output: 89, 93, 96
}
```

### Best Practice: Breaking out of Nested Loops with Labels

Avoid flag variable tracks by using nested loop labels.

```javascript
outerLoop: for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    if (r === 1 && c === 1) {
      console.log(`Found target at [${r}, ${c}]. Terminating all loops.`);
      break outerLoop; // Exits both loops instantly
    }
  }
}
```

---

## 8. Dry Run

Let's dry run a standard `for` loop indexing:

```javascript
1: const data = [10, 20];
2: for (let i = 0; i < data.length; i++) {
3:   console.log(data[i]);
4: }
```

### Step-by-Step State

- **Line 1**:
  - `data` array allocated in Heap, address pointer stored in Stack.
- **Line 2 (Loop Initializer)**:
  - Loop index variable `i` is allocated in a new loop Lexical Environment and set to `0`.
- **Condition Check**:
  - `i < data.length` -> `0 < 2` evaluates to `true`.
- **Body Execution (Line 3)**:
  - Resolves `data[0]` -> prints `10`.
- **Increment (Line 2)**:
  - Runs `i++` -> `i` is updated to `1` in the loop scope.
- **Condition Check**:
  - `1 < 2` evaluates to `true`.
- **Body Execution (Line 3)**:
  - Resolves `data[1]` -> prints `20`.
- **Increment (Line 2)**:
  - Runs `i++` -> `i` is updated to `2`.
- **Condition Check**:
  - `2 < 2` evaluates to `false`.
- **Exit**:
  - Loop Lexical Environment is popped. Execution continues to downstream lines.

---

## 9. Common Mistakes

- **Mistake 1: Off-by-One Array Bounds.**

    ```javascript
    const arr = [10, 20];
    for (let i = 0; i <= arr.length; i++) {
      console.log(arr[i]); // Prints: 10, 20, undefined (index 2 is empty!)
    }
    ```
- **Mistake 2: Infinite loop condition failures.**

    ```javascript
    let i = 0;
    while (i < 5) {
      console.log(i); // Loop counter never increments, freezes engine!
    }
    ```

---

## 10. Debugging

### Loop Inspection with Conditional Breakpoints

Hitting breakpoints inside loops that run thousands of times is frustrating because you have to click resume repeatedly. Use conditional breakpoints:

1. Write a loop:

    ```javascript
    for (let i = 0; i < 1000; i++) {
      let calc = i * 2;
      console.log(calc);
    }
    ```

2. Set a breakpoint in DevTools/VS Code on the `let calc` line.
3. Right-click the breakpoint and select **Edit Breakpoint** / **Condition**.
4. Type the expression: `i === 999`
5. Run the debugger. The engine will skip the first 998 loops and pause only on the final loop iteration. You can now inspect values at that exact state.

---

## 11. Real World Usage

- **Rendering Lists**: Vanilla JS controllers iterate data payloads to append DOM cards.
- **Matrix Calculations**: Image processing libraries iterate 2D grids (rows/columns) using nested label loops to transform pixel coordinate filters.

---

## 12. Interview Preparation

### Question: What is the difference between `for-in` and `for-of` in JavaScript?
- **Wrong Answer**: They are identical syntax options.
- **Good Answer**: `for-in` iterates over all enumerable property keys of an object as strings, including inherited keys from its prototype chain. `for-of` iterates over iterable values defined by the object's `[Symbol.iterator]` property (like elements of an Array, characters of a String, or values in a Map/Set). Never use `for-in` to loop over arrays.

---

## 13. Practice

### Exercises

1. **Easy**: Write a loop that counts down from 10 to 1 and logs the numbers.
2. **Medium**: Write a function that uses a `while` loop to find the first number divisible by 7 and 9 starting from 1.
3. **Hard**: Predict the output when you iterate over an object that has an inherited prototype key using `for-in`. Write code to filter out inherited properties.

---

## 14. Mini Assignment

Refactor the following `while` loop into a standard `for` loop:

```javascript
let count = 0;
while (count < arr.length) {
  processItem(arr[count]);
  count++;
}
```

---

## 15. Mini Project

Create a matrix searching tool `searchGrid(matrix, target)` that accepts a 2D array and a target value. Use labeled loops to search elements and return coordinate pointers, exiting all iterations immediately upon match.

```javascript
// grid-search.js
function searchGrid(matrix, target) {
  let coords = null;

  // Labeled loop structure
  rowLoop: for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === target) {
        coords = { row: r, col: c };
        break rowLoop; // Breaks rowLoop immediately, skipping remaining columns and rows
      }
    }
  }

  return coords;
}

// Test matrix
const grid = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];

console.log(searchGrid(grid, 5)); // Output: { row: 1, col: 1 }
console.log(searchGrid(grid, 99)); // Output: null
```

---

## 16. Chapter Summary

- Use `for` when iteration counts are known. Use `while` for conditional states.
- `for-of` is designed for iterable values (arrays). `for-in` is for object keys.
- Use loop **labels** to break out of deep nested loop scopes directly.
- JIT compiler uses **On-Stack Replacement (OSR)** to optimize active loops.

---

## 17. Quiz

1. Does a `do-while` loop run if its initial check evaluates to falsy?
2. What is a compiler back-edge?
3. Why should you avoid modifying array elements while looping over them?

---

## 18. Next Chapter Preview

We have completed the **JavaScript Fundamentals** module. In the next phase of the curriculum, we move to **Core JavaScript**. We start Module 04 by exploring **Functions & Execution Context**, looking at how V8 creates stack frames, parses execution environments, and manages local parameter bindings.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Loops ek code block ko baar baar execute karte hain. JavaScript mein kaafi loop types hain: or (classic index loop), while (condition-based), or...of (iterables pe value-by-value), or...in (object keys pe), do...while (pehle execute, phir check). Sabse important distinction: **or...of arrays/iterables ke liye, or...in object keys ke liye** — inhe swap karna bugs deta hai.

### Andar kya hota hai (Internal Working)

V8 loops ko bytecode mein **back-edges** se compile karta hai — ek backward jump instruction jo loop condition check pe wapas jaata hai. Jab koi loop bahut zyada iterations karta hai (e.g., 100,000 times), V8 ka **On-Stack Replacement (OSR)** kick karta hai: background thread pe loop body optimize hota hai aur fir active execution ko dynamically optimized version se replace kiya jaata hai — bina loop ko restart kiye!

or...of under the hood **Iterator Protocol** use karta hai: object ka Symbol.iterator method call hota hai, ek iterator object milta hai, phir baar baar .next() call hota hai jab tak { done: true } na aaye. Arrays, Strings, Sets, Maps, Generators — sab Symbol.iterator implement karte hain.

or...in ek alag mechanism use karta hai — object ke **enumerable properties** ki list traverse karta hai, **prototype chain** bhi include karke. Isiliye arrays pe or...in dangerous hai.

### Code Example samjho

`javascript
const scores = [88, 92, 95];

// Bad: for...in on arrays
for (const index in scores) {
  console.log(index + 1); // "01", "11", "21" — string coercion bug!
}

// Good: for...of for arrays
for (const score of scores) {
  console.log(score + 1); // 89, 93, 96 — correct!
}
`

**Line by line:**
- or (const index in scores) — index string form mein aata hai ("0", "1", "2"). "0" + 1 → "01" (string concatenation!). Type coercion bug.
- or (const score of scores) — Symbol.iterator use karta hai, direct values milti hain: 88, 92, 95. 88 + 1 → 89. Correct.

### Sabse badi galti log karte hain

or...in se array iterate karna. Bahut zyada cases mein kaam karta hai lekin do problems hain: (1) index string mein milta hai, coercion bugs possible, (2) agar kisi ne Array.prototype pe custom property add ki ho, woh bhi iterate hogi — unexpected behavior. Hamesha arrays ke liye or...of ya classic or use karo.

### Yaad rakhne ki cheez

**or...of = values chahiye (arrays, strings, sets). or...in = object ke string keys chahiye.** Ye difference yaad rakhoge toh loop-related bugs almost zero ho jaayenge.

## 20. Completion Checklist

- [ ] I can explain the differences between `for`, `while`, and `do-while` loops.
- [ ] I understand why `for-in` should not be used on arrays.
- [ ] I can use loop labels to control nested iteration breakouts.
- [ ] I know how to set conditional breakpoints inside loops to inspect iteration states.
