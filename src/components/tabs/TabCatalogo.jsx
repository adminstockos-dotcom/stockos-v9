import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const empresaId = String(empresa?.id || window.location.pathname.split('/')[2] || '9')
  const empresaNombre = empresa?.nombre || 'MAXIMA IMPORTADORES'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(' ')[0] || 'maxima'

  const [proveedores, setProveedores] = useState([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [listado, setListado] = useState([])
  const [maestroFotos, setMaestroFotos] = useState({})
  const [loadingListado, setLoadingListado] = useState(false)
  const [abiertos, setAbiertos] = useState({})
  const [seleccionados, setSeleccionados] = useState({})
  const [incrementos, setIncrementos] = useState({}) // { referencia: valorCOP }
  const [preciosVenta, setPreciosVenta] = useState({}) // override final si quieres
  const [cfg, setCfg] = useState({}) // cfg batch por proveedor

  const urlCatalogo = `https://stockos-v9.vercel.app/m/${slug}`

  useEffect(() => { cargar(); cargarListado() }, [empresaId])

  const cargar = async () => {
    try {
      const saved = localStorage.getItem(`stockos_proveedores_links_${empresaId}`)
      if (saved) setProveedores(JSON.parse(saved))
      const { data } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresaId)
      if (data?.length) setProveedores(data.map(p => ({ nombre: p.nombre_proveedor, web: p.url_web, email: p.email, whatsapp: p.grupo_whatsapp, tipo_archivo: p.tipo_archivo, activo: p.activo })))
      const savedInc = localStorage.getItem(`stockos_incrementos_${empresaId}`)
      if(savedInc) setIncrementos(JSON.parse(savedInc))
      const savedPV = localStorage.getItem(`stockos_precios_venta_${empresaId}`)
      if(savedPV) setPreciosVenta(JSON.parse(savedPV))
    } catch {}
  }

  const cargarListado = async () => {
    try {
      setLoadingListado(true)
      const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(800)
      const mapFotos = {}
      if(maestro){ maestro.forEach(f=>{ if(!mapFotos[f.referencia]) mapFotos[f.referencia]=f }); setMaestroFotos(mapFotos) }
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo',{ascending:false}).limit(1500)
      if(!data || data.length < 5){
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
      const r = await fetch(`${window.location.origin}/api/scan-mbr?empresa_id=${empresaId}&t=${Date.now()}`, { cache: 'no-store' })
      const text = await r.text()
      let j; try{ j = JSON.parse(text) }catch{ throw new Error(text.slice(0,200)) }
      if(!j.ok) throw new Error(j.error || 'Error en escaneo')
      alert(`OK ${j.guardados}/${j.total} - ${j.proveedor}`)
      await cargarListado()
    }catch(e){ alert('Error: '+ e.message) } finally{ setLoadingListado(false) }
  }

  useEffect(()=>{ localStorage.setItem(`stockos_proveedores_links_${empresaId}`, JSON.stringify(proveedores)) },[proveedores, empresaId])
  useEffect(()=>{ localStorage.setItem(`stockos_incrementos_${empresaId}`, JSON.stringify(incrementos)) },[incrementos, empresaId])
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
  const getCosto = (it) => Number(it.precio || maestroFotos[it.referencia]?.precio || maestroFotos[it.referencia]?.precio_costo || 0)
  const getIncremento = (ref) => Number(incrementos[ref] || 0)
  const getVentaPublica = (it) => {
    if(preciosVenta[it.referencia]) return Number(preciosVenta[it.referencia])
    return getCosto(it) + getIncremento(it.referencia)
  }

  const getCfgProv = (prov) => cfg[prov] || { tipo:'COP', valor:'' }
  const setCfgProv = (prov, patch) => setCfg(prev=> ({...prev, [prov]: {...getCfgProv(prov), ...patch}}))

  const toggleAll = (prov, visible, checked) => { setSeleccionados(s=>{ const n={...s}; n[prov]= checked ? new Set(visible.map(v=>v.referencia)) : new Set(); return n }) }
  const toggleOne = (prov, ref, checked) => { setSeleccionados(s=>{ const set=new Set(s[prov]||[]); if(checked) set.add(ref); else set.delete(ref); return {...s,[prov]:set} }) }

  const aplicarLote = (prov, visible) => {
    const c=getCfgProv(prov); const val=Number(String(c.valor).replace(/[^0-9.-]/g,''))
    if(!val && c.tipo!=='FIJO') return alert('Pon un valor en COP o %')
    const sel=seleccionados[prov]
    const refs = sel && sel.size>0 ? Array.from(sel) : visible.map(v=>v.referencia)
    if(!refs.length) return alert('Nada seleccionado')

    const newInc={...incrementos}
    const newPV={...preciosVenta}
    refs.forEach(ref=>{
      const item=visible.find(v=>v.referencia===ref)||listado.find(l=>l.referencia===ref)
      const costo=getCosto(item||{referencia:ref})
      let venta=costo
      if(c.tipo==='COP') { newInc[ref]=val; venta=costo+val }
      else if(c.tipo==='PORC') { const inc=Math.round(costo*val/100); newInc[ref]=inc; venta=costo+inc }
      else if(c.tipo==='FIJO') { newInc[ref]=val-costo; venta=val }
      newPV[ref]=venta
    })
    setIncrementos(newInc)
    setPreciosVenta(newPV)
    // Guardar en maestro como precio_venta para que el catalogo de Maxima se alimente solo del precio publico
    try{
      refs.forEach(r=>{
        const finalPrice=newPV[r]
        supabase.from('productos_maestro').update({ precio_venta: finalPrice, precio_publico: finalPrice }).eq('referencia', r).then(()=>{})
        supabase.from('listado_maestro_proveedor').update({ precio_venta: finalPrice }).eq('empresa_id', empresaId).eq('referencia', r).then(()=>{})
      })
    }catch{}
    alert(`Listo: ${refs.length} productos con precio venta público actualizado. Ya alimenta al catálogo de Máxima.`)
  }

  const onChangeIncrementoIndividual = (ref, valorStr) => {
    const val=Number(valorStr||0)
    const newInc={...incrementos, [ref]: val}
    setIncrementos(newInc)
    // recalcular venta
    const item=listado.find(l=>l.referencia===ref)
    const costo=getCosto(item||{referencia:ref})
    const venta=costo+val
    const newPV={...preciosVenta, [ref]: venta}
    setPreciosVenta(newPV)
    try{
      supabase.from('productos_maestro').update({ precio_venta: venta, precio_publico: venta }).eq('referencia', ref).then(()=>{})
    }catch{}
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div><h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - LISTADO MAESTRO</h2><p className="text-sm text-gray-500">{empresaNombre} - {proveedores.length} prov - {listado.length} refs - Scan 8:30 y 14:30 {loadingListado&&'(cargando...)'}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogo,'_blank')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-black text-xs">👁 VER CATÁLOGO MÁXIMA (PUBLICO)</button>
          <button onClick={escanearAhora} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-black text-xs">⚡ ESCANEAR AHORA</button>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded font-black text-xs">🔄 ACTUALIZAR</button>
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
          const visible=itemsProv.length>0?itemsProv:(count===listado.length?listado:[])
          const abierto=abiertos[p.nombre]
          const c=getCfgProv(p.nombre)
          const sel=seleccionados[p.nombre]||new Set()
          const allChecked=visible.length>0 && sel.size===visible.length
          return(
            <div key={p.nombre} className="bg-white border-2 border-black rounded-lg overflow-hidden">
              <div onClick={()=>toggle(p.nombre)} className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2"><span className="font-black text-sm uppercase">{p.nombre}</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">ACTIVO</span><span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{count} refs</span>{sel.size>0&&<span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">{sel.size} sel</span>}</div>
                <div className="flex items-center gap-2"><span className="text-xl font-black">{abierto?'−':'+'}</span><button onClick={(e)=>{e.stopPropagation();eliminar(p.nombre)}} className="bg-red-600 text-white w-6 h-6 rounded-full text-xs font-black">X</button></div>
              </div>
              {abierto &&
                <div className="border-t bg-gray-50 p-3 space-y-3">
                  {/* VENTANA LOTE */}
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2 items-end justify-between">
                      <div>
                        <div className="text-[11px] font-black uppercase">VENTANA VALOR / INCREMENTO - {p.nombre}</div>
                        <div className="text-[10px] text-gray-600 mt-1">En la tabla de abajo, cada producto tiene: Precio Proveedor | <b>+ Incremento COP</b> (al lado) | = Precio Venta Público. Para lotes usa esto:</div>
                      </div>
                      <div className="flex gap-2 items-end flex-wrap">
                        <div><label className="text-[10px] font-bold block">Tipo lote</label><select value={c.tipo} onChange={e=>setCfgProv(p.nombre,{tipo:e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option value="COP">$ COP a sumar</option><option value="PORC">% a sumar</option><option value="FIJO">Precio fijo público</option></select></div>
                        <div><label className="text-[10px] font-bold block">Valor COP {c.tipo==='PORC'?'%':''}</label><input type="number" value={c.valor} onChange={e=>setCfgProv(p.nombre,{valor:e.target.value})} placeholder="Ej: 25000" className="border p-2 rounded text-xs font-black w-32"/></div>
                        <button onClick={()=>aplicarLote(p.nombre, visible)} className="bg-black text-white px-4 py-2 rounded font-black text-xs h-[36px]">APLICAR A {sel.size>0?sel.size:'TODOS'} → PUBLICO</button>
                        <button onClick={()=>setSeleccionados(s=>({...s,[p.nombre]:new Set()}))} className="bg-gray-200 text-black px-3 py-2 rounded font-bold text-xs h-[36px]">Limpiar sel</button>
                      </div>
                    </div>
                    <div className="text-[10px] mt-2 text-gray-700 bg-white border p-2 rounded">El catálogo virtual de <b>Máxima Importadores</b> se alimenta SOLO del <b>Precio Venta Público</b> (columna verde), no del costo del proveedor.</div>
                  </div>

                  <div className="bg-white border rounded overflow-hidden">
                    <div className="bg-black text-white p-2 flex justify-between"><span className="text-xs font-black flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, visible, e.target.checked)} className="w-4 h-4"/>LISTADO MAESTRO - {p.nombre} - {sel.size}/{count} sel</span><span className="text-xs">Catálogo Máxima usa solo Precio Público</span></div>
                    {visible.length===0?<div className="p-4 text-center text-xs text-gray-500">Sin datos - ESCANEAR AHORA</div>:
                    <div className="overflow-auto max-h-[700px]">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 font-black sticky top-0 z-10">
                          <tr>
                            <th className="p-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, visible, e.target.checked)}/></th>
                            <th className="p-2 text-left">Foto</th>
                            <th className="p-2 text-left">Referencia</th>
                            <th className="p-2 text-left">Talla</th>
                            <th className="p-2 text-left">Precio Proveedor</th>
                            <th className="p-2 text-left bg-orange-100">+ Incremento (COP) AL LADO</th>
                            <th className="p-2 text-left bg-green-100">Precio Venta Público Máxima</th>
                            <th className="p-2 text-left">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((it,i)=>{
                            const img=getImg(it)
                            const costo=getCosto(it)
                            const inc=getIncremento(it.referencia)
                            const venta=getVentaPublica(it)
                            const isSel=sel.has(it.referencia)
                            return(
                              <tr key={i} className={`border-t ${isSel?'bg-orange-50':''}`}>
                                <td className="p-2 text-center"><input type="checkbox" checked={isSel} onChange={e=>toggleOne(p.nombre, it.referencia, e.target.checked)}/></td>
                                <td className="p-1">{img?<img src={img} className="h-10 w-10 object-contain bg-white"/>:<span className="text-gray-400">—</span>}</td>
                                <td className="p-2 font-bold">{it.referencia}</td>
                                <td className="p-2">{it.talla}</td>
                                <td className="p-2">${costo.toLocaleString('es-CO')}</td>
                                <td className="p-2 bg-orange-50">
                                  <input type="number" value={incrementos[it.referencia]!==undefined? incrementos[it.referencia] : ''} onChange={e=>onChangeIncrementoIndividual(it.referencia, e.target.value)} placeholder="0" className="border-2 border-orange-300 rounded px-2 py-1 w-28 text-xs font-black bg-white"/>
                                  <div className="text-[9px] text-gray-500 mt-0.5">COP a sumar</div>
                                </td>
                                <td className="p-2 bg-green-50">
                                  <div className="font-black text-green-700 text-sm">${venta.toLocaleString('es-CO')}</div>
                                  <div className="text-[9px] text-gray-600">{costo.toLocaleString('es-CO')} + {inc.toLocaleString('es-CO')} = público</div>
                                </td>
                                <td className="p-2">{it.stock_proveedor}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>}
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

