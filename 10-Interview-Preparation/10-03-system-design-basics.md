# System Design Basics

- **Difficulty Level**: Advanced
- **Estimated Reading Time**: 15 minutes
- **Prerequisites**: Understanding of browser storage, events, network protocols, and component architectures
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are an architect designing a massive metropolitan airport terminal:

- **Component Architecture is like prefabricated building modules**: You design standard passenger gates, check-in desks, and security stalls. Each desk is self-contained (modular). You do not build a separate unique gate structure for every airline; you clone the gate template (reusable components).
- **State Management is the flight information display systems (FIDS)**: If an airline updates a gate number in the central database (global state), all screens throughout the terminal update instantly. You do not ask a staff member to walk to 500 screens and write the gate number with a marker (local state updates).
- **Data Flow is passenger movement pathways**: You design pathways so passengers only walk in one direction (unidirectional data flow) from check-in to security to gate, avoiding congestion.
- **Optimistic Updates is like printing a boarding pass before confirming the plane has landed**: When a guest arrives, you print the slip. It speeds up flow. If a delay occurs, you handle it as an exception.

In JavaScript, **System Design** is this architectural planning process for large applications.

---

## 2. Problem

Building large frontend web applications without an upfront architectural design leads to:
- **Spaghetti Code**: Components are tightly coupled, making modifications in one module break unrelated features.
- **State Inconsistencies**: Child components manage local copies of global data, causing pages to display conflicting information.
- **Poor Performance**: Redundant API calls, lack of client-side caching, and massive un-split code bundles cause high load latency.

---

## 3. Solution

We apply **System Design** methodologies tailored to JavaScript frontends:
1. **Modular Component Design**: Creating single-responsibility, decoupled components.
2. **Unidirectional State Flow**: Managing application state in a central store, ensuring one-way data updates.
3. **Client-Side Caching**: Implementing state caches (like Stale-While-Revalidate) to reduce network requests.

---

## 4. Definition

- **System Design**: The process of defining the architecture, components, modules, interfaces, and data for a system to satisfy specified requirements.
- **Unidirectional Data Flow**: A design pattern where data moves in a single direction (Action -> State Update -> View Render), making updates predictable.
- **Optimistic UI Update**: A pattern where the UI updates immediately to reflect a user action before the server confirms success, rolling back only on failure.

---

## 5. Visualization

### Frontend Notification System Architecture

```
   [ WebSockets / SSE ] ---> [ Event Manager / Event Broker ]
                                     | (Pushes new notification event)
                                     v
                        [ Central Store / State ] <--- (Optimistic local additions)
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
   [ Feed Component ]                             [ Badge Count Component ]
   (Renders notification list)                    (Displays number of unread alerts)
```

---

## 6. Internal Working

How state and rendering interact at the system level:

1. **State-View Sync Loop**: When an event modifies the central state (e.g. `state.unreadCount++`), the system notifies all components subscribed to that slice of state.
2. **Micro-Frontend Sandboxing**: Under advanced setups, different modules (e.g. payments, dashboard) are loaded as separate, lazy-loaded bundles that communicate using custom event brokers (`CustomEvent` APIs), preventing scripts in one sandbox from crashing the other.

---

## 7. Code Examples

### Bad Practice: Coupled State Manipulation
Letting child components directly mutate parent properties causes unpredictable side effects.

```javascript
// Bad: Direct parent mutation by child
class NotificationItem {
  constructor(parent, id) {
    this.parent = parent;
    this.id = id;
  }

  markAsRead() {
    // Child directly manipulates parent arrays!
    this.parent.notifications = this.parent.notifications.filter(n => n.id !== this.id);
    this.parent.render(); // Coupled rendering trigger
  }
}
```

### Good Practice: Decoupled Store with Unidirectional Flow
Use an event-driven state manager where components dispatch actions to modify a central store.

```javascript
// Good: Simple Unidirectional State Store
class Store {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  dispatch(action) {
    if (action.type === "ADD_NOTIFICATION") {
      this.state.items.push(action.payload);
    } else if (action.type === "MARK_READ") {
      this.state.items = this.state.items.filter(n => n.id !== action.payload);
    }
    
    // Notify all subscribers of state change
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

### Best Practice: Optimistic UI Updates
Implement optimistic updates to make the interface feel responsive, rolling back the state if the server request fails.

```javascript
// Best Practice: Optimistic UI handler
const notificationStore = new Store({ items: [] });

const deleteNotificationOptimistic = async (notificationId) => {
  const backupState = [...notificationStore.state.items];

  // 1. Optimistically update state immediately (UI responds instantly!)
  notificationStore.dispatch({ type: "MARK_READ", payload: notificationId });
  console.log("UI updated optimistically.");

  try {
    // 2. Send API request
    await sendDeleteRequest(notificationId); 
    console.log("Server confirmed deletion.");
  } catch (error) {
    // 3. Rollback on failure
    console.warn("Server failed to delete. Rolling back UI state...");
    notificationStore.state.items = backupState;
    notificationStore.listeners.forEach(l => l(notificationStore.state));
  }
};

