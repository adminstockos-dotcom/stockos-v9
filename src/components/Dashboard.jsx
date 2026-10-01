const EMPRESAS = [
  { id: 1, nombre: 'Comercial Andina S.A.', rut: '76.123.456-7', estado: 'Activa', plan: 'Enterprise', contacto: 'contacto@andina.cl', ultimoAcceso: '2026-09-28' },
  { id: 2, nombre: 'Distribuidora El Roble', rut: '76.234.567-8', estado: 'Activa', plan: 'Pro', contacto: 'ventas@elroble.cl', ultimoAcceso: '2026-09-27' },
  { id: 3, nombre: 'Importadora Pacifico', rut: '76.345.678-9', estado: 'Pendiente', plan: 'Basic', contacto: 'info@pacifico.cl', ultimoAcceso: '2026-09-20' },
  { id: 4, nombre: 'Logistica Sur Ltda.', rut: '76.456.789-0', estado: 'Activa', plan: 'Pro', contacto: 'ops@logsur.cl', ultimoAcceso: '2026-09-28' },
  { id: 5, nombre: 'Alimentos del Valle', rut: '76.567.890-1', estado: 'Pendiente', plan: 'Enterprise', contacto: 'admin@delvalle.cl', ultimoAcceso: '2026-09-15' },
  { id: 6, nombre: 'Tecnologia Aplicada', rut: '76.678.901-2', estado: 'Activa', plan: 'Pro', contacto: 'soporte@tecapli.cl', ultimoAcceso: '2026-09-26' },
  { id: 7, nombre: 'Ferreteria Central', rut: '76.789.012-3', estado: 'Activa', plan: 'Basic', contacto: 'ventas@fercentral.cl', ultimoAcceso: '2026-09-25' },
  { id: 8, nombre: 'Textil Los Andes', rut: '76.890.123-4', estado: 'Pendiente', plan: 'Pro', contacto: 'contacto@textilosandes.cl', ultimoAcceso: '2026-09-10' },
  { id: 9, nombre: 'Constructora Norte', rut: '76.901.234-5', estado: 'Activa', plan: 'Enterprise', contacto: 'proyectos@conorte.cl', ultimoAcceso: '2026-09-28' },
  { id: 10, nombre: 'Farmacias Salud+', rut: '76.012.345-6', estado: 'Activa', plan: 'Pro', contacto: 'info@saludplus.cl', ultimoAcceso: '2026-09-27' },
  { id: 11, nombre: 'Automotriz del Sur', rut: '77.123.456-7', estado: 'Activa', plan: 'Enterprise', contacto: 'ventas@autosur.cl', ultimoAcceso: '2026-09-28' },
  { id: 12, nombre: 'Agroindustrial Ltda.', rut: '77.234.567-8', estado: 'Pendiente', plan: 'Basic', contacto: 'contacto@agroind.cl', ultimoAcceso: '2026-09-05' },
  { id: 13, nombre: 'Mineria Explora', rut: '77.345.678-9', estado: 'Activa', plan: 'Enterprise', contacto: 'operaciones@explora.cl', ultimoAcceso: '2026-09-28' },
  { id: 14, nombre: 'Pesquera Austral', rut: '77.456.789-0', estado: 'Activa', plan: 'Pro', contacto: 'info@pesqueraaustral.cl', ultimoAcceso: '2026-09-26' },
  { id: 15, nombre: 'Energia Renovable S.A.', rut: '77.567.890-1', estado: 'Activa', plan: 'Enterprise', contacto: 'contacto@erenovable.cl', ultimoAcceso: '2026-09-28' },
  { id: 16, nombre: 'Transportes Rapidos', rut: '77.678.901-2', estado: 'Activa', plan: 'Pro', contacto: 'ops@transportesrapidos.cl', ultimoAcceso: '2026-09-27' },
  { id: 17, nombre: 'Hotelera Costa Azul', rut: '77.789.012-3', estado: 'Activa', plan: 'Pro', contacto: 'reservas@costazul.cl', ultimoAcceso: '2026-09-25' },
  { id: 18, nombre: 'EducaDigital SpA', rut: '77.890.123-4', estado: 'Activa', plan: 'Basic', contacto: 'info@educadigital.cl', ultimoAcceso: '2026-09-24' },
  { id: 19, nombre: 'Salud Integral S.A.', rut: '77.901.234-5', estado: 'Activa', plan: 'Enterprise', contacto: 'contacto@saludintegral.cl', ultimoAcceso: '2026-09-28' },
  { id: 20, nombre: 'Retail Express', rut: '78.012.345-6', estado: 'Activa', plan: 'Pro', contacto: 'ventas@retailexpress.cl', ultimoAcceso: '2026-09-27' },
  { id: 21, nombre: 'Inmobiliaria Horizonte', rut: '78.123.456-7', estado: 'Activa', plan: 'Pro', contacto: 'info@horizonte.cl', ultimoAcceso: '2026-09-26' },
  { id: 22, nombre: 'Seguros Confianza', rut: '78.234.567-8', estado: 'Activa', plan: 'Enterprise', contacto: 'siniestros@confianza.cl', ultimoAcceso: '2026-09-28' },
  { id: 23, nombre: 'Consultora Estrategica', rut: '78.345.678-9', estado: 'Activa', plan: 'Pro', contacto: 'contacto@consultora.cl', ultimoAcceso: '2026-09-25' },
  { id: 24, nombre: 'Eventos y Producciones', rut: '78.456.789-0', estado: 'Activa', plan: 'Basic', contacto: 'info@eventosyp.cl', ultimoAcceso: '2026-09-23' },
]

export default function Dashboard() {
  const total = EMPRESAS.length
  const activas = EMPRESAS.filter(e => e.estado === 'Activa').length
  const pendientes = EMPRESAS.filter(e => e.estado === 'Pendiente').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Empresas</h2>
        <p className="text-sm text-gray-500 mt-1">Resumen general de empresas registradas en STOCKOS v7.8</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Empresas</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Activas</p>
            <p className="text-2xl font-bold text-green-600">{activas}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{pendientes}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Listado de Empresas</h3>
          <span className="text-sm text-gray-500">{total} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">ID</th>
                <th className="th">Empresa</th>
                <th className="th">RUT</th>
                <th className="th">Estado</th>
                <th className="th">Plan</th>
                <th className="th">Contacto</th>
                <th className="th">Último Acceso</th>
                <th className="th text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {EMPRESAS.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="td text-gray-400 font-mono text-xs">#{emp.id.toString().padStart(3, '0')}</td>
                  <td className="td font-medium text-gray-900">{emp.nombre}</td>
                  <td className="td font-mono text-xs">{emp.rut}</td>
                  <td className="td">
                    <span className={emp.estado === 'Activa' ? 'badge-green' : 'badge-yellow'}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="td">
                    <span className="badge-blue">{emp.plan}</span>
                  </td>
                  <td className="td text-gray-500">{emp.contacto}</td>
                  <td className="td text-gray-500">{emp.ultimoAcceso}</td>
                  <td className="td text-center">
                    <button className="btn-secondary !px-3 !py-1.5 text-xs">
                      Ver Panel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
