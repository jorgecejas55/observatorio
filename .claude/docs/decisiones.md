# Registro de Decisiones Técnicas

> Este archivo evita que se vuelvan a debatir decisiones ya tomadas.
> Formato: fecha · decisión · razón · alternativas descartadas

---

## [26/03/2026] Stack tecnológico

**Decisión:** Next.js 14 + TypeScript + Tailwind CSS  
**Razón:** Familiaridad del desarrollador, buen ecosistema, SSR para SEO si se necesita  
**Alternativas descartadas:** Create React App (sin SSR), Vite puro (sin routing integrado)

---

## [26/03/2026] Backend de datos: Google Sheets vía GAS

**Decisión:** Google Sheets como base de datos, accedida a través de Google Apps Script Web App  
**Razón:** Los datos ya existen en Sheets (flujo de trabajo institucional), sin costo de infraestructura, Jorge ya maneja GAS  
**Alternativas descartadas:** Directus CMS (mayor complejidad de deploy), Supabase (requiere infraestructura adicional), base de datos SQL (overkill para el volumen de datos)  
**Limitaciones asumidas:** Sin transacciones, sin queries complejas, latencia de GAS (~500ms-2s)

---

## Plantilla para nuevas decisiones

```
## [DD/MM/AAAA] Título de la decisión

**Decisión:** 
**Razón:** 
**Alternativas descartadas:** 
**Limitaciones asumidas:** 
```