const sendDeleteRequest = (id) => new Promise((res, rej) => {
  // Simulate network failure 50% of the time
  setTimeout(() => Math.random() > 0.5 ? res() : rej(new Error("API Timeout")), 800);
});
```

---

## 8. Dry Run

Let's dry run the Optimistic Update process:

- **Initial State**: `store.items` contains `[{ id: 1 }, { id: 2 }]`.
- **User clicks "Delete Item 1"**:
  - `backupState` stores a copy: `[{ id: 1 }, { id: 2 }]`.
  - `store.dispatch({ type: "MARK_READ", payload: 1 })` runs.
  - State updates to `[{ id: 2 }]`.
  - UI re-renders and removes Item 1 immediately.
- **API Request completes**:
  - **Scenario A (Success)**: `sendDeleteRequest` resolves. No further actions needed.
  - **Scenario B (Failure)**: `sendDeleteRequest` rejects.
    - Code enters `catch` block.
    - Restores state: `store.state.items = backupState` (`[{ id: 1 }, { id: 2 }]`).
    - Triggers subscribers. UI re-renders, restoring Item 1 to the screen.

---

## 9. Common Mistakes

- **Mistake 1: Storing duplicate slices of state in different components.**
    For example, keeping an unread count variable in the header component and a separate unread count in the dashboard. If the state is not unified, they will eventually drift out of sync.
- **Mistake 2: Missing request idempotency keys in optimistic updates.**
    If the user clicks "submit" three times rapidly, and the first request fails, the state can get corrupted without unique tracking keys.

---

## 10. Debugging

### Profiling State Reducer Dispatches
To trace state changes in complex stores:
1. Add a middleware logger inside your dispatch method:
    ```javascript
    dispatch(action) {
      console.group(`Action: ${action.type}`);
      console.log("Before State:", JSON.stringify(this.state));
      // Run reducer logic...
      console.log("After State:", JSON.stringify(this.state));
      console.groupEnd();
    }
    ```
2. Inspect the grouped logs to verify that the state is mutating correctly after every action.

---

## 11. Real World Usage

- **Redux / Zustand State Managers**: State libraries implement unidirectional flows, allowing components to subscribe to specific slices of global state.
- **Offline Sync (PWA)**: E-commerce apps cache cart state in IndexedDB, allowing users to queue purchases offline that sync automatically when the connection is restored.

---

## 12. Interview Preparation

### Question: How do you design a Real-Time Notifications Feed?
- **Wrong Answer**: I will run a `setInterval` that fetches the API every second.
- **Good Answer**: I will design the system in four layers:
    1. **Network Layer**: Use WebSockets or Server-Sent Events (SSE) for low-latency, real-time message delivery from the server.
    2. **State Store**: A central, unidirectional state store that receives notification payloads and manages an array of alerts.
    3. **Component Layer**: Modular, stateless components (Feed List, Badge Count) that subscribe to the state store and re-render only when relevant data updates.
    4. **Cache & Resilience**: Persist notifications to IndexedDB for offline access, and use optimistic UI updates when marking notifications as read, rolling back the state if the server request fails.

---

## 13. Practice

### Exercises
1. **Easy**: Create a basic State Store class that supports subscribing and dispatching actions.
2. **Medium**: Implement an optimistic updater for a Todo list application.
3. **Hard**: Design the frontend architecture for an e-commerce checkout page, outlining the state structures, component hierarchy, and offline synchronization strategies.

---

## 14. Mini Assignment

Write a markdown system design schema for a real-time messaging application, outlining functional requirements, non-functional requirements, state structures, and API endpoints.

---

## 15. Mini Project

Create a modular notifications manager `NotificationSystem`. Implement a WebSocket mock connection that pushes notifications, updates a central store, and notifies multiple UI widget mock components.

```javascript
// notification-system-design.js
const appStore = new Store({ items: [], unreadCount: 0 });

// Mock components subscribing to the store
const logFeedComponent = (state) => {
  console.log("--- UI Feed List ---");
  console.log(state.items.map(item => `[${item.unread ? "Unread" : "Read"}] ${item.text}`));
};

const logBadgeComponent = (state) => {
  console.log(`--- UI Badge Count: ${state.unreadCount} unread ---`);
};

// Bind subscribers
appStore.subscribe(logFeedComponent);
appStore.subscribe(logBadgeComponent);

// Simulate WebSocket event pushing data
const simulateIncomingWebSocketMsg = (messageText) => {
  const newAlert = { id: Date.now(), text: messageText, unread: true };
  
  // Custom Reducer logic inside dispatch
  appStore.state.items.push(newAlert);
  appStore.state.unreadCount++;
  
  // Notify
  appStore.listeners.forEach(l => l(appStore.state));
};

simulateIncomingWebSocketMsg("You received a new message");
```

---

## 16. Chapter Summary

- **Component Architecture** should be modular and single-responsibility.
- **State Management** should follow unidirectional data flow rules.
- **Optimistic UI Updates** improve perceived performance by updating the UI before server confirmation.
- Implement client-side caching (e.g. **IndexedDB**) for offline resilience.

---

## 17. Quiz

1. What is the main benefit of unidirectional data flow?
2. How does an optimistic UI update handle api failures?
3. Why are WebSockets preferred over REST polling for real-time notification systems?

---

## 18. Next Chapter Preview

In the next chapter, we will study **Behavioral & Technical Strategy**. We will explore the STAR method, explaining coding decisions, and handling difficult interview questions.

---

## 19. Completion Checklist

- [ ] I understand the principles of modular component design.
- [ ] I can write a central state store with unidirectional flow.
- [ ] I understand how to implement optimistic UI updates with rollback.
- [ ] I can design frontend systems like notifications feeds conceptually.
