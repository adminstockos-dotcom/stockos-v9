import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function CatalogoPublico() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [productos, setProductos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_productos`)) || [
        { id: 1, nombre: 'Producto A', precio: 10000, stock: 50, activo: true },
        { id: 2, nombre: 'Producto B', precio: 8000, stock: 30, activo: true },
        { id: 3, nombre: 'Producto C', precio: 5000, stock: 100, activo: false },
      ]
    } catch { return [] }
  })
  const [publicado, setPublicado] = useState(true)

  useEffect(() => {
    localStorage.setItem(`data_${subdomain}_productos`, JSON.stringify(productos))
  }, [productos, subdomain])

  const toggleActivo = (id) => {
    setProductos(productos.map((p) => p.id === id ? { ...p, activo: !p.activo } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CATÁLOGO PÚBLICO V7.8</h2>
          <p className="text-sm text-gray-500">Catálogo público de {subdomain}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{publicado ? 'Publicado' : 'Oculto'}</span>
          <button
            onClick={() => setPublicado(!publicado)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publicado ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publicado ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="card bg-gray-50">
        <p className="text-sm text-gray-600">
          Link público: <code className="bg-white px-2 py-1 rounded text-brand-600">/c/{subdomain}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map((p) => (
          <div key={p.id} className="card">
            <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
              📦
            </div>
            <h4 className="font-semibold text-gray-900">{p.nombre}</h4>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-brand-600">${p.precio.toLocaleString()}</span>
              <span className={`badge ${p.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {p.stock > 0 ? `${p.stock} disp.` : 'Agotado'}
              </span>
            </div>
            <button
              onClick={() => toggleActivo(p.id)}
              className={`mt-3 w-full py-2 rounded text-sm font-medium ${
                p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {p.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
      {productos.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No hay productos en el catálogo</p>
      )}
    </div>
  )
}
