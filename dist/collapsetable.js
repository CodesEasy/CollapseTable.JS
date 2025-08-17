/*!
 * CollapseTable v1.0.0
 * Lightweight, dependency-free JavaScript library that makes plain HTML tables responsive
 * by collapsing lower-priority columns into an inline, per-row “details” area with a +/− toggle.
 *
 * Author: Vishnu – https://vishnu.wiki
 * Company: Codes Easy – https://www.codeseasy.com
 *
 * License: MIT
 * -----------------------------------------------------------------------------
 * MIT License
 *
 * Copyright (c) 2025 Vishnu (Codes Easy)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * -----------------------------------------------------------------------------
 *
 * Guarantees in this build:
 * - The target table is forced to 100% width of its parent (and screen) by default.
 * - Table headers and cells are left-aligned by default.
 * - Collapsible table according to screen width
 *
 * Quick Start:
 *   <script src="/assets/js/CollapseTable.js"></script>
 *   <table id="table1">
 *     <thead>
 *       <tr>
 *         <th data-priority="1" data-min="200">Project</th>
 *         <th data-priority="2" data-min="160">Client</th>
 *         <th data-priority="4" data-min="120">Budget</th>
 *         <th data-priority="3" data-min="130">Status</th>
 *         <th data-priority="5" data-min="140">Start</th>
 *         <th data-priority="6" data-min="140">End</th>
 *       </tr>
 *     </thead>
 *     <tbody>...</tbody>
 *   </table>
 *
 *   <script>
 *     var collapseTable = new CollapseTable();
 *     collapseTable.set("table1");
 *   </script>
 *
 * Notes:
 * - Lower data-priority number = more important (hidden later). data-priority="1" is never hidden.
 * - data-min (px) is a hint used for fit calculations. If omitted, an initial measured width is used.
 * - A control column (+/− button) is inserted as the first column if not already present.
 * - Accessible: aria-expanded, aria-controls, keyboard toggling with Enter/Space.
 */

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CollapseTable = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------
  // Internal utilities
  // ---------------------------
  const raf = (fn) =>
    (typeof window !== "undefined" && window.requestAnimationFrame
      ? window.requestAnimationFrame(fn)
      : setTimeout(fn, 16));

  function toElement(target) {
    if (!target) return null;
    if (typeof target === "string") {
      if (target.startsWith("#")) return document.getElementById(target.slice(1));
      return document.getElementById(target) || document.querySelector(target);
    }
    return target && target.nodeType === 1 ? target : null;
  }

  function createEl(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  function injectCoreStylesOnce() {
    if (document.getElementById("ctbl-core-styles")) return;
    const css = `
      .ctbl{width:100% !important;max-width:100% !important;table-layout:auto !important;border-collapse:separate;border-spacing:0;}
      .ctbl th,.ctbl td{text-align:left;}
      .ctbl-hide{display:none !important;}
      .ctbl-vh{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;}
    `;
    const style = document.createElement("style");
    style.id = "ctbl-core-styles";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // Shallow merge
  function merge(base, extra) {
    const out = Object.assign({}, base);
    if (!extra) return out;
    for (const k in extra) {
      if (!Object.prototype.hasOwnProperty.call(extra, k)) continue;
      const v = extra[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = merge(base[k] || {}, v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  // ---------------------------
  // Table Controller
  // ---------------------------
  class TableController {
    /**
     * @param {HTMLTableElement} table
     * @param {object} options
     * @param {function} emit
     */
    constructor(table, options, emit) {
      if (!(table instanceof HTMLTableElement)) throw new Error("CollapseTable: target is not a <table> element.");
      this.table = table;
      this.options = options;
      this.emit = emit;

      this._initOnce();
    }

    _initOnce() {
      injectCoreStylesOnce();

      // Ensure base class and width applied to target table
      if (!this.table.classList.contains(this.options.classNames.root)) {
        this.table.classList.add(this.options.classNames.root);
      }
      if (!this.table.style.width) {
        // Respect any existing inline width; otherwise enforce 100%
        this.table.style.width = "100%";
      }

      this.wrapper = this._getWrapper();
      this.thead = this.table.tHead;
      if (!this.thead || !this.thead.rows.length) {
        throw new Error("CollapseTable: table <thead> with at least one <tr> is required.");
      }
      this.headerRow = this.thead.rows[0];
      this.tbody = this.table.tBodies[0];
      if (!this.tbody) throw new Error("CollapseTable: table <tbody> is required.");

      this._ensureControlColumn();
      this.headers = Array.from(this.headerRow.cells);
      this.ctrlIndex = 0; // control column is always first after _ensureControlColumn

      // Build column metadata (priority, min, lock)
      this.columns = this._buildColumns();

      // Prepare rows (toggle cells + details rows)
      this._mountRows();

      // Initial visibility + measurement pass
      this._refit(true);

      // Observe size and DOM changes
      this._observe();
    }

    _getWrapper() {
      // Measure against the nearest parent element; fallback to the table itself
      return this.table.parentElement || this.table;
    }

    _ensureControlColumn() {
      // If the first TH is not our control, insert one at index 0
      const firstIsControl =
        this.headerRow.cells[0] &&
        this.headerRow.cells[0].classList.contains(this.options.classNames.control);

      if (!firstIsControl) {
        const th = createEl("th", this.options.classNames.control);
        th.setAttribute("aria-hidden", "true");
        th.setAttribute("scope", "col");
        this.headerRow.insertBefore(th, this.headerRow.firstChild);

        // Insert control TD for each data row
        for (const row of Array.from(this.tbody.rows)) {
          const td = createEl("td", this.options.classNames.control);
          row.insertBefore(td, row.firstChild);
        }
      } else {
        // Ensure required attributes
        const th = this.headerRow.cells[0];
        th.setAttribute("aria-hidden", "true");
        th.setAttribute("scope", "col");
      }
    }

    _buildColumns() {
      const cols = [];
      const ths = Array.from(this.headerRow.cells);
      // Ensure all columns are visible to measure natural widths
      ths.forEach((th) => th.classList.remove(this.options.classNames.hide));

      // Measure once (force a layout read after potential DOM changes)
      const measure = (th) => {
        const hinted = Number(th.getAttribute(this.options.attrs.min)) || 0;
        const w = Math.ceil(th.clientWidth || th.offsetWidth || 0);
        return hinted > 0 ? hinted : (w > 0 ? w : this.options.minWidthDefault);
      };

      for (let i = 0; i < ths.length; i++) {
        const th = ths[i];
        const isControl = i === 0; // after ensure, index 0 is control
        const priorityAttr = th.getAttribute(this.options.attrs.priority);
        const priority = priorityAttr ? Number(priorityAttr) : (isControl ? 1 : (i + 1)); // default: later columns are lower priority
        const min = isControl ? this.options.controlWidth : measure(th);
        const lock = isControl || priority === 1;
        cols.push({ index: i, th, priority, min, lock, hidden: false });
      }
      return cols;
    }

    _mountRows() {
      const rows = Array.from(this.tbody.rows);
      for (const row of rows) {
        if (row.classList.contains(this.options.classNames.details)) continue;

        // Add toggle button to control cell if missing
        const ctrlCell = row.cells[0];
        if (!ctrlCell.querySelector("button." + this.options.classNames.toggle)) {
          const id = this._detailsIdForRow(row);
          const btn = createEl("button", this.options.classNames.toggle);
          btn.type = "button";
          btn.setAttribute("aria-expanded", "false");
          btn.setAttribute("aria-controls", id);
          btn.setAttribute("title", this.options.strings.toggleTitle);
          btn.innerHTML =
            this.options.icons.expand +
            `<span class="ctbl-vh">${this.options.strings.toggleTitle}</span>`;
          ctrlCell.appendChild(btn);
        }

        // Ensure details row exists after each data row
        if (!row.nextElementSibling || !row.nextElementSibling.classList?.contains(this.options.classNames.details)) {
          const detailsRow = createEl("tr", this.options.classNames.details);
          detailsRow.setAttribute("hidden", "");
          const td = document.createElement("td");
          td.colSpan = this.headerRow.cells.length;
          const wrap = createEl("div", this.options.classNames.detailsInner);
          td.appendChild(wrap);
          detailsRow.appendChild(td);
          detailsRow.id = this._detailsIdForRow(row);
          row.insertAdjacentElement("afterend", detailsRow);
        }
      }

      // Delegated events (click + keyboard)
      this._clickHandler = (e) => {
        const btn = e.target.closest("button." + this.options.classNames.toggle);
        if (!btn) return;
        e.preventDefault();
        const row = btn.closest("tr");
        this.toggle(row);
      };
      this._keyHandler = (e) => {
        const btn = e.target.closest("button." + this.options.classNames.toggle);
        if (!btn) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const row = btn.closest("tr");
          this.toggle(row);
        }
      };
      this.table.addEventListener("click", this._clickHandler);
      this.table.addEventListener("keydown", this._keyHandler);
    }

    _observe() {
      // ResizeObserver for container/table width changes
      const RO = typeof window !== "undefined" && window.ResizeObserver
        ? window.ResizeObserver
        : class { observe(){} disconnect(){} };

      this._resizeObserver = new RO(() => {
        raf(() => this._refit());
      });
      this._resizeObserver.observe(this.wrapper);
      if (this.wrapper !== this.table) this._resizeObserver.observe(this.table);

      // MutationObserver to support dynamic changes
      const MO =
        typeof window !== "undefined" &&
        (window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver);

      if (MO) {
        // Observe tbody for row additions/removals
        this._tbodyObserver = new MO(() => {
          this._mountRows();
          this._refit();
        });
        this._tbodyObserver.observe(this.tbody, { childList: true, subtree: false });

        // Observe thead for structural changes (e.g., columns added/removed)
        this._theadObserver = new MO(() => {
          this.headerRow = this.thead.rows[0];
          this.headers = Array.from(this.headerRow.cells);
          this.columns = this._buildColumns();
          this._mountRows();
          this._refit();
        });
        this._theadObserver.observe(this.thead, { childList: true, subtree: true });
      }
    }

    _detailsIdForRow(row) {
      const index = Array.from(this.tbody.rows)
        .filter((r) => !r.classList.contains(this.options.classNames.details))
        .indexOf(row);
      return `${this.table.id || "ctbl"}-row-${index}-details`;
    }

    // Core algorithm: hide lower-priority columns until the table fits its available container width
    _refit(initial = false) {
      // Make everything visible first
      for (const c of this.columns) c.hidden = false;
      this._applyColumnVisibility();

      const available = this._availableWidth();
      const sumMin = () =>
        this.columns.filter((c) => !c.hidden).reduce((s, c) => s + c.min, 0);

      // Hide worst (highest priority number; tie-breaker: larger min width) until it fits
      let guard = 100;
      while (sumMin() > available && guard-- > 0) {
        const candidate = this.columns
          .filter((c) => !c.hidden && !c.lock && c.index !== 0)
          .sort((a, b) => b.priority - a.priority || b.min - a.min)[0];
        if (!candidate) break;
        candidate.hidden = true;
        this._applyColumnVisibility();
      }

      // Try to unhide if there's room (best-first)
      guard = 100;
      let changed = true;
      while (changed && guard-- > 0) {
        changed = false;
        const hiddenCols = this.columns
          .filter((c) => c.hidden)
          .sort((a, b) => a.priority - b.priority || a.min - b.min);
        for (const c of hiddenCols) {
          c.hidden = false;
          this._applyColumnVisibility();
          if (sumMin() <= available) {
            changed = true;
          } else {
            c.hidden = true;
            this._applyColumnVisibility();
          }
        }
      }

      // Update toggle visibility; refresh any open details rows
      const anyHidden = this.columns.some((c) => c.hidden && c.index !== 0);
      const dataRows = Array.from(this.tbody.rows).filter(
        (r) => !r.classList.contains(this.options.classNames.details)
      );
      for (const row of dataRows) {
        const btn = row.querySelector("button." + this.options.classNames.toggle);
        if (btn) btn.style.visibility = anyHidden ? "visible" : "hidden";
        const details = row.nextElementSibling;
        if (details && details.classList.contains(this.options.classNames.details) && !details.hidden) {
          this._renderDetailsForRow(row, details);
        }
      }

      this.emit("refit", { table: this.table, initial, anyHidden });
    }

    _availableWidth() {
      // Prefer wrapper width; fallback to table or viewport
      const w =
        (this.wrapper && this.wrapper.clientWidth) ||
        (this.table && this.table.clientWidth) ||
        (typeof window !== "undefined" ? window.innerWidth : 0) ||
        0;
      // If wrapper is 0 (e.g., display:none), use viewport to avoid hiding everything
      return w > 0 ? w : (typeof window !== "undefined" ? window.innerWidth : 1024) || 1024;
    }

    _applyColumnVisibility() {
      // Header
      for (const col of this.columns) {
        col.th.classList.toggle(this.options.classNames.hide, col.hidden);
      }
      // Body cells
      for (const row of Array.from(this.tbody.rows)) {
        if (row.classList.contains(this.options.classNames.details)) continue;
        for (const col of this.columns) {
          const td = row.cells[col.index];
          if (td) td.classList.toggle(this.options.classNames.hide, col.hidden);
        }
      }
    }

    _renderDetailsForRow(row, detailsRow) {
      const wrap = detailsRow.querySelector("." + this.options.classNames.detailsInner);
      if (!wrap) return;
      wrap.innerHTML = "";

      const cells = Array.from(row.cells);
      const hiddenCols = this.columns.filter((c) => c.hidden && c.index !== 0);

      for (const col of hiddenCols) {
        const label =
          (col.th.getAttribute(this.options.attrs.label) || col.th.textContent || "").trim();
        const item = createEl("div", this.options.classNames.detail);
        const name = createEl("span", this.options.classNames.name);
        const value = createEl("span", this.options.classNames.value);

        // Inline "name: value" layout to avoid wasted space when names are short and values are long
        name.textContent = label ? label + ": " : "";
        value.innerHTML = cells[col.index]?.innerHTML ?? "";

        item.appendChild(name);
        item.appendChild(value);
        wrap.appendChild(item);
      }
    }

    // Public-ish row toggle helpers
    toggle(row) {
      if (!row || row.classList.contains(this.options.classNames.details)) return;
      const btn = row.querySelector("button." + this.options.classNames.toggle);
      const details = row.nextElementSibling;
      if (!btn || !details || !details.classList.contains(this.options.classNames.details)) return;

      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = this.options.icons.expand + `<span class="ctbl-vh">${this.options.strings.show}</span>`;
        details.hidden = true;
        this.emit("collapse", { table: this.table, row });
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.innerHTML = this.options.icons.collapse + `<span class="ctbl-vh">${this.options.strings.hide}</span>`;
        this._renderDetailsForRow(row, details);
        details.hidden = false;
        this.emit("expand", { table: this.table, row });
      }
      this.emit("toggle", { table: this.table, row, expanded: !expanded });
    }

    expandAll() {
      const anyHidden = this.columns.some((c) => c.hidden && c.index !== 0);
      if (!anyHidden) return;
      const rows = Array.from(this.tbody.rows).filter(
        (r) => !r.classList.contains(this.options.classNames.details)
      );
      for (const row of rows) {
        const btn = row.querySelector("button." + this.options.classNames.toggle);
        if (!btn) continue;
        if (btn.getAttribute("aria-expanded") !== "true") this.toggle(row);
      }
    }

    collapseAll() {
      const rows = Array.from(this.tbody.rows).filter(
        (r) => !r.classList.contains(this.options.classNames.details)
      );
      for (const row of rows) {
        const btn = row.querySelector("button." + this.options.classNames.toggle);
        if (!btn) continue;
        if (btn.getAttribute("aria-expanded") === "true") this.toggle(row);
      }
    }

    refresh() {
      // Recompute min widths (in case fonts/styles changed), then refit
      this.columns.forEach((col, i) => {
        if (i === 0) {
          col.min = this.options.controlWidth;
          return;
        }
        const hinted = Number(col.th.getAttribute(this.options.attrs.min)) || 0;
        const w = Math.ceil(col.th.clientWidth || col.th.offsetWidth || 0);
        col.min = hinted > 0 ? hinted : (w > 0 ? w : this.options.minWidthDefault);
      });
      this._refit();
    }

    destroy() {
      // Remove observers and handlers; keep table content, remove details rows and toggle buttons, unhide all cells
      if (this._resizeObserver && this._resizeObserver.disconnect) this._resizeObserver.disconnect();
      if (this._tbodyObserver && this._tbodyObserver.disconnect) this._tbodyObserver.disconnect();
      if (this._theadObserver && this._theadObserver.disconnect) this._theadObserver.disconnect();
      if (this._clickHandler) this.table.removeEventListener("click", this._clickHandler);
      if (this._keyHandler) this.table.removeEventListener("keydown", this._keyHandler);

      // Unhide all columns
      for (const col of this.columns) {
        col.th.classList.remove(this.options.classNames.hide);
      }
      for (const row of Array.from(this.tbody.rows)) {
        if (row.classList.contains(this.options.classNames.details)) continue;
        for (const col of this.columns) {
          const td = row.cells[col.index];
          if (td) td.classList.remove(this.options.classNames.hide);
        }
      }

      // Remove details rows
      for (const row of Array.from(this.tbody.rows)) {
        if (row.classList.contains(this.options.classNames.details)) row.remove();
      }

      // Remove toggle buttons
      const toggles = this.table.querySelectorAll("button." + this.options.classNames.toggle);
      toggles.forEach((btn) => btn.remove());

      this.emit("destroy", { table: this.table });
    }
  }

  // ---------------------------
  // Main Library Class
  // ---------------------------
  class CollapseTable {
    /**
     * @param {object} globalOptions
     */
    constructor(globalOptions = {}) {
      // Defaults
      this.defaults = {
        controlWidth: 46,           // px for the control (toggle) column
        minWidthDefault: 140,       // fallback min width (px) if data-min is not provided and cannot be measured
        attrs: {
          priority: "data-priority",// lower = more important (1 is never hidden)
          min: "data-min",          // min width hint (px)
          label: "data-label"       // optional override for header text shown in details
        },
        classNames: {
          root: "ctbl",                   // applied to the target table
          control: "ctbl-control",        // control column cells (th/td)
          toggle: "ctbl-toggle",          // button on each row
          details: "ctbl-details",        // <tr> details row
          detailsInner: "ctbl-details-inner", // inner wrapper within details td
          detail: "ctbl-detail",          // container for each hidden column item
          name: "ctbl-name",              // label span inside detail item
          value: "ctbl-value",            // value span inside detail item
          hide: "ctbl-hide"               // applied to hidden th/td
        },
        icons: {
          expand: "+",
          collapse: "−"
        },
        strings: {
          toggleTitle: "Show more",
          show: "Show details",
          hide: "Hide details"
        }
      };

      this.options = merge(this.defaults, globalOptions);
      this._tables = new Map(); // tableElement => TableController
      this._events = {};        // eventName => Set<fn>
    }

    // Public API: assign a table to the library
    set(target, perTableOptions = {}) {
      const el = toElement(target);
      if (!el) throw new Error("CollapseTable.set: target not found.");
      if (!(el instanceof HTMLTableElement)) throw new Error("CollapseTable.set: target must be a <table> element or its id.");

      if (this._tables.has(el)) {
        // Update options and refresh
        const ctrl = this._tables.get(el);
        ctrl.options = merge(this.options, perTableOptions);
        ctrl.refresh();
        return ctrl;
      }

      const merged = merge(this.options, perTableOptions);
      const controller = new TableController(el, merged, this._emit.bind(this));
      this._tables.set(el, controller);
      return controller;
    }

    // Remove responsive behavior from a specific table
    unset(target) {
      const el = toElement(target);
      if (!el) return;
      const ctrl = this._tables.get(el);
      if (!ctrl) return;
      ctrl.destroy();
      this._tables.delete(el);
    }

    // Refresh (re-measure + refit) a specific table or all
    refresh(target) {
      if (!target) {
        this._tables.forEach((ctrl) => ctrl.refresh());
        return;
      }
      const el = toElement(target);
      if (!el) return;
      const ctrl = this._tables.get(el);
      if (ctrl) ctrl.refresh();
    }

    // Expand/Collapse helpers
    expandAll(target) {
      if (target) {
        const el = toElement(target);
        const ctrl = this._tables.get(el);
        if (ctrl) ctrl.expandAll();
      } else {
        this._tables.forEach((ctrl) => ctrl.expandAll());
      }
    }
    collapseAll(target) {
      if (target) {
        const el = toElement(target);
        const ctrl = this._tables.get(el);
        if (ctrl) ctrl.collapseAll();
      } else {
        this._tables.forEach((ctrl) => ctrl.collapseAll());
      }
    }

    // Event system
    on(event, handler) {
      if (!this._events[event]) this._events[event] = new Set();
      this._events[event].add(handler);
    }
    off(event, handler) {
      if (!this._events[event]) return;
      this._events[event].delete(handler);
    }
    _emit(event, detail) {
      if (!this._events[event]) return;
      for (const fn of this._events[event]) {
        try { fn(detail); } catch (_) {}
      }
    }

    // Static version (useful in debugging)
    static get version() { return "1.0.0"; }
  }

  return CollapseTable;
});
