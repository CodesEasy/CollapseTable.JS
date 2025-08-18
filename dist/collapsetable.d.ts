/**
 * Type definitions for @codeseasy/collapsetable v1.2.0
 * UMD library — usable via script tag (global `CollapseTable`)
 * and via modules (CommonJS/ESM with esModuleInterop).
 */

/* =====================================================================
 * UMD value export (the class/constructor users instantiate)
 * ===================================================================*/

declare class CollapseTable {
    /**
     * Create a CollapseTable instance.
     *
     * Tip: set `{ mode: 'development' }` during integration to see helpful warnings.
     */
    constructor(options?: CollapseTable.Options);

    /**
     * Attach responsive behavior to a single table.
     *
     * `target` can be:
     *  - table id **without** '#', e.g. `"orders"`
     *  - a CSS selector, e.g. `"#orders"` | `".report"` | `"table.responsive"`
     *  - an `HTMLTableElement`
     *
     * `perTableOptions` override globals for this table only.
     */
    set(
        target: string | HTMLTableElement,
        perTableOptions?: Partial<CollapseTable.Options>
    ): CollapseTable.Controller;

    /**
     * Attach responsive behavior to many tables at once.
     * Accepts a selector, a single `Element`, a `NodeList`/`HTMLCollection`,
     * or an array of `Element`s. Non-`<table>` elements are ignored.
     * Returns one controller per matched table.
     */
    setAll(
        targets: CollapseTable.Targets,
        perTableOptions?: Partial<CollapseTable.Options>
    ): CollapseTable.Controller[];

    /** Remove behavior and cleanup from one table (same targets as `set`). */
    unset(target: string | HTMLTableElement): void;

    /** Remove behavior and cleanup from many tables (same targets as `setAll`). */
    unsetAll(targets: CollapseTable.Targets): void;

    /**
     * Re-measure and refit columns.
     * If `target` is omitted, refreshes all attached tables.
     */
    refresh(target?: string | HTMLTableElement): void;

    /**
     * Expand details for all rows.
     * If `target` is omitted, expands on all attached tables.
     */
    expandAll(target?: string | HTMLTableElement): void;

    /**
     * Collapse details for all rows.
     * If `target` is omitted, collapses on all attached tables.
     */
    collapseAll(target?: string | HTMLTableElement): void;

    /**
     * Programmatically expand a single row on a specific table.
     * `rowOrIndex` can be a 0-based index (across all TBODY rows) or a `<tr>` element.
     */
    expandRow(
        target: string | HTMLTableElement,
        rowOrIndex: number | HTMLTableRowElement
    ): void;

    /**
     * Programmatically collapse a single row on a specific table.
     * `rowOrIndex` can be a 0-based index (across all TBODY rows) or a `<tr>` element.
     */
    collapseRow(
        target: string | HTMLTableElement,
        rowOrIndex: number | HTMLTableRowElement
    ): void;

    /** Get a clone of the current global options (includes current `mode`). */
    getOptions(): CollapseTable.Options;

    /**
     * Update global options and apply to all currently attached tables.
     * If `partial.mode` is provided it behaves like calling `setMode(...)`.
     */
    updateOptions(partial: Partial<CollapseTable.Options>): void;

    /**
     * Get the current runtime mode.
     * - `'production'` (default): no console warnings
     * - `'development'`: helpful integration warnings
     */
    getMode(): CollapseTable.Mode;

    /**
     * Change runtime mode at any time.
     * - `'production'` (default): no console warnings
     * - `'development'`: helpful integration warnings
     *
     * Example:
     * ```ts
     * const ct = new CollapseTable();
     * ct.setMode('development'); // show warnings during integration
     * ```
     */
    setMode(mode: CollapseTable.Mode): CollapseTable.Mode;

    /* ----------------
     * Events (strongly typed via EventsMap)
     * --------------*/
    on<K extends CollapseTable.Event>(
        event: K,
        handler: (e: CollapseTable.EventsMap[K]) => void
    ): void;

    off<K extends CollapseTable.Event>(
        event: K,
        handler: (e: CollapseTable.EventsMap[K]) => void
    ): void;

    /** Library version string (e.g., `"1.2.0"`). */
    static readonly version: string;
}

/* =====================================================================
 * Namespace with public types (for both CJS & global usage)
 * ===================================================================*/

declare namespace CollapseTable {
    /** Runtime mode controlling developer warnings and diagnostics. */
    type Mode = "development" | "production";

    /** Common target shapes accepted by setAll/unsetAll. */
    type Targets =
        | string
        | Element
        | NodeList
        | HTMLCollection
        | ReadonlyArray<Element>;

    /** Public options accepted globally and per-table. */
    interface Options {
        /** px reserved for the +/− control column (index 0). */
        controlWidth?: number;

        /** fallback min width (px) when a column has no data-min and cannot be measured. */
        minWidthDefault?: number;

