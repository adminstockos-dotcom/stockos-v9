import { useApp } from '../contexts/AppContext.jsx'
import { formatearFecha } from '../lib/format.js'

const estadoColores = {
  pendiente: 'bg-amber-100 text-amber-800',
  enviada: 'bg-emerald-100 text-emerald-800',
  fallida: 'bg-red-100 text-red-800',
  leida: 'bg-blue-100 text-blue-800',
}

export default function AlertasWhatsApp() {
  const { notificaciones } = useApp()
  const pendientes = notificaciones.filter((n) => n.estado === 'pendiente')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Alertas WhatsApp</h3>
        <span className="badge bg-amber-100 text-amber-800">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
      </div>
      {pendientes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Sin alertas pendientes</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {pendientes.slice(0, 10).map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm shrink-0">💬</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.telefono}</p>
                  <span className={`badge ${estadoColores[n.estado] || 'bg-gray-100 text-gray-600'}`}>{n.estado}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                <p className="text-xs text-gray-400 mt-1">{formatearFecha(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
