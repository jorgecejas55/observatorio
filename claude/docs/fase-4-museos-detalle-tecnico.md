# Fase 4 Museos - Detalle Técnico
> Documentación técnica de la implementación de funcionalidades avanzadas
> 
> **Fecha:** 13/04/2026  
> **Museos implementados:** Virgen del Valle, Adán Quiroga, Casa Caravati  
> **Estado:** ✅ Completado - Fase 4 completa para 3 museos (100%)

---

## 1. Dashboard con Métricas y Gráficos

### Componente: `src/components/museos/DashboardMuseo.tsx`

**Props interface:**
```typescript
interface DashboardMuseoProps {
  nombreMuseo: string
  ocasionales: VisitaOcasional[]
  institucionales: VisitaInstitucional[]
}
```

**KPIs calculados:**
- Total visitas ocasionales
- Total visitas institucionales
- Total de personas (suma de ambos tipos)
- Promedio de personas por visita

**Filtros implementados:**
```typescript
const [anoSeleccionado, setAnoSeleccionado] = useState<string>('todos')
const [fechaDesde, setFechaDesde] = useState<string>('')
const [fechaHasta, setFechaHasta] = useState<string>('')

// Filtrado optimizado con useMemo
const ocasionalesFiltradas = useMemo(() => {
  return ocasionales.filter(v => {
    if (!v.Fecha) return false
    if (anoSeleccionado !== 'todos' && v.Fecha.substring(0, 4) !== anoSeleccionado) return false
    if (fechaDesde && v.Fecha < fechaDesde) return false
    if (fechaHasta && v.Fecha > fechaHasta) return false
    return true
  })
}, [ocasionales, anoSeleccionado, fechaDesde, fechaHasta])
```

**Gráficos Recharts:**

1. **Visitas ocasionales por mes** (AreaChart)
   ```typescript
   <AreaChart data={datosPorMesOcasionales}>
     <defs>
       <linearGradient id="colorOcasionales" x1="0" y1="0" x2="0" y2="1">
         <stop offset="5%" stopColor="#db2777" stopOpacity={0.8} />
         <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
       </linearGradient>
     </defs>
     <Area type="monotone" dataKey="visitas" stroke="#db2777" fill="url(#colorOcasionales)" />
   </AreaChart>
   ```

2. **Visitas institucionales por mes** (AreaChart)
   - Color: `#0ea5e9` (azul)
   - Mismo patrón que ocasionales

3. **Procedencia de visitantes** (PieChart con Donut)
   ```typescript
   <Pie
     data={datosProcedencia}
     cx="50%"
     cy="50%"
     innerRadius={55}
     outerRadius={85}
     fill="#8884d8"
     paddingAngle={2}
     dataKey="value"
     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
   >
     {datosProcedencia.map((entry, index) => (
       <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
     ))}
   </Pie>
   ```

4. **Tipo de institución** (BarChart horizontal)
   ```typescript
   <BarChart layout="vertical" data={datosTipoInstitucion}>
     <Bar dataKey="cantidad" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
   </BarChart>
   ```

5. **Canal de difusión** (BarChart horizontal)
   - Color: `#10b981` (verde)
   - Procesa canales separados por coma

**Paleta de colores:**
```typescript
const COLORS_PIE = ['#db2777', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#6b7280']
```

**Responsive:**
- Todos los gráficos usan `<ResponsiveContainer width="100%" height={300}>`
- Grid adaptable: `grid grid-cols-1 md:grid-cols-2 gap-4`

---

## 2. Exportación XLSX y CSV

### Librería utilizada: `xlsx` (SheetJS)

**Instalación:**
```bash
npm install xlsx
```

**Import:**
```typescript
import * as XLSX from 'xlsx'
```

### Implementación Exportación XLSX

