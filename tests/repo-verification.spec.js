const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

// Helper to extract the interactive HTML sandbox block containing scripts
function extractHtmlBlock(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const regex = /```html\r?\n([\s\S]*?)```/g;
  let match;
  let lastHtml = null;
  
  while ((match = regex.exec(content)) !== null) {
    const code = match[1];
    if (code.includes("<script>") || code.includes("<!DOCTYPE html>")) {
      return code;
    }
    lastHtml = code;
  }
  return lastHtml;
}

test.describe("JavaScript Journey Curriculum Verification", () => {
  const rootDir = path.resolve(__dirname, "..");
  const progressPath = path.join(rootDir, "PROGRESS.md");

  test("Verify PROGRESS.md exists and is readable", () => {
    expect(fs.existsSync(progressPath)).toBe(true);
  });

  test("Verify all chapters in PROGRESS.md exist on disk", () => {
    const content = fs.readFileSync(progressPath, "utf-8");
    const regex = /- \[[x\s]\] \[\d{2}-\d{2}\] .*?\(`(.*?)`\)/g;
    
    let match;
    let verifiedCount = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const relativePath = match[1];
      const fullPath = path.join(rootDir, relativePath);
      
      const fileExists = fs.existsSync(fullPath);
      if (!fileExists) {
        console.error(`Missing File: ${relativePath}`);
      }
      expect(fileExists).toBe(true);
      verifiedCount++;
    }
    
    console.log(`Verified ${verifiedCount} chapters exist on disk.`);
    expect(verifiedCount).toBeGreaterThan(0);
  });

  test("Verify all Module README.md files exist", () => {
    const modules = [
      "00-Welcome", "01-Getting-Started", "02-Environment-Setup", "03-JavaScript-Fundamentals",
      "04-Core-JavaScript", "05-Asynchronous-JavaScript", "06-Browser", "07-Advanced-JavaScript",
      "08-Performance", "09-Debugging", "10-Interview-Preparation", "11-Projects",
      "12-Polyfills", "13-Machine-Coding", "14-Cheat-Sheets", "15-Revision", "16-Resources"
    ];

    modules.forEach(mod => {
      const readmePath = path.join(rootDir, mod, "README.md");
      const exists = fs.existsSync(readmePath);
      if (!exists) {
        console.error(`Missing README: ${mod}/README.md`);
      }
      expect(exists).toBe(true);
    });
  });
});

test.describe("Interactive HTML Sandbox Verification", () => {
  const rootDir = path.resolve(__dirname, "..");

  test.beforeEach(async ({ page }) => {
    page.on("console", msg => {
      if (msg.type() === "error") {
        console.log(`PAGE LOG ERROR: ${msg.text()}`);
      }
    });
    page.on("pageerror", err => {
      console.log(`PAGE EXCEPTION: ${err.message}`);
    });
  });

  test("Verify 11-01 Todo App Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "11-Projects", "11-01-todo-app-spec.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    // Inject localStorage mock script directly at the start of the HTML to bypass origin security
    const mockLocalStorageScript = `
<script>
  (function() {
    const store = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { for (let k in store) delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] || null
      },
      writable: true,
      configurable: true
    });
  })();
</script>
`;

    await page.setContent(mockLocalStorageScript + html);

    // Enter a new todo task
    await page.fill(".todo-form input", "Verify Playwright");
    await page.click(".todo-form button");

    // Check if item was appended
    const listItems = page.locator(".todo-list .todo-item");
    await expect(listItems).toHaveCount(1);
    await expect(listItems).toContainText("Verify Playwright");

    // Toggle completion status
    await page.click(".todo-list .todo-item .toggle-btn");
    await expect(listItems).toHaveClass(/completed/);

    // Delete item
    await page.click(".todo-list .todo-item .delete-btn");
    await expect(listItems).toHaveCount(0);
  });

  test("Verify 11-02 Debounced Search Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "11-Projects", "11-02-debounced-search-spec.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    // Type query
    await page.fill("#search-input", "ap");
    
    // Wait for mock API query debounce/resolution latency
    await page.waitForTimeout(1000);

    const listItems = page.locator("#search-results li");
    await expect(listItems.first()).toContainText("apple");
  });

  test("Verify 11-05 Virtual DOM Counter Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "11-Projects", "11-05-virtual-dom-spec.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    const counterText = page.locator(".counter");
    await expect(counterText).toHaveText("Count: 0");

    // Click increment button
    await page.click("#inc-btn");
    await expect(counterText).toHaveText("Count: 1");
  });

  test("Verify 13-01 Carousel Slider Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "13-Machine-Coding", "13-01-carousel.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    const track = page.locator(".carousel-track");
    // Verify track is present
    await expect(track).toBeVisible();

    // Click next button
    await page.click(".next-btn");
    await expect(track).toHaveAttribute("style", "transform: translate3d(-100%, 0px, 0px);");
  });

  test("Verify 13-02 Infinite Scroll Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "13-Machine-Coding", "13-02-infinite-scroll.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    // Set a small viewport height to force items overflow, ensuring sentinel leaves the screen
    await page.setViewportSize({ width: 400, height: 100 });

    await page.setContent(html);

    // Initial items should render automatically since sentinel is visible
    const listItems = page.locator(".card");
    await expect(listItems).toHaveCount(5);

    // Scroll to the bottom to trigger more items loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000); // Wait for mock network delay

    await expect(listItems).toHaveCount(10);
  });

  test("Verify 13-03 Star Rating Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "13-Machine-Coding", "13-03-star-rating.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    // Stars initially grey
    const highlightedStars = page.locator(".star.highlight");
    await expect(highlightedStars).toHaveCount(0);

    // Click third star
    await page.click(".star[data-value='3']");
    await expect(highlightedStars).toHaveCount(3);

    const text = page.locator("#rating-text");
    await expect(text).toHaveText("You submitted a 3-star rating!");
  });

  test("Verify 13-04 Typeahead Suggestion Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "13-Machine-Coding", "13-04-typeahead.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    // Type query
    await page.fill(".autocomplete-input", "ap");
    
    const suggestionList = page.locator(".autocomplete-list");
    await expect(suggestionList).toHaveClass(/active/);

    const items = page.locator(".autocomplete-item");
    await expect(items).toHaveCount(2); // apple, apricot

    // Test ArrowDown navigation
    await page.press(".autocomplete-input", "ArrowDown");
    await expect(items.first()).toHaveClass(/selected/);

    // Press Enter to select
    await page.press(".autocomplete-input", "Enter");
    await expect(page.locator(".autocomplete-input")).toHaveValue("apple");
    await expect(suggestionList).not.toHaveClass(/active/);
  });

  test("Verify 13-05 File Explorer Tree Sandbox", async ({ page }) => {
    const filePath = path.join(rootDir, "13-Machine-Coding", "13-05-file-explorer.md");
    const html = extractHtmlBlock(filePath);
    expect(html).not.toBeNull();

    await page.setContent(html);

    // Root should start open
    const files = page.locator(".file");
    await expect(files).toHaveCount(1);
    await expect(files.first()).toContainText("index.js");

    // Click fold toggle
    await page.click(".item-header");
    await expect(files).toHaveCount(0); // Children collapsed/hidden
  });
});
