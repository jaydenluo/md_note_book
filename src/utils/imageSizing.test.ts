import { describe, expect, it } from 'vitest'
import { getResponsiveImageStyle } from './imageSizing'

describe('getResponsiveImageStyle', () => {
  it('keeps height auto when stored width and height are both present', () => {
    const style = getResponsiveImageStyle({
      width: 800,
      height: 600,
      size: 'medium',
    })

    expect(style).toEqual({
      width: '800px',
      height: 'auto',
      aspectRatio: '800 / 600',
    })
  })

  it('uses intrinsic dimensions to preserve ratio for preset sizes', () => {
    const style = getResponsiveImageStyle({
      width: null,
      height: null,
      intrinsicWidth: 1600,
      intrinsicHeight: 900,
      size: 'medium',
    })

    expect(style).toEqual({
      width: '420px',
      height: 'auto',
      aspectRatio: '1600 / 900',
    })
  })
})
