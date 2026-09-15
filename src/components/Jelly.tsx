import type { ButtonHTMLAttributes } from 'react'
import type { JellyColor, JellyUnit } from '../game/types'

type JellySize = 'small' | 'medium' | 'large'

export function JellyVisual({ color, size = 'medium', energy, className = '' }: { color: JellyColor; size?: JellySize; energy?: number; className?: string }) {
  return (
    <span className={`jelly jelly--${color} jelly--${size} ${className}`} aria-hidden="true">
      <span className="jelly-shine" />
      <span className="jelly-face">
        <span className="jelly-eye" />
        <span className="jelly-eye" />
        <span className="jelly-mouth" />
      </span>
      <span className="jelly-bottom" />
      {typeof energy === 'number' && <span className="jelly-energy-badge">{energy}</span>}
    </span>
  )
}

type JellyButtonProps = {
  jelly: JellyUnit
  source: 'queue' | 'pool'
  disabled?: boolean
  onClick: () => void
  compact?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>

export function JellyButton({ jelly, source, disabled = false, onClick, compact = false, ...props }: JellyButtonProps) {
  const label = `${jelly.color[0].toUpperCase()}${jelly.color.slice(1)} Jelly, ${jelly.energy} energy`
  return (
    <button
      {...props}
      type="button"
      className={`jelly-button jelly-button--${source} ${compact ? 'jelly-button--compact' : ''}`}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={`${source}-jelly-${jelly.id}`}
    >
      <JellyVisual color={jelly.color} size={compact ? 'small' : 'medium'} />
      <span className="jelly-button-info">
        <span className={`color-dot color-dot--${jelly.color}`} />
        <strong>{jelly.energy}</strong>
        <small>ENERGY</small>
      </span>
      <span className="jelly-button-label">{source === 'pool' ? 'stored' : 'ready'}</span>
    </button>
  )
}
