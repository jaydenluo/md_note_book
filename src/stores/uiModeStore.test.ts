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
