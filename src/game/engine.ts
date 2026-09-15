import type {
  GameState,
  JellyColor,
  JellySource,
  JellyUnit,
  LevelDefinition,
  PixelCell,
  PixelCellMatrix,
  PixelMatrix,
  ResolutionEvent,
  TurnResolution,
} from './types'

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

export const pixelId = (row: number, col: number): string => `pixel-${row}-${col}`

export function countAlivePixels(pixels: PixelCellMatrix): number {
  return pixels.reduce(
    (total, row) => total + row.filter((cell): cell is PixelCell => Boolean(cell?.alive)).length,
    0,
  )
}

export function clonePixels(pixels: PixelCellMatrix): PixelCellMatrix {
  return pixels.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

export function createPixelCells(matrix: PixelMatrix): PixelCellMatrix {
  const cells = matrix.map((row, rowIndex) =>
    row.map((color, colIndex) =>
      color
        ? {
            id: pixelId(rowIndex, colIndex),
            row: rowIndex,
            col: colIndex,
            color,
            alive: true,
            exposed: false,
          }
        : null,
    ),
  )

  return recalculateExposure(cells)
}

function isEmptyCell(pixels: PixelCellMatrix, row: number, col: number): boolean {
  const cell = pixels[row]?.[col]
  return !cell || !cell.alive
}

function coordinateKey(row: number, col: number): string {
  return `${row}:${col}`
}

function parseCoordinateKey(key: string): [number, number] {
  const [row, col] = key.split(':').map(Number)
  return [row, col]
}

/**
 * Finds empty cells that can be reached from an empty border cell. A solid
 * border is still handled by the out-of-bounds check in recalculateExposure.
 */
export function getOutsideEmptyRegion(pixels: PixelCellMatrix): Set<string> {
  const height = pixels.length
  const width = pixels[0]?.length ?? 0
  const outside = new Set<string>()
  const pending: Array<[number, number]> = []

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const isBorder = row === 0 || col === 0 || row === height - 1 || col === width - 1
      if (isBorder && isEmptyCell(pixels, row, col)) {
        pending.push([row, col])
      }
    }
  }

  while (pending.length > 0) {
    const [row, col] = pending.shift() as [number, number]
    const key = coordinateKey(row, col)
    if (outside.has(key) || !isEmptyCell(pixels, row, col)) continue
    outside.add(key)

    for (const [rowDelta, colDelta] of DIRECTIONS) {
      const nextRow = row + rowDelta
      const nextCol = col + colDelta
      if (
        nextRow >= 0 &&
        nextRow < height &&
        nextCol >= 0 &&
        nextCol < width &&
        isEmptyCell(pixels, nextRow, nextCol)
      ) {
        pending.push([nextRow, nextCol])
      }
    }
  }

  return outside
}

export function recalculateExposure(pixels: PixelCellMatrix): PixelCellMatrix {
  const nextPixels = clonePixels(pixels)
  const outside = getOutsideEmptyRegion(nextPixels)
  const height = nextPixels.length
  const width = nextPixels[0]?.length ?? 0

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = nextPixels[row][col]
      if (!cell || !cell.alive) continue

      cell.exposed = DIRECTIONS.some(([rowDelta, colDelta]) => {
        const nextRow = row + rowDelta
        const nextCol = col + colDelta
        if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) return true
        return outside.has(coordinateKey(nextRow, nextCol))
      })
    }
  }

  return nextPixels
}

export function getExposedPixels(pixels: PixelCellMatrix): PixelCell[] {
  return recalculateExposure(pixels).flatMap((row) =>
    row.filter((cell): cell is PixelCell => Boolean(cell?.alive && cell.exposed)),
  )
}

function clockwiseOrbitAngle(cell: PixelCell, width: number, height: number): number {
  const centerRow = (height - 1) / 2
  const centerCol = (width - 1) / 2
  const angle = Math.atan2(cell.col - centerCol, -(cell.row - centerRow))
  return angle >= 0 ? angle : angle + Math.PI * 2
}

