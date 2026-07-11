# Star Rating

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: DOM Event handling, CSS selectors, and basic keyboard events
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a customer filling out a feedback card at a restaurant:

- **The Easel holds 5 blank stars**: This is your rating container.
- **Hovering is hovering your pen over a star**: If you hover your pen over the 3rd star, your eyes naturally trace the 1st, 2nd, and 3rd stars, previewing what a 3-star rating looks like. When you pull your pen away without touching the paper (mouse leave), the stars return to their previous state.
- **Clicking is stamping the rating**: When you press the pen down on the 4th star (click), you stamp the card. The 1st, 2nd, 3rd, and 4th stars are now locked in gold. Pulling your pen away does not clear them; they are permanently marked.
- **Keyboard navigation is using arrow keys for accessibility**: If you have difficulty holding a pen, you use a tab card pointer. Pressing the Right Arrow moves the marker to the next star, and pressing Enter stamps it.

In JavaScript, a **Star Rating** component implements this interactive lifecycle.

---

## 2. Problem

Poorly implemented star rating widgets often:
- Lose state synchronization, failing to highlight the correct stars on mouse leave.
- Mutate DOM classes inline individually inside nested loops, causing performance issues.
- Lack keyboard controls and ARIA labels, making the widget inaccessible.

---

## 3. Solution

We design a **State-Driven, Accessible Star Rating Component**:
1. **Dual State Tracking**: `activeRating` (locked value) and `hoveredRating` (temporary preview value).
2. **CSS Class Orchestration**: Toggling class `highlight` dynamically based on state indices.
3. **Custom Event Dispatches**: Emitting a custom `rating-change` event to inform parent containers of updates.
4. **A11y (Accessibility) Bindings**: ARIA roles, tabindex, and Arrow key navigation support.

---

## 4. Definition

- **Star Rating**: A user interface component that allows users to select a rating value from a predefined range (usually 1 to 5 stars).
- **Custom Event**: A developer-defined DOM event triggered using `dispatchEvent()` to pass custom payloads to other application parts.

---

## 5. Visualization

### Star Rating Interaction Logic

If `activeRating = 2` (Stars 1 and 2 filled):

```
   State 1: Initial (Rating = 2)
   [ ★ ]  [ ★ ]  [ ☆ ]  [ ☆ ]  [ ☆ ]
  
   State 2: Hovering over Star 4 (Preview)
   [ ★ ]  [ ★ ]  [ ★ ]  [ ★ ]  [ ☆ ]  <--- Temporary hover state active.
  
   State 3: Mouse Leave (Reverts to Rating = 2)
   [ ★ ]  [ ★ ]  [ ☆ ]  [ ☆ ]  [ ☆ ]
  
   State 4: Clicking Star 3 (Locked to 3)
   [ ★ ]  [ ★ ]  [ ★ ]  [ ☆ ]  [ ☆ ]
```

---

## 6. Internal Working

How the rating engine coordinates events:

1. **State Layering**: The renderer calculates the highlighted index boundary:
    `const limit = hoveredRating !== 0 ? hoveredRating : activeRating;`
    This ensures that hover previews override the active rating, and mouse leaves restore the active rating.
2. **Custom Payload Dispatch**: When a user locks a rating, the widget triggers:
    `new CustomEvent("rating-change", { detail: { rating: value } })`.
    This propagates the update to parent elements.

---

## 7. Code Examples

### HTML & CSS Foundation
Build a semantic widget with keyboard focus indicators.

```html
<!-- HTML Structure -->
<div class="star-rating-container" id="feedback-rating" 
     role="slider" aria-valuenow="0" aria-valuemin="1" aria-valuemax="5" 
     aria-label="Rate your experience" tabindex="0">
  <span class="star" data-value="1" role="button" aria-label="1 Star">&#9733;</span>
  <span class="star" data-value="2" role="button" aria-label="2 Stars">&#9733;</span>
  <span class="star" data-value="3" role="button" aria-label="3 Stars">&#9733;</span>
  <span class="star" data-value="4" role="button" aria-label="4 Stars">&#9733;</span>
  <span class="star" data-value="5" role="button" aria-label="5 Stars">&#9733;</span>
</div>
```

```css
/* CSS Styles */
.star-rating-container {
  display: inline-flex;
  gap: 5px;
  cursor: pointer;
  outline: none;
}
.star-rating-container:focus {
  outline: 2px solid blue; /* Focus indicator for accessibility */
}
.star {
  font-size: 32px;
  color: #ccc; /* Default grey stars */
  transition: color 0.15s ease-in-out;
}
.star.highlight {
  color: gold; /* Gold highlighted stars */
}
```

### The Star Rating Controller Class
Write a Vanilla JS class that coordinates hover highlights, clicks, keypress events, and custom events.

