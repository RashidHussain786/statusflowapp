# Weekly Report Feature - Technical Plan

## Overview

This document outlines the technical plan for implementing the "Weekly Report" feature, incorporating mandatory status tags, stable item tracking with `itemId`s, application-wise reports with a "latest day's truth" baseline, and flexible tag ordering. The design prioritizes client-side operations, utilizes existing URL payload mechanisms as the source of truth, integrates IndexedDB for continuity and caching, and ensures backward compatibility with existing data structures.

## Core Principles

*   **URL as Source of Truth**: The encoded URL fragment remains the primary, portable, and durable source of status data.
*   **IndexedDB as Cache/Continuity**: IndexedDB will store *snapshots* of `StatusPayload`s for features like "Continue yesterday," quick loading, and offline access, acting as a performance and convenience layer, not a replacement for the URL.
*   **Backward Compatibility**: The existing `StatusPayload` structure (with `AppStatus.content` as an HTML string) will be preserved. `itemId`s will be embedded directly into this HTML.
*   **All List Items**: Both unordered (`<ul>`) and ordered (`<ol>`) list items (`<li>`) will receive `itemId`s.
*   **Tag Labels Only in Payload**: Only tag labels will be stored in `BulletItem.tags` within the HTML; full tag definitions (including colors) are managed via `StatusPayload.customTags` or hardcoded `STATUS_TAGS`.

## Overall Feasibility

The proposed weekly report feature is **feasible**. The project's existing TipTap integration, robust tag management, and adaptable URL encoding/decoding provide a strong foundation. The primary work involves integrating `itemId` with TipTap, parsing its HTML output, and developing the complex report generation and data aggregation logic from multiple sources.

## Architectural Design & Data Types

The data structures are designed to ensure backward compatibility while enabling structured reporting.

### 1. Core Data Structures (`src/lib/types.ts`)

*   **`BulletItem` Type (New - *for internal processing only*)**: This type is an internal abstraction used by the report generation algorithm, *not* directly stored in `StatusPayload`.
    ```typescript
    export type BulletItem = {
      id: string;        // Mandatory: A short unique ID (using nanoid(9)) for stable item tracking (itemId)
      tags: string[];    // Array of tag *labels* extracted from the item's text (e.g., ['WIP', 'ENH'])
      text: string;      // The actual text content of the list item (plain text)
      rawHtml: string;   // The original HTML content of the <li> tag (including the li tag itself and its data-id)
    };
    ```
    *Justification*: While `AppStatus.content` remains an HTML string, programmatic report generation requires a structured, granular representation of each list item. `BulletItem` provides this bridge.

*   **`AppStatus` Type (UNCHANGED from current)**:
    ```typescript
    export type AppStatus = {
      id?: string | number;
      app: string;
      content: string; // Remains the HTML string output from TipTap
    };
    ```
    *Reasoning*: Critical for backward compatibility with existing URL encoding/decoding and splitting logic.

*   **`StatusPayload` Type (UNCHANGED from current)**:
    ```typescript
    export type StatusPayload = {
      v: 1 | 2; // schema version
      name: string;
      date: string;
      apps: AppStatus[];
      customTags?: import('./tags').StatusTag[]; // Crucial for custom tag definitions
    };
    ```
    *Reasoning*: Maintains backward compatibility. `customTags` will carry the definitions (including colors) for user-defined tags.

### 2. TipTap Integration for `itemId`

*   **Goal**: Ensure every `<li>` (from both `<ul>` and `<ol>`) automatically includes a unique `data-id` attribute.
*   **Approach**: Create a custom TipTap extension (`src/lib/tiptap-list-item-id-extension.ts`) targeting the `listItem` node (common to both bullet and ordered lists).
    *   **Schema Modification**: Extend the `listItem` node schema to include a `data-id` attribute, serialized to HTML.
    *   **ProseMirror Plugin/NodeView**:
        *   Automatically generate a short, unique ID (using `nanoid(9)`) for new `listItem`s, assigning it to `data-id`.
        *   Normalize existing `<li>` elements loaded into the editor by adding `data-id` if missing (for older content).
        *   Ensure `data-id`s are preserved across editor operations.
*   **Location**: `src/lib/tiptap-list-item-id-extension.ts`.

### 3. HTML to Structured Data Conversion (Parsing `AppStatus.content`)

