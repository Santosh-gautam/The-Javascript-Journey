# Array By-Copy Methods — `toReversed`, `toSorted`, `toSpliced`, `with`

- **Difficulty Level**: Beginner to Intermediate
- **Estimated Reading Time**: 14 minutes
- **Prerequisites**: Understanding of Arrays, Mutability vs. Immutability, Spread Operator
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are an editor at a newspaper. Your boss hands you the master copy of tomorrow's front page. You need to rearrange the headlines for a test layout.

You have two choices:

1. Scribble directly on the master copy. Now the original is ruined, and you have to reprint it.
2. Photocopy it first, then rearrange the headlines on the copy. The master is safe.

Old JavaScript array methods like `sort()`, `reverse()`, and `splice()` are option 1 — they mutate the original array. The new by-copy methods — `toSorted()`, `toReversed()`, `toSpliced()`, and `with()` — are option 2. They always return a new, modified copy. The original is untouched.

---

## 2. Problem

JavaScript's original array transformation methods mutate the array in-place:

```javascript
const items = [3, 1, 2];
const sorted = items.sort(); // Mutates items!
console.log(items);  // [1, 2, 3] — original destroyed
console.log(sorted); // [1, 2, 3] — same reference
```

This causes subtle bugs in:
- React state (mutating state directly causes missed re-renders).
- Functional programming pipelines where data should be immutable.
- Code that passes arrays to multiple callers — mutating it breaks other consumers.

The workaround was always `[...arr].sort()` — copy first, then mutate — but this was easy to forget.

---

## 3. Solution

ECMAScript 2023 introduces four new **by-copy** Array methods:

| Mutating Original | New By-Copy Version |
|:--|:--|
| `arr.reverse()` | `arr.toReversed()` |
| `arr.sort(fn)` | `arr.toSorted(fn)` |
| `arr.splice(i, n, ...items)` | `arr.toSpliced(i, n, ...items)` |
| `arr[i] = val` (index assignment) | `arr.with(i, val)` |

These methods leave the original array unchanged and return a new array with the transformation applied.

---

## 4. Definition

- **`toReversed()`**: Returns a new array with elements in reversed order. Does not modify the original.
- **`toSorted(compareFn?)`**: Returns a new array sorted according to the optional compare function. Does not modify the original.
- **`toSpliced(start, deleteCount, ...items)`**: Returns a new array with elements removed and/or inserted at `start`. Does not modify the original.
- **`with(index, value)`**: Returns a new array where the element at `index` is replaced with `value`. Supports negative indices. Does not modify the original.

All four methods are also available on **TypedArrays** (e.g., `Int32Array`, `Float64Array`).

---

## 5. Visualization

### Mutating vs. By-Copy

```
Original Array:   [3, 1, 4, 1, 5]
                   ┌───────────────┐
                   │  [3,1,4,1,5]  │  ← Original
                   └───────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   .sort()          .toSorted()      .reverse()
   MUTATES          Returns NEW      MUTATES
   original         [1,1,3,4,5]      original
   [1,1,3,4,5]      Original: ✓      [5,1,4,1,3]
   Original: ✗      unchanged!       Original: ✗
```

---

## 6. Internal Working

These methods are implemented as:

1. **`toReversed()`**: Creates a copy of the array (equivalent to `[...this]`), then applies the internal `Array.prototype.reverse` algorithm on the copy, and returns it.
2. **`toSorted(fn)`**: Creates a copy, runs the internal TimSort algorithm on it with the comparator, returns the sorted copy.
3. **`toSpliced(start, deleteCount, ...items)`**: Creates a new array by concatenating the elements before `start`, the new `items`, and the elements after `start + deleteCount`. The original is never touched.
4. **`with(index, value)`**: Creates a copy where only index `index` is replaced with `value`. Negative index `-1` is treated as `length - 1`.

The engine optimizes these using the same internal array allocation strategies as spread syntax — they are not implemented naively.

---

## 7. Code Examples

### Bad Practice: Mutating the original array

