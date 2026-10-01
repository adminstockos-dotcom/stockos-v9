import { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearCLP } from '../lib/abc.js'
import { formatearFecha, formatearNumero } from '../lib/format.js'

export default function Campanias() {
  const { campanias, refresh, loading } = useApp()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: '', estado: 'activa', presupuesto_diario: 0, fecha_inicio: new Date().toISOString().split('T')[0],
  })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase.from('campanias').insert([form])
      if (error) throw error
      setMostrarForm(false)
      setForm({ nombre: '', estado: 'activa', presupuesto_diario: 0, fecha_inicio: new Date().toISOString().split('T')[0] })
      refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (id, estado) => {
    await supabase.from('campanias').update({ estado }).eq('id', id)
    refresh()
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando campañas...</p>

  const gastoTotal = campanias.reduce((acc, c) => acc + Number(c.gasto_total), 0)
  const conversionesTotal = campanias.reduce((acc, c) => acc + Number(c.conversiones), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campañas Facebook Ads</h2>
          <p className="text-sm text-gray-500">{campanias.length} campañas &middot; {formatearCLP(gastoTotal)} invertidos</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="btn-primary">+ Nueva Campaña</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Campañas Activas</p>
          <p className="text-2xl font-bold text-emerald-600">{campanias.filter((c) => c.estado === 'activa').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Impresiones Totales</p>
          <p className="text-2xl font-bold text-brand-600">{formatearNumero(campanias.reduce((a, c) => a + Number(c.impresiones), 0))}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Conversiones</p>
          <p className="text-2xl font-bold text-purple-600">{formatearNumero(conversionesTotal)}</p>
        </div>
      </div>

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nueva Campaña</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div>
                <label className="label">Presupuesto Diario (CLP)</label>
                <input type="number" min="0" className="input" value={form.presupuesto_diario} onChange={(e) => setForm({ ...form, presupuesto_diario: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label className="label">Fecha Inicio</label>
                <input type="date" className="input" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando...' : 'Crear Campaña'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campanias.map((c) => {
          const roi = Number(c.gasto_total) > 0 ? (Number(c.conversiones) * 1000) / Number(c.gasto_total) : 0
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{c.nombre}</h4>
                  <p className="text-xs text-gray-400">{formatearFecha(c.fecha_inicio)}</p>
                </div>
                <span className={`badge ${
                  c.estado === 'activa' ? 'bg-emerald-100 text-emerald-700' :
                  c.estado === 'pausada' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{c.estado}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">Gasto Total</p>
                  <p className="font-semibold">{formatearCLP(c.gasto_total)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Presupuesto/Día</p>
                  <p className="font-semibold">{formatearCLP(c.presupuesto_diario)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Impresiones</p>
                  <p className="font-semibold">{formatearNumero(c.impresiones)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Conversiones</p>
                  <p className="font-semibold">{formatearNumero(c.conversiones)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ROI: <span className="font-semibold text-gray-700">{roi.toFixed(1)}x</span></span>
                <div className="flex gap-2">
                  {c.estado === 'activa' && (
                    <button onClick={() => cambiarEstado(c.id, 'pausada')} className="text-xs text-amber-600 hover:underline">Pausar</button>
                  )}
                  {c.estado === 'pausada' && (
                    <button onClick={() => cambiarEstado(c.id, 'activa')} className="text-xs text-emerald-600 hover:underline">Activar</button>
                  )}
                  {c.estado !== 'finalizada' && (
                    <button onClick={() => cambiarEstado(c.id, 'finalizada')} className="text-xs text-gray-500 hover:underline">Finalizar</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {campanias.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No hay campañas registradas</p>
      )}
    </div>
  )
}
