export default function EmpresasTable({ empresas, onVerPanel, onAprobar, onDelete, onEstadoChange }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Logo</th>
              <th className="th">Empresa</th>
              <th className="th">Encargado</th>
              <th className="th">Estado</th>
              <th className="th text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {empresas.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition">
                <td className="td">
                  {emp.logo ? (
                    <img src={emp.logo} alt={emp.nombre} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                      <span className="text-brand-700 font-bold text-sm">
                        {emp.nombre.charAt(0)}
                      </span>
                    </div>
                  )}
                </td>
                <td className="td">
                  <div>
                    <p className="font-medium text-gray-900">{emp.nombre}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </div>
                </td>
                <td className="td">
                  <div>
                    <p className="text-gray-900">{emp.encargado}</p>
                    <p className="text-xs text-gray-400">{emp.cargo}</p>
                  </div>
                </td>
                <td className="td">
                  <select
                    value={emp.estado}
                    onChange={(e) => onEstadoChange(emp.id, e.target.value)}
                    className={`text-xs font-medium rounded-lg px-2 py-1 border-0 cursor-pointer ${
                      emp.estado === 'Aprobada' ? 'bg-green-100 text-green-800' :
                      emp.estado === 'En pausa' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <option value="Aprobada">Aprobada</option>
                    <option value="En pausa">En pausa</option>
                    <option value="En espera">En espera</option>
                  </select>
                </td>
                <td className="td">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onVerPanel(emp.id)}
                      className="btn-primary !px-3 !py-1.5 text-xs"
                    >
                      Ver Panel
                    </button>
                    <button
                      onClick={() => onAprobar(emp.id)}
                      className="btn-primary !px-3 !py-1.5 text-xs !bg-green-600 hover:!bg-green-700"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => onDelete(emp.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
