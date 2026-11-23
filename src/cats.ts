import type { Repo } from './github'

const coats: Record<string, string> = {
  JavaScript: '#f2b756', TypeScript: '#779ad9', Swift: '#ee8963', Python: '#f6d178',
  HTML: '#f1a48d', CSS: '#b790cd', C: '#abb2b8', 'C++': '#cf90ae', Java: '#b77b60',
}
const palette = ['#e1a176', '#ae9cc5', '#f7dbc1', '#99bba9', '#c38d78']

export function toCat(repo: Repo) {
  return {
    ...repo,
    coat: coats[repo.language ?? ''] ?? palette[repo.id % palette.length],
    markings: repo.id % 4,
    mood: repo.archived ? 'nap' : Date.now() - Date.parse(repo.updated_at) < 30 * 86400000 ? 'play' : repo.id % 2 ? 'sit' : 'wander',
  }
}

export type Cat = ReturnType<typeof toCat>
export const sampleCats = ['Mochi', 'Biscuit', 'Bean', 'Peaches'].map((name, index) => toCat({
  id: index + 1, name, description: 'A resident of the sample café.', language: null,
  stargazers_count: 0, fork: false, archived: index === 2,
  updated_at: index === 1 ? new Date().toISOString() : '', html_url: '',
}))
