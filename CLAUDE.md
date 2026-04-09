# Observatorio de Turismo Municipal — Sistema Web
## observatorio-app | Next.js + TypeScript + Tailwind

---

## Contexto del proyecto

Sistema web del **Observatorio Municipal de Turismo** de San Fernando del Valle de Catamarca (Secretaría de Turismo y Desarrollo Económico). Es una herramienta de inteligencia turística para la gestión pública municipal.

**Desarrollador:** Jorge (coordinador del Observatorio, geógrafo, docente)
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Google Apps Script (gas/) · Google Sheets como backend de datos

---

## Módulos del sistema

1. **Dashboard de estadísticas turísticas** — visualización de indicadores e indicadores de demanda/oferta
2. **Encuestas de relevamiento** — formularios para caracterización de oferta de servicios turísticos
3. **Mapa interactivo de atractivos** — visualización geoespacial del inventario turístico
4. **Gestión de eventos turísticos** — registro y seguimiento de eventos con impacto en turismo

---

## Estructura del proyecto

```
observatorio-app/
├── src/                    # Código fuente Next.js
├── gas/                    # Google Apps Script (integración con Google Sheets)
├── .next/                  # Build output (ignorar)
├── node_modules/           # Dependencias (ignorar)
├── .env.local              # Variables de entorno locales (NO commitear)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .claude/
    ├── CLAUDE.md           # Este archivo
    ├── settings.local.json
    └── rules/              # Reglas específicas por área
```

---

## Convenciones de código

- **Lenguaje de la UI:** español argentino (textos, labels, mensajes de error)
- **Componentes:** funcionales con hooks, TypeScript estricto
- **Estilos:** Tailwind CSS, sin CSS modules salvo excepción justificada
- **Naming:** camelCase para variables/funciones, PascalCase para componentes
- **Comentarios en código:** español
- **Commits:** español, descriptivos

---

## Comandos frecuentes

```bash
npm run dev          # Servidor de desarrollo local
npm run build        # Build de producción
npm run lint         # Linting
```

---

## Integración Google Apps Script (gas/)

- Los scripts en `gas/` se despliegan como Web Apps en Google Workspace
- Actúan como API intermediaria entre Next.js y Google Sheets
- Los Sheets son el backend de datos del sistema (estadísticas, encuestas, eventos, atractivos)
- Al modificar gas/, recordar redesplegar la Web App en Google Apps Script

---

## Archivos de contexto disponibles

| Archivo | Cuándo usar |
|---|---|
| `.claude/docs/estado-actual.md` | Al iniciar sesión — qué está hecho y qué falta |
| `.claude/docs/arquitectura.md` | Al trabajar en estructura, rutas, componentes |
| `.claude/docs/decisiones.md` | Antes de proponer cambios de enfoque técnico |
| `.claude/rules/ui-ux.md` | Al trabajar en vistas y componentes visuales |
| `.claude/rules/gas-sheets.md` | Al trabajar en integración con Google Sheets |

**Siempre leer `estado-actual.md` al inicio de cada sesión.**

---

## Restricciones importantes

- NO modificar `.env.local` ni mostrar su contenido
- NO refactorizar módulos completos sin confirmación explícita
- NO cambiar la estructura de Sheets sin coordinar con Jorge primero
- Proponer antes de implementar cambios grandes
- Mantener compatibilidad con el embed en WordPress (iframe) si existe

---

## Notas de contexto institucional

- El sistema es de uso público municipal — debe ser accesible y claro
- Los datos son oficiales, la precisión es prioritaria sobre la velocidad
- Jorge trabaja solo como desarrollador en este proyecto
- Hay restricciones de tiempo (trabajo docente + investigación simultáneos)
