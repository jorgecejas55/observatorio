/**
 * Directorio del ecosistema MICE (turismo de reuniones) de la ciudad.
 * Se muestra en /mice/ecosistema (link del QR del programa de distinciones).
 *
 * Fuente: "listado generadores proovedores.xlsx" del equipo de Turismo de Reuniones
 * (16/11/2026). Para actualizar: editar este archivo y pushear. Solo `nombre` es
 * obligatorio; los campos que falten no se muestran. Una categoría sin contactos
 * aparece como "Información en carga".
 */

export interface ContactoMice {
  nombre: string
  /** Persona de contacto */
  referente?: string
  /** Formato de visualización, ej. "3834 96-2034" (10 dígitos con característica) */
  telefonos?: string[]
  email?: string
  /** URL completa, ej. "https://ejemplo.com.ar" */
  web?: string
  /** Usuario sin @, ej. "turismocatamarcacapital" */
  instagram?: string
}

export type GrupoMice = 'generadores' | 'organizadores' | 'proveedores' | 'sector'

export interface CategoriaMice {
  /** Ancla de la sección: minúsculas y guiones */
  id: string
  titulo: string
  /** Ícono de Font Awesome, ej. "fa-building" */
  icono: string
  grupo: GrupoMice
  contactos: ContactoMice[]
}

export const PRESENTACION_MICE = {
  titulo: 'Ecosistema de Turismo de Reuniones',
  bajada:
    'Generadores y proveedores de eventos de San Fernando del Valle de Catamarca. Encontrá sus datos de contacto para organizar tu próximo congreso, convención, feria o evento corporativo.',
  /** Mostrar mientras los datos no estén completos; poner en false al cargar todo. */
  enActualizacion: true,
}

/** Orden y títulos de los bloques de la página */
export const GRUPOS_MICE: { id: GrupoMice; titulo: string }[] = [
  { id: 'generadores', titulo: 'Generadores de eventos' },
  { id: 'organizadores', titulo: 'Organización profesional' },
  { id: 'proveedores', titulo: 'Proveedores de servicios para eventos' },
  { id: 'sector', titulo: 'Entidades del sector' },
]

