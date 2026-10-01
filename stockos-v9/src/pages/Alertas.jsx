import { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearFecha } from '../lib/format.js'

export default function Alertas() {
  const { notificaciones, productos, refresh, loading } = useApp()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [form, setForm] = useState({
    producto_id: '', telefono: '', mensaje: '', tipo: 'alerta_stock',
  })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('notificaciones_whatsapp').insert([form])
      if (error) throw error
      setMostrarForm(false)
      setForm({ producto_id: '', telefono: '', mensaje: '', tipo: 'alerta_stock' })
      refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const marcarEnviada = async (id) => {
    await supabase.from('notificaciones_whatsapp').update({ estado: 'enviada', fecha_envio: new Date().toISOString() }).eq('id', id)
    refresh()
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando notificaciones...</p>

  const filtradas = filtroEstado ? notificaciones.filter((n) => n.estado === filtroEstado) : notificaciones
  const pendientes = notificaciones.filter((n) => n.estado === 'pendiente').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas WhatsApp</h2>
          <p className="text-sm text-gray-500">{pendientes} pendientes de envío</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="btn-primary">+ Nueva Alerta</button>
      </div>

      {/* Filtro */}
      <div className="flex gap-3">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input max-w-[180px]">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="enviada">Enviada</option>
          <option value="fallida">Fallida</option>
          <option value="leida">Leída</option>
        </select>
      </div>

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nueva Alerta WhatsApp</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="alerta_stock">Alerta de Stock</option>
                  <option value="despacho">Despacho</option>
                  <option value="promo">Promoción</option>
                  <option value="cobro">Cobro</option>
                </select>
              </div>
              <div>
                <label className="label">Producto (opcional)</label>
                <select className="input" value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })}>
                  <option value="">Ninguno</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" placeholder="+56 9 1234 5678" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
              </div>
              <div>
                <label className="label">Mensaje</label>
                <textarea className="input" rows="3" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando...' : 'Guardar Alerta'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {filtradas.map((n) => (
          <div key={n.id} className="card flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg shrink-0">💬</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900">{n.telefono}</p>
                <span className={`badge ${
                  n.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' :
                  n.estado === 'enviada' ? 'bg-emerald-100 text-emerald-800' :
                  n.estado === 'fallida' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>{n.estado}</span>
              </div>
              <p className="text-sm text-gray-600">{n.mensaje}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-400">{formatearFecha(n.created_at)}</span>
                <span className="badge bg-gray-100 text-gray-600">{n.tipo.replace('_', ' ')}</span>
                {n.estado === 'pendiente' && (
                  <button onClick={() => marcarEnviada(n.id)} className="text-xs text-emerald-600 hover:underline ml-auto">
                    Marcar como enviada
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay notificaciones</p>
        )}
      </div>
    </div>
  )
}
