# Event Flow

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of DOM hierarchy and selection
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you live in a multi-story apartment building:

- **Capturing Phase is like a delivery driver coming down from the top floor**: A package arrives at the front desk on the roof/penthouse (Window). The delivery driver walks down through each floor corridor (HTML -> Body -> Wrapper Div) until they reach your specific apartment door (Target Element).
- **Target Phase is handing you the package**: You sign for the package at your door.
- **Bubbling Phase is the driver walking back up**: Once finished, the driver walks back up through the same floors (Wrapper Div -> Body -> HTML -> Window) to exit.
- **Event Delegation is like having a central mail room**: Instead of hiring 100 security guards to stand outside each individual apartment door waiting for deliveries (binding 100 event listeners), you hire 1 guard to sit at the front lobby desk (parent element). Whenever a delivery package arrives for any room, the guard handles it and directs the delivery based on the room number labeled on the box (`event.target`).

In JavaScript, this event routing system is **Event Flow**.

---

## 2. Problem

Users click buttons, submit forms, hover menus, and scroll containers.

If you had to bind individual click handlers to every single cell inside a 10,000-row table:
- Memory consumption would shoot up in the Heap.
- Adding or deleting a row dynamically would require you to manually bind or clean up event listeners, creating state bugs.

---

## 3. Solution

JavaScript utilizes **Event Flow** (Bubbling and Capturing) and the **Event Delegation** pattern.

Because events "bubble up" from the target child to their parent elements naturally, you can bind a single listener to a parent container. The parent intercepts events from all current and future children elements, querying the event target details dynamically.

---

## 4. Definition

- **Capturing Phase (Trickling)**: The phase where the event propagates from the top-level Window down through ancestors to the target element.
- **Bubbling Phase**: The phase where the event propagates from the target element up through its ancestors to the top-level Window.
- **Event Delegation**: A performance pattern of attaching a single event listener to a parent container to manage events for all children elements (present and future).
- **`event.target`**: The actual DOM element that initiated the event (the origin node).
- **`event.currentTarget`**: The DOM element that the event listener is currently attached to.

---

## 5. Visualization

### Event Capture and Bubbling Flow

When you click the `<td>` cell inside a table layout:

```
Window                          Window (Phase 3: Bubbling UP)
  |                               ^
  v (Phase 1: Capture DOWN)       |
HTML                            HTML
  |                               ^
  v                               |
Body                            Body
  |                               ^
  v                               |
Table                           Table
  |                               ^
  v                               |
 <td>  <--- (Phase 2: Target) --- <td>
```

---

## 6. Internal Working

When a user triggers an event (e.g. clicking a link):

1. **Event Generation**: The browser's input manager creates a C++ event record object.
2. **Capturing Run**: The engine starts at the `Window` object, traversing down the target node's ancestry. If any intermediate element has a capturing listener registered (`{ capture: true }`), V8 runs it.
3. **Target Execution**: The engine executes listeners bound directly to the target element.
4. **Bubbling Run**: The engine reverses direction, traveling back up to the `Window`. It executes any standard bubbling listeners (default behavior) bound to parent nodes.
5. **Garbage Collection**: Once the event finishes propagating, V8 disposes of the Event object, unless it was retained in user scopes.

---

## 7. Code Examples

### Bad Practice: Binding Listeners in Loops
Binding event listeners to every list item individually wastes memory and breaks when items are added dynamically.

```javascript
// Bad: Creates 1000 separate listener functions in memory!
const listItems = document.querySelectorAll(".item");

listItems.forEach(item => {
  item.addEventListener("click", function(e) {
    console.log("Clicked item:", item.textContent);
  });
});
// BUG: If you append an item dynamically later, clicking it does nothing!
```

### Good Practice: Basic Event Delegation
Bind a single listener to the parent element, intercepting bubbled clicks.

```javascript
// Good: Single listener on parent element
const listContainer = document.getElementById("list-container");

listContainer.addEventListener("click", function(e) {
  // Check if the clicked target matches our item class
  if (e.target && e.target.classList.contains("item")) {
    console.log("Clicked item:", e.target.textContent);
  }
});
// Safe: Dynamically added items auto-trigger this callback!
```

### Best Practice: Robust Event Delegation with `closest()`
Use `element.closest()` to ensure clicks on nested child elements (like icons or spans inside a button) still resolve to the target container correctly.

```javascript
// Best Practice: Handles nested DOM child clicks within targets
const tableBody = document.getElementById("table-body");

tableBody.addEventListener("click", function(e) {
  // Find the nearest parent row button, even if they clicked a nested span or icon
  const actionButton = e.target.closest(".action-btn");
  
  if (actionButton && this.contains(actionButton)) {
    const rowId = actionButton.dataset.rowId;
    handleRowAction(rowId);
  }
});
```

---

## 8. Dry Run

Let's dry run the behavior of `event.stopPropagation()` vs. `event.preventDefault()`:

```html
<div id="parent">
  <a href="https://google.com" id="child">Link</a>
</div>
```

```javascript
const parent = document.getElementById("parent");
const child = document.getElementById("child");

parent.addEventListener("click", () => console.log("Parent Clicked"));
child.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("Child Clicked");
});
```

### Step-by-Step State (User clicks the link)
- **Phase 1: Capturing**: Event travels Window -> Document -> HTML -> Body -> Parent -> Child. (No capture listeners registered).
- **Phase 2: Target**: Executes child's listener:
  - `e.preventDefault()`: Tells the browser not to navigate to `https://google.com` (prevents default behavior).
  - `e.stopPropagation()`: Stops the event from propagating further up the tree.
  - Logs `"Child Clicked"`.
