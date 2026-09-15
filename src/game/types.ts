export const JELLY_COLORS = ['yellow', 'pink', 'green', 'purple', 'aqua'] as const

export type JellyColor = (typeof JELLY_COLORS)[number]

export type PixelCell = {
  id: string
  row: number
  col: number
  color: JellyColor
  alive: boolean
  exposed: boolean
}

export type PixelMatrix = Array<Array<JellyColor | null>>
export type PixelCellMatrix = Array<Array<PixelCell | null>>

export type JellyUnit = {
  id: string
  color: JellyColor
  energy: number
}

export type LevelDefinition = {
  id: number
  name: string
  width: number
  height: number
  pixels: PixelMatrix
  queue: JellyUnit[]
  poolSize: number
  solution?: string[]
}

export type GamePhase = 'idle' | 'resolving' | 'won' | 'lost'
export type JellySource = 'queue' | 'pool'

export type GameState = {
  levelId: number
  pixels: PixelCellMatrix
  queue: JellyUnit[]
  pool: JellyUnit[]
  activeJelly: JellyUnit | null
  phase: GamePhase
  remainingPixelCount: number
  poolSize: number
}

export type ResolutionEvent = {
  poppedId: string
  poppedColor: JellyColor
  newlyExposedIds: string[]
  pixelsAfter: PixelCellMatrix
}

export type TurnResolution = {
  accepted: boolean
  reason?: string
  source: JellySource
  selectedJelly: JellyUnit | null
  beforePixels: PixelCellMatrix
  events: ResolutionEvent[]
  state: GameState
}

export type SolverResult = {
  solvable: boolean
  solution: string[]
  visitedStates: number
}

export type ValidationIssue = {
  levelId: number
  message: string
}

export type LevelValidationResult = {
  levelId: number
  validDimensions: boolean
  validColors: boolean
  queueNotEmpty: boolean
  totalEnergySufficient: boolean
  uniqueJellyIds: boolean
  colorsHaveEnergy: boolean
  solvable: boolean
  issues: ValidationIssue[]
}
