# Spec: Debounced Search

- **Difficulty Level**: Intermediate
- **Estimated Reading Time**: 12 minutes
- **Prerequisites**: Understanding of promises, async/await, closures, and rate-limiting concepts
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a librarian fetching heavy book reference logs for students:

- **Unthrottled Search is like running to the archive room on every single letter spoken**: A student walks in and says: *"I want to search for..."*
  - They whisper: *"F"* -> You run to the basement archive, search for 1 minute, and return with a heavy folder of words starting with F (e.g. Fox, Food).
  - They whisper: *"i"* -> Before they even look at your folder, you run back to the basement to fetch words starting with Fi (e.g. Fish, Fire).
  - They whisper: *"s"* -> You run back for Fis (e.g. Fish).
    You collapse from exhaustion after 3 letters (flooding the server).
- **Debounced Search is waiting for the student to pause**: You stand and wait. The student says: *"F...i...s...h"* (300ms pause). Since they stopped talking, you run to the archive once and fetch books matching `"Fish"`.
- **Caching is keeping popular books on your desk**: When a student searches for `"Fish"`, you keep the folder on your desk. If another student asks for `"Fish"` 2 minutes later, you hand them the folder immediately instead of running back to the basement.

In JavaScript, a **Debounced Search Bar** manages this network workload.

---

## 2. Problem

When users type into a search autocomplete input field:
- The browser triggers input events on every single keystroke.
- If you trigger a network API fetch on every keystroke, a user typing "banana" triggers 6 concurrent HTTP requests, overloading backend databases and causing race conditions where late responses overwrite new results.

---

## 3. Solution

We design a **Stateful Debounced Search Controller**:
1. **Debouncer Layer**: Pauses search requests until the user stops typing for 300ms.
2. **API Mock Layer**: Simulates network latency and data returns.
3. **Local Query Cache**: Stores search results in an in-memory `Map` to bypass redundant network requests.
4. **Status State Manager**: Renders loading spinners, error messages, and empty states.

---

## 4. Definition

- **Debouncing**: Wrapping a callback to ensure it only executes after a specified delay has elapsed since its last invocation.
- **Query Cache**: A client-side dictionary structure mapping input queries to previously fetched API responses.
- **Race Condition**: An asynchronous bug where API responses resolve in a different order than requested, displaying outdated results.

---

## 5. Visualization

### Debounced Search Request Flow

```
   [ User Types: "a", "ab", "abc" ]
                  |
     [ Input Listener Triggers ]
                  |
        [ Debouncer (300ms) ]
                  |
     (Wait for typing to pause)
                  |
        Is query in Cache?
         /            \
       Yes             No
       /                 \
   [ Return Cache ]   [ Fetch API Mock ]
   (Instant)          - Show loading spinner
                      - network delay
                      - Resolve results
                               |
                      [ Save to Cache Map ]
                               |
                       [ Render UI Feed ]
```

---

## 6. Internal Working

How the controller coordinates state updates:

1. **Timer Scavenging**: The search input triggers a debounced handler. On each keypress, V8 clears the active `timeoutId` and schedules a new macrotask.
2. **State Status flags**: The renderer manages a status string: `"idle"`, `"loading"`, `"success"`, `"error"`. Setting the status to `"loading"` hides previous results and shows a spinner element.
3. **Cache Hit optimization**: Before initiating the fetch, the search controller checks `cache.has(query)`. A cache hit skips the API Promise entirely, returning data in $O(1)$ time.

---

## 7. Code Examples

### The Search Controller Specification
We build a modular class coordinating the input, debouncer, cache, and renderer.

```javascript
// debounced-search-controller.js
class SearchController {
  constructor(inputElement, resultsElement, statusElement) {
    this.input = inputElement;
    this.resultsContainer = resultsElement;
    this.statusContainer = statusElement;

    this.cache = new Map(); // In-memory query cache
    this.activeQuery = "";  // Tracks latest input query to prevent race conditions

    this.init();
  }

  init() {
    // Create debounced event handler
    const debouncedHandler = this.debounce((e) => {
      this.executeSearch(e.target.value.trim());
    }, 300);

    this.input.addEventListener("input", debouncedHandler);
  }
}
```

### Good Practice: The Custom Debouncer
Write a robust debounce helper that propagates the event target context and variables correctly.

```javascript
// Inside SearchController class
debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

### Best Practice: Asynchronous Fetch with Cache and Race Prevention
Check the query cache first, show load indicators, make mock API calls, and verify query consistency to avoid race conditions.

```javascript
// Inside SearchController class
async executeSearch(query) {
  if (!query) {
    this.clearUI();
    return;
  }

  this.activeQuery = query;

  // 1. Cache Check
  if (this.cache.has(query)) {
    console.log(`[Cache Hit] Query: "${query}"`);
    this.renderResults(this.cache.get(query));
    return;
  }

  // 2. Set UI to Loading State
  this.setStatus("loading");

  try {
    // 3. Trigger Mock API Call
    console.log(`[API Fetch] Query: "${query}"`);
    const results = await this.mockApiCall(query);

    // 4. Race Condition Check: Ensure this response matches the current input value
    if (this.activeQuery !== query) {
      console.log(`[Race Blocked] Ignored stale response for query: "${query}"`);
      return;
    }

    // 5. Cache and Render
    this.cache.set(query, results);
    this.renderResults(results);
  } catch (error) {
    if (this.activeQuery === query) {
      this.setStatus("error", error.message);
    }
  }
}

