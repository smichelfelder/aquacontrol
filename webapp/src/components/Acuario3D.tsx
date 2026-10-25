// El acuario en 3D, a escala con las medidas cargadas: vidrio, agua y sustrato, con el largo,
// el ancho y el alto sobre las aristas. Se gira arrastrando (o con las flechas del teclado).
// Es un SVG con una proyección propia: no hace falta una librería de 3D para una caja.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fmt } from '@/lib/acuario'

const ANCHO_VB = 400
const ALTO_VB = 240
const MARGEN = 34                    // lugar para las cotas alrededor del dibujo
const INCLINACION = (22 * Math.PI) / 180
const GIRO_INICIAL = -30
const GIRO_MAX = 75                  // grados hacia cada lado: siempre se ve el frente
const ARENA = 0.12                   // parte del alto con sustrato
const AGUA = 0.92                    // hasta dónde llega el agua

type V3 = [number, number, number]
type V2 = [number, number]

/** Las medidas cambian con una transición corta, así se ve cómo se estira el acuario. */
function useSuave(objetivo: V3) {
  const [v, setV] = useState(objetivo)
  const actual = useRef(objetivo)
  const [L, A, H] = objetivo
  useEffect(() => {
    const desde = actual.current
    const hasta: V3 = [L, A, H]
    const t0 = performance.now()
    let id = 0
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / 320)
      const e = 1 - (1 - k) ** 3
      const n = desde.map((d, i) => d + (hasta[i] - d) * e) as V3
      actual.current = n
      setV(n)
      if (k < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [L, A, H])
  return v
}

export function Acuario3D({ largo, ancho, alto }: { largo: number; ancho: number; alto: number }) {
  const [L, A, H] = useSuave([largo, ancho, alto])
  const [giro, setGiro] = useState(GIRO_INICIAL)
  const arrastre = useRef<{ x: number; giro: number } | null>(null)

  const th = (giro * Math.PI) / 180
  const cg = Math.cos(th), sg = Math.sin(th), ci = Math.cos(INCLINACION), si = Math.sin(INCLINACION)
  // Escala fija para cualquier giro (con la diagonal de la base): el dibujo no late al girarlo
  const diag = Math.hypot(L, A)
  const escala = Math.min((ANCHO_VB - 2 * MARGEN) / diag, (ALTO_VB - 2 * MARGEN) / (H * ci + diag * si))
  const cy = ALTO_VB / 2 + 4

  /** x = largo, y = alto (arriba), z = ancho (hacia quien mira). Devuelve pantalla y profundidad. */
  const rotar = ([x, y, z]: V3): V3 => {
    const x1 = x * cg + z * sg, z1 = -x * sg + z * cg
    return [x1, y * ci - z1 * si, y * si + z1 * ci]
  }
  const proyectar = (p: V3): V2 => {
    const [x, y] = rotar(p)
    return [ANCHO_VB / 2 + x * escala, cy - y * escala]
  }
  const pts = (ps: V3[]) => ps.map((p) => proyectar(p).map((n) => n.toFixed(1)).join(',')).join(' ')

  const x0 = -L / 2, x1 = L / 2, z0 = -A / 2, z1 = A / 2, piso = -H / 2
  const caras = (y0: number, y1: number) => [
    { n: [0, 0, 1] as V3, c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] as V3[], luz: 1 },     // frente
    { n: [0, 0, -1] as V3, c: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]] as V3[], luz: 0.7 },  // fondo
    { n: [1, 0, 0] as V3, c: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] as V3[], luz: 0.75 },  // derecha
    { n: [-1, 0, 0] as V3, c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] as V3[], luz: 0.75 }, // izquierda
    { n: [0, 1, 0] as V3, c: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as V3[], luz: 1.25 },  // arriba
    { n: [0, -1, 0] as V3, c: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] as V3[], luz: 0.5 },  // abajo
  ]
  const seVe = (n: V3) => rotar(n)[2] > 1e-6
  const arena = piso + H * ARENA
  const agua = piso + H * AGUA
  const vidrio = caras(piso, H / 2)

  // Cotas: largo y ancho sobre las aristas de abajo que se ven; alto en el borde del costado opuesto
  const derechaSeVe = seVe([1, 0, 0])
  const xLado = derechaSeVe ? x1 : x0
  const cotas = [
    { a: [x0, piso, z1] as V3, b: [x1, piso, z1] as V3, txt: fmt(largo, 0) + ' cm', nombre: 'largo' },
    { a: [xLado, piso, z1] as V3, b: [xLado, piso, z0] as V3, txt: fmt(ancho, 0) + ' cm', nombre: 'ancho' },
    { a: [derechaSeVe ? x0 : x1, piso, z1] as V3, b: [derechaSeVe ? x0 : x1, H / 2, z1] as V3, txt: fmt(alto, 0) + ' cm', nombre: 'alto' },
  ]
  const centro = proyectar([0, 0, 0])

  const girar = (g: number) => setGiro(Math.max(-GIRO_MAX, Math.min(GIRO_MAX, g)))
  const bajar = (e: PointerEvent<SVGSVGElement>) => {
    arrastre.current = { x: e.clientX, giro }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const mover = (e: PointerEvent<SVGSVGElement>) => {
    if (!arrastre.current) return
    const ancho = e.currentTarget.getBoundingClientRect().width || ANCHO_VB
    girar(arrastre.current.giro + ((e.clientX - arrastre.current.x) / ancho) * 160)
  }
  const soltar = () => { arrastre.current = null }
  const tecla = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft') girar(giro - 10)
    else if (e.key === 'ArrowRight') girar(giro + 10)
    else if (e.key === 'Home') girar(GIRO_INICIAL)
    else return
    e.preventDefault()
  }

  return (
    <svg viewBox={`0 0 ${ANCHO_VB} ${ALTO_VB}`} width="100%" role="img" tabIndex={0}
      aria-label={`Dibujo del acuario: ${fmt(largo, 0)} cm de largo, ${fmt(ancho, 0)} de ancho y ${fmt(alto, 0)} de alto. Arrastrá o usá las flechas para girarlo.`}
      onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onKeyDown={tecla}
      onDoubleClick={() => girar(GIRO_INICIAL)}
      className="block cursor-grab touch-pan-y rounded-2xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing">
      <defs>
        <linearGradient id="a3d-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(90 200 200)" stopOpacity="0.42" />
          <stop offset="1" stopColor="rgb(25 105 125)" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="a3d-sombra">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sombra en el mueble */}
      <ellipse cx={centro[0]} cy={proyectar([0, piso, 0])[1] + 6} rx={(diag * escala) / 1.7} ry={10} fill="url(#a3d-sombra)" />

      {/* Vidrio de atrás */}
      {vidrio.filter((f) => !seVe(f.n)).map((f, i) => (
        <polygon key={'v' + i} points={pts(f.c)} fill="rgba(170, 225, 212, 0.04)" stroke="rgba(170, 225, 212, 0.22)" strokeWidth={1} strokeLinejoin="round" />
      ))}

      {/* Sustrato */}
      {caras(piso, arena).filter((f) => seVe(f.n)).map((f, i) => (
        <polygon key={'s' + i} points={pts(f.c)} fill={`rgba(${Math.round(196 * f.luz)}, ${Math.round(168 * f.luz)}, ${Math.round(118 * f.luz)}, 0.85)`} stroke="rgba(214, 190, 140, 0.3)" strokeWidth={0.6} strokeLinejoin="round" />
      ))}

      {/* Agua */}
      {caras(arena, agua).filter((f) => seVe(f.n)).map((f, i) => (
        f.n[1] === 1
          ? <polygon key={'a' + i} points={pts(f.c)} fill="rgba(150, 230, 225, 0.22)" stroke="rgba(190, 245, 235, 0.55)" strokeWidth={1} strokeLinejoin="round" />
          : <polygon key={'a' + i} points={pts(f.c)} fill="url(#a3d-agua)" fillOpacity={f.luz} stroke="none" />
      ))}

      {/* Vidrio de adelante */}
      {vidrio.filter((f) => seVe(f.n)).map((f, i) => (
        <polygon key={'f' + i} points={pts(f.c)} fill={f.n[1] === 1 ? 'rgba(170, 225, 212, 0.03)' : 'rgba(170, 225, 212, 0.05)'}
          stroke="rgba(190, 240, 228, 0.75)" strokeWidth={1.4} strokeLinejoin="round" />
      ))}
      {/* Reflejo en el frente */}
      <polygon points={pts([[x0 + L * 0.06, piso + H * 0.2, z1], [x0 + L * 0.1, piso + H * 0.2, z1], [x0 + L * 0.22, H / 2 - H * 0.08, z1], [x0 + L * 0.18, H / 2 - H * 0.08, z1]])}
        fill="rgba(255, 255, 255, 0.07)" />

      {cotas.map((c) => <Cota key={c.nombre} a={proyectar(c.a)} b={proyectar(c.b)} centro={centro} txt={c.txt} />)}
    </svg>
  )
}

