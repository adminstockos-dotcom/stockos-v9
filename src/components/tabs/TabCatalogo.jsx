import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const empresaNombre = empresa?.nombre || 'MAXIMA IMPORTADORES'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/\u0300-\u036f/g,"").split(' ')[0] || 'maxima'

  const [proveedores, setProveedores] = useState([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [listado, setListado] = useState([])
  const [maestroFotos, setMaestroFotos] = useState({})
  const [loadingListado, setLoadingListado] = useState(false)
  const [abiertos, setAbiertos] = useState({})

  const urlCatalogoCorto = `https://${slug}.stockos.vercel.app`
  const urlCatalogoFallback = `https://stockos-v9.vercel.app/m/${slug}`

  useEffect(() => { cargar(); cargarListado() }, [empresaId])

  const cargar = async () => {
    try {
      const saved = localStorage.getItem(`stockos_proveedores_links_${empresaId}`)
      if (saved) setProveedores(JSON.parse(saved))
      const { data } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresaId)
      if (data?.length) setProveedores(data.map(p => ({ nombre: p.nombre_proveedor, web: p.url_web, email: p.email, whatsapp: p.grupo_whatsapp, tipo_archivo: p.tipo_archivo, activo: p.activo })))
    } catch {}
  }

  const cargarListado = async () => {
    try {
      setLoadingListado(true)
      const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(500)
      const mapFotos = {}
      if(maestro){
        maestro.forEach(f=>{ if(!mapFotos[f.referencia]) mapFotos[f.referencia]=f })
        setMaestroFotos(mapFotos)
      }
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo',{ascending:false}).limit(1000)
      if(!data || data.length < 10){
        if(maestro && maestro.length > 0){
          const base = maestro.map(m => ({
            referencia: m.referencia,
            talla: m.talla || 'M',
            precio: m.precio,
            stock_proveedor: m.stock || m.stock_proveedor || 12,
            proveedor_nombre: 'MBR - MÁXIMA',
            imagen_sin_fondo: m.imagen_sin_fondo,
            imagen_original: m.imagen_original
          }))
          setListado(base)
          return
        }
      }
      if(data) setListado(data)
    } catch(e){ console.error(e) } finally{ setLoadingListado(false) }
  }

  const escanearAhora = async () => {
    if(!confirm('¿Copiar los 170 productos MBR con foto a esta empresa?')) return
    try{
      setLoadingListado(true)
      const baseUrl = window.location.origin
      const r = await fetch(`${baseUrl}/api/scan-mbr?empresa_id=${empresaId}&t=${Date.now()}`, { cache: 'no-store' })
      const text = await r.text()
      let j
      try{ j = JSON.parse(text) }catch{ throw new Error(text.slice(0,200)) }
      if(!j.ok) throw new Error(j.error || 'Error en escaneo')
      alert(`OK ${j.guardados}/${j.total} copiados - ${j.proveedor}`)
      await cargarListado()
    }catch(e){ alert('Error: '+ e.message) } finally{ setLoadingListado(false) }
  }

  useEffect(()=>{ localStorage.setItem(`stockos_proveedores_links_${empresaId}`, JSON.stringify(proveedores)) },[proveedores, empresaId])

  const agregarProveedor = async () => {
    if(!nuevoProv.nombre.trim()) return alert('Nombre obligatorio')
    const nuevo={...nuevoProv, activo:true}
    setProveedores(prev=>[...prev,nuevo]); setNuevoProv({nombre:'',web:'',email:'',whatsapp:'',tipo_archivo:'PDF/Excel'})
    try{ await supabase.from('proveedores_config').upsert({empresa_id:empresaId,nombre_proveedor:nuevo.nombre,url_web:nuevo.web,email:nuevo.email,grupo_whatsapp:nuevo.whatsapp,tipo_archivo:nuevo.tipo_archivo,activo:true},{onConflict:'empresa_id,nombre_proveedor'}) }catch{}
  }
  const eliminar = async (nombre) => { if(!confirm(`¿Borrar ${nombre}?`))return; setProveedores(prev=>prev.filter(p=>p.nombre!==nombre)); try{ await supabase.from('proveedores_config').delete().eq('empresa_id',empresaId).eq('nombre_proveedor',nombre)}catch{} }
  const toggle = (nombre) => setAbiertos(prev=>({...prev,[nombre]:!prev[nombre]}))
  const getImg = (it) => {
    return it.imagen_sin_fondo || it.imagen_original || maestroFotos[it.referencia]?.imagen_sin_fondo || maestroFotos[it.referencia]?.imagen_original
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div><h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - NOTIFICACIONES</h2><p className="text-sm text-gray-500">{empresaNombre} - {proveedores.length} proveedores - {listado.length} refs - Auto 8:30 AM y 2:30 PM {loadingListado&&'(cargando...)'}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogoFallback,'_blank')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-black text-xs">👁 VER CATÁLOGO</button>
          <button onClick={escanearAhora} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-black text-xs">⚡ ESCANEAR AHORA - 170</button>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded font-black text-xs">🔄 ACTUALIZAR TODO</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="text-sm font-black mb-3">CONFIGURAR ENLACE DE PROVEEDOR</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={nuevoProv.nombre} onChange={e=>setNuevoProv({...nuevoProv,nombre:e.target.value})} placeholder="Nombre Ej: MAXIMA" className="border p-2 rounded text-xs font-bold"/>
          <input value={nuevoProv.web} onChange={e=>setNuevoProv({...nuevoProv,web:e.target.value})} placeholder="Web" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.email} onChange={e=>setNuevoProv({...nuevoProv,email:e.target.value})} placeholder="Email" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.whatsapp} onChange={e=>setNuevoProv({...nuevoProv,whatsapp:e.target.value})} placeholder="ID Grupo WhatsApp" className="border p-2 rounded text-xs"/>
          <select value={nuevoProv.tipo_archivo} onChange={e=>setNuevoProv({...nuevoProv,tipo_archivo:e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option>PDF/Excel</option><option>PDF</option><option>Excel</option><option>Imagen</option><option>Web</option></select>
        </div>
        <button onClick={agregarProveedor} className="mt-3 bg-black text-white px-6 py-2 rounded font-black text-xs">+ GUARDAR ENLACE</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {proveedores.map(p=>{
          const itemsProv = listado.filter(l=> l.proveedor_nombre===p.nombre || p.nombre.includes('MBR') || p.nombre.includes('MAXIMA'))
          const count = itemsProv.length > 0? itemsProv.length : (p.nombre.includes('MBR') || p.nombre.includes('MAXIMA')? listado.length : 0)
          const visibleItems = itemsProv.length > 0? itemsProv : (count===listado.length? listado : [])
          const abierto=abiertos[p.nombre]
          return(
            <div key={p.nombre} className="bg-white border-2 border-black rounded-lg overflow-hidden">
              <div onClick={()=>toggle(p.nombre)} className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2"><span className="font-black text-sm uppercase">{p.nombre}</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">ACTIVO</span><span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{count} refs</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-black">{abierto?'−':'+'}</span><button onClick={(e)=>{e.stopPropagation();eliminar(p.nombre)}} className="bg-red-600 text-white w-6 h-6 rounded-full text-xs font-black">X</button></div>
              </div>
              {abierto && <div className="border-t bg-gray-50 p-3"><div className="bg-white border rounded overflow-hidden"><div className="bg-black text-white p-2 flex justify-between"><span className="text-xs font-black">LISTADO MAESTRO - {p.nombre}</span><span className="text-xs">{count} productos</span></div>{visibleItems.length===0? <div className="p-4 text-center text-xs text-gray-500">Aún no hay datos. Click en ⚡ ESCANEAR AHORA</div>:<div className="overflow-auto max-h-96"><table className="w-full text-xs"><thead className="bg-gray-100 font-black sticky top-0"><tr><th className="p-2 text-left">Foto</th><th className="p-2 text-left">Ref</th><th className="p-2 text-left">Talla</th><th className="p-2 text-left">Precio</th><th className="p-2 text-left">Stock</th></tr></thead><tbody>{visibleItems.map((it,i)=>{
                const img = getImg(it)
                return <tr key={i} className="border-t"><td className="p-1">{img? <img src={img} className="h-10 w-10 object-contain bg-white"/> : <span className="text-gray-400">—</span>}</td><td className="p-2 font-bold">{it.referencia}</td><td className="p-2">{it.talla}</td><td className="p-2">${Number(it.precio||0).toLocaleString()}</td><td className="p-2">{it.stock_proveedor}</td></tr>
              })}</tbody></table></div>}</div></div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
