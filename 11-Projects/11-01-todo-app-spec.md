# Spec: Todo App

- **Difficulty Level**: Beginner to Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of DOM manipulation, event listeners, and localStorage
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are managing a physical project bulletin board:

- **State is the pile of sticky notes**: Each note has a unique ID, a task description, and a colored status sticker (active or completed).
- **Render Function is the board layout coordinator**: Whenever a note is written, edited, or shredded, the coordinator clears the board grid and rearranges the notes neatly under their category columns (declarative rendering).
- **Event Delegation is having a single receptionist at the door**: Instead of attaching a separate guard to watch each individual sticky note, a single receptionist sits at the front desk. When a note is touched, the receptionist checks the label and routes the action (clicks) to the correct clerk.
- **localStorage is copying the sticky notes into a ledger book at the end of the day**: If a storm blows the board away overnight, you read the ledger book in the morning and re-pin all the notes exactly where they were.

In JavaScript, **Vanilla DOM Projects** follow this clean decoupled state architecture.

---

## 2. Problem

Junior developers often write Todo apps by coupling business logic directly with DOM nodes:
- Reading task descriptions directly from paragraph elements.
- Mutating styles (`element.style.textDecoration = 'line-through'`) inline during click events.
- Failing to synchronize states, which results in active elements reverting or disappearing when filters are toggled.

---

## 3. Solution

We implement a **State-Driven Architecture**:
1. **State as the Single Source of Truth**: Data remains in a JavaScript array.
2. **Unidirectional Render Cycle**: Any action mutates the state first, which triggers a complete UI render refresh.
3. **Event Delegation**: Binding click handlers to the parent list container rather than individual buttons.
4. **Local Persistence**: Serializing state to `localStorage` on mutations.

---

## 4. Definition

- **Event Delegation**: A technique where a single event listener is attached to a parent element to handle events bubbles from its children.
- **State-Driven UI**: A design pattern where the user interface is a direct, pure representation of the data state (i.e. $UI = f(State)$).
- **localStorage**: A web storage API that allows saving key-value string pairs in the browser with no expiration date.

---

## 5. Visualization

### Unidirectional Todo App Lifecycle

```
    [ User clicks "Add Task" ]
                |
                v
     [ Mutate State Object ]  ---> items.push({ id: 1, text: "Buy Milk", done: false })
                |
                v
     [ Sync Persistence ]     ---> Save to localStorage
                |
                v
     [ Run Render Function ]  ---> Clear <ul>; Loop items; Append compiled <li> elements
                |
                v
       [ Visual DOM Updates ]
```

---

## 6. Internal Working

How the browser handles event delegation and storage:

1. **Event Bubbling**: When a user clicks a delete button inside an `<li>` element, the click event travels up the DOM tree:
    `button -> li -> ul (list-container) -> body -> document`.
    By binding `ul.addEventListener("click", handler)`, V8 intercepts the event bubble. The handler reads `event.target` to identify which specific button was clicked.
2. **JSON Serialization**: `localStorage` only stores strings. When saving data, the engine serializes the state array: `JSON.stringify(state)`. When reading, it parses: `JSON.parse(data)`.

---

## 7. Code Examples

### The Architecture Specification
Our application separates concerns into three modules: State, Event Handlers, and Renderer.

```javascript
// todo-app-architecture.js
class TodoApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    // 1. Single Source of Truth (State)
    this.state = {
      todos: this.loadFromStorage(),
      filter: "all" // "all", "active", "completed"
    };

    this.init();
  }

  // 2. Load from localStorage
  loadFromStorage() {
    const raw = localStorage.getItem("app-todos");
    return raw ? JSON.parse(raw) : [];
  }

  // 3. Save to localStorage
  saveToStorage() {
    localStorage.setItem("app-todos", JSON.stringify(this.state.todos));
  }

  init() {
    this.render();
    this.bindEvents();
  }
}
```

### Good Practice: Declarative Rendering
The render function reads the state, filters items, and builds HTML templates without inline styling mutations.

```javascript
// Inside TodoApp class
render() {
  const listContainer = this.container.querySelector(".todo-list");
  
  // Filter items based on state filter
  const filteredTodos = this.state.todos.filter(todo => {
    if (this.state.filter === "active") return !todo.completed;
    if (this.state.filter === "completed") return todo.completed;
    return true; // "all"
  });

  // Re-build list template declaratively
  listContainer.innerHTML = filteredTodos.map(todo => `
    <li data-id="${todo.id}" class="todo-item ${todo.completed ? "completed" : ""}">
      <input type="checkbox" ${todo.completed ? "checked" : ""} class="toggle-btn">
      <span>${todo.text}</span>
      <button class="delete-btn">&times;</button>
    </li>
  `).join("");
}
```

### Best Practice: Event Delegation Handler
Bind events to the list container and inspect class targets to handle actions cleanly.

