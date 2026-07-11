# Temporal API

- **Difficulty Level**: Intermediate to Advanced
- **Estimated Reading Time**: 20 minutes
- **Prerequisites**: Understanding of JavaScript objects, Promises, and the `Date` built-in
- **Version Tag**: `v1.0`

---

## 1. Real-Life Story

Imagine you are a software engineer at an airline company. Your task is to schedule a flight from Mumbai (UTC+5:30) to New York (UTC-5). You use JavaScript's old `Date` object to calculate the departure and arrival times.

The nightmare begins. `Date` stores everything as UTC milliseconds. It has no concept of timezones, calendars, or duration arithmetic. You spend three days fighting Daylight Saving Time (DST) bugs. A user in London misses their flight because your UI showed the wrong local time.

Now imagine a library that thinks in **plain dates**, **plain times**, **zoned date-times**, **durations**, and **instants** separately. You tell it "Schedule for 2 PM in Mumbai timezone" and it handles UTC offsets and DST automatically.

That library is now built into JavaScript. It is called **Temporal**.

---

## 2. Problem

`Date` is one of the most broken APIs in JavaScript:

- `new Date(2024, 0, 15)` — month is 0-indexed. January is `0`. This is a constant source of bugs.
- No timezone support. `Date` always represents UTC + your local offset. You cannot work with "2 PM in Kolkata" without third-party libraries.
- No duration math. You cannot add "3 months" to a date without complex manual logic.
- Mutable. `date.setMonth(3)` changes the original object, causing state mutation bugs.
- No calendar support. Non-Gregorian calendars (Islamic, Hebrew, Japanese) are not supported.

---

## 3. Solution

The **Temporal API** (TC39 Stage 4 / shipping in modern engines) provides a complete, immutable, timezone-aware date-time system built natively into JavaScript. It is inspired by the battle-tested Java `java.time` library and the `moment.js`/`Luxon` third-party ecosystem.

Every Temporal object is **immutable** — operations return new objects.

---

## 4. Definition

**Temporal** is a global namespace object that contains a family of date-time types:

| Type | Description |
|:--|:--|
| `Temporal.Instant` | A single point in UTC time (like a timestamp) |
| `Temporal.PlainDate` | A calendar date with no time or timezone (e.g., 2024-01-15) |
| `Temporal.PlainTime` | A wall-clock time with no date or timezone (e.g., 14:30:00) |
| `Temporal.PlainDateTime` | Date + Time, no timezone |
| `Temporal.ZonedDateTime` | Date + Time + Timezone — the full picture |
| `Temporal.Duration` | A span of time (e.g., 2 years, 3 months, 10 days) |
| `Temporal.TimeZone` | A named timezone (e.g., `"Asia/Kolkata"`) |
| `Temporal.Calendar` | A calendar system (e.g., `"iso8601"`, `"islamic"`) |

---

## 5. Visualization

### The Temporal Type Hierarchy

```
           Temporal Namespace
           /              \
    Instant           PlainDate
  (UTC point)       (Date only)
        |                |
  ZonedDateTime    PlainDateTime
  (Date+Time+TZ)   (Date+Time)
                         |
                    PlainTime
                   (Time only)

  Duration ← represents spans between any of the above
```

### Key contrast with `Date`

```
OLD: new Date("2024-01-15T14:30:00")
     ┌─────────────────────────────────────┐
     │ Internally stored as UTC millis     │
     │ Timezone = your system local        │
     │ Month = 0-indexed (January = 0)     │
     │ Mutable object                      │
     └─────────────────────────────────────┘

NEW: Temporal.PlainDateTime.from("2024-01-15T14:30:00")
     ┌─────────────────────────────────────┐
     │ month = 1 (January = 1) ✓           │
     │ Immutable — with() returns new obj  │
     │ Timezone explicit via ZonedDateTime │
     │ Duration-safe arithmetic            │
     └─────────────────────────────────────┘
```

---

## 6. Internal Working

Temporal is implemented via a set of immutable record types backed by the engine's internal ISO 8601 arithmetic engine:

1. **`Temporal.Instant`**: Stores a `BigInt` nanosecond count since the Unix Epoch (1970-01-01T00:00:00Z). It is the raw time point.
2. **`Temporal.PlainDate`**: Stores `{ year, month, day, calendar }`. No time component. ISO 8601 calendar by default.
3. **`Temporal.ZonedDateTime`**: Wraps `Instant + TimeZone + Calendar`. When you call `.toPlainDateTime()`, the engine resolves the timezone offset (including DST rules from the IANA timezone database) to compute the local date-time components.
4. **Arithmetic**: All `add()`/`subtract()` methods accept a `Temporal.Duration` or a plain object `{ months: 3, days: 10 }`. The engine handles DST transitions by resolving the resulting absolute instant using the timezone's transition rules.
5. **Immutability**: All types are frozen. `.with({ month: 6 })` constructs and returns a new object.

