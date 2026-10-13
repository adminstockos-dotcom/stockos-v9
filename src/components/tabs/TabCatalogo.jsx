import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const empresaNombre = empresa?.nombre || 'MAXIMA IMPORTADORES'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(' ')[0] || 'maxima'

  const [proveedores, setProveedores] = useState([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [listado, setListado] = useState([])
  const [maestroFotos, setMaestroFotos] = useState({})
  const [loadingListado, setLoadingListado] = useState(false)
  const [abiertos, setAbiertos] = useState({})
  const [seleccionados, setSeleccionados] = useState({})
  const [preciosVenta, setPreciosVenta] = useState({})
  const [incrementoCfg, setIncrementoCfg] = useState({})

  const urlCatalogoFallback = `https://stockos-v9.vercel.app/m/${slug}`

  useEffect(() => { cargar(); cargarListado() }, [empresaId])

  const cargar = async () => {
    try {
      const saved = localStorage.getItem(`stockos_proveedores_links_${empresaId}`)
      if (saved) setProveedores(JSON.parse(saved))
      const { data } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresaId)
      if (data?.length) setProveedores(data.map(p => ({ nombre: p.nombre_proveedor, web: p.url_web, email: p.email, whatsapp: p.grupo_whatsapp, tipo_archivo: p.tipo_archivo, activo: p.activo })))
      const savedPrecios = localStorage.getItem(`stockos_precios_venta_${empresaId}`)
      if(savedPrecios) setPreciosVenta(JSON.parse(savedPrecios))
    } catch {}
  }

  const cargarListado = async () => {
    try {
      setLoadingListado(true)
      const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(500)
      const mapFotos = {}
      if(maestro){ maestro.forEach(f=>{ if(!mapFotos[f.referencia]) mapFotos[f.referencia]=f }); setMaestroFotos(mapFotos) }
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo',{ascending:false}).limit(1000)
      if(!data || data.length < 10){
        if(maestro && maestro.length > 0){
          setListado(maestro.map(m => ({ referencia: m.referencia, talla: m.talla || 'M', precio: m.precio || m.precio_costo || 0, stock_proveedor: m.stock || m.stock_proveedor || 12, proveedor_nombre: 'MBR - MÁXIMA', imagen_sin_fondo: m.imagen_sin_fondo, imagen_original: m.imagen_original })))
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
      let j; try{ j = JSON.parse(text) }catch{ throw new Error(text.slice(0,200)) }
      if(!j.ok) throw new Error(j.error || 'Error en escaneo')
      alert(`OK ${j.guardados}/${j.total} copiados - ${j.proveedor}`)
      await cargarListado()
    }catch(e){ alert('Error: '+ e.message) } finally{ setLoadingListado(false) }
  }

  useEffect(()=>{ localStorage.setItem(`stockos_proveedores_links_${empresaId}`, JSON.stringify(proveedores)) },[proveedores, empresaId])
  useEffect(()=>{ localStorage.setItem(`stockos_precios_venta_${empresaId}`, JSON.stringify(preciosVenta)) },[preciosVenta, empresaId])

  const agregarProveedor = async () => {
    if(!nuevoProv.nombre.trim()) return alert('Nombre obligatorio')
    const nuevo={...nuevoProv, activo:true}
    setProveedores(prev=>[...prev,nuevo]); setNuevoProv({nombre:'',web:'',email:'',whatsapp:'',tipo_archivo:'PDF/Excel'})
    try{ await supabase.from('proveedores_config').upsert({empresa_id:empresaId,nombre_proveedor:nuevo.nombre,url_web:nuevo.web,email:nuevo.email,grupo_whatsapp:nuevo.whatsapp,tipo_archivo:nuevo.tipo_archivo,activo:true},{onConflict:'empresa_id,nombre_proveedor'}) }catch{}
  }
  const eliminar = async (nombre) => { if(!confirm(`¿Borrar ${nombre}?`))return; setProveedores(prev=>prev.filter(p=>p.nombre!==nombre)); try{ await supabase.from('proveedores_config').delete().eq('empresa_id',empresaId).eq('nombre_proveedor',nombre)}catch{} }
  const toggle = (nombre) => setAbiertos(prev=>({...prev,[nombre]:!prev[nombre]}))
  const getImg = (it) => it.imagen_sin_fondo || it.imagen_original || maestroFotos[it.referencia]?.imagen_sin_fondo || maestroFotos[it.referencia]?.imagen_original
  const getPrecioCosto = (it) => Number(it.precio || maestroFotos[it.referencia]?.precio || maestroFotos[it.referencia]?.precio_costo || 0)
  const getPrecioVenta = (it) => preciosVenta[it.referencia] ? Number(preciosVenta[it.referencia]) : getPrecioCosto(it)
  const getCfg = (provNombre) => incrementoCfg[provNombre] || { tipo: 'COP', valor: '' }
  const setCfg = (provNombre, patch) => setIncrementoCfg(prev=> ({...prev, [provNombre]: {...getCfg(provNombre), ...patch}}))
  const toggleSelectAll = (provNombre, visibleItems, checked) => { setSeleccionados(prev=>{ const next={...prev}; next[provNombre]= checked ? new Set(visibleItems.map(v=>v.referencia)) : new Set(); return next }) }
  const toggleSelectOne = (provNombre, ref, checked) => { setSeleccionados(prev=>{ const set=new Set(prev[provNombre]||[]); if(checked) set.add(ref); else set.delete(ref); return {...prev,[provNombre]:set} }) }
  const aplicarIncremento = (provNombre, visibleItems) => {
    const cfg=getCfg(provNombre); const val=Number(String(cfg.valor).replace(/[^0-9.-]/g,'')); 
    if(!val) return alert('Pon un valor');
    const seleccion=seleccionados[provNombre]; const refsToApply= seleccion && seleccion.size>0 ? Array.from(seleccion) : visibleItems.map(v=>v.referencia);
    if(refsToApply.length===0) return alert('Selecciona al menos 1');
    const nuevos={...preciosVenta};
    refsToApply.forEach(ref=>{ const item=visibleItems.find(v=>v.referencia===ref)||listado.find(l=>l.referencia===ref); const costo=getPrecioCosto(item||{referencia:ref}); let venta=costo; if(cfg.tipo==='COP') venta=costo+val; else if(cfg.tipo==='PORC') venta=Math.round(costo*(1+val/100)); else if(cfg.tipo==='FIJO') venta=val; nuevos[ref]=venta; });
    setPreciosVenta(nuevos); alert(`Precio venta actualizado a ${refsToApply.length} productos`);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div><h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - NOTIFICACIONES</h2><p className="text-sm text-gray-500">{empresaNombre} - {proveedores.length} prov - {listado.length} refs - Auto 8:30 AM y 2:30 PM {loadingListado&&'(cargando...)'}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogoFallback,'_blank')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-black text-xs">VER CATALOGO</button>
          <button onClick={escanearAhora} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-black text-xs">ESCANEAR AHORA - 170</button>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded font-black text-xs">ACTUALIZAR TODO</button>
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
          const itemsProv=listado.filter(l=> l.proveedor_nombre===p.nombre || p.nombre.includes('MBR') || p.nombre.includes('MAXIMA'))
          const count=itemsProv.length>0?itemsProv.length:(p.nombre.includes('MBR')||p.nombre.includes('MAXIMA')?listado.length:0)
          const visibleItems=itemsProv.length>0?itemsProv:(count===listado.length?listado:[])
          const abierto=abiertos[p.nombre]; const cfg=getCfg(p.nombre); const selSet=seleccionados[p.nombre]||new Set(); const allChecked=visibleItems.length>0 && selSet.size===visibleItems.length
          return(
            <div key={p.nombre} className="bg-white border-2 border-black rounded-lg overflow-hidden">
              <div onClick={()=>toggle(p.nombre)} className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2"><span className="font-black text-sm uppercase">{p.nombre}</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">ACTIVO</span><span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{count} refs</span>{selSet.size>0&&<span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">{selSet.size} sel</span>}</div>
                <div className="flex items-center gap-2"><span className="text-xl font-black">{abierto?'−':'+'}</span><button onClick={(e)=>{e.stopPropagation();eliminar(p.nombre)}} className="bg-red-600 text-white w-6 h-6 rounded-full text-xs font-black">X</button></div>
              </div>
              {abierto &&
                <div className="border-t bg-gray-50 p-3 space-y-3">
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-[11px] font-black uppercase mb-1">VENTANA PRECIO / VALOR - {p.nombre}</div>
                      <div className="text-[10px] text-gray-600">Selecciona todas / lote / unidad - tipo incremento - valor COP - Aplicar. Amarillo = precio venta publico Maxima en StockOS.</div>
                    </div>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div><label className="text-[10px] font-bold block">Tipo</label><select value={cfg.tipo} onChange={e=>setCfg(p.nombre,{tipo:e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option value="COP">$ COP fijo (costo + valor)</option><option value="PORC">% Porcentaje</option><option value="FIJO">Precio Fijo Publico</option></select></div>
                      <div><label className="text-[10px] font-bold block">Valor COP {cfg.tipo==='PORC'?'%':''}</label><input type="number" value={cfg.valor} onChange={e=>setCfg(p.nombre,{valor:e.target.value})} placeholder="Ej: 25000 o 40" className="border p-2 rounded text-xs font-black w-32"/></div>
                      <button onClick={()=>aplicarIncremento(p.nombre, visibleItems)} className="bg-black text-white px-4 py-2 rounded font-black text-xs h-[36px]">APLICAR A {selSet.size>0?selSet.size:'TODOS'}</button>
                      <button onClick={()=>setSeleccionados(prev=>({...prev,[p.nombre]:new Set()}))} className="bg-gray-200 text-black px-3 py-2 rounded font-bold text-xs h-[36px]">Limpiar</button>
                    </div>
                  </div>
                  <div className="bg-white border rounded overflow-hidden">
                    <div className="bg-black text-white p-2 flex justify-between"><span className="text-xs font-black flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleSelectAll(p.nombre, visibleItems, e.target.checked)} className="w-4 h-4"/>LISTADO MAESTRO - {p.nombre} - {selSet.size} / {count} sel</span><span className="text-xs">{count} prod</span></div>
                    {visibleItems.length===0?<div className="p-4 text-center text-xs text-gray-500">Sin datos - ESCANEAR AHORA</div>:
                    <div className="overflow-auto max-h-[600px]"><table className="w-full text-xs"><thead className="bg-gray-100 font-black sticky top-0"><tr><th className="p-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleSelectAll(p.nombre, visibleItems, e.target.checked)}/></th><th className="p-2 text-left">Foto</th><th className="p-2 text-left">Ref</th><th className="p-2 text-left">Talla</th><th className="p-2 text-left">Costo Prov.</th><th className="p-2 text-left bg-yellow-100">Venta Publica Maxima (COP)</th><th className="p-2 text-left">Stock</th></tr></thead><tbody>{visibleItems.map((it,i)=>{const img=getImg(it); const costo=getPrecioCosto(it); const venta=getPrecioVenta(it); const isSel=selSet.has(it.referencia); return(<tr key={i} className={`border-t ${isSel?'bg-orange-50':''}`}><td className="p-2 text-center"><input type="checkbox" checked={isSel} onChange={e=>toggleSelectOne(p.nombre, it.referencia, e.target.checked)}/></td><td className="p-1">{img?<img src={img} className="h-10 w-10 object-contain bg-white"/>:<span className="text-gray-400">—</span>}</td><td className="p-2 font-bold">{it.referencia}</td><td className="p-2">{it.talla}</td><td className="p-2">${Number(costo||0).toLocaleString('es-CO')}</td><td className="p-2 bg-yellow-50"><div className="flex items-center gap-1"><span className="font-black text-green-700">${Number(venta||0).toLocaleString('es-CO')}</span><input type="number" value={preciosVenta[it.referencia]||''} placeholder={String(venta)} onChange={e=>setPreciosVenta(prev=>({...prev,[it.referencia]:e.target.value}))} className="border rounded px-1 py-0.5 w-24 text-[11px]"/></div>{venta!==costo&&<div className="text-[9px] text-gray-500">+${(venta-costo).toLocaleString('es-CO')} ganancia</div>}</td><td className="p-2">{it.stock_proveedor}</td></tr>)})}</tbody></table></div>}
                  </div>
                </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