        /** table layout applied inline: `"auto"` | `"fixed"`. */
        tableLayout?: "auto" | "fixed";

        /**
         * If true and the table/container is hidden (display:none / visibility:hidden),
         * defers precise refit until it becomes visible (uses viewport width meanwhile).
         */
        deferWhenHidden?: boolean;

        /** Attribute names read from `<th>` cells. */
        attrs?: {
            /** lower = more important; `1` is never hidden. */
            priority?: string;
            /** min width hint in px (e.g., `data-min="160"`). */
            min?: string;
            /** optional override for header text shown in details panel. */
            label?: string;
        };

        /** CSS class hooks used by the library (override to fit your design system). */
        classNames?: {
            /** applied to the target `<table>`. */
            root?: string;
            /** control column (`th`/`td`). */
            control?: string;
            /** per-row toggle `<button>`. */
            toggle?: string;
            /** details row `<tr>`. */
            details?: string;
            /** inner wrapper inside the details cell. */
            detailsInner?: string;
            /** container for each hidden column item. */
            detail?: string;
            /** label span inside a detail item. */
            name?: string;
            /** value span inside a detail item. */
            value?: string;
            /** applied to hidden `th`/`td`. */
            hide?: string;
        };

        /** Toggle icons (text or HTML). */
        icons?: { expand?: string; collapse?: string };

        /** UI strings (a11y & titles). */
        strings?: { toggleTitle?: string; show?: string; hide?: string };

        /**
         * Custom details renderer to override the default "Label: Value" layout.
         * Return a `Node` (appended), an HTML `string` (innerHTML), or `void` to use default rendering.
         * @param row           The data row (`<tr>`).
         * @param hiddenColumns Metadata for currently hidden columns (excludes control column at index 0).
         * @param cells         The cells of the data row (index 0 is the control cell).
         */
        detailsRender?: (
            row: HTMLTableRowElement,
            hiddenColumns: HiddenColumnMeta[],
            cells: HTMLTableCellElement[],
        ) => Node | string | void;

        /**
         * Runtime mode controlling developer warnings.
         * - `'production'` (default): quiet
         * - `'development'`: console warnings for misconfiguration (e.g., too many priority=1)
         */
        mode?: Mode;
    }

    /** Metadata for a hidden column passed to `detailsRender`. */
    interface HiddenColumnMeta {
        index: number;
        th: HTMLTableCellElement;
        priority: number;
        min: number;
        lock: boolean;
    }

    /** Event names emitted by the library. */
    type Event = "expand" | "collapse" | "toggle" | "refit" | "destroy";

    /** Base payload for all events. */
    interface BaseEventPayload {
        table: HTMLTableElement;
    }

    /** Payload for expand/collapse events. */
    interface RowEventPayload extends BaseEventPayload {
        row: HTMLTableRowElement;
    }

    /** Payload for toggle event. */
    interface ToggleEventPayload extends RowEventPayload {
        expanded: boolean;
    }

    /** Payload for refit event. */
    interface RefitEventPayload extends BaseEventPayload {
        /** true on the first layout pass after initialization. */
        initial: boolean;
        /** whether any non-control columns are hidden. */
        anyHidden: boolean;
    }

    /** Strongly typed mapping from event name to payload. */
    interface EventsMap {
        expand: RowEventPayload;
        collapse: RowEventPayload;
        toggle: ToggleEventPayload;
        refit: RefitEventPayload;
        destroy: BaseEventPayload;
    }

    /**
     * Controller returned by `set()` and contained within `setAll()` results.
     * Lets you operate on a specific attached table instance.
     */
    interface Controller {
        /** The table this controller manages. */
        readonly table: HTMLTableElement;

        /** Expand all rows (only has an effect if some columns are hidden). */
        expandAll(): void;

        /** Collapse all rows. */
        collapseAll(): void;

        /**
         * Expand a single row by index (0-based across all TBODY rows) or by passing the `<tr>`.
         * No-op if already expanded or if nothing is hidden.
         */
        expandRow(rowOrIndex: number | HTMLTableRowElement): void;

        /** Collapse a single row by index or `<tr>` (no-op if already collapsed). */
        collapseRow(rowOrIndex: number | HTMLTableRowElement): void;

        /** Re-measure column widths and recompute the fit. */
        refresh(): void;

        /** Completely remove behavior, observers, and injected UI from this table. */
        destroy(): void;
    }
}

/* =====================================================================
 * Export patterns for UMD:
 *  - CommonJS/Node:   const CollapseTable = require('@codeseasy/collapsetable')
 *  - ESM (tsconfig: esModuleInterop / allowSyntheticDefaultImports):
 *      import CollapseTable from '@codeseasy/collapsetable'
 *  - Script tag global: window.CollapseTable (typed via export-as-namespace)
 * ===================================================================*/

export = CollapseTable;
export as namespace CollapseTable;
