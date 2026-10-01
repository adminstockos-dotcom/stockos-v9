import { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearCLP } from '../lib/abc.js'
import { formatearFecha } from '../lib/format.js'

export default function Pagos() {
  const { pagos, refresh, loading } = useApp()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [form, setForm] = useState({
    monto: 0, metodo: 'transferencia', estado: 'completado', descripcion: '', fecha_pago: new Date().toISOString().split('T')[0],
  })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('pagos').insert([form])
      if (error) throw error
      setMostrarForm(false)
      setForm({ monto: 0, metodo: 'transferencia', estado: 'completado', descripcion: '', fecha_pago: new Date().toISOString().split('T')[0] })
      refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando pagos...</p>

  const filtrados = filtroEstado ? pagos.filter((p) => p.estado === filtroEstado) : pagos
  const totalCompletados = pagos.filter((p) => p.estado === 'completado').reduce((a, p) => a + Number(p.monto), 0)
  const totalPendientes = pagos.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + Number(p.monto), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pagos</h2>
          <p className="text-sm text-gray-500">{pagos.length} transacciones</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="btn-primary">+ Registrar Pago</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Completados</p>
          <p className="text-2xl font-bold text-emerald-600">{formatearCLP(totalCompletados)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{formatearCLP(totalPendientes)}</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-3">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input max-w-[180px]">
          <option value="">Todos los estados</option>
          <option value="completado">Completado</option>
          <option value="pendiente">Pendiente</option>
          <option value="fallido">Fallido</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
      </div>

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Registrar Pago</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Monto (CLP)</label>
                <input type="number" min="1" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label className="label">Método</label>
                <select className="input" value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="webpay">Webpay</option>
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="completado">Completado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="fallido">Fallido</option>
                  <option value="reembolsado">Reembolsado</option>
                </select>
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input" value={form.fecha_pago} onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando...' : 'Registrar'}
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
              <th className="th">Fecha</th>
              <th className="th">Descripción</th>
              <th className="th">Método</th>
              <th className="th">Monto</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="td">{formatearFecha(p.fecha_pago)}</td>
                <td className="td">{p.descripcion || '—'}</td>
                <td className="td capitalize">{p.metodo.replace('_', ' ')}</td>
                <td className="td font-semibold">{formatearCLP(p.monto)}</td>
                <td className="td">
                  <span className={`badge ${
                    p.estado === 'completado' ? 'bg-emerald-100 text-emerald-700' :
                    p.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                    p.estado === 'fallido' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{p.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay pagos registrados</p>
        )}
      </div>
    </div>
  )
}