```javascript
// Bad: sort() mutates the original — React state bug waiting to happen
function processScores(scores) {
  const sorted = scores.sort((a, b) => b - a); // Mutates scores!
  return sorted[0]; // "highest" score
}

const scores = [70, 95, 82];
processScores(scores);
console.log(scores); // ❌ [95, 82, 70] — original is now sorted!
```

### Good Practice: Manual copy before mutating

```javascript
// Good: Copy first, then sort
function processScores(scores) {
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted[0];
}

const scores = [70, 95, 82];
processScores(scores);
console.log(scores); // ✓ [70, 95, 82] — original preserved
```

### Best Practice: Use by-copy methods

```javascript
// Best Practice: Intent is clear — no accidental mutation possible
const scores = [70, 95, 82];

// toSorted: Returns new sorted array
const topScores = scores.toSorted((a, b) => b - a);
console.log(scores);     // [70, 95, 82] — untouched ✓
console.log(topScores);  // [95, 82, 70] ✓

// toReversed: Returns new reversed array
const reversed = scores.toReversed();
console.log(scores);     // [70, 95, 82] — untouched ✓
console.log(reversed);   // [82, 95, 70] ✓

// toSpliced: Remove 1 element at index 1, insert 88
const updated = scores.toSpliced(1, 1, 88);
console.log(scores);     // [70, 95, 82] — untouched ✓
console.log(updated);    // [70, 88, 82] ✓

// with: Replace element at index 2 with 100
const corrected = scores.with(2, 100);
console.log(scores);     // [70, 95, 82] — untouched ✓
console.log(corrected);  // [70, 95, 100] ✓

// Chaining (works because each returns a new array)
const result = scores
  .toSorted((a, b) => a - b)
  .toReversed()
  .with(0, 99);
console.log(result); // [99, 82, 70] ✓
```

---

## 8. Dry Run

```javascript
const arr = [1, 2, 3, 4, 5];
const result = arr.toSpliced(1, 2, 99, 100);
```

### Step-by-Step State
- **Input**: `arr = [1, 2, 3, 4, 5]`, `start = 1`, `deleteCount = 2`, items to insert = `[99, 100]`.
- **Slice before `start`**: `[1]` (index 0).
- **Insert new items**: `[99, 100]`.
- **Slice after `start + deleteCount`**: elements at index 3 and 4 = `[4, 5]`.
- **Concat**: `[1] + [99, 100] + [4, 5]` = `[1, 99, 100, 4, 5]`.
- **`arr` unchanged**: Still `[1, 2, 3, 4, 5]`.
- **`result`**: `[1, 99, 100, 4, 5]`.

---

## 9. Common Mistakes

- **Mistake 1: Expecting `with()` to be a dictionary/object setter.**
  `Array.prototype.with(index, value)` is array-only. Do not confuse it with `Object.with()` — that does not exist.
- **Mistake 2: Forgetting that `toSorted()` without a comparator sorts lexicographically.**
  `[10, 9, 100].toSorted()` returns `[10, 100, 9]` — same default behavior as `sort()`. Always pass a numeric comparator for numbers.
- **Mistake 3: Using `with(-1, val)` expecting index 0 on an empty array.**
  On an empty array, `with(-1, val)` throws a `RangeError` because there is no valid negative index.

---

## 10. Debugging

### Verify immutability in Chrome DevTools

1. Open Console.
2. Run: `const a = [3,1,2]; const b = a.toSorted(); console.log(a === b);`
3. Output: `false` — confirms `b` is a new array object.
4. Run: `console.log(a)` — confirms original is `[3, 1, 2]`.

---

## 11. Real World Usage

- **React state updates**: `setState(prev => prev.toSorted(...))` — safe immutable sort without `[...prev].sort()` boilerplate.
- **Redux reducers**: Pure reducers require returning new state objects. By-copy methods make array transformations inherently pure.
- **Data pipeline chaining**: `data.toSorted(byDate).toReversed().with(0, pinnedItem)` — readable, mutation-free pipeline.

---

## 12. Interview Preparation

### Question: What is the difference between `sort()` and `toSorted()`?
- **Wrong Answer**: `toSorted()` is just an alias for sort.
- **Good Answer**: `sort()` sorts the array **in place** (mutates the original) and returns the same array reference. `toSorted()` returns a **new array** with the elements sorted, leaving the original unchanged. This makes `toSorted()` safe for functional patterns, React state, and Redux reducers where mutation is forbidden.

