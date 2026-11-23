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

export function sound(kind: 'chime' | 'meow') {
  if (!audio || audio.state !== 'running') return
  const context = audio
  const notes = kind === 'chime' ? [660, 880] : [570]
  notes.forEach((note, index) => {
    const time = context.currentTime + index * .12
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    oscillator.type = kind === 'chime' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(note, time)
    if (kind === 'meow') oscillator.frequency.exponentialRampToValueAtTime(310, time + .23)
    volume.gain.setValueAtTime(.001, time)
    volume.gain.exponentialRampToValueAtTime(.065, time + .04)
    volume.gain.exponentialRampToValueAtTime(.001, time + .25)
    oscillator.connect(volume).connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + .26)
  })
}
