import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { TideState } from '../game/tide'
import { COLOR_NAMES, HEX } from '../game/tide'

export function TideEffects({ game, size, fast }: { game: TideState; size: number; fast: boolean }) {
  const [celebration, setCelebration] = useState<{ text: string; tick: number } | null>(null)
  const previousTick = useRef(game.tick)
  const cleared = game.clearedColors.map(color => COLOR_NAMES[color]).join('、')
  useEffect(() => {
    if (game.tick < previousTick.current) setCelebration(null)
    else if (cleared) setCelebration({ text: `${cleared}全清！`, tick: game.tick })
    previousTick.current = game.tick
  }, [cleared, game.tick])
  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(() => setCelebration(null), 950)
    return () => window.clearTimeout(timer)
  }, [celebration])

  return <>
    <svg className="shot-svg bubble-effects" viewBox="0 0 100 100" aria-hidden="true">
      {game.effects.map(shot => {
        const x = 25 + ((shot.target % size) + .5) * 50 / size
        const y = 25 + (Math.floor(shot.target / size) + .5) * 50 / size
        const style = { '--dx': `${shot.from[0] - x}px`, '--dy': `${shot.from[1] - y}px`, '--flight': fast ? '65ms' : '130ms', '--effect': fast ? '170ms' : '340ms', '--burst': shot.cracked ? '#d7faff' : HEX[shot.color] } as CSSProperties
        return <g key={shot.id} style={style}>
          <circle className="flying-bubble" cx={x} cy={y} r="1.3" fill={HEX[shot.color]} stroke="white" strokeWidth=".45" />
          <g className={`bubble-impact ${shot.cracked ? 'ice-impact' : ''}`}>
            <circle className="impact-ring" cx={x} cy={y} r="2.4" />
            {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([dx, dy], i) => <path key={i} d={`M${x + dx} ${y + dy}l${dx * .7} ${dy * .7}`} />)}
          </g>
        </g>
      })}
    </svg>
    {game.combo >= 4 && game.swimmers.length > 0 && <div className={`combo-badge ${game.combo >= 12 ? 'combo-great' : ''}`} aria-hidden="true"><b>{game.combo}</b><span>{game.combo >= 12 ? '超順手！' : '連續命中'}</span></div>}
    {celebration && <div className="color-celebration" key={celebration.tick} aria-hidden="true">✦ {celebration.text}</div>}
  </>
}
