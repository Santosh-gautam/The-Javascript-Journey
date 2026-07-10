# Timers & Animation

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of the Event Loop and DOM manipulation
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are drawing a flipbook animation:

- **`setInterval` is like turning pages using a mechanical metronome**: The metronome ticks every 16 milliseconds. You flip a page on every tick. If you take slightly longer to turn page 5, or if your hand slips, you get out of sync. Sometimes you turn two pages at once, or turn a page while your eyes are closed, causing the animation to look choppy.
- **`requestAnimationFrame` is like a professional director calling "Action!"**: The director looks at your flipbook and monitors the camera's shutter speed (refresh rate). They say: *"Flip now!"* exactly when the camera is ready to capture the next frame. If you look away or close the book (minimize the tab), the director pauses the filming, saving your energy and paper.

In JavaScript, synchronizing your animation frames with the browser's paint cycle is key to smooth performance.

---

## 2. Problem

Animations require updating DOM elements (like moving a box's CSS `left` property) repeatedly over time.

If you use `setInterval(update, 16)`:
- The timer runs independently of the browser's paint cycle.
- Updates can occur in the middle of a screen refresh, causing screen tearing or dropped frames (jank).
- Timers continue to run in background tabs, consuming CPU cycles and draining mobile battery.

---

## 3. Solution

We use **`requestAnimationFrame` (rAF)** instead of standard timers for all UI updates.

This browser API schedules callbacks to run exactly before the next frame repaint, matching the device's refresh rate (e.g. 60Hz, 120Hz) and automatically pausing in background tabs to save resources.

---

## 4. Definition

- **`setTimeout`**: Schedules a callback to run after a specified delay (minimum 4ms clamp on nested timers).
- **`setInterval`**: Repeatedly schedules a callback with a fixed delay between runs.
- **`requestAnimationFrame`**: A browser method that requests the browser call a specified function to update an animation before the next repaint.
- **Jank**: Choppy or lagging visual rendering caused by delayed frame repaints or dropped frames.

---

## 5. Visualization

### Timer-based Animation vs. requestAnimationFrame

```
   setInterval Animation (Out of Sync)
   Screen Refreshes:  | (16.7ms)   | (33.3ms)   | (50.0ms)   | (66.7ms)
   Timer Triggers:      | (16ms)     | (32ms)       | (48ms)     | (64ms)
   (Updates hit randomly within refresh cycles, causing visual jank)
  
   requestAnimationFrame Animation (Synchronized)
   Screen Refreshes:  | (16.7ms)   | (33.3ms)   | (50.0ms)   | (66.7ms)
   rAF Callbacks:     |            |            |            |
   (Updates execute exactly before the display repaints, resulting in smooth motion)
```

---

## 6. Internal Working

How the browser handles these rendering cycles:

1. **Timer Clamping**: V8 executes timers via the Event Loop's Macrotask Queue. By spec, if timers are nested 5+ levels deep, the browser clamps the minimum delay to **4ms**, meaning you cannot create sub-millisecond loops using `setInterval`.
2. **Repaint Cycle**: Browsers redraw pages at a fixed frequency (usually 60Hz, meaning 1 frame every 16.7ms).
3. **rAF Execution Hook**:
    - When you call `requestAnimationFrame(callback)`, the browser registers the callback in an internal **Render Queue** rather than the Macrotask Queue.
    - Right before the browser performs a layout and paint step, it flushes this Render Queue, executing all registered callbacks in a single pass.
4. **Power Conservation**: If a tab is inactive or minimized, the browser halts its refresh cycle, which automatically pauses all `requestAnimationFrame` callbacks, saving battery and CPU.

---

## 7. Code Examples

### Bad Practice: Using `setInterval` for Animation
Using timers to animate properties results in uneven frame delivery and performance warnings.

```javascript
// Bad: Choose janky motion and CPU drain
const box = document.getElementById("box");
let position = 0;

const timerId = setInterval(() => {
  position += 2;
  box.style.transform = `translateX(${position}px)`;
  
  if (position >= 500) {
    clearInterval(timerId);
  }
}, 16); // May fire out of sync with screen refresh!
```

### Good Practice: Smooth Animation with `requestAnimationFrame`
Use recursive `requestAnimationFrame` loops to synchronize updates with the screen's refresh rate.

```javascript
// Good: Smooth, optimized motion
const box = document.getElementById("box");
let position = 0;

function animate() {
  position += 2;
  box.style.transform = `translateX(${position}px)`;

  if (position < 500) {
    // Schedule next frame
    requestAnimationFrame(animate);
  }
}

// Start animation
requestAnimationFrame(animate);
```

### Best Practice: Time-Delta Based Animation
To ensure animations run at the same physical speed regardless of the screen's refresh rate (e.g. 60Hz vs 144Hz monitors), calculate position changes based on elapsed time (time deltas).

```javascript
// Best Practice: Frame-rate independent animation
const box = document.getElementById("box");
const speed = 0.2; // Move 0.2px per millisecond
let startTimestamp = null;

function step(timestamp) {
  if (!startTimestamp) startTimestamp = timestamp;
  const elapsed = timestamp - startTimestamp;

  // Calculate position using elapsed time (independent of monitor refresh rate)
  const position = Math.min(speed * elapsed, 500);
  box.style.transform = `translateX(${position}px)`;

  if (position < 500) {
    requestAnimationFrame(step);
  }
}

requestAnimationFrame(step);
```

---

## 8. Dry Run

Let's dry run the behavior of recursive calls and cancellation:

```javascript
let count = 0;
let animationId = null;

function renderTick(timestamp) {
  count++;
  console.log("Tick:", count);
  animationId = requestAnimationFrame(renderTick);
}

animationId = requestAnimationFrame(renderTick);
// Cancel after 50ms
setTimeout(() => {
  cancelAnimationFrame(animationId);
  console.log("Cancelled!");
}, 50);
```

### Step-by-Step State
- **0ms**: `requestAnimationFrame(renderTick)` is called. V8 registers the callback.
- **16.7ms**: First paint cycle:
  - `renderTick` runs. `count = 1`. Logs `"Tick: 1"`.
  - Schedules next tick, saving the ID returned by `requestAnimationFrame`.
- **33.3ms**: Second paint cycle:
  - `renderTick` runs. `count = 2`. Logs `"Tick: 2"`.
  - Schedules next tick.
- **50ms**:
  - The `setTimeout` task executes in the Macrotask Queue.
  - Calls `cancelAnimationFrame(animationId)`.
  - Logs `"Cancelled!"`.
  - The next scheduled `renderTick` is removed from the Render Queue. No more logs occur.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to pass the timestamp parameter.**
    `requestAnimationFrame` automatically passes a high-resolution timestamp (representing milliseconds elapsed since the page load) to its callback.
- **Mistake 2: Stacking multiple animation loops.**
    Calling `requestAnimationFrame` repeatedly without checking if a loop is already running can duplicate callbacks, causing animations to run twice as fast.

---

## 10. Debugging

### Profiling Frame Rates in DevTools
To identify if your animations are dropping frames:
1. Open Chrome DevTools.
2. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac) to open the Command Menu.
3. Type `Show Rendering` and press Enter.
4. In the Rendering drawer, check **Frame Rendering Stats** (or **FPS Meter**):
    - A widget will appear in the top-right corner of the page showing the current FPS and GPU memory usage.
    - Interact with your page. If the FPS graph drops below 60 during animations, you are experiencing jank.

