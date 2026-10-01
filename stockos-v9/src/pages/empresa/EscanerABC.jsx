import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function EscanerABC() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [productos, setProductos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_productos`)) || [
        { id: 1, sku: 'SKU-001', nombre: 'Producto A', stock: 50, precio: 10000, categoria: 'A' },
        { id: 2, sku: 'SKU-002', nombre: 'Producto B', stock: 30, precio: 8000, categoria: 'B' },
        { id: 3, sku: 'SKU-003', nombre: 'Producto C', stock: 100, precio: 5000, categoria: 'C' },
      ]
    } catch { return [] }
  })
  const [scanValue, setScanValue] = useState('')

  useEffect(() => {
    localStorage.setItem(`data_${subdomain}_productos`, JSON.stringify(productos))
  }, [productos, subdomain])

  const cambiarCategoria = (id, categoria) => {
    setProductos(productos.map((p) => p.id === id ? { ...p, categoria } : p))
  }

  const handleScan = (e) => {
    if (e.key === 'Enter' && scanValue) {
      const prod = productos.find((p) => p.sku === scanValue)
      if (prod) {
        setProductos(productos.map((p) => p.id === prod.id ? { ...p, stock: p.stock + 1 } : p))
      }
      setScanValue('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Escáner A/B/C</h2>
        <p className="text-sm text-gray-500">Clasificación ABC — {subdomain}</p>
      </div>

      <div className="card">
        <label className="label">Escanear Código de Barras</label>
        <input
          className="input font-mono"
          placeholder="Apunta el lector y presiona Enter..."
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleScan}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['A', 'B', 'C'].map((cat) => {
          const items = productos.filter((p) => p.categoria === cat)
          const valor = items.reduce((acc, p) => acc + (p.precio * p.stock), 0)
          return (
            <div key={cat} className="card text-center">
              <p className="text-sm text-gray-500">Categoría {cat}</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-400">${valor.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">SKU</th>
              <th className="th">Nombre</th>
              <th className="th">Stock</th>
              <th className="th">Precio</th>
              <th className="th">ABC</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="td font-mono text-xs">{p.sku}</td>
                <td className="td font-medium">{p.nombre}</td>
                <td className="td">{p.stock}</td>
                <td className="td">${p.precio.toLocaleString()}</td>
                <td className="td">
                  <select
                    className={`text-xs font-semibold rounded px-2 py-1 border-0 ${
                      p.categoria === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      p.categoria === 'B' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                    value={p.categoria}
                    onChange={(e) => cambiarCategoria(p.id, e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay productos</p>
        )}
      </div>
    </div>
  )
}