---

## 7. Code Examples

### Bad Practice: Using `Date` for timezone-aware scheduling

```javascript
// Bad: Prone to DST and timezone bugs
const departure = new Date("2024-03-10T02:30:00"); // DST transition date in US!
const arrivalMs = departure.getTime() + (14 * 60 * 60 * 1000); // +14 hours
const arrival = new Date(arrivalMs);
// This may show wrong time due to DST spring-forward on March 10.
console.log(arrival.toString()); // ❌ Off by 1 hour in US timezones
```

### Good Practice: Using `Temporal.PlainDateTime` for local-only math

```javascript
// Good: Unambiguous local arithmetic
const departure = Temporal.PlainDateTime.from("2024-03-10T02:30:00");
const arrival = departure.add({ hours: 14 });
console.log(arrival.toString()); // "2024-03-10T16:30:00" ✓ No DST ambiguity
```

### Best Practice: Using `Temporal.ZonedDateTime` for full timezone correctness

```javascript
// Best Practice: Full timezone-aware scheduling
const departure = Temporal.ZonedDateTime.from({
  timeZone: "Asia/Kolkata",
  year: 2024, month: 3, day: 10,
  hour: 2, minute: 30
});

const arrival = departure.withTimeZone("America/New_York").add({ hours: 14 });

console.log(departure.toString());
// "2024-03-10T02:30:00+05:30[Asia/Kolkata]" ✓

console.log(arrival.toString());
// Correctly accounts for DST in New York ✓

// Duration between two dates
const duration = Temporal.Duration.from({ months: 2, days: 15 });
const deadline = departure.add(duration);
console.log(deadline.toPlainDate().toString()); // "2024-05-25" ✓
```

---

## 8. Dry Run

```javascript
const start = Temporal.PlainDate.from("2024-01-31");
const result = start.add({ months: 1 });
console.log(result.toString());
```

### Step-by-Step State
- **`Temporal.PlainDate.from("2024-01-31")`**: Engine creates an immutable record `{ year: 2024, month: 1, day: 31, calendar: "iso8601" }`.
- **`.add({ months: 1 })`**: Engine attempts month = 2, day = 31. February 2024 has only 29 days. Engine applies overflow strategy (`"constrain"` by default): clamps day to `29`.
- **`result.toString()`**: Serializes to `"2024-02-29"`. Correct — 2024 is a leap year.

---

## 9. Common Mistakes

- **Mistake 1: Using `PlainDateTime` when timezone matters.**
  If users are in different timezones, `PlainDateTime` is wrong. Use `ZonedDateTime`.
- **Mistake 2: Forgetting that Temporal does not replace `Date` immediately.**
  You still need `Date.now()` for compatibility with older APIs. Use `Temporal.Now.instant()` for Temporal-native code.
- **Mistake 3: Mixing Temporal types with `Date` objects.**
  You cannot directly compare a `Temporal.Instant` with a `Date`. Convert using `date.toTemporalInstant()` (a polyfill bridge method).

---

## 10. Debugging

### Inspecting Temporal objects in Chrome DevTools

1. Open Chrome DevTools Console.
2. Type: `Temporal.Now.zonedDateTimeISO("Asia/Kolkata")`
3. The console will display the fully resolved `ZonedDateTime` object with all fields expanded (year, month, day, hour, minute, second, timeZone, calendar).
4. Call `.toString()` to get an ISO 8601 string for logging.

---

## 11. Real World Usage

- **Scheduling apps**: Use `ZonedDateTime` to store events in user-local times, preserving the timezone intent even when the user travels.
- **Billing cycles**: Use `PlainDate.add({ months: 1 })` to advance billing dates correctly, avoiding month-length overflow bugs.
- **Relative date displays**: Use `Temporal.Now.plainDateISO().until(dueDate)` to compute a `Duration` for "3 days remaining" displays.

---

## 12. Interview Preparation

### Question: What is the Temporal API and why was it introduced?
- **Wrong Answer**: Temporal is a better version of `Date` that uses UTC.
- **Good Answer**: Temporal is a Stage 4 TC39 proposal providing a complete date-time library with distinct types for instants, plain dates, plain times, timezone-aware dates, and durations. It was introduced to fix `Date`'s fundamental flaws: 0-indexed months, mutability, lack of timezone/calendar support, and absence of duration arithmetic. Every Temporal object is immutable, and all arithmetic respects IANA timezone rules including DST transitions.

### Question: What is the difference between `Temporal.Instant` and `Temporal.ZonedDateTime`?
- **Instant**: A raw UTC nanosecond timestamp — just a point in time, no calendar, no timezone presentation.
- **ZonedDateTime**: An Instant resolved against a named IANA timezone and calendar — the full, human-readable date-time in a specific locale.

---

## 13. Practice

