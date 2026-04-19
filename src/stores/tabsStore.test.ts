import { beforeEach, describe, expect, it } from 'vitest'
import { useTabs } from './tabsStore'

describe('tabsStore', () => {
  beforeEach(() => {
    useTabs.setState({ tabs: [], activeTabId: null })
  })

  it('keeps at most 10 open tabs and evicts the oldest when opening the 11th', () => {
    for (let index = 1; index <= 11; index += 1) {
      useTabs.getState().addTab(`note-${index}`, `Note ${index}`)
    }

    const { tabs, activeTabId } = useTabs.getState()

    expect(tabs).toHaveLength(10)
    expect(tabs.some((tab) => tab.noteId === 'note-1')).toBe(false)
    expect(tabs[0].noteId).toBe('note-2')
    expect(activeTabId).toBe(tabs[tabs.length - 1].id)
  })
})
