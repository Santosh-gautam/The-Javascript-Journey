# Debounce & Throttle

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of closures, timers, and high-frequency DOM events
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a security guard standing at a building door:

- **Debounce is like holding the door open for a group of people**: A person approaches. You hold the door open. You say: *"I will wait 3 seconds before closing it."* If another person arrives 1 second later, you reset your timer and wait another 3 seconds. You keep resetting the timer as long as people keep arriving. You only close the door (execute the action) when there is a full 3-second gap with no new arrivals.
- **Throttle is like a rotating turnstile gate**: The turnstile only rotates once every 5 seconds. If a line of 100 people queue up, the gate lets the first person in immediately, but then locks. It ignores everyone else who pushes the gate for the next 5 seconds. Once the 5-second interval ends, it allows exactly one more person through, and locks again.

In JavaScript, these techniques rate-limit high-frequency events.

---

## 2. Problem

Web browser events (like `scroll`, `resize`, `mousemove`, and `keypress`) can trigger dozens of times per second.

If you bind heavy operations to these events (such as making a fetch request on every keypress or recalculating element layouts on every scroll pixel):
- The browser will trigger hundreds of reflows, causing severe UI lag.
- Servers can be flooded with redundant API requests, leading to rate-limiting or crashes.

---

## 3. Solution

We implement rate-limiting closures:
1. **Debounce**: Grouping multiple consecutive event triggers into a single execution after a period of inactivity.
2. **Throttle**: Limiting execution to a maximum of once per specified time interval.

---

## 4. Definition

- **Debounce**: A wrapper function that delays executing the target function until a specified amount of silent time has elapsed since the last call.
- **Throttle**: A wrapper function that ensures the target function is executed at most once within a specified time window.
- **High-Frequency Events**: Events that trigger repeatedly and rapidly during user interactions.

---

## 5. Visualization

### Debounce vs. Throttle Timeline

Let's assume user triggers events repeatedly at 100ms intervals over 500ms, with a delay/limit configuration of **200ms**:

```
   Timeline (ms):   0ms    100ms   200ms   300ms   400ms   500ms   600ms   700ms
   User Triggers:    *       *       *       *       *       *
  
   Debounce (200ms):                                                         [ EXECUTE ]
   (Resets timer on every trigger; executes 200ms after the last trigger)
  
   Throttle (200ms): [ EXECUTE ]           [ EXECUTE ]             [ EXECUTE ]
   (Executes immediately, locks for 200ms, then executes again on next trigger)
```

---

## 6. Internal Working

How V8 processes rate-limiting timers:

1. **Debounce Timer Reset**: The debounce wrapper uses a closure variable `timeoutId` to track the active timer. Every time the debounced function is invoked, V8 calls `clearTimeout(timeoutId)` (removing the previous macrotask from the Event Loop queue) and schedules a new `setTimeout` macrotask.
2. **Throttle State Locking**: The throttle wrapper uses a boolean flag (e.g. `inThrottle` or `isLocked`) inside its closure scope. When triggered, it checks the lock:
    - If locked, it discards the execution call.
    - If unlocked, it runs the function, sets the lock to `true`, and schedules a `setTimeout` to reset the lock to `false` after the interval.

---

## 7. Code Examples

### Bad Practice: Unthrottled Scroll Handlers
Running expensive DOM calculations on every single scroll tick causes lag.

```javascript
// Bad: Triggers up to 100 times per second during scroll!
window.addEventListener("scroll", () => {
  const container = document.getElementById("data-feed");
  const bottomOffset = container.offsetHeight - window.innerHeight - window.scrollY;
  
  if (bottomOffset < 100) {
    loadNextPage(); // Floods the server with API requests!
  }
});
```

### Good Practice: Debounced Search Input
Wait for the user to stop typing before sending search API requests.

```javascript
// Good: Simple debounce implementation
function debounce(fn, delay) {
  let timeoutId = null;

  return function(...args) {
    // Clear the active timer
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Schedule a new timer
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const performSearch = (query) => console.log("Searching API for:", query);
const debouncedSearch = debounce(performSearch, 300);

// Binds to input event
// input.addEventListener("input", (e) => debouncedSearch(e.target.value));
```

### Best Practice: Throttled Scroll Listener
Limit scroll calculations to once every 200ms.

```javascript
// Best Practice: Custom throttle wrapper
function throttle(fn, limit) {
  let isLocked = false;

  return function(...args) {
    if (isLocked) return; // Discard call if locked

    fn.apply(this, args);
    isLocked = true;

    // Unlock after limit duration
    setTimeout(() => {
      isLocked = false;
    }, limit);
  };
}

const handleScroll = () => {
  console.log("Scroll position checked at:", window.scrollY);
};

const throttledScroll = throttle(handleScroll, 200);
window.addEventListener("scroll", throttledScroll); // Runs at most 5 times per second!
```

