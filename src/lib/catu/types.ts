// Tipos del módulo Catu Bot Analytics (GAS: gas/catu/Catu.gs, respuesta v2)

export interface CatuDiario {
  fecha: string // yyyy-MM-dd en hora Argentina
  conversaciones: number
  mensajes_total: number
  score_suma: number
  score_n: number // conversaciones con puntaje (denominador del promedio)
  resueltas: number
  requieren_atencion: number
  info_faltante: number
  sent_positivo: number
  sent_neutral: number
  sent_negativo: number
  sent_sin_dato: number
}

/**
 * Tópicos por día en formato compacto.
 * filas: [índice de día, índice de tópico, total, resueltas, score_suma, score_n]
 */
export interface CatuTopicosDiarios {
  dias: string[]
  nombres: string[]
  filas: [number, number, number, number, number, number][]
}

export type CatuSentimientoNombre = 'Positivo' | 'Neutral' | 'Negativo' | 'Sin dato'

export interface CatuSentimiento {
  sentimiento: CatuSentimientoNombre
  total: number
  porcentaje: number
}

export interface CatuDashboard {
  serie_diaria: CatuDiario[]
  topicos_diarios: CatuTopicosDiarios
  ultima_sync: string | null
  ultima_sync_estado: 'ok' | 'error' | null
}
