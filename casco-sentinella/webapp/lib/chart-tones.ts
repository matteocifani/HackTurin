/** Identity tones (tag-1..5) assigned deterministically to keys. Part of the IAMAimpresa design system. */
export const CHART_TONES = [
  'bg-tag-1/15 text-foreground',
  'bg-tag-2/15 text-foreground',
  'bg-tag-3/15 text-foreground',
  'bg-tag-4/15 text-foreground',
  'bg-tag-5/15 text-foreground',
] as const

export const CHART_TONES_SOLID = [
  'bg-tag-1 text-fixed-light',
  'bg-tag-2 text-fixed-light',
  'bg-tag-3 text-fixed-light',
  'bg-tag-4 text-fixed-light',
  'bg-tag-5 text-fixed-light',
] as const

export function chartToneIndex(key: string): number {
  let acc = 0
  for (let i = 0; i < key.length; i++) acc = (acc * 31 + key.charCodeAt(i)) % 997
  return acc % CHART_TONES.length
}

export function buildToneMap(keys: Iterable<string>): Map<string, number> {
  const unique = [...new Set(keys)].sort((a, b) => a.localeCompare(b))
  const taken = new Set<number>()
  const map = new Map<string, number>()

  for (const key of unique) {
    const wanted = chartToneIndex(key)
    let tone = wanted

    for (let step = 0; step < CHART_TONES.length && taken.has(tone); step++) {
      tone = (wanted + step + 1) % CHART_TONES.length
    }
    taken.add(tone)
    map.set(key, tone)
    if (taken.size === CHART_TONES.length) taken.clear()
  }
  return map
}
