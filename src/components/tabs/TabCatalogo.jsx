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
  const [incrementos, setIncrementos] = useState({})
  const [preciosVenta, setPreciosVenta] = useState({})
  const [cfg, setCfg] = useState({})
  const [scanProgress, setScanProgress] = useState('')

  const urlCatalogo = `https://stockos-v9.vercel.app/m/${slug}`

  useEffect(() => { cargar(); cargarListado() }, [empresaId])

  const cargar = async () => {
    try {
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
      if(maestro){ maestro.forEach(f=>{ if(f.referencia && !mapFotos[f.referencia]) mapFotos[f.referencia]=f }); setMaestroFotos(mapFotos) }
      const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('fecha_escaneo',{ascending:false}).limit(1500)
      if(data) setListado(data)
      else if(maestro) setListado(maestro.map(m => ({ referencia: m.referencia, talla: m.talla || 'M', precio: m.precio || 0, stock_proveedor: m.stock || 10, proveedor_nombre: 'MBR - MÁXIMA', imagen_original: m.imagen_original })))
    } catch(e){ console.error(e) } finally{ setLoadingListado(false) }
  }

  const escanearAhora = async () => {
    if(!confirm('Traer TODOS los productos con foto, ref, talla, precio y stock? Replica 3 rayitas -> Lista productos -> Buscar producto por cada uno, sin borrar nada.')) return
    try{
      setLoadingListado(true)
      setScanProgress('Iniciando...')
      let offset=0
      let totalGuardados=0
      let total=0
      let hasMore=true
      while(hasMore){
        setScanProgress(`Escaneando ${offset}...`)
        const r = await fetch(`${window.location.origin}/api/scan-mbr?empresa_id=${empresaId}&offset=${offset}&limit=20&t=${Date.now()}`, { cache: 'no-store' })
        const text = await r.text()
        let j; try{ j = JSON.parse(text) }catch{ throw new Error(text.slice(0,300)) }
        if(!j.ok) throw new Error(j.error || 'Error en escaneo')
        totalGuardados+=j.guardados||0
        total=j.total||total
        hasMore=j.hasMore
        if(hasMore){ offset=j.nextOffset||offset+20; await new Promise(res=>setTimeout(res, 600)) } else break
      }
      setScanProgress('')
      alert(`OK ${totalGuardados}/${total} productos con precio, foto, talla y stock - sin borrar - MBR`)
      await cargarListado()
    }catch(e){ alert('Error: '+ e.message); setScanProgress('') } finally{ setLoadingListado(false) }
  }

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
  const buscarMaestro = (refCompleta) => { if(!refCompleta) return null; if(maestroFotos[refCompleta]) return maestroFotos[refCompleta]; return null }
  const getImg = (it) => it.imagen_sin_fondo || it.imagen_original || buscarMaestro(it.referencia)?.imagen_sin_fondo || buscarMaestro(it.referencia)?.imagen_original
  const getCosto = (it) => { const m=buscarMaestro(it.referencia); const raw=it.precio||m?.precio||0; return Number(raw||0) }
  const getIncremento = (ref) => Number(incrementos[ref]||0)
  const getVentaPublica = (it) => { if(preciosVenta[it.referencia]) return Number(preciosVenta[it.referencia]); return getCosto(it)+getIncremento(it.referencia) }
  const getCfgProv = (prov) => cfg[prov] || { tipo:'COP', valor:'' }
  const setCfgProv = (prov, patch) => setCfg(prev=> ({...prev, [prov]: {...getCfgProv(prov), ...patch}}))
  const toggleAll = (prov, visible, checked) => { setSeleccionados(s=>{ const n={...s}; n[prov]= checked ? new Set(visible.map(v=>v.referencia)) : new Set(); return n }) }
  const toggleOne = (prov, ref, checked) => { setSeleccionados(s=>{ const set=new Set(s[prov]||[]); if(checked) set.add(ref); else set.delete(ref); return {...s,[prov]:set} }) }
  const aplicarLote = (prov, visible) => {
    const c=getCfgProv(prov); const val=Number(String(c.valor).replace(/[^0-9.-]/g,''))
    if(!val && c.tipo!=='FIJO') return alert('Pon un valor')
    const sel=seleccionados[prov]; const refs = sel && sel.size>0 ? Array.from(sel) : visible.map(v=>v.referencia)
    if(!refs.length) return alert('Nada seleccionado')
    const newInc={...incrementos}; const newPV={...preciosVenta}
    refs.forEach(ref=>{ const item=visible.find(v=>v.referencia===ref); const costo=getCosto(item||{referencia:ref}); let venta=costo; if(c.tipo==='COP') { newInc[ref]=val; venta=costo+val } else if(c.tipo==='PORC') { const inc=Math.round(costo*val/100); newInc[ref]=inc; venta=costo+inc } else if(c.tipo==='FIJO') { newInc[ref]=val-costo; venta=val } newPV[ref]=venta })
    setIncrementos(newInc); setPreciosVenta(newPV)
  }
  const onChangeIncrementoIndividual = (ref, valorStr) => {
    const val=Number(valorStr||0); const newInc={...incrementos, [ref]: val}; setIncrementos(newInc)
    const item=listado.find(l=>l.referencia===ref); const costo=getCosto(item||{referencia:ref}); const venta=costo+val
    const newPV={...preciosVenta, [ref]: venta}; setPreciosVenta(newPV)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div><h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - LISTADO MAESTRO</h2><p className="text-sm text-gray-500">{empresaNombre} - {proveedores.length} prov - {listado.length} refs - Scan 8:30 y 14:30 {scanProgress&&` - ${scanProgress}`} {loadingListado&&'(cargando...)'}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogo,'_blank')} className="bg-green-600 text-white px-3 py-2 rounded font-black text-xs">VER CATALOGO</button>
          <button onClick={escanearAhora} className="bg-orange-500 text-white px-4 py-2 rounded font-black text-xs">ESCANEAR AHORA {scanProgress?`(${scanProgress})`:''}</button>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded font-black text-xs">ACTUALIZAR</button>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow border">
        <div className="text-sm font-black mb-3">CONFIGURAR ENLACE DE PROVEEDOR</div>
        <div className="grid grid-cols-5 gap-2">
          <input value={nuevoProv.nombre} onChange={e=>setNuevoProv({...nuevoProv,nombre:e.target.value})} placeholder="Nombre" className="border p-2 rounded text-xs font-bold"/>
          <input value={nuevoProv.web} onChange={e=>setNuevoProv({...nuevoProv,web:e.target.value})} placeholder="Web" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.email} onChange={e=>setNuevoProv({...nuevoProv,email:e.target.value})} placeholder="Email" className="border p-2 rounded text-xs"/>
          <input value={nuevoProv.whatsapp} onChange={e=>setNuevoProv({...nuevoProv,whatsapp:e.target.value})} placeholder="WhatsApp" className="border p-2 rounded text-xs"/>
          <select value={nuevoProv.tipo_archivo} onChange={e=>setNuevoProv({...nuevoProv,tipo_archivo:e.target.value})} className="border p-2 rounded text-xs"><option>PDF/Excel</option></select>
        </div>
        <button onClick={agregarProveedor} className="mt-3 bg-black text-white px-6 py-2 rounded font-black text-xs">+ GUARDAR ENLACE</button>
      </div>
      <div className="grid gap-3">
        {proveedores.map(p=>{
          const itemsProv=listado.filter(l=> l.proveedor_nombre===p.nombre || p.nombre.includes('MBR'))
          const visible=itemsProv.length>0?itemsProv:listado
          const abierto=abiertos[p.nombre]
          const c=getCfgProv(p.nombre)
          const sel=seleccionados[p.nombre]||new Set()
          const allChecked=visible.length>0 && sel.size===visible.length
          return(
            <div key={p.nombre} className="bg-white p-3 rounded shadow border">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><span className="font-black text-xs uppercase">{p.nombre}</span><span className="bg-green-100 px-2 py-0.5 rounded text-xs font-bold">ACTIVO</span><span className="bg-black text-white px-2 py-0.5 rounded text-xs">{visible.length} refs</span></div>
                <div className="flex gap-2"><button onClick={()=>toggle(p.nombre)} className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{abierto?'−':'＋'}</button><button onClick={()=>eliminar(p.nombre)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">X</button></div>
              </div>
              {abierto && <div className="mt-3 space-y-3">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div><label className="text-[10px] font-bold block">Tipo lote</label><select value={c.tipo} onChange={e=>setCfgProv(p.nombre,{tipo:e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option value="COP">$ COP</option><option value="PORC">% </option><option value="FIJO">Fijo</option></select></div>
                    <div><label className="text-[10px] font-bold block">Valor</label><input type="number" value={c.valor} onChange={e=>setCfgProv(p.nombre,{valor:e.target.value})} placeholder="25000" className="border p-2 rounded text-xs font-black w-32"/></div>
                    <button onClick={()=>aplicarLote(p.nombre, visible)} className="bg-black text-white px-4 py-2 rounded font-black text-xs">APLICAR A {sel.size>0?sel.size:'TODOS'} → PUBLICO</button>
                  </div>
                </div>
                <div className="bg-white border rounded overflow-hidden">
                  <div className="bg-black text-white p-2 flex justify-between"><span className="text-xs font-black flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, visible, e.target.checked)} className="w-4 h-4"/>LISTADO MAESTRO - {p.nombre} - {sel.size}/{visible.length} sel</span></div>
                  <div className="overflow-auto max-h-[700px]">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 font-black sticky top-0"><tr><th className="p-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, visible, e.target.checked)}/></th><th className="p-2 text-left">Foto</th><th className="p-2 text-left">Referencia</th><th className="p-2 text-left">Talla</th><th className="p-2 text-left">Precio Proveedor</th><th className="p-2 text-left bg-orange-100">Incremento COP</th><th className="p-2 text-left bg-green-100">Precio Venta Público</th><th className="p-2 text-left">Stock</th></tr></thead>
                      <tbody>{visible.map((it,i)=>{ const img=getImg(it); const costo=getCosto(it); const inc=getIncremento(it.referencia); const venta=getVentaPublica(it); const isSel=sel.has(it.referencia); return(<tr key={i} className={`border-t ${isSel?'bg-orange-50':''} ${costo===0?'bg-red-50':''}`}><td className="p-2 text-center"><input type="checkbox" checked={isSel} onChange={e=>toggleOne(p.nombre, it.referencia, e.target.checked)}/></td><td className="p-1">{img?<img src={img} className="h-10 w-10 object-contain bg-white"/>:<span className="text-gray-400">—</span>}</td><td className="p-2 font-bold text-[10px]">{it.referencia}</td><td className="p-2">{it.talla}</td><td className="p-2 bg-blue-50"><div className={`font-black text-sm ${costo===0?'text-red-600':'text-blue-800'}`}>{costo===0?'$0 - esperando MBR':`$${costo.toLocaleString('es-CO')}`}</div></td><td className="p-2 bg-orange-50"><input type="number" value={incrementos[it.referencia]||''} onChange={e=>onChangeIncrementoIndividual(it.referencia, e.target.value)} placeholder="25000" className="border-2 border-orange-300 rounded px-2 py-1 w-28 text-xs font-black bg-white"/></td><td className="p-2 bg-green-50"><div className="font-black text-green-700 text-sm">${venta.toLocaleString('es-CO')}</div><div className="text-[9px] text-gray-600">{costo.toLocaleString('es-CO')} + {inc.toLocaleString('es-CO')}</div></td><td className="p-2 text-center font-bold">{it.stock_proveedor||10}</td></tr>)})}</tbody>
                    </table>
                  </div>
                </div>
              </div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
