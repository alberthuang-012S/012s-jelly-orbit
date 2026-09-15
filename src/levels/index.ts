import type { JellyColor, JellyUnit, LevelDefinition, PixelMatrix } from '../game/types'

const CHAR_TO_COLOR: Record<string, JellyColor | null> = {
  Y: 'yellow',
  P: 'pink',
  G: 'green',
  U: 'purple',
  A: 'aqua',
  '.': null,
}

function rowsToPixels(rows: string[]): PixelMatrix {
  const width = rows[0]?.length ?? 0
  if (rows.some((row) => row.length !== width)) throw new Error('Every level row must have the same width.')
  return rows.map((row) => [...row].map((character) => CHAR_TO_COLOR[character] ?? null))
}

function queueFor(
  stageId: number,
  pixels: PixelMatrix,
  order: JellyColor[],
  bonuses: Partial<Record<JellyColor, number>> = {},
): JellyUnit[] {
  const counts = new Map<JellyColor, number>()
  pixels.flat().forEach((color) => {
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1)
  })

  return order.map((color, index) => ({
    id: `stage-${String(stageId).padStart(2, '0')}-${color}-${index + 1}`,
    color,
    energy: (counts.get(color) ?? 0) + (bonuses[color] ?? 0),
  }))
}

function defineLevel(
  id: number,
  name: string,
  rows: string[],
  order: JellyColor[],
  bonuses: Partial<Record<JellyColor, number>> = {},
): LevelDefinition {
  const pixels = rowsToPixels(rows)
  return {
    id,
    name,
    width: pixels[0]?.length ?? 0,
    height: pixels.length,
    pixels,
    queue: queueFor(id, pixels, order, bonuses),
    poolSize: 4,
  }
}

export const LEVELS: LevelDefinition[] = [
  defineLevel(1, 'First Orbit', [
    'YYYYYYYY',
    'YPPPPPPY',
    'YPGGGGPY',
    'YPGGGGPY',
    'YPGGGGPY',
    'YPGGGGPY',
    'YPPPPPPY',
    'YYYYYYYY',
  ], ['yellow', 'pink', 'green']),
  defineLevel(2, 'Two Doors', [
    'YPYPYPYP',
    'PGGGGGGP',
    'YGPPPPGY',
    'PGPUUPGP',
    'YGPUUPGY',
    'PGPUUPGP',
    'YGPPPPGY',
    'PYPYPYPY',
  ], ['yellow', 'pink', 'green', 'purple']),
  defineLevel(3, 'Little Comet', [
    '..YYYY..',
    '.YPPPPY.',
    'YPPGGPPY',
    'YPGGGGPY',
    'YPGUUGPY',
    'YPGGGGPY',
    '.YPPPPY.',
    '..YYYY..',
  ], ['yellow', 'pink', 'green', 'purple']),
  defineLevel(4, 'Heart Current', [
    '.YY..YY.',
    'YPPYYPPY',
    'YPPGGPPY',
    'YPGGGGPY',
    '.YPGGGP.',
    '..YPPY..',
    '...YY...',
    '........',
  ], ['yellow', 'pink', 'green'], { yellow: 4 }),
  defineLevel(5, 'Star Bloom', [
    '...Y....',
    '..YPP...',
    'YYYYYYYY',
    '.YPGGGY.',
    '..YGG...',
    '.YPGPY..',
    'Y..P..Y.',
    '...Y....',
  ], ['yellow', 'pink', 'green'], { pink: 3 }),
  defineLevel(6, 'Four Point Tide', [
    'YYYYYYYY',
    'YPPPPPPY',
    'YPGGGGPY',
    'YPGUUGPY',
    'YPGUUGPY',
    'YPGGGGPY',
    'YPPPPPPY',
    'YYYYYYYY',
  ], ['yellow', 'pink', 'green', 'purple'], { yellow: 2 }),
  defineLevel(7, 'Folded Ribbon', [
    'YPYPYPYP',
    'YPPPPPPY',
    'PPGGGGPP',
    'YPGUUGPY',
    'YPGUUGPY',
    'PPGGGGPP',
    'YPPPPPPY',
    'PYPYPYPY',
  ], ['yellow', 'pink', 'green', 'purple'], { pink: 2 }),
  defineLevel(8, 'Jelly Window', [
    '..YYYY..',
    '.YPPPPY.',
    'YPGGGGPY',
    'YPGUUGPY',
    'YPGUUGPY',
    'YPGGGGPY',
    '.YPPPPY.',
    '..YYYY..',
  ], ['yellow', 'pink', 'green', 'purple'], { purple: 4 }),
  defineLevel(9, 'Shell Signal', [
    '..YYYY..',
    '.YPPPPY.',
    'YPGGGGPY',
    'YPGAAGPY',
    'YPGUUGPY',
    'YPGAAGPY',
    '.YPPPPY.',
    '..YYYY..',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { aqua: 3 }),
  defineLevel(10, 'Crown Current', [
    '...YYYY...',
    '..YPPPPY..',
    '.YPPGGPPY.',
    'YPPGGGGPPY',
    'YPGGGGGGPY',
    'YPGUUUUGPY',
    'YPGUUUUGPY',
    'YPGGGGGGPY',
    'YPPPPPPPPY',
    '.YYYYYYYY.',
  ], ['yellow', 'pink', 'green', 'purple'], { yellow: 3 }),
  defineLevel(11, 'Five Colour Gem', [
    '....YY....',
    '...YPPY...',
    '..YPGGPY..',
    '.YPGUUGPY.',
    'YPGUAAUPGY',
    'YPGUAAUPGY',
    '.YPGUUGPY.',
    '..YPGGPY..',
    '...YPPY...',
    '....YY....',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { purple: 2 }),
  defineLevel(12, 'Moon Pocket', [
    '....YYYY..',
    '..YPPPPY..',
    '.YPGGGGPY.',
    'YPGUUUUGPY',
    'YPGUAAUGPY',
    'YPGUAAUGPY',
    'YPGUUUUGPY',
    '.YPGGGGPY.',
    '..YPPPPY..',
    '....YYYY..',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { aqua: 3 }),
  defineLevel(13, 'Big Jelly', [
    '..YYYYYY..',
    '.YPPPPPPY.',
    'YPGGGGGGPY',
    'YPGUUUUGPY',
    'YPGUAAUGPY',
    'YPGUAAUGPY',
    'YPGUUUUGPY',
    'YPGGGGGGPY',
    '.YPPYYPPY.',
    '..YPPY....',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { yellow: 2 }),
  defineLevel(14, 'Garden Orbit', [
    '..YY..YY..',
    '.YPPY.PPY.',
    'YPPGGGGPPY',
    'YPGUAAUGPY',
    'YPGUAAUGPY',
    'YPGGGGGGPY',
    '.YPGUUGPY.',
    '..YPPPPY..',
    '...YPPY...',
    '....YY....',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { pink: 2 }),
  defineLevel(15, 'Rainbow Shell', [
    'YAYAYAYAYA',
    'APPPPPPPPA',
    'YPGGGGGGPY',
    'APGUUUUGPA',
    'YPGUAAUGPY',
    'APGUAAUGPA',
    'YPGUUUUGPY',
    'APGGGGGGPA',
    'YPPPPPPPPY',
    'AYAYAYAYAY',
  ], ['yellow', 'pink', 'green', 'purple', 'aqua'], { aqua: 2 }),
]

export function getLevel(levelId: number): LevelDefinition {
  const level = LEVELS.find((candidate) => candidate.id === levelId)
  if (!level) throw new Error(`Unknown Jelly Orbit level: ${levelId}`)
  return level
}
