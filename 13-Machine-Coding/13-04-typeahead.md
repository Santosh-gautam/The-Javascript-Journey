# Typeahead / Autocomplete

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Completion of Chapter 11-02 (debounced search spec), understanding of event bubbling, DOM indices, and string formatting
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a customer service clerk at an airport information desk:

- **The Input Field is a guest writing a destination on a notepad**: They start writing: *"L...o..."*
- **The Debouncer is pausing before answering**: You wait for a 300ms pause in their writing before looking up flights.
- **The Suggestion Overlay is a display monitor sliding up on your desk**: You slide up a screen showing:
  - **Lo**ndon
  - **Lo**s Angeles
  - **Lo**grono
- **String Match Highlighting is printing the matched letters in bold gold**: You highlight the matched letters **Lo** so the guest can visually verify their query match.
- **Keyboard Navigation is using the arrow selector keypads**: Instead of picking up a mouse, the guest presses the Down Arrow key on the desk. A yellow selection ring slides down from London to Los Angeles. Pressing Enter confirms the choice, and pressing Escape slides the screen away.

In JavaScript, a **Typeahead widget** implements this autocomplete interaction.

---

## 2. Problem

Junior developers often write autocomplete boxes by:
- Querying APIs on every keystroke, causing severe network congestion and UI stuttering.
- Forgetting to support keyboard controls, making the list unusable without a mouse.
- Failing to close the suggestions list when a user clicks outside the component, cluttering the UI.

---

## 3. Solution

We design a **State-Driven, Accessible Typeahead Component**:
1. **Debounced input**: Rate-limiting queries to 300ms.
2. **Highlight Match renderer**: Using regex or substring operations to bold matching text query characters.
3. **Keyboard index coordinate**: Tracking active suggestion indexes using Arrow keys.
4. **Click-Outside Closer**: Using event bubbling checks on the document to dismiss suggestion panels.

---

## 4. Definition

- **Typeahead / Autocomplete**: A user interface design pattern where a text input field lists matching suggestion terms based on the user's typing.
- **Click-Outside Closer**: An event handler attached to the document root that closes open dropdown menus if the user clicks elements outside the component.

---

## 5. Visualization

### Typeahead Keyboard Selection State

When typing `"ap"`, suggestion list length = `3`, active index = `1` (apricot selected):

```
     Input Field: [ ap                             ]
                    │
                    ▼
     Suggestions Overlay:
     ┌─────────────────────────────────────────────┐
     │ 1. <b>ap</b>ple                                  │ (index = 0)
     ├─────────────────────────────────────────────┤
     │ 2. <b>ap</b>ricot                              │ (index = 1, class: "selected")
     ├─────────────────────────────────────────────┤
     │ 3. <b>ap</b>ricot-seeds                        │ (index = 2)
     └─────────────────────────────────────────────┘
```

Pressing Enter populates the input field with `"apricot"` and closes the overlay.

---

## 6. Internal Working

How the typeahead engine manages states:

1. **Substring Highlighting**: To highlight matches, the engine splits strings or uses RegExp:
    ```javascript
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex characters
    const regex = new RegExp(`(${escaped})`, "gi");
    const html = text.replace(regex, "<b>$1</b>");
    ```
    This wraps matching query characters in bold tags safely.
2. **Focus Management**: The engine binds `keydown` on the input element. If the suggestion dropdown is visible:
    - `"ArrowDown"` increments `activeIndex`.
    - `"ArrowUp"` decrements `activeIndex`.
    - `"Enter"` triggers selection of the active index.
    - `"Escape"` closes the dropdown.

---

## 7. Code Examples

### HTML & CSS Foundation
Build a semantic widget wrapper.

```html
<!-- HTML Structure -->
<div class="typeahead" id="search-autocomplete">
  <input type="text" class="typeahead-input" placeholder="Search fruits..." 
         aria-autocomplete="list" aria-controls="autocomplete-list" aria-expanded="false">
  <ul id="autocomplete-list" class="typeahead-list" role="listbox">
    <!-- Suggestions are injected here -->
  </ul>
</div>
```

```css
/* CSS Styles */
.typeahead {
  position: relative;
  width: 300px;
}
.typeahead-input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.typeahead-list {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  display: none; /* Hidden by default */
  z-index: 10;
}
.typeahead-list.active {
  display: block;
}
.typeahead-item {
  padding: 8px;
  cursor: pointer;
}
.typeahead-item.selected {
  background-color: #f0f0f0; /* Highlighted keyboard item */
}
.typeahead-item b {
  color: orange; /* Custom matched text color */
}
```

