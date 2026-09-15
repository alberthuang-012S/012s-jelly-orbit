import type { JellyUnit } from '../game/types'
import { JellyVisual } from './Jelly'

export function Orbit({ activeJelly, resolving, attackCount = 0, attackIndex = 0 }: { activeJelly: JellyUnit | null; resolving: boolean; attackCount?: number; attackIndex?: number }) {
  return (
    <div className={`orbit-scene ${resolving ? 'orbit-scene--resolving' : ''}`} aria-label="Jelly Orbit">
      <div className="orbit-halo" />
      <div className="orbit-ring orbit-ring--outer" />
      <div className="orbit-ring orbit-ring--inner" />
      <div className="orbit-spark orbit-spark--one" />
      <div className="orbit-spark orbit-spark--two" />
      <div className="orbit-spark orbit-spark--three" />
      {activeJelly && (
        <div className="orbit-runner">
          <JellyVisual color={activeJelly.color} size="small" />
        </div>
      )}
      {resolving && activeJelly && (
        <div className="orbit-energy-readout" aria-live="polite">
          <span>ENERGY</span>
          <strong>{activeJelly.energy}</strong>
        </div>
      )}
      <div className="orbit-caption">
        <span className="orbit-caption-dot" />
        {resolving ? `ORBITING · ${String(attackIndex).padStart(2, '0')}/${attackCount} POP${attackCount === 1 ? '' : 'S'}` : 'JELLY ORBIT'}
      </div>
    </div>
  )
}