### Question: How would you use `with()` to update a nested value in an array?
- `with()` operates on the top-level array. For nested objects, combine `with()` with object spread: `arr.with(i, { ...arr[i], key: newVal })`.

---

## 13. Practice

1. **Easy**: Given `const nums = [5, 3, 8, 1]`, produce a sorted copy in ascending order without mutating `nums`.
2. **Medium**: Write a function `removeAt(arr, index)` that returns a new array with the element at `index` removed, without mutation.
3. **Hard**: Implement a pure `updateItem(arr, index, updateFn)` that returns a new array where `arr[index]` is replaced with `updateFn(arr[index])`, using `with()`.

---

## 14. Mini Assignment

Write a `ProductList` manager that stores products as an array. Implement three pure methods: `sortByPrice()`, `removeById(id)`, and `updatePrice(id, newPrice)` — each returning a new array, never mutating the original. Use `toSorted`, `toSpliced`, and `with`.

---

## 15. Mini Project

Build a **Leaderboard Manager**:

```javascript
// leaderboard.js
class Leaderboard {
  #entries;
  
  constructor(entries) {
    this.#entries = entries; // [{ name, score }]
  }

  // Returns new Leaderboard sorted by score (highest first)
  sorted() {
    return new Leaderboard(
      this.#entries.toSorted((a, b) => b.score - a.score)
    );
  }

  // Returns new Leaderboard with updated score for a player
  updateScore(name, newScore) {
    const idx = this.#entries.findIndex(e => e.name === name);
    if (idx === -1) return this;
    return new Leaderboard(this.#entries.with(idx, { name, score: newScore }));
  }

  display() {
    this.#entries.forEach((e, i) => console.log(`${i + 1}. ${e.name}: ${e.score}`));
  }
}

const lb = new Leaderboard([
  { name: "Alice", score: 80 },
  { name: "Bob", score: 95 },
  { name: "Charlie", score: 70 }
]);

lb.sorted().display();
// 1. Bob: 95  2. Alice: 80  3. Charlie: 70
```

---

## 16. Chapter Summary

- `toReversed()`, `toSorted()`, `toSpliced()`, and `with()` are ES2023 by-copy array methods.
- They return **new arrays** — originals are never mutated.
- They replace the `[...arr].mutatingMethod()` pattern with clearer, intent-explicit alternatives.
- All four are chainable and available on TypedArrays.
- `toSorted()` without a comparator still defaults to lexicographic order — always pass a numeric comparator for number arrays.

---

## 17. Quiz

1. What does `arr.with(2, 99)` return?
2. What does `[...[1,2,3]].sort()` return, and how does `toSorted()` differ?
3. How does `toSpliced(1, 0, "X")` differ from `toSpliced(1, 1, "X")`?

---

## 18. Next Chapter Preview

In the next chapter, we explore **Set Operations** — new ES2025 methods on `Set` that implement mathematical set theory (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`) directly on JavaScript's built-in `Set` type.

---

## 19. 🇮🇳 Hinglish Summary

- **Problem**: `sort()` aur `reverse()` original array ko mutate kar dete the — React aur functional code mein bug hote the.
- **Concept**: `toSorted()`, `toReversed()`, `toSpliced()`, `with()` — ye sab naya copy return karte hain, original safe rehta hai.
- **Key Pattern**: `arr.toSorted((a, b) => b - a)` — descending sort bina mutation ke.
- **Common Mistake**: `toSorted()` bina comparator ke numbers ko lexicographically sort karta hai — `[10,9].toSorted()` dega `[10,9]` nahi, `[10,9]`... actually numbers ke liye comparator dena padega.
- **Chaining**: Ye sab chain ho sakte hain kyunki har method naya array deta hai.

---

## 20. Completion Checklist

- [ ] I can explain the difference between `sort()` and `toSorted()`.
- [ ] I can use all four by-copy methods: `toReversed`, `toSorted`, `toSpliced`, `with`.
- [ ] I understand why these methods are important for React state and functional patterns.
- [ ] I can chain by-copy methods in a data pipeline.