```javascript
// Inside TodoApp class
bindEvents() {
  const form = this.container.querySelector(".todo-form");
  const listContainer = this.container.querySelector(".todo-list");

  // Form submission: Adds item
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (text) {
      this.state.todos.push({ id: Date.now(), text, completed: false });
      this.saveToStorage();
      input.value = "";
      this.render(); // Re-render UI
    }
  });

  // Event Delegation for list item actions
  listContainer.addEventListener("click", (e) => {
    const target = e.target;
    const li = target.closest(".todo-item");
    if (!li) return;
    const id = parseInt(li.dataset.id);

    if (target.classList.contains("toggle-btn")) {
      // Toggle State
      const todo = this.state.todos.find(t => t.id === id);
      if (todo) todo.completed = !todo.completed;
    } else if (target.classList.contains("delete-btn")) {
      // Delete State
      this.state.todos = this.state.todos.filter(t => t.id !== id);
    }

    this.saveToStorage();
    this.render(); // Re-render UI
  });
}
```

---

## 8. Dry Run

Let's dry run clicking the complete checkbox on a list item:

- **State**: `state.todos` = `[{ id: 101, text: "Buy Milk", completed: false }]`.
- **Action**: User clicks `<input type="checkbox" class="toggle-btn">` inside `<li data-id="101">`.
- **Event Flow**:
  - The click event bubbles up to `<ul class="todo-list">`.
  - The Event Listener executes.
  - `e.target` is the checkbox. `target.classList.contains("toggle-btn")` is `true`.
  - Finds parent `li`: `<li data-id="101">`. Extracts ID: `101`.
  - Locates item in state: `state.todos.find(t => t.id === 101)`.
  - Inverts completion state: `todo.completed` becomes `true`.
  - Runs `saveToStorage()`. `localStorage` updates.
  - Runs `render()`. Re-builds HTML.
  - The `<li>` receives class `"completed"` and checkbox gets `"checked"`.
  - UI updates.

---

## 9. Common Mistakes

- **Mistake 1: Binding `addEventListener` to every new `<li>` element during creation.**
    If you have 1,000 tasks, this allocates 1,000 listener closures in the heap. Use event delegation on the parent `<ul>` instead.
- **Mistake 2: Storing Date objects directly in localStorage.**
    `JSON.stringify` converts Date objects to strings, but `JSON.parse` does not restore them back to Date instances automatically.

---

## 10. Debugging

### Tracing Event Delegation Targets
If clicking buttons inside your list fails to trigger actions:
1. Set a breakpoint inside your event delegation callback.
2. Trigger the click.
3. In the Console, check the properties:
    - **`e.target`**: Represents the exact element clicked (e.g. `<span>` or `<button>`).
    - **`e.currentTarget`**: Represents the element holding the listener (e.g. `<ul>`).
4. If clicking the span inside the button fails, ensure you use `target.closest(".delete-btn")` or classes to locate selectors.

---

## 11. Real World Usage

- **Single Page App Lists**: React or Vue lists render templates dynamically based on array states, using internal keys matching the `data-id` specifications.
- **Offline Drafts saving**: Note apps save draft configurations to `localStorage` or `IndexedDB` on keypresses to prevent data loss.

---

## 12. Interview Preparation

### Question: Explain event delegation and its advantages in DOM development
- **Wrong Answer**: It delegates tasks to background threads.
- **Good Answer**: Event delegation is a technique where a single event listener is attached to a parent element to manage events bubbling up from its child elements.
  - **Advantages**:
      1. **Memory Optimization**: Allocates only a single listener in the heap instead of binding listeners to hundreds of child nodes.
      2. **Dynamic Children Compatibility**: Automatically works for new child elements appended to the DOM after page load, without needing to bind new listeners.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic HTML file with a list. Bind a click handler to the parent list and log the text of any list item clicked.
2. **Medium**: Add a filter bar to the Todo spec allowing users to toggle between `"All"`, `"Active"`, and `"Completed"` views, updating the state and UI.
3. **Hard**: Implement a drag-and-drop feature on the list, updating the item order in the state array when items are rearranged.

---

## 14. Mini Assignment

Write a function `clearCompletedTodos()` that filters out completed items from the state, updates storage, and re-renders the UI.

---

## 15. Mini Project