```typescript
const exportarXLSX = useCallback(() => {
  const datos = visitasFiltradas.map(v => ({
    'Fecha': v.Fecha || '',
    'Procedencia': (v['Procedencia '] || '').trim(),
    'Lugar de procedencia': (v['Lugar de procedencia '] || '').trim(),
    'Total de personas': v['Total de personas'] || 0,
    'Motivo de visita': v.motivo_visita || '',
    'Canal de difusión': v.canal_difusion || '',
    'Usuario registro': v.usuario_registro || ''
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  // Anchos de columnas personalizados
  const colWidths = [
    { wch: 12 },  // Fecha
    { wch: 15 },  // Procedencia
    { wch: 25 },  // Lugar
    { wch: 12 },  // Total
    { wch: 25 },  // Motivo
    { wch: 30 },  // Canal
    { wch: 25 }   // Usuario
  ]
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Visitas Ocasionales')

  const fecha = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `visitas-ocasionales-virgen-valle-${fecha}.xlsx`)
}, [visitasFiltradas])
```

### Implementación Exportación CSV

```typescript
const exportarCSV = useCallback(() => {
  const datos = visitasFiltradas.map(v => ({
    'Fecha': v.Fecha || '',
    'Procedencia': (v['Procedencia '] || '').trim(),
    'Lugar de procedencia': (v['Lugar de procedencia '] || '').trim(),
    'Total de personas': v['Total de personas'] || 0,
    'Motivo de visita': v.motivo_visita || '',
    'Canal de difusión': v.canal_difusion || '',
    'Usuario registro': v.usuario_registro || ''
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)
  XLSX.utils.book_append_sheet(wb, ws, 'Visitas')

  const fecha = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `visitas-ocasionales-virgen-valle-${fecha}.csv`, { bookType: 'csv' })
}, [visitasFiltradas])
```

### UI - Dropdown de Exportación

```typescript
const [dropdownOpen, setDropdownOpen] = useState(false)

<div className="relative">
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className="btn-secondary text-sm"
  >
    <i className="fa-solid fa-download" /> Exportar
  </button>
  {dropdownOpen && (
    <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-lg border border-gray-200 py-1 z-10 min-w-[200px]">
      <button
        onClick={() => { exportarXLSX(); setDropdownOpen(false) }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
      >
        <i className="fa-solid fa-file-excel text-green-600" /> Exportar a Excel (XLSX)
      </button>
      <button
        onClick={() => { exportarCSV(); setDropdownOpen(false) }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
      >
        <i className="fa-solid fa-file-csv text-blue-600" /> Exportar a CSV
      </button>
    </div>
  )}
</div>
```

---

## 3. Carga Masiva de Registros

### Página: `ocasionales/carga-masiva/page.tsx`

**Interface:**
```typescript
interface VisitaOcasional {
  Fecha: string
  'Procedencia ': string  // IMPORTANTE: espacio al final
  'Lugar de procedencia ': string  // IMPORTANTE: espacio al final
  'Total de personas': number | string
  motivo_visita: string
  canalesSeleccionados: string[]  // Array, NO string
}
```

**Estado del formulario:**
```typescript
const [visitas, setVisitas] = useState<VisitaOcasional[]>([{
  Fecha: '',
  'Procedencia ': '',
  'Lugar de procedencia ': '',
  'Total de personas': '',
  motivo_visita: '',
  canalesSeleccionados: [],
}])
```

**Funciones principales:**

1. **Agregar visita:**
```typescript
const agregarVisita = useCallback(() => {
  setVisitas([...visitas, {
    Fecha: '',
    'Procedencia ': '',
    'Lugar de procedencia ': '',
    'Total de personas': '',
    motivo_visita: '',
    canalesSeleccionados: [],
  }])
}, [visitas])
```

2. **Quitar visita:**
```typescript
const quitarVisita = useCallback((index: number) => {
  if (visitas.length === 1) {
    setToast({ message: 'Debe haber al menos una visita', type: 'info' })
    return
  }
  setVisitas(visitas.filter((_, i) => i !== index))
}, [visitas])
```

3. **Actualizar campo:**
```typescript
const actualizarCampo = useCallback((index: number, campo: keyof VisitaOcasional, valor: any) => {
  const nuevasVisitas = [...visitas]

  // Si cambia procedencia, resetear lugar
  if (campo === 'Procedencia ') {
    nuevasVisitas[index] = { ...nuevasVisitas[index], [campo]: valor, 'Lugar de procedencia ': '' }
  } else {
    nuevasVisitas[index] = { ...nuevasVisitas[index], [campo]: valor }
  }

  setVisitas(nuevasVisitas)
}, [visitas])
```

