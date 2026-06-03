// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AccOpcion = 'Sí' | 'No' | 'Sin dato' | 'No aplica' | null

export interface AccAtractivoDirectus {
  id: number
  atractivo_id: {
    id: number
    nombre: string
    tipo_atractivos?: string
    foto_principal?: { id: string } | null
  }
  date_created: string
  metodo_relevamiento: string | null
  Estado: string
  foto_acceso: string | null
  foto_bano: string | null
  acc_estacionamiento_adaptado: AccOpcion
  acc_sendero_acceso_firme: AccOpcion
  acc_ingreso_sin_escalones: AccOpcion
  acc_rampa_pendiente_correcta: AccOpcion
  acc_puerta_ingreso_ancho: AccOpcion
  acc_puerta_vidrio_bandas: AccOpcion
  acc_circulacion_ancho_minimo: AccOpcion
  acc_pisos_antideslizantes: AccOpcion
  acc_cambios_textura_piso: AccOpcion
  acc_desniveles_resueltos: AccOpcion
  acc_radio_giro_libre: AccOpcion
  acc_mobiliario_descanso: AccOpcion
  acc_bano_accesible: AccOpcion
  acc_mostrador_adaptado: AccOpcion
  acc_sillas_ruedas_prestamo: AccOpcion
  acc_visitas_guiadas_accesibles: AccOpcion
  acc_boleteria_prioritaria: AccOpcion
  acc_mapa_tactico: AccOpcion
  acc_audioguia: AccOpcion
  acc_elementos_tactiles: AccOpcion
  acc_senalizacion_braille: AccOpcion
  acc_franja_guia_recorrido: AccOpcion
  acc_videos_subtitulados: AccOpcion
  acc_interprete_lsa: AccOpcion
  acc_aro_magnetico: AccOpcion
  acc_alarmas_visuales: AccOpcion
  acc_senalizacion_pictogramas: AccOpcion
  acc_informacion_lectura_facil: AccOpcion
  acc_recorrido_guiado_simple: AccOpcion
  acc_ambiente_sin_sobrestimulacion: AccOpcion
  val_movilidad: string | null
  val_visual: string | null
  val_auditiva: string | null
  val_cognitiva: string | null
  val_general: string | null
  observaciones: string
  fotos_acceso_exterior: { directus_files_id: string }[]
  fotos_circulacion: { directus_files_id: string }[]
  fotos_servicios: { directus_files_id: string }[]
  fotos_visual: { directus_files_id: string }[]
  fotos_auditiva: { directus_files_id: string }[]
  fotos_cognitiva: { directus_files_id: string }[]
}

// ─── Dimensiones ──────────────────────────────────────────────────────────────

export interface Dimension {
  key: string
  label: string
  color: string
  bgColor: string
  icon: string
  fotosKey: keyof AccAtractivoDirectus
  campos: (keyof AccAtractivoDirectus)[]
  labels: string[]
}

