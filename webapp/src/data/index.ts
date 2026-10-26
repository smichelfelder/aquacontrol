// Biblioteca de especies, sacada tal cual del diseño (lib() de «Pantallas AquaControl.html»).
import pecesJson from './peces.json'
import plantasJson from './plantas.json'

export type Rango = [number, number]

export interface Pez {
  id: string
  nombre: string
  cientifico: string
  t: Rango          // temperatura, °C
  p: Rango          // pH
  d: Rango          // TDS, ppm
  talla: number     // cm de adulto
  minL: number      // litros netos mínimos
  minLargo: number  // cm de largo mínimos
  min: number       // grupo mínimo recomendado
  zona: string
  grupo: string
  nota: string
  extra: Record<string, string>  // id de otra especie → aviso de convivencia
}

export interface Planta {
  id: string
  nombre: string
  cientifico: string
  tipo: string
  zona: string
  dif: 0 | 1 | 2
  luz: 0 | 1 | 2
  co2: 0 | 1 | 2   // no necesita · recomendado · necesario
  crec: 0 | 1 | 2
  t: Rango
  p: Rango
  nota: string
}

export const PECES: Record<string, Pez> = Object.fromEntries((pecesJson as Pez[]).map((p) => [p.id, p]))
export const PLANTAS: Record<string, Planta> = Object.fromEntries((plantasJson as Planta[]).map((p) => [p.id, p]))

/** Cada cuánto pide la etiqueta: veces por semana y los días que se marcan al cargarlo. */
export type Frecuencia = 'diario' | '2-3' | '1-2' | '1'

export const FRECUENCIAS: Record<Frecuencia, { min: number; max: number; txt: string; corto: string; plan: number[] }> = {
  'diario': { min: 7, max: 7, txt: 'Todos los días', corto: 'etiqueta: diario', plan: [1, 1, 1, 1, 1, 1, 1] },
  '2-3': { min: 2, max: 3, txt: '2–3 por semana', corto: 'etiqueta: 2–3', plan: [1, 0, 1, 0, 1, 0, 0] },
  '1-2': { min: 1, max: 2, txt: '1–2 por semana', corto: 'etiqueta: 1–2', plan: [1, 0, 0, 1, 0, 0, 0] },
  '1': { min: 1, max: 1, txt: '1 por semana', corto: 'etiqueta: 1', plan: [1, 0, 0, 0, 0, 0, 0] },
}

/** En este orden se muestran (las claves de FRECUENCIAS no lo mantienen: «1» va primero). */
export const ORDEN_FRECUENCIAS: Frecuencia[] = ['diario', '2-3', '1-2', '1']

/** Un abono de la lista: la dosis es la de la etiqueta («ml cada litros»). */
export interface Abono {
  id: string
  nombre: string
  corto?: string   // para «Abono de hoy», si el nombre es largo
  ml: number
  litros: number
  frec: Frecuencia
}

// Los de la app anterior: sus ids son los del plan que ya tenía guardado
export const ABONOS: Abono[] = [
  { id: 'ec', nombre: 'Easy Carbo', ml: 1, litros: 50, frec: 'diario' },
  { id: 'fl', nombre: 'Flourish', ml: 5, litros: 250, frec: '1-2' },
  { id: 'k', nombre: 'Flourish Potassium', corto: 'Potassium', ml: 5, litros: 125, frec: '2-3' },
]

/**
 * Cómo conviene repartir machos y hembras: vivíparos (1 macho cada 2–3 hembras), un solo macho
 * (betta), un macho con hembras (harén) o en parejas. Las que no están se cargan sin sexar.
 */
export type Sexado = 'vivo' | 'unmacho' | 'harem' | 'pareja'
export const SEXADO: Record<string, Sexado> = {
  guppy: 'vivo', molly: 'vivo', platy: 'vivo', endler: 'vivo', espada: 'vivo', betta: 'unmacho',
  gouenano: 'harem', goumiel: 'harem', gouperla: 'harem', apisto: 'harem', ramirezi: 'pareja', krib: 'pareja', boliviano: 'pareja',
}

