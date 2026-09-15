import type { LevelDefinition } from '../game/types'
import { PixelArtThumbnail } from './PixelGrid'

type StageSelectProps = {
  levels: LevelDefinition[]
  completedLevels: number[]
  highestUnlockedLevel: number
  onSelect: (levelId: number) => void
  onStart: () => void
}

export function StageSelect({ levels, completedLevels, highestUnlockedLevel, onSelect, onStart }: StageSelectProps) {
  const nextLevel = Math.min(highestUnlockedLevel, levels.length)

  return (
    <main className="stage-select-page">
      <section className="select-hero">
        <div className="hero-orbit-decoration" aria-hidden="true">
          <span className="hero-dot hero-dot--yellow" />
          <span className="hero-dot hero-dot--pink" />
          <span className="hero-dot hero-dot--aqua" />
        </div>
        <div className="brand-lockup">
          <span className="brand-kicker">012S · JELLY SERIES</span>
          <h1>Jelly <span>Orbit</span></h1>
          <p>Read the layers. Choose the colour. Let the orbit do the work.</p>
        </div>
        <div className="hero-jelly-stack" aria-hidden="true">
          <span className="hero-mini-jelly hero-mini-jelly--pink" />
          <span className="hero-mini-jelly hero-mini-jelly--yellow" />
          <span className="hero-mini-jelly hero-mini-jelly--green" />
        </div>
        <button className="primary-button hero-start" type="button" onClick={onStart}>
          <span>Continue orbit</span>
          <span className="button-arrow">→</span>
        </button>
      </section>

      <section className="stage-list-section" aria-labelledby="stage-list-heading">
        <div className="section-heading-row">
          <div>
            <span className="section-eyebrow">YOUR MAP</span>
            <h2 id="stage-list-heading">Choose a stage</h2>
          </div>
          <span className="progress-count">{completedLevels.length}/{levels.length} cleared</span>
        </div>
        <div className="stage-grid">
          {levels.map((level) => {
            const completed = completedLevels.includes(level.id)
            const unlocked = level.id <= highestUnlockedLevel
            return (
              <button
                key={level.id}
                type="button"
                className={`stage-card ${completed ? 'stage-card--completed' : ''} ${unlocked ? '' : 'stage-card--locked'}`}
                disabled={!unlocked}
                onClick={() => onSelect(level.id)}
                aria-label={unlocked ? `Stage ${String(level.id).padStart(2, '0')}, ${level.name}` : `Stage ${level.id}, locked`}
              >
                <span className="stage-card-number">{String(level.id).padStart(2, '0')}</span>
                <span className="stage-card-thumb">
                  {completed ? <PixelArtThumbnail pixels={level.pixels} label={`${level.name} completed`} /> : <span className="stage-question">?</span>}
                </span>
                <span className="stage-card-footer">
                  <span>{level.name}</span>
                  <span className="stage-card-status">{completed ? '✓' : unlocked ? 'GO' : 'LOCK'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <footer className="select-footer">
        <span><i className="footer-orb" /> Outside first. Always.</span>
        <span>Phase 1 · 15 original patterns</span>
      </footer>
    </main>
  )
}
