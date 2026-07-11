# Carousel

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: DOM manipulation, CSS transitions, and interval timers
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a gallery curator showcasing paintings on a rotating easel:

- **The Carousel Container is the display easel window**: It only has space to show one painting at a time.
- **The Slides are the paintings lined up in a long row**: They are hung side-by-side on a continuous sliding track behind the wall.
- **Next and Prev buttons are manual crank handles**: When you turn the crank to the right (Next), the entire sliding track moves left by exactly one frame width, bringing the next painting into the easel window.
- **Indicators are numbered pegs at the bottom**: They highlight which painting is currently active.
- **Auto-Play is an electric motor attached to the easel**: Every 3 seconds, it automatically rotates the track. If a guest walks up to inspect the active painting closely (hovering), the motor pauses to prevent rotating the painting away while they are looking.

In frontend engineering, a **Carousel** coordinates these elements.

---

## 2. Problem

When building carousels, junior developers often:
- Manipulate inline styles directly by changing `element.style.left` for every image, causing layout recalculations and choppy movements.
- Fail to clean up autoplay timers (`setInterval`) when components unmount, causing memory leaks.
- Omit accessibility (ARIA) attributes, making the component unusable for screen-reader users.

---

## 3. Solution

We design a **State-Driven, Accessible Carousel Component**:
1. **State Tracking**: Active index, slides array, autoplay duration, and timer instance.
2. **Hardware-Accelerated Transitions**: CSS `transform: translate3d()` and CSS custom properties for smooth transitions.
3. **Pause-on-Hover**: Temporarily pausing autoplay during mouse pointer hovers.
4. **ARIA Compliance**: Semantic buttons, labels, and roles.

---

## 4. Definition

- **Carousel**: A slideshow component for cycling through elements, like images or slides, using transitions.
- **Hardware Acceleration**: Delegating rendering computations (like CSS translates) to the GPU rather than the CPU, resulting in 60fps animations.
- **Keyboard Navigation**: Allowing users to navigate slides using Arrow keys.

---

## 5. Visualization

### Carousel Slide Offset Mapping

If active index = `1` (slide width = `500px`):

```
       Visual Window (Clip Overflow)
      ┌─────────────────────────────┐
      │          Slide 1            │
      └─────────────────────────────┘
  
   Slider Track (width: 1500px, transform: translate3d(-500px, 0, 0)):
   ┌────────────────┬────────────────┬────────────────┐
   │    Slide 0     │    Slide 1     │    Slide 2     │
   │    (0px)       │    (500px)     │    (1000px)    │
   └────────────────┴────────────────┴────────────────┘
```

The track shifts left by `index * slideWidth` to show the target slide.

---

## 6. Internal Working

How the carousel behaves:

1. **Hardware-Accelerated Shifts**: Changing `transform: translate3d(-X%, 0, 0)` is handled entirely by the GPU compositing thread. It skips the browser's layout (reflow) and painting phases, enabling smooth transitions.
2. **Autoplay Interrupts**: When the pointer enters the container, the autoplay timer is cleared (`clearInterval(timer)`). When it leaves, a new `setInterval` starts, preserving standard user experience.

---

## 7. Code Examples

### HTML & CSS Foundation
Build a semantic structure with hidden slides.

```html
<!-- HTML Structure -->
<div class="carousel" id="my-carousel" aria-roledescription="carousel" aria-label="Product Showcase">
  <div class="carousel-track-container">
    <ul class="carousel-track">
      <li class="carousel-slide active" aria-hidden="false">Slide 1</li>
      <li class="carousel-slide" aria-hidden="true">Slide 2</li>
      <li class="carousel-slide" aria-hidden="true">Slide 3</li>
    </ul>
  </div>
  <button class="carousel-btn prev-btn" aria-label="Previous slide">&lsaquo;</button>
  <button class="carousel-btn next-btn" aria-label="Next slide">&rsaquo;</button>
  <div class="carousel-indicators">
    <button class="indicator active" aria-label="Go to slide 1"></button>
    <button class="indicator" aria-label="Go to slide 2"></button>
    <button class="indicator" aria-label="Go to slide 3"></button>
  </div>
</div>
```

