import creditosJson from './creditos-plantas.json'

// Fotos de las especies: las de diseno/fotos-peces, achicadas a 640 px en webp. El archivo se
// llama como el id del pez (assets/peces/guppy.webp).
const archivos = import.meta.glob<string>('../assets/peces/*.webp', { eager: true, import: 'default', query: '?url' })

export const FOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(archivos).map(([ruta, url]) => [ruta.replace(/^.*\/|\.webp$/g, ''), url]),
)

/** Casi todas tienen fondo negro; la del molly es clara. */
export const fondoFoto = (id: string) => (id === 'molly' ? '#d6dbda' : '#08090a')

// Las de las plantas: las de diseno/fotos-plantas (Wikimedia Commons e iNaturalist), también a
// 640 px. Faltan las que no tienen ninguna foto libre que sirva.
const archivosPlantas = import.meta.glob<string>('../assets/plantas/*.webp', { eager: true, import: 'default', query: '?url' })

export const FOTOS_PLANTAS: Record<string, string> = Object.fromEntries(
  Object.entries(archivosPlantas).map(([ruta, url]) => [ruta.replace(/^.*\/|\.webp$/g, ''), url]),
)

/** Autor, licencia y página de cada foto; especie: la foto es de la especie, no de esta variedad. */
export const CREDITOS_PLANTAS = creditosJson as Record<string, { autor: string; licencia: string; fuente: string; especie?: string }>
