import type { JellyColor, JellyUnit } from './types'

export const COLORS: JellyColor[] = ['yellow', 'pink', 'aqua', 'green', 'purple']
export const COLOR_NAMES: Record<JellyColor, string> = { yellow: '檸檬', pink: '蜜桃', aqua: '海藍', green: '青蘋果', purple: '葡萄' }
export const HEX: Record<JellyColor, string> = { yellow: '#ffc947', pink: '#ff82ac', aqua: '#55d7e0', green: '#93d772', purple: '#b29aee' }
export type Tile = JellyColor | null
export type TideLevel = { id: number; name: string; subtitle: string; icon: string; size: number; tiles: Tile[]; lanes: JellyUnit[][] }
export type Swimmer = JellyUnit & { age: number }
export type Shot = { id: string; color: JellyColor; from: [number, number]; target: number }
export type TideState = { tiles: Tile[]; lanes: JellyUnit[][]; pool: JellyUnit[]; swimmers: Swimmer[]; tick: number; shots: Shot[]; phase: 'playing' | 'won' | 'lost'; launched: number }
export const CAPACITY = 3
export const POOL_SIZE = 5
export const TICK_MS = 75

const charColor: Record<string, JellyColor> = { Y: 'yellow', P: 'pink', A: 'aqua', G: 'green', U: 'purple' }
function level(id: number, name: string, subtitle: string, icon: string, rows: string[], order: JellyColor[]): TideLevel {
  const tiles = rows.join('').split('').map(c => charColor[c] ?? null)
  const lanes: JellyUnit[][] = [[], [], []]
  let index = 0
  for (const color of order) {
    let count = tiles.filter(t => t === color).length
    while (count > 0) {
      const energy = Math.min(count, id === 1 ? 8 : 10)
      lanes[index % 3].push({ id: `${id}-${index++}`, color, energy })
      count -= energy
    }
  }
  // Later stages put an inner-layer color in front of part of the outer ammo.
  // Players can keep another lane moving or spend a dock to uncover it.
  if (id >= 3 && lanes[1].length > 1) [lanes[1][0], lanes[1][1]] = [lanes[1][1], lanes[1][0]]
  if (id >= 5 && lanes[2].length > 1) [lanes[2][0], lanes[2][1]] = [lanes[2][1], lanes[2][0]]
  return { id, name, subtitle, icon, size: rows.length, tiles, lanes }
}