/** Línea de cota paralela a la arista, del lado de afuera del acuario, con la medida en el medio. */
function Cota({ a, b, centro, txt }: { a: V2; b: V2; centro: V2; txt: string }) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const largo = Math.hypot(dx, dy)
  if (largo < 8) return null    // la arista se ve de punta: no hay dónde ponerla
  let nx = -dy / largo, ny = dx / largo
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
  if (nx * (mx - centro[0]) + ny * (my - centro[1]) < 0) { nx = -nx; ny = -ny }
  const sep = 14
  const p = (q: V2, d: number) => [q[0] + nx * d, q[1] + ny * d] as V2
  const [a1, b1] = [p(a, sep), p(b, sep)]
  const [tx, ty] = p([mx, my], sep)
  const w = txt.length * 7.4 + 14
  return (
    <g>
      <line x1={p(a, 4)[0]} y1={p(a, 4)[1]} x2={p(a, sep + 4)[0]} y2={p(a, sep + 4)[1]} stroke="rgba(167, 192, 187, 0.6)" strokeWidth={1} />
      <line x1={p(b, 4)[0]} y1={p(b, 4)[1]} x2={p(b, sep + 4)[0]} y2={p(b, sep + 4)[1]} stroke="rgba(167, 192, 187, 0.6)" strokeWidth={1} />
      <line x1={a1[0]} y1={a1[1]} x2={b1[0]} y2={b1[1]} stroke="rgba(127, 214, 180, 0.8)" strokeWidth={1.2} />
      <rect x={tx - w / 2} y={ty - 11} width={w} height={22} rx={11} fill="#0f2427" stroke="rgba(127, 214, 180, 0.45)" />
      <text x={tx} y={ty + 4.5} textAnchor="middle" fontSize={13} fontFamily="Sora Variable, sans-serif" fill="#e8f1ef">{txt}</text>
    </g>
  )
}