---

## 8. Dry Run

Let's dry run `debouncedSearch("a")` then `debouncedSearch("ab")` at 100ms interval (delay = 300ms):

- **0ms**: `debouncedSearch("a")` is called.
  - `timeoutId` is `null`.
  - Schedules `setTimeout(..., 300)` (Timer 1).
- **100ms**: `debouncedSearch("ab")` is called.
  - `timeoutId` points to Timer 1.
  - Calls `clearTimeout(timeoutId)`. Timer 1 is cancelled.
  - Schedules `setTimeout(..., 300)` (Timer 2).
- **400ms** (300ms since last call):
  - Timer 2 triggers.
  - Executes `performSearch("ab")`.
  - Logs `"Searching API for: ab"`.

---

## 9. Common Mistakes

- **Mistake 1: Defining the debounced function inline inside event listeners.**
    ```javascript
    // Bad: Creates a brand-new debounced wrapper function on every scroll tick!
    window.addEventListener("scroll", () => {
      debounce(() => console.log("scroll"), 200)();
    });
    ```
- **Mistake 2: Missing execution context (`this`) or arguments propagation.**
    Failing to use `.apply(this, args)` inside the wrapper breaks functions that rely on event objects or element bindings.

---

## 10. Debugging

### Inspecting Timers in DevTools Performance Tab
To analyze if your debounce/throttle wrappers are working:
1. Open Chrome DevTools.
2. Navigate to the **Performance** tab and click record.
3. Scroll the page or type rapidly in your input field.
4. Stop recording and zoom into the timeline:
    - Look at the **User Timing** and **Task** lines.
    - If you see a dense block of hundreds of continuous task lines, your rate-limiting is failing.
    - If you see spaced out tasks matching your delay/limit intervals (e.g. every 200ms), your wrapper is working correctly.

---

## 11. Real World Usage

- **E-commerce Search Bars**: Autocomplete suggestions wait for a 300ms typing pause before querying the database.
- **Resize layout recalculations**: Canvas games throttle resize checks to prevent recreating graphic contexts on every pixel change.

---

## 12. Interview Preparation

### Question: What is the difference between Debounce and Throttle?
- **Wrong Answer**: Debounce is for inputs, throttle is for scroll events.
- **Good Answer**:
  - **Debounce** delays the execution of a function until a certain amount of idle time has passed since the last trigger. It resets the timer on every call, grouping multiple triggers into a single execution at the end.
  - **Throttle** guarantees that a function is executed at most once within a specified time window, ignoring all intermediate calls. It limits the execution frequency.

---

## 13. Practice

### Exercises
1. **Easy**: Create a button click handler that is debounced by 1 second.
2. **Medium**: Write a throttle function that executes the last call at the end of the throttle limit (trailing edge throttle).
3. **Hard**: Write a custom debounce wrapper that supports an `immediate` option (executing the function on the leading edge instead of the trailing edge).

---

## 14. Mini Assignment

Write a resize tracker that logs browser widths, throttled to execute at most once every 500ms.

---

## 15. Mini Project

Create a mock document autosave indicator `AutosaveManager`. Use debouncing to trigger the save operation 2 seconds after the user stops typing, updating a UI status label (e.g. `"Typing..."` to `"Saved!"`).

```javascript
// debounced-autosave.js
const mockSave = (content) => new Promise(res => {
  setTimeout(() => res(`Saved content: "${content}"`), 500);
});

function debounceAutosave(fn, delay) {
  let timer = null;

  return function(...args) {
    console.log("Draft updated. Waiting for typing pause...");
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const triggerSave = async (text) => {
  console.log("Saving draft to server...");
  const status = await mockSave(text);
  console.log("Server Response:", status);
};

const autosave = debounceAutosave(triggerSave, 1000);

// Simulate typing
autosave("Hello");
setTimeout(() => autosave("Hello W"), 200);
setTimeout(() => autosave("Hello World"), 400); // Autosave will trigger 1 second after this call
```

---

## 16. Chapter Summary

- **Debounce** groups multiple events, executing once after a period of inactivity.
- **Throttle** enforces a maximum execution frequency.
- High-frequency events must be rate-limited to maintain UI performance.
- Implement wrappers using **closures** to persist timers and lock states in memory.

---

## 17. Quiz

1. Which rate-limiting pattern is best suited for search autocomplete inputs?
2. What does calling `clearTimeout` do to an active timer?
3. Can a throttled function execute immediately on the first trigger?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Proxy & Reflect**. We will explore meta-programming in JavaScript, creating traps to intercept and customize object operations.

---

## 19. Completion Checklist

- [ ] I can write a custom debounce wrapper.
- [ ] I understand how to write a throttle wrapper using locks.
- [ ] I can select the correct rate-limiter for different event types.
- [ ] I know how to profile task frequencies in Chrome DevTools.
