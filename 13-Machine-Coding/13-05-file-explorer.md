# File Explorer / Nested Comments

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Dynamic tree traversals, recursion, event delegation, and nested state objects
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a builder constructing a modular skyscraper:

- **The State Tree is the structural blueprint**: It outlines the hierarchy. Floor 1 contains Room A and Room B. Room B contains Storage C and Storage D.
- **Recursive Rendering is a construction team duplicating templates**: The builders start at the lobby. If a room has nested rooms (children), they call the nested construction team (recursion) to build the interior rooms before moving to the next floor.
- **Expand/Collapse toggles are privacy doors**: Clicking the door handle (toggle) folds or unfolds the view of the nested interior rooms without affecting the outer walls.
- **Dynamic Addition is snapping on a new modular unit**: You click a button inside Room B, type *"Balcony"* in a temporary naming box, and snap the new unit on. It automatically inherits Room B's location index, and the state structure updates.

In JavaScript, **File Explorers** and **Nested Comments** share this exact recursive tree architecture.

---

## 2. Problem

Junior developers often build recursive trees by:
- Storing nested elements as static flat DOM structures, making dynamic node insertion and state synchronization extremely complex.
- Appending event listeners to every nested button, causing memory leaks and high heap usage on large trees.
- Failing to handle deep recursion, which can trigger stack overflows.

---

## 3. Solution

We design a **Recursive, State-Driven Explorer Component**:
1. **State Tree**: Storing folders and files as nested objects with unique IDs.
2. **Recursive Renderer**: A function that calls itself to compile nested tree structures into DOM nodes.
3. **Dynamic Node Insertion**: Appending interactive input fields to name and create new child nodes.
4. **Event Delegation**: Binding collapse/expand and insert listeners to a single root container.

---

## 4. Definition

- **State Tree**: A hierarchical data structure representing parent-child relationships (e.g. JSON folder structures).
- **Recursive Rendering**: A rendering strategy where a function compiles a parent node and then invokes itself to render each child node.

---

## 5. Visualization

### Recursive State Tree Mapping

```
   State Tree Object:
   Root (id: 1, type: "folder")
   └── src (id: 2, type: "folder")
       ├── index.js (id: 3, type: "file")
       └── assets (id: 4, type: "folder")
  
   Rendering Recursion:
   renderNode(Root)
     renderNode(src)
       renderNode(index.js) -> returns <li> file element
       renderNode(assets)   -> returns <ul> container element
```

---

## 6. Internal Working

How the tree controller coordinates insertions and updates:

1. **Unique ID references**: Every node holds a unique ID. When a user clicks `"New File"` inside Folder 4, the event handler reads `data-id="4"` from the closest wrapper.
2. **State Insertion Search**: The controller performs a recursive depth-first search (DFS) through the state tree to locate the folder matching ID 4:
    ```javascript
    function insertNode(tree, targetId, newNode) {
      if (tree.id === targetId) {
        tree.children.unshift(newNode);
        return true;
      }
      for (let child of tree.children) {
        const found = insertNode(child, targetId, newNode);
        if (found) return true;
      }
      return false;
    }
    ```
3. **UI Sync**: Once mutated, the controller triggers a full re-render of the tree, keeping the DOM in sync with the state.

---

## 7. Code Examples

### The Tree Data Structure Specification
Define a nested JSON tree containing folders and files.

```javascript
// tree-state-specification.js
const initialTreeData = {
  id: "root",
  name: "project-root",
  type: "folder",
  isExpanded: true,
  children: [
    {
      id: "src",
      name: "src",
      type: "folder",
      isExpanded: true,
      children: [
        { id: "app-js", name: "app.js", type: "file", children: [] }
      ]
    },
    { id: "readme-md", name: "README.md", type: "file", children: [] }
  ]
};
```

### HTML & CSS Foundation
Build a list container to hold the recursive elements.

```html
<!-- HTML Structure -->
<div class="explorer-container">
  <h3>File Explorer</h3>
  <div id="file-explorer"></div>
</div>
```

```css
/* CSS Styles */
.explorer-container {
  max-width: 400px;
  font-family: monospace;
}
.folder-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px;
  cursor: pointer;
}
.folder-header:hover {
  background-color: #f0f0f0;
}
.folder-children {
  margin-left: 20px;
  list-style: none;
  padding-left: 0;
  display: none; /* Hidden by default */
}
.folder-children.expanded {
  display: block; /* Shown when expanded */
}
.file-item {
  padding: 4px;
  padding-left: 24px;
  color: #555;
}
.node-btn {
  margin-left:auto;
  font-size: 11px;
}
.input-field {
  margin-left: 24px;
  font-size: 12px;
}
```

### The File Explorer Controller Class
Write a Vanilla JS class that coordinates recursive rendering, expand/collapse toggles, node insertions, and DFS search routines.

