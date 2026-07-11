# Performance Measurement

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of browser event lifecycles and timers
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a manager at a package shipping terminal:

- **`Date.now()` is like checking your wrist watch**: You glance at the watch. It is ~10:05 AM. It tells you the general wall time, but it only ticks in minutes or seconds. You cannot use it to measure how many milliseconds it takes a package to slide down the conveyor belt.
- **`performance.now()` is like holding a laser stopwatch**: It measures time down to fractions of a microsecond.
- **Performance Marks are like scanning checkpoints**: A package arrives at the loading dock. A scanner logs a checkpoint `"Dock-Arrival"` (mark). The package slides through sorting. It reaches the truck. The scanner logs `"Truck-Loaded"` (mark).
- **Performance Measures are calculating transit delays**: You ask the computer: *"What was the exact delay between 'Dock-Arrival' and 'Truck-Loaded'?"* (measure). It prints a precise graph showing sorting latency.
- **Navigation / Paint Timings are terminal construction metrics**: First Paint (FP) is when the construction team mounts the first steel girder. First Contentful Paint (FCP) is when they put up the first visible sign on the building.

In JavaScript, these measurements diagnose application bottlenecks.

---

## 2. Problem

Using `Date.now()` to benchmark code execution is unreliable:
- It returns integers in milliseconds, which is too coarse for microsecond benchmarks.
- System time synchronization updates (NTP syncs) can change the system clock mid-execution, causing negative time deltas.
- It does not capture critical browser paint metrics (like First Contentful Paint).

---

## 3. Solution

JavaScript provides the standard **Performance API**.

Using **`performance.now()`** guarantees a monotonically increasing, high-resolution microsecond timer.

With **`performance.mark()`** and **`performance.measure()`**, developers create custom timelines that are recorded directly in Chrome DevTools' performance profiler.

---

## 4. Definition

- **High-Resolution Time**: A microsecond-level time value representing elapsed milliseconds since the page load navigation started.
- **Performance Mark**: A timestamp recorded on the performance timeline under a user-defined name.
- **Performance Measure**: An entry on the timeline representing the elapsed duration between two marks.
- **FCP (First Contentful Paint)**: The time when the browser renders the first piece of DOM content (e.g. text or images).

---

## 5. Visualization

### Performance Marks and Measures Timeline

```
   PAGE START (0.000ms)
       |
       v
   [ Run Code ] 
       |
   [ mark("start") ]  <--- Checkpoint A (120.452ms)
       |
   [ Execute Loop ]
       |
   [ mark("end") ]    <--- Checkpoint B (125.105ms)
       |
       +====================================+
       |  measure("Loop-Time",A,B)          | --> Duration: 4.653ms
       +====================================+
```

---

## 6. Internal Working

How the browser handles performance timers:

1. **Monotonic Clock**: Unlike `new Date()`, which queries the system wall clock, `performance.now()` queries a hardware high-resolution timer. It is monotonic: it only goes forward and is completely unaffected by system clock adjustments.
2. **Shared Timeline Registry**: When you call `performance.mark(name)`, the browser creates a C++ `PerformanceMark` record and stores it in the Document's **Performance Timeline**.
3. **DevTools Bridge**: The DevTools Performance profiler monitors this timeline. When a measure is created, it draws a custom colored bar under the **User Timing** track.

---

## 7. Code Examples

### Bad Practice: Using `Date` for Benchmarks
Using the system clock is imprecise and vulnerable to system time adjustments.

```javascript
// Bad: Coarse and unreliable clock
const start = Date.now();
runHeavyFunction();
const end = Date.now();
console.log(`Execution took: ${end - start}ms`); // May log 0ms for fast operations!
```

### Good Practice: High-Resolution Timestamping
Use `performance.now()` to capture sub-millisecond execution times accurately.

```javascript
// Good: High-resolution timestamping
const start = performance.now();
runHeavyFunction();
const end = performance.now();
const duration = end - start;
console.log(`Execution took: ${duration.toFixed(3)}ms`); // Logs e.g. 1.245ms
```

### Best Practice: Structural Profiling with Marks and Measures
Mark key checkpoints and measure durations to profile complex multi-step workflows.

```javascript
// Best Practice: Segmented workflow profiling
function processUserData() {
  performance.mark("process-start");

  // Step 1: Parse
  parseData();
  performance.mark("parse-complete");

  // Step 2: Render
  renderData();
  performance.mark("render-complete");

  // Create segmented measures
  performance.measure("Total-Process", "process-start", "render-complete");
  performance.measure("Parsing-Phase", "process-start", "parse-complete");
  performance.measure("Rendering-Phase", "parse-complete", "render-complete");

  // Log and clear timeline
  const measures = performance.getEntriesByType("measure");
  measures.forEach(measure => {
    console.log(`${measure.name}: ${measure.duration.toFixed(3)}ms`);
  });

  performance.clearMarks();
  performance.clearMeasures();
}
```

---

## 8. Dry Run

Let's dry run the performance metrics retrieval:

```javascript
performance.mark("A");
setTimeout(() => {
  performance.mark("B");
  performance.measure("Interval", "A", "B");
  const entry = performance.getEntriesByName("Interval")[0];
  console.log("Duration:", entry.duration >= 100); // Should be true
}, 100);
```

