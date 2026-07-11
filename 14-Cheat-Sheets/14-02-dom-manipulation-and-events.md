# DOM Manipulation & Events

- **Difficulty Level**: Beginner to Intermediate
- **Estimated Reading Time**: 10 minutes
- **Prerequisites**: Understanding of DOM structures, HTML nodes, and event listeners
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a librarian organizing books in a reading hall:

- **DOM Selectors are search tools**:
  - `getElementById` is checking a catalog card by exact serial ID (instant).
  - `querySelector` is searching by descriptive query parameters (e.g. *"find the first green cover book published in 1990"*). It is slower but more flexible.
- **DOM Mutations are adding books**:
  - `textContent` is writing letters on a page.
  - `innerHTML` is pasting a printed article containing formatting tags.
  - `DocumentFragment` is arranging a pile of books on a cart in the back room before rolling the cart out and placing the pile on the shelves in one go (batch insertion), avoiding multiple walks back and forth.
- **Event Propagation is sound echoing in the hall**:
  - **Capture Phase**: Sound travels from the roof down to the floor.
  - **Bubble Phase**: The sound bounces back up from the floor to the roof.

In JavaScript, **DOM APIs** coordinate these library movements.

---

## 2. Problem

Developers often write slow DOM manipulation code (like calling `appendChild` inside loops, causing layout thrashing) or introduce event listener bugs (like missing bubbling limits or memory leaks).

---

## 3. Solution

This chapter serves as a **Quick-Reference Cheat Sheet** summarizing DOM query APIs, node mutation techniques, event bubbling phases, and event listener configurations.

---

## 4. Definition

- **DOM (Document Object Model)**: A programming interface for web documents, representing the page structure as a tree of objects.
- **Reflow / Layout**: The browser process of recalculating the geometry and positions of elements on a page.
- **Event Delegation**: A pattern where a single event listener is attached to a parent element to handle events bubbling up from its child elements.

---

## 5. Visualization

### Event Propagation Phases (Capture -> Target -> Bubble)

```
       1. Capture Phase (window down to target)
      ====================│====================
      │   Window          ▼                   │
      │     Body          │                   │
      │       Div         ▼                   │  3. Bubble Phase (target back up)
      │      ┌────────────┼─────────────┐     │ =================================
      │      │  [Button]  │  Target     │     │                                 ▲
      │      └────────────┼─────────────┘     │                                 │
      ====================│====================                                 │
                          └───────────────────(Runs target listeners)───────────┘
```

---

## 6. Internal Working

How the browser handles DOM operations:

1. **Reflow vs Paint**: When you mutate DOM node sizes or margins, the browser executes **Reflow** (recalculating element dimensions) followed by **Paint** (drawing pixels). Using `DocumentFragments` or caching layout measurements prevents layout thrashing.
2. **HTMLCollection vs NodeList**:
    - `getElementsByTagName` returns a **live** `HTMLCollection` that updates automatically when the DOM changes.
    - `querySelectorAll` returns a **static** `NodeList` that remains unchanged.

---

## 7. Code Examples

### Reference Card: DOM Selector Performance

| Selector Method | Returns | Type | Performance |
| :--- | :--- | :--- | :--- |
| **`getElementById`** | Single Element | Live | **Fastest** ($O(1)$ ID lookup map). |
| **`getElementsByClassName`** | `HTMLCollection` | Live | **Fast** ($O(N)$ class tag check). |
| **`querySelector`** | Single Element | Static | **Medium** (requires query parsing). |
| **`querySelectorAll`** | `NodeList` | Static | **Slower** (requires full query scan). |

```javascript
// Query Examples
const button = document.getElementById("submit-btn"); // Fast
const listItems = document.querySelectorAll(".item");   // Flexible
```

### Reference Card: DOM Mutation Methods

```javascript
// 1. Safe vs Unsafe text insertions
element.textContent = "<span>Hello</span>"; 
// Output: Renders literal text "<span>Hello</span>" safely (No XSS risk)

element.innerHTML = "<span>Hello</span>"; 
// Output: Parses HTML. Warning: Vulnerable to XSS if query string is unescaped!

// 2. Batch DOM Insertions (DocumentFragment)
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const li = document.createElement("li");
  li.textContent = `Row ${i}`;
  fragment.appendChild(li); // Appends to in-memory fragment (No reflow!)
}
document.getElementById("list").appendChild(fragment); // Triggers exactly 1 reflow!
```

### Reference Card: Event Listener Flags
Options object syntax for `element.addEventListener(type, listener, options)`.

| Option Flag | Type | Description |
| :--- | :--- | :--- |
| **`capture`** | Boolean | If `true`, the listener triggers during the capture phase instead of the bubbling phase. |
| **`once`** | Boolean | If `true`, the listener is automatically removed after its first invocation. |
| **`passive`** | Boolean | If `true`, indicates the listener will never call `preventDefault()`, allowing the browser to scroll the page immediately without waiting for JavaScript execution. |

```javascript
// Listener configuration example
window.addEventListener("scroll", handleScroll, { passive: true });
```

---

## 8. Dry Run

Let's dry run the execution path of event delegation:

```javascript
document.getElementById("menu").addEventListener("click", (e) => {
  if (e.target.classList.contains("item")) {
    console.log("Clicked:", e.target.textContent);
  }
});
```

- **User Action**: Clicks `<li class="item">Apple</li>` inside `<ul id="menu">`.
- **Propagation Flow**:
  - The click event is dispatched to the target `<li>` element.
  - No listeners are attached to the `<li>`, so the event enters the bubbling phase.
  - The event bubbles up to the `<ul id="menu">` element.
  - The click listener on the `<ul>` intercepts the event.
