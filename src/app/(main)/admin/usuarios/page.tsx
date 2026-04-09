export default function UsuariosAdmin() {
  return (
    <div>
      <h2 className="section-title">Gestión de Usuarios</h2>
      <div className="card p-8 text-center text-text-secondary">
        <i className="fa-solid fa-users-gear text-4xl text-primary/30 mb-4 block" />
        <p className="font-semibold text-text-primary mb-1">Panel en desarrollo</p>
        <p className="text-sm">
          Aquí se administrarán los roles de usuario cargados en la hoja{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">OBS_Admin</code> de Google Sheets.
        </p>
      </div>
    </div>
  )
}