4. **Toggle canal (checkboxes):**
```typescript
const toggleCanal = useCallback((index: number, canal: string) => {
  const nuevasVisitas = [...visitas]
  const canales = nuevasVisitas[index].canalesSeleccionados

  if (canales.includes(canal)) {
    nuevasVisitas[index].canalesSeleccionados = canales.filter(c => c !== canal)
  } else {
    nuevasVisitas[index].canalesSeleccionados = [...canales, canal]
  }

  setVisitas(nuevasVisitas)
}, [visitas])
```

5. **Validación:**
```typescript
const validar = useCallback(() => {
  for (let i = 0; i < visitas.length; i++) {
    const v = visitas[i]
    if (!v.Fecha) {
      setToast({ message: `Fila ${i + 1}: Falta fecha`, type: 'error' })
      return false
    }
    if (!v['Procedencia ']) {
      setToast({ message: `Fila ${i + 1}: Falta procedencia`, type: 'error' })
      return false
    }
    if (!v['Total de personas'] || v['Total de personas'] === 0) {
      setToast({ message: `Fila ${i + 1}: Falta total de personas`, type: 'error' })
      return false
    }
  }
  return true
}, [visitas])
```

6. **Guardar todas:**
```typescript
const guardarTodas = useCallback(async () => {
  if (!validar()) return

  const userInfo = getUserInfo()
  const userEmail = userInfo?.email || 'sin-email'

  setGuardando(true)
  try {
    let exitosas = 0
    let errores = 0

    for (const visita of visitas) {
      try {
        const res = await fetch('/api/ocio/ingresos/museo-virgen-valle/ocasionales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Fecha: visita.Fecha,
            'Procedencia ': visita['Procedencia '],
            'Lugar de procedencia ': visita['Lugar de procedencia '],
            'Total de personas': parseInt(String(visita['Total de personas'])),
            motivo_visita: visita.motivo_visita,
            canal_difusion: visita.canalesSeleccionados.join(', '),  // JOIN aquí
            usuario_registro: userEmail  // IMPORTANTE
          }),
        })

        const result = await res.json()
        if (result.success) {
          exitosas++
        } else {
          errores++
        }
      } catch (err) {
        errores++
      }
    }

    if (errores === 0) {
      setToast({ message: `${exitosas} visitas guardadas exitosamente`, type: 'success' })
      // Reset form
      setVisitas([{ /* visita vacía */ }])
    } else {
      setToast({ message: `${exitosas} exitosas, ${errores} errores`, type: 'error' })
    }
  } catch (err) {
    setToast({ message: 'Error al guardar las visitas', type: 'error' })
  } finally {
    setGuardando(false)
  }
}, [visitas, validar, getUserInfo])
```

**Renderizado de campos:**

1. **Procedencia (select):**
```typescript
<select
  value={visita['Procedencia ']}
  onChange={e => actualizarCampo(index, 'Procedencia ', e.target.value)}
  className="input w-full text-sm"
>
  <option value="">Seleccioná una opción</option>
  {PROCEDENCIAS.map(p => (
    <option key={p} value={p}>{p}</option>
  ))}
</select>
```

2. **Lugar procedencia (select condicional con label dinámico):**
```typescript
{visita['Procedencia '] && visita['Procedencia '] !== 'Residente' && (
  <div>
    <label>
      {visita['Procedencia '] === 'Internacional' && 'País'}
      {visita['Procedencia '] === 'Nacional' && 'Provincia'}
      {visita['Procedencia '] === 'Provincial' && 'Departamento'}
    </label>
    <select
      value={visita['Lugar de procedencia ']}
      onChange={e => actualizarCampo(index, 'Lugar de procedencia ', e.target.value)}
    >
      <option value="">Seleccioná una opción</option>
      {visita['Procedencia '] === 'Internacional' &&
        PAISES.map(pais => (
          <option key={pais} value={pais}>{pais}</option>
        ))}
      {visita['Procedencia '] === 'Nacional' &&
        PROVINCIAS_ARG.map(provincia => (
          <option key={provincia} value={provincia}>{provincia}</option>
        ))}
      {visita['Procedencia '] === 'Provincial' &&
        DEPARTAMENTOS_CATAMARCA.map(depto => (
          <option key={depto} value={depto}>{depto}</option>
        ))}
    </select>
  </div>
)}
```

