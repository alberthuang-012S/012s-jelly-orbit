import { useEffect, useRef, useState } from 'react'
import { CAPACITY, COLORS, COLOR_NAMES, HEX, POOL_SIZE, TICK_MS, TIDE_LEVELS, canHit, createTide, hintMove, launch, orbitPoint, stepTide } from './game/tide'
import type { TideState } from './game/tide'
import type { JellyColor, JellyUnit } from './game/types'

const art = import.meta.glob('../reference/jellyfish-3d/jelly-normal-{yellow,pink,aqua,green,purple}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const imageFor = (color: JellyColor) => art[`../reference/jellyfish-3d/jelly-normal-${color}.webp`]
const SAVE_KEY = 'jellyOrbitTideV2'
function readSave(): number[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]'); return Array.isArray(value) ? [...new Set(value.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= 5))] : [] } catch { return [] }
}
function Jelly({ jelly, small = false }: { jelly: JellyUnit; small?: boolean }) {
  return <span className={`jelly-art ${small ? 'small' : ''}`}><img src={imageFor(jelly.color)} alt="" draggable={false} /><b style={{ background: HEX[jelly.color] }}>{jelly.energy}</b></span>
}
function MiniArt({ tiles, size }: { tiles: (JellyColor | null)[]; size: number }) {
  return <span className="mini-art" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>{tiles.map((c, i) => <i key={i} style={{ background: c ? HEX[c] : 'transparent' }} />)}</span>
}