```javascript
// star-rating.js
class StarRating {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.stars = Array.from(this.container.querySelectorAll(".star"));

    this.activeRating = 0;   // Locked rating
    this.hoveredRating = 0;  // Temporary hover preview rating

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  // 1. Render loop: sets highlights based on current state
  render() {
    const limit = this.hoveredRating !== 0 ? this.hoveredRating : this.activeRating;
    
    this.stars.forEach(star => {
      const val = parseInt(star.dataset.value);
      // If val is less than or equal to the limit, highlight it
      star.classList.toggle("highlight", val <= limit);
    });

    this.container.setAttribute("aria-valuenow", this.activeRating);
  }

  setRating(value) {
    this.activeRating = value;
    this.render();

    // 2. Dispatch custom event to notify parent containers
    const event = new CustomEvent("rating-change", {
      detail: { rating: this.activeRating }
    });
    this.container.dispatchEvent(event);
  }

  // 3. Events bindings
  bindEvents() {
    // Mouse hover detections
    this.container.addEventListener("mouseover", (e) => {
      const star = e.target.closest(".star");
      if (star) {
        this.hoveredRating = parseInt(star.dataset.value);
        this.render();
      }
    });

    this.container.addEventListener("mouseleave", () => {
      this.hoveredRating = 0;
      this.render(); // Reverts to activeRating
    });

    // Click selection
    this.container.addEventListener("click", (e) => {
      const star = e.target.closest(".star");
      if (star) {
        this.setRating(parseInt(star.dataset.value));
      }
    });

    // 4. Keyboard Arrow Accessibility
    this.container.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const nextVal = Math.min(5, this.activeRating + 1);
        this.setRating(nextVal);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        const prevVal = Math.max(1, this.activeRating - 1);
        this.setRating(prevVal);
      }
    });
  }
}
```

---

## 8. Dry Run

Let's dry run the user pressing the Right Arrow key when `activeRating = 2`:

- **Initial state**: `activeRating = 2`, `hoveredRating = 0`.
- **User Action**: Press `"ArrowRight"` on the focused container.
- **Event Handler Execution**:
  - `e.key` is `"ArrowRight"`. Runs `e.preventDefault()`.
  - Calculates: `Math.min(5, activeRating + 1)` -> `Math.min(5, 3)` = `3`.
  - Calls `setRating(3)`.
- **setRating(3)**:
  - Sets `activeRating = 3`.
  - Runs `render()`.
  - Loop boundary evaluates: `limit` = `3`.
    - **val = 1, 2, 3**: Class `"highlight"` added.
    - **val = 4, 5**: Class `"highlight"` removed.
  - Updates `aria-valuenow="3"`.
  - Dispatches custom `rating-change` event containing `{ rating: 3 }` to listeners.
  - UI updates.

---

## 9. Common Mistakes

- **Mistake 1: Binding click and mouseover listeners to each individual star element.**
    Using event delegation on the parent container `this.container` is more memory efficient and cleaner.
- **Mistake 2: Missing the `tabindex="0"` attribute.**
    Without `tabindex`, keyboard users cannot focus the rating container, making arrow key navigations useless.

---

## 10. Debugging

### Tracing custom event dispatches
If parent elements are not receiving rating updates:
1. Open Chrome DevTools Console.
2. Run:
    `monitorEvents(document.getElementById('feedback-rating'))`.
3. Click a star on your widget.
4. Verify that a `CustomEvent` named `"rating-change"` is logged in the console, and inspect its `detail` payload to verify the rating value is correct.

---

## 11. Real World Usage

- **E-Commerce Review Widgets**: Product reviews pages allowing buyers to submit star ratings.
- **Feedback Questionnaires**: In-app popups asking users to rate features or support.

---

## 12. Interview Preparation

### Question: Why are Custom Events useful in frontend component development?
- **Wrong Answer**: Because they run faster than standard browser clicks.
- **Good Answer**: Custom Events are useful because they promote **decoupling and encapsulation**.
  - The star rating component does not need to know which API endpoint is called or how the UI updates when a user selects a rating.
  - It only manages its internal hover and selection states. When a selection is made, it dispatches a custom event (e.g. `'rating-change'`).
  - Parent application scripts can listen for this event:
      `widget.addEventListener('rating-change', handleEvent)`
      and handle the business logic independently, keeping concerns separated.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic HTML rating container and change a status text label when a star is clicked.
2. **Medium**: Add a half-star rating option (allowing users to click and select decimal ratings like `3.5`).
3. **Hard**: Implement a rating description popover overlay (e.g. hovering over Star 1 shows "Poor", Star 5 shows "Excellent").

---

## 14. Mini Assignment

Write a function `clearRating()` that resets both active and hover states to 0, updating the UI.

---

## 15. Mini Project

Create a single-file interactive Feedback Application that integrates your Star Rating component, updates dynamic rating text metrics, and logs custom event payloads.

