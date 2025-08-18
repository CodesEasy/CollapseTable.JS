# CollapseTable.JS

Make any HTML table **responsive**: low-priority columns automatically **collapse** into a per-row **details** panel with a **+/−** toggle.

[![npm](https://img.shields.io/npm/v/@codeseasy/collapsetable.svg)](https://www.npmjs.com/package/@codeseasy/collapsetable)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![types: included](https://img.shields.io/badge/types-included-informational.svg)](./npm_usage.md)

* **Author:** Vishnu — [https://vishnu.wiki](https://vishnu.wiki)
* **Company:** Codes Easy — [https://www.codeseasy.com](https://www.codeseasy.com)
* **License:** MIT

---

## Why CollapseTable?

* 📱 Keeps important columns visible; folds the rest into an inline details view
* ➕/➖ Per-row toggle (keyboard: **Enter** / **Space**)
* ♿ Accessible by default (`aria-expanded`, `aria-controls`, `role="region"`, `aria-live="polite"`)
* 🧩 Zero dependencies, tiny footprint
* ⚙️ Production-ready: Resize/Mutation/Intersection observers, hidden-container deferral, stable row IDs, multi-`<tbody>` support
* 🎛️ Flexible: `tableLayout`, `detailsRender` hook, custom icons/strings/classes
* 🧼 Minimal CSS: only scoped utility classes are injected; your design system controls look & feel

---

## Quick Start (CDN)

**Pinned version (recommended):**
```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.2.0/dist/collapsetable.min.js"></script>
```

**Always latest (auto-updates):**

```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@latest/dist/collapsetable.min.js"></script>
```

> Tip: CDNs can cache “latest” briefly after a fresh publish. Prefer a **pinned** version in production.

**Initialize:**

```html
<script>
  var ct = new CollapseTable();
  // (optional during integration) show helpful warnings:
  // ct.setMode('development');

  // target can be: "table1" (id, no #), "#table1", ".orders", "table.responsive", or a <table> element
  ct.set("table1");
</script>
```

**Minimal example:**

```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.2.0/dist/collapsetable.min.js"></script>

<table id="table1">
  <thead>
    <tr>
      <th data-priority="1" data-min="180">Project</th>
      <th data-priority="2" data-min="140">Client</th>
      <th data-priority="3" data-min="120">Status</th>
      <th data-priority="4" data-min="120">Budget</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Website Revamp</td>
      <td>Acme</td>
      <td>Active</td>
      <td>₹2,50,000</td>
    </tr>
    <tr>
      <td>Android App</td>
      <td>Globex</td>
      <td>Planning</td>
      <td>₹1,80,000</td>
    </tr>
  </tbody>
</table>

<script>
  var ct = new CollapseTable();
  // ct.setMode('development'); // optional during setup
  ct.set("table1");
</script>
```

---

## Install via npm

```bash
npm i @codeseasy/collapsetable
```

**ESM:**

```ts
import CollapseTable from '@codeseasy/collapsetable';

const ct = new CollapseTable({ /* mode: 'development' */ });
ct.set('#orders');
```

**CommonJS:**

```js
const CollapseTable = require('@codeseasy/collapsetable');

const ct = new CollapseTable({ /* mode: 'development' */ });
ct.set('#orders');
```

> TypeScript types are bundled. See **[npm\_usage.md](./npm_usage.md)** for framework tips and advanced patterns.

---

## Markup requirements

* A `<thead>` with **one header row** (`<tr>`) is required.
* At least one `<tbody>` is required (multi-`<tbody>` is supported).
* **No `colspan`/`rowspan`** in header or body for responsive collapsing. If spans are detected, collapsing is **disabled** (base styles still apply and a console warning is emitted).
* The control (+/−) column is automatically inserted as the **first** column if not present.

**Per-column attributes (on `<th>`):**

* `data-priority` — importance level.
  `1` = most important (**never hidden**). Higher numbers (`2`, `3`, `4`…) hide **earlier** as space shrinks.
* `data-min` — width hint in **px** to improve fit decisions.
* `data-label` *(optional)* — label shown in the details panel (defaults to header text).

Example:

```html
<th data-priority="4" data-min="160" data-label="Placed On">Date</th>
```

---

## API

### Constructor

```js
const ct = new CollapseTable(globalOptions?);
```

* **globalOptions** (optional) are applied to all tables unless overridden per table.

### Attach / Detach

```js
ct.set(target, perTableOptions?);      // one table
ct.setAll(targets, perTableOptions?);  // many tables
ct.unset(target);                      // remove one
ct.unsetAll(targets);                  // remove many
```

* **target / targets** can be a table id (without `#`), a CSS selector, a `HTMLTableElement`, or a list (`NodeList`, `HTMLCollection`, `Element[]`). Non-table elements are ignored.
* `set(...)` returns a **Controller** for that table. `setAll(...)` returns an **array** of Controllers.

### Refresh & controls

```js
ct.refresh(target?);    // re-measure & refit (omit to refresh all)
ct.expandAll(target?);  // expand details rows (only if some columns are hidden)
ct.collapseAll(target?);

ct.expandRow(target, rowOrIndex);   // by 0-based index across all TBODY rows or pass a <tr>
ct.collapseRow(target, rowOrIndex);
```

### Events

```js
ct.on('expand',   ({ table, row }) => {});
ct.on('collapse', ({ table, row }) => {});
ct.on('toggle',   ({ table, row, expanded }) => {});
ct.on('refit',    ({ table, initial, anyHidden }) => {});
ct.on('destroy',  ({ table }) => {}); // fired when a table is unset or destroyed

// unsubscribe
ct.off('expand', handler);
```

**Payloads**

* `expand` / `collapse`: `{ table: HTMLTableElement, row: HTMLTableRowElement }`
* `toggle`: `{ table, row, expanded: boolean }`
* `refit`: `{ table, initial: boolean, anyHidden: boolean }`
* `destroy`: `{ table: HTMLTableElement }`

---

## Runtime mode (new)

CollapseTable now supports a simple runtime mode to control developer warnings.

* **`'production'`** *(default)* — silent (no console warnings).
* **`'development'`** — shows helpful integration warnings (e.g., too many `data-priority="1"`, invalid/missing priorities). These are **not** errors—they help tune responsiveness.

You can set the mode globally when you construct the instance, update it later, or query it:

```js
const ct = new CollapseTable({ mode: 'development' });
// ...or later:
ct.setMode('development');     // returns 'development'
ct.getMode();                  // -> 'development'

// Back to defaults:
ct.setMode('production');
```

You can also switch modes via `updateOptions`:

```js
ct.updateOptions({ mode: 'development' });
```

> Best practice: use **development** mode while integrating, then switch to **production** mode (or simply omit `mode`) for a quiet console.

---

## Options (with defaults)

```js
{
  mode: 'production',         // 'production' | 'development' (warnings only in development)
  controlWidth: 46,           // px reserved for the +/− column
  minWidthDefault: 140,       // px when no data-min and cannot measure
  tableLayout: "auto",        // "auto" | "fixed"
  deferWhenHidden: true,      // if container is hidden, defer precise fit until visible

  attrs: {
    priority: "data-priority", // lower = more important (1 never hidden)
    min: "data-min",           // width hint (px)
    label: "data-label"        // custom label used in details view
  },

  classNames: {
    root: "ctbl",
    control: "ctbl-control",
    toggle: "ctbl-toggle",
    details: "ctbl-details",
    detailsInner: "ctbl-details-inner",
    detail: "ctbl-detail",
    name: "ctbl-name",
    value: "ctbl-value",
    hide: "ctbl-hide"
  },

  icons: {
    expand: "+",
    collapse: "−"
  },

  strings: {
    toggleTitle: "Show more",
    show: "Show details",
    hide: "Hide details"
  },

  // Optional custom details renderer
  // Return a Node (appended), an HTML string (innerHTML), or void for default "Label: Value" layout.
  detailsRender: undefined
}
```

**Per-table override:**

```js
ct.set('#invoices', {
  tableLayout: 'fixed',
  icons: { expand: '▶', collapse: '▼' },
  strings: { toggleTitle: 'More', show: 'Show', hide: 'Hide' }
});
```

**Global helpers:**

```js
ct.getOptions(); // clone of current global options (includes current mode)
ct.updateOptions({ tableLayout: 'fixed' }); // update globals + refresh attached tables
ct.getMode(); // 'production' | 'development'
ct.setMode('development'); // switch at runtime
CollapseTable.version; // "1.2.0"
```

---

## Custom details rendering

You can completely control the details content:

```js
ct.set('#orders', {
  detailsRender(row, hiddenColumns, cells) {
    const ul = document.createElement('ul');
    ul.style.margin = '0';
    ul.style.paddingLeft = '1rem';
    hiddenColumns.forEach(col => {
      const li = document.createElement('li');
      const label = col.th.getAttribute('data-label') || col.th.textContent || '';
      li.innerHTML = `<strong>${label}:</strong> ${cells[col.index]?.innerHTML ?? ''}`;
      ul.appendChild(li);
    });
    return ul; // or return HTML string
  }
});
```

---

## Styling & frameworks

**Minimal CSS:** the library injects only a few internal classes (`.ctbl-hide`, visually-hidden utility, etc.). It **does not** override your table typography/spacing. Style your table as usual.

**Bootstrap example (multi-class toggle button):**

```html
<script>
  const ct = new CollapseTable();
  ct.set('#table-project-list', {
    classNames: {
      root: 'ctbl',
      control: 'ctbl-control',
      toggle: 'ctbl-toggle btn btn-secondary btn-sm' // multiple classes supported
    },
    controlWidth: 56 // allow a bit more room for the Bootstrap button
  });
</script>
```

**SSR / hydration:** initialize on the client after the table exists in the DOM.

---

## Tips, limitations & troubleshooting

* **Nothing collapses on mobile?**
  Ensure some headers use `data-priority="2"` or higher. Priority `1` never hides.
* **Toggle not visible?**
  The +/− control shows only when at least one non-priority-1 column is hidden. When nothing is hidden, the entire control **column** is hidden to avoid an empty first column.
* **Hidden containers (`display:none`)?**
  With `deferWhenHidden: true`, precise fitting is deferred until visible (uses viewport width meanwhile).
* **`colspan`/`rowspan` present?**
  Collapsing is **disabled** if spans are detected in `<thead>` or `<tbody>`; base styles still apply and a console warning is printed.
* **Multiple `<tbody>` sections?**
  Supported. Row indices for `expandRow`/`collapseRow` are 0-based **across all** data rows in source order.
* **Development warnings?**
  Shown only in **development** mode (e.g., multiple `data-priority="1"` columns, invalid/missing priorities). Switch back to **production** to silence.

---

## Browser support

Modern evergreen browsers. No dependencies. Uses `ResizeObserver`/`IntersectionObserver` when available, with sensible fallbacks.

---

## File structure

```
src/
  CollapseTable.js
  types/
    collapsetable.d.ts
dist/
  collapsetable.min.js
  collapsetable.js
README.md
npm_usage.md
package.json
```

* **Types:** Provided at `src/types/collapsetable.d.ts` and published with the package.

---

## npm usage & TypeScript

See **[npm\_usage.md](./npm_usage.md)** for:

* Framework integration notes
* ESM/CJS patterns
* Advanced TypeScript usage and examples (strongly-typed event handlers)
* Bundler tips

---

## CDN links

* **Pinned version (1.2.0):**
  [https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.2.0/dist/collapsetable.min.js](https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.2.0/dist/collapsetable.min.js)
* **Always latest:**
  [https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@latest/dist/collapsetable.min.js](https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@latest/dist/collapsetable.min.js)

---

## Contributing

Issues and PRs are welcome! Please include a minimal repro (HTML + script) when reporting layout problems.

---

## License

MIT © 2025 Vishnu (Codes Easy). See [LICENSE](./LICENSE).
