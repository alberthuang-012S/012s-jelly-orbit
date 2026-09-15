import { useState } from 'react'

const TUTORIAL_STEPS = [
  {
    kicker: '01 · PICK A COLOUR',
    title: 'Start with what is exposed',
    body: 'Only the pixels touching the outside can be popped. Look at the border of the art before you choose.',
    icon: '✦',
  },
  {
    kicker: '02 · FOLLOW THE ORBIT',
    title: 'Jelly bubbles do the clearing',
    body: 'Your Jelly travels the soft energy ring and spends one Energy on each matching exposed pixel.',
    icon: '◌',
  },
  {
    kicker: '03 · WATCH YOUR RESERVE',
    title: 'Energy left over goes to Pool',
    body: 'A Jelly with Energy remaining waits in the four-slot Jelly Pool. You can send it out again later.',
    icon: '◒',
  },
  {
    kicker: '04 · UNLOCK THE SHAPE',
    title: 'Clear every pixel to win',
    body: 'There is no timer. Think one to three seconds, choose a colour, and let the layers open up.',
    icon: '♡',
  },
]

export function Tutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const current = TUTORIAL_STEPS[step]
  const isLast = step === TUTORIAL_STEPS.length - 1

  return (
    <div className="modal-backdrop tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        <div className="tutorial-topline">
          <span className="brand-kicker">JELLY ORBIT / FIELD NOTE</span>
          <span className="tutorial-counter">{step + 1} / {TUTORIAL_STEPS.length}</span>
        </div>
        <div className="tutorial-icon" aria-hidden="true">{current.icon}</div>
        <span className="section-eyebrow">{current.kicker}</span>
        <h2 id="tutorial-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="tutorial-progress" aria-hidden="true">
          {TUTORIAL_STEPS.map((_, index) => <span key={index} className={index === step ? 'active' : ''} />)}
        </div>
        <div className="tutorial-actions">
          <button className="text-button" type="button" onClick={onComplete}>Skip for now</button>
          <button className="primary-button" type="button" onClick={() => (isLast ? onComplete() : setStep((value) => value + 1))}>
            {isLast ? 'Enter Stage 01' : 'Next'} <span className="button-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
