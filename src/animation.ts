import { useEffect, useState } from 'react'

export const roomSize = 12
export const entranceDelay = 240

export function slot(index: number) {
  return { x: 10 + (index % 6) * 16 + (index >= 6 ? 4 : 0), y: index >= 6 ? 86 : 68 }
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

let audio: AudioContext | undefined
export function enableSound() {
  try {
    audio ??= new AudioContext()
    void audio.resume().catch(() => {})
  } catch {
    // The café stays usable on devices with no audio output.
  }
}

const cues = { chime: [660, 880], meow: [570], throw: [415], success: [523, 659, 784],
  warning: [196, 147], victory: [392, 523, 659, 1047] }

export function sound(kind: keyof typeof cues) {
  if (!audio || audio.state !== 'running' || document.hidden) return
  const context = audio
  const notes = cues[kind]
  notes.forEach((note, index) => {
    const time = context.currentTime + index * .12
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    oscillator.type = kind === 'warning' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(note, time)
    if (kind === 'meow') oscillator.frequency.exponentialRampToValueAtTime(310, time + .23)
    if (kind === 'throw') oscillator.frequency.exponentialRampToValueAtTime(170, time + .12)
    volume.gain.setValueAtTime(.001, time)
    volume.gain.exponentialRampToValueAtTime(.065, time + .04)
    volume.gain.exponentialRampToValueAtTime(.001, time + .25)
    oscillator.connect(volume).connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + .26)
  })
}
