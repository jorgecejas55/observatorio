// ═══════════════════════════════════════════════════════════════════════════════
// Constantes geográficas compartidas entre módulos de encuestas
// ═══════════════════════════════════════════════════════════════════════════════
// Todas en MAYÚSCULAS para coincidir con valores almacenados en Google Sheets.
//
// Consumido por:
//   - Encuesta Perfil del Turista   (/ocio/encuesta)
//   - Encuesta Casa de Catamarca    (/casa-catamarca/encuesta)
//   - Cualquier formulario futuro que pida procedencia

// ─── Procedencia (nivel raíz) ─────────────────────────────────────────────────

export const PROCEDENCIAS = ['NACIONAL', 'PROVINCIAL', 'INTERNACIONAL'] as const
export type Procedencia = typeof PROCEDENCIAS[number]

// ─── Países (~95) ─────────────────────────────────────────────────────────────

export const PAISES = [
  // América del Sur
  'ARGENTINA', 'BOLIVIA', 'BRASIL', 'CHILE', 'COLOMBIA', 'ECUADOR',
  'GUYANA', 'PARAGUAY', 'PERÚ', 'SURINAM', 'URUGUAY', 'VENEZUELA',
  // América Central y Caribe
  'COSTA RICA', 'CUBA', 'EL SALVADOR', 'GUATEMALA', 'HAITÍ', 'HONDURAS',
  'JAMAICA', 'MÉXICO', 'NICARAGUA', 'PANAMÁ', 'PUERTO RICO', 'REPÚBLICA DOMINICANA',
  'TRINIDAD Y TOBAGO',
  // América del Norte
  'CANADÁ', 'ESTADOS UNIDOS',
  // Europa
  'ALBANIA', 'ALEMANIA', 'ANDORRA', 'AUSTRIA', 'BÉLGICA', 'BIELORRUSIA',
  'BOSNIA Y HERZEGOVINA', 'BULGARIA', 'CHIPRE', 'CROACIA', 'DINAMARCA',
  'ESLOVAQUIA', 'ESLOVENIA', 'ESPAÑA', 'ESTONIA', 'FINLANDIA', 'FRANCIA',
  'GEORGIA', 'GRECIA', 'HUNGRÍA', 'IRLANDA', 'ISLANDIA', 'ITALIA',
  'LETONIA', 'LITUANIA', 'LUXEMBURGO', 'MALTA', 'MOLDAVIA', 'MÓNACO',
  'MONTENEGRO', 'NORUEGA', 'PAÍSES BAJOS', 'POLONIA', 'PORTUGAL',
  'REINO UNIDO', 'REPÚBLICA CHECA', 'RUMANIA', 'RUSIA', 'SERBIA',
  'SUECIA', 'SUIZA', 'UCRANIA',
  // Asia
  'ARABIA SAUDITA', 'ARMENIA', 'AZERBAIYÁN', 'BANGLADESH', 'CHINA',
  'COREA DEL SUR', 'EMIRATOS ÁRABES UNIDOS', 'FILIPINAS', 'INDIA',
  'INDONESIA', 'IRÁN', 'IRAQ', 'ISRAEL', 'JAPÓN', 'JORDANIA',
  'KAZAJISTÁN', 'KUWAIT', 'LÍBANO', 'MALASIA', 'NEPAL', 'PAKISTÁN',
  'QATAR', 'SINGAPUR', 'SRI LANKA', 'TAILANDIA', 'TAIWÁN', 'TURQUÍA',
  'UZBEKISTÁN', 'VIETNAM',
  // África
  'ARGELIA', 'EGIPTO', 'GHANA', 'KENIA', 'MARRUECOS', 'NIGERIA',
  'SENEGAL', 'SUDÁFRICA', 'TÚNEZ',
  // Oceanía
  'AUSTRALIA', 'NUEVA ZELANDA',
] as const

// ─── Provincias Argentinas (24) ───────────────────────────────────────────────

export const PROVINCIAS_ARG = [
  'BUENOS AIRES', 'CABA', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CÓRDOBA',
  'CORRIENTES', 'ENTRE RÍOS', 'FORMOSA', 'JUJUY', 'LA PAMPA', 'LA RIOJA',
  'MENDOZA', 'MISIONES', 'NEUQUÉN', 'RÍO NEGRO', 'SALTA', 'SAN JUAN',
  'SAN LUIS', 'SANTA CRUZ', 'SANTA FE', 'SGO DEL ESTERO', 'TIERRA DEL FUEGO', 'TUCUMÁN',
] as const

// ─── Departamentos de Catamarca (15) ──────────────────────────────────────────
// FME = Fray Mamerto Esquiú

export const DEPARTAMENTOS_CATAMARCA = [
  'AMBATO', 'ANCASTI', 'ANDALGALÁ', 'ANTOFAGASTA DE LA SIERRA',
  'BELÉN', 'CAPAYÁN', 'EL ALTO', 'FME', 'LA PAZ',
  'PACLÍN', 'POMÁN', 'SANTA MARÍA', 'SANTA ROSA', 'TINOGASTA', 'VALLE VIEJO',
] as const

// ─── Partidos de la Provincia de Buenos Aires (135) ───────────────────────────
// Lista completa en orden alfabético. Incluye AMBA e interior.
// Fuente: INDEC, división político-administrativa vigente.

