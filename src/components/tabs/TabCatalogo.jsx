import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const getEmpresaId = () => {
    try{
      if(empresa?.id) return String(empresa.id).trim()
      const parts = typeof window!=='undefined' ? window.location.pathname.split('/').filter(Boolean) : []
      const idx = parts.indexOf('empresa')
      if(idx>=0 && parts[idx+1]) return String(parts[idx+1]).trim()
      for(const p of parts){ if(p.length>30 && p.includes('-')) return p }
    }catch{}
    return '9'
  }
  const empresaId = getEmpresaId()
  const empresaNombre = empresa?.nombre || 'Máxima Importadores'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(' ')[0] || 'maxima'

  const [listado, setListado] = useState([])
  const [maestroFotos, setMaestroFotos] = useState({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [abiertos, setAbiertos] = useState({'MBR - MÁXIMA': true})
  const [seleccionados, setSeleccionados] = useState({})
  const [incrementos, setIncrementos] = useState({})
  const [preciosVenta, setPreciosVenta] = useState({})
  const [cfg, setCfg] = useState({'MBR - MÁXIMA': {tipo:'COP', valor:'25000'}})

  const urlCatalogo = typeof window!=='undefined' ? `${window.location.origin}/m/${slug}` : `/m/${slug}`

  useEffect(()=>{ cargarListado(); cargarStorage() },[empresaId])

  const cargarStorage = () => {
    try{
      const inc = localStorage.getItem(`stockos_incrementos_${empresaId}`) || localStorage.getItem('stockos_incrementos_9')
      const pv = localStorage.getItem(`stockos_precios_venta_${empresaId}`) || localStorage.getItem('stockos_precios_venta_9')
      if(inc) setIncrementos(JSON.parse(inc))
      if(pv) setPreciosVenta(JSON.parse(pv))
    }catch{}
  }

  const cargarListado = async () => {
    try{
      setLoading(true)
      let all=[]
      // maestro para foto fallback
      try{
        const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(500)
        if(maestro){
          const m={}
          maestro.forEach(f=>{ if(f.referencia) m[f.referencia]=f })
          setMaestroFotos(m)
        }
      }catch{}
      // listado real
      try{
        const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).order('referencia').limit(2000)
        if(data) all=[...all,...data]
      }catch(e){ console.error('load uuid',e) }
      if(empresaId!=='9'){
        try{
          const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id','9').order('referencia').limit(2000)
          if(data) all=[...all,...data]
        }catch{}
      }
      const map=new Map()
      for(const r of all){
        const k=`${String(r.referencia||'').trim()}||${String(r.talla||'').trim()}`.toUpperCase()
        if(k && !map.has(k)) map.set(k,r)
      }
      setListado(Array.from(map.values()))
    }finally{ setLoading(false) }
  }

  const escanearAhoraNVR = async () => {
    if(!confirm('NVR PLAYWRIGHT: Login -> 3 rayitas -> Listado de productos -> por cada producto click BUSCAR PRODUCTO para foto HD real, precio real, tallas, colores, stock? (Anti-generico)')) return
    try{
      setLoading(true)
      setProgress('Iniciando...')
      let offset=0, guard=0, total=0, hasMore=true, intentos=0
      while(hasMore && intentos<120){
        intentos++
        setProgress(`Escaneando ${offset} (${guard}/${total||'?'})`)
        const r=await fetch(`/api/scan-mbr?empresa_id=${empresaId}&offset=${offset}&limit=50&t=${Date.now()}`,{cache:'no-store'})
        const txt=await r.text()
        let j; try{ j=JSON.parse(txt) }catch{ throw new Error(txt.slice(0,600)) }
        if(!j.ok) throw new Error(j.error)
        guard+=j.guardados||0; total=j.total||total; hasMore=j.hasMore
        if(hasMore){ offset=j.nextOffset||offset+50; await new Promise(x=>setTimeout(x,400)) } else break
      }
      setProgress('')
      alert(`OK ${guard}/${total} con foto original, marca, color, tipo, stock y precio real`)
      await cargarListado()
    }catch(e){ alert('Error: '+e.message); setProgress('') } finally{ setLoading(false) }
  }

  const getImg = (it) => it.imagen_original || it.imagen_sin_fondo || maestroFotos[it.referencia]?.imagen_original || maestroFotos[it.referencia]?.imagen || null
  const getCosto = (it) => { if(typeof it.precio==='number') return it.precio; const n=parseInt(String(it.precio||'').replace(/[^0-9]/g,''),10); return isNaN(n)?0:n }
  const getMarca = (it) => {
    if(it.marca) return it.marca
    const ref=String(it.referencia||'').toUpperCase()
    const marcas=['ADIDAS','NIKE','PUMA','REEBOK','NEW BALANCE','VANS','CONVERSE','FILA','JORDAN','NB','NIKE SB']
    for(const m of marcas) if(ref.includes(m)) return m
    return String(it.referencia||'').split(' ')[0].slice(0,12) || 'MBR'
  }
  const getColor = (it) => it.color || it.color_original || ''
  const getTipo = (it) => it.tipo_producto || it.categoria || ''
  const makeKey = (ref,talla) => `${String(ref).trim()}||${String(talla).trim()}`
  const toggleOne = (ref,talla,chk) => {
    setSeleccionados(s=>{
      const set=new Set(s['MBR - MÁXIMA']||[])
      const k=makeKey(ref,talla)
      if(chk) set.add(k); else set.delete(k)
      return {...s, ['MBR - MÁXIMA']:set}
    })
  }
  const toggleAll = (visible,chk) => {
    setSeleccionados(s=>({ ...s, ['MBR - MÁXIMA']: chk ? new Set(visible.map(v=>makeKey(v.referencia,v.talla))) : new Set() }))
  }
  const aplicarLote = (visible) => {
    const c=cfg['MBR - MÁXIMA']||{tipo:'COP',valor:'25000'}
    const val=parseInt(String(c.valor).replace(/[^0-9]/g,''),10)||0
    if(!val) return alert('Pon valor')
    const sel=seleccionados['MBR - MÁXIMA']
    const refs = sel && sel.size>0 ? Array.from(sel).map(k=>k.split('||')[0]) : visible.map(v=>v.referencia)
    const uniq=[...new Set(refs)]
    const newInc={...incrementos}
    const newPV={...preciosVenta}
    uniq.forEach(ref=>{
      const item=visible.find(v=>String(v.referencia).trim()===String(ref).trim())
      const costo=item?getCosto(item):0
      let venta=costo
      if(c.tipo==='COP'){ newInc[ref]=val; venta=costo+val }
      else if(c.tipo==='PORC'){ const inc=Math.round(costo*val/100); newInc[ref]=inc; venta=costo+inc }
      else { newInc[ref]=val-costo; venta=val }
      newPV[ref]=venta
    })
    setIncrementos(newInc); setPreciosVenta(newPV)
    try{ localStorage.setItem(`stockos_incrementos_${empresaId}`, JSON.stringify(newInc)); localStorage.setItem(`stockos_precios_venta_${empresaId}`, JSON.stringify(newPV)) }catch{}
  }

  const sel=seleccionados['MBR - MÁXIMA']||new Set()
  const allChecked=listado.length>0 && sel.size===listado.length

  return (
    <div className="space-y-3 bg-[#f6f6f6] min-h-screen p-2">
      <div className="bg-white p-3 rounded shadow flex justify-between items-center">
        <div><div className="text-[11px] font-black">ENLACES PROVEEDORES - LISTADO MAESTRO</div><div className="text-[10px] text-gray-500">{empresaNombre} - {listado.length} refs - {progress||'302 con precio'} - {empresaId.slice(0,8)}</div></div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogo,'_blank')} className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-black">VER CATALOGOS PUBLICOS</button>
          <button onClick={escanearAhora} className="bg-orange-500 text-white px-4 py-1.5 rounded text-[10px] font-black">ESCANEAR AHORA {progress?`(${progress})`:''}</button>
          <button onClick={cargarListado} className="bg-black text-white px-3 py-1.5 rounded text-[10px] font-black">ACTUALIZAR</button>
        </div>
      </div>

      <div className="bg-white p-3 rounded shadow border">
        <div className="text-[11px] font-black mb-2">CONFIGURAR ENLACE DE PROVEEDOR</div>
        <div className="grid grid-cols-6 gap-2">
          <input className="border p-1.5 rounded text-[11px]" placeholder="Nombre" defaultValue="MBR - MÁXIMA" />
          <input className="border p-1.5 rounded text-[11px]" placeholder="Web" defaultValue="https://mbr.demachine.co" />
          <input className="border p-1.5 rounded text-[11px]" placeholder="Usuario" />
          <input className="border p-1.5 rounded text-[11px]" placeholder="Email" />
          <input className="border p-1.5 rounded text-[11px]" placeholder="Grupo WhatsApp" />
          <select className="border p-1.5 rounded text-[11px]"><option>PDF/Excel</option></select>
        </div>
        <button className="mt-2 bg-black text-white px-4 py-1 rounded text-[10px] font-black">+ GUARDAR ENLACE</button>
      </div>

      <div className="bg-white rounded shadow border overflow-hidden">
        <div className="flex justify-between items-center p-2 bg-white border-b">
          <div className="flex items-center gap-2"><span className="font-black text-[11px]">MBR - MAXIMA</span><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVO</span><span className="bg-black text-white px-2 py-0.5 rounded text-[10px]">302 con precio</span></div>
          <button onClick={()=>setAbiertos(a=>({...a, ['MBR - MÁXIMA']:!a['MBR - MÁXIMA']}))} className="bg-gray-100 px-2 py-1 rounded text-[11px]">{abiertos['MBR - MÁXIMA']!==false?'−':'+'}</button>
        </div>
        {abiertos['MBR - MÁXIMA']!==false && <>
          <div className="bg-yellow-50 border-y-2 border-yellow-400 p-2 m-2 rounded">
            <div className="flex justify-between items-end flex-wrap gap-2">
              <div><div className="text-[11px] font-black uppercase">VENTANA VALOR / INCREMENTO - MBR - MAXIMA</div><div className="text-[9px] text-gray-600">Flujo: Precio Proveedor (MBR Stock) + Incremento COP = Precio Venta Público Máxima | Trae foto original, marca, color, tipo</div></div>
              <div className="flex gap-2 items-end">
                <div><label className="text-[9px] font-bold block">Tipo lote</label><select value={cfg['MBR - MÁXIMA']?.tipo||'COP'} onChange={e=>setCfg({...cfg, ['MBR - MÁXIMA']:{...cfg['MBR - MÁXIMA'], tipo:e.target.value}})} className="border p-1 rounded text-[10px] font-bold bg-white"><option value="COP">$ COP a sumar</option><option value="PORC">% a sumar</option><option value="FIJO">Precio fijo</option></select></div>
                <div><label className="text-[9px] font-bold block">Valor COP</label><input type="number" value={cfg['MBR - MÁXIMA']?.valor||'25000'} onChange={e=>setCfg({...cfg, ['MBR - MÁXIMA']:{...cfg['MBR - MÁXIMA'], valor:e.target.value}})} className="border p-1 rounded text-[10px] font-black w-24" /></div>
                <button onClick={()=>aplicarLote(listado)} className="bg-black text-white px-3 py-1.5 rounded text-[10px] font-black">APLICAR A {sel.size>0?sel.size:'TODOS'} → PUBLICO</button>
              </div>
            </div>
          </div>
          <div className="bg-black text-white p-2 flex justify-between text-[11px] font-black"><span className="flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(listado, e.target.checked)} />LISTADO MAESTRO - {listado.length} - {sel.size}/{listado.length} sel - 302 con precio</span><span>Catálogo Máxima usa solo Precio Público</span></div>
          <div className="overflow-auto max-h-[700px]">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-100 font-black sticky top-0 z-10"><tr><th className="p-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(listado, e.target.checked)} /></th><th className="p-2 text-left">Foto Original</th><th className="p-2 text-left">Referencia Original</th><th className="p-2">Marca</th><th className="p-2">Color</th><th className="p-2">Tipo Producto</th><th className="p-2">Talla</th><th className="p-2 text-left">Precio Proveedor (MBR Stock)</th><th className="p-2 bg-orange-100">Incremento COP</th><th className="p-2 bg-green-100">Precio Venta Público Máxima</th><th className="p-2">Stock MBR</th></tr></thead>
              <tbody>
                {listado.map((it,i)=>{
                  const costo=getCosto(it)
                  const inc=incrementos[it.referencia]||0
                  const venta=preciosVenta[it.referencia]!=null?preciosVenta[it.referencia]:costo+inc
                  const isSel=sel.has(makeKey(it.referencia,it.talla))
                  const img=getImg(it)
                  return(
                    <tr key={`${it.referencia}-${it.talla}-${i}`} className={`border-t ${isSel?'bg-orange-50':''} ${costo===0?'bg-red-50':''}`}>
                      <td className="p-2 text-center"><input type="checkbox" checked={isSel} onChange={e=>toggleOne(it.referencia,it.talla,e.target.checked)} /></td>
                      <td className="p-1">{img ? <img src={img} className="h-10 w-10 object-contain bg-white border" loading="lazy" /> : <span className="text-gray-300">—</span>}</td>
                      <td className="p-2 font-bold text-[10px] max-w-[180px] truncate" title={it.referencia}>{it.referencia}</td>
                      <td className="p-2 font-bold text-[10px]">{getMarca(it)}</td>
                      <td className="p-2 text-[10px]">{getColor(it)||'-'}</td>
                      <td className="p-2 text-[10px]">{getTipo(it)||'-'}</td>
                      <td className="p-2 text-center">{it.talla}</td>
                      <td className="p-2 bg-blue-50 font-black text-blue-800 text-[12px]">{costo===0?'$0':`$${costo.toLocaleString('es-CO')}`}</td>
                      <td className="p-2 bg-orange-50"><input type="number" value={incrementos[it.referencia]||''} onChange={e=>{ const v=parseInt(e.target.value.replace(/[^0-9]/g,''),10)||0; const ni={...incrementos,[it.referencia]:v}; setIncrementos(ni); setPreciosVenta(pv=>({...pv,[it.referencia]:costo+v})); try{ localStorage.setItem(`stockos_incrementos_${empresaId}`, JSON.stringify(ni)) }catch{} }} placeholder="25000" className="border border-orange-300 rounded px-1 py-0.5 w-20 text-[10px] font-black bg-white" /></td>
                      <td className="p-2 bg-green-50 font-black text-green-700 text-[12px]">${venta.toLocaleString('es-CO')}</td>
                      <td className="p-2 text-center font-bold">{it.stock_proveedor||1}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {listado.length===0 && !loading && <div className="p-8 text-center text-gray-400 text-xs">Sin productos - dale ESCANEAR AHORA para traer foto original, marca, color, tipo, stock y precio real</div>}
          </div>
        </>}
      </div>
    </div>
  )
}