```html
<!-- rating-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Star Rating Sandbox</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .star-rating { display: inline-flex; gap: 5px; cursor: pointer; outline: none; }
    .star { font-size: 36px; color: #ccc; }
    .star.highlight { color: gold; }
    .star-rating:focus { outline: 2px solid blue; }
  </style>
</head>
<body>
  <div id="rating-widget">
    <h3>Rate this Article</h3>
    <div class="star-rating" id="stars" role="slider" aria-valuenow="0" aria-valuemin="1" aria-valuemax="5" tabindex="0">
      <span class="star" data-value="1">&#9733;</span>
      <span class="star" data-value="2">&#9733;</span>
      <span class="star" data-value="3">&#9733;</span>
      <span class="star" data-value="4">&#9733;</span>
      <span class="star" data-value="5">&#9733;</span>
    </div>
    <p id="rating-text">Click a star to submit your review</p>
  </div>

  <script>
    // StarRating class integration
    class InteractiveRating {
      constructor(id, textId) {
        this.el = document.getElementById(id);
        this.text = document.getElementById(textId);
        this.stars = Array.from(this.el.querySelectorAll(".star"));
        this.rating = 0;
        this.hover = 0;
        this.init();
      }
      init() {
        this.el.addEventListener("mouseover", (e) => {
          const star = e.target.closest(".star");
          if (star) { this.hover = parseInt(star.dataset.value); this.render(); }
        });
        this.el.addEventListener("mouseleave", () => { this.hover = 0; this.render(); });
        this.el.addEventListener("click", (e) => {
          const star = e.target.closest(".star");
          if (star) {
            this.rating = parseInt(star.dataset.value);
            this.text.textContent = `You submitted a ${this.rating}-star rating!`;
            this.render();
          }
        });
        this.render();
      }
      render() {
        const limit = this.hover !== 0 ? this.hover : this.rating;
        this.stars.forEach(s => s.classList.toggle("highlight", parseInt(s.dataset.value) <= limit));
      }
    }
    new InteractiveRating("stars", "rating-text");
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- Track **`activeRating`** and **`hoveredRating`** to manage selections and hover states correctly.
- Use **event delegation** on the parent container to handle events efficiently.
- Emit custom events using **`dispatchEvent(new CustomEvent(...))`** to notify parent components of changes.
- Enforce **accessibility** using roles, tabindex, and Arrow key listeners.

---

## 17. Quiz

1. What is the purpose of `tabindex="0"` on the rating container?
2. How does a custom event pass data payloads?
3. Why is `e.preventDefault()` used inside Arrow key handlers?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Typeahead / Autocomplete** component. We will explore debouncing event triggers, suggestion list overlays, keyboard selection indices, and highlight match templates.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Star Rating Widget machine coding rounds ka ek standard, highly interactive problem hai. Isme hume do main states ko manage aur sync karna hota hai:
1. **Hover Preview State**: Jab user stars ke upar mouse move kare, toh active state temporarily mouse hover positions tak dikhni chahiye.
2. **Locked Click State**: Jab user kisi star par click kare, toh rating lock ho jani chahiye, aur mouse out hone par bhi rating maintain rehni chahiye.
Sath hi, hum custom events use karte hain taaki selection ke baad current rating value parent component ko notify kiye ja sake, aur accessibility keyboard controls (Arrow keys se value badhana) implement kiye ja sakein.

### Andar kya hota hai (Internal Working)

Component states coordination:
1. **Hover over Click Priority**: Render loops mein hum hover rating ko click rating ke upar priority dete hain: `const activeStars = this.hoverRating !== 0 ? this.hoverRating : this.rating`.
2. **Keyboard focus propagation**: Keyboard event listeners check karte hain aur left/right arrow ticks ko values increments/decrements se map karte hain, fir new score value update karke render call trigger karte hain.

### Code Example samjho

```javascript
class StarRating {
  constructor(containerId, count = 5) {
    this.container = document.getElementById(containerId);
    this.rating = 0;
    this.hoverRating = 0;
    this.init();
  }
  highlightStars(value) {
    const stars = this.container.querySelectorAll(".star");
    stars.forEach(star => {
      const starValue = parseInt(star.getAttribute("data-value"));
      star.classList.toggle("active", starValue <= value);
    });
  }
}
```

**Line by line:**
- `this.rating = 0` — Click locked rating score value track karta hai.
- `this.hoverRating = 0` — Temporary mouse-over rating score pointer track karta hai.
- `highlightStars(value)` — Saare star DOM nodes par iterate karta hai, unke data attributes verify karta hai, aur active CSS classes toggle karta hai.

### Sabse badi galti log karte hain

Mouse leave event trigger hone par hover state (`this.hoverRating = 0`) reset na karna aur locked clicked state (`this.rating`) ko restore na karna. Is wajah se click karne ke baad jab mouse side mein jata hai, toh stars clean up nahi hote aur UI rating representation break ho jati hai. Hamesha mouseleave listener configure karo.

### Yaad rakhne ki cheez

**Hover events ko temporarily active ratings par preference do, aur mouse out event aane par hamesha click-locked original values ko restore karo.**
## 20. Completion Checklist

- [ ] I can write a complete, accessible Star Rating component.
- [ ] I understand how to coordinate hover and click states.
- [ ] I know how to dispatch custom events to pass data.
- [ ] I know how to implement keyboard arrow navigation.
