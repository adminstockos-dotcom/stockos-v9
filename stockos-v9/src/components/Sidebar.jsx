import { NavLink } from 'react-router-dom'
import { useApp } from '../contexts/AppContext.jsx'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/productos', label: 'Productos', icon: '📦' },
  { to: '/campanias', label: 'Campañas', icon: '📣' },
  { to: '/despachos', label: 'Despachos', icon: '🚚' },
  { to: '/pagos', label: 'Pagos', icon: '💳' },
  { to: '/alertas', label: 'Alertas WhatsApp', icon: '💬' },
]

export default function Sidebar() {
  const { productos, notificaciones } = useApp()
  const stockCritico = productos.filter((p) => p.stock_actual <= p.stock_minimo).length
  const notifPendientes = notificaciones.filter((n) => n.estado === 'pendiente').length

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-lg">{l.icon}</span>
            <span className="flex-1">{l.label}</span>
            {l.to === '/productos' && stockCritico > 0 && (
              <span className="badge bg-red-100 text-red-700">{stockCritico}</span>
            )}
            {l.to === '/alertas' && notifPendientes > 0 && (
              <span className="badge bg-amber-100 text-amber-700">{notifPendientes}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">STOCKOS v9 &copy; 2026</p>
      </div>
    </aside>
  )
}
