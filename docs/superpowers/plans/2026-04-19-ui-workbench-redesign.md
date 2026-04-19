# UI Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved `Calm Workbench` redesign for Muse Note without changing core note/reminder behavior.

**Spec:** `docs/superpowers/specs/2026-04-19-ui-workbench-redesign.md`

**Architecture:** Keep the current application structure and state model intact. Refresh the UI in layers: shell, sidebar, note list, content area, reminder mode, then mobile polish and regression checks.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, Framer Motion, Vitest, Testing Library, Vite

---

### Task 1: Establish Visual Foundation and App Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Optional cleanup: `src/App.css`

- [ ] **Step 1: Align the desktop shell to the approved workbench structure**

Update the top-level layout so the app reads as a unified desktop workspace:

- desktop background becomes a soft gradient / atmospheric surface
- shell gains panel spacing rather than hard edge-to-edge dividers
- three-column layout remains intact in document mode
- reminder mode still hides the middle column

- [ ] **Step 2: Replace legacy “flat page” visual treatment with panel containers**

Apply a shared panel language:

- rounded outer containers
- subtle borders
- restrained shadows
- light blur / glass treatment where appropriate

- [ ] **Step 3: Make global tokens friendlier for long-form desktop use**

Update global CSS for:

- font stack
- background handling
- scrollbar color polish
- text selection color
- dark/light color-scheme support

- [ ] **Step 4: Verify there is no leftover Vite starter shell behavior**

Check whether `src/App.css` still contributes any obsolete root constraints or starter styles. Remove or neutralize only if still active.

- [ ] **Step 5: Validate shell integrity**

Run:

```bash
pnpm build
```

Expected:

- app builds cleanly
- no JSX/layout syntax regressions

---

### Task 2: Redesign the Left Sidebar as a Navigation Panel

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Optional test updates: `src/components/Sidebar.test.tsx`

- [ ] **Step 1: Upgrade the sidebar header into a real workspace header**

Add or refine:

- brand block
- concise secondary label
- improved search field treatment
- clearer visual separation between header and category area

- [ ] **Step 2: Restyle the document / reminder mode switch**

Requirements:

- looks like a first-class workspace control
- selected state is immediately obvious
- shares color semantics with the rest of the redesign

- [ ] **Step 3: Turn categories into navigation items instead of plain rows**

Requirements:

- stronger selected-state treatment
- better spacing
- better icon anchoring
- count badge remains visible and readable
- destructive action still hides until hover where possible

- [ ] **Step 4: Improve creation and edit affordances**

Update:

- create-category button
- inline create form
- inline rename input
- bottom utility actions (git, sync, theme, settings)

- [ ] **Step 5: Add a compact sidebar summary block**

Include a small current-view summary such as:

- document count
- reminder count
- category count

- [ ] **Step 6: Run focused regression checks**

If a sidebar test exists, run it. If no matching test exists, verify manually:

- mode switching still works
- category selection still works
- category rename/delete still works

---

### Task 3: Redesign the Middle Note List as a Locator Panel

**Files:**
- Modify: `src/App.tsx`
- Existing tests: `src/App.note-list-context-menu.test.tsx`

- [ ] **Step 1: Replace the old flat list header with a richer locator header**

The note-list header should communicate:

- current workspace / category
- folder + note counts
- actions for new document / new folder
- sidebar toggle

- [ ] **Step 2: Convert folder sections into grouped visual blocks**

Requirements:

- folders read as scan-friendly grouped units
- nested notes remain lightweight
- folder expand/collapse behavior is preserved

- [ ] **Step 3: Give root documents their own section**

Do not leave root-level documents visually mixed into folder blocks.

- [ ] **Step 4: Improve drag-and-drop target states**

Requirements:

- root drop target becomes visually explicit
- hovered folder drop state is easier to detect
- no behavior regressions in actual drop handling

- [ ] **Step 5: Replace the old placeholder/advert slot with a meaningful utility block**

