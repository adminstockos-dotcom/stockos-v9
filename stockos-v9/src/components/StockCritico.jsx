import { useApp } from '../contexts/AppContext.jsx'
import { formatearCLP } from '../lib/abc.js'

export default function StockCritico() {
  const { productos } = useApp()
  const criticos = productos
    .filter((p) => p.stock_actual <= p.stock_minimo)
    .sort((a, b) => a.stock_actual - b.stock_actual)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Stock Crítico</h3>
        <span className="badge bg-red-100 text-red-700">{criticos.length} producto{criticos.length !== 1 ? 's' : ''}</span>
      </div>
      {criticos.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Sin productos en stock crítico</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {criticos.map((p) => {
            const pct = p.stock_minimo > 0 ? (p.stock_actual / p.stock_minimo) * 100 : 0
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                    <span className="text-xs text-gray-500 shrink-0">{p.stock_actual}/{p.stock_minimo} uds</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct <= 30 ? 'bg-red-500' : pct <= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-500 shrink-0">{formatearCLP(p.precio_venta)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
