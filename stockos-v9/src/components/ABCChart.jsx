import { useApp } from '../contexts/AppContext.jsx'
import { clasificarABC, formatearCLP } from '../lib/abc.js'

export default function ABCChart() {
  const { productos } = useApp()
  const abc = clasificarABC(productos)

  const datos = [
    { cat: 'A', items: abc.A, color: 'bg-emerald-500', desc: 'Alta prioridad' },
    { cat: 'B', items: abc.B, color: 'bg-amber-500', desc: 'Prioridad media' },
    { cat: 'C', items: abc.C, color: 'bg-gray-400', desc: 'Baja prioridad' },
  ]

  const maxValor = Math.max(...datos.map((d) => d.items.reduce((acc, p) => acc + p.valor_inventario, 0)), 1)

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4">Clasificación ABC</h3>
      <div className="space-y-4">
        {datos.map((d) => {
          const valor = d.items.reduce((acc, p) => acc + p.valor_inventario, 0)
          const ancho = (valor / maxValor) * 100
          return (
            <div key={d.cat}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-sm ${d.color}`} />
                  <span className="text-sm font-medium text-gray-700">Categoría {d.cat}</span>
                  <span className="text-xs text-gray-400">({d.items.length} productos)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatearCLP(valor)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${d.color} transition-all`} style={{ width: `${ancho}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{d.desc}</p>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Valor total inventario</span>
          <span className="font-bold text-gray-900">{formatearCLP(abc.valorTotal)}</span>
        </div>
      </div>
    </div>
  )
}