### The Typeahead Controller Class
Write a Vanilla JS class that coordinates debouncing, keyboard navigation, matches highlighting, and dismiss actions.

```javascript
// typeahead-controller.js
class Typeahead {
  constructor(elementId, fetchSuggestions) {
    this.container = document.getElementById(elementId);
    this.input = this.container.querySelector(".typeahead-input");
    this.list = this.container.querySelector(".typeahead-list");

    this.fetchSuggestions = fetchSuggestions; // API or mock resolver function
    this.suggestions = [];
    this.activeIndex = -1; // -1 indicates no item highlighted by keyboard yet

    this.init();
  }

  init() {
    this.bindEvents();
  }

  // 1. Debounced handler
  debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async handleInput(query) {
    if (!query) {
      this.close();
      return;
    }

    try {
      this.suggestions = await this.fetchSuggestions(query);
      this.activeIndex = -1;
      this.render();
    } catch (error) {
      console.error(error);
    }
  }

  // 2. Render dropdown items with highlighted matches
  render() {
    if (this.suggestions.length === 0) {
      this.close();
      return;
    }

    const query = this.input.value.trim();
    
    this.list.innerHTML = this.suggestions.map((item, index) => {
      const isSelected = index === this.activeIndex;
      const highlightedText = this.highlightMatch(item, query);

      return `
        <li class="typeahead-item ${isSelected ? "selected" : ""}" 
            data-index="${index}" role="option" aria-selected="${isSelected}">
          ${highlightedText}
        </li>
      `;
    }).join("");

    this.list.classList.add("active");
    this.input.setAttribute("aria-expanded", "true");
  }

  highlightMatch(text, query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, "<b>$1</b>");
  }

  selectItem(index) {
    const selectedText = this.suggestions[index];
    if (selectedText) {
      this.input.value = selectedText;
      this.close();
    }
  }

  close() {
    this.list.classList.remove("active");
    this.list.innerHTML = "";
    this.suggestions = [];
    this.activeIndex = -1;
    this.input.setAttribute("aria-expanded", "false");
  }

  // 3. Event Listener Orchestrator
  bindEvents() {
    const debouncedInput = this.debounce((e) => {
      this.handleInput(e.target.value.trim());
    }, 300);

    this.input.addEventListener("input", debouncedInput);

    // Keyboard Arrow Controls
    this.input.addEventListener("keydown", (e) => {
      const listActive = this.list.classList.contains("active");
      if (!listActive) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
        this.render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.activeIndex = (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
        this.render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (this.activeIndex >= 0) {
          this.selectItem(this.activeIndex);
        }
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    // Click selection via delegation
    this.list.addEventListener("click", (e) => {
      const item = e.target.closest(".typeahead-item");
      if (item) {
        this.selectItem(parseInt(item.dataset.index));
      }
    });

    // Click outside Closer
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
  }
}
```

---

## 8. Dry Run

Let's dry run the user pressing the "Down Arrow" key:

- **Initial state**: `suggestions = ["apple", "apricot"]`, `activeIndex = -1` (dropdown is active).
- **User Action**: Presses `"ArrowDown"`.
- **Event Handler Execution**:
  - `e.key` is `"ArrowDown"`. Runs `e.preventDefault()`.
  - Calculates: `(activeIndex + 1) % length` -> `(-1 + 1) % 2` = `0`.
  - Sets `activeIndex = 0`.
  - Runs `render()`.
