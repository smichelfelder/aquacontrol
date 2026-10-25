import { useSyncExternalStore } from 'react'

// El mismo corte que «lg:» de Tailwind: desde ahí entra el diseño de la pantalla de 7" (1280 px)
const consulta = window.matchMedia('(min-width: 64rem)')
const suscribir = (f: () => void) => { consulta.addEventListener('change', f); return () => consulta.removeEventListener('change', f) }

/** Pantalla ancha: la lista y la ficha se ven una al lado de la otra; si no, una por vez. */
export const useAncha = () => useSyncExternalStore(suscribir, () => consulta.matches)
