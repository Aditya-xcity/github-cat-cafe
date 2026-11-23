export interface Repo {
  id: number
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  archived: boolean
  updated_at: string
  html_url: string
  private?: boolean
}

export function parseUser(input: string) {
  let user = input.trim()
  if (/^(https?:\/\/|(?:www\.)?github\.com\/)/i.test(user)) {
    const url = new URL(/^https?:/i.test(user) ? user : 'https://' + user)
    const parts = url.pathname.split('/').filter(Boolean)
    if (!['github.com', 'www.github.com'].includes(url.hostname) || parts.length !== 1) {
      throw new Error('Enter a GitHub username or a GitHub profile URL.')
    }
    user = parts[0]
  }
  user = user.replace(/^@/, '')
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(user)) {
    throw new Error('Enter a valid GitHub username or profile URL.')
  }
  return user
}

const cache = new Map<string, { expires: number; repos: Repo[] }>()

export async function publicRepos(user: string, signal: AbortSignal, refresh = false) {
  const key = user.toLowerCase()
  const cached = cache.get(key)
  if (!refresh && cached && cached.expires > Date.now()) return cached.repos

  const repos = new Map<number, Repo>()
  let next: string | undefined = 'https://api.github.com/users/' + key + '/repos?type=owner&sort=full_name&per_page=100'
  while (next) {
    let response: Response
    try {
      response = await fetch(next, { signal, headers: { Accept: 'application/vnd.github+json' } })
    } catch (error) {
      if (signal.aborted) throw error
      throw new Error('Could not reach GitHub. Check your connection and retry.')
    }
    if (response.status === 404) throw new Error('GitHub could not find that account. Check the username.')
    if ([403, 429].includes(response.status)) throw new Error('GitHub temporarily limited requests. Try again in a few minutes.')
    if (!response.ok) throw new Error('GitHub returned an error. Please retry.')
    const page: Repo[] = await response.json()
    for (const repo of page) if (!repo.private) repos.set(repo.id, repo)
    next = response.headers.get('Link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1]
    if (next && new URL(next).origin !== 'https://api.github.com') throw new Error('GitHub returned an unexpected page link.')
  }
  signal.throwIfAborted()
  const result = [...repos.values()]
  if (cache.size >= 12) cache.delete(cache.keys().next().value!)
  cache.set(key, { expires: Date.now() + 300_000, repos: result })
  return result
}