*   **Goal**: Extract `BulletItem`s from the raw HTML content stored in `AppStatus.content`.
*   **Approach**: A new utility function (`src/lib/status-parser.ts`) will:
    1.  Parse the HTML string using `DOMParser`.
    2.  Query for all `<li>` elements within `<ul>` or `<ol>`.
    3.  For each `<li>`:
        *   Extract `data-id` (generate a transient one if missing for old content).
        *   Extract `outerHTML` (for `rawHtml`).
        *   Extract `textContent` (for `text`).
        *   Identify tag *labels* (`[TAG_LABEL]`) within `textContent`.
        *   Construct a `BulletItem` object.
*   **Output**: `BulletItem[]`.
*   **Location**: `src/lib/status-parser.ts`.

### 4. URL Encoding/Decoding (`src/lib/encoding.ts`)

*   **`encodeStatus` / `decodeStatus`**: These functions remain unchanged as `AppStatus.content` continues to be a string. The `data-id` attributes are part of this string.
*   **`splitHtmlContent` (CRITICAL REVISION NEEDED)**: This function is the most complex point.
    *   **Challenge**: Currently splits arbitrary HTML; splitting an `<li>` element breaks its structure and `data-id`.
    *   **Solution**: **Must be rewritten** to be `<li>`-aware. It should:
        *   Parse the input HTML.
        *   Identify `<ul>`, `<ol>`, and `<li>` elements.
        *   Prioritize splitting *between* `<ul>`/`<ol>` blocks or *between individual `<li>` elements*.
        *   Each generated HTML chunk (for a URL part) must be a *valid HTML fragment* containing complete `<li>` elements with their `data-id`s intact. This will involve careful HTML re-wrapping.
*   **Custom Tags**: The `customTags` array within `StatusPayload` ensures custom tag definitions (including colors) are transmitted for consistent rendering.

---

## New Component: IndexedDB Integration (`src/lib/indexeddb.ts`)

*   **Purpose**: To provide a caching and continuity layer for `StatusPayload` objects, supporting features like "Continue yesterday" and quick loading.
*   **Technology**: Recommend `Dexie.js` or `localforage`.
*   **Schema**:
    *   Database: e.g., `statusGeneratorDB`.
    *   Object Store: e.g., `dailyPayloads`.
    *   Key: `[date, appName, sourceIdentifier]` (e.g., `['2026-01-15', 'My Project', 'user-alice-urlhash']`)
        *   `date`: Date of the status (YYYY-MM-DD).
        *   `appName`: The application name.
        *   `sourceIdentifier`: A unique string to differentiate payloads from various sources (e.g., a hash of the original URL, a user ID, or a combination of `payload.name` and `payload.date`).
    *   Value: The full `StatusPayload` object.
*   **Functions**:
    *   `savePayloadSnapshot(payload: StatusPayload, sourceIdentifier: string)`
    *   `loadPayloadSnapshots(date: string, appName: string)`
    *   `loadPayloadSnapshotsForWeek(startDate: string, endDate: string, appName: string)`
    *   `getLatestPayloadForApp(appName: string)`

---

## Revised Algorithm for Weekly Report Generation

This algorithm processes `StatusPayload`s from both URL decoding and IndexedDB, consolidating them before generating the report.

**Input**:
*   A primary collection of `StatusPayload` objects (from user-input URLs).
*   *Optionally*, a secondary collection of `StatusPayload` objects from IndexedDB (for a historical week).
*   Selected `appName`, `weekRange` (`startDate`, `endDate`).

**Output**: A structured report.

**Steps:**

1.  **Collect and Consolidate `StatusPayload`s for the Week**:
    *   Initialize `allWeekPayloads: Map<string, StatusPayload>` (key: `date_appName_sourceIdentifier`).
    *   **Process input URLs**: Decode each URL, generate `sourceIdentifier`, and add to `allWeekPayloads`.
    *   **Process IndexedDB data (if applicable)**: Load relevant `StatusPayload`s using `loadPayloadSnapshotsForWeek`, generate `sourceIdentifier`s, and add to `allWeekPayloads`.
    *   **Consolidation Rule**: If a `StatusPayload` from a URL has the *exact same key* (`date_appName_sourceIdentifier`) as one from IndexedDB, the URL-derived one *takes precedence* (overwriting the IndexedDB entry in `allWeekPayloads`), reflecting its "live" status.

