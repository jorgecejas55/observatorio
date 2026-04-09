export default function ConfigAdmin() {
  return (
    <div>
      <h2 className="section-title">Configuración del Sistema</h2>

      <div className="card p-6 mb-4">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <i className="fa-solid fa-key text-primary" />
          Variables de entorno requeridas
        </h3>
        <div className="space-y-3 font-mono text-sm">
          {[
            { key: 'AUTH_SECRET', desc: 'Secreto aleatorio para NextAuth (mínimo 32 chars)' },
            { key: 'AUTH_GOOGLE_ID', desc: 'Client ID de Google OAuth (console.cloud.google.com)' },
            { key: 'AUTH_GOOGLE_SECRET', desc: 'Client Secret de Google OAuth' },
            { key: 'GOOGLE_APPS_SCRIPT_URL', desc: 'URL del Web App de Google Apps Script desplegado' },
            { key: 'GAS_API_KEY', desc: 'Clave secreta compartida con Google Apps Script' },
          ].map(({ key, desc }) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 p-3 bg-gray-50 rounded-xl">
              <code className="text-primary font-bold min-w-56">{key}</code>
              <span className="text-text-secondary text-xs font-sans">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <i className="fa-brands fa-google-drive text-accent" />
          Spreadsheets de Google Sheets
        </h3>
        <div className="space-y-2 text-sm">
          {[
            'OBS_Ocio_Demanda — Encuesta_Turista, Ingresos_Atractivos, Ingresos_Camping',
            'OBS_Eventos — Registro_Eventos, Encuesta_Demanda_Eventos',
            'OBS_Oferta — Alojamientos_Temporarios',
            'OBS_Calidad — Calidad_Atractivos, Calidad_Servicios, Calidad_Bus, Percepcion_Social',
            'OBS_Estadisticas — Indicadores_Mensuales, Indicadores_Feriados, Ingresos_Atractivos_Mensual',
            'OBS_Admin — Usuarios y roles',
          ].map((sheet) => (
            <div key={sheet} className="flex items-start gap-2 text-text-secondary">
              <i className="fa-solid fa-table-cells text-green-500 mt-0.5 flex-shrink-0" />
              <span>{sheet}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