- **Phase 3: Bubbling**:
  - Normally, the click event would bubble up to `parent` and log `"Parent Clicked"`.
  - Because `stopPropagation` was called, the bubbling phase is halted immediately.
  - Parent listener is skipped. Logs: `"Child Clicked"` only, page remains on current URL.

---

## 9. Common Mistakes

- **Mistake 1: Confusing `event.target` with `event.currentTarget`.**
  - `event.target`: The exact element clicked (could be a nested `<i>` tag).
  - `event.currentTarget`: The element holding the listener (the parent wrapper).
- **Mistake 2: Calling `stopPropagation()` blindly.**
    This breaks global analytics trackers or click-away popups that listen to clicks on the `document` level to close modals.

---

## 10. Debugging

### Monitoring Event Listeners in DevTools
To inspect what events are bound to an element:
1. Open Chrome DevTools.
2. Select an element in the **Elements** tab.
3. On the bottom panel, navigate to the **Event Listeners** tab:
    - Locate event categories (e.g. `click`).
    - Expand to see bound callback references, namespaces, and whether they are configured for `capture` or `passive`.
    - Click the file link to jump directly to the source code line binding that listener.

---

## 11. Real World Usage

- **Dropdown Close Handlers**: Attaching a click listener to the `document` level. When a user clicks anywhere on the screen, the event bubbles to the document, closing the open menu unless `event.target` is the dropdown button.
- **Analytics Trackers**: Global event delegation scripts on the `body` that capture all outbound link clicks automatically.

---

## 12. Interview Preparation

### Question: What is the difference between `event.stopPropagation()` and `event.stopImmediatePropagation()`?
- **Wrong Answer**: They are identical API methods.
- **Good Answer**:
  - **`stopPropagation()`** prevents the event from propagating (bubbling or capturing) to parent elements. However, if there are multiple click listeners bound to the *same* target element, the remaining listeners on that element will still execute.
  - **`stopImmediatePropagation()`** stops propagation to parent elements AND immediately halts execution of any other listeners bound to the same element.

---

## 13. Practice

### Exercises
1. **Easy**: Create a box containing a link. Add click handlers to both. Prevent navigation using `preventDefault()`.
2. **Medium**: Write a script implementing event delegation on a table body (`<tbody>`), logging the row index of the clicked row.
3. **Hard**: Implement a nested event sequence. Register listeners for both capturing and bubbling phases on three nested divs. Log their execution sequence.

---

## 14. Mini Assignment

Write a function `delegate(parent, selector, event, handler)` that abstracts event delegation, attaching the event to the parent and executing the handler only if the target matches the CSS selector.

---

## 15. Mini Project

Create a dynamic tab navigator dashboard component `TabNavigator`. It should use a single click event listener on the tab container (Event Delegation) to swap active styles and load pane components dynamically, even if new tab items are appended later.

```javascript
// event-delegation-tabs.js
class TabNavigator {
  constructor(containerId, contentId) {
    this.tabsContainer = document.getElementById(containerId);
    this.contentPane = document.getElementById(contentId);
    this.init();
  }

  init() {
    if (!this.tabsContainer) return;

    // Single listener on parent container
    this.tabsContainer.addEventListener("click", (e) => {
      const tabButton = e.target.closest(".tab-btn");
      
      // Ensure the button is inside our tabs container
      if (tabButton && this.tabsContainer.contains(tabButton)) {
        this.activateTab(tabButton);
      }
    });
  }

  activateTab(activeButton) {
    // 1. Remove active state from other tabs
    const buttons = this.tabsContainer.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    // 2. Add active state to clicked tab
    activeButton.classList.add("active");

    // 3. Load corresponding tab panel content
    const tabKey = activeButton.dataset.tabTarget;
    if (this.contentPane) {
      this.contentPane.textContent = `Active Tab Panel: [${tabKey.toUpperCase()}]`;
    }
    console.log(`Swapped tab view to: ${tabKey}`);
  }
}

// Test case (requires DOM components)
// const dashboardTabs = new TabNavigator("tab-bar", "tab-content");
```

---

## 16. Chapter Summary

- Event Flow consists of **Capturing**, **Target**, and **Bubbling** phases.
- Events travel down during **Capturing** and bubble back up during **Bubbling**.
- **`stopPropagation()`** halts the event bubble path.
- **Event Delegation** attaches a single listener to a parent node, optimizing performance and simplifying dynamic updates.

---

## 17. Quiz

1. Which phase of event flow runs first?
2. Does calling `e.stopPropagation()` prevent the default action (like form submission)?
3. What property references the actual clicked element?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Event Listeners**. We will explore how to bind event handlers, how to clean them up to prevent leaks, and look at modern options like `once` and `passive` parameters.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Event handlers kahan aur kab fire hote hain — bubbling vs capturing samjhe bina bugs aate hain.
- **Concept**: Events teen phases mein travel karte hain: Capture (top → target), Target, Bubble (target → top).
- **Key Pattern**: event.stopPropagation() bubbling rokta hai; event.preventDefault() default browser action rokta hai.
- **Common Mistake**: stopPropagation() aur preventDefault() ko mix karna — dono alag kaam karte hain; ek bubbling rokta hai, dusra browser default.
## 19. Completion Checklist

- [ ] I can describe capturing versus bubbling phases.
- [ ] I understand how to write event delegation scripts using `closest()`.
- [ ] I know the difference between `event.target` and `event.currentTarget`.
- [ ] I can inspect registered listeners in Chrome DevTools.
