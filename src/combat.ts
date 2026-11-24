export type Point = { x: number; y: number }
export type Shot = Point & { id: number; vx: number; vy: number; life: number; hostile?: boolean }

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

// Test a projectile's path relative to the target's motion in this frame.
export function sweep(start: Point, end: Point, before: Point, after: Point, radius: number) {
  const x = start.x - before.x
  const y = start.y - before.y
  const dx = end.x - after.x - x
  const dy = end.y - after.y - y
  const a = dx * dx + dy * dy
  const b = x * dx + y * dy
  const c = x * x + y * y - radius * radius
  const discriminant = b * b - a * c
  const contact = c <= 0 ? 0 : a && discriminant >= 0 ? (-b - Math.sqrt(discriminant)) / a : Infinity
  if (contact < 0 || contact > 1) return undefined
  const closest = a ? Math.max(0, Math.min(1, -b / a)) : 0
  return { contact, distance: Math.hypot(x + dx * closest, y + dy * closest) }
}

export type Rocket = Point & { hp: number; angle: number; fire: number; flash: number; exit: number }

export function flyRocket(rocket: Rocket, ship: Point, dt: number, clock: number, shots: Shot[]) {
  const distance = Math.hypot(ship.x - rocket.x, ship.y - rocket.y)
  const aim = Math.atan2(ship.y - rocket.y, ship.x - rocket.x)
  const dodging = shots.some(shot => !shot.hostile && Math.hypot(shot.x - rocket.x, shot.y - rocket.y) < 140 &&
    (rocket.x - shot.x) * shot.vx + (rocket.y - shot.y) * shot.vy > 0)
  const strafe = Math.sin(clock * 1.5)
  const forward = distance > 245 ? 380 : distance < 150 ? -175 : 40
  const side = dodging && strafe > .25 ? 280 : strafe * 105
  rocket.x += (Math.cos(aim) * forward - Math.sin(aim) * side) * dt
  rocket.y += (Math.sin(aim) * forward + Math.cos(aim) * side) * dt
  rocket.angle = aim * 180 / Math.PI
  rocket.flash = Math.max(0, rocket.flash - dt)
  rocket.fire -= dt
  return distance < 550 && rocket.fire <= 0 ? aim : undefined
}
