// Fotos de las especies: las de diseno/fotos-peces, achicadas a 640 px en webp. El archivo se
// llama como el id del pez (assets/peces/guppy.webp).
const archivos = import.meta.glob<string>('../assets/peces/*.webp', { eager: true, import: 'default', query: '?url' })

export const FOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(archivos).map(([ruta, url]) => [ruta.replace(/^.*\/|\.webp$/g, ''), url]),
)

/** Casi todas tienen fondo negro; la del molly es clara. */
export const fondoFoto = (id: string) => (id === 'molly' ? '#d6dbda' : '#08090a')