// Mock API database query
mockApiCall(query) {
  return new Promise((resolve, reject) => {
    const mockDatabase = ["apple", "banana", "apricot", "blueberry", "avocado"];
    const delay = Math.random() * 800 + 200; // Simulated latency (200ms - 1000ms)

    setTimeout(() => {
      if (query === "error") {
        reject(new Error("Database connection timeout"));
      } else {
        const matches = mockDatabase.filter(item => item.startsWith(query.toLowerCase()));
        resolve(matches);
      }
    }, delay);
  });
}
```

---

## 8. Dry Run

Let's dry run the search flow for `"ap"` when `"ap"` is not cached:

- **Input Action**: User types `"a"`, then `"ap"` at a 100ms interval.
- **Debounce Step**:
  - `"a"` keypress sets Timer 1.
  - `"ap"` keypress (100ms later) clears Timer 1, sets Timer 2 (300ms delay).
- **Execution Step**:
  - Timer 2 triggers after 300ms of typing inactivity.
  - Runs `executeSearch("ap")`. Sets `activeQuery = "ap"`.
  - Cache checks `cache.has("ap")` -> returns `false`.
  - Sets UI state to `"loading"`. Spawns spinner.
  - Starts `mockApiCall("ap")`.
- **API Resolution**:
  - After 500ms, API resolves with `["apple", "apricot"]`.
  - Code checks `activeQuery === query` (`"ap" === "ap"`). Matches!
  - Saves in cache: `cache.set("ap", ["apple", "apricot"])`.
  - Render function clears loader and draws list: `Apple` and `Apricot`.
  - UI updates.

---

## 9. Common Mistakes

- **Mistake 1: Not checking `activeQuery` before rendering.**
    If request 1 (query `"a"`) takes 1000ms, and request 2 (query `"ab"`) takes 200ms, request 2 resolves first. If request 1 resolves later and you don't check `activeQuery`, the page will overwrite the `"ab"` results with the older `"a"` results, confusing the user.
- **Mistake 2: Caching errors or empty inputs.**
    If a database timeout occurred, caching the error prevents the user from retrying the search when connection is restored.

---

## 10. Debugging

### Simulating Race Conditions
To test if your application is vulnerable to race conditions:
1. Open the mock API file.
2. Set the latency delay to be inversely proportional to the query length (e.g. short queries take 1500ms, long queries take 200ms).
3. Type `"a"` then immediately type `"ab"`.
4. If the UI briefly displays `"ab"` results and then switches back to displaying `"a"` results, your race prevention check is missing.

---

## 11. Real World Usage

- **Search Autocomplete Components**: Search bars on platforms like Amazon or Google use debounced inputs and local caches to optimize autocomplete overlays.
- **Map Viewport Queries**: Map widgets (like Google Maps) debounce fetch requests when the user pans or zooms, querying database coordinates only when panning stops.

---

## 12. Interview Preparation

### Question: How do you prevent race conditions when implementing autocomplete search bars?
- **Wrong Answer**: By using `async/await` on every call.
- **Good Answer**: I prevent race conditions by implementing an **active query tracker**. I store the latest search query string in an instance variable (e.g. `this.activeQuery`). When an asynchronous API request resolves, I check if the query string used for that request still matches `this.activeQuery`. If the user has typed new characters since the request was sent, the strings won't match, and I discard the stale API response without rendering it.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic HTML page with an input and log the input value debounced by 500ms.
2. **Medium**: Add a clear button `(X)` to the search bar. Clicking it should clear the inputs, results, and reset the active query state.
3. **Hard**: Implement a cache invalidation policy that automatically clears entries in the query cache after 5 minutes to prevent displaying stale data.

---

## 14. Mini Assignment

Write a function `preheatCache(queries)` that takes an array of common search terms and pre-fetches and caches their results on page load.

---

## 15. Mini Project

Create a single-file HTML/JS debounced search bar application that implements the controller, cache mappings, and loading status states documented in this chapter.

```html
<!-- search-sandbox.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Debounced Search Sandbox</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .loader { display: none; color: blue; }
    .error { color: red; }
  </style>
