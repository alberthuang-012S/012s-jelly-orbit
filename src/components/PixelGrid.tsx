import type { CSSProperties } from 'react'
import type { PixelCellMatrix, PixelMatrix } from '../game/types'

type PixelGridProps = {
  pixels: PixelCellMatrix
  popIds?: string[]
  bubbleId?: string | null
  revealIds?: string[]
  thumbnail?: boolean
  label?: string
}

const colorVar = (color: string) => `var(--${color})`

export function PixelGrid({ pixels, popIds = [], bubbleId = null, revealIds = [], thumbnail = false, label = 'Pixel art board' }: PixelGridProps) {
  const width = pixels[0]?.length ?? 0
  const revealSet = new Set(revealIds)
  const popSet = new Set(popIds)
  const bubbleTarget = bubbleId ? pixels.flat().find((cell) => cell?.id === bubbleId) : null
  const bubbleStyle = bubbleTarget
    ? ({
        '--bubble-target-x': `${((bubbleTarget.col + 0.5) / width) * 100}%`,
        '--bubble-target-y': `${((bubbleTarget.row + 0.5) / pixels.length) * 100}%`,
        '--bubble-start-x': bubbleTarget.col < width / 2 ? '6%' : '94%',
        '--bubble-start-y': bubbleTarget.row < pixels.length / 2 ? '18%' : '82%',
      } as CSSProperties)
    : undefined

  return (
    <div
      className={`pixel-grid ${thumbnail ? 'pixel-grid--thumbnail' : ''}`}
      style={{ '--pixel-columns': width } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {bubbleTarget && (
        <span className={`attack-bubble attack-bubble--${bubbleTarget.color}`} style={bubbleStyle} aria-hidden="true">
          <span className="attack-bubble-core" />
          <span className="attack-bubble-ring" />
        </span>
      )}
      {pixels.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (!cell) return <span className="pixel-cell pixel-cell--empty" key={`empty-${rowIndex}-${colIndex}`} aria-hidden="true" />
          const isPopping = popSet.has(cell.id) && !cell.alive
          const isReveal = revealSet.has(cell.id)
          const className = [
            'pixel-cell',
            `pixel-cell--${cell.color}`,
            cell.alive ? 'pixel-cell--alive' : 'pixel-cell--dead',
            isPopping ? 'pixel-cell--popping' : '',
            isReveal ? 'pixel-cell--revealed' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <span
              className={className}
              key={cell.id}
              style={{ '--pixel-fill': colorVar(cell.color) } as CSSProperties}
              aria-hidden="true"
            >
              {cell.alive && <span className="pixel-glint" />}
              {isPopping && <span className="pixel-pop-ring" />}
            </span>
          )
        }),
      )}
    </div>
  )
}

export function PixelArtThumbnail({ pixels, label = 'Completed pixel art' }: { pixels: PixelMatrix; label?: string }) {
  const cells = pixels.map((row, rowIndex) =>
    row.map((color, colIndex) =>
      color
        ? {
            id: `thumbnail-${rowIndex}-${colIndex}`,
            row: rowIndex,
            col: colIndex,
            color,
            alive: true,
            exposed: true,
          }
        : null,
    ),
  )
  return <PixelGrid pixels={cells} thumbnail label={label} />
}
