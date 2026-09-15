import type { LevelDefinition } from '../game/types'
import { PixelArtThumbnail } from './PixelGrid'

export function WinModal({ level, onNext, onReplay, hasNext }: { level: LevelDefinition; onNext: () => void; onReplay: () => void; hasNext: boolean }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="result-card result-card--win">
        <span className="result-kicker">ORBIT COMPLETE · STAGE {String(level.id).padStart(2, '0')}</span>
        <div className="win-burst" aria-hidden="true"><span>✦</span><span>✧</span><span>·</span></div>
        <h2 id="win-title">Shape unlocked!</h2>
        <p>Every pixel found its way home.</p>
        <div className="collection-reward">
          <span className="collection-label">✦ COLLECTION UNLOCKED</span>
          <div className="collection-art"><PixelArtThumbnail pixels={level.pixels} label={`${level.name} collection art`} /></div>
          <span className="collection-name">Jelly #{String(level.id).padStart(2, '0')} · {level.name}</span>
        </div>
        <div className="result-actions">
          {hasNext && <button className="primary-button" type="button" onClick={onNext}>Next stage <span className="button-arrow">→</span></button>}
          <button className="secondary-button" type="button" onClick={onReplay}>Replay</button>
        </div>
      </div>
    </div>
  )
}

export function LoseModal({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lose-title">
      <div className="result-card result-card--lose">
        <span className="result-kicker">ORBIT PAUSED</span>
        <div className="lose-orbit-mark" aria-hidden="true">↻</div>
        <h2 id="lose-title">卡住了！</h2>
        <p>Jelly Pool 已經沒有空間，<br />試著調整出場順序。</p>
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={onRetry}>再試一次 <span className="button-arrow">↻</span></button>
          <button className="secondary-button" type="button" onClick={onBack}>回到關卡</button>
        </div>
      </div>
    </div>
  )
}
