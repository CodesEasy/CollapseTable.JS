/*!
 * CollapseTable v1.1.1
 * Lightweight, dependency-free JavaScript library that makes plain HTML tables responsive
 * by collapsing lower-priority columns into a per-row “details” panel with a +/− toggle.
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
 * - Table is forced to 100% width of its parent by default.
 * - Table headers and cells are left-aligned by default.
 * - Columns collapse based on priorities and width hints; details render as "Label: Value".
 * - Production-grade: resize fallbacks, hidden-container deferral, multi-TBODY support,
 *   accessibility improvements, attribute-aware updates, stable row IDs, setAll/unsetAll,
 *   per-row controls, detailsRender hook, and more.
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

  /** ========================================================================
   * Utilities
   * ======================================================================= */

  /** requestAnimationFrame with setTimeout fallback */
  const raf = (fn) =>
      (typeof window !== "undefined" && window.requestAnimationFrame
          ? window.requestAnimationFrame(fn)
          : setTimeout(fn, 16));

  /** Simple throttle */
  function throttle(fn, wait) {
    let last = 0, t, ctx, args;
    return function throttled() {
      const now = Date.now();
      ctx = this; args = arguments;
      const remaining = wait - (now - last);
      if (remaining <= 0 || remaining > wait) {
        if (t) { clearTimeout(t); t = null; }
        last = now;
        fn.apply(ctx, args);
      } else if (!t) {
        t = setTimeout(() => {
          last = Date.now();
          t = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  /** Resolve string id/selector or element to a DOM Element */
  function toElement(target) {
    if (!target) return null;
    if (typeof target === "string") {
      if (target.startsWith("#")) return document.getElementById(target.slice(1));
      return document.getElementById(target) || document.querySelector(target);
    }
    return target && target.nodeType === 1 ? target : null;
  }

  /** Normalize a variety of inputs to a flat array of HTMLElements */
  function normalizeElements(input) {
    if (!input) return [];
    if (typeof input === "string") return Array.from(document.querySelectorAll(input));
    if (input instanceof Element) return [input];
    if (input instanceof NodeList || input instanceof HTMLCollection) return Array.from(input);
    if (Array.isArray(input)) return input.filter(n => n instanceof Element);
    return [];
  }

  /** Element creator */
  function createEl(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /** Run side-effect exactly once per table for a given key */
  function oncePerTable(table, key, fn) {
    const s = oncePerTable._store || (oncePerTable._store = new WeakMap());
    let set = s.get(table);
    if (!set) { set = new Set(); s.set(table, set); }
    if (set.has(key)) return;
    set.add(key);
    fn();
  }

  /** Inject minimal core styles once (scoped via .ctbl root) */
  function injectCoreStylesOnce() {
    if (document.getElementById("ctbl-core-styles")) return;
    const css = `
      .ctbl{width:100%;max-width:100%;table-layout:auto;border-collapse:separate;border-spacing:0;}
      .ctbl th,.ctbl td{text-align:left;}
      .ctbl-hide{display:none;}
      .ctbl-vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
      .ctbl-control .ctbl-toggle{cursor:pointer;background:transparent;border:0;padding:0 8px;font:inherit;line-height:1.2;}
      .ctbl-control .ctbl-toggle:focus{outline:2px solid #2684FF;outline-offset:2px;}
      .ctbl-details-row[hidden]{display:none;}
    `;
    const style = document.createElement("style");
    style.id = "ctbl-core-styles";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  /** Deep(ish) merge: merges plain objects recursively */
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

  /** Visibility helper (true if not display:none/visibility:hidden) */
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style && style.display !== "none" && style.visibility !== "hidden";
  }

  /** ========================================================================
   * Column Fit Algorithm (pure)
   * ======================================================================= */

  /**
   * Decide which columns to hide so that total min widths fit into available.
   * @param {{index:number,min:number,priority:number,lock:boolean}[]} columnsMeta
   * @param {number} available
   * @returns {Set<number>} indices of hidden columns
   */
  function computeHiddenColumns(columnsMeta, available) {
    // Copy so we can mutate hidden state
    const cols = columnsMeta.map(c => ({
      index: c.index,
      min: c.min,
      priority: c.priority,
      lock: !!c.lock,
      hidden: false
    }));

    const sumMin = () => cols.filter(c => !c.hidden).reduce((s, c) => s + c.min, 0);

    // Hide worst (highest priority number, then widest) until it fits
    let guard = 200;
    while (sumMin() > available && guard-- > 0) {
      const candidate = cols
          .filter(c => !c.hidden && !c.lock && c.index !== 0)
          .sort((a, b) => b.priority - a.priority || b.min - a.min)[0];
      if (!candidate) break;
      candidate.hidden = true;
    }

    // Try to unhide best (lowest priority number, then narrowest) if there's room
    guard = 200;
    let changed = true;
    while (changed && guard-- > 0) {
      changed = false;
      const hidden = cols
          .filter(c => c.hidden)
          .sort((a, b) => a.priority - b.priority || a.min - b.min);
      for (const c of hidden) {
        c.hidden = false;
        if (sumMin() <= available) {
          changed = true;
        } else {
          c.hidden = true;
        }
      }
    }

    return new Set(cols.filter(c => c.hidden).map(c => c.index));
  }

  /** ========================================================================
   * Table Controller
   * ======================================================================= */

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

      this._rowKeyMap = new WeakMap(); // TR -> stable key
      this._rowKeySeq = 0;
      this._unsupportedSpan = false;
      this._destroyed = false;

      this._initOnce();
    }

    _initOnce() {
      injectCoreStylesOnce();

      // Root class, width, and layout
      if (!this.table.classList.contains(this.options.classNames.root)) {
        this.table.classList.add(this.options.classNames.root);
      }
      if (!this.table.style.width) this.table.style.width = "100%";
      if (!this.table.style.tableLayout) this.table.style.tableLayout = this.options.tableLayout;

      // Structure
      this.thead = this.table.tHead;
      if (!this.thead || !this.thead.rows.length) {
        throw new Error("CollapseTable: table <thead> with at least one <tr> is required.");
      }
      this.headerRow = this.thead.rows[0];

      this.tbodies = Array.from(this.table.tBodies || []);
      if (!this.tbodies.length) throw new Error("CollapseTable: table <tbody> is required.");

      // Validate no colspan/rowspan (current limitation)
      this._checkSpans();

      // Prepare control column, headers and columns metadata
      this._ensureControlColumn();
      this.headers = Array.from(this.headerRow.cells);
      this.ctrlIndex = 0;

      this._buildColumns(); // sets this.columnsMeta

      // Prepare all TBODY rows
      this._mountAllBodies();

      // Initial fit
      this._refit(true);

      // Observe size / attributes / DOM
      this._observe();
    }

    _checkSpans() {
      const hasSpanInHead = Array.from(this.headerRow.cells).some(th => th.colSpan !== 1 || th.rowSpan !== 1);
      const hasSpanInBody = this.tbodies.some(tb =>
          Array.from(tb.rows).some(tr =>
              Array.from(tr.cells).some(td => td.colSpan !== 1 || td.rowSpan !== 1)
          )
      );
      if (hasSpanInHead || hasSpanInBody) {
        this._unsupportedSpan = true;
        oncePerTable(this.table, "span-warning", () => {
          console.warn("CollapseTable: <colspan> / <rowspan> detected. Responsive collapsing is disabled for this table; base styles still applied.");
        });
      }
    }

    _getWrapper() {
      return this.table.parentElement || this.table;
    }

    _ensureControlColumn() {
      const firstIsControl = this.headerRow.cells[0] && this.headerRow.cells[0].classList.contains(this.options.classNames.control);
      if (!firstIsControl) {
        const th = createEl("th", this.options.classNames.control);
        th.setAttribute("aria-hidden", "true");
        th.setAttribute("scope", "col");
        this.headerRow.insertBefore(th, this.headerRow.firstChild);
        // Insert control TD for each row in each TBODY
        for (const tb of this.tbodies) {
          for (const row of Array.from(tb.rows)) {
            const td = createEl("td", this.options.classNames.control);
            row.insertBefore(td, row.firstChild);
          }
        }
      } else {
        const th = this.headerRow.cells[0];
        th.setAttribute("aria-hidden", "true");
        th.setAttribute("scope", "col");
      }
    }

    _buildColumns() {
      const ths = Array.from(this.headerRow.cells);
      ths.forEach(th => th.classList.remove(this.options.classNames.hide));

      const measure = (th) => {
        const hinted = Number(th.getAttribute(this.options.attrs.min)) || 0;
        const w = Math.ceil(th.clientWidth || th.offsetWidth || 0);
        return hinted > 0 ? hinted : (w > 0 ? w : this.options.minWidthDefault);
      };

      /** @type {{index:number, th:HTMLTableCellElement, priority:number, min:number, lock:boolean}[]} */
      const cols = [];
      const priorities = [];
      for (let i = 0; i < ths.length; i++) {
        const th = ths[i];
        const isControl = i === 0;
        const priorityAttr = th.getAttribute(this.options.attrs.priority);
        const priority = priorityAttr ? Number(priorityAttr) : (isControl ? 1 : (i + 1));
        const min = isControl ? this.options.controlWidth : measure(th);
        const lock = isControl || priority === 1;
        cols.push({ index: i, th, priority, min, lock });
        if (!isControl) priorities.push(priority);
      }

      // Priority sanity warnings (once)
      oncePerTable(this.table, "priority-warn", () => {
        const ones = priorities.filter(p => p === 1).length;
        if (ones > 0) console.warn("CollapseTable: Use priority=1 sparingly (never hidden). Found:", ones);
        const bad = priorities.some(p => Number.isNaN(p) || p < 1);
        if (bad) console.warn("CollapseTable: Some columns have invalid/missing data-priority; default ordering will be used.");
      });

      this.columnsMeta = cols;
      return cols;
    }

    _mountAllBodies() {
      for (const tb of this.tbodies) this._mountRowsInBody(tb);

      // Event delegation (click + keyboard)
      this._clickHandler = (e) => {
        const btn = e.target.closest && e.target.closest("button." + this.options.classNames.toggle);
        if (!btn || !this.table.contains(btn)) return;
        e.preventDefault();
        const row = btn.closest("tr");
        if (!row) return;
        this.toggle(row);
      };
      this._keyHandler = (e) => {
        const btn = e.target.closest && e.target.closest("button." + this.options.classNames.toggle);
        if (!btn || !this.table.contains(btn)) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const row = btn.closest("tr");
          if (!row) return;
          this.toggle(row);
        }
      };
      this.table.addEventListener("click", this._clickHandler);
      this.table.addEventListener("keydown", this._keyHandler);
    }

    _mountRowsInBody(tbody) {
      const dataRows = Array.from(tbody.rows).filter(r => !r.classList.contains(this.options.classNames.details));
      for (const row of dataRows) {
        // Stable row key
        if (!this._rowKeyMap.has(row)) {
          const key = row.getAttribute("data-ctbl-key") || String(++this._rowKeySeq);
          this._rowKeyMap.set(row, key);
        }

        // Toggle button
        const ctrlCell = row.cells[0];
        if (!ctrlCell.querySelector("button." + this.options.classNames.toggle)) {
          const id = this._detailsIdForRow(row);
          const btn = createEl("button", this.options.classNames.toggle);
          btn.type = "button";
          btn.setAttribute("aria-expanded", "false");
          btn.setAttribute("aria-controls", id);
          btn.setAttribute("title", this.options.strings.toggleTitle);
          btn.setAttribute("aria-label", this.options.strings.toggleTitle);
          btn.innerHTML = this.options.icons.expand + `<span class="ctbl-vh">${this.options.strings.toggleTitle}</span>`;
          ctrlCell.appendChild(btn);
        }

        // Details row (after each data row)
        const next = row.nextElementSibling;
        if (!(next && next.classList && next.classList.contains(this.options.classNames.details))) {
          const detailsRow = createEl("tr", this.options.classNames.details);
          detailsRow.classList.add("ctbl-details-row");
          detailsRow.setAttribute("hidden", "");
          const td = document.createElement("td");
          td.colSpan = this.headerRow.cells.length;
          const wrap = createEl("div", this.options.classNames.detailsInner);
          wrap.setAttribute("role", "region");
          wrap.setAttribute("aria-live", "polite");
          td.appendChild(wrap);
          detailsRow.appendChild(td);
          detailsRow.id = this._detailsIdForRow(row);
          row.insertAdjacentElement("afterend", detailsRow);
        }
      }
    }

    _observe() {
      this.wrapper = this._getWrapper();

      // ResizeObserver (wrapper + table)
      const RO = (typeof window !== "undefined" && window.ResizeObserver) ? window.ResizeObserver : null;
      if (RO) {
        this._resizeObserver = new RO(() => {
          if (this._destroyed) return;
          raf(() => this._refit());
        });
        this._resizeObserver.observe(this.wrapper);
        if (this.wrapper !== this.table) this._resizeObserver.observe(this.table);
        // Observe header row for width-affecting changes
        this._headerResizeObserver = new RO(() => {
          if (this._destroyed) return;
          raf(() => this.refresh());
        });
        this._headerResizeObserver.observe(this.headerRow);
      } else {
        // Fallback: window resize (throttled)
        this._onWinResize = throttle(() => {
          if (this._destroyed) return;
          this._refit();
        }, 100);
        window.addEventListener("resize", this._onWinResize);
      }

      // IntersectionObserver (defer when hidden)
      if (this.options.deferWhenHidden && typeof window !== "undefined" && "IntersectionObserver" in window) {
        const IO = window.IntersectionObserver;
        this._intersectObserver = new IO((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this._refit();
            }
          }
        }, { root: null, threshold: 0.01 });
        this._intersectObserver.observe(this.table);
      }

      // MutationObserver for dynamic rows / structure
      const MO = (typeof window !== "undefined") && (window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver);
      if (MO) {
        // TBODY changes (rows added/removed)
        this._tbodyObservers = this.tbodies.map(tb => {
          const m = new MO(() => {
            this._mountRowsInBody(tb);
            this._refit();
          });
          m.observe(tb, { childList: true, subtree: false });
          return m;
        });

        // THEAD structural/attribute changes
        this._theadObserver = new MO((mutations) => {
          let mustRebuild = false;
          for (const m of mutations) {
            if (m.type === "childList" || (m.type === "attributes" && (m.target.tagName === "TH" || m.target === this.headerRow))) {
              mustRebuild = true; break;
            }
          }
          if (mustRebuild) {
            this.headerRow = this.thead.rows[0];
            this.headers = Array.from(this.headerRow.cells);
            this._buildColumns();
            this._mountAllBodies();
            this._refit();
          }
        });
        this._theadObserver.observe(this.thead, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [this.options.attrs.priority, this.options.attrs.min, this.options.attrs.label]
        });
      }
    }

    _detailsIdForRow(row) {
      const key = this._rowKeyMap.get(row) || "x";
      const base = this.table.id || "ctbl";
      return `${base}-row-${key}-details`;
    }

    _availableWidth() {
      const w = this.wrapper && this.wrapper.clientWidth ? this.wrapper.clientWidth
          : this.table && this.table.clientWidth ? this.table.clientWidth
              : (typeof window !== "undefined" ? window.innerWidth : 0);
      const visible = isVisible(this.wrapper) && isVisible(this.table);
      if (!visible && this.options.deferWhenHidden) {
        // Defer precise refit until visible; use viewport to avoid collapsing everything.
        return (typeof window !== "undefined" ? window.innerWidth : 1024) || 1024;
      }
      return w > 0 ? w : ((typeof window !== "undefined" ? window.innerWidth : 1024) || 1024);
    }

    _applyVisibility(hiddenSet) {
      // Header
      for (const col of this.columnsMeta) {
        const hide = hiddenSet.has(col.index);
        col.th.classList.toggle(this.options.classNames.hide, hide);
      }
      // Bodies
      for (const tb of this.tbodies) {
        for (const row of Array.from(tb.rows)) {
          if (row.classList.contains(this.options.classNames.details)) continue;
          for (const col of this.columnsMeta) {
            const td = row.cells[col.index];
            if (td) td.classList.toggle(this.options.classNames.hide, hiddenSet.has(col.index));
          }
        }
      }
    }

    _firstVisibleCellText(row, hiddenSet) {
      for (const col of this.columnsMeta) {
        if (col.index === 0) continue;
        if (!hiddenSet.has(col.index)) {
          const td = row.cells[col.index];
          if (td) {
            const txt = (td.textContent || "").trim();
            if (txt) return txt;
          }
        }
      }
      return "";
    }

    _renderDetailsForRow(row, detailsRow, hiddenSet) {
      const wrap = detailsRow.querySelector("." + this.options.classNames.detailsInner);
      if (!wrap) return;
      wrap.innerHTML = "";

      // Accessible label for region
      const primary = this._firstVisibleCellText(row, hiddenSet);
      if (primary) {
        wrap.setAttribute("aria-label", `Details for ${primary}`);
      } else {
        wrap.setAttribute("aria-label", "Row details");
      }

      const cells = Array.from(row.cells);

      // Custom renderer hook
      if (typeof this.options.detailsRender === "function") {
        const hiddenCols = this.columnsMeta.filter(c => hiddenSet.has(c.index) && c.index !== 0);
        const result = this.options.detailsRender(row, hiddenCols, cells);
        if (result instanceof Node) {
          wrap.appendChild(result);
          return;
        }
        if (typeof result === "string") {
          wrap.innerHTML = result;
          return;
        }
        // Fall through to default if returned nothing
      }

      // Default "name: value" list
      for (const col of this.columnsMeta) {
        if (col.index === 0) continue;
        if (!hiddenSet.has(col.index)) continue;

        const label = (col.th.getAttribute(this.options.attrs.label) || col.th.textContent || "").trim();
        const item = createEl("div", this.options.classNames.detail);
        const name = createEl("span", this.options.classNames.name);
        const value = createEl("span", this.options.classNames.value);

        name.textContent = label ? (label + ": ") : "";
        value.innerHTML = cells[col.index]?.innerHTML ?? "";

        item.appendChild(name);
        item.appendChild(value);
        wrap.appendChild(item);
      }
    }

    _updateTogglesVisibility(anyHidden, hiddenSet) {
      // Hide/show the entire control column to prevent an empty leading space when no details are available.
      const hideControlCol = !anyHidden;

      // Header control cell
      const ctrlTh = this.headerRow && this.headerRow.cells && this.headerRow.cells[0];
      if (ctrlTh) ctrlTh.classList.toggle(this.options.classNames.hide, hideControlCol);

      for (const tb of this.tbodies) {
        const dataRows = Array.from(tb.rows).filter(r => !r.classList.contains(this.options.classNames.details));
        for (const row of dataRows) {
          // Control cell visibility (entire column)
          const ctrlTd = row.cells && row.cells[0];
          if (ctrlTd) ctrlTd.classList.toggle(this.options.classNames.hide, hideControlCol);

          // Toggle button visibility and labels
          const btn = row.querySelector("button." + this.options.classNames.toggle);
          if (!btn) continue;
          btn.style.visibility = anyHidden ? "visible" : "hidden";
          // a11y: include hidden count in label
          const hiddenCount = this.columnsMeta.filter(c => hiddenSet.has(c.index) && c.index !== 0).length;
          const base = this.options.strings.toggleTitle;
          btn.setAttribute("aria-label", anyHidden ? `${base} (${hiddenCount} hidden)` : base);

          // If currently expanded, re-render details
          const details = row.nextElementSibling;
          const expanded = btn.getAttribute("aria-expanded") === "true";
          if (details && details.classList.contains(this.options.classNames.details) && !details.hidden && expanded) {
            this._renderDetailsForRow(row, details, hiddenSet);
          }
        }
      }
    }

    _refit(initial = false) {
      if (this._unsupportedSpan) return; // Base styles only

      // Compute visibility once, then apply
      const available = this._availableWidth();
      const meta = this.columnsMeta.map(c => ({
        index: c.index,
        min: c.min,
        priority: c.priority,
        lock: c.index === 0 || c.priority === 1
      }));

      const hiddenSet = computeHiddenColumns(meta, available);
      this._applyVisibility(hiddenSet);

      const anyHidden = Array.from(hiddenSet).some(i => i !== 0);
      this._updateTogglesVisibility(anyHidden, hiddenSet);

      this.emit("refit", { table: this.table, initial, anyHidden });
    }

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
        // Rebuild details for current hidden set
        const hiddenSet = new Set(this.columnsMeta.filter(c => c.th.classList.contains(this.options.classNames.hide)).map(c => c.index));
        this._renderDetailsForRow(row, details, hiddenSet);
        details.hidden = false;
        this.emit("expand", { table: this.table, row });
      }
      this.emit("toggle", { table: this.table, row, expanded: !expanded });
    }

    expandAll() {
      // Only if there are hidden columns
      const anyHidden = this.columnsMeta.some(c => c.index !== 0 && c.th.classList.contains(this.options.classNames.hide));
      if (!anyHidden) return;

      for (const tb of this.tbodies) {
        const rows = Array.from(tb.rows).filter(r => !r.classList.contains(this.options.classNames.details));
        for (const row of rows) {
          const btn = row.querySelector("button." + this.options.classNames.toggle);
          if (!btn) continue;
          if (btn.getAttribute("aria-expanded") !== "true") this.toggle(row);
        }
      }
    }

    collapseAll() {
      for (const tb of this.tbodies) {
        const rows = Array.from(tb.rows).filter(r => !r.classList.contains(this.options.classNames.details));
        for (const row of rows) {
          const btn = row.querySelector("button." + this.options.classNames.toggle);
          if (!btn) continue;
          if (btn.getAttribute("aria-expanded") === "true") this.toggle(row);
        }
      }
    }

    /** Programmatic per-row control */
    expandRow(rowOrIndex) {
      const row = this._resolveDataRow(rowOrIndex);
      if (!row) return;
      const btn = row.querySelector("button." + this.options.classNames.toggle);
      if (btn && btn.getAttribute("aria-expanded") !== "true") this.toggle(row);
    }

    collapseRow(rowOrIndex) {
      const row = this._resolveDataRow(rowOrIndex);
      if (!row) return;
      const btn = row.querySelector("button." + this.options.classNames.toggle);
      if (btn && btn.getAttribute("aria-expanded") === "true") this.toggle(row);
    }

    _resolveDataRow(rowOrIndex) {
      if (rowOrIndex instanceof HTMLTableRowElement) return rowOrIndex;
      const idx = Number(rowOrIndex);
      if (!Number.isFinite(idx)) return null;
      // Resolve across all TBODYs
      const allRows = this.tbodies.flatMap(tb => Array.from(tb.rows).filter(r => !r.classList.contains(this.options.classNames.details)));
      return allRows[idx] || null;
    }

    refresh() {
      // Re-measure min widths for columns (in case fonts/styles changed)
      this.columnsMeta.forEach((col, i) => {
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
      this._destroyed = true;

      // Observers / listeners
      if (this._resizeObserver && this._resizeObserver.disconnect) this._resizeObserver.disconnect();
      if (this._headerResizeObserver && this._headerResizeObserver.disconnect) this._headerResizeObserver.disconnect();
      if (this._intersectObserver && this._intersectObserver.disconnect) this._intersectObserver.disconnect();
      if (this._tbodyObservers) this._tbodyObservers.forEach(m => m.disconnect && m.disconnect());
      if (this._theadObserver && this._theadObserver.disconnect) this._theadObserver.disconnect();
      if (this._clickHandler) this.table.removeEventListener("click", this._clickHandler);
      if (this._keyHandler) this.table.removeEventListener("keydown", this._keyHandler);
      if (this._onWinResize) window.removeEventListener("resize", this._onWinResize);

      // Unhide all cells
      for (const col of this.columnsMeta) col.th.classList.remove(this.options.classNames.hide);
      for (const tb of this.tbodies) {
        for (const row of Array.from(tb.rows)) {
          if (row.classList.contains(this.options.classNames.details)) continue;
          for (const col of this.columnsMeta) {
            const td = row.cells[col.index];
            if (td) td.classList.remove(this.options.classNames.hide);
          }
        }
      }

      // Remove details rows
      for (const tb of this.tbodies) {
        for (const row of Array.from(tb.rows)) {
          if (row.classList.contains(this.options.classNames.details)) row.remove();
        }
      }

      // Remove toggle buttons
      const toggles = this.table.querySelectorAll("button." + this.options.classNames.toggle);
      toggles.forEach((btn) => btn.remove());

      this.emit("destroy", { table: this.table });
    }
  }

  /** ========================================================================
   * Main Library Class
   * ======================================================================= */

  class CollapseTable {
    /**
     * @param {object} globalOptions
     */
    constructor(globalOptions = {}) {
      this.defaults = {
        controlWidth: 46,            // px for control column
        minWidthDefault: 140,        // px when no data-min and cannot measure
        tableLayout: "auto",         // 'auto' | 'fixed'
        deferWhenHidden: true,       // if container hidden, defer precision until visible
        attrs: {
          priority: "data-priority", // lower = more important (1 never hidden)
          min: "data-min",           // min width hint (px)
          label: "data-label"        // optional override for header text in details
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
        /**
         * Optional custom details renderer:
         * @param {HTMLTableRowElement} row
         * @param {{index:number,th:HTMLTableCellElement,priority:number,min:number,lock:boolean}[]} hiddenColumns
         * @param {HTMLTableCellElement[]} cells
         * @returns {Node|string|void}
         */
        detailsRender: undefined
      };

      this.options = merge(this.defaults, globalOptions);
      this._tables = new Map(); // tableElement => TableController
      this._events = {};        // eventName => Set<fn>
    }

    /**
     * Attach to one table
     * @param {string|HTMLTableElement} target id, selector, or element
     * @param {object} perTableOptions
     * @returns {TableController}
     */
    set(target, perTableOptions = {}) {
      const el = toElement(target);
      if (!el) throw new Error("CollapseTable.set: target not found.");
      if (!(el instanceof HTMLTableElement)) throw new Error("CollapseTable.set: target must be a <table> element or its id.");

      if (this._tables.has(el)) {
        const ctrl = this._tables.get(el);
        ctrl.options = merge(this.options, perTableOptions);
        // apply tableLayout inline if changed
        if (!ctrl.table.style.tableLayout || ctrl.table.style.tableLayout !== ctrl.options.tableLayout) {
          ctrl.table.style.tableLayout = ctrl.options.tableLayout;
        }
        ctrl.refresh();
        return ctrl;
      }

      const merged = merge(this.options, perTableOptions);
      const controller = new TableController(el, merged, this._emit.bind(this));
      this._tables.set(el, controller);
      return controller;
    }

    /**
     * Attach to all matching tables
     * @param {string|Element|NodeList|HTMLCollection|Element[]} targets CSS selector, element(s), or list
     * @param {object} perTableOptions
     * @returns {TableController[]} controllers for matched tables
     */
    setAll(targets, perTableOptions = {}) {
      const list = normalizeElements(targets).filter(el => el instanceof HTMLTableElement);
      return list.map(el => this.set(el, perTableOptions));
    }

    /**
     * Remove behavior from one table
     * @param {string|HTMLTableElement} target
     */
    unset(target) {
      const el = toElement(target);
      if (!el) return;
      const ctrl = this._tables.get(el);
      if (!ctrl) return;
      ctrl.destroy();
      this._tables.delete(el);
    }

    /**
     * Remove behavior from all matching tables
     * @param {string|Element|NodeList|HTMLCollection|Element[]} targets
     */
    unsetAll(targets) {
      const list = normalizeElements(targets).filter(el => el instanceof HTMLTableElement);
      for (const el of list) this.unset(el);
    }

    /**
     * Refresh (re-measure + refit)
     * @param {string|HTMLTableElement} [target] if omitted, refreshes all
     */
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

    /** Expand details in all rows (for one or all attached tables) */
    expandAll(target) {
      if (target) {
        const el = toElement(target);
        const ctrl = this._tables.get(el);
        if (ctrl) ctrl.expandAll();
      } else {
        this._tables.forEach((ctrl) => ctrl.expandAll());
      }
    }

    /** Collapse details in all rows (for one or all attached tables) */
    collapseAll(target) {
      if (target) {
        const el = toElement(target);
        const ctrl = this._tables.get(el);
        if (ctrl) ctrl.collapseAll();
      } else {
        this._tables.forEach((ctrl) => ctrl.collapseAll());
      }
    }

    /** Programmatic per-row controls on a specific table */
    expandRow(target, rowOrIndex) {
      const el = toElement(target);
      const ctrl = el && this._tables.get(el);
      if (ctrl) ctrl.expandRow(rowOrIndex);
    }
    collapseRow(target, rowOrIndex) {
      const el = toElement(target);
      const ctrl = el && this._tables.get(el);
      if (ctrl) ctrl.collapseRow(rowOrIndex);
    }

    /** Get current global options (cloned) */
    getOptions() {
      return merge({}, this.options);
    }

    /** Update global options and apply to all attached tables */
    updateOptions(partial) {
      this.options = merge(this.options, partial);
      this._tables.forEach((ctrl) => {
        ctrl.options = merge(ctrl.options, partial);
        if (partial.tableLayout) ctrl.table.style.tableLayout = ctrl.options.tableLayout;
        ctrl.refresh();
      });
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

    // Version (static)
    static get version() { return "1.1.1"; }
  }

  return CollapseTable;
});