```javascript
// file-explorer.js
class FileExplorer {
  constructor(containerId, initialData) {
    this.container = document.getElementById(containerId);
    this.state = initialData;

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  // 1. Recursive Template Renderer
  createNodeHTML(node) {
    if (node.type === "file") {
      return `
        <div class="file-item" data-id="${node.id}">
          📄 ${node.name}
        </div>
      `;
    }

    // Folder rendering
    const childrenHTML = node.children
      .map(child => this.createNodeHTML(child))
      .join("");

    return `
      <div class="folder-node" data-id="${node.id}">
        <div class="folder-header">
          <span>${node.isExpanded ? "📂" : "📁"} ${node.name}</span>
          <button class="node-btn add-file-btn">+ File</button>
          <button class="node-btn add-folder-btn">+ Folder</button>
        </div>
        <div class="folder-children ${node.isExpanded ? "expanded" : ""}">
          ${childrenHTML}
        </div>
      </div>
    `;
  }

  render() {
    this.container.innerHTML = this.createNodeHTML(this.state);
  }

  // 2. Recursive Depth-First Search Mutations
  insertNode(tree, parentId, name, type) {
    if (tree.id === parentId) {
      tree.children.push({
        id: Date.now().toString(),
        name,
        type,
        isExpanded: true,
        children: []
      });
      return true;
    }

    for (let child of tree.children) {
      if (child.type === "folder") {
        const success = this.insertNode(child, parentId, name, type);
        if (success) return true;
      }
    }
    return false;
  }

  toggleFolder(tree, folderId) {
    if (tree.id === folderId) {
      tree.isExpanded = !tree.isExpanded;
      return true;
    }

    for (let child of tree.children) {
      if (child.type === "folder") {
        const success = this.toggleFolder(child, folderId);
        if (success) return true;
      }
    }
    return false;
  }

  // 3. Event delegation bindings
  bindEvents() {
    // Click events handler
    this.container.addEventListener("click", (e) => {
      const target = e.target;
      const folderNode = target.closest(".folder-node");
      if (!folderNode) return;
      const parentId = folderNode.dataset.id;

      if (target.classList.contains("add-file-btn") || target.classList.contains("add-folder-btn")) {
        e.stopPropagation();
        const type = target.classList.contains("add-file-btn") ? "file" : "folder";
        this.promptNewNode(folderNode, parentId, type);
      } else if (target.closest(".folder-header")) {
        this.toggleFolder(this.state, parentId);
        this.render();
      }
    });
  }

  // 4. Temporary input field prompt
  promptNewNode(folderDOM, parentId, type) {
    // Prevent adding multiple input fields
    if (folderDOM.querySelector(".input-field")) return;

    const childrenContainer = folderDOM.querySelector(".folder-children");
    childrenContainer.classList.add("expanded"); // Open container

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-field";
    inputWrapper.innerHTML = `
      <input type="text" placeholder="Name..." class="node-name-input">
      <button class="save-btn">Save</button>
      <button class="cancel-btn">X</button>
    `;

    childrenContainer.prepend(inputWrapper);

    const input = inputWrapper.querySelector(".node-name-input");
    input.focus();

    // Event listener for save/cancel
    inputWrapper.addEventListener("click", (e) => {
      if (e.target.classList.contains("save-btn")) {
        const name = input.value.trim();
        if (name) {
          this.insertNode(this.state, parentId, name, type);
          this.render();
        }
      } else if (e.target.classList.contains("cancel-btn")) {
        inputWrapper.remove();
      }
    });

    // Enter key save
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const name = input.value.trim();
        if (name) {
          this.insertNode(this.state, parentId, name, type);
          this.render();
        }
      }
    });
  }
}
```

---

## 8. Dry Run

Let's dry run clicking folder `"src"` to toggle expand/collapse:

- **Initial state**: `src` folder is expanded (`isExpanded = true`).
- **Action**: User clicks the text `"📂 src"` inside the folder header.
- **Event Delegation**:
  - Event bubbles to `#file-explorer`.
  - Finds closest folder node wrapper: `data-id = "src"`.
  - Target is not a creation button, so it triggers folder toggle: `toggleFolder(state, "src")`.
- **toggleFolder() DFS Execution**:
  - Starts at root. Root ID is `"root"` !== `"src"`.
  - Loops root children. Finds child `src`.
  - Match! `src.id === "src"`.
  - Inverts flag: `src.isExpanded` becomes `false`.
  - DFS returns `true` (execution completes).
- **Update**:
  - Runs `render()`.
  - `createNodeHTML` processes `src`.
  - `src.isExpanded` is `false`, so icon becomes `"📁"`, and class `"expanded"` is omitted from child container.
  - Folder collapses visually in the UI.

---

## 9. Common Mistakes

- **Mistake 1: Directly appending elements to the DOM in deep nesting handlers without updating the state.**
    If you don't update the state tree, any parent folder toggle or future re-render will discard your newly created DOM elements, causing data loss.
- **Mistake 2: Missing `e.stopPropagation()` in folder creation button listeners.**
    If you click the "+ File" button inside a folder header and don't stop propagation, the click event bubbles up, triggering the collapse/expand toggle on the folder header as well.

---

## 10. Debugging

### Inspecting State Mutations in Console
If new files fail to render under their parent folders:
1. Run:
    `console.log(JSON.stringify(explorer.state, null, 2))`
    before and after clicking "Save" on a new file input.
