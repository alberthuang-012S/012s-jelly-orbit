import { expect, it } from 'vitest'
import { nextStageIndex, parseTideProgress } from './tideProgress'

it('preserves the existing five completions and starts at stage six', () => {
  const completed = parseTideProgress('[1,2,3,4,5]')
  expect(completed).toEqual([1, 2, 3, 4, 5])
  expect(nextStageIndex(completed)).toBe(5)
})
it('keeps new completions, filters invalid values, and finds the first gap', () => {
  const completed = parseTideProgress('[10,1,1,2,4,6,"3",0,11,null]')
  expect(completed).toEqual([1, 2, 4, 6, 10])
  expect(nextStageIndex(completed)).toBe(2)
  expect(nextStageIndex([1,2,3,4,5,6,7,8,9,10])).toBe(9)
  expect(parseTideProgress('broken')).toEqual([])
})