export const TIDE_LEVELS = [
  level(1, '初見珊瑚', '點一隻水母，讓色彩流動起來。', '✿', [
    '..YYYY..', '.YYPPYY.', 'YYPPPPYY', 'YPPAAPPY', 'YPPAAPPY', 'YYPPPPYY', '.YYPPYY.', '..YYYY..',
  ], ['yellow', 'pink', 'aqua']),
  level(2, '蜜桃海灣', '先打開外層，替夥伴找到出路。', '♥', [
    '.YY..YY.', 'YPPYYPPY', 'YPPPPPPY', 'YPGGGGPY', '.YPGGPY.', '..YPPY..', '...YY...', '........',
  ], ['yellow', 'pink', 'green']),
  level(3, '星星漂流', '三條隊伍，藏著下一步的答案。', '✦', [
    '....YY....', '...YPPY...', 'YYYYPPYYYY', 'YPPAAAAPPY', '.YPAAAAPY.', '..YPAAPY..', '.YPPGGPPY.', '.YPGYYGPY.', 'YPPY..YPPY', 'YYY....YYY',
  ], ['yellow', 'pink', 'aqua', 'green']),
  level(4, '珍珠祕境', '留一個空位，讓海流繼續前進。', '◈', [
    '..YYYYYY..', '.YPPPPPPY.', 'YPAAAAAAPY', 'YPAGGGGAPY', 'YPAGUUGAPY', 'YPAGUUGAPY', 'YPAGGGGAPY', 'YPAAAAAAPY', '.YPPPPPPY.', '..YYYYYY..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(5, '彩虹水母', '把整片海的顏色，都收進圖鑑。', '♧', [
    '...YYYYYY...', '..YPPPPPPY..', '.YPAAAAAAPY.', 'YPAGGGGGGAPY', 'YPAGUUUUGAPY', 'YPAGUUUUGAPY', 'YPAGGGGGGAPY', '.YPPPPPPPPY.', '..YYYYYYYY..', '..P.A..A.P..', '..P.A..A.P..', '..P......P..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
]

export function createTide(level: TideLevel): TideState {
  return { tiles: [...level.tiles], lanes: level.lanes.map(l => l.map(j => ({ ...j }))), pool: [], swimmers: [], tick: 0, shots: [], phase: 'playing', launched: 0 }
}
export function orbitPoint(age: number, size: number): [number, number] {
  const progress = Math.max(0, Math.min(age / (size * 8), .99999)) * 4
  const side = Math.floor(progress), p = progress % 1
  const angle = Math.max(0, (p - .75) / .25) * Math.PI / 2
  const x = p < .75 ? 23 + p / .75 * 54 : 77 + 9 * Math.sin(angle)
  const y = p < .75 ? 14 : 23 - 9 * Math.cos(angle)
  return side === 0 ? [x, y] : side === 1 ? [100 - y, x] : side === 2 ? [100 - x, 100 - y] : [y, 100 - x]
}
// The first solid cube on an inward ray blocks every cube behind it.
export function rayTarget(tiles: Tile[], size: number, side: number, line: number): number | null {
  for (let depth = 0; depth < size; depth++) {
    const index = side === 0 ? depth * size + line : side === 1 ? line * size + size - 1 - depth : side === 2 ? (size - 1 - depth) * size + size - 1 - line : (size - 1 - line) * size + depth
    if (tiles[index]) return index
  }
  return null
}
export function canHit(state: TideState, color: JellyColor, size: number): boolean {
  for (let side = 0; side < 4; side++) for (let line = 0; line < size; line++) {
    const target = rayTarget(state.tiles, size, side, line)
    if (target !== null && state.tiles[target] === color) return true
  }
  return false
}
export function launch(state: TideState, source: 'lane' | 'pool', index: number): TideState {
  if (state.phase !== 'playing' || state.swimmers.length >= CAPACITY) return state
  const jelly = source === 'lane' ? state.lanes[index]?.[0] : state.pool[index]
  if (!jelly) return state
  // Reserve a dock for every swimmer. This avoids ambiguous overflow while
  // other swimmers are still shooting, and always lets pool jellies relaunch.
  if (source === 'lane' && state.pool.length + state.swimmers.length >= POOL_SIZE) return state
  return {
    ...state,
    lanes: state.lanes.map((l, i) => source === 'lane' && i === index ? l.slice(1) : l),
    pool: source === 'pool' ? state.pool.filter((_, i) => i !== index) : state.pool,
    swimmers: [...state.swimmers, { ...jelly, age: Math.min(0, ...state.swimmers.map(j => j.age - 5)) }], launched: state.launched + 1,
  }
}
export function stepTide(state: TideState, size: number): TideState {
  if (state.phase !== 'playing') return state
  const next: TideState = { ...state, tiles: [...state.tiles], pool: [...state.pool], swimmers: [], tick: state.tick + 1, shots: [] }
  for (const original of state.swimmers) {
    const jelly = { ...original }
    if (jelly.age < 0) { next.swimmers.push({ ...jelly, age: jelly.age + 1 }); continue }
    const ray = Math.floor(jelly.age / 2)
    const target = rayTarget(next.tiles, size, Math.floor(ray / size), ray % size)
    if (target !== null && next.tiles[target] === jelly.color) {
      next.tiles[target] = null
      jelly.energy--
      next.shots.push({ id: `${state.tick}-${jelly.id}`, color: jelly.color, from: orbitPoint(jelly.age, size), target })
    }
    jelly.age++
    if (jelly.energy <= 0) continue
    if (jelly.age >= size * 8) next.pool.push({ id: jelly.id, color: jelly.color, energy: jelly.energy })
    else next.swimmers.push(jelly)
  }
  if (next.tiles.every(t => t === null)) next.phase = 'won'
  else if (!next.swimmers.length) {
    const usefulPool = next.pool.some(j => canHit(next, j.color, size))
    const canOpenQueue = next.pool.length < POOL_SIZE && next.lanes.some(l => l.length)
    if (!usefulPool && !canOpenQueue) next.phase = 'lost'
  }
  return next
}

export function hintMove(state: TideState, size: number): { source: 'lane' | 'pool'; index: number } | null {
  const pool = state.pool.findIndex(j => canHit(state, j.color, size))
  if (pool >= 0) return { source: 'pool', index: pool }
  const lane = state.lanes.findIndex(l => l[0] && canHit(state, l[0].color, size))
  if (lane >= 0 && state.pool.length + state.swimmers.length < POOL_SIZE) return { source: 'lane', index: lane }
  if (!state.swimmers.length && state.pool.length < POOL_SIZE) {
    const blockedLane = state.lanes.findIndex(l => l.length > 0)
    if (blockedLane >= 0) return { source: 'lane', index: blockedLane }
  }
  return null
}
