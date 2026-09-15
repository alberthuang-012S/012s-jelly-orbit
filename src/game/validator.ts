import { JELLY_COLORS } from './types'
import { countAlivePixels } from './engine'
import { solveLevel } from './solver'
import type { JellyColor, LevelDefinition, LevelValidationResult, ValidationIssue } from './types'

const ALLOWED_SIZES = new Set([8, 10, 12])
const COLOR_SET = new Set<string>(JELLY_COLORS)

export function validateLevel(level: LevelDefinition): LevelValidationResult {
  const issues: ValidationIssue[] = []
  const dimensionsMatch = level.pixels.length === level.height && level.pixels.every((row) => row.length === level.width)
  const validDimensions = dimensionsMatch && ALLOWED_SIZES.has(level.width) && ALLOWED_SIZES.has(level.height)
  if (!validDimensions) issues.push({ levelId: level.id, message: 'invalid dimensions' })

  const pixelColors = level.pixels.flat()
  const validColors = pixelColors.every((color) => color === null || COLOR_SET.has(color))
  if (!validColors) issues.push({ levelId: level.id, message: 'invalid pixel color' })

  const queueNotEmpty = level.queue.length > 0
  if (!queueNotEmpty) issues.push({ levelId: level.id, message: 'queue is empty' })

  const counts = new Map<JellyColor, number>()
  pixelColors.forEach((color) => {
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1)
  })
  const energyByColor = new Map<JellyColor, number>()
  level.queue.forEach((jelly) => energyByColor.set(jelly.color, (energyByColor.get(jelly.color) ?? 0) + jelly.energy))
  const totalEnergySufficient = [...counts.entries()].every(([color, count]) => (energyByColor.get(color) ?? 0) >= count)
  if (!totalEnergySufficient) issues.push({ levelId: level.id, message: 'total energy is insufficient' })

  const ids = level.queue.map((jelly) => jelly.id)
  const uniqueJellyIds = new Set(ids).size === ids.length
  if (!uniqueJellyIds) issues.push({ levelId: level.id, message: 'duplicate jelly id' })

  const colorsHaveEnergy = [...counts.keys()].every((color) => (energyByColor.get(color) ?? 0) > 0)
  if (!colorsHaveEnergy) issues.push({ levelId: level.id, message: 'pixel color has no jelly energy' })

  const solver = validDimensions && validColors && queueNotEmpty && totalEnergySufficient && uniqueJellyIds && colorsHaveEnergy ? solveLevel(level) : null
  const solvable = solver?.solvable ?? false
  if (!solvable) issues.push({ levelId: level.id, message: 'level is not solvable' })

  return {
    levelId: level.id,
    validDimensions,
    validColors,
    queueNotEmpty,
    totalEnergySufficient,
    uniqueJellyIds,
    colorsHaveEnergy,
    solvable,
    issues,
  }
}

export function validateLevels(levels: LevelDefinition[]): LevelValidationResult[] {
  return levels.map(validateLevel)
}

export function summarizeLevel(level: LevelDefinition) {
  return {
    id: level.id,
    grid: `${level.width}×${level.height}`,
    colors: [...new Set(level.pixels.flat().filter((color): color is JellyColor => Boolean(color)))],
    pixelCount: countAlivePixels(
      level.pixels.map((row, rowIndex) =>
        row.map((color, colIndex) =>
          color
            ? { id: `${rowIndex}-${colIndex}`, row: rowIndex, col: colIndex, color, alive: true, exposed: false }
            : null,
        ),
      ),
    ),
    queueCount: level.queue.length,
  }
}
