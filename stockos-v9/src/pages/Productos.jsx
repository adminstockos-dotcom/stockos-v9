import { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { clasificarABC, formatearCLP } from '../lib/abc.js'
import { formatearNumero } from '../lib/format.js'

export default function Productos() {
  const { productos, refresh, loading } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtroABC, setFiltroABC] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    sku: '', nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 5,
    precio_costo: 0, precio_venta: 0, categoria_abc: 'C',
  })

  const abc = clasificarABC(productos)
  const categoriaMap = Object.fromEntries(abc.resumen.map((p) => [p.id, p.categoria]))

  const filtrados = productos.filter((p) => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase())
    const matchABC = !filtroABC || (categoriaMap[p.id] || p.categoria_abc) === filtroABC
    return matchBusqueda && matchABC
  })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('productos').insert([form])
      if (error) throw error
      setMostrarForm(false)
      setForm({ sku: '', nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 5, precio_costo: 0, precio_venta: 0, categoria_abc: 'C' })
      refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando productos...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
          <p className="text-sm text-gray-500">{productos.length} productos registrados</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="btn-primary">+ Nuevo Producto</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input max-w-xs"
        />
        <select value={filtroABC} onChange={(e) => setFiltroABC(e.target.value)} className="input max-w-[180px]">
          <option value="">Todas las categorías</option>
          <option value="A">Categoría A</option>
          <option value="B">Categoría B</option>
          <option value="C">Categoría C</option>
        </select>
      </div>

      {/* Modal formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nuevo Producto</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">SKU</label>
                  <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Nombre</label>
                  <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Stock Actual</label>
                  <input type="number" min="0" className="input" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })} required />
                </div>
                <div>
                  <label className="label">Stock Mínimo</label>
                  <input type="number" min="0" className="input" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Precio Costo</label>
                  <input type="number" min="0" className="input" value={form.precio_costo} onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div>
                  <label className="label">Precio Venta</label>
                  <input type="number" min="0" className="input" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })} required />
                </div>
              </div>
              <div>
                <label className="label">Categoría ABC</label>
                <select className="input" value={form.categoria_abc} onChange={(e) => setForm({ ...form, categoria_abc: e.target.value })}>
                  <option value="A">A — Alta prioridad</option>
                  <option value="B">B — Prioridad media</option>
                  <option value="C">C — Baja prioridad</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">SKU</th>
              <th className="th">Nombre</th>
              <th className="th">Stock</th>
              <th className="th">Precio Venta</th>
              <th className="th">Valor Total</th>
              <th className="th">ABC</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const cat = categoriaMap[p.id] || p.categoria_abc
              const esCritico = p.stock_actual <= p.stock_minimo
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="td font-mono text-xs">{p.sku}</td>
                  <td className="td font-medium">{p.nombre}</td>
                  <td className="td">
                    <span className={esCritico ? 'text-red-600 font-semibold' : ''}>
                      {formatearNumero(p.stock_actual)}
                    </span>
                    <span className="text-gray-400 text-xs"> / {p.stock_minimo} mín</span>
                  </td>
                  <td className="td">{formatearCLP(p.precio_venta)}</td>
                  <td className="td">{formatearCLP((p.precio_costo || 0) * (p.stock_actual || 0))}</td>
                  <td className="td">
                    <span className={`badge ${
                      cat === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      cat === 'B' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{cat}</span>
                  </td>
                  <td className="td">
                    {esCritico ? (
                      <span className="badge bg-red-100 text-red-700">Crítico</span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-700">OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No se encontraron productos</p>
        )}
      </div>
    </div>
  )
}