- **Callback Evaluation**:
  - `e.target` is the `<li>` element. `e.target.classList.contains("item")` returns `true`.
  - Console prints `"Clicked: Apple"`.
  - Event bubbles up to `body -> document -> window`.

---

## 9. Common Mistakes

- **Mistake 1: Appending child nodes inside loops.**
    ```javascript
    // Bad: Triggers 100 separate reflows and paint cycles!
    for (let i = 0; i < 100; i++) {
      const el = document.createElement("div");
      parent.appendChild(el); 
    }
    ```
    *Fix*: Use a `DocumentFragment` to batch appends in memory.

- **Mistake 2: Missing Named Listener cleanup.**
    ```javascript
    // Bad: Cannot remove anonymous function! Memory leak!
    window.addEventListener("resize", () => handleResize());
    window.removeEventListener("resize", () => handleResize()); // Fails!
    ```

---

## 10. Debugging

### Auditing Event Listeners in DevTools
To inspect listeners attached to an element:
1. Open Chrome DevTools.
2. Navigate to the **Elements** panel.
3. Select the target DOM node.
4. Click the **Event Listeners** tab in the sidebar panel:
    - It displays all listeners grouped by event type.
    - Check the `once`, `passive`, or `capture` flags for each listener.

---

## 11. Real World Usage

- **Performance Tuning**: Using passive scroll listeners to achieve smooth 60fps scrolling on touch and scroll-heavy pages.
- **Dynamic List Handling**: Implementing event delegation on dynamic data grids.

---

## 12. Interview Preparation

### Question: Explain the difference between `e.target` and `e.currentTarget` inside event callbacks
- **Wrong Answer**: They are identical references.
- **Good Answer**:
  - **`e.target`**: Refers to the exact, deepest DOM element that triggered the event (the origin of the click).
  - **`e.currentTarget`**: Refers to the element that is currently handling the event (the element where the event listener is attached).
  - In an event delegation setup on a `<ul>` list, if a user clicks an `<li>` element, `e.target` points to the `<li>`, while `e.currentTarget` points to the `<ul>`.

---

## 13. Practice

### Exercises
1. **Easy**: Write a script that attaches a click listener to a button that removes itself after one click using the `once` flag.
2. **Medium**: Write a script that benchmarks selector lookup speeds between `getElementById` and `querySelector` over 10,000 iterations.
3. **Hard**: Implement a nested list, attach a bubbling click handler to the root, and log the hierarchy path of tags clicked (e.g. `LI -> UL -> DIV`).

---

## 14. Mini Assignment

Write a function `appendBatchItems(containerId, count)` that appends a batch of list items using a `DocumentFragment` and measures the execution time.

---

## 15. Mini Project

Create a single-file DOM Playground application that visualizes event propagation phases (capturing and bubbling) on nested div elements using color highlights.

```html
<!-- dom-playground.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Event Propagation Playground</title>
  <style>
    div { padding: 20px; border: 2px solid #333; margin: 10px; border-radius: 4px; }
    #outer { background-color: #f9f9f9; }
    #inner { background-color: #e9e9e9; }
    #target-btn { padding: 10px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h2>DOM Event Propagation Logger</h2>
  <div id="outer">
    Outer Div
    <div id="inner">
      Inner Div
      <button id="target-btn">Click Target</button>
    </div>
  </div>
  <pre id="log-box"></pre>

  <script>
    const logBox = document.getElementById("log-box");
    function log(msg) { logBox.textContent += msg + "\n"; }

    const outer = document.getElementById("outer");
    const inner = document.getElementById("inner");
    const btn = document.getElementById("target-btn");

    // Capture Phase Listeners (option = true)
    outer.addEventListener("click", () => log("[Capture] Outer Div clicked"), true);
    inner.addEventListener("click", () => log("[Capture] Inner Div clicked"), true);

    // Bubble Phase Listeners (default = false)
    outer.addEventListener("click", () => log("[Bubble] Outer Div clicked"), false);
    inner.addEventListener("click", () => log("[Bubble] Inner Div clicked"), false);
    btn.addEventListener("click", () => log("[Target] Button clicked"), false);
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- Use **`getElementById`** for fast ID selections.
- Avoid **XSS vulnerabilities** by choosing `textContent` over `innerHTML`.
- Use **`DocumentFragment`** to batch DOM mutations and prevent layout thrashing.
- Event propagation consists of the **Capture phase**, **Target phase**, and **Bubble phase**.
- **Event Delegation** manages events on dynamic child elements using a single parent listener.

---

## 17. Quiz

1. Does `querySelectorAll` return a static or live collection?
2. What is the difference between `element.remove()` and `parent.removeChild(child)`?
3. Why does setting `{ passive: true }` improve page scrolling performance?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will study the **Async Patterns Cheat Sheet**. We will explore Promise combinators, execution timelines, and error handling.

---


## 19. 🇮🇳 Hinglish Summary

- **Purpose**: DOM API quick reference — selection, manipulation, event methods ek saath.
- **Key Methods**: querySelector, createElement, ppendChild, classList.toggle, ddEventListener — ye sab DOM work ke backbone hain.
- **Key Tip**: Event delegation pattern yaad rakho — parent pe ek listener lagao, children pe alag alag nahi.
- **Common Mistake**: Cheat sheet mein sirf method names dekho — arguments aur return values bhi matter karte hain, MDN se verify karo.
## 19. Completion Checklist

- [ ] I understand selector performance profiles.
- [ ] I can write safe, non-XSS DOM mutations.
- [ ] I can use DocumentFragments to batch DOM updates.
- [ ] I can explain capturing and bubbling event propagation.
