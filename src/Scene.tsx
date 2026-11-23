import type { CSSProperties } from 'react'
import type { Cat } from './cats'
import { slot } from './animation'

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

export function Scene({ cats, selected, door, onSelect }: {
  cats: Cat[]; selected?: number; door: boolean; onSelect: (cat: Cat) => void
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
    {cats.map((cat, index) => {
      const position = slot(index)
      return <button key={cat.id} type="button" className={'cat ' + cat.mood} aria-label={cat.name}
        aria-pressed={selected === cat.id} title={cat.name}
        style={{ left: position.x + '%', top: position.y + '%', '--entry-x': (12 - position.x) * .8 + 'vw',
          '--entry-y': (57 - position.y) * 4 + 'px', '--phase': -(cat.id % 7) + 's' } as CSSProperties}
        onClick={() => onSelect(cat)}><span className="cat-idle"><Sprite cat={cat}/></span></button>
    })}
  </div>
}
