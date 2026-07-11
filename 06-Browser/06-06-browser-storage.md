# Browser Storage APIs

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of key-value maps and JSON serialization
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are staying at a luxury hotel:

- **LocalStorage is like a permanent safe in your room**: You put your jewelry and passport there. Even if you check out, leave the hotel, and return next year, the items are still in the safe (permanent storage until cleared).
- **SessionStorage is like a temporary table drawer**: You lay out your books and notes. As long as you stay in the room, they remain there. If you close the door and check out (close the browser tab), the cleaning staff clears the drawer completely (session lifetime).
- **Cookies are like a luggage tag attached to your bag**: The tag is very small (4KB). Every single time you walk past the lobby reception (make an HTTP request), the receptionist inspects the tag to verify your room details. To prevent thieves from reading the tag, you lock it in an steel casing (`HttpOnly`).
- **IndexedDB is like a personal cataloged storage vault in the basement**: You have boxes of items, catalogs, and transaction logs. You can store hundreds of heavy items (JSON, images, blobs). A clerk manages insertion requests asynchronously so you don't block the hallway while retrieval is happening.

In JavaScript, selecting the right storage mechanism depends on size, performance, and security requirements.

---

## 2. Problem

Browsers are stateless.

If a user reloads the page, logs out of their session, or loses internet connection:
- Cart products vanish.
- Session authentication details are lost.
- Offline support is impossible without caching configurations.

---

## 3. Solution

JavaScript provides structured client-side storage APIs:
1. **Direct Strings Cache (`localStorage`/`sessionStorage`)**: Simple key-value storage for small application states.
2. **Server Identifiers (Cookies)**: Small data storage that automatically syncs with HTTP headers.
3. **Structured Database (IndexedDB)**: A transactional object database for offline storage.

---

## 4. Definition

- **LocalStorage**: Synchronous key-value string storage that persists across browser sessions.
- **SessionStorage**: Synchronous key-value string storage that is cleared when the page session/tab ends.
- **Cookie**: Small key-value strings stored in the browser that are sent to the server with every HTTP request.
- **IndexedDB**: An asynchronous, transactional, object-oriented database stored inside the browser.

---

## 5. Visualization

### Browser Storage Decision Matrix

| Storage Type | Capacity | Lifetime | Sync/Async | Sent to Server? | Best Used For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`LocalStorage`** | ~5MB | Permanent | Synchronous | No | User UI preferences |
| **`SessionStorage`** | ~5MB | Tab Session | Synchronous | No | Multi-page form states |
| **`Cookies`** | ~4KB | Custom | Synchronous | **Yes** (Every Request) | Auth session tokens |
| **`IndexedDB`** | 250MB+ | Permanent | **Asynchronous** | No | Large datasets, offline PWA |

---

## 6. Internal Working

How the browser handles storage engines:

1. **Serialization**: `localStorage` and `sessionStorage` only store strings. When you call `setItem(key, value)`, V8 must serialize objects using `JSON.stringify()`.
2. **Synchronous Blocking**: LocalStorage operations run synchronously on the main thread. Accessing large keys forces the engine to halt execution while writing data to disk, which can cause frame drops.
3. **Cookie Headers**: When you make an HTTP request, the browser's networking stack automatically appends active cookies to the `Cookie` request header. If cookies are set with the `HttpOnly` flag, browser JavaScript cannot read them via `document.cookie`, protecting them from XSS theft.
4. **IndexedDB Transactions**: IndexedDB works via event-based asynchronous transactions. When you request a record, the browser executes the query in a background thread and returns the data via success events, preventing main-thread blocking.

---

## 7. Code Examples

### Bad Practice: Storing Raw Objects in LocalStorage
Trying to write objects directly to LocalStorage without serialization converts them to useless strings.

```javascript
// Bad: Object is serialized to "[object Object]" string!
const user = { name: "Kabir", id: 12 };
localStorage.setItem("active-user", user);

const saved = localStorage.getItem("active-user");
console.log(saved); // Output: "[object Object]" (Data is lost!)
```

### Good Practice: JSON Stringification
Always serialize objects using `JSON.stringify` before saving them, and parse them with `JSON.parse` when retrieving them.

```javascript
// Good: Proper serialization
const user = { name: "Kabir", id: 12 };
localStorage.setItem("active-user", JSON.stringify(user));

const savedJSON = localStorage.getItem("active-user");
const parsedUser = savedJSON ? JSON.parse(savedJSON) : null;
console.log(parsedUser.name); // Output: "Kabir" (Data preserved!)
```

### Best Practice: Secure Cookie Management & IndexedDB Wrappers
Set cookies with security flags (`Secure`, `SameSite`, `HttpOnly`) to prevent XSS and CSRF attacks.

```javascript
// Best Practice: Secure Cookie Configuration (Server-Side Headers)
// Set-Cookie: token=xyz987; Secure; HttpOnly; SameSite=Strict

// Best Practice: IndexedDB Async Wrapper (using standard Promise structures)
function openIndexedDB(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("logs")) {
        db.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}
```

---

## 8. Dry Run

Let's dry run the behavior of LocalStorage across tabs and origins:

```javascript
// Tab 1 (Origin: https://my-app.com)
localStorage.setItem("theme", "dark");
sessionStorage.setItem("session-id", "1102");

// Tab 2 (Origin: https://my-app.com, opened in a new tab)
console.log(localStorage.getItem("theme"));        // Line 1
console.log(sessionStorage.getItem("session-id")); // Line 2

// Tab 3 (Origin: https://other-app.com)
console.log(localStorage.getItem("theme"));        // Line 3
```

