# Fetch API & Async Patterns

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of Promise chains and Async/Await syntax
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are ordering food from a delivery app:

- **Standard Fetch is like placing the order**: You click order. The app connects to the restaurant.
- **The HTTP Status Trap is like receiving the wrong order**: If the restaurant accepts your order but sends you empty boxes (404 Not Found or 500 Server Error), the delivery driver still completes the delivery. They don't crash their motorcycle (reject the Promise). You still received a delivery (fulfilled Promise), but you must open the boxes and check if the food is correct (`response.ok` check).
- **AbortController is like canceling the order mid-transit**: You place an order. Suddenly, you realize you ordered to your old office address. You call the driver: *"Stop! Cancel the delivery immediately."* The driver stops and returns to the store (aborts the fetch request).
- **Retry with Exponential Backoff is like trying again when the line is busy**: You call the restaurant. It's busy. You don't redial instantly 100 times per second, crashing their phone system. You wait 1 second. If still busy, you wait 2 seconds. Then 4 seconds. Then 8 seconds. You back off progressively until you connect or hit a limit.

In web development, this is how you manage network requests.

---

## 2. Problem

Modern web apps rely on network requests:
- Loading dashboard statistics.
- Uploading profiles.
- Querying search inputs.

If requests are poorly handled:
- Network errors or server crashes can freeze the UI.
- Slow connections can lead to race conditions where old search results overwrite new ones.
- Flooding the server with immediate retries when it is down can prolong the outage.

---

## 3. Solution

We use the standard **Fetch API** combined with network management patterns:
1. **Response Verification**: Checking `response.ok` to catch HTTP errors (like 404 and 500) that do not trigger Promise rejections.
2. **AbortController**: Canceling active network requests dynamically when they are no longer needed.
3. **Resilient Execution Patterns**: Building retry loops with exponential backoff to handle temporary network issues gracefully.

---

## 4. Definition

- **Fetch API**: A modern, promise-based browser interface for making HTTP requests.
- **`response.ok`**: A boolean property indicating if the response status is in the successful range (200–299).
- **`AbortController`**: An interface that allows you to abort one or more web requests when needed.
- **Exponential Backoff**: A retry strategy that increases the delay between attempts exponentially (e.g. 1s, 2s, 4s, 8s) to avoid overloading the server.

---

## 5. Visualization

### Fetch Request Lifecycle

```
                 [ Call fetch(url) ]
                          |
             +------------+------------+
             |                         |
     Network resolves            Network fails
     (HTTP 200, 404, 500)      (No internet, DNS error)
             |                         |
             v                         v
     Promise: Fulfilled        Promise: Rejected
             |                         |
             v                         v
     [ Check response.ok ]          .catch(err)
      - true: Parse JSON
      - false: Throw Error
```

---

## 6. Internal Working

When you invoke `fetch(url)`:
1. **Network Request Initialization**: The engine parses the URL and passes the request details to the browser's network manager (written in C++ or Rust).
2. **Promise Return**: V8 returns a pending Promise immediately, freeing the main thread.
3. **Background Resolution**: The browser network manager executes DNS lookup, TCP handshake, and HTTP requests in background threads.
4. **Header Check**: As soon as the server returns the HTTP response headers (before the body is downloaded), the background thread moves the fetch callback to the Microtask Queue.
5. **Parsing**: When you call `response.json()`, the engine runs a stream reader to download the response body chunks, parsing them into a JavaScript object once complete.

---

## 7. Code Examples

### Bad Practice: Ignoring HTTP Status Checks
Assuming a resolved fetch Promise means the request succeeded.

```javascript
// Bad: If server returns HTTP 500, response is still parsed, causing errors!
async function loadUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json(); // May crash if payload is HTML error message
    renderProfile(data);
  } catch (error) {
    console.error(error.message);
  }
}
```

### Good Practice: Explicit Status Verification
Always check `response.ok` and throw an error manually for non-2xx status codes.

