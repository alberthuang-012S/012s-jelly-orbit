import { TIDE_LEVELS } from '../game/tide'

// Keep the existing key: a five-stage save automatically unlocks stage six.
export const TIDE_SAVE_KEY = 'jellyOrbitTideV2'
export function parseTideProgress(raw: string | null): number[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(value)
      ? [...new Set(value.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= TIDE_LEVELS.length))].sort((a, b) => a - b)
      : []
  } catch { return [] }
}
export function readTideProgress(): number[] {
  try { return parseTideProgress(localStorage.getItem(TIDE_SAVE_KEY)) } catch { return [] }
}
export function nextStageIndex(completed: number[]): number {
  const index = TIDE_LEVELS.findIndex(level => !completed.includes(level.id))
  return index < 0 ? TIDE_LEVELS.length - 1 : index
}
export function hasSeenIce(): boolean {
  try { return localStorage.getItem('jellyOrbitIceIntroV1') === 'seen' } catch { return false }
}
export function rememberIce(): void {
  try { localStorage.setItem('jellyOrbitIceIntroV1', 'seen') } catch { /* Optional tutorial memory. */ }
}