</head>
<body>
  <div id="search-widget">
    <h2>Debounced Search</h2>
    <input type="text" id="search-input" placeholder="Type 'ap' or 'ba'...">
    <div id="search-status" class="loader">Loading results...</div>
    <ul id="search-results"></ul>
  </div>

  <script>
    class AutocompleteSearch {
      constructor() {
        this.input = document.getElementById("search-input");
        this.results = document.getElementById("search-results");
        this.status = document.getElementById("search-status");
        this.cache = new Map();
        this.activeQuery = "";
        this.init();
      }

      init() {
        const handler = this.debounce((e) => {
          this.search(e.target.value.trim());
        }, 300);
        this.input.addEventListener("input", handler);
      }

      debounce(fn, delay) {
        let timer = null;
        return function(...args) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => fn.apply(this, args), delay);
        };
      }

      async search(query) {
        if (!query) {
          this.results.innerHTML = "";
          return;
        }
        this.activeQuery = query;

        if (this.cache.has(query)) {
          this.render(this.cache.get(query));
          return;
        }

        this.status.style.display = "block";
        this.results.innerHTML = "";

        try {
          const data = await this.fetchMock(query);
          if (this.activeQuery !== query) return; // Block race
          
          this.cache.set(query, data);
          this.render(data);
        } catch (e) {
          if (this.activeQuery === query) {
            this.status.innerHTML = `<span class="error">${e.message}</span>`;
          }
        }
      }

      render(items) {
        this.status.style.display = "none";
        this.status.innerHTML = "Loading results...";
        this.results.innerHTML = items.length
          ? items.map(i => `<li>${i}</li>`).join("")
          : "<li>No results found</li>";
      }

      fetchMock(query) {
        return new Promise(res => {
          setTimeout(() => {
            const db = ["apple", "apricot", "banana", "berry"];
            const matches = db.filter(i => i.startsWith(query.toLowerCase()));
            res(matches);
          }, 500);
        });
      }
    }

    new AutocompleteSearch();
  </script>
</body>
</html>
```

---

## 16. Chapter Summary

- **Debounce search inputs** by 300ms to reduce database query loads.
- Implement a **query cache** to bypass redundant network requests.
- Use an **active query tracker** to block stale async results (prevent race conditions).
- Provide clear UI loading, error, and empty states.

---

## 17. Quiz

1. Why is an in-memory `Map` preferred over a plain object for query caching?
2. How do we check if an incoming async response is stale?
3. What happens if the debounce delay is set to 0ms?

---

## 18. Next Chapter Preview

In the next chapter, we will study the **Spec - Custom Promise.all**. We will explore asynchronous task coordination, counter limits, and custom error rejection propagation.

---


## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Debounced Search component ko standard search bars (jaise Google ya Amazon search) mein optimize karne ke liye design kiya jata hai. Isme teen important features hote hain:
1. **Debouncing**: Jab user type kar raha hota hai, toh har ek keypress par API call karne ke bajaye hum ek timer (jaise 300ms) set karte hain. Jab user typing pause karta hai, tabhi actual API request send hoti hai. Isse server load bachta hai.
2. **In-Memory Cache**: Jo search queries user pehle kar chuka hai (jaise "apple"), unhe hum ek `Map` mein store kar lete hain, taaki dubara wahi word search karne par network request bypass ho sake.
3. **Race Condition Protection**: Asynchronous requests alag-alag speeds par chal sakti hain. Agar user ne pehle "a" search kiya aur fir fast type karke "ab" search kiya, toh "a" ka response late aa kar "ab" ke fresh results ko overwrite kar sakta hai. Is problem se bachne ke liye hum latest search tracker maintain karte hain.

### Andar kya hota hai (Internal Working)

V8 event loop aur memory level par optimization process kaise kaam karti hai:
1. **Debounce Timer Cleaning**: Har new keypress event par hum V8 event loop queue se purana pending timer `clearTimeout(timeoutId)` call karke clear kar dete hain, aur ek naya `setTimeout` timer schedule kar dete hain. Isse macrotask queue mein redundant fetch tasks enqueue nahi hote.
2. **Active Query Tracker**: Jab hum fetch API call trigger karte hain, toh current query string ko `this.activeQuery` variable mein lock kar dete hain. Jab network call back-end se resolve hoti hai, tab callback validation check karta hai: `if (responseQuery === this.activeQuery)`. Agar match nahi hota, toh callback response ko discard kar deta hai.

### Code Example samjho

```javascript
class SearchController {
  constructor(input, results, status) {
    this.input = input;
    this.results = results;
    this.status = status;
    this.cache = new Map();
    this.activeQuery = "";
  }
}
```

**Line by line:**
- `this.cache = new Map()` — In-memory map query aur response mappings ko store karta hai taaki redundant calls na hon.
- `this.activeQuery` — String state tracker jo user ki latest dynamic input query ko hold karta hai taaki stale asynchronous responses ko drop kiya ja sake.

### Sabse badi galti log karte hain

Race conditions checks ko implement na karna. Agar user back-to-back fast search query inputs bhejta hai, toh internet latency ke karan purani slow query naye search output ke upar show ho sakti hai. Hamesha check karo ki resolve hone wala request parameter active query se match kar raha ho tabhi UI render karo.

### Yaad rakhne ki cheez

**Hamesha search inputs par debounce timer lagao, in-memory Map se search results cache karo, aur response aane par active query check karke race conditions ko avoid karo.**
## 20. Completion Checklist

- [ ] I can write input listeners with debounce wrappers.
- [ ] I know how to implement query caches to optimize search.
- [ ] I understand how to resolve asynchronous race conditions.
- [ ] I can manage load, error, and success statuses in the UI.
