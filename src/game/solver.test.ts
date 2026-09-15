import { describe, expect, it } from 'vitest'
import { LEVELS } from '../levels'
import { solveLevel } from './solver'
import { validateLevels } from './validator'

describe('Jelly Orbit hand-authored levels', () => {
  it('contains 15 levels', () => {
    expect(LEVELS).toHaveLength(15)
  })

  it('passes validator checks for every level', () => {
    const results = validateLevels(LEVELS)
    expect(results.every((result) => result.validDimensions)).toBe(true)
    expect(results.every((result) => result.validColors)).toBe(true)
    expect(results.every((result) => result.queueNotEmpty)).toBe(true)
    expect(results.every((result) => result.totalEnergySufficient)).toBe(true)
    expect(results.every((result) => result.uniqueJellyIds)).toBe(true)
    expect(results.every((result) => result.colorsHaveEnergy)).toBe(true)
    expect(results.every((result) => result.solvable), JSON.stringify(results.filter((result) => !result.solvable))).toBe(true)
  })

  it('records a deterministic solution path for every level', () => {
    for (const level of LEVELS) {
      const first = solveLevel(level)
      const second = solveLevel(level)
      expect(first.solvable).toBe(true)
      expect(first.solution.length).toBeGreaterThan(0)
      expect(first.solution).toEqual(second.solution)
    }
  })
})
