import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Cat } from './cats'
import { roomSize, sound, useReducedMotion } from './animation'

import { captureChance, progressKey, rarity, readProgress, type Progress } from './capture'
import { flyRocket, randomBetween, sweep, type Point, type Rocket, type Shot } from './combat'

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
const fleeRange = 190
type Pending = Point & { remaining: number; chance: number }
type Burst = Point & { id: number; color: string }
const recoveryTime = 4

function RocketSprite() {
  return <svg viewBox="0 0 100 66" aria-hidden="true">
    <path d="M9 5h24l32 19L94 33 65 42 33 61H9l17-28z" fill="#251542" stroke="#a572ff" strokeWidth="3"/>
    <path d="M22 20h38l28 13-28 13H22l8-13z" fill="#14111e" stroke="#f34b72" strokeWidth="2"/>
    <path d="M10 27h12v12H10z" fill="#f34b72"/>
    <text x="49" y="41" fontSize="23" fontWeight="900" textAnchor="middle" fill="#ff365f">R</text>
  </svg>
}

function Spaceship() {
  return <svg viewBox="0 0 88 54" aria-hidden="true">
    <path d="M30 21 2 27l28 6" fill="#63fce5" />
    <path d="m31 15-11-12h20l15 16m-24 20L20 51h20l15-16" fill="#916af3" stroke="#cbafff" strokeWidth="2" />
    <path d="M24 15h28l31 12-31 12H24l6-12z" fill="#263e74" stroke="#abfff0" strokeWidth="2" />
    <path d="M48 19h12l14 8-14 8H48l-5-8z" fill="#65e8e8" />
    <path d="M30 23h9v8h-9z" fill="#f798f2" />
  </svg>
}

type Camera = { x: number; y: number; zoom: number }

function homeZoom(width: number) {
  return Math.min(1, Math.max(.6, width / 1450))
}