### Step-by-Step State
- **0ms**:
  - `performance.mark("A")` is called. Records a mark at `elapsed = X ms`.
  - Schedules a timeout task for 100ms.
- **100ms (Timer fires)**:
  - `performance.mark("B")` is called. Records a mark at `elapsed = X + 100 ms` (approx).
  - `performance.measure("Interval", "A", "B")` computes the difference.
  - Queries `getEntriesByName("Interval")`. Returns the measure record object.
  - `entry.duration` calculates to `(X + 100) - X = 100ms`.
  - Logs `true`.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to clear marks and measures.**
    Timeline entries stay in memory permanently unless cleared, causing minor memory bloat. Call `performance.clearMarks()` and `performance.clearMeasures()` when finished.
- **Mistake 2: Measuring marks that were never created.**
    If you call `performance.measure("test", "start")` and the mark `"start"` doesn't exist, the browser throws a `SyntaxError: The mark 'start' does not exist`.

---

## 10. Debugging

### Viewing User Timings in Chrome DevTools
To see your custom performance measures visually:
1. Open Chrome DevTools.
2. Navigate to the **Performance** tab.
3. Click the record button.
4. Run your code containing marks and measures.
5. Stop recording and expand the **User Timing** track:
    - You will see horizontal bars representing your custom measures (e.g. `"Parsing-Phase"`).
    - Hover over a bar to see the exact start time, duration, and end time.

---

## 11. Real World Usage

- **Performance Analytics Tracking**: Web apps log paint metrics (First Contentful Paint) and send them to telemetry servers to monitor real-world user load speeds.
- **API Response Benchmarking**: Servers measure network round-trip latency to optimize database routing paths.

---

## 12. Interview Preparation

### Question: What is the difference between `performance.now()` and `Date.now()`?
- **Wrong Answer**: `performance.now()` returns date strings.
- **Good Answer**:
  - **Precision**: `performance.now()` returns high-resolution floating-point values in milliseconds with microsecond precision. `Date.now()` returns integers in milliseconds.
  - **Clock Source**: `performance.now()` is a monotonic timer measured relative to the start of the document's navigation. It only increases. `Date.now()` is based on the system clock, which can be modified by the user or network time updates, making it unreliable for precise time deltas.

---

## 13. Practice

### Exercises
1. **Easy**: Write a script that measures the execution time of a loop of 1,000,000 operations using `performance.now()`.
2. **Medium**: Write a function that measures the duration of an asynchronous API fetch using marks and measures.
3. **Hard**: Query the `performance.getEntriesByType("navigation")` API and extract the DNS lookup duration and TCP connection duration.

---

## 14. Mini Assignment

Write a benchmarking function `profileFunc(fn)` that executes the passed function and logs its duration with microsecond precision.

---

## 15. Mini Project

Create a modular performance profiler utility `CodeProfiler` that allows developers to create named checkpoints and outputs a clean, formatted table of segment times in the console.

```javascript
// performance-code-profiler.js
class CodeProfiler {
  static start(label) {
    performance.mark(`${label}-start`);
  }

  static stop(label) {
    performance.mark(`${label}-stop`);
    performance.measure(label, `${label}-start`, `${label}-stop`);
  }

  static getReport() {
    const report = {};
    const measures = performance.getEntriesByType("measure");
    
    measures.forEach(measure => {
      report[measure.name] = `${measure.duration.toFixed(3)} ms`;
    });

    console.log("--- Performance Report ---");
    console.table(report);

    // Clean up
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Test case
CodeProfiler.start("Total Execution");
CodeProfiler.start("Loop Task");
for (let i = 0; i < 1000000; i++) {} // Math loop
CodeProfiler.stop("Loop Task");
CodeProfiler.stop("Total Execution");

CodeProfiler.getReport();
```

---

## 16. Chapter Summary

- **`performance.now()`** returns microsecond-level monotonic timestamps.
- **`performance.mark()`** registers checkpoints on the timeline.
- **`performance.measure()`** calculates the duration between marks.
- Custom measures appear in the **User Timing** track in Chrome DevTools.

---

## 17. Quiz

1. What is a monotonic clock?
2. How do you retrieve all measure entries from the performance timeline?
3. What unit of time does `performance.now()` return?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Code Optimization Techniques**. We will explore V8 engine internals, learning about hidden classes, shapes, and inline caching compilation methods.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Optimization karna bina measure kiye — galat jagah time waste hoti hai (premature optimization).
- **Concept**: performance.now() high-resolution timestamps deta hai; Chrome DevTools Performance tab flame chart dikhata hai.
- **Key Pattern**: const t0 = performance.now(); doWork(); console.log(performance.now() - t0, 'ms');.
- **Common Mistake**: console.time() production mein chhod dena — performance overhead add hota hai; measure karo, phir remove karo.
## 19. Completion Checklist

- [ ] I can write microsecond-level benchmarks using `performance.now()`.
- [ ] I understand how to create marks and measures.
- [ ] I know how to view custom measures in the DevTools Performance tab.
- [ ] I can clear performance entries to prevent memory leaks.
