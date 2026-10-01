import { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearFecha, formatearNumero } from '../lib/format.js'

export default function Despachos() {
  const { despachos, productos, refresh, loading } = useApp()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    producto_id: '', cantidad: 1, destinatario: '', direccion: '', estado: 'pendiente',
  })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('despachos').insert([form])
      if (error) throw error
      // Descontar stock
      if (form.producto_id) {
        const prod = productos.find((p) => p.id === form.producto_id)
        if (prod) {
          await supabase.from('productos').update({ stock_actual: Math.max(0, prod.stock_actual - form.cantidad) }).eq('id', form.producto_id)
        }
      }
      setMostrarForm(false)
      setForm({ producto_id: '', cantidad: 1, destinatario: '', direccion: '', estado: 'pendiente' })
      refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (id, estado) => {
    await supabase.from('despachos').update({ estado }).eq('id', id)
    refresh()
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando despachos...</p>

  const pendientes = despachos.filter((d) => d.estado === 'pendiente').length
  const enCamino = despachos.filter((d) => d.estado === 'en_camino').length
  const entregados = despachos.filter((d) => d.estado === 'entregado').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Despachos</h2>
          <p className="text-sm text-gray-500">{despachos.length} despachos registrados</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="btn-primary">+ Nuevo Despacho</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">En Camino</p>
          <p className="text-2xl font-bold text-blue-600">{enCamino}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Entregados</p>
          <p className="text-2xl font-bold text-emerald-600">{entregados}</p>
        </div>
      </div>

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nuevo Despacho</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Producto</label>
                <select className="input" value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock_actual})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cantidad</label>
                <input type="number" min="1" className="input" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 1 })} required />
              </div>
              <div>
                <label className="label">Destinatario</label>
                <input className="input" value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })} required />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando...' : 'Crear Despacho'}
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
              <th className="th">Destinatario</th>
              <th className="th">Dirección</th>
              <th className="th">Cantidad</th>
              <th className="th">Estado</th>
              <th className="th">Fecha Despacho</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {despachos.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="td font-medium">{d.destinatario}</td>
                <td className="td max-w-[200px] truncate">{d.direccion}</td>
                <td className="td">{formatearNumero(d.cantidad)}</td>
                <td className="td">
                  <span className={`badge ${
                    d.estado === 'entregado' ? 'bg-emerald-100 text-emerald-700' :
                    d.estado === 'en_camino' ? 'bg-blue-100 text-blue-700' :
                    d.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{d.estado.replace('_', ' ')}</span>
                </td>
                <td className="td">{formatearFecha(d.fecha_despacho)}</td>
                <td className="td">
                  <div className="flex gap-2">
                    {d.estado === 'pendiente' && (
                      <button onClick={() => cambiarEstado(d.id, 'en_camino')} className="text-xs text-blue-600 hover:underline">Despachar</button>
                    )}
                    {d.estado === 'en_camino' && (
                      <button onClick={() => cambiarEstado(d.id, 'entregado')} className="text-xs text-emerald-600 hover:underline">Entregar</button>
                    )}
                    {(d.estado === 'pendiente' || d.estado === 'en_camino') && (
                      <button onClick={() => cambiarEstado(d.id, 'cancelado')} className="text-xs text-red-600 hover:underline">Cancelar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {despachos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay despachos registrados</p>
        )}
      </div>
    </div>
  )
}