export const CATEGORIAS_MICE: CategoriaMice[] = [
  {
    id: 'asociaciones',
    titulo: 'Asociaciones, colegios y entidades',
    icono: 'fa-people-group',
    grupo: 'generadores',
    contactos: [
      { nombre: 'Asociación De Magistrados Y Funcionarios Judiciales De Catamarca', referente: 'Cecilia Cierra (secretaria)', telefonos: ['3834 78-3777', '3834 06-6085'] },
      { nombre: 'Círculo Médico', referente: 'Dr. Tomassi Analia', telefonos: ['3834 92-5656'] },
      { nombre: 'Centro de Ingenieros de Catamarca', referente: 'Roman Antonio', telefonos: ['3834 02-3063', '3834 52-7536'] },
      { nombre: 'Colegio de Abogados', referente: 'Luis Sánchez Ruiz (presidente)', telefonos: ['3834 96-1344'] },
      { nombre: 'Colegio de Bioquímicos', referente: 'Viviana Villafañe', telefonos: ['3834 25-4651'] },
      { nombre: 'Colegio de Escribanos de la Provincia de Catamarca', referente: 'Jennifer Cecanti', telefonos: ['3834 40-0790'] },
      { nombre: 'Colegio de Fonoaudiólogos', referente: 'Lic Carlos Morales', telefonos: ['3836 01-0240', '3834 45-4392'] },
      { nombre: 'Colegio de Geólogos', referente: 'Italo Francile', telefonos: ['3834 01-2039'] },
      { nombre: 'Colegio de Kinesiólogos', referente: 'Blamey J. Andres', telefonos: ['3834 65-3511'] },
      { nombre: 'Colegio de Médicos de Catamarca', referente: 'Mauricio Figueroa (presidente)', telefonos: ['3834 00-2725'] },
      { nombre: 'Colegio de Odontólogos de Catamarca', referente: 'Ivana Coliva (secretaria)', telefonos: ['3834 02-0890'] },
      { nombre: 'Colegio de Profesionales en Higiene y Seguridad de Catamarca', referente: 'Beddur Mahmud', telefonos: ['3834 60-4718'] },
      { nombre: 'Colegio de Psicólogos', referente: 'Psicologa Silva Eva', telefonos: ['3834 57-4432'] },
      { nombre: 'Colegio Profesional de Trabajadores Sociales de Catamarca', referente: 'Lic. Cinthia Espeche Acosta', telefonos: ['3834 33-7333'] },
      { nombre: 'Colegio de Veterinarios', referente: 'Dr Avalos Jose Ignacio', telefonos: ['3834 96-2034'] },
      { nombre: 'Colegio Profesional de Enfermería Catamarca', referente: 'Monllau grima Gabriela', telefonos: ['3834 53-7430'] },
      { nombre: 'Colegio de Nutricionistas', referente: 'Micaela Buteler', telefonos: ['3834 05-4837'] },
      { nombre: 'Comisión de Jóvenes Profesionales de Ciencias Económicas', referente: 'Batallan Ana Contadora', telefonos: ['3834 79-6470'] },
      { nombre: 'Consejo Profesional de Agrimensura de Catamarca', referente: 'Raúl Darío Blas', telefonos: ['3834 43-1082'] },
      { nombre: 'Consejo Profesional de Ciencias Económicas de Catamarca', referente: 'Luis Jalil', telefonos: ['3834 92-0739'] },
      { nombre: 'Sociedad Italiana de Socorros Mutuos', referente: 'Luis Dre (presidente)', telefonos: ['3834 59-4370'] },
      { nombre: 'Unión Comercial', referente: 'Galarza Cinthia', telefonos: ['3834 20-6476'] },
      { nombre: 'Unión de Arquitectos de Catamarca', referente: 'Arq Zalazar Silvia Ines', telefonos: ['3834 59-8322'] },
      { nombre: 'Cámara de Proveedores Mineros', referente: 'Manuel Gomez Bello', telefonos: ['381 405-6565'] },
      { nombre: 'Cámara de Servicios Mineros', referente: 'Susana De La Llera de De La Colina', telefonos: ['3834 70-3169'] },
      { nombre: 'Sindicato de visitadores médicos', referente: 'Juan Murua', telefonos: ['3834 02-8469'] },
      { nombre: 'Osde', referente: 'Eugenia Robledo, Cecilia Martínez', telefonos: ['3834 40-2632'] },
      { nombre: 'Festival Internacional de Tango', referente: 'Day Farias', telefonos: ['3834 09-1205'] },
      { nombre: 'Consejo del Inmigrante', referente: 'Wilson Arbelaez', telefonos: ['3834 59-4271'] },
    ],
  },
  {
    id: 'sector-publico',
    titulo: 'Sector público',
    icono: 'fa-landmark',
    grupo: 'generadores',
    contactos: [
      { nombre: 'Ministerio de Cultura, Turismo y Deportes', referente: 'Evangelina Quarin Turismo', telefonos: ['351 387-1643'] },
      { nombre: 'Ministerio de Cultura, Turismo y Deportes', referente: 'Guillermo Perna Deportes', telefonos: ['3834 25-9397'] },
      { nombre: 'Ministerio de Cultura, Turismo y Deportes', referente: 'Laura Maubecín Cultura', telefonos: ['3834 50-9228'] },
      { nombre: 'Ministerio de Cultura, Turismo y Deportes', referente: 'Graciela Brunello Turismo Eventos', telefonos: ['3834 69-1593'] },
      { nombre: 'Secretaría de Cultura y Educación - Municipalidad Catamarca Capital', referente: 'Marisa Blanco', telefonos: ['3834 27-0142'] },
      { nombre: 'Secretaría de Gobierno - Municipalidad Catamarca Capital', referente: 'Germán Kraneviter', telefonos: ['3834 54-3212'] },
      { nombre: 'Secretaría de Gobierno - Municipalidad Catamarca Capital', referente: 'Mariano Brunello - Deportes', telefonos: ['3834 39-3854'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'Mariano Rosales', telefonos: ['3834 60-9122'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'Emilio Ramaci', telefonos: ['3834 90-5251'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'Matias Zamboni', telefonos: ['3834 00-1284'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'Juan Lorenzo', telefonos: ['3834 31-2804'] },
      { nombre: 'Secretaría de Protección Ciudadana - Municipalidad Catamarca Capital', referente: 'Mariela Romero', telefonos: ['3834 61-0750'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'José Malki', telefonos: ['3834 37-9103'] },
      { nombre: 'Secretaría de Gabinete y Modernización - Municipalidad Catamarca Capital', referente: 'Carlos Nieva', telefonos: ['3834 58-0800'] },
      { nombre: 'Secretaría de Gobierno - Municipalidad Catamarca Capital', referente: 'Cecilia Maza', telefonos: ['3834 58-4437'] },
      { nombre: 'Secretaría de Ambiente - Municipalidad Catamarca Capital', referente: 'Nicolás Acuña', telefonos: ['3834 98-5151'] },
      { nombre: 'Diputada Natalia Ponferrada', referente: 'Natalia Ponferrada', telefonos: ['3834 54-3537'] },
      { nombre: 'Fogacat', referente: 'Eduardo Castagnola', telefonos: ['3834 21-7816'] },
    ],
  },
  {
    id: 'sector-academico',
    titulo: 'Sector académico',
    icono: 'fa-graduation-cap',
    grupo: 'generadores',
    contactos: [
      { nombre: 'UNCA Dir. Protocolo Y Ceremonial', referente: 'Maria Jose', telefonos: ['3833 58-7550'] },
      { nombre: 'Instituto FASTA', referente: 'Juan Manuel Oviedo', telefonos: ['3834 31-2883'] },
      { nombre: 'Instituto Chavarría', referente: 'Alejandra Del Prete', telefonos: ['3834 35-0881'] },
      { nombre: 'Universidad Siglo 21', referente: 'Yanina Cano', telefonos: ['3865 56-4770'] },
    ],
  },
  {
    id: 'organizadores',
    titulo: 'Organizadores profesionales de eventos',
    icono: 'fa-clipboard-list',
    grupo: 'organizadores',
    contactos: [
      { nombre: 'Managger', referente: 'Alvaro Barrionuevo', telefonos: ['3834 61-0065'] },
      { nombre: 'LQ Event Planner', referente: 'Luz Quintero', telefonos: ['3834 00-1926'] },
      { nombre: 'NG Eventos Integrales', referente: 'Marcos Palacio', telefonos: ['3834 41-2930'] },
      { nombre: 'Achalay Producciones', referente: 'Alejandra Salas', telefonos: ['3834 61-6985'] },
      { nombre: 'Carlos Ponce', telefonos: ['3834 32-5548'] },
    ],
  },
  {
    id: 'salones',
    titulo: 'Salones',
    icono: 'fa-building',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Salón Dinastía Eventos', referente: 'Gloria del valle flores', telefonos: ['3834 07-0642'] },
      { nombre: 'Salón \'María Luisa\'', referente: 'Hugo Melo', telefonos: ['3834 65-3348'] },
      { nombre: 'Salón Adonai', telefonos: ['3834 51-1111'] },
      { nombre: 'Complejo Las Heras', referente: 'Alejandro Rosa', telefonos: ['3834 34-2659'] },
      { nombre: 'El Encuentro', referente: 'Maria Paula Avellaneda', telefonos: ['3834 31-8501'] },
      { nombre: 'Missis Party', telefonos: ['3834 68-6022'] },
      { nombre: 'El Vergel', telefonos: ['3834 64-2267'] },
      { nombre: 'Ohana', telefonos: ['3834 24-7452'] },
      { nombre: 'Ana Alvarez', telefonos: ['3834 31-6117'] },
      { nombre: 'Hector Leiva JOY', telefonos: ['3834 45-2063'] },
    ],
  },
  {
    id: 'hoteles',
    titulo: 'Hoteles y gastronomía',
    icono: 'fa-bed',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Arenales', referente: 'Ramiro Jalil', telefonos: ['3834 66-5317'] },
      { nombre: 'Ancasti', referente: 'Mario Falcón', telefonos: ['11 5978-4813'] },
      { nombre: 'Apart H1', referente: 'Arrascaeta Laura', telefonos: ['3834 22-1281'] },
      { nombre: 'Hotel Concepción', referente: 'Cristina Rendon', telefonos: ['3834 68-3524'] },
      { nombre: 'Grand Hotel', telefonos: ['3834 21-9034'] },
      { nombre: 'Hotel Casino', referente: 'Rubén Laviota', telefonos: ['3834 54-3170'] },
      { nombre: 'Cabañas Almamarka', referente: 'Walther Sofia', telefonos: ['3834 90-2999'] },
      { nombre: 'Cabañas Samai', referente: 'Mauro Negro', telefonos: ['3834 34-1888'] },
      { nombre: 'Howard Johnson', referente: 'Luis Cantarell' },
      { nombre: 'Walter Dagostini', telefonos: ['3834 59-3482'] },
    ],
  },
  {
    id: 'catering',
    titulo: 'Catering',
    icono: 'fa-utensils',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Catering Musquy', referente: 'Bruno Agüero', telefonos: ['3834 26-7034'] },
      { nombre: 'Matias Juri', telefonos: ['3834 41-1132'] },
      { nombre: 'LF Catering', referente: 'Lupe Fandiño', telefonos: ['3834 90-9977'] },
      { nombre: 'Santiago Dré', telefonos: ['3834 00-3151'] },
      { nombre: 'Mediterraneo Catering', referente: 'Palacios Estanislao', telefonos: ['3834 33-1200'] },
      { nombre: 'Catering Express', telefonos: ['3834 00-8064'] },
      { nombre: 'MC Eventos', telefonos: ['3834 54-6544'] },
      { nombre: 'Estilo Ocampo Eventos', referente: 'Gutierrez Cesar Hernan', telefonos: ['3834 23-5914'] },
      { nombre: 'Daniela Reyes Catering', telefonos: ['3834 54-0023'] },
      { nombre: 'Marcelo Valderrama', telefonos: ['3834 54-3181'] },
      { nombre: 'El viejo Baul', telefonos: ['3834 22-0851'] },
      { nombre: 'Pata del Lobo', referente: 'Lorena Lobo', telefonos: ['3834 60-0436'] },
      { nombre: 'Ana Alvarez', telefonos: ['3834 31-6117'] },
      { nombre: 'Leticia Acuña', telefonos: ['3834 69-5941'] },
      { nombre: 'Vicuña Eventos', referente: 'Gustavo Gómez', telefonos: ['3834 67-1364'] },
      { nombre: 'Restaurant Egipcio', referente: 'Sharon Tintaya', telefonos: ['11 2323-3616'] },
    ],
  },
  {
    id: 'barra',
    titulo: 'Servicio de barra',
    icono: 'fa-martini-glass',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Corzuela', referente: 'Reno Luna', telefonos: ['3834 24-8355'] },
      { nombre: 'La Vinoteca', referente: 'Roberto Saleme', telefonos: ['3834 22-9022'] },
    ],
  },
  {
    id: 'tecnica',
    titulo: 'Iluminación, audio y video',
    icono: 'fa-microphone',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Fusion Led Srl', telefonos: ['3834 50-0894'] },
      { nombre: 'Daf Producciones', telefonos: ['3834 53-7501'] },
      { nombre: 'Alberto Aguero', telefonos: ['3834 39-5111'] },
      { nombre: 'Horacio Cortondo', telefonos: ['3834 68-1222'] },
      { nombre: 'Tejada Producciones', telefonos: ['3834 61-6118'] },
      { nombre: 'Jose Tristan', telefonos: ['3834 98-5547'] },
      { nombre: 'Agustin Borgioli', telefonos: ['351 677-5333'] },
      { nombre: 'Arce Sonido', telefonos: ['3834 66-9925'] },
      { nombre: 'Mario Folker Filmmaker', telefonos: ['3834 22-2964'] },
      { nombre: 'Nach Producciones Filmmaker', telefonos: ['3834 04-4377'] },
      { nombre: 'Pablo Bolomo', telefonos: ['3834 33-2668'] },
      { nombre: 'Santiago Ferreira', telefonos: ['3834 26-3209'] },
    ],
  },
  {
    id: 'alquileres',
    titulo: 'Alquiler de vajilla, sillas y mesas',
    icono: 'fa-chair',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Nora Villafañez', telefonos: ['3834 40-8264'] },
      { nombre: 'Augusto', telefonos: ['3834 92-0821'] },
      { nombre: 'Karina Guarda', telefonos: ['3834 63-4463'] },
      { nombre: 'La Provista', telefonos: ['3834 40-6457'] },
      { nombre: 'Erica Cordoba', telefonos: ['3834 59-2208'] },
      { nombre: 'Miguel Navarro', telefonos: ['3834 65-8612'] },
      { nombre: 'Verónica Bazán', telefonos: ['3834 36-1344'] },
    ],
  },
  {
    id: 'agencias-transporte',
    titulo: 'Agencias de viajes y transporte',
    icono: 'fa-van-shuttle',
    grupo: 'proveedores',
    contactos: [
      { nombre: 'Los Puestos', referente: 'Noelia Miranda', telefonos: ['3834 37-0249'] },
      { nombre: 'Catamarca Viajes y Turismo', referente: 'Sivina Figueroa', telefonos: ['3834 50-0864'] },
      { nombre: 'Khullay Viajes y Turismo', referente: 'Aredes Liliana', telefonos: ['3834 57-5356'] },
      { nombre: 'Asociación de Agencias de Viajes', referente: 'Cristian Fernandez', telefonos: ['3837 40-6100'] },
      { nombre: 'Julieta Díaz Viajes', referente: 'Julieta Díaz', telefonos: ['3834 40-8640'] },
      { nombre: 'Omar Perez Combis', telefonos: ['3834 68-1872'] },
      { nombre: 'Romeba SRL', referente: 'Damian', telefonos: ['3834 55-7055'] },
      { nombre: 'Nevados de Ambato', telefonos: ['3834 34-9395'] },
      { nombre: 'Transporte Lizarraga', referente: 'Marcelo Lizarraga', telefonos: ['3834 68-0847'] },
      { nombre: 'Urquiza', referente: 'Lorena', telefonos: ['3834 62-2187'] },
      { nombre: 'Transporte Paclín', referente: 'Cristian', telefonos: ['3834 59-8547'] },
      { nombre: 'Ubi', referente: 'Kike Orellana', telefonos: ['3834 35-9071'] },
    ],
  },
  {
    id: 'camaras-gremios',
    titulo: 'Cámaras, asociaciones y gremios del sector',
    icono: 'fa-handshake',
    grupo: 'sector',
    contactos: [
      { nombre: 'Asociación de Hoteles, Bares, Restaurantes, Confiterías y Afines', referente: 'Aldo Sarquis', telefonos: ['3834 68-2413'] },
      { nombre: 'Uthgra', referente: 'Fabián Vega', telefonos: ['3834 23-1173'] },
      { nombre: 'Federación Económica Catamarca y Cámara de Turismo', referente: 'Marcelo Coll', telefonos: ['3834 64-0320'] },
      { nombre: 'UTA', referente: 'Roque Chanquía', telefonos: ['3834 62-4222'] },
      { nombre: 'Unión Comercial', referente: 'José Martínez', telefonos: ['3834 60-2679'] },
      { nombre: 'Asociación de Guías', referente: 'Juana Noguera', telefonos: ['3834 53-1350'] },
      { nombre: 'Asociación de Agencias de Viaje', referente: 'Cristian Fernandez', telefonos: ['3837 40-6100'] },
      { nombre: 'Bureau de Convenciones y Visitantes', referente: 'Bernardo Yazbek', telefonos: ['3834 70-0045'] },
      { nombre: 'FeHgra', referente: 'Raúl Kotler', telefonos: ['3834 69-1198'] },
    ],
  },
]

export const CONTACTO_OBSERVATORIO = {
  area: 'Secretaría de Turismo y Desarrollo Económico · Municipalidad de San Fernando del Valle de Catamarca',
}
