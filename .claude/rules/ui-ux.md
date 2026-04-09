# Reglas de UI/UX

## Identidad visual

- Sistema institucional municipal → apariencia profesional y sobria
- Paleta: preferir tonos que transmitan confianza y datos oficiales
- Tipografía: legible, sin fuentes decorativas
- **Todos los textos de la UI en español argentino** (vos, ustedes, etc.)

## Componentes y estructura

- Usar componentes de Tailwind reutilizables, no repetir clases largas inline
- Layouts responsivos: mobile-first
- Gráficos de estadísticas: claros, con títulos descriptivos, fuente visible
- Tablas de datos: con paginación si superan 20 filas
- Formularios: validación en cliente antes de enviar a GAS

## Accesibilidad mínima

- Labels en todos los inputs
- Alt text en imágenes
- Contraste suficiente (WCAG AA)
- Navegación por teclado en formularios

## Mensajes al usuario

- Errores: en español, descriptivos ("No se pudo cargar el mapa. Intentá de nuevo.")
- Estados de carga: siempre mostrar feedback visual (spinner, skeleton)
- Confirmaciones: antes de acciones destructivas o envíos de formulario

## Mapa interactivo

- Librería preferida: Leaflet (react-leaflet) — liviana, sin costo de tiles
- Tiles: OpenStreetMap
- Popups: mostrar nombre, categoría y descripción breve del atractivo
- Clústeres si hay muchos puntos juntos

## Dashboard de estadísticas

- Librería preferida: Recharts (ya integrada en ecosistema React)
- Siempre mostrar período de los datos (mes/trimestre/año)
- Indicar fuente de datos al pie de cada gráfico
