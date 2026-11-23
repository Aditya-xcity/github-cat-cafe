import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { parseUser, publicRepos } from './github'
import { sampleCats, toCat, type Cat } from './cats'
import { enableSound, entranceDelay, roomSize, sound, useReducedMotion } from './animation'
import { Scene, Sprite } from './Scene'
import './style.css'

function App() {
  const shared = new URLSearchParams(location.search).get('user') ?? ''
  const [input, setInput] = useState(shared)
  const [user, setUser] = useState('')
  const [cats, setCats] = useState<Cat[]>([])
  const [arrived, setArrived] = useState(0)
  const [room, setRoom] = useState(0)
  const [selected, setSelected] = useState<Cat>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audible, setAudible] = useState(false)
  const [door, setDoor] = useState(false)
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
      setRoom(0)
      setSelected(undefined)
      setQuery('')
      setUser(name)
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
      setDoor(false)
      return
    }
    setDoor(true)
    if (soundOn.current) sound('chime')
    let count = 0
    let timer: number
    function next() {
      count = Math.min(count + Math.max(1, Math.ceil(cats.length / 90)), cats.length)
      setArrived(previous => Math.max(previous, count))
      if (count < cats.length) timer = window.setTimeout(next, entranceDelay)
      else setDoor(false)
    }
    timer = window.setTimeout(next, 420)
    return () => clearTimeout(timer)
  }, [cats, motion])

  useEffect(() => {
    if (!audible || !cats.length) return
    const timer = setInterval(() => sound('meow'), 17500)
    return () => clearInterval(timer)
  }, [audible, cats.length])

  useEffect(() => { if (selected) details.current?.focus() }, [selected])

  function choose(cat: Cat) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const index = cats.findIndex(item => item.id === cat.id)
    if (index >= 0) {
      setRoom(Math.floor(index / roomSize))
    }
    setSelected(cat)
  }

  function close() {
    setSelected(undefined)
    requestAnimationFrame(() => trigger.current?.isConnected && trigger.current.focus())
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void load(input)
  }

  const start = room * roomSize
  const shown = user ? cats.slice(start, start + roomSize).filter((cat, index) => start + index < arrived || selected?.id === cat.id) : sampleCats
  const totalRooms = Math.ceil(cats.length / roomSize)
  const matches = cats.filter(cat => cat.name.toLowerCase().includes(query.trim().toLowerCase()))

  return <main>
    <header className="top"><span className="wordmark">🐾 GitHub Cat Café</span>
      <button className="quiet" aria-pressed={audible} onClick={() => {
        const next = !audible
        if (next) enableSound()
        soundOn.current = next
        setAudible(next)
      }}>Sound {audible ? 'on' : 'off'}</button>
    </header>
    <section className="intro">
      <p className="kicker">THE INTERNET’S COZIEST CODE CORNER</p>
      <h1>GitHub <em>Cat Café</em></h1>
      <p>Every public repository gets a cat. Whose café will you visit?</p>
      <form onSubmit={submit}>
        <label className="sr" htmlFor="github-user">GitHub username or profile URL</label>
        <input id="github-user" value={input} onChange={event => setInput(event.target.value)} placeholder="GitHub username or profile URL" autoComplete="off" />
        <button className="primary">Open café <span aria-hidden="true">↗</span></button>
      </form>
      <button className="try" onClick={() => void load('Aditya-xcity')}>Try Aditya-xcity</button>
      {loading && <p role="status">Looking up public repositories…</p>}
      {error && <div className="error" role="alert">{error} <button onClick={() => void load(input, true)}>Retry</button></div>}
    </section>
    <section className="venue" aria-labelledby="cafe-sign">
      <div className="sign"><h2 id="cafe-sign">{user ? '@' + user + '’s Cat Café' : 'The sample café'}</h2>
        <span className="count">{user ? arrived + ' / ' + cats.length + ' cats inside' : 'Meet the sample cats'}</span>
      </div>
      <Scene cats={shown} selected={selected?.id} door={door} onSelect={choose}/>
      <div className="floorbar">
        <span>{user && totalRooms ? 'Room ' + (room + 1) + ' of ' + totalRooms : 'Window room'}</span>
        {totalRooms > 1 && <div><button aria-label="Previous room" disabled={!room} onClick={() => setRoom(room - 1)}>←</button>
          <button aria-label="Next room" disabled={room + 1 >= totalRooms} onClick={() => setRoom(room + 1)}>→</button></div>}
        {cats.length > 0 && <a href="#directory">Cat Directory ↓</a>}
      </div>
    </section>
    {user && !cats.length && <p className="empty" role="status">@{user} has no public repositories. <button onClick={() => void load(user, true)}>Retry</button></p>}
    {cats.length > 0 && <section id="directory" className="directory">
      <div><h2>Cat Directory</h2><p>Find a cat by its repository name.</p></div>
      <label className="sr" htmlFor="cat-search">Search repositories</label>
      <input id="cat-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search repositories" />
      {matches.length ? <ul>{matches.map(cat => <li key={cat.id}>
        <button aria-pressed={selected?.id === cat.id} onClick={() => choose(cat)}>
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
    <footer>Inspired by <a href="https://github.com/Dhruv-Sharma29/CodeVerse">CodeVerse</a>.</footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
