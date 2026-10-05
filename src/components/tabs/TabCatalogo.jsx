import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const [proveedores, setProveedores] = useState([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [listado, setListado] = useState([])
  const [loadingListado, setLoadingListado] = useState(false)
  const [abiertos, setAbiertos] = useState({}) // proveedor_nombre => true/false

  const urlCatalogo = `https://stockos-v9.vercel.app/empresa/${empresaId}/catalogo`

  useEffect(() => { cargar(); cargarListado() }, [empresaId])

  const cargar = async () => {
    try {
      const saved = localStorage.getItem(`stockos_proveedores_links_${empresaId}`)
      if (saved) setProveedores(JSON.parse(saved))
      const { data } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresaId)
      if (data && data.length > 0) {
        setProveedores(data.map(p => ({
          nombre: p.nombre_proveedor, web: p.url_web, email: p.email, whatsapp: p.grupo_whatsapp, tipo_archivo: p.tipo_archivo, activo: p.activo
        })))
      }
    } catch {}
  }

  const cargarListado = async () => {
    try {
      setLoadingListado(true)
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo', { ascending: false }).limit(1000)
      if (data) setListado(data)
    } catch {} finally { setLoadingListado(false) }
  }

  useEffect(() => { localStorage.setItem(`stockos_proveedores_links_${empresaId}`, JSON.stringify(proveedores)) }, [proveedores, empresaId])

  const agregarProveedor = async () => {
    if (!nuevoProv.nombre.trim()) return alert('Nombre del proveedor obligatorio')
    const nuevo = {...nuevoProv, activo: true }
    setProveedores(prev => [...prev, nuevo])
    setNuevoProv({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
    try {
      await supabase.from('proveedores_config').upsert({
        empresa_id: empresaId, nombre_proveedor: nuevo.nombre, url_web: nuevo.web, email: nuevo.email, grupo_whatsapp: nuevo.whatsapp, tipo_archivo: nuevo.tipo_archivo, activo: true
      }, { onConflict: 'empresa_id,nombre_proveedor' })
    } catch (e) { console.log(e) }
  }

  const eliminar = async (nombre) => {
    if (!confirm(`¿Borrar enlace de ${nombre}?`)) return
    setProveedores(prev => prev.filter(p => p.nombre!== nombre))
    try { await supabase.from('proveedores_config').delete().eq('empresa_id', empresaId).eq('nombre_proveedor', nombre) } catch {}
  }

  const toggle = (nombre) => setAbiertos(prev => ({...prev, [nombre]:!prev[nombre]}))

  const copiar = (txt) => { navigator.clipboard.writeText(txt); alert('Copiado: ' + txt) }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - NOTIFICACIONES</h2>
          <p className="text-sm text-gray-500">{empresa?.nombre} - {proveedores.length} proveedores - Escaneo 8:30 AM y 2:30 PM</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black">POR EMPRESA</span>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded font-black text-xs">🔄 ACTUALIZAR TODO</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="text-sm font-black mb-3">CONFIGURAR ENLACE DE PROVEEDOR (se guarda por empresa)</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={nuevoProv.nombre} onChange={e=>setNuevoProv({...nuevoProv, nombre: e.target.value})} placeholder="Nombre Ej: MAXIMA" className="border p-2 rounded text-xs font-bold"/>
          <input value={nuevoProv.web} onChange={e=>setNuevoProv({...nuevoProv, web: e.target.value})} placeholder="Web" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.email} onChange={e=>setNuevoProv({...nuevoProv, email: e.target.value})} placeholder="Email PDF/Excel" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.whatsapp} onChange={e=>setNuevoProv({...nuevoProv, whatsapp: e.target.value})} placeholder="Grupo WhatsApp ID o link" className="border p-2 rounded text-xs"/>
          <select value={nuevoProv.tipo_archivo} onChange={e=>setNuevoProv({...nuevoProv, tipo_archivo: e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option>PDF/Excel</option><option>PDF</option><option>Excel</option><option>Imagen</option><option>Web</option></select>
        </div>
        <button onClick={agregarProveedor} className="mt-3 bg-black text-white px-6 py-2 rounded font-black text-xs w-full md:w-auto">+ GUARDAR ENLACE POR EMPRESA</button>
      </div>

      {/* PROVEEDORES DESPLEGABLES */}
      <div className="grid grid-cols-1 gap-3 w-full">
        {proveedores.map(p=>{
          const itemsProv = listado.filter(l => l.proveedor_nombre === p.nombre)
          const abierto = abiertos[p.nombre]
          return (
            <div key={p.nombre} className="bg-white border-2 border-black rounded-lg w-full overflow-hidden">
              <div onClick={()=>toggle(p.nombre)} className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase">{p.nombre}</span>
                    <span className={`text- font-black px-2 py-0.5 rounded-full ${p.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{p.activo?'ACTIVO':'INACTIVO'}</span>
                    <span className="text- bg-black text-white px-2 py-0.5 rounded-full">{itemsProv.length} refs en listado maestro</span>
                  </div>
                  <div className="text- mt-1 space-y-1">
                    {p.whatsapp && <div className="flex gap-2 w-full"><span className="shrink-0">📲 Grupo:</span><span className="break-all whitespace-normal flex-1">{p.whatsapp}</span></div>}
                    <div className="text- text-gray-500">Escaneo: 8:30 AM y 2:30 PM - Click para desplegar listado maestro</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-black">{abierto?'−':'+'}</span>
                  <button onClick={(e)=>{e.stopPropagation(); eliminar(p.nombre)}} className="bg-red-600 text-white w-6 h-6 rounded-full text-xs font-black">X</button>
                </div>
              </div>

              {abierto && (
                <div className="border-t bg-gray-50 p-3">
                  {p.web && <div className="text- mb-2">🌐 <a href={p.web} target="_blank" className="text-blue-600 underline break-all">{p.web}</a> | 📧 {p.email} [{p.tipo_archivo}]</div>}
                  <div className="bg-white border rounded overflow-hidden">
                    <div className="bg-black text-white p-2 flex justify-between">
                      <span className="text- font-black">LISTADO MAESTRO - {p.nombre} - {empresa?.nombre}</span>
                      <span className="text-">{itemsProv.length} productos</span>
                    </div>
                    {itemsProv.length===0? (
                      <div className="p-4 text-center text- text-gray-500">Aún no hay datos escaneados para {p.nombre}. Cuando el bot n8n escanee, aquí verás Ref / Talla / Precio / Stock.</div>
                    ) : (
                      <div className="overflow-auto max-h-">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 font-black sticky top-0"><tr><th className="p-2 text-left">Ref</th><th className="p-2 text-left">Talla</th><th className="p-2 text-left">Precio</th><th className="p-2 text-left">Stock Prov</th><th className="p-2 text-left">Fecha</th></tr></thead>
                          <tbody>{itemsProv.map((it,i)=><tr key={i} className="border-t"><td className="p-2 font-bold">{it.referencia}</td><td className="p-2">{it.talla}</td><td className="p-2">${Number(it.precio||0).toLocaleString()}</td><td className="p-2">{it.stock_proveedor}</td><td className="p-2 text- text-gray-500">{it.fecha_escaneo? new Date(it.fecha_escaneo).toLocaleDateString():''}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CATALOGO VIRTUAL EN VIVO GLOBAL */}
      <div className="bg-white border-2 border-green-600 rounded-lg w-full overflow-hidden">
        <div className="bg-green-600 text-white p-3 flex justify-between items-center flex-wrap gap-2">
          <div className="font-black text-sm">CATÁLOGO VIRTUAL EN VIVO - TODOS LOS PROVEEDORES - {listado.length} REFS TOTAL</div>
          <div className="flex gap-2">
            <button onClick={()=>copiar(urlCatalogo)} className="bg-white text-green-700 px-3 py-1 rounded text- font-black">📋 COPIAR LINK</button>
            <button onClick={()=>window.open(urlCatalogo,'_blank')} className="bg-black text-white px-3 py-1 rounded text- font-black">👁️ VER CATÁLOGO</button>
          </div>
        </div>
        <div className="p-3">
          <div className="bg-gray-50 border rounded p-2 mb-3">
            <div className="text- font-black">LINK PARA GRUPOS CONFIRMACIÓN / COMUNIDADES MÁXIMA / WHATSAPP CAARLOS / REDES</div>
            <div className="text- text-blue-600 break-all">{urlCatalogo}</div>
            <div className="text- text-gray-500 mt-1">n8n Webhook: /webhook/stockos/catalogo/{empresaId} → Disparo + Link + Despachos CRM Pagos</div>
          </div>
          {listado.length===0? <p className="text- text-gray-500 text-center py-3">Catálogo vacío hasta que caigan los escaneos de todos los proveedores configurados.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {listado.slice(0,12).map((it,i)=>(
                <div key={i} className="border rounded p-2"><div className="bg-gray-100 h-16 rounded mb-1 flex items-center justify-center text-">IMG</div><div className="text- font-black truncate">{it.referencia}</div><div className="text-">{it.proveedor_nombre} - T:{it.talla}</div><div className="text- font-bold">${Number(it.precio||0).toLocaleString()}</div></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
