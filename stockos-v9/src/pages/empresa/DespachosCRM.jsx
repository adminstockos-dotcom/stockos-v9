import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function DespachosCRM() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [despachos, setDespachos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_despachos`)) || [
        { id: 1, destinatario: 'Juan Pérez', estado: 'pendiente', cantidad: 2 },
        { id: 2, destinatario: 'María López', estado: 'en_camino', cantidad: 1 },
        { id: 3, destinatario: 'Carlos Ruiz', estado: 'entregado', cantidad: 3 },
      ]
    } catch { return [] }
  })
  const [checklist, setChecklist] = useState({
    cierraVenta: false,
    organizaRuta: false,
    generaGuia: false,
    listoDespachar: false,
  })

  useEffect(() => {
    localStorage.setItem(`data_${subdomain}_despachos`, JSON.stringify(despachos))
  }, [despachos, subdomain])

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const cambiarEstado = (id, estado) => {
    setDespachos(despachos.map((d) => d.id === id ? { ...d, estado } : d))
  }

  const kanban = {
    pendiente: despachos.filter((d) => d.estado === 'pendiente'),
    en_camino: despachos.filter((d) => d.estado === 'en_camino'),
    entregado: despachos.filter((d) => d.estado === 'entregado'),
  }

  const checklistItems = [
    { key: 'cierraVenta', label: 'Cierra venta' },
    { key: 'organizaRuta', label: 'Organiza pedidos por ruta' },
    { key: 'generaGuia', label: 'Genera guía' },
    { key: 'listoDespachar', label: 'Todo listo despachar' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Despachos + CRM + Pagos</h2>
        <p className="text-sm text-gray-500">Kanban de despachos — {subdomain}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Checklist Mensajeros</h3>
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={() => toggleCheck(item.key)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(kanban).map(([estado, items]) => (
          <div key={estado} className="card">
            <h3 className="font-semibold text-gray-900 mb-3 capitalize">{estado.replace('_', ' ')} ({items.length})</h3>
            <div className="space-y-2">
              {items.map((d) => (
                <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{d.destinatario}</p>
                  <p className="text-xs text-gray-500">{d.cantidad} uds</p>
                  <div className="flex gap-1 mt-2">
                    {estado === 'pendiente' && (
                      <button onClick={() => cambiarEstado(d.id, 'en_camino')} className="text-xs text-blue-600 hover:underline">Despachar</button>
                    )}
                    {estado === 'en_camino' && (
                      <button onClick={() => cambiarEstado(d.id, 'entregado')} className="text-xs text-emerald-600 hover:underline">Entregar</button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin items</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