```css
/* CSS Styles */
.carousel {
  position: relative;
  width: 600px;
  overflow: hidden;
}
.carousel-track-container {
  overflow: hidden;
  width: 100%;
}
.carousel-track {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
  transition: transform 0.3s ease-in-out;
  will-change: transform; /* Hardware Acceleration Tip */
}
.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
}
```

### The Carousel Controller Class
Write a Vanilla JS class that coordinates slide transitions, indicator updates, auto-play, and keyboard inputs.

```javascript
// carousel-controller.js
class Carousel {
  constructor(elementId, autoplayInterval = 3000) {
    this.carousel = document.getElementById(elementId);
    this.track = this.carousel.querySelector(".carousel-track");
    this.slides = Array.from(this.carousel.querySelectorAll(".carousel-slide"));
    this.prevBtn = this.carousel.querySelector(".prev-btn");
    this.nextBtn = this.carousel.querySelector(".next-btn");
    this.indicators = Array.from(this.carousel.querySelectorAll(".indicator"));

    this.currentIndex = 0;
    this.autoplayInterval = autoplayInterval;
    this.autoplayTimer = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.startAutoplay();
  }

  // 1. Core State Mutator
  goToSlide(index) {
    // Handle bounds wrapping
    if (index < 0) index = this.slides.length - 1;
    if (index >= this.slides.length) index = 0;

    this.currentIndex = index;

    // Shift track container using CSS Translate
    const offset = -this.currentIndex * 100;
    this.track.style.transform = `translate3d(${offset}%, 0, 0)`;

    // Update active attributes and classes
    this.slides.forEach((slide, i) => {
      const isActive = i === this.currentIndex;
      slide.classList.toggle("active", isActive);
      slide.setAttribute("aria-hidden", !isActive ? "true" : "false");
    });

    this.indicators.forEach((indicator, i) => {
      indicator.classList.toggle("active", i === this.currentIndex);
    });
  }

  // 2. Events Bindings
  bindEvents() {
    this.nextBtn.addEventListener("click", () => this.goToSlide(this.currentIndex + 1));
    this.prevBtn.addEventListener("click", () => this.goToSlide(this.currentIndex - 1));

    // Indicators click bindings
    this.indicators.forEach((indicator, i) => {
      indicator.addEventListener("click", () => this.goToSlide(i));
    });

    // Pause on Hover
    this.carousel.addEventListener("mouseenter", () => this.stopAutoplay());
    this.carousel.addEventListener("mouseleave", () => this.startAutoplay());

    // Keyboard Arrow navigation
    this.carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.goToSlide(this.currentIndex - 1);
      if (e.key === "ArrowRight") this.goToSlide(this.currentIndex + 1);
    });
  }

  // 3. Autoplay Managers
  startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      this.goToSlide(this.currentIndex + 1);
    }, this.autoplayInterval);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
}
```

---

## 8. Dry Run

Let's dry run the user clicking the "Next" button:

- **Initial state**: `currentIndex = 0`, track offset = `translate3d(0%, 0, 0)`.
- **User Action**: Clicks `.next-btn`.
- **Event Handler Execution**:
  - Triggers click listener: `goToSlide(currentIndex + 1)` which is `goToSlide(1)`.
- **goToSlide(1)**:
  - `index = 1`. Fits within bounds (length = 3).
  - Sets `currentIndex = 1`.
  - Calculates offset: `-1 * 100 = -100`.
  - Applies style: `track.style.transform = "translate3d(-100%, 0, 0)"`.
  - Loops slides:
    - **i = 0**: class `"active"` removed, `aria-hidden` set to `"true"`.
    - **i = 1**: class `"active"` added, `aria-hidden` set to `"false"`.
  - Loops indicators: updates active dot index to `1`.
  - The GPU animates the sliding track to `-100%` width.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to clean up `setInterval` timers when the slider is destroyed.**
    If you build a Single Page Application and navigate away from the page without calling `clearInterval`, the timer callback will run in the background, consuming CPU resources.