The bottom area should now support:

- orientation
- organization hint
- optional metrics / compact summary

- [ ] **Step 6: Re-run the existing note-list context menu regression**

Run:

```bash
pnpm vitest run src/App.note-list-context-menu.test.tsx
```

Expected:

- right-click empty-area flow still passes

---

### Task 4: Redesign the Right Content Area and Tab System

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TabManager.tsx`
- Optional touch-up: `src/components/NoteTab.tsx`

- [ ] **Step 1: Make the right side feel like one continuous work surface**

Requirements:

- tab bar and content area visually belong together
- editor container sits inside a stable work frame
- no “three unrelated boxes” feeling

- [ ] **Step 2: Redesign the tab bar**

Requirements:

- active tab is strongly legible
- inactive tabs are quieter
- close buttons remain easy to target
- overflow handling still works
- close-all action remains available but visually secondary

- [ ] **Step 3: Upgrade the empty state**

Requirements:

- more intentional visual hierarchy
- clear primary action
- feels like a finished product, not a placeholder

- [ ] **Step 4: Preserve all tab-limit and save-before-close behavior**

Do not change logic; only adjust presentation unless a bug is discovered.

- [ ] **Step 5: Run the existing tab regression**

Run:

```bash
pnpm vitest run src/App.tab-limit.test.tsx
```

Expected:

- existing save-before-open-11th-tab behavior remains green

---

### Task 5: Bring Reminder Mode into the Same Visual Language

**Files:**
- Modify: `src/components/ReminderBoard.tsx`
- Optional related dialog polish: `src/components/ReminderCardDialog.tsx`

- [ ] **Step 1: Review reminder mode against the new shell**

Reminder mode should continue to:

- keep the left sidebar
- hide the middle panel
- use the right side as the main work surface

- [ ] **Step 2: Align reminder board controls with the workbench system**

Update:

- heading area
- filters
- search box
- primary create action

- [ ] **Step 3: Keep reminder cards expressive but not visually disconnected**

Requirements:

- cards can remain card-based because the card is the interaction
- colors stay status-driven, not decorative
- spacing and border language should match the redesigned shell

- [ ] **Step 4: Ensure reminder mode still feels like the same app**

Avoid making reminder mode feel like an entirely separate product.

- [ ] **Step 5: Run targeted reminder checks if available**

If reminder-board tests exist, run them; otherwise manually verify:

- filter tabs
- search
- open-edit flow
- create-card CTA

---

### Task 6: Mobile Polish and Responsive Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Reconcile the new visual shell with mobile layout**

Requirements:

- mobile sidebar drawer still works
- selected note view remains usable
- new panel rounding / spacing does not create clipping issues

- [ ] **Step 2: Ensure the redesigned shell does not break small screens**

Verify:

- 375px width
- narrow tablet width
- desktop width

- [ ] **Step 3: Check touch targets after the redesign**

Focus on:

- sidebar open/close
- note/folder actions
- tabs
- reminder mode actions

---

### Task 7: Final Validation and Cleanup

**Files:**
- Review changed files only

- [ ] **Step 1: Run build**

```bash
pnpm build
```

- [ ] **Step 2: Run the key regression tests**

```bash
pnpm vitest run src/App.note-list-context-menu.test.tsx src/App.tab-limit.test.tsx
```

- [ ] **Step 3: Perform a visual smoke review**

Check:

- document mode desktop
- reminder mode desktop
- empty state
- active tabs / many tabs
- mobile sidebar drawer

- [ ] **Step 4: Confirm non-goals were respected**

Ensure this redesign did **not** accidentally change:

- storage model
- note creation logic
- reminder scheduling logic
- editor feature set
- category data rules

---

## Done Criteria

This plan is complete when:

- the shell matches the approved `Calm Workbench` direction
- desktop document mode feels clearly improved
- reminder mode visually belongs to the same product
- mobile still works
- `pnpm build` passes
- key app regressions still pass