3. **Motivo visita (radio buttons):**
```typescript
<div className="space-y-2">
  {MOTIVOS.map((motivo) => (
    <label key={motivo} className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name={`motivo_visita_${index}`}
        value={motivo}
        checked={visita.motivo_visita === motivo}
        onChange={e => actualizarCampo(index, 'motivo_visita', e.target.value)}
        className="w-4 h-4 text-primary"
      />
      <span className="text-sm text-text-primary">{motivo}</span>
    </label>
  ))}
</div>
```

4. **Canal difusión (checkbox grid):**
```typescript
<div className="col-span-full">
  <label>¿Por qué canal conoció la propuesta del museo?</label>
  <div className="grid grid-cols-2 gap-2">
    {CANALES.map((canal) => (
      <label key={canal} className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={visita.canalesSeleccionados.includes(canal)}
          onChange={() => toggleCanal(index, canal)}
          className="w-4 h-4 text-primary rounded"
        />
        <span className="text-sm text-text-primary">{canal}</span>
      </label>
    ))}
  </div>
</div>
```

---

## 4. Filtros Avanzados en Tablas

### Implementación en página de visitas

**Estado de filtros:**
```typescript
const [anoSeleccionado, setAnoSeleccionado] = useState<string>('todos')
const [fechaDesde, setFechaDesde] = useState<string>('')
const [fechaHasta, setFechaHasta] = useState<string>('')
```

**Cálculo de años disponibles:**
```typescript
const anosDisponibles = useMemo(() => {
  const anos = new Set<string>()
  visitas.forEach(v => {
    if (v.Fecha) {
      anos.add(v.Fecha.substring(0, 4))
    }
  })
  return Array.from(anos).sort().reverse()
}, [visitas])
```

**Filtrado de datos:**
```typescript
const visitasFiltradas = useMemo(() => {
  return visitas.filter(v => {
    if (!v.Fecha) return false
    
    // Filtro por año
    if (anoSeleccionado !== 'todos' && v.Fecha.substring(0, 4) !== anoSeleccionado) {
      return false
    }
    
    // Filtro por periodo
    if (fechaDesde && v.Fecha < fechaDesde) return false
    if (fechaHasta && v.Fecha > fechaHasta) return false
    
    return true
  })
}, [visitas, anoSeleccionado, fechaDesde, fechaHasta])
```

**UI de filtros:**
```typescript
<div className="flex items-center gap-3 mb-4">
  {/* Selector de año */}
  <div>
    <label className="text-xs font-semibold uppercase">Año</label>
    <select
      value={anoSeleccionado}
      onChange={e => setAnoSeleccionado(e.target.value)}
      className="input text-sm"
    >
      <option value="todos">Todos los años</option>
      {anosDisponibles.map(ano => (
        <option key={ano} value={ano}>{ano}</option>
      ))}
    </select>
  </div>

  {/* Filtro por periodo */}
  <div>
    <label className="text-xs font-semibold uppercase">Desde</label>
    <input
      type="date"
      value={fechaDesde}
      onChange={e => setFechaDesde(e.target.value)}
      className="input text-sm"
    />
  </div>

  <div>
    <label className="text-xs font-semibold uppercase">Hasta</label>
    <input
      type="date"
      value={fechaHasta}
      onChange={e => setFechaHasta(e.target.value)}
      className="input text-sm"
    />
  </div>

  {/* Botón limpiar filtros */}
  {(anoSeleccionado !== 'todos' || fechaDesde || fechaHasta) && (
    <button
      onClick={() => {
        setAnoSeleccionado('todos')
        setFechaDesde('')
        setFechaHasta('')
      }}
      className="btn-ghost text-sm mt-5"
    >
      <i className="fa-solid fa-times" /> Limpiar filtros
    </button>
  )}
</div>
```

