import { describe, expect, it } from 'vitest'
import {
  createInitialGame,
  createPixelCells,
  detectDeadlock,
  getAttackablePixels,
  getExposedPixels,
  getOutsideEmptyRegion,
  resolveJellyTurn,
} from './engine'
import type { GameState, LevelDefinition, PixelMatrix } from './types'

function matrix(rows: string[]): PixelMatrix {
  const map: Record<string, PixelMatrix[number][number]> = { Y: 'yellow', P: 'pink', G: 'green', U: 'purple', A: 'aqua', '.': null }
  return rows.map((row) => [...row].map((character) => map[character]))
}

function level(pixels: PixelMatrix, queue = [{ id: 'yellow-1', color: 'yellow' as const, energy: 10 }]): LevelDefinition {
  return { id: 99, name: 'Test', width: pixels[0].length, height: pixels.length, pixels, queue, poolSize: 4 }
}

describe('outside flood fill and exposure', () => {
  it('marks border pixels exposed and inner solid pixels hidden', () => {
    const pixels = createPixelCells(matrix(['YYY', 'YGY', 'YYY']))
    const exposed = new Set(getExposedPixels(pixels).map((cell) => cell.id))
    expect(exposed).toContain('pixel-0-0')
    expect(exposed).not.toContain('pixel-1-1')
  })

  it('does not leak into an enclosed empty pocket', () => {
    const pixels = createPixelCells(matrix(['YYYYY', 'YGGGY', 'YG.GY', 'YGGGY', 'YYYYY']))
    const outside = getOutsideEmptyRegion(pixels)
    expect(outside.has('2:2')).toBe(false)
    expect(getExposedPixels(pixels).filter((cell) => cell.color === 'green')).toHaveLength(0)
  })

  it('reveals pixels after the blocking layer is removed', () => {
    let pixels = createPixelCells(matrix(['YYY', 'YGY', 'YYY']))
    for (const id of ['pixel-0-0', 'pixel-0-1', 'pixel-0-2', 'pixel-1-0', 'pixel-1-2', 'pixel-2-0', 'pixel-2-1', 'pixel-2-2']) {
      pixels = pixels.map((row) => row.map((cell) => (cell?.id === id ? { ...cell, alive: false } : cell)))
    }
    expect(getExposedPixels(pixels).map((cell) => cell.id)).toEqual(['pixel-1-1'])
  })
})

describe('color attack and energy', () => {
  it('only targets matching exposed pixels, never a hidden match', () => {
    const pixels = createPixelCells(matrix(['YYY', 'YGY', 'YYY']))
    expect(getAttackablePixels(pixels, 'yellow')).toHaveLength(8)
    expect(getAttackablePixels(pixels, 'green')).toHaveLength(0)
  })

  it('spends one energy per matching pixel and keeps a partial jelly in pool', () => {
    const initial = createInitialGame(level(matrix(['YP']), [{ id: 'yellow-1', color: 'yellow', energy: 3 }]))
    const result = resolveJellyTurn(initial, 'queue', 'yellow-1')
    expect(result.accepted).toBe(true)
    expect(result.events).toHaveLength(1)
    expect(result.state.remainingPixelCount).toBe(1)
    expect(result.state.pool).toEqual([{ id: 'yellow-1', color: 'yellow', energy: 2 }])
    expect(result.state.queue).toHaveLength(0)
  })
})

describe('pool, deadlock, and win', () => {
  function fullPoolState(base: GameState, queue: GameState['queue'], color: 'yellow' | 'green'): GameState {
    return {
      ...base,
      queue,
      pool: [
        { id: 'p-1', color: color === 'yellow' ? 'green' : 'yellow', energy: 1 },
        { id: 'p-2', color: color === 'yellow' ? 'green' : 'yellow', energy: 1 },
        { id: 'p-3', color: color === 'yellow' ? 'green' : 'yellow', energy: 1 },
        { id: 'p-4', color: color === 'yellow' ? 'green' : 'yellow', energy: 1 },
      ],
    }
  }

  it('does not lose just because the pool is full when a move exists', () => {
    const base = createInitialGame(level(matrix(['Y']), []))
    const state = fullPoolState(base, [{ id: 'yellow-1', color: 'yellow', energy: 1 }], 'yellow')
    expect(detectDeadlock(state)).toBe(false)
  })

  it('loses only when a full pool has no meaningful move', () => {
    const base = createInitialGame(level(matrix(['G']), []))
    const state = fullPoolState(base, [], 'green')
    expect(detectDeadlock(state)).toBe(true)
  })

  it('marks the game won when the last pixel is removed', () => {
    const initial = createInitialGame(level(matrix(['Y']), [{ id: 'yellow-1', color: 'yellow', energy: 1 }]))
    const result = resolveJellyTurn(initial, 'queue', 'yellow-1')
    expect(result.state.phase).toBe('won')
    expect(result.state.remainingPixelCount).toBe(0)
  })
})
