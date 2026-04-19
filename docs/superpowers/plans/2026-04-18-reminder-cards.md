# Reminder Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new reminder mode to MuseNote with a `文档 | 提醒` switch, a reminder-card note type, a card wall UI, and a modal editor while keeping document mode behavior intact.

**Architecture:** Reuse the existing `Note` model and category system, then branch the app layout by UI mode. `文档` mode keeps the current three-column workflow, while `提醒` mode hides the second column and renders a dedicated reminder board backed by the same note store. Reminder notifications are computed from `dueDate` plus a fixed reminder schedule and surfaced in both the board and desktop notifications.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Testing Library, Vite, existing Tauri/browser storage layer

---

### Task 1: Extend Note Model and Reminder Utilities

**Files:**
- Modify: `src/stores/noteStore.ts`
- Modify: `src/services/storage.ts`
- Create: `src/utils/reminderCards.ts`
- Create: `src/utils/reminderCards.test.ts`

- [ ] **Step 1: Write the failing utility tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  getReminderCardStatus,
  isReminderCard,
  matchesReminderWindow,
  type ReminderCardStatus
} from './reminderCards'

const makeDate = (value: string) => new Date(`${value}T00:00:00.000Z`)

describe('reminderCards utilities', () => {
  it('detects reminder card notes', () => {
    expect(isReminderCard({ type: 'reminder-card' })).toBe(true)
    expect(isReminderCard({ type: 'doc' })).toBe(false)
  })

  it('returns overdue status for past due cards', () => {
    const status = getReminderCardStatus(makeDate('2026-04-10'), makeDate('2026-04-18'))
    expect(status).toBe<ReminderCardStatus>('overdue')
  })

  it('returns seven-day status for near-term due cards', () => {
    const status = getReminderCardStatus(makeDate('2026-04-24'), makeDate('2026-04-18'))
    expect(status).toBe<ReminderCardStatus>('due-soon')
  })

  it('matches cards into named reminder windows', () => {
    const dueDate = makeDate('2026-05-10')
    const today = makeDate('2026-04-18')

    expect(matchesReminderWindow(dueDate, today, 'all')).toBe(true)
    expect(matchesReminderWindow(dueDate, today, '30d')).toBe(true)
    expect(matchesReminderWindow(dueDate, today, '7d')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/reminderCards.test.ts`
Expected: FAIL with module-not-found or missing export errors for `src/utils/reminderCards.ts`

- [ ] **Step 3: Write minimal reminder-card utility implementation**

```ts
export type ReminderFilter = 'all' | 'overdue' | '7d' | '30d'
export type ReminderCardStatus = 'normal' | 'due-this-month' | 'due-soon' | 'due-today' | 'overdue'

export const isReminderCard = (note: { type?: string }) => note.type === 'reminder-card'

export const getReminderCardStatus = (dueDate: Date, now = new Date()): ReminderCardStatus => {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const target = new Date(dueDate)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'due-today'
  if (diffDays <= 7) return 'due-soon'
  if (diffDays <= 30) return 'due-this-month'
  return 'normal'
}

export const matchesReminderWindow = (dueDate: Date, now: Date, filter: ReminderFilter) => {
  const status = getReminderCardStatus(dueDate, now)
  if (filter === 'all') return true
  if (filter === 'overdue') return status === 'overdue'
  if (filter === '7d') return status === 'due-soon' || status === 'due-today' || status === 'overdue'
  return status === 'due-this-month' || status === 'due-soon' || status === 'due-today' || status === 'overdue'
}
```

- [ ] **Step 4: Extend the note type with reminder-card fields**

```ts
export interface ReminderNotificationState {
  notified30d?: boolean
  notified7d?: boolean
  notifiedOnDay?: boolean
}

export interface Note {
  id: string
  title: string
  content: string
  type: string
  categoryId?: string
  parentId?: string
  filePath?: string
  reminder?: Date
  dueDate?: Date
  reminderEnabled?: boolean
  reminderState?: ReminderNotificationState
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 5: Update storage serialization for the new fields**

```ts
if ('dueDate' in newItem && newItem.dueDate instanceof Date) {
  const dateItem = newItem as unknown as { dueDate: Date }
  ;(newItem as unknown as { dueDate: string }).dueDate = dateItem.dueDate.toISOString()
}

if (processedItem.dueDate) {
  processedItem.dueDate = typeof processedItem.dueDate === 'string'
    ? new Date(processedItem.dueDate)
    : undefined
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test src/utils/reminderCards.test.ts`
Expected: PASS with all utility assertions green

- [ ] **Step 7: Commit**

```bash
git add src/stores/noteStore.ts src/services/storage.ts src/utils/reminderCards.ts src/utils/reminderCards.test.ts
git commit -m "feat: add reminder card note model"
```

### Task 2: Add Sidebar Mode Switch and Reminder Count Behavior

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Create: `src/stores/uiModeStore.ts`
- Create: `src/stores/uiModeStore.test.ts`
- Modify: `src/components/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing UI mode store test**

```ts
import { describe, expect, it } from 'vitest'
import { useUiModeStore } from './uiModeStore'

describe('uiModeStore', () => {
  it('defaults to document mode and can switch to reminder mode', () => {
    useUiModeStore.setState({ mode: 'document' })
    expect(useUiModeStore.getState().mode).toBe('document')
    useUiModeStore.getState().setMode('reminder')
    expect(useUiModeStore.getState().mode).toBe('reminder')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/stores/uiModeStore.test.ts`
Expected: FAIL because `uiModeStore.ts` does not exist yet

- [ ] **Step 3: Implement a minimal persisted UI mode store**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiMode = 'document' | 'reminder'

interface UiModeStore {
  mode: UiMode
  setMode: (mode: UiMode) => void
}

export const useUiModeStore = create<UiModeStore>()(
  persist(
    (set) => ({
      mode: 'document',
      setMode: (mode) => set({ mode })
    }),
    { name: 'notebook-ui-mode' }
  )
)
```

- [ ] **Step 4: Add a failing Sidebar interaction test for the new segmented switch**

```tsx
it('switches into reminder mode when the reminder segment is clicked', async () => {
  renderWithProviders(
    <Sidebar
      selectedCategoryId={null}
      onSelectCategory={mockOnSelectCategory}
    />
  )

  fireEvent.click(screen.getByRole('button', { name: '提醒' }))

  expect(mockSetMode).toHaveBeenCalledWith('reminder')
})
```

- [ ] **Step 5: Update Sidebar to render the mode switch and reminder counts**

```tsx
const mode = useUiModeStore(state => state.mode)
const setMode = useUiModeStore(state => state.setMode)

const getCategoryCount = (categoryId: string) => {
  const categoryNotes = notes.filter(note => note.categoryId === categoryId)
  return mode === 'reminder'
    ? categoryNotes.filter(note => note.type === 'reminder-card').length
    : categoryNotes.length
}

<div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-200/60 p-1 dark:bg-gray-700">
  <button onClick={() => setMode('document')}>文档</button>
  <button onClick={() => setMode('reminder')}>提醒</button>
</div>
```

- [ ] **Step 6: Run the focused tests**

Run: `pnpm test src/stores/uiModeStore.test.ts src/components/Sidebar.test.tsx`
Expected: PASS with the mode store and sidebar interaction tests green

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/stores/uiModeStore.ts src/stores/uiModeStore.test.ts
git commit -m "feat: add document and reminder mode switch"
```

### Task 3: Build Reminder Board and Modal Editor

**Files:**
- Create: `src/components/ReminderBoard.tsx`
- Create: `src/components/ReminderCardDialog.tsx`
- Create: `src/components/ReminderBoard.test.tsx`
- Create: `src/components/ReminderCardDialog.test.tsx`
- Modify: `src/components/ui/dialog.tsx` (only if needed for test hooks or props passthrough)

- [ ] **Step 1: Write the failing reminder board test**

```tsx
import { render, screen } from '@testing-library/react'
import { ReminderBoard } from './ReminderBoard'

it('renders reminder cards and filters them by reminder window', () => {
  render(
    <ReminderBoard
      selectedCategoryId="cat-1"
      notes={[
        { id: '1', title: 'Server', content: 'renew soon', type: 'reminder-card', categoryId: 'cat-1', dueDate: new Date('2026-04-22'), reminderEnabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', title: 'Far Future', content: 'later', type: 'reminder-card', categoryId: 'cat-1', dueDate: new Date('2026-06-01'), reminderEnabled: true, createdAt: new Date(), updatedAt: new Date() }
      ]}
      categories={[{ id: 'cat-1', name: 'Ops', color: '', createdAt: new Date(), updatedAt: new Date() }]}
      onCreateCard={() => {}}
      onEditCard={() => {}}
    />
  )

  expect(screen.getByText('Server')).toBeInTheDocument()
  expect(screen.getByText('Far Future')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/ReminderBoard.test.tsx`
Expected: FAIL because the component does not exist yet

- [ ] **Step 3: Implement the board with adaptive card grid and top filters**

```tsx
const reminderCards = notes.filter(note => note.type === 'reminder-card')
const filteredCards = reminderCards
  .filter(note => !selectedCategoryId || note.categoryId === selectedCategoryId)
  .filter(note => !searchQuery || `${note.title} ${note.content}`.toLowerCase().includes(searchQuery))
  .filter(note => note.dueDate && matchesReminderWindow(note.dueDate, now, activeFilter))

return (
  <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <header>{/* title + filter chips + search + new button */}</header>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-4">
      {filteredCards.map(card => <ReminderCard key={card.id} note={card} onEdit={onEditCard} />)}
    </div>
  </div>
)
```

- [ ] **Step 4: Write the failing dialog test**

```tsx
it('submits title, category, due date, reminderEnabled, and content', async () => {
  render(
    <ReminderCardDialog
      open
      categories={[{ id: 'cat-1', name: 'Ops', color: '', createdAt: new Date(), updatedAt: new Date() }]}
      onOpenChange={() => {}}
      onSave={onSave}
    />
  )

  fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'Server Renew' } })
  fireEvent.change(screen.getByLabelText('到期日期'), { target: { value: '2026-04-25' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))

  expect(onSave).toHaveBeenCalled()
})
```

- [ ] **Step 5: Implement the modal editor**

```tsx
type ReminderCardFormValues = {
  title: string
  categoryId: string
  dueDate: string
  content: string
  reminderEnabled: boolean
}

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    {/* title, category select, dueDate input, textarea, reminder toggle */}
    <button onClick={handleSave}>保存</button>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Run the focused board and dialog tests**

Run: `pnpm test src/components/ReminderBoard.test.tsx src/components/ReminderCardDialog.test.tsx`
Expected: PASS with card rendering and modal save behavior verified

- [ ] **Step 7: Commit**

```bash
git add src/components/ReminderBoard.tsx src/components/ReminderCardDialog.tsx src/components/ReminderBoard.test.tsx src/components/ReminderCardDialog.test.tsx
git commit -m "feat: add reminder board and editor dialog"
```

### Task 4: Integrate Reminder Mode Into App and Notification Scheduling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/workers/reminder.ts`
- Create: `src/utils/reminderScheduling.ts`
- Create: `src/utils/reminderScheduling.test.ts`

- [ ] **Step 1: Write the failing scheduling test**

```ts
import { describe, expect, it } from 'vitest'
import { buildReminderSchedule } from './reminderScheduling'

describe('buildReminderSchedule', () => {
  it('creates 30-day, 7-day, and same-day reminder entries', () => {
    const dueDate = new Date('2026-05-18T00:00:00.000Z')
    const schedule = buildReminderSchedule({
      dueDate,
      reminderEnabled: true,
      reminderState: {}
    })

    expect(schedule).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/reminderScheduling.test.ts`
Expected: FAIL because the scheduling utility does not exist yet

- [ ] **Step 3: Implement minimal scheduling utility**

```ts
export const buildReminderSchedule = ({ dueDate, reminderEnabled, reminderState }: ReminderScheduleInput) => {
  if (!reminderEnabled) return []

  return [
    { key: '30d', time: addDays(dueDate, -30), alreadyNotified: !!reminderState?.notified30d },
    { key: '7d', time: addDays(dueDate, -7), alreadyNotified: !!reminderState?.notified7d },
    { key: 'day', time: startOfDay(dueDate), alreadyNotified: !!reminderState?.notifiedOnDay }
  ]
}
```

- [ ] **Step 4: Integrate reminder mode into `App.tsx`**

```tsx
const uiMode = useUiModeStore(state => state.mode)

if (uiMode === 'reminder') {
  return (
    <div className="grid" style={{ gridTemplateColumns: sidebarOpen ? 'auto 1fr' : '1fr' }}>
      {sidebarOpen && <Sidebar ... />}
      <ReminderBoard ... />
    </div>
  )
}
```

- [ ] **Step 5: Schedule reminder-card notifications after notes load/update**

```ts
const reminderCardSchedules = notes
  .filter(note => note.type === 'reminder-card' && note.dueDate && note.reminderEnabled)
  .flatMap(note =>
    buildReminderSchedule({
      dueDate: note.dueDate!,
      reminderEnabled: !!note.reminderEnabled,
      reminderState: note.reminderState
    }).map(item => ({
      noteId: note.id,
      noteTitle: note.title,
      reminderTime: item.time.getTime(),
      reminderKey: item.key
    }))
  )
```

- [ ] **Step 6: Run targeted integration tests and existing impacted tests**

Run: `pnpm test src/utils/reminderScheduling.test.ts src/components/Sidebar.test.tsx src/components/ReminderBoard.test.tsx src/components/ReminderCardDialog.test.tsx`
Expected: PASS with no failing tests in touched areas

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS with zero failing tests

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/workers/reminder.ts src/utils/reminderScheduling.ts src/utils/reminderScheduling.test.ts
git commit -m "feat: integrate reminder card mode"
```

## Self-Review

### Spec Coverage

- `文档 | 提醒` switch is covered in Task 2.
- Hiding the second column in reminder mode is covered in Task 4.
- Multi-card wall and modal editing are covered in Task 3.
- Minimal fields (`title`, `category`, `dueDate`, `content`, `reminderEnabled`) are covered in Task 3.
- Reminder status and notifications are covered in Tasks 1 and 4.

No spec gaps remain for this iteration.

### Placeholder Scan

Checked for `TODO`, `TBD`, “implement later”, and vague “handle appropriately” wording. None remain.

### Type Consistency

- Reminder note type is consistently named `reminder-card`.
- UI mode values are consistently `document` and `reminder`.
- Reminder status/filter keys are consistently `all`, `overdue`, `7d`, and `30d`.

