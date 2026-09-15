export type JellyOrbitProgress = {
  completedLevels: number[]
  highestUnlockedLevel: number
  tutorialComplete: boolean
}

export const PROGRESS_KEY = 'jellyOrbitProgress'

const DEFAULT_PROGRESS: JellyOrbitProgress = {
  completedLevels: [],
  highestUnlockedLevel: 1,
  tutorialComplete: false,
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadProgress(): JellyOrbitProgress {
  if (!canUseStorage()) return { ...DEFAULT_PROGRESS }
  try {
    const saved = window.localStorage.getItem(PROGRESS_KEY)
    if (!saved) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(saved) as Partial<JellyOrbitProgress>
    const completedLevels = Array.isArray(parsed.completedLevels)
      ? parsed.completedLevels.filter((level): level is number => Number.isInteger(level) && level > 0)
      : []
    const highestUnlockedLevel = Math.max(1, Number(parsed.highestUnlockedLevel) || 1)
    return {
      completedLevels: [...new Set(completedLevels)].sort((a, b) => a - b),
      highestUnlockedLevel,
      tutorialComplete: Boolean(parsed.tutorialComplete),
    }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function saveProgress(progress: JellyOrbitProgress): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function completeLevel(progress: JellyOrbitProgress, levelId: number, totalLevels: number): JellyOrbitProgress {
  const completedLevels = [...new Set([...progress.completedLevels, levelId])].sort((a, b) => a - b)
  return {
    ...progress,
    completedLevels,
    highestUnlockedLevel: Math.min(totalLevels, Math.max(progress.highestUnlockedLevel, levelId + 1)),
  }
}

export function completeTutorial(progress: JellyOrbitProgress): JellyOrbitProgress {
  return { ...progress, tutorialComplete: true }
}