- **Mistake 2: Animating the slides using `left` properties instead of `transform`.**
    Changing `left` forces the browser engine to perform layout calculations (reflow) on every animation frame, leading to visual stutter.

---

## 10. Debugging

### Auditing active intervals
If your carousel starts accelerating or sliding through multiple slides rapidly:
1. Check if you have multiple active timers running.
2. Set breakpoints inside `startAutoplay()` and `stopAutoplay()`.
3. Verify that `stopAutoplay()` is always called before starting a new timer to prevent interval leaks.

---

## 11. Real World Usage

- **E-Commerce Image Galleries**: Product detail pages showcase multiple photos of an item.
- **Hero Image Sliders**: Home page banner areas rotatively showcasing news and deals.

---

## 12. Interview Preparation

### Question: Why is `transform: translate3d()` preferred over changing `left` positions for animations?
- **Wrong Answer**: Because translate3d makes the images smaller.
- **Good Answer**: Because `transform: translate3d()` is hardware-accelerated.
  - Modifying `left` changes the element's layout geometry, forcing the browser to execute reflows and repaints, which recalculates the entire page's layout.
  - Modifying `transform` doesn't affect document layout. The browser passes the pre-painted element layer directly to the GPU's compositing thread, which handles positioning. This avoids reflows and repaints, enabling smooth 60fps animations.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic HTML carousel with 3 slides and manual navigation buttons.
2. **Medium**: Add a transition toggle switch to turn slide transitions on or off.
3. **Hard**: Implement touch swipe gestures (using `touchstart` and `touchend` events) to allow users to swipe through slides on mobile devices.

---

## 14. Mini Assignment

Write a function `addSlide(content)` that dynamically appends a new slide and updates indicators.

---

## 15. Mini Project

Create a single-file interactive Carousel application that implements transitions, autoplay control, and accessibility features.