1. **Easy**: Create a `Temporal.PlainDate` for today and add 30 days to it.
2. **Medium**: Write a function that takes two IANA timezone names and a time, and returns which timezone shows an earlier clock time.
3. **Hard**: Build a meeting scheduler that checks if a proposed meeting time (given in `Asia/Kolkata`) falls within business hours (9 AM – 6 PM) in `America/New_York`.

---

## 14. Mini Assignment

Write a function `daysUntilDeadline(isoDateString)` that accepts an ISO date string (e.g., `"2024-12-31"`) and returns how many days are left from today, using `Temporal.PlainDate`.

---

## 15. Mini Project

Build a **World Clock CLI** using `Temporal.Now.zonedDateTimeISO()`:
- Accept 3 timezone strings as inputs.
- Display the current time in each timezone formatted as `"HH:MM — TimeZone"`.
- Highlight if any timezone is currently in "business hours" (9–17).

```javascript
// world-clock.js
const zones = ["Asia/Kolkata", "America/New_York", "Europe/London"];

zones.forEach(tz => {
  const zdt = Temporal.Now.zonedDateTimeISO(tz);
  const hour = zdt.hour;
  const isBiz = hour >= 9 && hour < 17;
  const label = isBiz ? "🟢 Business Hours" : "🔴 Off Hours";
  console.log(`${zdt.toPlainTime().toString().slice(0, 5)} — ${tz} ${label}`);
});
```

---

## 16. Chapter Summary

- `Date` is broken: mutable, 0-indexed months, no timezone/calendar/duration support.
- `Temporal` provides distinct types: `Instant`, `PlainDate`, `PlainTime`, `PlainDateTime`, `ZonedDateTime`, `Duration`.
- All Temporal objects are **immutable**; arithmetic returns new objects.
- `ZonedDateTime` is the correct type for any time that must be interpreted in a user's local timezone.
- Use `Temporal.Now.*` methods to get the current instant, date, or zoned date-time.

---

## 17. Quiz

1. What is the key difference between `Temporal.PlainDate` and `Temporal.ZonedDateTime`?
2. What overflow strategy does `Temporal` apply by default when adding months causes an invalid day?
3. What internal representation does `Temporal.Instant` use to store time?

---

## 18. Next Chapter Preview

In the next chapter, we explore **Explicit Resource Management** using the new `using` and `await using` declarations — a JavaScript-native way to deterministically clean up resources like file handles, database connections, and subscriptions, inspired by RAII patterns in C++/Rust.

---

## 19. 🇮🇳 Hindi Explanation

### Concept kya hai

Modern Temporal API standard Date object ke structural bugs (mutability issues, missing timezones supports, bad parsing systems) ko resolve karne ke liye standard specification update hai. Temporal API hamesha **Immutable** objects return karta hai, time zones support default configure, aur distinct types profiles features maps checks provides: Temporal.Now (current state), Temporal.Instant (UTC epoch timestamp coordinates) aur Temporal.ZonedDateTime (time zone explicit mappings).

### Andar kya hota hai (Internal Working)

Temporal API internal engine processes:
1. **Nanosecond Monotonic precision**: Temporal constructs represent time precision up to nanoseconds scale (Date objects limit was milliseconds).
2. **Strict Time Zone Database integration**: Object instantiations reference system timezone data directly, auto-computing DST (Daylight Saving Time) offset transitions dynamically on additions operations.
3. **Immutability checks**: Modification methods (.add(), .subtract()) instantiate a new object in the Heap instead of updating existing objects references.

### Code Example samjho

`javascript
// Good: Immutable timezone calculations with Temporal API
const instant = Temporal.Instant.from("2026-07-11T12:00:00Z");
const zdt = instant.toZonedDateTimeISO("Asia/Kolkata");
console.log(zdt.toString()); // "2026-07-11T17:30:00+05:30[Asia/Kolkata]"

// Adding duration returns a new object!
const nextWeek = zdt.add({ weeks: 1 });
console.log(zdt.toString());      // Original is untouched!
console.log(nextWeek.toString()); // "2026-07-18T17:30:00+05:30[Asia/Kolkata]"
`

**Line by line:**
- instant.toZonedDateTimeISO(...) — maps UTC instant to target timezone ISO parameters.
- zdt.add({ weeks: 1 }) — computes next week's date.
- 
extWeek — returns a new distinct Temporal object in the Heap, preserving original zdt state.

### Sabse badi galti log karte hain

Temporal API objects modifications mutable style write attempts. Original Date object setDate() mutates objects. Temporal APIs require capturing the returned modified instance explicitly.

### Yaad rakhne ki cheez

**Temporal API represents immutable time objects with nanosecond accuracy and robust timezone support.**

## 20. Completion Checklist

- [ ] I can explain why `Date` is problematic and what Temporal solves.
- [ ] I know the difference between `Temporal.Instant`, `PlainDate`, and `ZonedDateTime`.
- [ ] I can write timezone-aware date arithmetic using `ZonedDateTime.add()`.
- [ ] I understand that all Temporal objects are immutable.