```javascript
// Good: Catches server and client-side HTTP errors
async function loadUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: Status ${response.status}`);
    }
    
    const data = await response.json();
    renderProfile(data);
  } catch (error) {
    console.error("Load failed:", error.message);
  }
}
```

### Best Practice: Aborting Requests with Timeouts
Use `AbortController` to cancel requests if they take too long, protecting your application's responsiveness.

```javascript
// Best Practice: Request timeout using AbortController
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out");
    }
    throw error;
  }
}
```

---

## 8. Dry Run

Let's dry run the retry loop with exponential backoff:

```javascript
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (err) {
    if (retries === 0) throw err;
    console.log(`Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1, delay * 2);
  }
}
```

### Step-by-Step State (Server returns 500)
- **Attempt 1**:
  - `fetch(url)` resolves. `res.ok` is `false`. Error `"Server error"` is thrown.
  - `catch` block catches error. `retries = 3` (not 0).
  - Logs: `"Retrying in 1000ms..."`.
  - Awaits 1000ms timeout.
  - Recursively calls `fetchWithRetry` with `retries = 2`, `delay = 2000`.
- **Attempt 2**:
  - `fetch` fails again. Throws error.
  - Logs: `"Retrying in 2000ms..."`.
  - Awaits 2000ms timeout.
  - Recursively calls `fetchWithRetry` with `retries = 1`, `delay = 4000`.
- **Attempt 3**:
  - `fetch` fails again. Throws error.
  - Logs: `"Retrying in 4000ms..."`.
  - Awaits 4000ms timeout.
  - Recursively calls `fetchWithRetry` with `retries = 0`, `delay = 8000`.
- **Attempt 4**:
  - `fetch` fails. Throws error.
  - `retries === 0`. The function throws the error up to the parent caller, ending the retries.

---

## 9. Common Mistakes

- **Mistake 1: Forgetting that Fetch only rejects on network failure.**
    HTTP 404, 403, and 500 errors do NOT reject the fetch promise. They resolve normally.
- **Mistake 2: Not checking for aborted exceptions.**
    If you abort a fetch, the promise rejects with an `AbortError`. If you don't catch this specifically, it can trigger global uncaught error logs.

---

## 10. Debugging

### Simulating Network Outages and Slowdowns
To test your fetch error handling and timeouts:
1. Open Chrome DevTools.
2. Navigate to the **Network** tab.
3. Locate the throttling dropdown (labeled **No Throttling** by default).
4. Select:
    - **Offline**: To trigger instant network failure rejections.
    - **Slow 3G**: To test your request timeout limits.
5. Run your code and check the console logs to verify that the failures are handled gracefully.

---

## 11. Real World Usage

- **Autocomplete Search Inputs**: When a user types fast, the app aborts the previous pending fetch request before launching a new one to prevent old results from overwriting the latest response.
- **Service Workers**: Intercepting page requests using custom fetch handlers to return cached files when the user is offline.

---

## 12. Interview Preparation

### Question: Does the Fetch Promise reject if the server returns a 500 Internal Server Error status?
- **Wrong Answer**: Yes, any error status code rejects the promise.
- **Good Answer**: No. The Fetch Promise only rejects if the request cannot be completed due to a physical network failure (such as a DNS lookup failure, loss of internet connection, or a firewall block). HTTP status codes (like 500, 404, or 403) represent completed server communications, so the Promise resolves normally. You must verify success manually by checking the `response.ok` property.

---

## 13. Practice

### Exercises
1. **Easy**: Write a fetch script that requests user profiles and logs the HTTP status code.
2. **Medium**: Write a function that aborts a fetch request immediately if it takes longer than 500ms.
3. **Hard**: Implement a paginated fetch utility that dynamically requests page 1, page 2, etc., stopping when the returned data array is empty.

---

## 14. Mini Assignment

Write a fetch request with a search query. Abort the request if the user updates the input field before the previous request finishes.

---

## 15. Mini Project

Create a modular search downloader client `APIClient` that executes requests with support for auto-timeouts, HTTP status checks, and exponential backoff retry loops.

```javascript
// resilient-api-client.js
class APIClient {
  static async request(url, options = {}) {
    const { timeout = 3000, retries = 2, delay = 1000 } = options;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timerId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timerId);

      const isTimeout = error.name === 'AbortError';
      const actualError = isTimeout ? new Error("Request Timeout") : error;

      if (retries > 0) {
        console.warn(`Error: ${actualError.message}. Retrying in ${delay}ms...`);
        // Wait then retry
        await new Promise(res => setTimeout(res, delay));
        return APIClient.request(url, { ...options, retries: retries - 1, delay: delay * 2 });
      }

      throw actualError;
    }
  }
}

// Test Run
APIClient.request("https://jsonplaceholder.typicode.com/posts/1", { timeout: 5000 })
  .then(data => console.log("Fetch Complete. Title:", data.title))
  .catch(err => console.error("Client Failed:", err.message));
```

---

## 16. Chapter Summary

- The **Fetch API** resolves HTTP requests using Promises.
- Check **`response.ok`** to verify the HTTP status range is successful.
- Use **`AbortController`** to cancel active requests and implement timeouts.
- Apply **Exponential Backoff** to schedule retries without overloading servers.

---

## 17. Quiz

1. How do you check if a response returned a 2xx success status?
2. What exception name is thrown when a request is canceled using `AbortController`?
3. Why should you avoid retrying failed network requests immediately?

---

## 18. Next Chapter Preview

In the final chapter of this module, we will explore **Async Debugging & Common Bugs**. We will study race conditions, unhandled promise rejections, memory leaks, and how to analyze complex asynchronous traces.

---


## 19. 🇮🇳 Hinglish Summary

- **Problem**: XMLHttpRequest verbose aur callback-based tha — modern async patterns ke saath integrate nahi karta tha.
- **Concept**: etch() ek Promise-based HTTP client hai — Response object milta hai, .json() / .text() se data extract karo.
- **Key Pattern**: const res = await fetch(url); if (!res.ok) throw new Error(res.status); const data = await res.json();.
- **Common Mistake**: etch() sirf network error pe reject hota hai — 404/500 responses ok: false ke saath resolve hote hain, throw nahi karte.
## 19. Completion Checklist

- [ ] I can verify HTTP response states using `response.ok`.
- [ ] I know how to cancel pending requests using `AbortController`.
- [ ] I can build network retry loops with exponential delays.
- [ ] I can simulate offline conditions using DevTools.
