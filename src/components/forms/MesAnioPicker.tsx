'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  required?: boolean
}

const MESES = [
  { v: '01', n: 'Enero' }, { v: '02', n: 'Febrero' }, { v: '03', n: 'Marzo' },
  { v: '04', n: 'Abril' }, { v: '05', n: 'Mayo' }, { v: '06', n: 'Junio' },
  { v: '07', n: 'Julio' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Septiembre' },
  { v: '10', n: 'Octubre' }, { v: '11', n: 'Noviembre' }, { v: '12', n: 'Diciembre' },
]

export default function MesAnioPicker({ value, onChange, required }: Props) {
  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i + 1)

  const [mm, setMm] = useState(() => value ? value.split('/')[0] : '')
  const [yyyy, setYyyy] = useState(() => value ? value.split('/')[1] : '')

  // Sincroniza cuando el padre resetea value a ''
  useEffect(() => {
    if (!value) {
      setMm('')
      setYyyy('')
    } else {
      const parts = value.split('/')
      if (parts.length === 2) {
        setMm(parts[0])
        setYyyy(parts[1])
      }
    }
  }, [value])

  const handleMmChange = (newMm: string) => {
    setMm(newMm)
    if (newMm && yyyy) onChange(`${newMm}/${yyyy}`)
  }

  const handleYyyyChange = (newYyyy: string) => {
    setYyyy(newYyyy)
    if (mm && newYyyy) onChange(`${mm}/${newYyyy}`)
  }

  return (
    <div>
      <label className="text-xs font-black uppercase tracking-widest text-text-secondary block mb-2">
        Mes / Año {required && <span className="text-primary">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={mm} onChange={(e) => handleMmChange(e.target.value)} required={required}>
          <option value="">Mes</option>
          {MESES.map((m) => <option key={m.v} value={m.v}>{m.n}</option>)}
        </select>
        <select className="input" value={yyyy} onChange={(e) => handleYyyyChange(e.target.value)} required={required}>
          <option value="">Año</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  )
}
