# Polyfill for throttle

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Completion of Chapter 12-10 (debounce polyfill), understanding of closure locks and timing loops
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a security guard at a popular museum exhibition:

- **Native `throttle` is letting in visitors at regular intervals**: The exhibition room can only hold one group at a time. The guard sets a rule: *"We will let a group in exactly once every 10 minutes."*
  - At 0ms, a tour group arrives. The guard lets them in immediately (leading edge trigger) and sets a timer lock for 10 minutes.
  - At 2 minutes, another group arrives. The guard tells them to wait.
  - At 5 minutes, another group arrives. They are told to wait.
  - At 10 minutes, the lock expires. The guard lets the waiting group in (trailing edge trigger) and sets a new 10-minute lock.
- **The Difference**:
  - **Debounce** waits for everyone to stop arriving before letting anyone in.
  - **Throttle** lets people in at a steady, controlled rate while they are arriving.

In JavaScript, a **`throttle` polyfill** implements this execution lock.

---

## 2. Problem

Browsers do not provide a native `throttle` function.

If your application needs to monitor high-frequency events (like scroll tick events, mouse movements, or game loop triggers):
- Running calculations on every scroll event (which can fire 60+ times per second) causes page lag (jank) and freezes the browser main thread.
- If context or arguments are not preserved, component event bindings will break.

---

## 3. Solution

We write a reusable **`throttle` Polyfill**.

By returning a closure-based wrapper, we maintain lock states (`inThrottle` or `lastRunTime`), save trailing parameters in memory to execute at the end of the throttle window, propagate arguments, and release locks when the interval expires.

---

## 4. Definition

- **Throttle**: A design pattern that limits the maximum number of times a function can be called over a given time interval.
- **Throttling Lock**: A boolean state variable that prevents execution if the function has been run within the active interval.

---

## 5. Visualization

### Throttler Execution Intervals

```
   Events:         * (0ms)   * (50ms)   * (100ms)          * (200ms)  * (250ms)
   Timeline:       ├────────────────────┬──────────────────├────────────────────┤ (limit = 200ms)
  
   Execution:      Runs immediately     Ignored            Lock expires.
                   Sets 200ms lock      (Throttled)        Runs next event at 200ms
```

---

## 6. Internal Working

How the throttler coordinates execution loops:

1. **Lock persistence**: The returned wrapper function forms a closure over `inThrottle`, `savedArgs`, and `savedContext`.
2. **Trailing execution**: If the throttled function is called multiple times during a lock window, we save the latest arguments. When the active timer completes:
    - If trailing arguments exist, we run the function with those arguments.
    - We clear the saved arguments and schedule a new timer to clear the next lock window, ensuring the user's final input event is never lost.

---

## 7. Code Examples

### The Throttle Polyfill Function
Write a robust throttle wrapper supporting trailing edge executions.

```javascript
// throttle-polyfill.js
function throttle(func, limit) {
  if (typeof func !== "function") {
    throw new TypeError("First argument must be a function");
  }

  let inThrottle = false;
  let savedArgs = null;
  let savedContext = null;

  return function(...args) {
    if (!inThrottle) {
      // 1. First execution runs immediately (leading edge)
      func.apply(this, args);
      inThrottle = true;

      // 2. Set timer lock
      setTimeout(() => {
        inThrottle = false;
        
        // 3. If calls were made during lock window, run the last one (trailing edge)
        if (savedArgs) {
          func.apply(savedContext, savedArgs);
          savedArgs = null;
          savedContext = null;
          // Re-trigger throttle lock for the trailing execution
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }, limit);
    } else {
      // 4. Save latest context and arguments for trailing execution
      savedArgs = args;
      savedContext = this;
    }
  };
}
```

### Good Practice: Simple Throttle (Leading Edge Only)
A lightweight implementation useful when trailing edge updates are not required.

```javascript
// Good: Simple throttler
function throttleSimple(func, limit) {
  let inThrottle = false;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

### Best Practice: Throttled Scroll Listener
Implement the throttler on scroll event callbacks, preventing layout recalculation lag.

```javascript
// Best Practice: Scroll listener binding
const logScrollPosition = function() {
  console.log("Current Scroll Y:", window.scrollY);
};

// Throttle scroll execution to once every 200ms
const throttledScroll = throttle(logScrollPosition, 200);

