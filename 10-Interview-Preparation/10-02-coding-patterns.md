# Coding Patterns

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of arrays, objects, recursion, and Big-O notation
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a contractor inspecting a long row of houses:

- **Brute Force is like walking back and forth repeatedly**: To find which pair of houses has a combined distance of exactly 100 meters from a center point, you walk from House 1 to House 2, then walk back to House 1, then walk to House 3. You walk millions of unnecessary steps ($O(N^2)$ complexity).
- **Two Pointers is like placing two inspectors at opposite ends of the street**: Inspector A starts at the left end. Inspector B starts at the right end. If their combined distance is too small, Inspector A walks forward. If their combined distance is too large, Inspector B walks backward. They meet in the middle, solving the search in a single pass ($O(N)$ linear complexity).
- **Sliding Window is like rolling a camera frame down the street**: To find the brightest section of 3 consecutive streetlights, you do not count all 3 lights, walk forward 1 step, and recount all 3 lights. You roll the frame forward. You subtract the light falling out of the back of the frame, and add the new light entering the front.

In coding interviews, these algorithmic patterns optimize processing times.

---

## 2. Problem

In technical coding interviews, solving problems using nested loops (brute force) is common but inefficient.

If you write algorithms that scale with $O(N^2)$ time complexity:
- Interviewers will reject your solution, even if the code returns correct results.
- Your code will crash under large input arrays or long strings.

---

## 3. Solution

We master **Coding Patterns** commonly tested in JavaScript interviews:
1. **Two Pointers**: Moving index pointers from opposite ends (or different speeds) to optimize searches in sorted lists.
2. **Sliding Window**: Maintaining a running contiguous subarray to solve range challenges in a single pass.
3. **Recursive DFS**: Traversing nested trees or structures using call-stack recursion.
4. **Queue-based BFS**: Traversing levels using array queues.

---

## 4. Definition

- **Two Pointers Pattern**: An algorithmic pattern where two pointer indices are used to iterate through a data structure, typically moving towards each other.
- **Sliding Window Pattern**: A pattern where a window is defined over an array or string, and is shifted or resized to process contiguous segments.
- **Depth-First Search (DFS)**: An algorithm for traversing tree or graph structures, exploring as deep as possible along each branch before backtracking.
- **Breadth-First Search (BFS)**: An algorithm for traversing trees or graphs, exploring all nodes at the current depth level before moving deeper.

---

## 5. Visualization

### Two-Pointers Target Sum Search

Find if a pair in a sorted array sums to **17**:

```
   Array: [ 2,  5,  8, 11, 15 ]
            ^               ^
            |               |
         [Left]          [Right]
         (Val: 2)        (Val: 15)  --> Sum: 2 + 15 = 17 (Target Match!)
```

If the sum was less than target, we would increment `Left`. If greater, we would decrement `Right`. We resolve the search in $O(N)$ time instead of nested loop $O(N^2)$ checks.

---

## 6. Internal Working

How V8 manages pointer and recursion memory:

1. **Array Index Lookups**: Standard pointers (`let left = 0`) are simple integer numbers. Checking values at index coordinates `arr[left]` is compiled by V8 into a direct memory offset lookup in Heap RAM, which runs in $O(1)$ constant time.
2. **Recursion Stack Limit**: When performing Depth-First Search recursively, V8 pushes a new stack frame onto the Call Stack for every nested call. If the tree depth is too deep (typically exceeding ~10,000 frames), V8 throws a `RangeError: Maximum call stack size exceeded`. For deep graphs, use iterative stack alternatives.

---

## 7. Code Examples

### 1. Two Pointers Pattern: Two Sum Sorted
Find two numbers in a sorted array that sum to a target value.

```javascript
// Time Complexity: O(N) | Space Complexity: O(1)
function findTargetPair(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];
    
    if (sum === target) {
      return [arr[left], arr[right]];
    } else if (sum < target) {
      left++; // Increase sum by moving left pointer right
    } else {
      right--; // Decrease sum by moving right pointer left
    }
  }
  return null;
}

console.log(findTargetPair([2, 5, 8, 11, 15], 17)); // Output: [2, 15]
```

### 2. Sliding Window Pattern: Max Subarray Sum
Find the maximum sum of any contiguous subarray of size `K`.

```javascript
// Time Complexity: O(N) | Space Complexity: O(1)
function maxSubarraySum(arr, k) {
  if (arr.length < k) return 0;

  let maxSum = 0;
  let windowSum = 0;

  // 1. Calculate sum of the first window
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }
  maxSum = windowSum;

  // 2. Slide the window across the array
  for (let i = k; i < arr.length; i++) {
    // Subtract element leaving window, add element entering window
    windowSum = windowSum - arr[i - k] + arr[i];
    maxSum = Math.max(maxSum, windowSum);
  }

  return maxSum;
}

console.log(maxSubarraySum([2, 1, 5, 1, 3, 2], 3)); // Output: 9 (contiguous subarray: [5, 1, 3])
```

### 3. Recursive DFS Pattern: Object Flattener
Flatten a deeply nested object structure into a single level object.

```javascript
// Time Complexity: O(N) where N is total nested properties
function flattenObject(obj, prefix = "") {
  let result = {};

  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Recursive Call (DFS)
        Object.assign(result, flattenObject(value, propName));
      } else {
        result[propName] = value;
      }
    }
  }

  return result;
}

const user = { name: "Zara", address: { city: "Delhi", geo: { lat: 28.6 } } };
console.log(flattenObject(user));
// Output: { name: 'Zara', 'address.city': 'Delhi', 'address.geo.lat': 28.6 }
```

