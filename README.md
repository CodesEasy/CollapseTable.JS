# CollapseTable.JS

Make any HTML table **responsive**: low-priority columns automatically **collapse** into a per-row **details** panel with a **+/−** toggle.

- **Author:** Vishnu — https://vishnu.wiki
- **Company:** Codes Easy — https://www.codeseasy.com
- **License:** MIT

---

## Features

- 📱 Keeps important columns visible; folds the rest into a details view on small screens
- ➕/➖ Per-row toggle (keyboard: **Enter/Space**)
- ♿ Accessible (uses `aria-expanded`, `aria-controls`)
- 🧩 Zero dependencies, tiny footprint
- 🎨 Minimal CSS auto-injected; works with any design system
- 📏 Table width set to 100% and cells left-aligned by default


## Quick Start (CDN)

**Versioned (recommended):**
```html
<script src="https://cdn.jsdelivr.net/npm/collapsetable@1.0.0/dist/collapsetable.min.js"></script>
````

**Initialize:**

```html
<script>
  var collapseTable = new CollapseTable();
  collapseTable.set("table-id-here"); // element reference may also be passed
</script>
```

**Example:**

```html
<script src="https://cdn.jsdelivr.net/npm/collapsetable@1.0.0/dist/collapsetable.min.js"></script>

<table id="table1">
  <caption><strong>Codes Easy — Recent Projects</strong></caption>
  <thead>
    <tr>
      <th data-priority="1" data-min="200">Project</th>
      <th data-priority="2" data-min="160">Client</th>
      <th data-priority="3" data-min="130">Status</th>
      <th data-priority="4" data-min="120">Budget</th>
      <th data-priority="5" data-min="140">Start</th>
      <th data-priority="6" data-min="140">End</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Multi-Tenant SaaS (Laravel + MySQL)</td>
      <td>Codes Easy (R&amp;D)</td>
      <td>Live</td>
      <td>₹3,50,000</td>
      <td>2025-02-15</td>
      <td>2025-05-30</td>
    </tr>
    <tr>
      <td>Fintech Wallet — Android (Java)</td>
      <td>Fintech Startup</td>
      <td>UAT</td>
      <td>₹9,80,000</td>
      <td>2025-06-10</td>
      <td>—</td>
    </tr>
    <tr>
      <td>EdTech LMS with Analytics</td>
      <td>University Partner</td>
      <td>Delivered</td>
      <td>₹11,00,000</td>
      <td>2024-12-01</td>
      <td>2025-04-10</td>
    </tr>
  </tbody>
</table>

<script>
  var collapseTable = new CollapseTable();
  collapseTable.set("table1");
</script>
```

---

## How collapsing works

* `data-priority` on each `<th>`

    * `1` = most important (**never hidden**)
    * Higher numbers (`2`, `3`, `4` …) hide earlier as space shrinks
* `data-min` (px) gives a width hint for better fit decisions
* Optional `data-label` overrides the label shown in the details panel

Example:

```html
<th data-priority="4" data-min="160" data-label="Placed On">Date</th>
```

---

## API

### Create

```js
const ct = new CollapseTable(globalOptions?);
```

### Attach / Detach

```js
ct.set("table1", perTableOptions?); // attach by id or element
ct.unset("table1");                 // remove behavior and cleanup
```

### Refresh & Controls

```js
ct.refresh();         // re-measure + refit all tables
ct.refresh("table1"); // re-measure + refit one table

ct.expandAll();       // expand details for all rows (if any columns are hidden)
ct.collapseAll();     // collapse all details
```

### Events

```js
ct.on("expand",   ({ table, row }) => {});
ct.on("collapse", ({ table, row }) => {});
ct.on("toggle",   ({ table, row, expanded }) => {});
ct.on("refit",    ({ table, initial, anyHidden }) => {});
ct.off("expand", handler);
```

### Options (global or per table)

```js
{
  controlWidth: 46,       // px reserved for the +/− column
  minWidthDefault: 140,   // fallback when no data-min is provided
  attrs: {
    priority: "data-priority",
    min: "data-min",
    label: "data-label"
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
  icons: { expand: "+", collapse: "−" },
  strings: { toggleTitle: "Show more", show: "Show details", hide: "Hide details" }
}
```

Per-table override:

```js
ct.set("table1", {
  icons: { expand: "▶", collapse: "▼" },
  strings: { toggleTitle: "More", show: "Show", hide: "Hide" }
});
```

---

## Styling

A tiny stylesheet is injected once:

* Sets the table to `width: 100%` and left-aligns text
* Utility classes: `.ctbl-hide` (hidden), `.ctbl-vh` (visually hidden)

Style hooks for custom themes:

```
.ctbl-control  .ctbl-toggle  .ctbl-details  .ctbl-details-inner
.ctbl-detail   .ctbl-name    .ctbl-value
```

The details view renders items as **“Label: Value”** inline to avoid wasted space with short labels and long values.

---

## Accessibility

* Toggle buttons manage `aria-expanded` and `aria-controls`
* Keyboard: **Enter** / **Space** on the focused toggle
* Details rows are standard HTML and screen-reader friendly

---

## Best practices

* Assign `data-priority="1"` to must-show columns
* Provide sensible `data-min` hints (px) to guide collapse order
* Place long, auxiliary fields in higher-numbered priorities so they collapse first
* Call `ct.refresh()` after significant layout or font changes

---

## Project structure

```
.
├─ src/                   # source (UMD)
│  └─ CollapseTable.js
├─ dist/                  # built artifacts (served by CDN/releases)
│  ├─ collapsetable.js
│  ├─ collapsetable.min.js
│  └─ collapsetable.min.js.map
├─ LICENSE                # MIT
└─ README.md
```

---

## Troubleshooting

* **No columns collapse on mobile** — ensure some columns use priorities `2+` (priority `1` never hides).
* **Toggle not visible** — the +/− control appears only when at least one non-priority-1 column is hidden.
* **Error about `<thead>`/`<tbody>`** — the table must include a `<thead>` with at least one `<tr>` and a `<tbody>`.

---

## Browser support

* Modern evergreen browsers
* No dependencies or polyfills required
* Works with frameworks (React, Vue, etc.) as a small DOM enhancement

---

## CDN links

* Versioned (stable):
  `https://cdn.jsdelivr.net/npm/collapsetable@1.0.0/dist/collapsetable.min.js`

* Latest tag from npm (auto-updates):
  `https://cdn.jsdelivr.net/npm/collapsetable@latest/dist/collapsetable.min.js`

---

## License

MIT © 2025 Vishnu (Codes Easy). See [LICENSE](./LICENSE).