window.addEventListener("scroll", throttledScroll);
```

---

## 8. Dry Run

Let's dry run `throttledFn("A")`, then `throttledFn("B")` (at 50ms), and `throttledFn("C")` (at 150ms) with a 200ms limit:

- **0ms**: `throttledFn("A")` is called.
  - `inThrottle` is `false`. Enters block.
  - Runs `func("A")` immediately. Logs `"A"`.
  - Sets `inThrottle = true`. Schedules timer (expires at 200ms).
- **50ms**: `throttledFn("B")` is called.
  - `inThrottle` is `true`. Saves: `savedArgs = ["B"]`.
- **150ms**: `throttledFn("C")` is called.
  - `inThrottle` is `true`. Overwrites: `savedArgs = ["C"]`.
- **200ms**: Timer expires.
  - Sets `inThrottle = false`.
  - Since `savedArgs` is `["C"]`, runs `func("C")` (trailing execution). Logs `"C"`.
  - Clears `savedArgs`. Sets `inThrottle = true` and schedules reset timer (expires at 400ms).

---

## 9. Common Mistakes

- **Mistake 1: Ignoring the trailing call.**
    If you implement a leading-edge-only throttler for mouse movements, the final position of the mouse is often discarded because the last event occurred during a lock window. Always preserve the trailing call.
- **Mistake 2: Re-instantiating the throttled wrapper on every invocation.**
    Do not declare `const throttled = throttle(...)` inside an inline event listener.

---

## 10. Debugging

### Tracing Throttling Locks in Console
If your throttler is failing and firing on every event:
1. Add logging inside the conditional check:
    ```javascript
    console.log(`[Throttle Trigger] Called. Locked: ${inThrottle}`);
    ```
2. If `Locked` remains `false` on consecutive rapid events, check if you are re-instantiating the returned function on every scroll event rather than reusing the same closure reference.

---

## 11. Real World Usage

- **Scroll Progress Indicators**: Updating scroll progress bars on reading blogs without causing page stutter.
- **API Rate Limiting**: Client-side throttling of fetch requests on dashboard reload buttons to prevent spamming the server.

---

## 12. Interview Preparation

### Question: Explain the difference between Debounce and Throttle
- **Wrong Answer**: They are identical.
- **Good Answer**:
  - **Debouncing** groups multiple consecutive calls into a single execution **after a period of inactivity (silence)**. It resets the timer on every call. Use case: search autocomplete inputs.
  - **Throttling** limits the execution rate of events, running the target function **at most once per time interval** during a continuous stream of calls. Use case: window resizing or scroll tracking.

---

## 13. Practice

### Exercises
1. **Easy**: Write a simple leading-edge throttle polyfill and bind it to a click button.
2. **Medium**: Add a `cancel()` method to your throttled function to clear active timers and reset lock states.
3. **Hard**: Write a throttle polyfill that accepts an options object: `{ leading: boolean, trailing: boolean }`, allowing the caller to customize execution edges.

---

## 14. Mini Assignment

Write a scroll tracking script that logs page vertical scroll offsets throttled to once every 300ms, and verify it in the browser.

---

## 15. Mini Project

Create a test runner suite `ThrottlePolyfillTester` that validates your custom throttle implementation against 3 Edge Cases (simple execution rate, trailing call preservation, and arguments propagation).

```javascript
// throttle-polyfill-test-suite.js
// Paste your throttle polyfill here

const logArray = [];
const task = (val) => logArray.push(val);

const throttledTask = throttle(task, 100);

// Simulate calls
throttledTask("A"); // Runs immediately
setTimeout(() => throttledTask("B"), 50); // Saved
setTimeout(() => throttledTask("C"), 80); // Overwrites B

// Verify
setTimeout(() => {
  console.log("--- Running Throttle Tests ---");
  console.log("Log Array:", logArray);
  console.log("Test 1 (Throttle Rate):", logArray.length === 2 && logArray[0] === "A" && logArray[1] === "C" ? "PASS" : "FAIL");
}, 300);
```

---

## 16. Chapter Summary

- **Throttle** limits function executions to at most once per time interval.
- The returned wrapper forms a **closure** to persist the lock states.
- Preserve **trailing edge calls** to ensure the user's final input event is not lost.
- Use **`setTimeout`** to release locks after the interval has elapsed.

---

## 17. Quiz

1. What happens to a throttled call made during an active lock window if trailing execution is disabled?
2. Which method is better suited for a window resize layout update: debounce or throttle?
3. Why do we need to store `savedContext` inside the throttled function?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Polyfill for deep clone**. We will explore deep object duplications, prototype copying, and resolving circular loop references.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Scroll events pe har frame function call — throttle se fixed interval pe ek baar call.
- **Concept**: Throttle: ek call ko allow karo, phir wait ms ke liye block karo — timestamps ya flags se implement.
- **Key Pattern**: unction throttle(fn, wait) { let last = 0; return function(...args) { const now = Date.now(); if(now - last >= wait) { last = now; fn.apply(this, args); } }; }.
- **Common Mistake**: Leading aur trailing calls ka behavior confuse karna — decide karo kya chahiye aur implement karo consistently.
## 19. Completion Checklist

- [ ] I can write a custom throttle polyfill helper.
- [ ] I understand the difference between debounce and throttle.
- [ ] I know how to implement trailing edge call preservation.
- [ ] I understand how closures maintain lock variables in memory.
