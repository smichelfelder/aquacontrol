import { useSyncExternalStore } from 'react'

// El mismo corte que «md:» de Tailwind
const consulta = window.matchMedia('(min-width: 48rem)')
const suscribir = (f: () => void) => { consulta.addEventListener('change', f); return () => consulta.removeEventListener('change', f) }

/** En tablet la lista y la ficha se ven una al lado de la otra; en el móvil, una por vez. */
export const useTablet = () => useSyncExternalStore(suscribir, () => consulta.matches)