Create a complete single-file HTML/JS Todo application that implements the state manager and event delegation specifications documented in this chapter.

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>JS Journey Todo App</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #fafafa; }
    .completed span { text-decoration: line-through; color: #888; }
    .todo-item { display: flex; align-items: center; margin-bottom: 8px; }
    .todo-item span { margin: 0 10px; flex-grow: 1; }
  </style>
</head>
<body>
  <div id="todo-app">
    <h2>Todo Tracker</h2>
    <form class="todo-form">
      <input type="text" placeholder="Add a new task..." required>
      <button type="submit">Add</button>
    </form>
    <ul class="todo-list"></ul>
  </div>

  <script>
    // Bind TodoApp specification class
    class VanillaTodo {
      constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.state = { todos: this.load() };
        this.init();
      }
      load() {
        const raw = localStorage.getItem("vanilla-todos");
        return raw ? JSON.parse(raw) : [];
      }
      save() {
        localStorage.setItem("vanilla-todos", JSON.stringify(this.state.todos));
      }
      init() {
        const form = this.container.querySelector(".todo-form");
        const list = this.container.querySelector(".todo-list");

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const input = form.querySelector("input");
          this.state.todos.push({ id: Date.now(), text: input.value, completed: false });
          this.save();
          input.value = "";
          this.render();
        });

        list.addEventListener("click", (e) => {
          const target = e.target;
          const li = target.closest(".todo-item");
          if (!li) return;
          const id = parseInt(li.dataset.id);

          if (target.classList.contains("toggle-btn")) {
            const todo = this.state.todos.find(t => t.id === id);
            if (todo) todo.completed = !todo.completed;
          } else if (target.classList.contains("delete-btn")) {
            this.state.todos = this.state.todos.filter(t => t.id !== id);
          }
          this.save();
          this.render();
        });

        this.render();
      }
      render() {
        const list = this.container.querySelector(".todo-list");
        list.innerHTML = this.state.todos.map(todo => `
          <li data-id="${todo.id}" class="todo-item ${todo.completed ? "completed" : ""}">
            <input type="checkbox" ${todo.completed ? "checked" : ""} class="toggle-btn">
            <span>${todo.text}</span>
            <button class="delete-btn">Delete</button>
          </li>
        `).join("");
      }
    }

    new VanillaTodo("todo-app");
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- **State-driven UI** ensures the visual DOM is a direct function of data.
- Use **Event Delegation** to handle list clicks on a single parent listener.
- Serialize state to string formats when saving to **`localStorage`**.
- Avoid inline styling mutations; use **CSS classes** for completed items.

---

## 17. Quiz

1. What parameter references the exact clicked element in an event callback?
2. Does localStorage expire when the browser window is closed?
3. Why does event delegation save heap memory?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Spec - Debounced Search**. We will explore API mocks, debouncing thresholds, caching search queries, and managing async status states.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Todo Tracker humara pehla real-world vanilla JavaScript project hai. Ek achhi application banane ke liye hume tin important concepts ko master karna hota hai:
1. **State-Driven UI**: UI ko manually update karne ke bajaye hum ek single data structure (state object) maintain karte hain jo pure application ka state hold karta hai. UI humesha is state ka direct reflection hoti hai.
2. **Event Delegation**: Har ek individual list item (`<li>`) par event listener lagane ke bajaye hum sirf unke common parent (`<ul>`) par ek single listener lagate hain. Jab kisi child element par click hota hai, toh click event bubble up ho kar parent tak jata hai, aur hum `e.target` se identify karte hain ki kis element par click hua tha. Isse memory save hoti hai aur dynamic new items bina extra listener bind kiye kaam karte hain.
3. **Data Persistence**: App data ko user sessions ke beech persist karne ke liye hum `localStorage` ka use karte hain.

### Andar kya hota hai (Internal Working)

Event propagation aur memory level par backend flow kaise chalta hai:
1. **Event Delegation (Bubbling Interception)**: Jab list item ke delete button par click hota hai, toh event DOM hierarchy ke through upar travel karta hai: `button -> li -> ul -> body`. Hum parent level (ul) listener par event ko intercept karte hain aur `event.target.classList` check karte hain taaki sahi buttons toggle/delete handlers execute ho sakein.
2. **JSON Serialization**: LocalStorage sirf strings store kar sakta hai. Isliye hum state array ko save karte waqt `JSON.stringify()` se serialize karte hain, aur load karte waqt `JSON.parse()` se deserialize karke JavaScript array object mein convert karte hain.

### Code Example samjho

```javascript
// Decoupled architecture Todo App skeleton
class TodoApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.state = {
      todos: this.loadFromStorage(),
      filter: "all"
    };
    this.init();
  }
  loadFromStorage() {
    const raw = localStorage.getItem("todos");
    return raw ? JSON.parse(raw) : []; // Deserialize array
  }
}
```

**Line by line:**
- `this.container` — Application UI container ka HTML root element refer kiya.
- `this.state` — Single source of truth hai jisme todos array aur selected filters stored hain.
- `localStorage.getItem("todos")` — Browser disk se string formats value lookup read karta hai.
- `JSON.parse(raw)` — String value ko process karke actual arrays aur nested object trees mein transform karta hai.

### Sabse badi galti log karte hain

State updates ko skip karke directly DOM element nodes (jaise innerHTML ya textContent) ko modify karna. Isse aapka application state aur memory array out-of-sync ho jaate hain. Pehle hamesha state array (`this.state.todos`) update karo, storage sync karo, aur uske baad `render()` function call karke UI refresh karo.

### Yaad rakhne ki cheez

**Hamesha data state ko primary maano aur UI ko use follow karne do, aur dynamic lists par performance bachane ke liye event delegation use karo.**
## 20. Completion Checklist

- [ ] I can write a state-driven Vanilla JS application.
- [ ] I understand how to implement event delegation on dynamic lists.
- [ ] I know how to serialize and parse state inside localStorage.
- [ ] I can debug event delegation targets using console properties.