/**
 * A fixed clockwise order makes multi-target turns legible and deterministic.
 * It is intentionally independent of animation timing or random numbers.
 */
export function getAttackablePixels(pixels: PixelCellMatrix, color: JellyColor): PixelCell[] {
  const exposed = getExposedPixels(pixels).filter((cell) => cell.color === color)
  const height = pixels.length
  const width = pixels[0]?.length ?? 0

  return exposed.sort((first, second) => {
    const angleDelta = clockwiseOrbitAngle(first, width, height) - clockwiseOrbitAngle(second, width, height)
    if (Math.abs(angleDelta) > 0.0001) return angleDelta
    const distanceFirst = Math.abs(first.row - (height - 1) / 2) + Math.abs(first.col - (width - 1) / 2)
    const distanceSecond = Math.abs(second.row - (height - 1) / 2) + Math.abs(second.col - (width - 1) / 2)
    return distanceSecond - distanceFirst || first.id.localeCompare(second.id)
  })
}

function removeJelly(jellies: JellyUnit[], id: string): JellyUnit[] {
  return jellies.filter((jelly) => jelly.id !== id)
}

function findJelly(jellies: JellyUnit[], id: string): JellyUnit | undefined {
  return jellies.find((jelly) => jelly.id === id)
}

type HitSimulation = {
  hits: string[]
  snapshots: PixelCellMatrix[]
}

function simulateHits(pixels: PixelCellMatrix, color: JellyColor, energy: number): HitSimulation {
  let workingPixels = recalculateExposure(pixels)
  const hits: string[] = []
  const snapshots: PixelCellMatrix[] = []

  while (hits.length < energy) {
    const target = getAttackablePixels(workingPixels, color)[0]
    if (!target) break

    workingPixels = workingPixels.map((row) =>
      row.map((cell) => (cell?.id === target.id ? { ...cell, alive: false, exposed: false } : cell)),
    )
    workingPixels = recalculateExposure(workingPixels)
    hits.push(target.id)
    snapshots.push(clonePixels(workingPixels))
  }

  return { hits, snapshots }
}

function getNextExposedIds(before: PixelCellMatrix, after: PixelCellMatrix): string[] {
  const beforeMap = new Map(
    before.flatMap((row) => row.filter((cell): cell is PixelCell => Boolean(cell)).map((cell) => [cell.id, cell])),
  )
  return after
    .flatMap((row) => row.filter((cell): cell is PixelCell => Boolean(cell?.alive && cell.exposed)))
    .filter((cell) => !beforeMap.get(cell.id)?.exposed)
    .map((cell) => cell.id)
}

export function createInitialGame(level: LevelDefinition): GameState {
  const pixels = createPixelCells(level.pixels)
  return {
    levelId: level.id,
    pixels,
    queue: level.queue.map((jelly) => ({ ...jelly })),
    pool: [],
    activeJelly: null,
    phase: 'idle',
    remainingPixelCount: countAlivePixels(pixels),
    poolSize: level.poolSize,
  }
}

export function getJellyForSource(state: GameState, source: JellySource, jellyId: string): JellyUnit | undefined {
  return findJelly(source === 'queue' ? state.queue : state.pool, jellyId)
}

function wouldHaveStorageForQueueMove(state: GameState, jelly: JellyUnit): boolean {
  if (state.pool.length < state.poolSize) return true
  const simulation = simulateHits(state.pixels, jelly.color, jelly.energy)
  return simulation.hits.length >= jelly.energy
}

export function canSelectJelly(state: GameState, source: JellySource, jellyId: string): boolean {
  if (state.phase !== 'idle' || state.remainingPixelCount === 0) return false
  const jelly = getJellyForSource(state, source, jellyId)
  if (!jelly) return false

  const potentialHits = simulateHits(state.pixels, jelly.color, jelly.energy).hits.length
  if (source === 'pool') return potentialHits > 0
  return wouldHaveStorageForQueueMove(state, jelly)
}

