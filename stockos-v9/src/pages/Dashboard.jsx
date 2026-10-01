import { useParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext.jsx'
import { clasificarABC, formatearCLP } from '../lib/abc.js'
import StatCard from '../components/StatCard.jsx'
import StockCritico from '../components/StockCritico.jsx'
import ABCChart from '../components/ABCChart.jsx'
import AlertasWhatsApp from '../components/AlertasWhatsApp.jsx'
import { formatearFecha, formatearNumero } from '../lib/format.js'

export default function Dashboard() {
  const { subdomain } = useParams()
  const currentClient = subdomain || localStorage.getItem('currentClient') || 'default'
  const { productos, campanias, despachos, pagos, loading } = useApp()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const abc = clasificarABC(productos)
  const valorTotal = abc.valorTotal
  const stockCritico = productos.filter((p) => p.stock_actual <= p.stock_minimo).length
  const despachosPendientes = despachos.filter((d) => d.estado === 'pendiente' || d.estado === 'en_camino').length
  const campaniasActivas = campanias.filter((c) => c.estado === 'activa').length
  const ventasDelMes = pagos
    .filter((p) => {
      const fecha = new Date(p.fecha_pago)
      const ahora = new Date()
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear()
    })
    .reduce((acc, p) => acc + Number(p.monto), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">
          Resumen general de tu inventario y operaciones
          {currentClient !== 'default' && (
            <span className="ml-2 badge bg-brand-100 text-brand-700">{currentClient}</span>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo="Valor Inventario"
          valor={formatearCLP(valorTotal)}
          subtitulo={`${productos.length} productos activos`}
          icono="💰"
          color="green"
        />
        <StatCard
          titulo="Stock Crítico"
          valor={stockCritico}
          subtitulo="Productos bajo mínimo"
          icono="⚠️"
          color={stockCritico > 0 ? 'red' : 'green'}
        />
        <StatCard
          titulo="Campañas Activas"
          valor={campaniasActivas}
          subtitulo={`${campanias.length} totales`}
          icono="📣"
          color="purple"
        />
        <StatCard
          titulo="Despachos Pendientes"
          valor={despachosPendientes}
          subtitulo="Por entregar"
          icono="🚚"
          color="amber"
        />
      </div>

      {/* Fila principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ABCChart />
        </div>
        <div>
          <StockCritico />
        </div>
      </div>

      {/* Fila secundaria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Ventas del Mes</h3>
          <p className="text-3xl font-bold text-emerald-600">{formatearCLP(ventasDelMes)}</p>
          <p className="text-sm text-gray-500 mt-1">{pagos.length} transacciones registradas</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Campañas Recientes</h3>
          <div className="space-y-2">
            {campanias.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate mr-2">{c.nombre}</span>
                <span className={`badge ${c.estado === 'activa' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.estado}
                </span>
              </div>
            ))}
            {campanias.length === 0 && <p className="text-sm text-gray-400">Sin campañas</p>}
          </div>
        </div>
        <AlertasWhatsApp />
      </div>

      {/* Despachos recientes */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Despachos Recientes</h3>
        {despachos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Sin despachos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="th">Destinatario</th>
                  <th className="th">Producto</th>
                  <th className="th">Cantidad</th>
                  <th className="th">Estado</th>
                  <th className="th">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {despachos.slice(0, 5).map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="td font-medium">{d.destinatario}</td>
                    <td className="td">{d.producto_id || '—'}</td>
                    <td className="td">{formatearNumero(d.cantidad)}</td>
                    <td className="td">
                      <span className={`badge ${
                        d.estado === 'entregado' ? 'bg-emerald-100 text-emerald-700' :
                        d.estado === 'en_camino' ? 'bg-blue-100 text-blue-700' :
                        d.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {d.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="td">{formatearFecha(d.fecha_despacho)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
