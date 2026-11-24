import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { parseUser, publicRepos } from './github'
import { sampleCats, toCat, type Cat } from './cats'
import { enableSound, entranceDelay, sound, useReducedMotion } from './animation'
import { Scene, Sprite } from './Scene'
import './style.css'

function App() {
  const shared = new URLSearchParams(location.search).get('user') ?? ''
  const [input, setInput] = useState(shared)
  const [user, setUser] = useState('')
  const [cats, setCats] = useState<Cat[]>([])
  const [arrived, setArrived] = useState(0)
  const [directory, setDirectory] = useState(false)
  const directoryButton = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Cat>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audible, setAudible] = useState(false)
  const motion = useReducedMotion()
  const active = useRef<AbortController>(null)
  const soundOn = useRef(false)
  const details = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLElement>(null)

  async function load(value: string, refresh = false) {
    active.current?.abort()
    setInput(value)
    setError('')
    let name: string
    try {
      name = parseUser(value)
    } catch {
      setLoading(false)
      setError('Enter a valid GitHub username or profile URL.')
      return
    }
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    try {
      const repos = await publicRepos(name, controller.signal, refresh)
      if (controller.signal.aborted) return
      setArrived(0)
      setDirectory(false)
      setSelected(undefined)
      setQuery('')
      setUser(name.toLowerCase())
      setCats(repos.map(toCat))
      const url = new URL(location.href)
      url.searchParams.set('user', name)
      history.replaceState(null, '', url)
    } catch (failure) {
      if (!controller.signal.aborted) setError((failure as Error).message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    if (shared) void load(shared)
    return () => active.current?.abort()
  }, [])

  useEffect(() => {
    if (!cats.length || motion) {
      setArrived(cats.length)
      return
    }
    if (soundOn.current) sound('chime')
    let count = 0
    let timer: number
    function next() {
      count = Math.min(count + Math.max(1, Math.ceil(cats.length / 90)), cats.length)
      setArrived(previous => Math.max(previous, count))
      if (count < cats.length) timer = window.setTimeout(next, entranceDelay)
    }
    timer = window.setTimeout(next, 420)
    return () => clearTimeout(timer)
  }, [cats, motion])

  useEffect(() => {
    if (!audible || !cats.length) return
    const timer = setInterval(() => { if (!document.hidden) sound('meow') }, 17500)
    return () => clearInterval(timer)
  }, [audible, cats.length])

  useEffect(() => { if (selected) details.current?.focus() }, [selected])
  useEffect(() => { if (directory) search.current?.focus() }, [directory])

  function choose(cat: Cat) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDirectory(false)
    setSelected(cat)
  }

  function close() {
    setSelected(undefined)
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else directoryButton.current?.focus()
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void load(input)
  }

  const matches = cats.filter(cat => cat.name.toLowerCase().includes(query.trim().toLowerCase()))

  return <main className="map-app">
    <Scene key={user.toLowerCase()} cats={user ? cats : sampleCats} arrived={user ? arrived : sampleCats.length}
      selected={selected?.id} user={user} audible={audible} paused={directory || Boolean(selected)}/>
    <header className="map-header">
      <div className="map-profile">
        <h1 id="cafe-sign">{user ? '@' + user + '’s Cat Galaxy' : 'Space Cats'}</h1>
        <form onSubmit={submit}>
          <label className="sr" htmlFor="github-user">GitHub username or profile URL</label>
          <input id="github-user" value={input} onChange={event => setInput(event.target.value)}
            placeholder="GitHub username or profile URL" autoComplete="off" />
          <button className="primary">Launch <span aria-hidden="true">↗</span></button>
        </form>
        {!user && <button className="try" onClick={() => void load('Aditya-xcity')}>Try Aditya-xcity</button>}
        {loading && <p role="status">Looking up public repositories…</p>}
        {error && <div className="error" role="alert">{error} <button onClick={() => void load(input, true)}>Retry</button></div>}
        {user && !cats.length && <p className="empty" role="status">@{user} has no public repositories. <button onClick={() => void load(user, true)}>Retry</button></p>}
      </div>
      <div className="map-actions">
        <span className="count">{user ? arrived + ' / ' + cats.length + ' cats in orbit' : 'Training sector'}</span>
        <button className="quiet" aria-pressed={audible} onClick={() => {
          const next = !audible
          if (next) enableSound()
          soundOn.current = next
          setAudible(next)
        }}>Sound {audible ? 'on' : 'off'}</button>
        {cats.length > 0 && <button className="quiet" ref={directoryButton} aria-expanded={directory} aria-controls="directory"
          onClick={() => { setSelected(undefined); setDirectory(!directory) }}>Cat Directory</button>}
      </div>
    </header>
    <p className="map-hint">WASD or drag to fly · Click or tap to aim and throw · Space to fire forward</p>
    {directory && <section id="directory" className="directory" aria-labelledby="directory-title" onKeyDown={event => {
      if (event.key === 'Escape') { setDirectory(false); directoryButton.current?.focus() }
    }}>
      <button className="close" aria-label="Close Cat Directory" onClick={() => { setDirectory(false); directoryButton.current?.focus() }}>×</button>
      <h2 id="directory-title">Cat Directory</h2>
      <label className="sr" htmlFor="cat-search">Search repositories</label>
      <input ref={search} id="cat-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search repositories" />
      {matches.length ? <ul>{matches.map(cat => <li key={cat.id}>
        <button onClick={() => choose(cat)}>
          <span className="mini"><Sprite cat={cat}/></span><span>{cat.name}</span><span aria-hidden="true">↗</span>
        </button></li>)}</ul> : <p>No cats match that repository name.</p>}
    </section>}
    {selected && <aside className="details" ref={details} tabIndex={-1} aria-labelledby="repo-name" onKeyDown={event => {
      if (event.key === 'Escape') close()
    }}>
      <button className="close" onClick={close} aria-label="Close repository details">×</button>
      <div className="portrait"><Sprite cat={selected}/></div>
      <h2 id="repo-name">{selected.name}</h2>
      <p>{selected.description || 'No repository description.'}</p>
      {selected.html_url && <>
        <dl><dt>Language</dt><dd>{selected.language ?? 'Unspecified'}</dd>
          <dt>Stars</dt><dd>{selected.stargazers_count.toLocaleString()}</dd>
          <dt>Last updated</dt><dd><time dateTime={selected.updated_at}>{new Date(selected.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time></dd></dl>
        <div className="tags">{selected.fork && <span>Fork</span>}{selected.archived && <span>Archived</span>}</div>
        <a className="primary" href={selected.html_url} target="_blank" rel="noreferrer">Open on GitHub ↗</a>
      </>}
    </aside>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
