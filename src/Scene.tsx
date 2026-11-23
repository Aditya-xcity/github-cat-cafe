import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Cat } from './cats'
import { roomSize, useReducedMotion } from './animation'

export function Sprite({ cat }: { cat: Cat }) {
  const sleeping = cat.mood === 'nap'
  const eye = sleeping ? 18 : 14
  return <svg viewBox="-5 -5 58 50" shapeRendering="crispEdges" aria-hidden="true">
    <circle cx="24" cy="20" r="25" fill="#1b344a" stroke="#68f1e0" strokeWidth="2"/>
    <ellipse cx="24" cy="35" rx="20" ry="3" fill="#473456" opacity=".23"/>
    <path className="tail" d={cat.markings % 2 ? 'M32 29h10v-9h-4v5h-6z' : 'M32 31h13v-5h-13z'} fill={cat.coat} stroke="#513747" strokeWidth="2"/>
    <path d={sleeping ? 'M12 22h23v3h4v9H9V25h3z' : 'M17 19h14v4h5v11H13V24h4z'} fill={cat.coat} stroke="#513747" strokeWidth="2"/>
    <path d={sleeping ? 'M5 14h5v4h9v-4h5v9h3v8H3v-8h2z' : 'M5 4h6v5h9V4h6v9h3v11H3V13h2z'} fill={cat.coat} stroke="#513747" strokeWidth="2"/>
    {!sleeping && <path d="M7 7h3v5H7zm14 0h3v5h-3z" fill="#f6a0ac"/>}
    {cat.markings === 1 && <path d="M12 10h3v5h-3zm5 0h3v4h-3z" fill="#513747" opacity=".45"/>}
    {cat.markings === 2 && <path d="M30 25h5v8h-5zm-9-12h5v6h-5z" fill="#fff2dd" opacity=".75"/>}
    {cat.markings === 3 && <path d="M7 18h17v4H7z" fill="#fff2dd" opacity=".65"/>}
    <path d={sleeping ? 'M7 24h5v2H7zm11 0h5v2h-5z' : 'M8 14h3v4H8zm12 0h3v4h-3z'} fill="#513747"/>
    <rect x="14" y={eye + 5} width="3" height="2" fill="#d56788"/>
    {cat.stargazers_count > 0 && <><path d={sleeping ? 'M10 30h14v2H10z' : 'M10 23h15v2H10z'} fill="#a94967"/><text x="16" y={sleeping ? 36 : 30} fill="#ffe377" fontSize="11">★</text></>}
    {cat.mood === 'play' && <g className="yarn"><circle cx="42" cy="32" r="4" fill="#d4558a"/><path d="m39 33 5-3m-4 5 5-3" stroke="#fa9abc"/></g>}
    <path d="M37 3h4v3h3v5" fill="none" stroke="#bdfef4" strokeWidth="2"/>
  </svg>
}

const stepX = 960
const stepY = 820

function sectorPosition(index: number) {
  if (index === 0) return { x: 0, y: 0 }
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2)
  const side = 2 * ring
  const offset = (2 * ring + 1) ** 2 - 1 - index
  if (offset < side) return { x: (ring - offset) * stepX, y: ring * stepY }
  if (offset < 2 * side) return { x: -ring * stepX, y: (ring - offset + side) * stepY }
  if (offset < 3 * side) return { x: (-ring + offset - 2 * side) * stepX, y: -ring * stepY }
  return { x: ring * stepX, y: (-ring + offset - 3 * side) * stepY }
}

function catPosition(index: number) {
  const sector = sectorPosition(Math.floor(index / roomSize))
  const slot = index % roomSize
  const outer = slot >= 4
  const angle = (slot % (outer ? 8 : 4)) * Math.PI / (outer ? 4 : 2) + (outer ? .29 : .62)
  const radius = outer ? 310 : 162
  return { x: sector.x + Math.cos(angle) * radius, y: sector.y + Math.sin(angle) * radius }
}