---

## 8. Dry Run

Let's dry run the Sliding Window algorithm on `arr = [1, 3, 2, 6]`, `k = 2`:

- **First Window (`i = 0` to `1`)**:
  - `windowSum` = `1 + 3 = 4`.
  - `maxSum` = `4`.
- **Slide to index `2` (`arr[2] = 2`)**:
  - `i - k` = `2 - 2 = 0` (subtract element at index 0: `1`).
  - `windowSum` = `4 - 1 + 2 = 5`.
  - `maxSum` = `Math.max(4, 5) = 5`.
- **Slide to index `3` (`arr[3] = 6`)**:
  - `i - k` = `3 - 2 = 1` (subtract element at index 1: `3`).
  - `windowSum` = `5 - 3 + 6 = 8`.
  - `maxSum` = `Math.max(5, 8) = 8`.
- **Final Result**: `8`.

---

## 9. Common Mistakes

- **Mistake 1: Not sorting the array before using the Two Pointers target sum search.**
    The Two Pointers Sum algorithm relies on sorted data. If the array is unsorted, incrementing/decrementing pointers based on value comparison will skip matches.
- **Mistake 2: Missing boundary checks on sliding window parameters.**
    If the subarray window size `k` is larger than the input array length, the code will throw index errors or return `NaN` values.

---

## 10. Debugging

### Tracing Recursion with Console Trace
When debugging a recursive DFS helper:
1. Add a `console.trace()` statement at the start of your recursive function.
2. Run the code:
    - This will print the active stack frame list.
    - Inspect the list to verify the depth of recursion and trace the arguments passed to previous execution frames.

---

## 11. Real World Usage

- **Search Autocomplete Highlighting**: Using Two-pointer string comparisons to highlight matching substrings in autocomplete dropdown list elements.
- **API Rate Limiter (Sliding Window)**: Web servers track API hit rates by shifting a time window (e.g. 60 seconds) to calculate request limits dynamically.

---

## 12. Interview Preparation

### Question: Explain the sliding window pattern and how it improves algorithm performance
- **Wrong Answer**: It opens a new browser window to scroll elements.
- **Good Answer**: The sliding window pattern is used to perform operations on a contiguous block of elements in an array or string. Instead of recalculating the entire block from scratch for every step (which results in an inefficient $O(N \cdot K)$ nested loop), we maintain a running sum or state. When moving the window, we subtract the element leaving the window and add the element entering the window, reducing the time complexity to $O(N)$ linear time.

---

## 13. Practice

### Exercises
1. **Easy**: Write a Two Pointers function that reverses an array of characters in-place.
2. **Medium**: Write a Sliding Window function that finds the length of the longest substring without repeating characters.
3. **Hard**: Write a recursive DFS function that clones a deeply nested object containing functions, arrays, and Date objects.

---

## 14. Mini Assignment

Write a Two Pointers script that checks if a string is a palindrome (ignoring spaces and case).

---

## 15. Mini Project

Create a mock stock trading analyzer `StockProfiler`. Use the Sliding Window pattern to find the maximum profit you can make by buying and selling a stock within a contiguous $K$ day period, benchmarking the time execution against a brute-force nested loop implementation.

```javascript
// stock-sliding-window.js
const stockPrices = [10, 15, 8, 20, 25, 12, 30, 40, 5, 22];

function findMaxProfitWindow(prices, k) {
  if (prices.length < k) return 0;
  
  let currentProfit = 0;
  // Calculate first window (sum differences)
  for (let i = 0; i < k; i++) {
    currentProfit += prices[i];
  }
  
  let maxProfit = currentProfit;

  for (let i = k; i < prices.length; i++) {
    currentProfit = currentProfit - prices[i - k] + prices[i];
    maxProfit = Math.max(maxProfit, currentProfit);
  }

  return maxProfit;
}

console.log("Max Profit for 4-day window:", findMaxProfitWindow(stockPrices, 4)); // Output: 107
```

---

## 16. Chapter Summary

- **Two Pointers** optimizes searches in sorted lists from both ends in **$O(N)$** time.
- **Sliding Window** tracks contiguous subarrays, avoiding redundant iterations.
- **Recursive DFS** traverses tree structures by exploring branches deep before backtracking.
- **BFS** traverses levels sequentially using queue lists.

---

## 17. Quiz

1. What is the time complexity of the Two Pointers target sum search?
2. How does a sliding window avoid recalculating contiguous array segments?
3. What V8 error is thrown when recursion runs too deep?

---

## 18. Next Chapter Preview

In the next chapter, we will study **System Design Basics**. We will explore scaling frontends, component modularity, and structured state designs.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Coding interviews mein patterns nahi pata — same question alag form mein aane pe solve nahi ho paata.
- **Concept**: Common patterns: sliding window, two pointers, frequency map, recursion with memoization — ek baar samjho, hazaron problems solve hote hain.
- **Key Pattern**: Frequency map: const freq = {}; for(const c of str) freq[c] = (freq[c] || 0) + 1;
- **Common Mistake**: Pattern dhundne se pehle brute force sochna — interviewer prefer karta hai ki pattern identity pehle explain karo.
## 19. Completion Checklist

- [ ] I can write target search algorithms using the Two Pointers pattern.
- [ ] I understand how to write Sliding Window algorithms.
- [ ] I can implement recursive object flattening (DFS).
- [ ] I know how to check call stack recursion depths in the debugger.
