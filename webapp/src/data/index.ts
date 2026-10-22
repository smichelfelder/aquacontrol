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

export interface Abono {
  id: 'ec' | 'fl' | 'k'
  nombre: string
  corto: string
  ml: number
  litros: number
  regla: string
  min: number
  max: number
}

export const ABONOS: Abono[] = [
  { id: 'ec', nombre: 'Easy Carbo', corto: 'Easy Carbo', ml: 1, litros: 50, regla: '1 ml cada 50 L', min: 7, max: 7 },
  { id: 'fl', nombre: 'Flourish', corto: 'Flourish', ml: 5, litros: 250, regla: '5 ml cada 250 L', min: 1, max: 2 },
  { id: 'k', nombre: 'Flourish Potassium', corto: 'Potassium', ml: 5, litros: 125, regla: '5 ml cada 125 L', min: 2, max: 3 },
]

export const HORAS_COMIDA = [9, 19]  // igual que hours: en firmware/aquacontrol.yaml