---

## 5. Correcciones de Bugs

### Bug 1: Error 404 en Casa Caravati

**Archivo:** `src/lib/types.ts`

**Cambios:**
```typescript
// Antes
export type AtractivoId = 
  | 'museo-virgen-valle'
  | 'museo-adan-quiroga'
  | 'casa-caravati'  // ❌ INCORRECTO

export const ATRACTIVOS: Record<AtractivoId, string> = {
  'museo-virgen-valle': 'Museo de la Virgen del Valle',
  'museo-adan-quiroga': 'Museo Arqueológico Adán Quiroga',
  'casa-caravati': 'Museo de la Ciudad - Casa Caravati',  // ❌ INCORRECTO
}

// Después
export type AtractivoId = 
  | 'museo-virgen-valle'
  | 'museo-adan-quiroga'
  | 'museo-casa-caravati'  // ✅ CORRECTO

export const ATRACTIVOS: Record<AtractivoId, string> = {
  'museo-virgen-valle': 'Museo de la Virgen del Valle',
  'museo-adan-quiroga': 'Museo Arqueológico Adán Quiroga',
  'museo-casa-caravati': 'Museo de la Ciudad - Casa Caravati',  // ✅ CORRECTO
}
```

### Bug 2: Variable de entorno no carga

**Archivo:** `.env.local` (línea 57)

**Cambios:**
```env
# Antes
NEXT_PUBLIC_MUSEO_CASA_CARAVATI_SCRIPT_URL= https://...  # ❌ Espacio antes de URL

# Después
NEXT_PUBLIC_MUSEO_CASA_CARAVATI_SCRIPT_URL=https://...  # ✅ Sin espacio
```

---

## 6. Archivos Creados/Modificados

### Archivos nuevos (3):
```
src/components/museos/DashboardMuseo.tsx (~450 LOC)
src/app/(main)/ocio/ingresos/museo-virgen-valle/ocasionales/carga-masiva/page.tsx (~450 LOC)
src/app/(main)/ocio/ingresos/museo-virgen-valle/institucionales/carga-masiva/page.tsx (~400 LOC)
```

### Archivos modificados (7):
```
src/lib/types.ts (corrección IDs)
.env.local (corrección espacio)
src/app/(main)/ocio/ingresos/museo-virgen-valle/page.tsx (agregar DashboardMuseo)
src/app/(main)/ocio/ingresos/museo-virgen-valle/ocasionales/page.tsx (filtros + export)
src/app/(main)/ocio/ingresos/museo-virgen-valle/institucionales/page.tsx (filtros + export)
package.json (dependencia xlsx)
package-lock.json (dependencia xlsx)
```

**Total líneas de código agregadas:** ~1500 LOC

---

## 7. Dependencias Nuevas

**Instalación requerida:**
```bash
npm install xlsx
```

**Versión:** `^0.18.5` (o última disponible)

**Uso:** Exportación de datos a XLSX y CSV

---

## 8. Patrón de Replicación a Otros Museos

### Componentes reutilizables (NO requieren cambios):
- ✅ `DashboardMuseo.tsx` (ya es genérico, recibe props)
- ✅ Lógica de exportación (código reutilizable)

### Archivos a crear por museo:
1. `/ocasionales/carga-masiva/page.tsx`
2. `/institucionales/carga-masiva/page.tsx`

### Archivos a modificar por museo:
1. `/page.tsx` (dashboard principal - agregar `<DashboardMuseo>`)
2. `/ocasionales/page.tsx` (agregar filtros + export)
3. `/institucionales/page.tsx` (agregar filtros + export)

### Cambios a realizar en replicación:

**En páginas de carga masiva:**
- Cambiar rutas API: `/api/ocio/ingresos/museo-[nombre]/`
- Cambiar context: `useMuseo[Nombre]Auth()`
- Mantener TODO el resto igual

