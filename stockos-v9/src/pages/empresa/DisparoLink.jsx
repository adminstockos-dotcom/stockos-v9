import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function DisparoLink() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [productos, setProductos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_productos`)) || [
        { id: 1, nombre: 'Producto A', precio: 10000, stock: 50, activo: true },
        { id: 2, nombre: 'Producto B', precio: 8000, stock: 30, activo: true },
      ]
    } catch { return [] }
  })
  const [seleccionados, setSeleccionados] = useState([])
  const [telefono, setTelefono] = useState('')
  const [link, setLink] = useState('')
  const [filtros, setFiltros] = useState({ categoria: false, precio: false, stock: false })
  const [celularEmpresa, setCelularEmpresa] = useState('')
  const [escaneaPedidos, setEscaneaPedidos] = useState(false)
  const [cierraVentas, setCierraVentas] = useState(false)

  const toggle = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const generarLink = () => {
    const params = new URLSearchParams({
      t: telefono,
      p: seleccionados.join(','),
    })
    setLink(`https://wa.me/569${telefono}?text=${encodeURIComponent(`Hola, te comparto el catálogo: /c/${subdomain}?${params}`)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Disparo + Link</h2>
        <p className="text-sm text-gray-500">Genera links de WhatsApp — {subdomain}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Link Filtrable</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 px-3 py-2 rounded-lg text-sm text-brand-600">
            stockos.com/inv/{subdomain}
          </code>
          <button onClick={() => navigator.clipboard.writeText(`stockos.com/inv/${subdomain}`)} className="btn-secondary text-xs">
            Copiar
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Filtros Avanzados</h3>
        <div className="space-y-2">
          {[
            { key: 'categoria', label: 'Por categoría' },
            { key: 'precio', label: 'Por rango de precio' },
            { key: 'stock', label: 'Solo con stock' },
          ].map((f) => (
            <label key={f.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros[f.key]}
                onChange={(e) => setFiltros({ ...filtros, [f.key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700">{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Productos a incluir</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {productos.map((p) => (
            <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={seleccionados.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700">{p.nombre}</span>
              <span className="text-xs text-gray-400 ml-auto">${p.precio.toLocaleString()}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Escanea pedidos</span>
            <button
              onClick={() => setEscaneaPedidos(!escaneaPedidos)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${escaneaPedidos ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${escaneaPedidos ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Cierra ventas auto</span>
            <button
              onClick={() => setCierraVentas(!cierraVentas)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cierraVentas ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cierraVentas ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Generar Link</h3>
        <input
          className="input mb-3"
          placeholder="Teléfono (sin +56)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <button onClick={generarLink} disabled={!telefono || seleccionados.length === 0} className="btn-primary">
          Generar Link WhatsApp
        </button>
        {link && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-700 break-all">{link}</p>
            <a href={link} target="_blank" rel="noopener" className="btn-primary mt-2 inline-flex">
              Abrir WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
