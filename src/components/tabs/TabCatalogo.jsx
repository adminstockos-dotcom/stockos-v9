import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const getEmpresaId = () => {
    if(empresa?.id) return String(empresa.id)
    try{
      const parts = window.location.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('empresa')
      if(idx>=0 && parts[idx+1]) return parts[idx+1]
      for(const p of parts){ if(p.length>30 && p.includes('-')) return p }
    }catch{}
    return '9'
  }
  const empresaId = getEmpresaId()
  const empresaNombre = empresa?.nombre || 'MAXIMA IMPORTADORES'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(' ')[0] || 'maxima'

  const [proveedores, setProveedores] = useState([{ nombre: 'MBR - MÁXIMA', activo: true }])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', web: '', email: '', whatsapp: '', tipo_archivo: 'PDF/Excel' })
  const [listado, setListado] = useState([])
  const [loadingListado, setLoadingListado] = useState(false)
  const [abiertos, setAbiertos] = useState({ 'MBR - MÁXIMA': true })
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
      if (data?.length) {
        const provs = data.map(p => ({ nombre: p.nombre_proveedor, web: p.url_web, email: p.email, whatsapp: p.grupo_whatsapp, tipo_archivo: p.tipo_archivo, activo: p.activo }))
        const finalProvs = provs.length?provs:[{ nombre: 'MBR - MÁXIMA', activo: true }]
        setProveedores(finalProvs)
        const openAll={}; finalProvs.forEach(p=> openAll[p.nombre]=true)
        setAbiertos(openAll)
      }
    } catch {}
    try{
      const savedInc = localStorage.getItem(`stockos_incrementos_${empresaId}`) || localStorage.getItem('stockos_incrementos_9')
      if(savedInc) setIncrementos(JSON.parse(savedInc))
      const savedPV = localStorage.getItem(`stockos_precios_venta_${empresaId}`) || localStorage.getItem('stockos_precios_venta_9')
      if(savedPV) setPreciosVenta(JSON.parse(savedPV))
    }catch{}
  }

  const cargarListado = async () => {
    try {
      setLoadingListado(true)
      // Intenta con UUID actual
      let { data, error } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('referencia',{ascending:true}).limit(2000)
      if(error) throw error
      // Si 0 resultados y empresaId es UUID, intenta tambien con '9' para datos viejos
      if((!data || data.length===0) && empresaId!=='9'){
        const { data: data9 } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', '9').order('referencia',{ascending:true}).limit(2000)
        if(data9 && data9.length>0){
          data = data9
        }
      }
      // Si aun 0, trae todo sin filtro empresa para debug
      if(!data || data.length===0){
        const { data: allData } = await supabase.from('listado_maestro_proveedor').select('*').limit(2000)
        if(allData && allData.length>0){
          // filtra por proveedor MBR en cliente
          data = allData.filter(l=> (l.proveedor_nombre||'').toUpperCase().includes('MBR'))
        }
      }
      if(data) setListado(data)
      else setListado([])
    } catch(e){ console.error('cargarListado',e); setListado([]) } finally{ setLoadingListado(false) }
  }

  const escanearAhora = async () => {
    if(!confirm('Traer TODOS los productos con precio real, foto real, talla y stock? V6 usa indexMe directo, guarda en UUID y en 9.')) return
    try{
      setLoadingListado(true)
      setScanProgress('Iniciando...')
      let offset=0
      let totalGuardados=0
      let total=0
      let hasMore=true
      let intentos=0
      while(hasMore && intentos<30){
        intentos++
        setScanProgress(`Escaneando ${offset}... (${totalGuardados}/${total||'?'})`)
        const r = await fetch(`${window.location.origin}/api/scan-mbr?empresa_id=${empresaId}&offset=${offset}&limit=30&t=${Date.now()}`, { cache: 'no-store' })
        const text = await r.text()
        let j; try{ j = JSON.parse(text) }catch{ throw new Error(text.slice(0,800)) }
        if(!j.ok) throw new Error(j.error || 'Error en escaneo')
        totalGuardados+=j.guardados||0
        total=j.total||total
        hasMore=j.hasMore
        if(j.sample) console.log('V6 sample',j.sample)
        if(hasMore){ offset=j.nextOffset||offset+30; await new Promise(res=>setTimeout(res, 500)) } else break
      }
      setScanProgress('')
      alert(`OK ${totalGuardados}/${total} productos con precio REAL diferente, foto REAL diferente - V6`)
      await cargarListado()
    }catch(e){ alert('Error: '+ e.message); setScanProgress('') } finally{ setLoadingListado(false) }
  }

  useEffect(()=>{ if(Object.keys(incrementos).length) localStorage.setItem(`stockos_incrementos_${empresaId}`, JSON.stringify(incrementos)) },[incrementos, empresaId])
  useEffect(()=>{ if(Object.keys(preciosVenta).length) localStorage.setItem(`stockos_precios_venta_${empresaId}`, JSON.stringify(preciosVenta)) },[preciosVenta, empresaId])

  const agregarProveedor = async () => {
    if(!nuevoProv.nombre.trim()) return alert('Nombre obligatorio')
    const nuevo={...nuevoProv, activo:true}
    setProveedores(prev=>[...prev,nuevo]); setNuevoProv({nombre:'',web:'',email:'',whatsapp:'',tipo_archivo:'PDF/Excel'})
    try{ await supabase.from('proveedores_config').upsert({empresa_id:empresaId,nombre_proveedor:nuevo.nombre,url_web:nuevo.web,email:nuevo.email,grupo_whatsapp:nuevo.whatsapp,tipo_archivo:nuevo.tipo_archivo,activo:true},{onConflict:'empresa_id,nombre_proveedor'}) }catch{}
  }
  const eliminar = async (nombre) => { if(!confirm(`¿Borrar ${nombre}?`))return; setProveedores(prev=>prev.filter(p=>p.nombre!==nombre)); try{ await supabase.from('proveedores_config').delete().eq('empresa_id',empresaId).eq('nombre_proveedor',nombre)}catch{} }
  const toggle = (nombre) => setAbiertos(prev=>({...prev,[nombre]:!prev[nombre]}))
  const getImg = (it) => it.imagen_original || it.imagen_sin_fondo || null
  const getCosto = (it) => Number(it.precio||0)
  const getIncremento = (ref) => Number(incrementos[ref]||0)
  const getVentaPublica = (it) => { if(preciosVenta[it.referencia]) return Number(preciosVenta[it.referencia]); return getCosto(it)+getIncremento(it.referencia) }
  const getCfgProv = (prov) => cfg[prov] || { tipo:'COP', valor:'' }
  const setCfgProv = (prov, patch) => setCfg(prev=> ({...prev, [prov]: {...getCfgProv(prov), ...patch}}))
  const toggleAll = (prov, visible, checked) => { setSeleccionados(s=>{ const n={...s}; n[prov]= checked ? new Set(visible.map(v=>v.referencia+'||'+v.talla)) : new Set(); return n }) }
  const toggleOne = (prov, it, checked) => { setSeleccionados(s=>{ const set=new Set(s[prov]||[]); const key=it.referencia+'||'+it.talla; if(checked) set.add(key); else set.delete(key); return {...s,[prov]:set} }) }
  const aplicarLote = (prov, visible) => {
    const c=getCfgProv(prov); const val=Number(String(c.valor).replace(/[^0-9.-]/g,''))
    if(!val && c.tipo!=='FIJO') return alert('Pon un valor')
    const sel=seleccionados[prov]; 
    let refs=[]
    if(sel && sel.size>0){ refs = Array.from(sel).map(k=>k.split('||')[0]) }else{ refs = visible.map(v=>v.referencia) }
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
        <div><h2 className="text-xl font-black uppercase">ENLACES PROVEEDORES - LISTADO MAESTRO V6</h2><p className="text-sm text-gray-500">{empresaNombre} - {proveedores.length} prov - {listado.length} refs - Scan 8:30 y 14:30 V6 FIX 0 REFS {scanProgress&&` - ${scanProgress}`} {loadingListado&&'(cargando...)'}</p></div>
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
          // FIX 0 REFS: filtra robusto por incluye MBR, no exacto
          const listToShow = listado.filter(l=> {
            const prov = (l.proveedor_nombre||'').toUpperCase()
            return prov.includes('MBR') || prov.includes('MAXIMA') || prov===p.nombre.toUpperCase() || listado.length>0 && !l.proveedor_nombre
          })
          const finalList = listToShow.length>0 ? listToShow : listado
          const abierto=abiertos[p.nombre]!==false
          const c=getCfgProv(p.nombre)
          const sel=seleccionados[p.nombre]||new Set()
          const allChecked=finalList.length>0 && sel.size===finalList.length
          return(
            <div key={p.nombre} className="bg-white p-3 rounded shadow border">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><span className="font-black text-xs uppercase">{p.nombre}</span><span className="bg-green-100 px-2 py-0.5 rounded text-xs font-bold">ACTIVO</span><span className="bg-black text-white px-2 py-0.5 rounded text-xs">{finalList.length} refs V6</span></div>
                <div className="flex gap-2"><button onClick={()=>toggle(p.nombre)} className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{abierto?'−':'＋'}</button><button onClick={()=>eliminar(p.nombre)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">X</button></div>
              </div>
              {abierto && <div className="mt-3 space-y-3">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div><label className="text-[10px] font-bold block">Tipo lote</label><select value={c.tipo} onChange={e=>setCfgProv(p.nombre,{tipo:e.target.value})} className="border p-2 rounded text-xs font-bold bg-white"><option value="COP">$ COP</option><option value="PORC">% </option><option value="FIJO">Fijo</option></select></div>
                    <div><label className="text-[10px] font-bold block">Valor</label><input type="number" value={c.valor} onChange={e=>setCfgProv(p.nombre,{valor:e.target.value})} placeholder="25000" className="border p-2 rounded text-xs font-black w-32"/></div>
                    <button onClick={()=>aplicarLote(p.nombre, finalList)} className="bg-black text-white px-4 py-2 rounded font-black text-xs">APLICAR A {sel.size>0?sel.size:'TODOS'} → PUBLICO</button>
                  </div>
                </div>
                <div className="bg-white border rounded overflow-hidden">
                  <div className="bg-black text-white p-2 flex justify-between"><span className="text-xs font-black flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, finalList, e.target.checked)} className="w-4 h-4"/>LISTADO MAESTRO V6 - {p.nombre} - {sel.size}/{finalList.length} sel - PRECIOS REALES DIFERENTES</span></div>
                  <div className="overflow-auto max-h-[700px]">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 font-black sticky top-0"><tr><th className="p-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(p.nombre, finalList, e.target.checked)}/></th><th className="p-2 text-left">Foto REAL</th><th className="p-2 text-left">Referencia</th><th className="p-2 text-left">Talla</th><th className="p-2 text-left">Precio Proveedor REAL</th><th className="p-2 text-left bg-orange-100">Incremento COP</th><th className="p-2 text-left bg-green-100">Precio Venta Público</th><th className="p-2 text-left">Stock REAL</th></tr></thead>
                      <tbody>{finalList.map((it,i)=>{ const img=getImg(it); const costo=getCosto(it); const inc=getIncremento(it.referencia); const venta=getVentaPublica(it); const isSel=sel.has(it.referencia+'||'+it.talla); return(<tr key={it.referencia+'-'+it.talla+'-'+i} className={`border-t ${isSel?'bg-orange-50':''} ${costo===0?'bg-red-50':''}`}><td className="p-2 text-center"><input type="checkbox" checked={isSel} onChange={e=>toggleOne(p.nombre, it, e.target.checked)}/></td><td className="p-1">{img?<img src={img} className="h-10 w-10 object-contain bg-white"/>:<span className="text-gray-400">—</span>}</td><td className="p-2 font-bold text-[10px]">{it.referencia}</td><td className="p-2">{it.talla}</td><td className="p-2 bg-blue-50"><div className={`font-black text-sm ${costo===0?'text-red-600':'text-blue-800'}`}>{costo===0?'$0':`$${costo.toLocaleString('es-CO')}`}</div></td><td className="p-2 bg-orange-50"><input type="number" value={incrementos[it.referencia]||''} onChange={e=>onChangeIncrementoIndividual(it.referencia, e.target.value)} placeholder="25000" className="border-2 border-orange-300 rounded px-2 py-1 w-28 text-xs font-black bg-white"/></td><td className="p-2 bg-green-50"><div className="font-black text-green-700 text-sm">${venta.toLocaleString('es-CO')}</div><div className="text-[9px] text-gray-600">{costo.toLocaleString('es-CO')} + {inc.toLocaleString('es-CO')}</div></td><td className="p-2 text-center font-bold">{it.stock_proveedor}</td></tr>)})}</tbody>
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
