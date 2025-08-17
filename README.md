# CollapseTable.JS

Make any HTML table **responsive**: low-priority columns automatically **collapse** into a per-row **details** panel with a **+/−** toggle.

[![npm](https://img.shields.io/npm/v/@codeseasy/collapsetable.svg)](https://www.npmjs.com/package/@codeseasy/collapsetable)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
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
* 📏 Sensible defaults: table is `width: 100%`, left-aligned cells, and a small control column auto-inserted at the start

---

## Quick Start (CDN)

**Pinned version (recommended):**

```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.1.1/dist/collapsetable.min.js"></script>
```

**Always latest (auto-updates):**

```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@latest/dist/collapsetable.min.js"></script>
```

**Initialize:**

```html
<script>
  var ct = new CollapseTable();
  // target can be: "table1" (id, no #), "#table1", ".orders", "table.responsive", or a <table> element
  ct.set("table1");
</script>
```

**Minimal example:**

```html
<script src="https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.1.1/dist/collapsetable.min.js"></script>

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
    <tr><td>Website Revamp</td><td>Acme</td><td>Active</td><td>₹2,50,000</td></tr>
    <tr><td>Android App</td><td>Globex</td><td>Planning</td><td>₹1,80,000</td></tr>
  </tbody>
</table>

<script>
  var ct = new CollapseTable();
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

const ct = new CollapseTable();
ct.set('#orders');
```

**CommonJS:**

```js
const CollapseTable = require('@codeseasy/collapsetable');

const ct = new CollapseTable();
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
ct.set(target, perTableOptions?);   // one table
ct.setAll(targets, perTableOptions?); // many tables
ct.unset(target);                   // remove one
ct.unsetAll(targets);               // remove many
```

* **target / targets** can be a table id (without `#`), a CSS selector, a `HTMLTableElement`, or a list (`NodeList`, `HTMLCollection`, `Element[]`). Non-table elements are ignored.
* `set(...)` returns a **Controller** for that table.
  `setAll(...)` returns an **array** of Controllers.

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

## Options (with defaults)

```js
{
  controlWidth: 46,            // px reserved for the +/− column
  minWidthDefault: 140,        // px when no data-min and cannot measure
  tableLayout: "auto",         // "auto" | "fixed"
  deferWhenHidden: true,       // if container is hidden, defer precise fit until visible

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
ct.getOptions(); // clone of current global options
ct.updateOptions({ tableLayout: 'fixed' }); // update globals + refresh attached tables
CollapseTable.version; // "1.1.1"
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

## Accessibility

* Toggle buttons keep `aria-expanded` / `aria-controls` in sync
* Keyboard support: **Enter** and **Space**
* Details wrapper is a labeled live region (`role="region"`, `aria-live="polite"`)
* Control column hides entirely if nothing is collapsed, avoiding “empty” first column

---

## Tips, limitations & troubleshooting

* **Nothing collapses on mobile?**
  Ensure some headers use `data-priority="2"` or higher. Priority `1` never hides.
* **Toggle not visible?**
  The +/− control only shows when at least one non-priority-1 column is hidden.
* **Hidden containers (`display:none`)?**
  With `deferWhenHidden: true`, precise fitting is deferred until visible (uses viewport width meanwhile).
* **`colspan`/`rowspan` present?**
  Collapsing is **disabled** if spans are detected in `<thead>` or `<tbody>`; base styles still apply and a console warning is printed.
* **Multiple `<tbody>` sections?**
  Supported. Row indices for `expandRow`/`collapseRow` are 0-based **across all** data rows in order.
* **SSR / hydration?**
  Initialize on the client after the table is in the DOM.

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
* Advanced TypeScript usage and examples
* Bundler tips

---

## CDN links

* **Pinned version:**
  `https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@1.1.1/dist/collapsetable.min.js`
* **Always latest:**
  `https://cdn.jsdelivr.net/npm/@codeseasy/collapsetable@latest/dist/collapsetable.min.js`

---

## Contributing

Issues and PRs are welcome! Please include a minimal repro (HTML + script) when reporting layout problems.

---

## License

MIT © 2025 Vishnu (Codes Easy). See [LICENSE](./LICENSE).
