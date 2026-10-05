import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const [proveedores, setProveedores] = useState([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargar()
  }, [empresaId])

  const cargar = async () => {
    try {
      const saved = localStorage.getItem(`stockos_proveedores_links_${empresaId}`)
      if (saved) setProveedores(JSON.parse(saved))

      const { data } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresaId)
      if (data && data.length > 0) {
        setProveedores(data.map(p => ({
          nombre: p.nombre_proveedor,
          web: p.url_web,
          email: p.email,
          whatsapp: p.grupo_whatsapp,
          tipo_archivo: p.tipo_archivo,
          activo: p.activo
        })))
      }
    } catch {}
  }

  useEffect(() => {
    localStorage.setItem(`stockos_proveedores_links_${empresaId}`, JSON.stringify(proveedores))
  }, [proveedores, empresaId])

  const agregarProveedor = async () => {
    if (!nuevoProv.nombre.trim()) return alert('Nombre del proveedor obligatorio')
    const nuevo = { ...nuevoProv, activo: true }
    setProveedores(prev => [...prev, nuevo])
    setNuevoProv({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })

    try {
      await supabase.from('proveedores_config').upsert({
        empresa_id: empresaId,
        nombre_proveedor: nuevo.nombre,
        url_web: nuevo.web,
        email: nuevo.email,
        grupo_whatsapp: nuevo.whatsapp,
        tipo_archivo: nuevo.tipo_archivo,
        activo: true
      }, { onConflict: 'empresa_id,nombre_proveedor' })
    } catch (e) { console.log('Supabase prov error (no bloquea):', e) }
  }

  const eliminar = async (nombre) => {
    if (!confirm(`¿Borrar enlace de ${nombre}?`)) return
    setProveedores(prev => prev.filter(p => p.nombre !== nombre))
    try { await supabase.from('proveedores_config').delete().eq('empresa_id', empresaId).eq('nombre_proveedor', nombre) } catch {}
  }

  const ejecutarEscaneoAhora = () => {
    alert(`🔍 ESCANEO MANUAL - ${empresa?.nombre}\n\nSe escanearán ${proveedores.length} proveedores:\n${proveedores.map(p=>`- ${p.nombre} (${p.web || p.email})`).join('\n')}\n\nEsto generará el listado maestro por proveedor.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - NOTIFICACIONES</h2>
          <p className="text-sm text-gray-500">{empresa?.nombre} - {proveedores.length} proveedores configurados - Escaneo automático 8:30 AM y 2:30 PM</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black">POR EMPRESA</span>
          <button onClick={ejecutarEscaneoAhora} className="bg-black text-white px-4 py-2 rounded font-black text-xs">🔍 ESCANEAR AHORA</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="text-sm font-black mb-3">CONFIGURAR ENLACE DE PROVEEDOR (se guarda por empresa)</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={nuevoProv.nombre} onChange={e=>setNuevoProv({...nuevoProv, nombre: e.target.value})} placeholder="Nombre proveedor Ej: MAXIMA" className="border p-2 rounded text-xs font-bold"/>
          <input value={nuevoProv.web} onChange={e=>setNuevoProv({...nuevoProv, web: e.target.value})} placeholder="Web Ej: https://proveedor.com/stock" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.email} onChange={e=>setNuevoProv({...nuevoProv, email: e.target.value})} placeholder="Email PDF/Excel Ej: stock@prov.com" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.whatsapp} onChange={e=>setNuevoProv({...nuevoProv, whatsapp: e.target.value})} placeholder="Grupo WhatsApp ID o link" className="border p-2 rounded text-xs"/>
          <select value={nuevoProv.tipo_archivo} onChange={e=>setNuevoProv({...nuevoProv, tipo_archivo: e.target.value})} className="border p-2 rounded text-xs font-bold bg-white">
            <option>PDF/Excel</option>
            <option>PDF</option>
            <option>Excel</option>
            <option>Imagen</option>
            <option>Web</option>
          </select>
        </div>
        <button onClick={agregarProveedor} className="mt-3 bg-black text-white px-6 py-2 rounded font-black text-xs w-full md:w-auto">+ GUARDAR ENLACE POR EMPRESA</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {proveedores.map(p=>(
          <div key={p.nombre} className="bg-white border-2 border-black rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div className="font-black text-sm uppercase">{p.nombre}</div>
              <button onClick={()=>eliminar(p.nombre)} className="bg-red-600 text-white w-5 h-5 rounded-full text-xs font-black">X</button>
            </div>
            <div className="text-xs space-y-1">
              {p.web && <div>🌐 <a href={p.web} target="_blank" className="text-blue-600 underline truncate">{p.web}</a></div>}
              {p.email && <div>📧 {p.email} [{p.tipo_archivo}]</div>}
              {p.whatsapp && <div>📲 Grupo: {p.whatsapp}</div>}
              <div className="text-[10px] text-gray-500 mt-2">Escaneo: 8:30 AM y 2:30 PM - Listado maestro por proveedor</div>
            </div>
            <div className={`text-[10px] font-black px-2 py-1 rounded-full w-fit ${p.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{p.activo?'ACTIVO':'INACTIVO'}</div>
          </div>
        ))}
      </div>

      {proveedores.length===0 && (
        <div className="bg-white border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No hay proveedores configurados para {empresa?.nombre}. Agrega arriba el enlace web, email o grupo WhatsApp por donde te envían el listado.</p>
          <p className="text-xs text-gray-400 mt-2">Ejemplo: Proveedor MAXIMA - Web: maxima.com/stock - Email: pedidos@maxima.com (Excel) - WhatsApp: Grupo Difusión MAXIMA</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
        <strong>Funcionamiento:</strong> Aquí configuras los enlaces de los proveedores por empresa. STOCKOS a diario 8:30 AM y 2:30 PM hace el escaneo automático de esos enlaces (web, email PDF/Excel, WhatsApp) y saca el listado maestro por proveedor para comparar con tu stock de Bodega Stock + Pistola.
      </div>
    </div>
  )
}