- **Render Output**:
  - Item at index 0 (`"apple"`) receives class `"selected"` and `aria-selected="true"`.
  - Item at index 1 remains plain.
  - Dropdown visual updates to highlight `"apple"`.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting to sanitize regex characters in the search query.**
    If the user types a question mark `?` or a dot `.`, passing it directly to `new RegExp(query)` will throw a syntax error or match characters incorrectly. Always escape regex characters first: `query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
- **Mistake 2: Missing the click outside handler.**
    Failing to close the suggestions list when a user clicks elsewhere on the page clutters the interface.

---

## 10. Debugging

### Tracing Keyboard Indexes in Variables Panel
If pressing Arrow keys fails to update highlights:
1. Set a breakpoint inside your input keydown listener.
2. Trigger the Down Arrow keypress.
3. Inspect the value of `this.activeIndex` in the variables pane.
4. Verify that it changes from `-1` to `0` to `1`, and check if your `render()` function is executing and adding the `"selected"` class to the matching DOM element.

---

## 11. Real World Usage

- **Search Autocomplete Components**: E-commerce stores search bars.
- **Flight Booking Portals**: Dynamic location suggestion selectors.

---

## 12. Interview Preparation

### Question: Explain how matching query highlighting works inside autocomplete search lists
- **Wrong Answer**: It dynamically parses HTML tags.
- **Good Answer**: Match highlighting works by parsing the suggestions array strings against the search query string.
    1. First, we sanitize the search query string to escape any special regular expression characters.
    2. We build a case-insensitive regular expression: `new RegExp('(' + escapedQuery + ')', 'gi')`.
    3. We replace the matches inside the suggestion string with bold HTML tags: `text.replace(regex, '<b>$1</b>')`.
    4. We render this compiled HTML template into the suggestion list, displaying the matched query characters in bold.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic HTML text input, display matching static suggestions below it, and select an item on click.
2. **Medium**: Add a suggestion count indicator to the dropdown list (e.g. "3 results found").
3. **Hard**: Implement a remote API fetch suggestion logic containing debounce rates, local Map caching, and race prevention checks.

---

## 14. Mini Assignment

Write a function `clearTypeaheadInput()` that clears the text field, hides the dropdown menu, and resets active pointers.

---

## 15. Mini Project

Create a complete single-file interactive Typeahead application that implements debouncing, regex match highlights, click-outside closures, and keyboard controls.

```html
<!-- typeahead-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Typeahead Sandbox</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .autocomplete { position: relative; width: 250px; }
    .autocomplete-input { width: 100%; padding: 8px; }
    .autocomplete-list { position: absolute; top: 100%; left: 0; width: 100%; margin: 0; padding: 0; list-style: none; background: white; border: 1px solid #ccc; display: none; }
    .autocomplete-list.active { display: block; }
    .autocomplete-item { padding: 8px; cursor: pointer; }
    .autocomplete-item.selected { background-color: #eee; }
    .autocomplete-item b { color: purple; }
  </style>
</head>
<body>
  <div class="autocomplete" id="search-widget">
    <input type="text" class="autocomplete-input" placeholder="Type 'ap'...">
    <ul class="autocomplete-list"></ul>
  </div>

  <script>
    class TypeaheadWidget {
      constructor() {
        this.el = document.getElementById("search-widget");
        this.input = this.el.querySelector(".autocomplete-input");
        this.list = this.el.querySelector(".autocomplete-list");
        this.items = ["apple", "apricot", "avocado", "banana"];
        this.matches = [];
        this.index = -1;
        this.init();
      }
      init() {
        this.input.addEventListener("input", (e) => this.search(e.target.value.trim()));
        this.input.addEventListener("keydown", (e) => this.navigate(e));
      }
      search(query) {
        if (!query) { this.list.classList.remove("active"); return; }
        this.matches = this.items.filter(i => i.startsWith(query.toLowerCase()));
        this.index = -1;
        this.render(query);
      }
      render(query) {
        if (!this.matches.length) { this.list.classList.remove("active"); return; }
        this.list.innerHTML = this.matches.map((item, idx) => {
          const regex = new RegExp(`(${query})`, "gi");
          const text = item.replace(regex, "<b>$1</b>");
          return `<li class="autocomplete-item ${idx === this.index ? "selected" : ""}" data-idx="${idx}">${text}</li>`;
        }).join("");
        this.list.classList.add("active");
      }
      navigate(e) {
        if (!this.list.classList.contains("active")) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.index = (this.index + 1) % this.matches.length;
          this.render(this.input.value);
        } else if (e.key === "Enter" && this.index >= 0) {
          this.input.value = this.matches[this.index];
          this.list.classList.remove("active");
        }
      }
    }
    new TypeaheadWidget();
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- Use a **300ms debounce** to limit API queries.
- **Escape regex characters** before building dynamic search term filters.
- Track **`activeIndex`** coordinates using Arrow keys.
- Attach a **click-outside listener** to the document root to close suggestion lists automatically.

---

## 17. Quiz

1. How do you escape regex characters in JavaScript?
2. What does setting `activeIndex = -1` indicate?
3. Why is event delegation preferred on autocomplete lists?

---

## 18. Next Chapter Preview

In the next chapter, we will study **File Explorer / Nested Comments**. We will explore recursive node rendering, expand/collapse toggles, and dynamic sibling insertions.

---

## 19. Completion Checklist

- [ ] I can write a debounced, accessible Typeahead widget.
- [ ] I understand how to highlight query matching strings safely.
- [ ] I know how to handle keyboard arrow and select inputs.
- [ ] I can explain how to handle click outside elements events.