---

## 11. Real World Usage

- **Parallax Scrollers**: Modern scrolling designs update background image layouts inside `requestAnimationFrame` handlers to prevent lag.
- **Game Loops**: HTML5 canvas games run update-draw cycles inside rAF loops to render smooth graphics.

---

## 12. Interview Preparation

### Question: Why is `requestAnimationFrame` better than `setInterval` for DOM animations?
- **Wrong Answer**: Because `requestAnimationFrame` runs on a separate C++ background thread.
- **Good Answer**:
  - **Sync**: `requestAnimationFrame` is synchronized with the browser's refresh rate, executing callbacks exactly before repaints to prevent visual tearing. `setInterval` runs independently, often firing updates at irregular intervals.
  - **Resource Conservation**: `requestAnimationFrame` automatically pauses when the browser tab is minimized or inactive, saving CPU cycles and battery. `setInterval` continues to run in the background.
  - **Time Stamps**: `requestAnimationFrame` provides a high-resolution timestamp, allowing for frame-rate independent animations.

---

## 13. Practice

### Exercises
1. **Easy**: Create a box that moves 10px to the right every time you click it, animating the movement using `requestAnimationFrame`.
2. **Medium**: Write a script that runs a timer showing milliseconds elapsed since the start, updating the display using `requestAnimationFrame`.
3. **Hard**: Implement a custom loop runner that can pause, resume, and restart an animation loop safely.

---

## 14. Mini Assignment

Write a fade-out animation utility `fadeOut(element, duration)` that changes the element's opacity from 1 to 0 smoothly over a specified duration using time deltas.

---

## 15. Mini Project

Create a modular physics loop manager `PhysicsLoop` that runs update routines and draw commands, using elapsed time deltas to ensure consistent speeds on 60Hz and 144Hz monitors.

```javascript
// physics-engine-loop.js
class PhysicsLoop {
  constructor(updateCallback, drawCallback) {
    this.update = updateCallback;
    this.draw = drawCallback;
    this.lastTime = 0;
    this.animationId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    // Calculate delta time in milliseconds
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    console.log("Animation loop stopped.");
  }
}

// Test case (requires DOM operations)
// const box = document.getElementById("ball");
// let x = 0;
// const gameLoop = new PhysicsLoop(
//   (dt) => x += 0.1 * dt, // Update: move 0.1px per ms
//   () => box.style.transform = `translateX(${x}px)` // Draw
// );
// gameLoop.start();
```

---

## 16. Chapter Summary

- **`setTimeout`** and **`setInterval`** are not synchronized with browser repaints.
- **`requestAnimationFrame` (rAF)** flushes callbacks right before repaints, matching the display's refresh rate.
- rAF pauses automatically in background tabs, saving CPU and battery.
- Use **Time-Delta calculations** to keep animations running at consistent speeds across different monitors.

---

## 17. Quiz

1. What is the minimum execution clamp delay for nested timeouts?
2. Does `requestAnimationFrame` pause when the tab is minimized?
3. Why should you avoid using `setInterval` for animations?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will explore the **Browser Rendering Pipeline**. We will study the Critical Rendering Path, Reflows, Repaints, Layout Thrashing, and learn how to optimize rendering performance.

---

## 19. Completion Checklist

- [ ] I can write smooth animations using `requestAnimationFrame`.
- [ ] I understand how to write frame-rate independent updates using time deltas.
- [ ] I know how to pause and cancel animation loops.
- [ ] I can monitor rendering stats and FPS in Chrome DevTools.
