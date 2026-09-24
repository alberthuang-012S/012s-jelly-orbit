import { describe, expect, it } from 'vitest'
import { COLORS, TIDE_LEVELS, createTide, hintMove, launch, rayTarget, stepTide } from './tide'
import type { TideState } from './tide'

function settle(state: TideState, size: number) {
  let next = state
  for (let tick = 0; tick < size * 8 + 16 && next.swimmers.length && next.phase === 'playing'; tick++) next = stepTide(next, size)
  return next
}
function energy(state: TideState) {
  return [...state.lanes.flat(), ...state.pool, ...state.swimmers].reduce((sum, j) => sum + j.energy, 0)
}

describe('Tide realtime rules', () => {
  it('blocks hidden cubes from all four firing directions', () => {
    const tiles = Array.from({ length: 9 }, (_, i) => i === 4 ? 'pink' as const : 'yellow' as const)
    expect([0, 1, 2, 3].map(side => rayTarget(tiles, 3, side, 1))).toEqual([1, 5, 7, 3])
  })
  it('supports three simultaneous swimmers, takes only lane heads, and rejects a fourth', () => {
    let state = createTide(TIDE_LEVELS[0])
    const second = state.lanes[0][1]
    state = launch(state, 'lane', 0)
    expect(state.lanes[0][0]).toEqual(second)
    state = launch(launch(state, 'lane', 1), 'lane', 2)
    expect(state.swimmers).toHaveLength(3)
    expect(launch(state, 'lane', 0)).toBe(state)
  })
  it('deducts one ammo per destroyed cube, including simultaneous hits', () => {
    let state = createTide(TIDE_LEVELS[0])
    state = launch(launch(launch(state, 'lane', 0), 'lane', 1), 'lane', 2)
    for (let i = 0; i < 64; i++) {
      const before = structuredClone(state)
      const next = stepTide(state, 8)
      const hits = state.tiles.filter(Boolean).length - next.tiles.filter(Boolean).length
      expect(energy(state) - energy(next)).toBe(hits)
      expect(state).toEqual(before)
      expect(new Set(next.shots.map(s => s.target)).size).toBe(next.shots.length)
      state = next
    }
  })
  it('reserves docks and still lets a full pool relaunch', () => {
    const state = createTide(TIDE_LEVELS[0])
    state.pool = Array.from({ length: 5 }, (_, i) => ({ id: `pool-${i}`, color: 'yellow', energy: 1 }))
    expect(launch(state, 'lane', 0)).toBe(state)
    const next = launch(state, 'pool', 0)
    expect(next.pool).toHaveLength(4)
    expect(next.swimmers).toHaveLength(1)
    expect(launch(next, 'lane', 0)).toBe(next)
  })
  it('does not lose while a swimmer can open a target, then loses when truly blocked', () => {
    const state = createTide(TIDE_LEVELS[0])
    state.pool = Array.from({ length: 4 }, (_, i) => ({ id: `pool-${i}`, color: 'purple', energy: 1 }))
    state.swimmers = [{ id: 'active', color: 'purple', energy: 1, age: 0 }]
    expect(stepTide(state, 8).phase).toBe('playing')
    expect(settle(state, 8).phase).toBe('lost')
  })
  it('returns unused ammo to the dock and never spends it on another color', () => {
    const state = createTide(TIDE_LEVELS[0])
    state.swimmers = [{ id: 'purple', color: 'purple', energy: 7, age: 0 }]
    const after = settle(state, 8)
    expect(after.pool).toEqual([{ id: 'purple', color: 'purple', energy: 7 }])
    expect(after.tiles).toEqual(state.tiles)
  })
})

describe('five playable prototype levels', () => {
  for (const level of TIDE_LEVELS) {
    it(`stage ${level.id} supports interleaved launches without overflowing the dock`, () => {
      let state = createTide(level)
      for (let tick = 0; tick < 6000 && state.phase === 'playing'; tick++) {
        if (tick % 6 === 0) {
          const choice = hintMove(state, level.size)
          if (choice) state = launch(state, choice.source, choice.index)
        }
        state = stepTide(state, level.size)
        expect(state.pool.length + state.swimmers.length).toBeLessThanOrEqual(5)
        expect(state.swimmers.length).toBeLessThanOrEqual(3)
      }
      expect(state.phase).toBe('won')
    })
    it(`stage ${level.id} has balanced ammo and a verified winning route`, () => {
      expect(level.tiles).toHaveLength(level.size ** 2)
      for (const color of COLORS) expect(level.lanes.flat().filter(j => j.color === color).reduce((sum, j) => sum + j.energy, 0)).toBe(level.tiles.filter(t => t === color).length)
      let state = createTide(level)
      for (let move = 0; move < 200 && state.phase === 'playing'; move++) {
        const choice = hintMove(state, level.size)
        expect(choice, `stage ${level.id}, move ${move}, ${state.tiles.filter(Boolean).length} tiles left`).not.toBeNull()
        if (!choice) break
        state = settle(launch(state, choice.source, choice.index), level.size)
        expect(state.pool.length + state.swimmers.length).toBeLessThanOrEqual(5)
      }
      expect(state.phase).toBe('won')
    })
  }
})