2. If the printed state object has the new file node correctly appended under the target parent folder's children array, the issue lies in your `render()` template compiler.
3. If the printed state object is unchanged, verify that your DFS `insertNode` helper is matching the correct parent ID string type (e.g. comparing string `"102"` with number `102` incorrectly).

---

## 11. Real World Usage

- **IDE File Trees**: Sidebar folder navigations in VS Code or GitHub.
- **Nested Comments/Threads**: Reddit comment sections with nested replies.

---

## 12. Interview Preparation

### Question: Explain how you recursively search and mutate a nested tree structure (like a file explorer state)
- **Wrong Answer**: By using a flat loop over all array elements.
- **Good Answer**: I use **Depth-First Search (DFS) recursion**.
  - Starting at the root node, I check if its ID matches the target parent ID. If it matches, I append the new node to its children array and return `true`.
  - If it does not match, I loop through its child nodes, recursively calling the search function on each child folder.
  - If a recursive call returns `true`, I propagate the success indicator back up the call stack and terminate the search, ensuring an efficient search process.

---

## 13. Practice

### Exercises
1. **Easy**: Create a flat list representing a single-level directory structure, and add items on button click.
2. **Medium**: Add a delete button to files and folders, implementing a DFS delete routine in the state tree.
3. **Hard**: Implement a nested comment system where each comment can be replied to recursively up to a depth of 5 levels, displaying replies with increasing indentations.

---

## 14. Mini Assignment

Write a function `countTotalFiles(node)` that calculates the total number of files in the tree recursively.

---

## 15. Mini Project

Create a single-file interactive File Explorer sandbox application that implements tree traversals, folder creation, file creation, toggles, and state logging.

```html
<!-- explorer-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>File Explorer Sandbox</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .folder { padding-left: 20px; }
    .item-header { cursor: pointer; display: flex; gap: 10px; margin-bottom: 4px; }
    .file { padding-left: 36px; color: #666; margin-bottom: 4px; }
    .btn { font-size: 10px; }
  </style>
</head>
<body>
  <div id="explorer"></div>

  <script>
    const data = {
      id: "root", name: "Root", type: "folder", open: true,
      children: [
        { id: "1", name: "index.js", type: "file", children: [] }
      ]
    };

    class TreeExplorer {
      constructor(id, treeData) {
        this.el = document.getElementById(id);
        this.state = treeData;
        this.init();
      }
      init() {
        this.el.addEventListener("click", (e) => {
          const header = e.target.closest(".item-header");
          if (!header) return;
          const id = header.dataset.id;
          
          if (e.target.classList.contains("add-btn")) {
            e.stopPropagation();
            const name = prompt("Enter file name:");
            if (name) { this.addNode(this.state, id, name); this.render(); }
          } else {
            this.toggle(this.state, id);
            this.render();
          }
        });
        this.render();
      }
      addNode(node, id, name) {
        if (node.id === id) { node.children.push({ id: Date.now().toString(), name, type: "file", children: [] }); return true; }
        for (let child of node.children) {
          if (this.addNode(child, id, name)) return true;
        }
        return false;
      }
      toggle(node, id) {
        if (node.id === id) { node.open = !node.open; return true; }
        for (let child of node.children) {
          if (this.toggle(child, id)) return true;
        }
        return false;
      }
      buildHTML(node) {
        if (node.type === "file") return `<div class="file">📄 ${node.name}</div>`;
        const children = node.open ? node.children.map(c => this.buildHTML(c)).join("") : "";
        return `
          <div class="folder">
            <div class="item-header" data-id="${node.id}">
              <span>${node.open ? "📂" : "📁"} ${node.name}</span>
              <button class="add-btn">+ File</button>
            </div>
            <div>${children}</div>
          </div>
        `;
      }
      render() {
        this.el.innerHTML = this.buildHTML(this.state);
      }
    }
    new TreeExplorer("explorer", data);
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- Use a **nested JSON tree object** to represent folders and files.
- **Recursively render** tree nodes by letting the function invoke itself for child arrays.
- Mutate states using **Depth-First Search (DFS)** recursion paths.
- Apply **event delegation** to the root tree element to keep event handler memory minimal.

---

## 17. Quiz

1. How does a Depth-First Search traverse tree nodes?
2. What occurs if you forget to mutate the State object and only update the DOM?
3. Why is `e.stopPropagation()` essential on folder action buttons?

---

## 18. Next Chapter Preview

We have completed **Module 13: Machine Coding**! You have mastered Vanilla JS carousels, infinite scroll observers, star rating widgets, autocomplete typeaheads, and recursive file explorers. In the next module, **Module 14: Cheat Sheets**, we will study the **JavaScript Core Engine Cheat Sheet**.

---

## 19. Completion Checklist

- [ ] I can write a recursive File Explorer / Nested Comments component.
- [ ] I understand how to traverse and mutate trees using DFS recursion.
- [ ] I know how to use event delegation to handle nested events.
- [ ] I know how to debug recursive template rendering.
