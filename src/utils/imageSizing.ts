interface ResponsiveImageStyleInput {
  width: number | null
  height: number | null
  intrinsicWidth?: number
  intrinsicHeight?: number
  size?: string
}

const PRESET_WIDTHS: Record<string, number> = {
  small: 220,
  medium: 420,
  large: 730,
}

export function getResponsiveImageStyle({
  width,
  height,
  intrinsicWidth,
  intrinsicHeight,
  size = 'medium',
}: ResponsiveImageStyleInput) {
  const resolvedWidth = width ?? PRESET_WIDTHS[size] ?? PRESET_WIDTHS.medium
  const ratioWidth = intrinsicWidth ?? width
  const ratioHeight = intrinsicHeight ?? height

  return {
    width: `${resolvedWidth}px`,
    height: 'auto',
    aspectRatio: ratioWidth && ratioHeight ? `${ratioWidth} / ${ratioHeight}` : undefined,
  }
}