```html
<!-- carousel-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Interactive Carousel Sandbox</title>
  <style>
    .carousel { position: relative; width: 400px; overflow: hidden; border: 1px solid #ccc; margin: auto; }
    .carousel-track { display: flex; transition: transform 0.3s ease-in-out; margin: 0; padding: 0; list-style: none; }
    .carousel-slide { min-width: 100%; height: 250px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
    .slide-1 { background: coral; }
    .slide-2 { background: lightblue; }
    .slide-3 { background: lightgreen; }
    .carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; cursor: pointer; padding: 10px; }
    .prev-btn { left: 10px; }
    .next-btn { right: 10px; }
  </style>
</head>
<body>
  <div class="carousel" id="test-carousel">
    <div class="carousel-track-container">
      <ul class="carousel-track">
        <li class="carousel-slide slide-1">Slide 1</li>
        <li class="carousel-slide slide-2">Slide 2</li>
        <li class="carousel-slide slide-3">Slide 3</li>
      </ul>
    </div>
    <button class="carousel-btn prev-btn">&lsaquo;</button>
    <button class="carousel-btn next-btn">&rsaquo;</button>
  </div>

  <script>
    class SimpleCarousel {
      constructor(id) {
        this.el = document.getElementById(id);
        this.track = this.el.querySelector(".carousel-track");
        this.slides = Array.from(this.el.querySelectorAll(".carousel-slide"));
        this.currentIndex = 0;
        this.init();
      }
      init() {
        this.el.querySelector(".next-btn").addEventListener("click", () => this.move(1));
        this.el.querySelector(".prev-btn").addEventListener("click", () => this.move(-1));
      }
      move(direction) {
        this.currentIndex = (this.currentIndex + direction + this.slides.length) % this.slides.length;
        this.track.style.transform = `translate3d(-${this.currentIndex * 100}%, 0, 0)`;
      }
    }
    new SimpleCarousel("test-carousel");
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- Use **`translate3d`** shifts for hardware-accelerated animations.
- Manage **boundaries wrapping** using modulo calculations: `(i + dir + len) % len`.
- Bind **pause-on-hover** features using mouseenter and mouseleave listeners.
- Enforce **accessibility compliance** with roles and `aria-hidden` attributes.

---

## 17. Quiz

1. How does `will-change: transform` help animations?
2. What is the purpose of wrapping slide indices using `%` modulo?
3. Why is touch gesture binding important for modern carousels?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Infinite Scroll**. We will explore Intersection Observer configs, scroll loading throttlers, and dynamic DOM appending.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Carousel (ya Image Slider) ek standard component hai jo machine coding rounds mein bahut pucha jata hai. Isme hume teen main problems solve karni hoti hain:
1. **Infinite Looping**: Jab user last image par click kare, toh use bina kisi jhatke (seamlessly) ke wapas pehli image par chale jana chahiye.
2. **Animation Performance**: Sliding effect dene ke liye CSS transition properties use karna taaki animation smoothly chale.
3. **Control States**: User jab next/prev buttons par click kare ya indicators dots par tap kare, toh correct slide active ho sake. Sath hi, automatic scroll (autoplay) pause-on-hover logic ke sath sync hona chahiye.

### Andar kya hota hai (Internal Working)

Browser rendering aur engine level optimization kaise hoti hai:
1. **GPU Acceleration**: Sliding ke liye hamesha `transform: translate3d(x, 0, 0)` use karna chahiye na ki CSS `left` property. `left` mutate karne se browser ko har frame par pure page ka layout (reflow) recalculate karna padta hai, jabki `transform` direct GPU Compositor Layer par execute hota hai jo smooth 60fps animations deta hai.
2. **Wrapping Indices**: Slides ko loop karne ke liye hum modulo operator (`%`) use karte hain. Index change logic: `(index + totalSlides) % totalSlides`. Isse index hamesha arrays bounds (0 se length-1) ke beech safe rehta hai.

### Code Example samjho

```javascript
class Carousel {
  constructor(containerId, images) {
    this.container = document.getElementById(containerId);
    this.images = images;
    this.currentIndex = 0;
    this.init();
  }
  showSlide(index) {
    this.currentIndex = (index + this.images.length) % this.images.length;
    const track = this.container.querySelector(".carousel-track");
    // GPU-accelerated transition
    track.style.transform = `translate3d(-${this.currentIndex * 100}%, 0, 0)`;
  }
}
```

**Line by line:**
- `(index + len) % len` — Modulo operation index boundaries ko wrap karta hai. Agar index negative ya extra length ho jaye, toh wapas ranges (0 to length-1) par index assign ho jata hai.
- `track.style.transform = ...` — Slide container track ko animates karta hai offset offsets translate karke, bina browser reflow trigger kiye.

### Sabse badi galti log karte hain

Slides ko toggle karne ke liye `left` style properties ka use karna, aur dynamic autoplay `setInterval` timer ko handle karte waqt hover pause event cleanup ignore kar dena. Autoplay intervals leak hone se infinite timers back-to-back start ho jaate hain aur slider uncontrolled behavior dikhata hai.

### Yaad rakhne ki cheez

**Animations ke liye hamesha GPU-accelerated CSS `transform` coordinate updates use karo aur dynamic timers ko safely `clearInterval` se remove karo.**
## 20. Completion Checklist

- [ ] I can write a hardware-accelerated Carousel component in Vanilla JS.
- [ ] I understand how to implement auto-play with pause-on-hover.
- [ ] I know how to make components screen-reader accessible.
- [ ] I can debug layout reflows in the performance panel.
