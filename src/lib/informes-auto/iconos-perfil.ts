/**
 * Ícono Font Awesome para cada respuesta del perfil del visitante (por palabra
 * clave). Sin coincidencia → null (se muestra sin ícono). Puro.
 */

import { claveRespuesta } from './etiquetas-perfil'

export type CategoriaPerfil = 'transporte' | 'grupo' | 'alojamiento' | 'procedencia'

/** Orden importa: la primera palabra clave que aparece gana ("OMNIBUS CONTINGENTE" → bus). */
const ICONOS: Record<CategoriaPerfil, Array<[string, string]>> = {
  transporte: [
    ['MOTORHOME', 'fa-caravan'],
    ['MOTO', 'fa-motorcycle'],
    ['AVION', 'fa-plane'],
    ['OMNIBUS', 'fa-bus'],
    ['AUTO', 'fa-car'],
    ['VEHICULO', 'fa-car'],
  ],
  grupo: [
    ['PAREJA', 'fa-heart'],
    ['FAMILIA', 'fa-people-roof'],
    ['AMIG', 'fa-user-group'],
    ['INDIVIDUAL', 'fa-user'],
    ['CONTINGENTE', 'fa-users'],
  ],
  alojamiento: [
    ['HOTEL', 'fa-hotel'],
    ['DEPARTAMENTO', 'fa-building'],
    ['CAMPING', 'fa-campground'],
    ['CASA DE FAMILIAR', 'fa-house'],
  ],
  procedencia: [
    ['INTERNACIONAL', 'fa-earth-americas'],
    ['NACIONAL', 'fa-flag'],
    ['PROVINCIAL', 'fa-map-location-dot'],
  ],
}

export function iconoPerfil(categoria: CategoriaPerfil, respuesta: string): string | null {
  const clave = claveRespuesta(respuesta)
  return ICONOS[categoria].find(([palabra]) => clave.includes(palabra))?.[1] ?? null
}
