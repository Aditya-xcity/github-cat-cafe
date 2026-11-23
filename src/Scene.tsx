import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Cat } from './cats'
import { roomSize, slot } from './animation'

export function Sprite({ cat }: { cat: Cat }) {
  const sleeping = cat.mood === 'nap'
  const eye = sleeping ? 18 : 14
  return <svg viewBox="0 0 48 40" shapeRendering="crispEdges" aria-hidden="true">
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
  </svg>
}

const tileWidth = 780
const tileHeight = 440
const aisle = 32
const stepX = tileWidth + aisle
const stepY = tileHeight + aisle

// Put room zero at the entrance and grow successive rings around it.
function roomPosition(index: number) {
  if (index === 0) return { x: 0, y: 0 }
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2)
  const side = 2 * ring
  const offset = (2 * ring + 1) ** 2 - 1 - index
  if (offset < side) return { x: (ring - offset) * stepX, y: ring * stepY }
  if (offset < 2 * side) return { x: -ring * stepX, y: (ring - offset + side) * stepY }
  if (offset < 3 * side) return { x: (-ring + offset - 2 * side) * stepX, y: -ring * stepY }
  return { x: ring * stepX, y: (-ring + offset - 3 * side) * stepY }
}

function Room({ cats, selected, door, onSelect }: {
  cats: Array<{ cat: Cat; slotIndex: number }>; selected?: number; door: boolean;
  onSelect: (cat: Cat) => void
}) {
  return <div className="scene">
    <div className="wall" aria-hidden="true">
      <div className="awning"/><div className="lamp one"/><div className="lamp two"/>
      <div className="doorframe"><div className={'door' + (door ? ' open' : '')}/></div>
      <div className="menu-board">CAFÉ<br/>✦ ✦ ✦</div>
      <div className="counter"><div className="pastries"><i/><i/><i/></div></div>
      <div className="window"><div className="skyline"/></div>
      <div className="booth"/>
      <div className="plant"><i/><b/></div><div className="plant small"><i/><b/></div>
    </div>
    <div className="floor" aria-hidden="true"><div className="sunlight"/><div className="rug"/></div>
    {cats.map(({ cat, slotIndex }) => {
      const position = slot(slotIndex)
      return <button key={cat.id} tabIndex={cat.html_url ? -1 : 0} type="button" className={'cat ' + cat.mood}
        aria-label={cat.name} aria-pressed={selected === cat.id} title={cat.name}
        style={{ left: position.x + '%', top: position.y + '%', '--entry-x': (12 - position.x) * tileWidth / 100 + 'px',
          '--entry-y': (57 - position.y) * tileHeight / 100 + 'px', '--phase': -(cat.id % 7) + 's' } as CSSProperties}
        onClick={() => onSelect(cat)}><span className="cat-idle"><Sprite cat={cat}/></span></button>
    })}
  </div>
}

type Camera = { x: number; y: number; zoom: number }

function homeZoom(width: number) {
  return Math.min(1, Math.max(.6, width / 1450))
}

export function Scene({ cats, arrived, selected, door, onSelect }: {
  cats: Cat[]; arrived: number; selected?: number; door: boolean; onSelect: (cat: Cat) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight })
  const [camera, setCamera] = useState<Camera>(() => ({ x: 0, y: 0, zoom: homeZoom(innerWidth) }))
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
    const index = cats.findIndex(cat => cat.id === selected)
    if (index < 0) return
    const room = roomPosition(Math.floor(index / roomSize))
    const position = slot(index % roomSize)
    setCamera(current => ({ ...current, x: room.x + (position.x / 100 - .5) * tileWidth,
      y: room.y + (position.y / 100 - .5) * tileHeight }))
  }, [cats, selected])

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

  const count = Math.max(1, Math.ceil(cats.length / roomSize))
  const radiusX = size.width / (2 * camera.zoom) + tileWidth / 2
  const radiusY = size.height / (2 * camera.zoom) + tileHeight / 2
  return <>
    <div ref={viewport} className={'world-viewport' + (dragging ? ' dragging' : '')}
      role="region" aria-label="Café map. Drag or scroll to explore. Use the Cat Directory to find a repository."
      style={{ '--tile-grid': 48 * camera.zoom + 'px', '--grid-x': (-camera.x * camera.zoom) % (48 * camera.zoom) + 'px',
        '--grid-y': (-camera.y * camera.zoom) % (48 * camera.zoom) + 'px' } as CSSProperties}
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="world-center" style={{ transform: 'scale(' + camera.zoom + ') translate(' + -camera.x + 'px,' + -camera.y + 'px)' }}>
        {Array.from({ length: count }, (_, index) => {
          const location = roomPosition(index)
          if (Math.abs(location.x - camera.x) > radiusX || Math.abs(location.y - camera.y) > radiusY) return null
          const start = index * roomSize
          const occupants = cats.slice(start, start + roomSize).map((cat, slotIndex) => ({ cat, slotIndex }))
            .filter(({ cat, slotIndex }) => start + slotIndex < arrived || cat.id === selected)
          return <div key={index} className="world-room" style={{ width: tileWidth, height: tileHeight,
            left: location.x - tileWidth / 2, top: location.y - tileHeight / 2 }}>
            <Room cats={occupants} selected={selected} door={door && arrived >= start && arrived < start + roomSize} onSelect={onSelect}/>
          </div>
        })}
      </div>
    </div>
    <div className="map-controls" aria-label="Map controls">
      <button aria-label="Return to café entrance" onClick={center}>⌂</button>
      <button aria-label="Zoom out" disabled={camera.zoom <= .3} onClick={() => zoomBy(.8)}>−</button>
      <button aria-label="Zoom in" disabled={camera.zoom >= 1.6} onClick={() => zoomBy(1.25)}>+</button>
      {document.fullscreenEnabled && <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={() => void toggleFullscreen()}>⛶</button>}
    </div>
    {fullscreenError && <p className="fullscreen-status" role="status">Your browser could not enter fullscreen.</p>}
  </>
}