export default function App() {
  const [completed, setCompleted] = useState(readSave)
  const [levelIndex, setLevelIndex] = useState(() => Math.min(readSave().length, 4))
  const level = TIDE_LEVELS[levelIndex]
  const [game, setGame] = useState<TideState>(() => createTide(TIDE_LEVELS[Math.min(readSave().length, 4)]))
  const [overlay, setOverlay] = useState<'help' | 'map' | null>(null)
  const [muted, setMuted] = useState(true)
  const [fast, setFast] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [notice, setNotice] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [history, setHistory] = useState<TideState[]>([])
  const audio = useRef<AudioContext | null>(null)
  const lastSound = useRef(-1)
  useEffect(() => {
    if (!overlay && game.phase === 'playing') return
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    const previous = document.activeElement as HTMLElement | null
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) setOverlay(null)
      if (event.key !== 'Tab' || !dialog) return
      const buttons = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [overlay, game.phase])
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (overlay || paused || hidden || game.phase !== 'playing' || !game.swimmers.length) return
    const timer = window.setInterval(() => setGame(s => stepTide(s, level.size)), fast ? TICK_MS / 2 : TICK_MS)
    return () => window.clearInterval(timer)
  }, [overlay, paused, hidden, game.phase, game.swimmers.length, fast, level.size])
  useEffect(() => {
    if (!notice && !hint) return
    const timer = window.setTimeout(() => { setNotice(''); setHint(null) }, 4000)
    return () => clearTimeout(timer)
  }, [notice, hint])
  useEffect(() => {
    if (game.phase !== 'won') return
    setCompleted(previous => {
      const next = [...new Set([...previous, level.id])].sort((a, b) => a - b)
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* Play remains available without storage. */ }
      return next
    })
  }, [game.phase, level.id])
  useEffect(() => {
    if (muted || !game.shots.length || lastSound.current === game.tick || !audio.current) return
    lastSound.current = game.tick
    const ctx = audio.current
    const oscillator = ctx.createOscillator(), gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(480 + COLORS.indexOf(game.shots[0].color) * 95, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + .07)
    gain.gain.setValueAtTime(.035, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12)
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .13)
  }, [game.tick, game.shots, muted])
  useEffect(() => () => { void audio.current?.close() }, [])

  function start(index: number) {
    setLevelIndex(index); setGame(createTide(TIDE_LEVELS[index])); setHistory([]); setHint(null); setNotice(''); setOverlay(null); setPaused(false); lastSound.current = -1
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function send(source: 'lane' | 'pool', index: number) {
    if (paused || overlay) return
    const next = launch(game, source, index)
    if (next === game) {
      setNotice(game.swimmers.length >= CAPACITY ? '軌道上有 3 隻水母，等夥伴返航就能出發。' : '返航位置已預留滿，先派等待區的水母。')
      return
    }
    setHistory(h => [...h.slice(-19), game]); setGame(next); setHint(null); setNotice('')
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setGame(previous); setHistory(h => h.slice(0, -1)); setHint(null); setNotice('已回到上一次派遣前。'); lastSound.current = -1
  }
  function showHint() {
    const next = hintMove(game, level.size)
    if (!next || game.swimmers.length >= CAPACITY) { setNotice('先讓軌道上的夥伴前進，再看看露出的顏色。'); return }
    setHint(`${next.source}-${next.index}`)
    setNotice(next.source === 'pool' ? '這隻水母有目標了！派牠出發，釋放等待位置。' : canHit(game, game.lanes[next.index][0].color, level.size) ? '這個顏色露出來了，試試發光的水母。' : '先讓這位夥伴去小棧等待，露出後排水母。')
  }
  async function toggleSound() {
    if (muted) {
      try { audio.current ??= new AudioContext(); await audio.current.resume(); setMuted(false) } catch { setNotice('這個瀏覽器暫時無法播放音效。') }
    } else setMuted(true)
  }
  const left = game.tiles.filter(Boolean).length
  const progress = Math.round((1 - left / level.tiles.filter(Boolean).length) * 100)
  const canPlay = !paused && !overlay && game.phase === 'playing'

  return <div className="ocean-app">
    <div inert={Boolean(overlay) || game.phase !== 'playing'}>
    <header className="site-header"><a className="wordmark" href="#" onClick={e => { e.preventDefault(); setOverlay('map') }}><span className="brand-symbol">✳</span> jelly<span>orbit</span><small>012S STUDIO</small></a><div className="header-actions"><span className="edition">一場繽紛的海底小旅行</span><button className="circle-button" onClick={() => void toggleSound()} aria-label={muted ? '開啟音效' : '關閉音效'}>{muted ? '♪' : '♫'}<span className={`sound-dot ${muted ? '' : 'on'}`} /></button><button className="circle-button" onClick={() => setOverlay('help')} aria-label="遊戲說明">?</button></div></header>
    <main className="main-layout">
      <aside className="story-panel"><span className="eyebrow">A LITTLE OCEAN ESCAPE</span><h1>讓心情，<br />順著海流<span>慢慢放晴。</span></h1><p>和水母一起繞個圈，<br />把眼前的色彩，一點點解開。</p><div className="hero-jelly"><img src={imageFor('aqua')} alt="海藍色水母夥伴" /><span className="floating-spark one">✦</span><span className="floating-spark two">✧</span><span className="hero-label">今天，也一起漂流吧。</span></div><div className="story-bottom"><span>01 — 05</span><i /><span>珊瑚海篇</span></div></aside>
      <section className="game-shell" aria-label="Jelly Orbit 遊戲">
        <div className="level-bar"><button className="circle-button map-button" onClick={() => setOverlay('map')} aria-label="開啟關卡地圖">▦</button><div><span className="eyebrow">CORAL SEA · {String(level.id).padStart(2, '0')}</span><h2>{level.name}</h2></div><button className="circle-button" onClick={() => setPaused(p => !p)} aria-label={paused ? '繼續遊戲' : '暫停遊戲'}>{paused ? '▶' : 'Ⅱ'}</button></div>
        <div className="progress-row"><span>海洋修復中 <b>{progress}%</b></span><span>{left} <small>色塊</small></span></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
        <div className={`playfield ${paused ? 'is-paused' : ''}`}>
          <div className="water-dots" /><span className="reef reef-one">✳</span><span className="reef reef-two">✳</span>
          <svg className="orbit-svg" viewBox="0 0 100 100" aria-hidden="true"><rect className="track-shadow" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-base" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-dashes" x="14" y="14" width="72" height="72" rx="9" /><path d="M49 14h3l-1.5-1.5M86 49v3l1.5-1.5M51 86h-3l1.5 1.5M14 51v-3l-1.5 1.5" className="track-arrows" /></svg>
          <div className="pixel-board" style={{ gridTemplateColumns: `repeat(${level.size}, 1fr)` }} role="img" aria-label={`色塊圖案，剩下 ${left} 格`}>
            {game.tiles.map((color, index) => <span key={index} className={`pixel ${color ? 'alive' : ''} ${game.shots.some(s => s.target === index) ? 'just-popped' : ''}`} style={{ '--tile': color ? HEX[color] : 'transparent' } as React.CSSProperties}>{color && <i />}</span>)}
          </div>
          <svg className="shot-svg" viewBox="0 0 100 100" aria-hidden="true">{game.shots.map(shot => { const x = 25 + ((shot.target % level.size) + .5) * 50 / level.size, y = 25 + (Math.floor(shot.target / level.size) + .5) * 50 / level.size; return <g key={shot.id} className="shot"><line x1={shot.from[0]} y1={shot.from[1]} x2={x} y2={y} stroke={HEX[shot.color]} /><circle cx={x} cy={y} r="2" fill={HEX[shot.color]} /></g> })}</svg>
          {game.swimmers.map(jelly => { const [x, y] = orbitPoint(jelly.age, level.size); return <div className="swimmer" key={jelly.id} style={{ left: `${x}%`, top: `${y}%`, transitionDuration: `${fast ? TICK_MS / 2 : TICK_MS}ms` }}><Jelly jelly={jelly} small /></div> })}
          <div className="orbit-status"><span className={game.swimmers.length ? 'live-indicator' : ''} />{game.swimmers.length ? `${game.swimmers.length} / 3 位夥伴航行中` : '點擊下方水母 · 開始漂流'}</div>
          {paused && <div className="pause-cover"><span>海流暫停了</span><button className="primary" onClick={() => setPaused(false)}>繼續漂流 ▶</button></div>}
        </div>
        <div className={`dock ${game.pool.length + game.swimmers.length >= 4 ? 'dock-warning' : ''}`}><div className="section-label"><h3>返航小棧 <span>WAITING BAY</span></h3><b>{game.pool.length}<span> / 5</span></b></div><div className="dock-slots">{Array.from({ length: POOL_SIZE }, (_, i) => { const jelly = game.pool[i]; return jelly ? <button key={jelly.id} className={`dock-slot occupied ${hint === `pool-${i}` ? 'hinted' : ''}`} onClick={() => send('pool', i)} disabled={!canPlay} aria-label={`派遣等待區${COLOR_NAMES[jelly.color]}水母，${jelly.energy}發泡泡`}><Jelly jelly={jelly} small />{canHit(game, jelly.color, level.size) && <span className="ready-dot" />}</button> : <div className={`dock-slot ${i < game.pool.length + game.swimmers.length ? 'reserved' : ''}`} key={`empty-${i}`}><span>{i < game.pool.length + game.swimmers.length ? '↩' : '·'}</span></div> })}</div><p>{game.pool.length + game.swimmers.length >= 4 ? '位置快滿了，優先派出返航的夥伴。' : '還有泡泡的水母會回來，點一下再出發。'}</p></div>
        <div className="queue-section"><div className="section-label"><h3>準備出發 <span>YOUR CREW</span></h3><span className="tap-label">↓ 點最前排</span></div><div className="lanes">{game.lanes.map((lane, index) => <div className="lane" key={index}>{lane.length ? <><div className="lane-back">{lane.slice(1, 3).reverse().map(j => <span key={j.id} className="queued-jelly"><Jelly jelly={j} small /></span>)}</div><button className={`launch-button ${hint === `lane-${index}` ? 'hinted' : ''}`} onClick={() => send('lane', index)} disabled={!canPlay} style={{ '--jelly-color': HEX[lane[0].color] } as React.CSSProperties} aria-label={`派遣第${index + 1}列${COLOR_NAMES[lane[0].color]}水母，${lane[0].energy}發泡泡`}><Jelly jelly={lane[0]} /><span>{COLOR_NAMES[lane[0].color]} <i>↑</i></span></button><small>還有 {lane.length - 1} 位夥伴</small></> : <div className="lane-empty">✓<small>全員出發</small></div>}</div>)}</div></div>
        <div className="game-tools"><button onClick={undo} disabled={!history.length || !!overlay}><span>↶</span>撤回</button><button onClick={showHint} disabled={!canPlay}><span>☼</span>提示</button><button onClick={() => setFast(f => !f)} className={fast ? 'selected' : ''}><span>»</span>{fast ? '2× 速度' : '1× 速度'}</button><button onClick={() => start(levelIndex)}><span>⟳</span>重玩</button></div>
        <div className={`status-message ${notice ? 'has-notice' : ''}`} role="status">{notice || (level.id === 1 ? '相同顏色才會消除，數字是剩餘泡泡。' : level.subtitle)}</div>
      </section>
      <aside className="collection-panel"><div className="collection-heading"><span className="eyebrow">LITTLE TREASURES</span><h2>我的海洋圖鑑 <span>{completed.length}/5</span></h2><p>每一趟漂流，都留下一點美好。</p></div><div className="collection-list">{TIDE_LEVELS.map((l, index) => { const unlocked = index === 0 || completed.includes(index); return <button className={`collection-card ${levelIndex === index ? 'current' : ''}`} key={l.id} disabled={!unlocked} onClick={() => start(index)}><span className={`collection-art ${completed.includes(l.id) ? 'collected' : ''}`}><MiniArt tiles={l.tiles} size={l.size} /></span><span><small>NO. {String(l.id).padStart(2, '0')}</small><strong>{l.name}</strong><em>{completed.includes(l.id) ? '已收藏' : levelIndex === index ? '正在探索' : unlocked ? '出發探索' : '等待發現'}</em></span><b>{completed.includes(l.id) ? '✓' : unlocked ? '↗' : '·'}</b></button> })}</div><div className="field-note"><span>✧ 小小航海筆記</span><p>不用急著派出所有夥伴。<br />留一點空間，好事就會發生。</p><i>Take your time. Find your flow.</i></div></aside>
    </main><footer className="site-footer"><span>012S · JELLY ORBIT</span><span>沒有倒數，只有剛剛好的步調。</span><span>MADE FOR A LITTLE JOY</span></footer>
    </div>
    {overlay && <div className="modal-backdrop" onClick={() => setOverlay(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={overlay === 'help' ? '遊戲說明' : '關卡地圖'} onClick={e => e.stopPropagation()}><button autoFocus className="modal-close circle-button" onClick={() => setOverlay(null)} aria-label="關閉">×</button><span className="eyebrow">{overlay === 'help' ? 'FIND YOUR FLOW' : 'YOUR OCEAN JOURNEY'}</span><h2>{overlay === 'help' ? '一起，繞個圈。' : '下一站，去哪裡？'}</h2>{overlay === 'help' ? <><img className="help-jelly" src={imageFor('pink')} alt="蜜桃水母" /><ol className="help-steps"><li><b>點最前排，出發！</b><span>最多 3 隻水母同時環繞，數字是剩餘泡泡。</span></li><li><b>同色命中，層層打開。</b><span>水母向內射擊，前方色塊會擋住後面的目標。</span></li><li><b>返航了，再試一次。</b><span>剩餘泡泡會回到 5 格小棧。↩ 是航行夥伴預留的位置；有綠點表示目前有同色目標。</span></li><li><b>留點空間給下一步。</b><span>小棧塞滿且沒有任何水母能消除，就需要撤回或重玩。隨時可以暫停，沒有時間限制。</span></li></ol></> : <div className="map-list">{TIDE_LEVELS.map((l, i) => <button key={l.id} disabled={i > 0 && !completed.includes(i)} onClick={() => start(i)}><MiniArt tiles={l.tiles} size={l.size} /><span><small>STAGE {l.id}</small><b>{l.name}</b></span><em>{completed.includes(l.id) ? '✓' : i === 0 || completed.includes(i) ? '→' : '未解鎖'}</em></button>)}</div>}<button className="primary" onClick={() => setOverlay(null)}>{overlay === 'help' ? '知道了，開始漂流 →' : '回到海流'}</button></section></div>}
    {game.phase !== 'playing' && !overlay && <div className="modal-backdrop"><section className="modal result-modal" role="dialog" aria-modal="true" aria-label={game.phase === 'won' ? '關卡完成' : '等待區已滿'}><span className="eyebrow">{game.phase === 'won' ? 'A LITTLE TREASURE, JUST FOR YOU' : 'LET’S FIND ANOTHER WAY'}</span>{game.phase === 'won' ? <div className="treasure-art"><MiniArt tiles={level.tiles} size={level.size} /><span>✦</span></div> : <img className="help-jelly" src={imageFor('purple')} alt="等待出發的水母" />}<h2>{game.phase === 'won' ? '把美好，收進海裡。' : '海流有點塞住了。'}</h2><p>{game.phase === 'won' ? `「${level.name}」已加入圖鑑。你完成了 ${completed.length} / 5 段旅程！` : '等待區已滿，外層也沒有能命中的顏色。換個出發順序，再試試看。'}</p><button autoFocus className="primary" onClick={() => game.phase === 'won' ? (levelIndex < 4 ? start(levelIndex + 1) : setOverlay('map')) : undo()}>{game.phase === 'won' ? (levelIndex < 4 ? '下一片海，出發 →' : '欣賞我的海洋圖鑑 →') : '撤回上一次派遣 ↶'}</button><button className="text-button" onClick={() => start(levelIndex)}>再玩一次</button></section></div>}
  </div>
}
