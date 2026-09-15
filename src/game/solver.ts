import { canSelectJelly, createInitialGame, resolveJellyTurn, stateKey } from './engine'
import type { GameState, LevelDefinition, SolverResult } from './types'

const MAX_SOLVER_STATES = 300_000

type Candidate = {
  source: 'queue' | 'pool'
  id: string
}

function candidatesFor(state: GameState): Candidate[] {
  const queue = state.queue.map((jelly) => ({ source: 'queue' as const, id: jelly.id }))
  const pool = state.pool.map((jelly) => ({ source: 'pool' as const, id: jelly.id }))
  return [...queue, ...pool].filter((candidate) => canSelectJelly(state, candidate.source, candidate.id))
}

/**
 * A deliberately small, deterministic depth-first solver. It proves that a
 * hand-authored level has at least one route; it is not intended to optimize
 * the player's route or score.
 */
export function solveLevel(level: LevelDefinition): SolverResult {
  const start = createInitialGame(level)
  const visited = new Set<string>()
  let visitedStates = 0

  const search = (state: GameState, path: string[]): string[] | null => {
    if (state.remainingPixelCount === 0) return path
    if (state.phase === 'lost') return null
    if (visitedStates >= MAX_SOLVER_STATES) return null

    const key = stateKey(state)
    if (visited.has(key)) return null
    visited.add(key)
    visitedStates += 1

    const candidates = candidatesFor(state)
    for (const candidate of candidates) {
      const result = resolveJellyTurn(state, candidate.source, candidate.id)
      if (!result.accepted || result.state.phase === 'lost') continue

      const solution = search(result.state, [...path, candidate.id])
      if (solution) return solution
    }

    return null
  }

  const solution = search(start, [])
  return {
    solvable: Boolean(solution),
    solution: solution ?? [],
    visitedStates,
  }
}