export const DIMENSIONES: Dimension[] = [
  {
    key: 'acceso',
    label: 'Acceso exterior',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    icon: 'fa-door-open',
    fotosKey: 'fotos_acceso_exterior',
    campos: [
      'acc_estacionamiento_adaptado',
      'acc_sendero_acceso_firme',
      'acc_ingreso_sin_escalones',
      'acc_rampa_pendiente_correcta',
      'acc_puerta_ingreso_ancho',
      'acc_puerta_vidrio_bandas',
    ],
    labels: [
      'A1. Estacionamiento SIA',
      'A2. Sendero firme ≥0,90m',
      'A3. Ingreso sin escalones',
      'A4. Rampa correcta',
      'A5. Puerta ≥0,80m',
      'A6. Bandas en vidrio',
    ],
  },
  {
    key: 'circulacion',
    label: 'Circulación interior',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    icon: 'fa-person-walking',
    fotosKey: 'fotos_circulacion',
    campos: [
      'acc_circulacion_ancho_minimo',
      'acc_pisos_antideslizantes',
      'acc_cambios_textura_piso',
      'acc_desniveles_resueltos',
      'acc_radio_giro_libre',
      'acc_mobiliario_descanso',
    ],
    labels: [
      'A7. Pasillos ≥0,90m',
      'A8. Pisos antideslizantes',
      'A9. Texturas / podotáctil',
      'A10. Desniveles resueltos',
      'A11. Giro 1,50m libre',
      'A12. Mobiliario descanso',
    ],
  },
  {
    key: 'servicios',
    label: 'Servicios',
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    icon: 'fa-concierge-bell',
    fotosKey: 'fotos_servicios',
    campos: [
      'acc_bano_accesible',
      'acc_mostrador_adaptado',
      'acc_sillas_ruedas_prestamo',
      'acc_visitas_guiadas_accesibles',
      'acc_boleteria_prioritaria',
    ],
    labels: [
      'A13. Baño accesible',
      'A14. Mostrador adaptado',
      'A15. Sillas de ruedas',
      'A16. Visitas accesibles',
      'A17. Boletería prioritaria',
    ],
  },
  {
    key: 'visual',
    label: 'Disc. visual',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    icon: 'fa-eye',
    fotosKey: 'fotos_visual',
    campos: [
      'acc_mapa_tactico',
      'acc_audioguia',
      'acc_elementos_tactiles',
      'acc_senalizacion_braille',
      'acc_franja_guia_recorrido',
    ],
    labels: [
      'A18. Mapa táctil',
      'A19. Audioguía',
      'A20. Elementos táctiles',
      'A21. Braille / letra grande',
      'A22. Franja guía',
    ],
  },
  {
    key: 'auditiva',
    label: 'Disc. auditiva',
    color: '#f97316',
    bgColor: 'bg-orange-50',
    icon: 'fa-ear-deaf',
    fotosKey: 'fotos_auditiva',
    campos: [
      'acc_videos_subtitulados',
      'acc_interprete_lsa',
      'acc_aro_magnetico',
      'acc_alarmas_visuales',
    ],
    labels: [
      'A23. Videos subtitulados',
      'A24. Intérprete LSA',
      'A25. Aro magnético',
      'A26. Alarmas visuales',
    ],
  },
  {
    key: 'cognitiva',
    label: 'Disc. cognitiva',
    color: '#14b8a6',
    bgColor: 'bg-teal-50',
    icon: 'fa-brain',
    fotosKey: 'fotos_cognitiva',
    campos: [
      'acc_senalizacion_pictogramas',
      'acc_informacion_lectura_facil',
      'acc_recorrido_guiado_simple',
      'acc_ambiente_sin_sobrestimulacion',
    ],
    labels: [
      'A27. Pictogramas',
      'A28. Lectura fácil',
      'A29. Recorrido simple',
      'A30. Sin sobrestimulación',
    ],
  },
]

// ─── Cálculo de cumplimiento ──────────────────────────────────────────────────

export function calcularCumplimiento(
  registro: AccAtractivoDirectus,
  dimension: Dimension
): number | null {
  let si = 0
  let aplicables = 0
  for (const campo of dimension.campos) {
    const val = registro[campo] as AccOpcion
    if (val === 'No aplica') continue
    aplicables++
    if (val === 'Sí') si++
  }
  if (aplicables === 0) return null
  return Math.round((si / aplicables) * 100)
}

export function calcularCumplimientoGeneral(
  registro: AccAtractivoDirectus
): number | null {
  const valores = DIMENSIONES.map(d => calcularCumplimiento(registro, d)).filter(
    (v): v is number => v !== null
  )
  if (valores.length === 0) return null
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
}

// ─── Nivel semafórico ─────────────────────────────────────────────────────────

export function nivelAccesibilidad(pct: number | null): {
  label: string
  color: string
  bg: string
  textColor: string
} {
  if (pct === null) return { label: 'Sin datos',  color: '#9ca3af', bg: 'bg-gray-100',    textColor: 'text-gray-500'    }
  if (pct >= 90)   return { label: 'Muy alto',    color: '#10b981', bg: 'bg-emerald-100', textColor: 'text-emerald-700' }
  if (pct >= 70)   return { label: 'Alto',         color: '#22c55e', bg: 'bg-green-100',   textColor: 'text-green-700'   }
  if (pct >= 50)   return { label: 'Medio',        color: '#f59e0b', bg: 'bg-amber-100',   textColor: 'text-amber-700'   }
  if (pct >= 30)   return { label: 'Bajo',         color: '#ef4444', bg: 'bg-red-100',     textColor: 'text-red-700'     }
  return                  { label: 'Muy bajo',     color: '#b91c1c', bg: 'bg-red-100',     textColor: 'text-red-800'     }
}
