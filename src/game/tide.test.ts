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

describe('ten playable stages', () => {
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
      expect(level.ice).toHaveLength(level.tiles.length)
      for (const color of COLORS) expect(level.lanes.flat().filter(j => j.color === color).reduce((sum, j) => sum + j.energy, 0)).toBe(level.tiles.reduce((sum, tile, i) => sum + (tile === color ? 1 + level.ice[i] : 0), 0))
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

describe('ice and streaks', () => {
  it('resolves two simultaneous hits on an iced tile without double-spending or negative ice', () => {
    const state = createTide(TIDE_LEVELS[5])
    state.tiles = ['yellow', null, null, null]
    state.ice = [1, 0, 0, 0]
    state.swimmers = [{ id: 'first', color: 'yellow', energy: 1, age: 0 }, { id: 'second', color: 'yellow', energy: 1, age: 0 }]
    const next = stepTide(state, 2)
    expect(next.shots.map(shot => shot.cracked)).toEqual([true, false])
    expect(next.ice[0]).toBe(0)
    expect(next.swimmers).toHaveLength(0)
    expect(next.phase).toBe('won')
    expect(next.clearedColors).toEqual(['yellow'])
  })
  it('spends one bubble cracking ice, keeps the tile blocking, then clears on the next matching hit', () => {
    const state = createTide(TIDE_LEVELS[5])
    state.tiles = ['yellow', 'pink', null, null]
    state.ice = [1, 0, 0, 0]
    state.swimmers = [{ id: 'test', color: 'yellow', energy: 2, age: 0 }]
    const cracked = stepTide(state, 2)
    expect(cracked.tiles[0]).toBe('yellow')
    expect(cracked.ice[0]).toBe(0)
    expect(cracked.swimmers[0].energy).toBe(1)
    expect(cracked.shots[0].cracked).toBe(true)
    expect(rayTarget(cracked.tiles, 2, 3, 1)).toBe(0)
    const cleared = stepTide(cracked, 2)
    expect(cleared.tiles[0]).toBeNull()
    expect(cleared.clearedColors).toContain('yellow')
    expect(cleared.combo).toBe(2)
    expect(state.ice[0]).toBe(1) // Old snapshots remain valid for undo.
  })
  it('does not crack ice with the wrong color', () => {
    const state = createTide(TIDE_LEVELS[5])
    state.swimmers = [{ id: 'wrong', color: 'purple', energy: 3, age: 0 }]
    const next = settle(state, 8)
    expect(next.ice).toEqual(state.ice)
    expect(next.pool[0].energy).toBe(3)
  })
  it('conserves ammo against remaining tiles plus ice during concurrent play', () => {
    let state = createTide(TIDE_LEVELS[9])
    for (let tick = 0; tick < 4000 && state.phase === 'playing'; tick++) {
      const move = hintMove(state, 12)
      if (move && tick % 5 === 0) state = launch(state, move.source, move.index)
      const next = stepTide(state, 12)
      expect(energy(next)).toBe(next.tiles.filter(Boolean).length + next.ice.reduce((sum, n) => sum + n, 0))
      expect(next.ice.every((n, i) => n === 0 || Boolean(next.tiles[i]))).toBe(true)
      state = next
    }
    expect(state.phase).toBe('won')
  })
  it('expires a combo after a quiet interval without losing the best streak', () => {
    const state = createTide(TIDE_LEVELS[0])
    state.combo = 8; state.bestCombo = 8; state.lastHitTick = 0; state.tick = 12
    const next = stepTide(state, 8)
    expect(next.combo).toBe(0)
    expect(next.bestCombo).toBe(8)
  })
})