export const PARTIDOS_BUENOS_AIRES = [
  'ADOLFO ALSINA',
  'ADOLFO GONZALES CHAVES',
  'ALBERTI',
  'ALMIRANTE BROWN',
  'ARRECIFES',
  'AVELLANEDA',
  'AYACUCHO',
  'AZUL',
  'BAHÍA BLANCA',
  'BALCARCE',
  'BARADERO',
  'BENITO JUÁREZ',
  'BERAZATEGUI',
  'BERISSO',
  'BOLÍVAR',
  'BRAGADO',
  'BRANDSEN',
  'CAMPANA',
  'CAÑUELAS',
  'CAPITÁN SARMIENTO',
  'CARLOS CASARES',
  'CARLOS TEJEDOR',
  'CARMEN DE ARECO',
  'CASTELLI',
  'CHACABUCO',
  'CHASCOMÚS',
  'CHIVILCOY',
  'COLÓN',
  'CORONEL ROSALES',
  'CORONEL DORREGO',
  'CORONEL PRINGLES',
  'CORONEL SUÁREZ',
  'DAIREAUX',
  'DOLORES',
  'ENSENADA',
  'ESCOBAR',
  'ESTEBAN ECHEVERRÍA',
  'EXALTACIÓN DE LA CRUZ',
  'EZEIZA',
  'FLORENCIO VARELA',
  'FLORENTINO AMEGHINO',
  'GENERAL ALVARADO',
  'GENERAL ALVEAR',
  'GENERAL ARENALES',
  'GENERAL BELGRANO',
  'GENERAL GUIDO',
  'GENERAL LA MADRID',
  'GENERAL LAS HERAS',
  'GENERAL LAVALLE',
  'GENERAL MADARIAGA',
  'GENERAL PAZ',
  'GENERAL PINTO',
  'GENERAL PUEYRREDÓN',
  'GENERAL RODRÍGUEZ',
  'GENERAL SAN MARTÍN',
  'GENERAL VIAMONTE',
  'GENERAL VILLEGAS',
  'GUAMINÍ',
  'HIPÓLITO YRIGOYEN',
  'HURLINGHAM',
  'ITUZAINGÓ',
  'JOSÉ C. PAZ',
  'JUNÍN',
  'LA COSTA',
  'LA MATANZA',
  'LA PLATA',
  'LANÚS',
  'LAPRIDA',
  'LAS FLORES',
  'LEANDRO N. ALEM',
  'LINCOLN',
  'LOBERÍA',
  'LOBOS',
  'LOMAS DE ZAMORA',
  'LUJÁN',
  'MAGDALENA',
  'MAIPÚ',
  'MALVINAS ARGENTINAS',
  'MAR CHIQUITA',
  'MARCOS PAZ',
  'MERCEDES',
  'MERLO',
  'MONTE',
  'MONTE HERMOSO',
  'MORENO',
  'MORÓN',
  'NAVARRO',
  'NECOCHEA',
  'NUEVE DE JULIO',
  'OLAVARRÍA',
  'PATAGONES',
  'PEHUAJÓ',
  'PELLEGRINI',
  'PERGAMINO',
  'PILA',
  'PILAR',
  'PINAMAR',
  'PRESIDENTE PERÓN',
  'PUÁN',
  'PUNTA INDIO',
  'QUILMES',
  'RAMALLO',
  'RAUCH',
  'RIVADAVIA',
  'ROJAS',
  'ROQUE PÉREZ',
  'SAAVEDRA',
  'SALADILLO',
  'SALLIQUELÓ',
  'SALTO',
  'SAN ANDRÉS DE GILES',
  'SAN ANTONIO DE ARECO',
  'SAN CAYETANO',
  'SAN FERNANDO',
  'SAN ISIDRO',
  'SAN MIGUEL',
  'SAN NICOLÁS',
  'SAN PEDRO',
  'SAN VICENTE',
  'SUIPACHA',
  'TANDIL',
  'TAPALQUÉ',
  'TIGRE',
  'TORDILLO',
  'TORNQUIST',
  'TRENQUE LAUQUEN',
  'TRES ARROYOS',
  'TRES DE FEBRERO',
  'TRES LOMAS',
  'VEINTICINCO DE MAYO',
  'VICENTE LÓPEZ',
  'VILLA GESELL',
  'VILLARINO',
  'ZÁRATE',
] as const

// ─── Barrios de CABA (48) ─────────────────────────────────────────────────────
// Barrios oficiales de la Ciudad Autónoma de Buenos Aires.
// Orden alfabético.
// Fuente: GCBA, Ley de Comunas.

export const BARRIOS_CABA = [
  'AGRONOMÍA',
  'ALMAGRO',
  'BALVANERA',
  'BARRACAS',
  'BELGRANO',
  'BOEDO',
  'CABALLITO',
  'CHACARITA',
  'COGHLAN',
  'COLEGIALES',
  'CONSTITUCIÓN',
  'FLORES',
  'FLORESTA',
  'LA BOCA',
  'LA PATERNAL',
  'LINIERS',
  'MATADEROS',
  'MONTE CASTRO',
  'MONSERRAT',
  'NUEVA POMPEYA',
  'NÚÑEZ',
  'PALERMO',
  'PARQUE AVELLANEDA',
  'PARQUE CHACABUCO',
  'PARQUE CHAS',
  'PARQUE PATRICIOS',
  'PUERTO MADERO',
  'RECOLETA',
  'RETIRO',
  'SAAVEDRA',
  'SAN CRISTÓBAL',
  'SAN NICOLÁS',
  'SAN TELMO',
  'VÉLEZ SARSFIELD',
  'VERSALLES',
  'VILLA CRESPO',
  'VILLA DEL PARQUE',
  'VILLA DEVOTO',
  'VILLA GENERAL MITRE',
  'VILLA LUGANO',
  'VILLA LURO',
  'VILLA ORTÚZAR',
  'VILLA PUEYRREDÓN',
  'VILLA REAL',
  'VILLA RIACHUELO',
  'VILLA SANTA RITA',
  'VILLA SOLDATI',
  'VILLA URQUIZA',
] as const