const flightKeys = new Set(['w', 'a', 's', 'd'])
const scanRange = 123

type Camera = { x: number; y: number; zoom: number }

function homeZoom(width: number) {
  return Math.min(1, Math.max(.6, width / 1450))
}

export function Scene({ cats, arrived, selected, onSelect }: {
  cats: Cat[]; arrived: number; selected?: number; onSelect: (cat: Cat) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight })
  const [camera, setCamera] = useState<Camera>(() => ({ x: 0, y: 0, zoom: homeZoom(innerWidth) }))
  const reducedMotion = useReducedMotion()
  const [scanned, setScanned] = useState<Set<number>>(() => new Set())
  const [heading, setHeading] = useState(-90)
  const positions = useMemo(() => cats.map((cat, index) => ({ cat, ...catPosition(index) })), [cats])
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [fullscreenError, setFullscreenError] = useState(false)
  const pointer = useRef<{ id: number; x: number; y: number }>(null)

  function center() {
    setCamera({ x: 0, y: 0, zoom: homeZoom(viewport.current!.clientWidth) })
  }

  function zoomBy(factor: number, x = 0, y = 0) {
    setCamera(current => {
      const zoom = Math.min(1.6, Math.max(.3, current.zoom * factor))
      return { x: current.x + x / current.zoom - x / zoom, y: current.y + y / current.zoom - y / zoom, zoom }
    })
  }

  useEffect(() => {
    const element = viewport.current!
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        zoomBy(Math.exp(-event.deltaY * .008), event.clientX - box.left - box.width / 2, event.clientY - box.top - box.height / 2)
      } else {
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1
        setCamera(current => ({ ...current, x: current.x + event.deltaX * unit / current.zoom,
          y: current.y + event.deltaY * unit / current.zoom }))
      }
    }
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncFullscreen)
    element.addEventListener('wheel', wheel, { passive: false })
    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', syncFullscreen)
      element.removeEventListener('wheel', wheel)
    }
  }, [])

  useEffect(() => {
    const target = positions.find(({ cat }) => cat.id === selected)
    if (target) setCamera(current => ({ ...current, x: target.x, y: target.y }))
  }, [positions, selected])

  useEffect(() => {
    const keys = new Set<string>()
    let frame = 0
    let previous = 0
    let vx = 0
    let vy = 0
    function tick(now: number) {
      const elapsed = Math.min((now - previous) / 1000, .035)
      previous = now
      const dx = Number(keys.has('d')) - Number(keys.has('a'))
      const dy = Number(keys.has('s')) - Number(keys.has('w'))
      const length = Math.hypot(dx, dy) || 1
      const response = reducedMotion ? 1 : Math.min(1, elapsed * 8)
      vx += (dx / length * 540 - vx) * response
      vy += (dy / length * 540 - vy) * response
      if (dx || dy) setHeading(Math.atan2(dy, dx) * 180 / Math.PI)
      if (Math.hypot(vx, vy) > 1) {
        const x = vx * elapsed
        const y = vy * elapsed
        setCamera(current => ({ ...current, x: current.x + x, y: current.y + y }))
      }
      frame = keys.size || Math.hypot(vx, vy) > 1 ? requestAnimationFrame(tick) : 0
    }
    function down(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (!flightKeys.has(key) || event.metaKey || event.ctrlKey || event.altKey ||
        (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable], aside, #directory'))) return
      event.preventDefault()
      keys.add(key)
      if (!frame) {
        previous = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    function up(event: KeyboardEvent) { keys.delete(event.key.toLowerCase()) }
    function stop() {
      keys.clear()
      cancelAnimationFrame(frame)
      frame = 0
      vx = 0
      vy = 0
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', stop)
    return () => {
      stop()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', stop)
    }
  }, [reducedMotion])

  async function toggleFullscreen() {
    setFullscreenError(false)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await viewport.current?.closest('main')?.requestFullscreen()
    } catch {
      setFullscreenError(true)
    }
  }

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current || event.button !== 0 || (event.target as Element).closest('button')) return
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const previous = pointer.current
    if (!previous || previous.id !== event.pointerId) return
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    setCamera(current => ({ ...current, x: current.x - dx / current.zoom, y: current.y - dy / current.zoom }))
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return
    pointer.current = null
    setDragging(false)
  }

  const sectors = Math.max(1, Math.ceil(cats.length / roomSize))
  const radiusX = size.width / (2 * camera.zoom) + 95
  const radiusY = size.height / (2 * camera.zoom) + 95
  const visible = (x: number, y: number, margin = 0) =>
    Math.abs(x - camera.x) < radiusX + margin && Math.abs(y - camera.y) < radiusY + margin
  let nearest: Cat | undefined
  let nearestDistance = scanRange
  positions.forEach(({ cat, x, y }, index) => {
    if (index >= arrived) return
    const distance = Math.hypot(x - camera.x, y - camera.y)
    if (distance < nearestDistance) {
      nearest = cat
      nearestDistance = distance
    }
  })

  function scan(cat: Cat) {
    setScanned(previous => new Set(previous).add(cat.id))
    onSelect(cat)
  }

  return <>
    <div ref={viewport} className={'world-viewport' + (dragging ? ' dragging' : '')}
      role="region" aria-label="Galaxy. Fly with W A S D, or drag to explore."
      style={{ '--grid-x': (-camera.x * .4) % 671 + 'px',
        '--grid-y': (-camera.y * .4) % 671 + 'px' } as CSSProperties}
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="world-center" style={{ transform: 'scale(' + camera.zoom + ') translate(' + -camera.x + 'px,' + -camera.y + 'px)' }}>
        {Array.from({ length: sectors }, (_, index) => {
          const { x, y } = sectorPosition(index)
          return visible(x, y, 340) && <div key={index} className="system" style={{ left: x, top: y, '--hue': (index * 61 + 185) % 360 } as CSSProperties}>
            <span className="orbit inner"/><span className="orbit outer"/><span className="planet"/>
            <span className="system-name">{index === 0 ? 'Origin station' : 'Sector ' + (index + 1)}</span>
          </div>
        })}
        {positions.map(({ cat, x, y }, index) => (index < arrived || cat.id === selected) && visible(x, y) &&
          <button key={cat.id} type="button" className={'astronaut ' + cat.mood} aria-label={cat.name}
            aria-pressed={selected === cat.id} title={cat.name} style={{ left: x, top: y }}
            onClick={() => Math.hypot(x - camera.x, y - camera.y) < scanRange ? scan(cat) : onSelect(cat)}>
            <span className="astronaut-sprite"><Sprite cat={cat}/></span>
            <span className="astronaut-name">{scanned.has(cat.id) ? '✓ ' : ''}{cat.name}</span>
          </button>)}
      </div>
      <div className="ship" aria-hidden="true" style={{ rotate: heading + 'deg' }}>➤</div>
    </div>
    <div className="mission">
      <span>{scanned.size} / {cats.length} cats scanned</span>
      <button disabled={!nearest} onClick={() => nearest && scan(nearest)}>{nearest ? 'Scan ' + nearest.name : 'Fly closer to scan'}</button>
    </div>
    <div className="map-controls" aria-label="Navigation controls">
      <button aria-label="Return to origin" onClick={center}>⌂</button>
      <button aria-label="Zoom out" disabled={camera.zoom <= .3} onClick={() => zoomBy(.8)}>−</button>
      <button aria-label="Zoom in" disabled={camera.zoom >= 1.6} onClick={() => zoomBy(1.25)}>+</button>
      {document.fullscreenEnabled && <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={() => void toggleFullscreen()}>⛶</button>}
    </div>
    {fullscreenError && <p className="fullscreen-status" role="status">Your browser could not enter fullscreen.</p>}
  </>
}
