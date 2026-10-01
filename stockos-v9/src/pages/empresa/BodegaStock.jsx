import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function BodegaStock() {
  const [searchParams] = useSearchParams()
  const subdomain = searchParams.get('subdomain') || localStorage.getItem('subdomain_actual') || 'virtualclass512'
  const [productos, setProductos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`data_${subdomain}_productos`)) || [
        { id: 1, sku: 'SKU-001', nombre: 'Producto A', stock: 3, precio: 10000 },
        { id: 2, sku: 'SKU-002', nombre: 'Producto B', stock: 0, precio: 8000 },
        { id: 3, sku: 'SKU-003', nombre: 'Producto C', stock: 100, precio: 5000 },
      ]
    } catch { return [] }
  })
  const [scanValue, setScanValue] = useState('')
  const [tabInterno, setTabInterno] = useState('fotos')

  useEffect(() => {
    localStorage.setItem(`data_${subdomain}_productos`, JSON.stringify(productos))
  }, [productos, subdomain])

  const ajustarStock = (id, nuevoStock) => {
    setProductos(productos.map((p) => p.id === id ? { ...p, stock: nuevoStock } : p))
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

  const criticos = productos.filter((p) => p.stock < 5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bodega Stock &lt;5 + Pistola</h2>
        <p className="text-sm text-gray-500">Stock crítico — {subdomain}</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTabInterno('fotos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tabInterno === 'fotos' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Fotos Variantes + CRM + Pagos
        </button>
        <button
          onClick={() => setTabInterno('bodega')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tabInterno === 'bodega' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Bodega Propia + Pistola + Códigos Barras
        </button>
      </div>

      <div className="card">
        <label className="label">Pistola Lectora — Escanear para sumar 1</label>
        <input
          className="input font-mono"
          placeholder="Apunta el lector y presiona Enter..."
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleScan}
          autoFocus
        />
      </div>

      {tabInterno === 'fotos' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Tallas y Colores</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único', 'Ajustable'].map((talla) => (
                <div key={talla} className="p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-700">{talla}</div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">CRM Mayorista vs Detal (40% / 85%)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">Mayorista</p>
                <p className="text-sm text-blue-700">Precio con 85% de markup</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="font-semibold text-emerald-900">Detal</p>
                <p className="text-sm text-emerald-700">Precio con 40% de markup</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Pagos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Contraentrega', 'Transferencia', 'Efectivo', 'Nequi', 'PSE', 'PayPal'].map((metodo) => (
                <div key={metodo} className="p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-700">{metodo}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tabInterno === 'bodega' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Stock Crítico (&lt;5 unidades)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="th">SKU</th>
                    <th className="th">Nombre</th>
                    <th className="th">Stock</th>
                    <th className="th">Precio</th>
                    <th className="th">Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {criticos.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="td font-mono text-xs">{p.sku}</td>
                      <td className="td font-medium">{p.nombre}</td>
                      <td className="td">
                        <span className={`badge ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="td">${p.precio.toLocaleString()}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => ajustarStock(p.id, p.stock - 1)} className="h-7 w-7 rounded bg-gray-100 hover:bg-gray-200 text-sm">−</button>
                          <span className="text-sm font-medium w-8 text-center">{p.stock}</span>
                          <button onClick={() => ajustarStock(p.id, p.stock + 1)} className="h-7 w-7 rounded bg-gray-100 hover:bg-gray-200 text-sm">+</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticos.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Sin productos en stock crítico</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Generar Código de Barras</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Referencia</label>
                <input className="input" placeholder="REF-001" />
              </div>
              <div>
                <label className="label">Tipo de código</label>
                <select className="input">
                  <option value="EAN13">EAN-13</option>
                  <option value="CODE128">CODE-128</option>
                </select>
              </div>
              <button className="btn-primary">Generar Código</button>
              <button className="btn-secondary ml-2">Imprimir Etiqueta PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