export function Scene({ cats, arrived, selected, user, audible, paused }: {
  cats: Cat[]; arrived: number; selected?: number; user: string; audible: boolean; paused: boolean
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight })
  const [camera, setCamera] = useState<Camera>(() => ({ x: 0, y: 0, zoom: homeZoom(innerWidth) }))
  const reducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(() => readProgress(user))
  const save = useRef(progress)
  const [collection, setCollection] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [message, setMessage] = useState('')
  const [, redraw] = useState(0)
  const offsets = useRef(new Map<number, Point>())
  const pending = useRef(new Map<number, Pending>())
  const failures = useRef(new Map<number, number>())
  const fleeingUntil = useRef(new Map<number, number>())
  const shots = useRef<Shot[]>([])
  const bursts = useRef<(Burst & { until: number })[]>([])
  const rocket = useRef<Rocket | null>(null)
  const battle = useRef({ hp: 100, ammo: 30, regen: 0, clock: 0, encounter: randomBetween(45, 90),
    recovery: 0, lastThrow: -Infinity, messageUntil: 0, nextId: 0, ship: { x: 0, y: 0 } })
  const stopped = paused || manualPause || collection
  const game = battle.current
  const flightKeysHeld = useRef(new Set<string>())
  const [heading, setHeading] = useState(-90)
  const positions = useMemo(() => cats.map((cat, index) => ({ cat, ...catPosition(index) })), [cats])
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [fullscreenError, setFullscreenError] = useState(false)
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean }>(null)

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
      if (latest.current.stopped || game.recovery || document.hidden) return
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
    if (target && !battle.current.recovery) setCamera(current => ({ ...current, x: target.x, y: target.y }))
  }, [positions, selected])

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
    if (stopped || game.recovery || document.hidden) return
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const track = pointer.current
    if (!track || track.id !== event.pointerId || stopped || game.recovery) return
    if (!track.moved && Math.hypot(event.clientX - track.startX, event.clientY - track.startY) < 7) return
    track.moved = true
    setDragging(true)
    const dx = event.clientX - track.x
    const dy = event.clientY - track.y
    track.x = event.clientX
    track.y = event.clientY
    setCamera(current => ({ ...current, x: current.x - dx / current.zoom, y: current.y - dy / current.zoom }))
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    const track = pointer.current
    if (track?.id !== event.pointerId) return
    pointer.current = null
    setDragging(false)
    if (event.type !== 'pointerup' || track.moved) return
    aim(event.clientX, event.clientY)
  }

  function aim(x: number, y: number) {
    const box = viewport.current!.getBoundingClientRect()
    throwBall(Math.atan2(y - box.top - box.height / 2, x - box.left - box.width / 2))
  }

  function notify(text: string, duration = 3.5) {
    setMessage(text)
    game.messageUntil = game.clock + duration
  }

  function play(kind: Parameters<typeof sound>[0]) {
    if (latest.current.audible) sound(kind)
  }

  function throwBall(angle = latest.current.heading * Math.PI / 180) {
    if (latest.current.stopped || document.hidden || game.recovery || game.clock - game.lastThrow < .25) return
    if (!game.ammo) {
      notify('No Pokéballs. Reloading…')
      return
    }
    game.lastThrow = game.clock
    game.ammo--
    const { x, y } = latest.current.camera
    const vx = Math.cos(angle) * 760
    const vy = Math.sin(angle) * 760
    setHeading(angle * 180 / Math.PI)
    shots.current.push({ id: game.nextId++, x: x + vx * .045, y: y + vy * .045, vx, vy, life: 1.45 })
    play('throw')
  }

  const latest = useRef({ camera, heading, positions, arrived, selected, stopped, reducedMotion, audible, size })
  useEffect(() => { latest.current = { camera, heading, positions, arrived, selected, stopped, reducedMotion, audible, size } })

  useEffect(() => {
    let frame = 0
    let previous = performance.now()
    let vx = 0
    let vy = 0
    const keys = flightKeysHeld.current

    function persist(next: Progress) {
      save.current = next
      setProgress(next)
      try { localStorage.setItem(progressKey(user), JSON.stringify(next)) } catch { /* Keep session progress. */ }
    }

    function burst(point: Point, color: string) {
      bursts.current.push({ ...point, color, id: game.nextId++, until: game.clock + .55 })
    }

    function update(now: number) {
      frame = requestAnimationFrame(update)
      const dt = Math.min(.05, (now - previous) / 1000)
      previous = now
      const live = latest.current
      if (document.hidden || live.stopped) {
        clearInput()
        return
      }
      game.clock += dt
      if (game.messageUntil && game.clock >= game.messageUntil) {
        setMessage('')
        game.messageUntil = 0
      }
      if (game.ammo < 30) {
        game.regen += dt
        if (game.regen >= 5) {
          game.ammo++
          game.regen -= 5
          redraw(value => value + 1)
        }
      } else game.regen = 0

      if (game.recovery) {
        game.recovery = Math.max(0, game.recovery - dt)
        if (!game.recovery) {
          game.hp = 100
          game.ship = { x: 0, y: 0 }
          center()
        }
        redraw(value => value + 1)
        return
      }

      const dx = Number(keys.has('d')) - Number(keys.has('a'))
      const dy = Number(keys.has('s')) - Number(keys.has('w'))
      const length = Math.hypot(dx, dy) || 1
      const response = live.reducedMotion ? 1 : 1 - Math.exp(-dt * 8)
      vx += (dx / length * 540 - vx) * response
      vy += (dy / length * 540 - vy) * response
      if (dx || dy) setHeading(Math.atan2(dy, dx) * 180 / Math.PI)
      const before = game.ship
      const ship = live.camera
      game.ship = ship
      if (Math.hypot(vx, vy) > 1) {
        const x = vx * dt
        const y = vy * dt
        setCamera(current => ({ ...current, x: current.x + x, y: current.y + y }))
      }

      const hadBursts = bursts.current.length > 0
      bursts.current = bursts.current.filter(effect => effect.until > game.clock)
      let changed = shots.current.length > 0 || hadBursts || pending.current.size > 0 || Boolean(rocket.current)

      for (const [id, capture] of pending.current) {
        capture.remaining -= dt
        if (capture.remaining > 0) continue
        pending.current.delete(id)
        const cat = live.positions.find(entry => entry.cat.id === id)?.cat
        if (!cat || save.current.collection[id]) continue
        const missed = failures.current.get(id) ?? 0
        if (Math.random() < capture.chance) {
          persist({ ...save.current, score: save.current.score + 10,
            collection: { ...save.current.collection, [id]: { cat, attempts: missed + 1 } } })
          offsets.current.delete(id)
          failures.current.delete(id)
          fleeingUntil.current.delete(id)
          burst(capture, '#70ffc1')
          play('success')
          notify('Gotcha! ' + cat.name + ' was captured!')
        } else {
          failures.current.set(id, missed + 1)
          fleeingUntil.current.set(id, game.clock + 3)
          burst(capture, '#ffad7c')
          notify(cat.name + ' escaped!')
        }
      }

      if (!rocket.current && game.clock >= game.encounter) {
        const angle = randomBetween(0, Math.PI * 2)
        const radius = Math.hypot(live.size.width, live.size.height) / (2 * ship.zoom) + 110
        rocket.current = { x: ship.x + Math.cos(angle) * radius, y: ship.y + Math.sin(angle) * radius,
          hp: 100, angle: 0, fire: randomBetween(2, 4), flash: 0, exit: 0 }
        play('warning')
        notify('WARNING — TEAM ROCKET APPROACHING!', 4)
      }
      const enemy = rocket.current
      const oldEnemy = enemy && { x: enemy.x, y: enemy.y }
      if (enemy?.hp) {
        const aim = flyRocket(enemy, ship, dt, game.clock, shots.current)
        if (aim !== undefined) {
          enemy.fire = randomBetween(2, 4)
          shots.current.push({ id: game.nextId++, x: enemy.x, y: enemy.y, hostile: true,
            vx: Math.cos(aim) * 425, vy: Math.sin(aim) * 425, life: 2.5 })
        }
      } else if (enemy) {
        enemy.exit -= dt
        enemy.x += 460 * dt
        enemy.y -= 360 * dt
        if (!live.reducedMotion) enemy.angle += 540 * dt
        if (enemy.exit <= 0) rocket.current = null
      }

      const targets: { cat: Cat; before: Point; after: Point; fleeing: boolean }[] = []
      for (const [index, base] of live.positions.entries()) {
        const id = base.cat.id
        if ((index >= live.arrived && id !== live.selected) || save.current.collection[id] || pending.current.has(id)) continue
        const offset = offsets.current.get(id)
        let x = base.x + (offset?.x ?? 0)
        let y = base.y + (offset?.y ?? 0)
        const before = { x, y }
        const dx = x - ship.x
        const dy = y - ship.y
        const distance = Math.hypot(dx, dy)
        const sprint = (fleeingUntil.current.get(id) ?? 0) > game.clock
        const fleeing = sprint || distance < fleeRange
        if (fleeing) {
          const angle = (distance > 1 ? Math.atan2(dy, dx) : index * 2.4) + Math.sin(game.clock * 4.5 + index) * .44
          const speed = sprint ? 345 : 172
          x += Math.cos(angle) * dt * speed
          y += Math.sin(angle) * dt * speed
        } else if (offset) {
          const recovery = Math.min(1, dt * .46)
          x -= offset.x * recovery
          y -= offset.y * recovery
        }
        if (Math.hypot(x - base.x, y - base.y) > .6) {
          offsets.current.set(id, { x: x - base.x, y: y - base.y })
          changed = true
        } else if (offset) {
          offsets.current.delete(id)
          x = base.x
          y = base.y
          changed = true
        }
        targets.push({ cat: base.cat, before, after: { x, y }, fleeing })
      }

      for (const shot of shots.current) {
        if (shot.life <= 0) continue
        const start = { x: shot.x, y: shot.y }
        const travel = Math.min(dt, shot.life)
        shot.x += shot.vx * travel
        shot.y += shot.vy * travel
        shot.life -= dt
        if (shot.hostile) {
          if (!sweep(start, shot, before, ship, 29)) continue
          shot.life = 0
          game.hp = Math.max(0, game.hp - 10)
          burst(ship, '#ff507f')
          if (!game.hp) {
            clearInput()
            game.recovery = recoveryTime
            game.encounter = game.clock + recoveryTime + randomBetween(60, 180)
            rocket.current = null
            shots.current = []
            notify('Spaceship disabled!', recoveryTime)
            break
          }
          continue
        }
        const enemyHit = enemy?.hp && oldEnemy ? sweep(start, shot, oldEnemy, enemy, 44) : undefined
        let nearest = enemyHit?.contact ?? Infinity
        let target: typeof targets[number] | undefined
        let centered = false
        for (const candidate of targets) {
          if (pending.current.has(candidate.cat.id)) continue
          const hit = sweep(start, shot, candidate.before, candidate.after, 34)
          if (!hit || hit.contact >= nearest) continue
          target = candidate
          nearest = hit.contact
          // Measure the incoming trajectory so a center hit can qualify across frames.
          const speed = Math.hypot(shot.vx, shot.vy)
          centered = Math.abs((candidate.after.x - start.x) * shot.vy -
            (candidate.after.y - start.y) * shot.vx) / speed <= 11
        }
        if (target) {
          const id = target.cat.id
          shot.life = 0
          pending.current.set(id, { ...target.after, remaining: 2,
            chance: captureChance(target.cat, centered, target.fleeing, failures.current.get(id) ?? 0) })
          burst(target.after, '#ffffff')
        } else if (enemy && enemyHit) {
          shot.life = 0
          const critical = Math.random() < .15
          enemy.hp = Math.max(0, enemy.hp - (critical ? 30 : 15))
          enemy.flash = .16
          burst(enemy, critical ? '#ffdb78' : '#ff507f')
          if (!enemy.hp) {
            enemy.exit = 1.4
            game.encounter = game.clock + enemy.exit + randomBetween(60, 180)
            game.hp = Math.min(100, game.hp + 25)
            game.ammo = Math.min(30, game.ammo + 10)
            for (const hostile of shots.current) if (hostile.hostile) hostile.life = 0
            persist({ ...save.current, score: save.current.score + 50, victories: save.current.victories + 1 })
            play('victory')
            notify('Team Rocket is blasting off again! +50 points')
          }
        }
      }
      shots.current = shots.current.filter(shot => shot.life > 0)
      if (changed || enemy) redraw(value => value + 1)
    }
    function down(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || latest.current.stopped || game.recovery ||
        (event.target instanceof Element && event.target.closest('input, a, aside, #directory, [contenteditable]'))) return
      const key = event.key.toLowerCase()
      if (flightKeys.has(key)) {
        event.preventDefault()
        keys.add(key)
      } else if (event.code === 'Space' && !event.repeat && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        throwBall()
      }
    }
    function up(event: KeyboardEvent) { keys.delete(event.key.toLowerCase()) }
    function clearInput() {
      keys.clear()
      vx = 0
      vy = 0
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearInput)
    document.addEventListener('visibilitychange', clearInput)
    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearInput)
      document.removeEventListener('visibilitychange', clearInput)
    }
  }, [user])

  const sectors = Math.max(1, Math.ceil(cats.length / roomSize))
  const radiusX = size.width / (2 * camera.zoom) + 95
  const radiusY = size.height / (2 * camera.zoom) + 95
  const visible = (x: number, y: number, margin = 0) =>
    Math.abs(x - camera.x) < radiusX + margin && Math.abs(y - camera.y) < radiusY + margin

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
        {positions.map((base, index) => {
          const { cat } = base
          const offset = offsets.current.get(cat.id)
          const x = base.x + (offset?.x ?? 0)
          const y = base.y + (offset?.y ?? 0)
          if (progress.collection[cat.id] || (index >= arrived && cat.id !== selected) || !visible(x, y)) return null
          const attempt = pending.current.get(cat.id)
          if (attempt) return !reducedMotion && attempt.remaining > 1.72
            ? <div key={cat.id} className="capture-pull" style={{ left: x, top: y }}><Sprite cat={cat}/></div> : null
          const fleeing = (fleeingUntil.current.get(cat.id) ?? 0) > game.clock || Math.hypot(x - camera.x, y - camera.y) < fleeRange
          return <button key={cat.id} type="button" className={'astronaut ' + cat.mood + (fleeing ? ' fleeing' : '')}
            aria-label={'Throw at ' + cat.name} aria-pressed={selected === cat.id} title={cat.name}
            style={{ left: x, top: y }} onClick={event => event.detail ? aim(event.clientX, event.clientY) : throwBall(Math.atan2(y - camera.y, x - camera.x))}>
            <span className="astronaut-sprite"><Sprite cat={cat}/></span>
            <span className="astronaut-name">{cat.name}</span>
          </button>
        })}
        {shots.current.map(shot => <div key={shot.id} aria-hidden="true" className="projectile"
          style={{ left: shot.x, top: shot.y, rotate: Math.atan2(shot.vy, shot.vx) + 'rad' }}>
          <i className={shot.hostile ? 'hostile' : 'pokeball spinning'}/>
        </div>)}
        {[...pending.current.entries()].map(([id, attempt]) => <i className="pokeball capture-shake" key={id}
          aria-hidden="true" style={{ left: attempt.x, top: attempt.y,
            rotate: (reducedMotion ? 0 : Math.sin((2 - attempt.remaining) * Math.PI * 3) * 24) + 'deg' }}/>)}
        {bursts.current.map(effect => <div key={effect.id} className="impact" aria-hidden="true"
          style={{ left: effect.x, top: effect.y, color: effect.color }}>
          {Array.from({ length: reducedMotion ? 0 : 8 }, (_, i) => <i key={i} style={{ '--angle': i * 45 + 'deg' } as CSSProperties}/>)}
        </div>)}
        {rocket.current && <div className={'rocket' + (rocket.current.flash ? ' hit' : '')}
          style={{ left: rocket.current.x, top: rocket.current.y, rotate: rocket.current.angle + 'deg' }}><RocketSprite/></div>}
      </div>
      <div className="ship" aria-hidden="true" style={{ rotate: heading + 'deg', scale: camera.zoom, opacity: game.recovery ? .3 : 1 }}><Spaceship /></div>
    </div>
    {Boolean(rocket.current?.hp) && <div className="enemy-health">
      <span>TEAM ROCKET</span>
      <progress aria-label="Team Rocket health" max="100" value={rocket.current!.hp}/>
      <span>{rocket.current!.hp} HP</span>
    </div>}
    <section className="mission" aria-label="Flight HUD">
      <div className="mission-stats">
        <span>Hull {game.hp} HP</span><span>Pokéballs {game.ammo} / 30</span>
        <span>{Object.keys(progress.collection).length} / {cats.length} cats captured</span>
        <span>Score {progress.score}</span><span>Rocket defeats {progress.victories}</span>
        <span>{stopped ? 'Paused' : game.recovery ? 'Recovering' : rocket.current?.hp ? 'Under attack' : 'Exploring'}</span>
      </div>
      <div className="mission-actions">
        <button disabled={stopped || Boolean(game.recovery)} onClick={() => throwBall()}>Throw</button>
        <button aria-expanded={collection} onClick={() => setCollection(!collection)}>Collection</button>
        <button aria-pressed={manualPause} onClick={() => setManualPause(!manualPause)}>{manualPause ? 'Resume' : 'Pause'}</button>
      </div>
    </section>
    <div className="game-message" role="status" data-warning={message.startsWith('WARNING') || Boolean(game.recovery)}>
      {game.recovery ? 'Spaceship disabled! Respawning in ' + Math.ceil(game.recovery) + '…' : message}
    </div>
    {collection && <aside className="details collection" aria-label="Cat collection" onKeyDown={event => {
      if (event.key === 'Escape') setCollection(false)
    }}>
      <button autoFocus className="close" aria-label="Close collection" onClick={() => setCollection(false)}>×</button>
      <h2>Cat Collection</h2>
      {Object.keys(progress.collection).length === 0 && <p>Captured cats will appear here.</p>}
      <ul>{Object.values(progress.collection).map(({ cat, attempts }) => <li key={cat.id}>
        <span className="mini"><Sprite cat={cat}/></span>
        <div><strong>{cat.html_url ? <a href={cat.html_url} target="_blank" rel="noreferrer">{cat.name}</a> : cat.name}</strong>
          <div>{cat.language ?? 'Unspecified'} · ★ {cat.stargazers_count} · {rarity(cat.stargazers_count).name}</div>
          <small>{attempts} {attempts === 1 ? 'attempt' : 'attempts'}</small></div>
      </li>)}</ul>
    </aside>}
    <div className="map-controls" aria-label="Navigation controls">
      <button aria-label="Return to origin" disabled={Boolean(game.recovery)} onClick={center}>⌂</button>
      <button aria-label="Zoom out" disabled={Boolean(game.recovery) || camera.zoom <= .3} onClick={() => zoomBy(.8)}>−</button>
      <button aria-label="Zoom in" disabled={Boolean(game.recovery) || camera.zoom >= 1.6} onClick={() => zoomBy(1.25)}>+</button>
      {document.fullscreenEnabled && <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={() => void toggleFullscreen()}>⛶</button>}
    </div>
    {fullscreenError && <p className="fullscreen-status" role="status">Your browser could not enter fullscreen.</p>}
  </>
}