### Step-by-Step State
- **Line 1**: Queries LocalStorage theme in Tab 2. Since both tabs share the same origin, it reads the data successfully. Logs `"dark"`.
- **Line 2**: Queries SessionStorage in Tab 2. SessionStorage is scoped to the specific tab session, so Tab 2 cannot access Tab 1's data. Logs `null`.
- **Line 3**: Queries LocalStorage in Tab 3. Because the origin domain is different, browser security blocks cross-origin access. Logs `null`.

---

## 9. Common Mistakes

- **Mistake 1: Exceeding the LocalStorage 5MB storage limit.**
    If you write data beyond the limit, the browser throws a `QuotaExceededError` exception, crashing the script.
- **Mistake 2: Storing sensitive authentication tokens in LocalStorage.**
    LocalStorage has no security flags. Any malicious script running on the page can access it via `window.localStorage` and steal tokens. Always store session identifiers in secure, `HttpOnly` cookies.

---

## 10. Debugging

### Inspecting Storage in Chrome Application Tab
To view and edit stored browser data:
1. Open Chrome DevTools.
2. Navigate to the **Application** tab (top menu bar).
3. On the left panel, locate the **Storage** section:
    - Expand **Local Storage** or **Session Storage** to inspect key-value pairs.
    - Expand **Cookies** to see security flags (Secure, HttpOnly, SameSite).
    - Expand **IndexedDB** to inspect database tables and records.
4. You can double-click any key or value to edit or delete it manually during testing.

---

## 11. Real World Usage

- **User Preferences**: E-commerce sites store dark mode toggles or cart previews in LocalStorage.
- **Form Resumes**: Multi-step applications save draft values in SessionStorage so inputs are preserved if the page reloads.
- **Offline PWA support**: Service workers cache API requests and data collections in IndexedDB, syncing them with the server when the user goes online.

---

## 12. Interview Preparation

### Question: Why shouldn't you store JWT tokens in LocalStorage?
- **Wrong Answer**: Because LocalStorage has a small size limit of 4KB.
- **Good Answer**: LocalStorage is vulnerable to **Cross-Site Scripting (XSS)** attacks. Unlike Cookies, LocalStorage has no security flags (like `HttpOnly`). If an attacker successfully injects a malicious script into the page (e.g. through an unescaped comment input), they can read all stored keys using `localStorage.getItem()` and send the tokens to their server, compromising the session.

---

## 13. Practice

### Exercises
1. **Easy**: Write a script that saves a user's name to LocalStorage and displays a welcome banner on page reload.
2. **Medium**: Write a safe LocalStorage wrapper function `safeSetItem(key, value)` that wraps calls in a try-catch block to handle `QuotaExceededError` gracefully.
3. **Hard**: Write a script that checks if cookies are enabled in the browser by writing, reading, and deleting a temporary test cookie.

---

## 14. Mini Assignment

Write a function `clearSessionCache()` that deletes all keys stored inside SessionStorage and removes a cookie named `"session_tag"`.

---

## 15. Mini Project

Create a modular settings manager `StorageManager` that handles writing and reading configuration profiles to LocalStorage, automatically serialization-converting values and verifying storage limits.

```javascript
// storage-manager-utility.js
class StorageManager {
  static set(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        console.error("Storage quota exceeded! Cannot write key:", key);
      } else {
        console.error("Failed to write to LocalStorage:", error.message);
      }
      return false;
    }
  }

  static get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to parse LocalStorage key:", key, error.message);
      return null;
    }
  }

  static remove(key) {
    localStorage.removeItem(key);
  }
}

// Test case
const settings = { theme: "dark", fontSize: 16 };
StorageManager.set("user-settings", settings);
const currentSettings = StorageManager.get("user-settings");
console.log("Retrieved Settings:", currentSettings);
```

---

## 16. Chapter Summary

- **LocalStorage** is permanent and scoped to the origin.
- **SessionStorage** lasts only as long as the tab session.
- **Cookies** are small (4KB) and sent to the server. Secure them with the **`HttpOnly`** flag.
- **IndexedDB** is an asynchronous database for large, structured datasets.

---

## 17. Quiz

1. What is the typical storage capacity of LocalStorage?
2. Can JavaScript access a cookie flagged as `HttpOnly`?
3. What happens to SessionStorage data if you duplicate a tab?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Timers & Animation**. We will compare `setTimeout` and `setInterval` performance with the browser's native `requestAnimationFrame` loop.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: Server side state store karna user experience ke liye zaruri hai — data page reload ke baad bhi rehna chahiye.
- **Concept**: localStorage (persistent), sessionStorage (tab-only), IndexedDB (large structured data) — teen alag storage options.
- **Key Pattern**: localStorage.setItem('key', JSON.stringify(obj)) aur JSON.parse(localStorage.getItem('key')).
- **Common Mistake**: Sensitive data (passwords, tokens) localStorage mein store karna — XSS se accessible hai; secure cookies use karo.
## 19. Completion Checklist

- [ ] I can select the correct browser storage API for different use cases.
- [ ] I know how to serialize and parse objects for storage.
- [ ] I understand the security flags used to protect cookies.
- [ ] I can inspect storage keys and values using DevTools.
