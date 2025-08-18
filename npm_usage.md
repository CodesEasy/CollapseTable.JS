# CollapseTable.JS — npm & Framework Usage

[![npm](https://img.shields.io/npm/v/@codeseasy/collapsetable.svg)](https://www.npmjs.com/package/@codeseasy/collapsetable)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![types: included](https://img.shields.io/badge/types-included-informational.svg)](./npm_usage.md)

> UMD / ESM / CJS · Types included

This guide covers installing and using `@codeseasy/collapsetable` with **npm**, plus framework patterns for **React**, **Next.js**, **Vue 3**, **Svelte**, and **Angular**. For CDN usage and general docs, see [`README.md`](./README.md).

* **Package:** `@codeseasy/collapsetable`
* **Types:** Included (`src/types/collapsetable.d.ts`)
* **Format:** UMD build, consumable from ESM/CJS
* **License:** MIT

---

## 1) Install

```bash
npm i @codeseasy/collapsetable
# or
pnpm add @codeseasy/collapsetable
# or
yarn add @codeseasy/collapsetable
```

---

## 2) Import patterns

### ESM (Vite, Rollup, modern bundlers)

```ts
import CollapseTable from '@codeseasy/collapsetable';

const ct = new CollapseTable();
ct.set('#orders');
```

### CommonJS (Webpack, older Node configs)

```js
const CollapseTable = require('@codeseasy/collapsetable');

const ct = new CollapseTable();
ct.set('#orders');
```

> The package exports a default class. TypeScript definitions are bundled, so you get IntelliSense out of the box.

---

## 3) Minimal example (npm)

```html

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
```

```ts
import CollapseTable from '@codeseasy/collapsetable';

const ct = new CollapseTable();
ct.set('#table1'); // id, selector, or <table> element
```

---

## 4) Markup requirements (quick recap)

* `<thead>` with a **single header `<tr>`** is required.
* At least one `<tbody>` (multiple `<tbody>` supported).
* **No `colspan`/`rowspan`** in `<thead>` or `<tbody>` for responsive collapsing. If present, collapsing is disabled (base styles still apply; console warns).
* Per-column header attributes:

  * `data-priority`: importance (**1** = never hidden; higher numbers hide earlier)
  * `data-min`: width hint in **px**
  * `data-label` *(optional)*: label used in details panel

---

## 5) API (npm usage essentials)

```ts
const ct = new CollapseTable(globalOptions?);

// Attach / detach
const controller  = ct.set(target, perTableOptions?);      // one table
const controllers = ct.setAll(targets, perTableOptions?);  // many
ct.unset(target);
ct.unsetAll(targets);

// Refresh / controls
ct.refresh(target?);
ct.expandAll(target?);
ct.collapseAll(target?);
ct.expandRow(target, rowOrIndex);
ct.collapseRow(target, rowOrIndex);

// Options helpers
ct.getOptions();
ct.updateOptions(partial);

// Runtime mode
ct.setMode('development');       // 'production' | 'development' (default: 'production')
ct.getMode();                    // -> current mode string

// Events
ct.on('expand'|'collapse'|'toggle'|'refit'|'destroy', handler);
ct.off('expand'|'collapse'|'toggle'|'refit'|'destroy', handler);

// Version
CollapseTable.version; // "1.2.0"
```

See `README.md` for full option defaults and event payloads.

---

## 6) Runtime mode (development vs production)

CollapseTable ships **silent by default** (`production` mode). Enable **`development`** mode to get helpful, one-time console warnings during integration (e.g., multiple `data-priority="1"` columns, invalid/missing priorities). This keeps the library lightweight without a separate debug build.

**Ways to set mode:**

```ts
// a) At construction
const ct = new CollapseTable({ mode: 'development' });

// b) Later, at runtime
ct.setMode('development');  // or 'production'

// c) Read current mode
console.log(ct.getMode()); // 'development' | 'production'
```

> Warnings include:
>
> * “Use priority=1 sparingly (never hidden).” (shown only if **more than one** priority 1 column is found)
> * Invalid/missing `data-priority` values
> * `colspan`/`rowspan` present (collapsing disabled; base styles still applied)

---

## 7) TypeScript tips

Types are shipped in `src/types/collapsetable.d.ts`.

```ts
import CollapseTable from '@codeseasy/collapsetable';

type Options     = CollapseTable.Options;
type Controller  = CollapseTable.Controller;
type RefitEvent  = CollapseTable.RefitEventPayload;

const ct = new CollapseTable({ mode: 'development' }); // IntelliSense for options
```

**Strongly typed events (via `EventsMap`):**

```ts
ct.on('refit', (e) => {
  // e is CollapseTable.RefitEventPayload
  console.log(e.initial, e.anyHidden);
});

ct.on('toggle', (e) => {
  // e is CollapseTable.ToggleEventPayload
  console.log(e.row, e.expanded);
});
```

---

## 8) Framework recipes

### 8.1 React (Vite/CRA)

```tsx
import { useEffect, useRef } from 'react';
import CollapseTable from '@codeseasy/collapsetable';

export default function OrdersTable({ rows }: { rows: Array<any> }) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const ctRef = useRef<CollapseTable | null>(null);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const ct = (ctRef.current ||= new CollapseTable({ mode: 'development' }));
    ct.set(table, {
      icons: { expand: '▶', collapse: '▼' }, // example overrides
    });

    return () => ct.unset(table); // cleanup on unmount
  }, []);

  // If rows change dynamically, refresh after render
  useEffect(() => {
    if (tableRef.current) ctRef.current?.refresh(tableRef.current);
  }, [rows]);

  return (
    <table ref={tableRef} id="orders">
      <thead>
        <tr>
          <th data-priority="1" data-min="160">Project</th>
          <th data-priority="2" data-min="120">Client</th>
          <th data-priority="3" data-min="120">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}><td>{r.project}</td><td>{r.client}</td><td>{r.status}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Custom details rendering in React:** `detailsRender` expects a **DOM Node** or HTML string.

```ts
detailsRender(row, hiddenCols, cells) {
  const el = document.createElement('div');
  el.className = 'react-details';
  el.innerHTML = hiddenCols.map(c => {
    const label = c.th.getAttribute('data-label') || c.th.textContent || '';
    return `<div><strong>${label}:</strong> ${cells[c.index]?.innerHTML ?? ''}</div>`;
  }).join('');
  return el;
}
```

> Don’t rely on React synthetic events inside `detailsRender`; attach plain DOM listeners if needed.

---

### 8.2 Next.js / Remix (SSR)

Run on the **client only**.

**Next.js App Router (Client Component):**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import CollapseTable from '@codeseasy/collapsetable';

export default function OrdersClient() {
  const tableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const ct = new CollapseTable({ mode: 'development' });
    ct.set(table);
    return () => ct.unset(table);
  }, []);

  return (/* same markup as React example */);
}
```

Or dynamically import a client-only component:

```tsx
import dynamic from 'next/dynamic';
const OrdersClient = dynamic(() => import('./OrdersClient'), { ssr: false });
```

**Remix:** initialize in `useEffect`; avoid running in loaders.

---

### 8.3 Vue 3 (Composition API)

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, watch } from 'vue';
import CollapseTable from '@codeseasy/collapsetable';

const tableEl = ref<HTMLTableElement | null>(null);
const rows = ref<Array<any>>([]);
let ct: CollapseTable | null = null;

onMounted(async () => {
  await nextTick();
  if (!tableEl.value) return;
  ct = new CollapseTable({ mode: 'development' });
  ct.set(tableEl.value, { tableLayout: 'auto' });
});

onBeforeUnmount(() => {
  if (ct && tableEl.value) ct.unset(tableEl.value);
});

watch(rows, async () => {
  await nextTick();
  if (ct && tableEl.value) ct.refresh(tableEl.value);
});
</script>

<template>
  <table ref="tableEl" id="orders">
    <thead>
      <tr>
        <th data-priority="1" data-min="160">Project</th>
        <th data-priority="2" data-min="120">Client</th>
        <th data-priority="3" data-min="120">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(r,i) in rows" :key="i">
        <td>{{ r.project }}</td><td>{{ r.client }}</td><td>{{ r.status }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

---

### 8.4 Svelte

```svelte
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import CollapseTable from '@codeseasy/collapsetable';

  let tableEl: HTMLTableElement;
  export let rows: Array<any> = [];
  let ct: CollapseTable;

  onMount(() => {
    ct = new CollapseTable({ mode: 'development' });
    ct.set(tableEl);
    return () => ct.unset(tableEl);
  });

  // refresh when rows change
  $: (async () => {
    if (!ct || !tableEl) return;
    await tick();
    ct.refresh(tableEl);
  })();
</script>

<table bind:this={tableEl} id="orders">
  <thead>
    <tr>
      <th data-priority="1" data-min="160">Project</th>
      <th data-priority="2" data-min="120">Client</th>
      <th data-priority="3" data-min="120">Status</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as r, i}
      <tr><td>{r.project}</td><td>{r.client}</td><td>{r.status}</td></tr>
    {/each}
  </tbody>
</table>
```

---

### 8.5 Angular

```ts
// orders.component.ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import CollapseTable from '@codeseasy/collapsetable';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ordersTable', { static: true }) tableRef!: ElementRef<HTMLTableElement>;
  rows = [...]; // your data
  private ct = new CollapseTable({ mode: 'development' });

  ngAfterViewInit(): void {
    this.ct.set(this.tableRef.nativeElement, { icons: { expand: '+', collapse: '−' } });
  }

  ngOnDestroy(): void {
    this.ct.unset(this.tableRef.nativeElement);
  }

  // Call after data updates that affect columns/widths:
  refresh(): void {
    this.ct.refresh(this.tableRef.nativeElement);
  }
}
```

```html
<!-- orders.component.html -->
<table #ordersTable id="orders">
  <thead>
    <tr>
      <th data-priority="1" data-min="160">Project</th>
      <th data-priority="2" data-min="120">Client</th>
      <th data-priority="3" data-min="120">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let r of rows">
      <td>{{ r.project }}</td><td>{{ r.client }}</td><td>{{ r.status }}</td>
    </tr>
  </tbody>
</table>
```

> When data changes significantly or fonts/styles load late, call `refresh()`.

---

## 9) Dynamic data & lifecycle best practices

* **Initialize after the table exists in the DOM.**
* **Cleanup** on component unmount/destroy with `ct.unset(table)`.
* When **rows change** (AJAX, filters, pagination), call `ct.refresh(table)`.
* If the table sits in a **hidden container** (`display:none` tabs/modals), default `deferWhenHidden: true` avoids bad measurements. Call `refresh()` when revealed if needed.
* If you **add/remove columns** or change header attributes (`data-priority`, `data-min`, `data-label`), `MutationObserver` updates metadata; `refresh()` is still recommended.

---

## 10) Multiple tables

```ts
const ct = new CollapseTable({ mode: 'production' });

ct.setAll('table.responsive', { tableLayout: 'fixed' });
// later…
ct.expandAll();        // across all attached
ct.collapseAll('#a');  // only table #a
ct.unsetAll('table.responsive');
```

---

## 11) Custom details rendering

Override the default **Label: Value** layout per table:

```ts
ct.set('#orders', {
  detailsRender(row, hiddenColumns, cells) {
    const wrap = document.createElement('div');
    wrap.className = 'details-grid';
    hiddenColumns.forEach(c => {
      const label = c.th.getAttribute('data-label') || c.th.textContent || '';
      const item = document.createElement('div');
      item.className = 'details-item';
      item.innerHTML = `<strong>${label}:</strong> ${cells[c.index]?.innerHTML ?? ''}`;
      wrap.appendChild(item);
    });
    return wrap; // or return a string of HTML
  },
});
```

> Receives the **row `<tr>`**, an array of **hidden column metadata**, and the **cells**. Return a **`Node`** or **`string`**; return nothing to use the default renderer.

---

## 12) Styling & theming (npm)

The library injects **tiny, scoped** CSS under `.ctbl` automatically. To match your design system, either:

* Override **classNames** in options and provide your own CSS, or
* Target the default hooks:

```
.ctbl            .ctbl-control    .ctbl-toggle
.ctbl-details    .ctbl-details-inner
.ctbl-detail     .ctbl-name       .ctbl-value
.ctbl-hide       .ctbl-vh
```

**Bootstrap example (multi-class toggle + wider control column):**

```ts
const ct = new CollapseTable();
ct.set('#table-project-list', {
  classNames: {
    root: 'ctbl',
    control: 'ctbl-control',
    toggle: 'ctbl-toggle btn btn-secondary btn-sm'
  },
  controlWidth: 56
});
```

---

## 13) Bundler notes

* **Tree-shaking:** The build is small; UMD works well with modern bundlers.
* **SSR:** Safe to import into SSR builds, but **only call** `set(...)` on the **client** (`useEffect` / `onMounted` / `ngAfterViewInit`).
* **Transpilation:** No special config required. You usually don’t need to transpile this package in `node_modules`.

---

## 14) Troubleshooting (npm context)

* **Nothing collapses:** Ensure some headers use `data-priority="2"` or higher (priority `1` never hides).
* **Toggle not visible:** The +/− column hides entirely when **no** non-priority-1 columns are hidden.
* **Hidden containers:** Default `deferWhenHidden: true` avoids bad measurements. Call `refresh()` when revealed.
* **Fonts loaded late / layout shift:** Call `refresh()` after fonts or styles finish loading.
* **`colspan`/`rowspan`:** Collapsing is disabled when spans are detected in header/body (console warning).
* **Development warnings:** Only shown in `development` mode (e.g., >1 priority-1 columns, invalid priorities). Default is `production` (silent).

---

## 15) Advanced: programmatic control

```ts
// Expand 1st row (0-based across all TBODY rows)
ct.expandRow('#orders', 0);

// Collapse a specific row element
const row = document.querySelector('#orders tbody tr:nth-child(3)')!;
ct.collapseRow('#orders', row);
```

---

## 16) Version & support

```ts
console.log(CollapseTable.version); // "1.2.0"
```

* **Issues / PRs:** [https://github.com/CodesEasy/CollapseTable.JS](https://github.com/CodesEasy/CollapseTable.JS)
* **CDN usage & general docs:** [`README.md`](./README.md)
* **License:** MIT © 2025 Vishnu (Codes Easy)

---