**En página dashboard principal:**
```typescript
import DashboardMuseo from '@/components/museos/DashboardMuseo'

<DashboardMuseo
  nombreMuseo="Museo Adán Quiroga"  // O "Museo Casa Caravati"
  ocasionales={ocasionales}
  institucionales={institucionales}
/>
```

**En páginas ocasionales/institucionales:**
- Copiar sección de filtros
- Copiar funciones `exportarXLSX` y `exportarCSV`
- Copiar dropdown de exportación
- Cambiar nombre de archivo en exports

---

## 9. Testing Checklist

### Dashboard:
- [ ] KPIs muestran valores correctos
- [ ] Filtro por año funciona
- [ ] Filtro por periodo funciona
- [ ] Ambos filtros combinados funcionan
- [ ] Gráficos renderizan correctamente
- [ ] Responsive en mobile

### Exportación:
- [ ] XLSX descarga correctamente
- [ ] CSV descarga correctamente
- [ ] Solo exporta registros filtrados
- [ ] Nombre de archivo incluye fecha
- [ ] Todas las columnas están presentes

### Carga masiva:
- [ ] Agregar visita funciona
- [ ] Quitar visita funciona (mínimo 1)
- [ ] Procedencia muestra opción seleccionada
- [ ] Lugar procedencia cambia según procedencia
- [ ] Label dinámico (País/Provincia/Departamento)
- [ ] Radio buttons de motivo funcionan
- [ ] Checkboxes de canales funcionan
- [ ] Validación bloquea guardado incompleto
- [ ] Guardado exitoso muestra contador
- [ ] Form se resetea después de guardar
- [ ] usuario_registro se incluye en datos

### Filtros:
- [ ] Selector de año filtra correctamente
- [ ] Fecha desde filtra correctamente
- [ ] Fecha hasta filtra correctamente
- [ ] Botón limpiar filtros funciona
- [ ] Paginación se actualiza con filtros
- [ ] Exportación respeta filtros

---

## 10. Resumen de Implementación Final

### Museos con Fase 4 completa:

| Museo | Dashboard | Filtros | Export | Bulk Ocasionales | Bulk Institucionales | Estado |
|-------|-----------|---------|--------|------------------|---------------------|--------|
| Virgen del Valle | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Adán Quiroga | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Casa Caravati | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |

### Archivos Fase 4 por museo:

**Virgen del Valle (10 archivos):**
- 1 componente: `DashboardMuseo.tsx` (reutilizable para los 3 museos)
- 2 páginas modificadas: `ocasionales/page.tsx`, `institucionales/page.tsx`
- 2 páginas nuevas: `ocasionales/carga-masiva/page.tsx`, `institucionales/carga-masiva/page.tsx`
- 1 dashboard: `dashboard/page.tsx`
- Cambios en `page.tsx` principal

**Adán Quiroga (6 archivos):**
- 2 páginas modificadas: `ocasionales/page.tsx`, `institucionales/page.tsx`
- 2 páginas nuevas: `ocasionales/carga-masiva/page.tsx`, `institucionales/carga-masiva/page.tsx`
- 1 dashboard: `dashboard/page.tsx`
- Cambios en `page.tsx` principal

**Casa Caravati (6 archivos):**
- 2 páginas modificadas: `ocasionales/page.tsx`, `institucionales/page.tsx`
- 2 páginas nuevas: `ocasionales/carga-masiva/page.tsx`, `institucionales/carga-masiva/page.tsx`
- 1 dashboard: `dashboard/page.tsx`
- Cambios en `page.tsx` principal

**Total Fase 4:** 20 archivos (~4500 LOC)

### Patrón de código consistente:

Todos los museos usan:
- Mismo componente `DashboardMuseo.tsx`
- Misma lógica de filtros (`useMemo` con año + periodo)
- Mismas funciones de exportación XLSX/CSV
- Misma estructura de carga masiva (formulario dinámico)
- Mismas optimizaciones de rendimiento

**Diferencias entre museos:** Solo rutas API y contextos de autenticación

---

**Última actualización:** 13/04/2026 22:00