export function hasMeaningfulMove(state: GameState): boolean {
  if (state.remainingPixelCount === 0) return true

  return [...state.queue.map((jelly) => ({ source: 'queue' as const, jelly })), ...state.pool.map((jelly) => ({ source: 'pool' as const, jelly }))].some(
    ({ source, jelly }) => {
      if (!canSelectJelly(state, source, jelly.id)) return false
      return simulateHits(state.pixels, jelly.color, jelly.energy).hits.length > 0
    },
  )
}

export function detectDeadlock(state: GameState): boolean {
  return state.remainingPixelCount > 0 && state.pool.length >= state.poolSize && !hasMeaningfulMove(state)
}

function rejectedResolution(state: GameState, source: JellySource, reason: string): TurnResolution {
  return {
    accepted: false,
    reason,
    source,
    selectedJelly: null,
    beforePixels: clonePixels(state.pixels),
    events: [],
    state,
  }
}

export function resolveJellyTurn(state: GameState, source: JellySource, jellyId: string): TurnResolution {
  if (state.phase !== 'idle') return rejectedResolution(state, source, 'The game is not waiting for a move.')
  const selectedJelly = getJellyForSource(state, source, jellyId)
  if (!selectedJelly) return rejectedResolution(state, source, 'That jelly is no longer available.')

  const beforePixels = recalculateExposure(state.pixels)
  const simulation = simulateHits(beforePixels, selectedJelly.color, selectedJelly.energy)
  if (source === 'pool' && simulation.hits.length === 0) {
    return rejectedResolution(state, source, 'This jelly has no exposed target right now.')
  }
  if (source === 'queue' && !wouldHaveStorageForQueueMove(state, selectedJelly)) {
    return rejectedResolution(state, source, 'The Jelly Pool is full for a partial turn.')
  }

  const events: ResolutionEvent[] = []
  let previousPixels = beforePixels
  simulation.snapshots.forEach((snapshot, index) => {
    events.push({
      poppedId: simulation.hits[index],
      poppedColor: selectedJelly.color,
      newlyExposedIds: getNextExposedIds(previousPixels, snapshot),
      pixelsAfter: snapshot,
    })
    previousPixels = snapshot
  })

  const nextQueue = source === 'queue' ? removeJelly(state.queue, jellyId) : state.queue.map((jelly) => ({ ...jelly }))
  const nextPool = source === 'pool' ? removeJelly(state.pool, jellyId) : state.pool.map((jelly) => ({ ...jelly }))
  const remainingEnergy = selectedJelly.energy - simulation.hits.length
  if (remainingEnergy > 0) {
    nextPool.push({ ...selectedJelly, energy: remainingEnergy })
  }

  const remainingPixelCount = countAlivePixels(previousPixels)
  const nextState: GameState = {
    ...state,
    pixels: previousPixels,
    queue: nextQueue,
    pool: nextPool,
    activeJelly: null,
    phase: remainingPixelCount === 0 ? 'won' : 'idle',
    remainingPixelCount,
  }

  if (nextState.phase !== 'won' && detectDeadlock(nextState)) nextState.phase = 'lost'

  return {
    accepted: true,
    source,
    selectedJelly: { ...selectedJelly },
    beforePixels,
    events,
    state: nextState,
  }
}

export function isLevelComplete(state: GameState): boolean {
  return state.remainingPixelCount === 0
}

export function alivePixelIds(pixels: PixelCellMatrix): string[] {
  return pixels.flatMap((row) => row.filter((cell): cell is PixelCell => Boolean(cell?.alive)).map((cell) => cell.id))
}

export function stateKey(state: GameState): string {
  const pixelKey = alivePixelIds(state.pixels).join(',')
  const jellyKey = (jellies: JellyUnit[]) => jellies.map((jelly) => `${jelly.id}:${jelly.energy}`).join(',')
  return `${pixelKey}|q:${jellyKey(state.queue)}|p:${jellyKey(state.pool)}`
}

export function coordinateFromKey(key: string): [number, number] {
  return parseCoordinateKey(key)
}