2.  **Parse and Aggregate `BulletItem`s and Custom Tag Definitions**:
    *   Initialize `allItemsByItemIdAndDate: Map<string, Map<string, BulletItem[]>>`. (Outer key: `itemId`; inner key: `date`; value: array of `BulletItem`s from multiple sources on that day).
    *   Initialize `mergedCustomTags: Map<string, StatusTag>`.
    *   **Iterate through `allWeekPayloads.values()`**:
        *   Extract `date` and `customTags`. Merge `customTags` into `mergedCustomTags` (deduplicating by `id`).
        *   For each `AppStatus` within the payload (matching `appName`):
            *   Use `src/lib/status-parser.ts` to convert `AppStatus.content` (HTML) into `BulletItem[]`.
            *   For each `bulletItem`: Add to `allItemsByItemIdAndDate[bulletItem.id][date]`.

3.  **Determine Latest Day's Baseline**:
    *   Identify `latestDate` within `weekRange` that has `BulletItem`s in `allItemsByItemIdAndDate`.
    *   Initialize `baselineItems: Map<string, BulletItem>`.
    *   For each `itemId` in `allItemsByItemIdAndDate`:
        *   If `allItemsByItemIdAndDate[itemId][latestDate]` exists:
            *   **Conflict Resolution**: If multiple `BulletItem`s exist for `itemId` on `latestDate` (from different sources), select one deterministically (e.g., from the `StatusPayload` that was consolidated into `allWeekPayloads` last).
            *   Add the resolved `BulletItem` to `baselineItems`.

4.  **Construct Full Item History (`itemId` Centric)**:
    *   Create `itemHistories: Map<string, Array<{date: string, item: BulletItem}>>`.
    *   For each `itemId` in `allItemsByItemIdAndDate`:
        *   Collect all `BulletItem`s across all dates, applying the same conflict resolution for items on the same date.
        *   Sort chronologically by date.

5.  **Identify Deployed, Dropped, and Edited Items**:
    *   Initialize `deployedItemIds: Set<string>`, `droppedItemIds: Set<string>`, `editedItems: Map<string, { firstText: string, latestText: string }>`.
    *   **Process `itemHistories`**:
        *   For each `itemId` and its `history`:
            *   **Deployed**: Check if any `BulletItem` in `history` has a "deployed" tag (using `mergedCustomTags` and `STATUS_TAGS`).
            *   **Dropped**: If `itemId` is *not* found in `baselineItems`.
            *   **Edited**: Compare `text` of the first and last `BulletItem`s in `history`.

6.  **Generate Report Structure**:
    *   Dynamic Grouping by Tags (using all available tag definitions).
    *   Flexible Ordering based on configuration.
    *   Item Progress display.
    *   Separate lists for deployed/dropped items.

7.  **Output Generation (Flexible)**: Produce a structured intermediate data format for UI rendering.

---

## Summary of New/Modified Files & Components

*   **Modified**:
    *   `src/lib/types.ts`: Add `BulletItem` type for internal use. `AppStatus` and `StatusPayload` are unchanged.
    *   `src/lib/encoding.ts`: **`splitHtmlContent` requires significant and complex revision** to ensure `<li>` elements and their `data-id` attributes are never broken across URL parts.
    *   `src/components/rich-text-editor.tsx`: Will need to integrate the new `tiptap-list-item-id-extension`.
*   **New**:
    *   `src/lib/tiptap-list-item-id-extension.ts`: Custom TipTap extension for managing `data-id` on all `<li>` elements (bullet and ordered).
    *   `src/lib/status-parser.ts`: Utility for parsing `AppStatus.content` (HTML) into `BulletItem[]`.
    *   `src/lib/indexeddb.ts`: IndexedDB wrapper for `StatusPayload` caching.
    *   `src/lib/report-aggregator.ts`: Contains the core logic for the weekly report algorithm.
    *   `src/app/weekly-report/page.tsx` (or similar): UI for URL input, app/week selection, and report display.
    *   `src/hooks/use-status-management.ts` (or similar): A new hook/utility to orchestrate saving to URL, saving to IndexedDB, and loading from both.

This plan addresses all your critical points, providing a robust and resilient architecture for the Weekly Report feature.