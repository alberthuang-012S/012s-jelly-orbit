import { useEffect, useRef, useState } from 'react'
import { canSelectJelly, createInitialGame, resolveJellyTurn } from './game/engine'
import type { GameState, JellySource } from './game/types'
import { getLevel, LEVELS } from './levels'
import { Orbit } from './components/Orbit'
import { JellyButton } from './components/Jelly'
import { PixelGrid } from './components/PixelGrid'
import { LoseModal, WinModal } from './components/ResultModal'
import { StageSelect } from './components/StageSelect'
import { Tutorial } from './components/Tutorial'
import { completeLevel, completeTutorial, loadProgress, saveProgress, type JellyOrbitProgress } from './storage/progress'

type Screen = 'select' | 'game'

function clearTimer(timerRef: { current: number | null }) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

export default function App() {
  const [progress, setProgress] = useState<JellyOrbitProgress>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>('select')
  const [currentLevelId, setCurrentLevelId] = useState(1)
  const [game, setGame] = useState<GameState | null>(null)
  const [displayPixels, setDisplayPixels] = useState<GameState['pixels']>([])
  const [activeJelly, setActiveJelly] = useState<GameState['activeJelly']>(null)
  const [popId, setPopId] = useState<string | null>(null)
  const [revealIds, setRevealIds] = useState<string[]>([])
  const [attackCount, setAttackCount] = useState(0)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  const currentLevel = getLevel(currentLevelId)

  useEffect(() => () => clearTimer(timerRef), [])

  useEffect(() => {
    if (game?.phase !== 'won') return
    if (progress.completedLevels.includes(currentLevelId)) return
    const nextProgress = completeLevel(progress, currentLevelId, LEVELS.length)
    setProgress(nextProgress)
    saveProgress(nextProgress)
  }, [currentLevelId, game?.phase, progress])

  function startLevel(levelId: number) {
    clearTimer(timerRef)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const level = getLevel(levelId)
    const initial = createInitialGame(level)
    setCurrentLevelId(levelId)
    setGame(initial)
    setDisplayPixels(initial.pixels)
    setActiveJelly(null)
    setPopId(null)
    setRevealIds([])
    setAttackCount(0)
    setScreen('game')
    setTutorialOpen(levelId === 1 && !progress.tutorialComplete)
  }

  function leaveGame() {
    clearTimer(timerRef)
    window.scrollTo({ top: 0, behavior: 'instant' })
    setGame(null)
    setActiveJelly(null)
    setScreen('select')
    setTutorialOpen(false)
  }

  function finishTutorial() {
    const nextProgress = completeTutorial(progress)
    setProgress(nextProgress)
    saveProgress(nextProgress)
    setTutorialOpen(false)
  }

  function playTurn(source: JellySource, jellyId: string) {
    if (!game || game.phase !== 'idle' || tutorialOpen) return
    const result = resolveJellyTurn(game, source, jellyId)
    if (!result.accepted || !result.selectedJelly) return

    clearTimer(timerRef)
    setActiveJelly(result.selectedJelly)
    setAttackCount(result.events.length)
    setDisplayPixels(result.beforePixels)
    setPopId(null)
    setRevealIds([])
    setGame({ ...result.state, phase: 'resolving' })

    let step = 0
    const advance = () => {
      if (step < result.events.length) {
        const event = result.events[step]
        setDisplayPixels(event.pixelsAfter)
        setPopId(event.poppedId)
        setRevealIds(event.newlyExposedIds)
        step += 1
        timerRef.current = window.setTimeout(advance, 125)
        return
      }

      timerRef.current = window.setTimeout(() => {
        setDisplayPixels(result.state.pixels)
        setGame(result.state)
        setActiveJelly(null)
        setPopId(null)
        setRevealIds([])
        timerRef.current = null
      }, result.events.length > 0 ? 230 : 300)
    }

    timerRef.current = window.setTimeout(advance, 95)
  }

  function retryLevel() {
    startLevel(currentLevelId)
  }

  if (screen === 'select') {
    return (
      <div className="app-shell">
        <StageSelect
          levels={LEVELS}
          completedLevels={progress.completedLevels}
          highestUnlockedLevel={progress.highestUnlockedLevel}
          onSelect={startLevel}
          onStart={() => startLevel(progress.highestUnlockedLevel)}
        />
      </div>
    )
  }

  if (!game) return null

  const queueSelectable = (jellyId: string) => game.phase !== 'resolving' && canSelectJelly(game, 'queue', jellyId)
  const poolSelectable = (jellyId: string) => game.phase !== 'resolving' && canSelectJelly(game, 'pool', jellyId)

  return (
    <div className="app-shell">
      <div className="game-page">
        <header className="game-header">
          <button className="icon-button back-button" type="button" onClick={leaveGame} aria-label="Back to stage select">←</button>
          <div className="game-title-lockup">
            <span className="brand-kicker">012S · JELLY SERIES</span>
            <h1>JELLY ORBIT</h1>
          </div>
          <div className="header-stage-mark">
            <span>STAGE</span>
            <strong>{String(currentLevel.id).padStart(2, '0')}</strong>
          </div>
          <button className="icon-button quiet-button" type="button" onClick={leaveGame} aria-label="Open stage map">⌘</button>
        </header>

        <main className="game-layout">
          <section className="play-column" aria-label={`Stage ${currentLevel.id}: ${currentLevel.name}`}>
            <div className="stage-intro-row">
              <div>
                <span className="section-eyebrow">{currentLevel.name.toUpperCase()}</span>
                <h2>Unlock the layers</h2>
              </div>
              <div className="remaining-counter">
                <span>PIXELS LEFT</span>
                <strong>{game.remainingPixelCount}</strong>
              </div>
            </div>

            <div className="board-card">
              <div className="board-note board-note--top"><span className="note-line" /> outside → inside</div>
              <div className="board-orbit-wrap">
                <Orbit activeJelly={activeJelly} resolving={game.phase === 'resolving'} attackCount={attackCount} />
                <div className="art-board">
                  <div className="art-board-inner">
                    <div className="art-board-header">
                      <span className="board-chip">PIXEL ART</span>
                      <span className="board-grid-size">{currentLevel.width} × {currentLevel.height}</span>
                    </div>
                    <PixelGrid pixels={displayPixels} popId={popId} revealIds={revealIds} label="Current Jelly Orbit pixel art" />
                    <div className="art-board-footer">
                      <span><i className="live-dot" /> {game.phase === 'resolving' ? 'orbit resolving' : 'choose your next colour'}</span>
                      <span className="tiny-orbit-mark">◌</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="board-note board-note--bottom">matching bubbles clear exposed pixels</div>
            </div>
          </section>

          <aside className="control-column">
            <section className="panel pool-panel" aria-labelledby="pool-heading">
              <div className="panel-heading">
                <div>
                  <span className="section-eyebrow">YOUR RESERVE</span>
                  <h2 id="pool-heading">Jelly Pool</h2>
                </div>
                <span className={`pool-capacity ${game.pool.length >= game.poolSize ? 'pool-capacity--full' : ''}`}>{game.pool.length}/{game.poolSize}</span>
              </div>
              <p className="panel-helper">Energy left over waits here.</p>
              <div className="pool-slots">
                {Array.from({ length: game.poolSize }, (_, index) => {
                  const jelly = game.pool[index]
                  return jelly ? (
                    <JellyButton
                      key={jelly.id}
                      jelly={jelly}
                      source="pool"
                      compact
                      disabled={!poolSelectable(jelly.id)}
                      onClick={() => playTurn('pool', jelly.id)}
                    />
                  ) : (
                    <div className="pool-slot pool-slot--empty" key={`empty-${index}`} aria-label="Empty Jelly Pool slot"><span>＋</span></div>
                  )
                })}
              </div>
            </section>

            <section className="panel queue-panel" aria-labelledby="queue-heading">
              <div className="panel-heading">
                <div>
                  <span className="section-eyebrow">NEXT IN LINE</span>
                  <h2 id="queue-heading">Available Jelly</h2>
                </div>
                <span className="queue-rule">tap to orbit</span>
              </div>
              <p className="panel-helper">Choose a colour. The orbit finds its matching layer.</p>
              <div className="queue-list">
                {game.queue.length > 0 ? game.queue.map((jelly) => (
                  <JellyButton
                    key={jelly.id}
                    jelly={jelly}
                    source="queue"
                    disabled={!queueSelectable(jelly.id)}
                    onClick={() => playTurn('queue', jelly.id)}
                  />
                )) : <div className="queue-empty">Queue clear · use a stored Jelly if one remains.</div>}
              </div>
            </section>

            <div className="thinking-note"><span className="thinking-spark">✦</span><span>There is no timer. A good orbit begins with a pause.</span></div>
          </aside>
        </main>
      </div>

      {tutorialOpen && <Tutorial onComplete={finishTutorial} />}
      {game.phase === 'won' && <WinModal level={currentLevel} onNext={() => startLevel(currentLevelId + 1)} onReplay={retryLevel} hasNext={currentLevelId < LEVELS.length} />}
      {game.phase === 'lost' && <LoseModal onRetry={retryLevel} onBack={leaveGame} />}
    </div>
  )
}
