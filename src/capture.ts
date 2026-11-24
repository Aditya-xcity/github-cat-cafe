import type { Cat } from './cats'

export function rarity(stars: number) {
  if (stars >= 50) return { name: 'Legendary', chance: .10 }
  if (stars >= 20) return { name: 'Epic', chance: .25 }
  if (stars >= 5) return { name: 'Rare', chance: .45 }
  if (stars >= 1) return { name: 'Uncommon', chance: .65 }
  return { name: 'Common', chance: .80 }
}

export function captureChance(cat: Cat, centered: boolean, fleeing: boolean, failures: number) {
  const chance = rarity(cat.stargazers_count).chance + (centered ? .10 : 0) -
    (fleeing ? .10 : 0) + Math.min(.20, failures * .05)
  return Math.max(.05, Math.min(.95, chance))
}

export type Progress = { collection: Record<number, { cat: Cat; attempts: number }>; score: number; victories: number }

export function progressKey(user: string) {
  return 'space-cats:v1:' + user.toLowerCase()
}

export function readProgress(user: string): Progress {
  try {
    const save = JSON.parse(localStorage.getItem(progressKey(user)) ?? 'null') as Progress | null
    if (save?.collection && Number.isFinite(save.score) && Number.isFinite(save.victories)) return save
  } catch {
    // Play is still available when storage is inaccessible.
  }
  return { collection: {}, score: 0, victories: 0 }
}
