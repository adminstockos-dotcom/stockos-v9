import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function TabCatalogo({ empresa }) {
  const getEmpresaId = () => {
    try{
      if(empresa?.id) return String(empresa.id).trim()
      const parts = typeof window!=='undefined' ? window.location.pathname.split('/').filter(Boolean) : []
      const idx = parts.indexOf('empresa')
      if(idx>=0 && parts[idx+1]) return String(parts[idx+1]).trim()
      for(const p of parts){
        if(p.length>30 && p.includes('-')) return p
      }
    }catch{}
    return '9'
  }
  const empresaId = getEmpresaId()
  const empresaNombre = empresa?.nombre || 'MAXIMA IMPORTADORES'
  const slug = empresaNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(' ')[0] || 'maxima'

  const [listado, setListado] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [incrementos, setIncrementos] = useState({})

  const urlCatalogo = typeof window!=='undefined' ? `${window.location.origin}/m/${slug}` : `/m/${slug}`

  useEffect(()=>{ cargarListado() },[empresaId])

  const cargarListado = async () => {
    try{
      setLoading(true)
      setErrorMsg('')
      let all=[]
      try{
        const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaId).limit(2000)
        if(data) all=[...all,...data]
      }catch(e){ console.log('load uuid',e.message) }
      if(empresaId!=='9'){
        try{
          const { data } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id','9').limit(2000)
          if(data) all=[...all,...data]
        }catch{}
      }
      // dedup por referencia+talla
      const map=new Map()
      for(const r of all){
        const k=`${String(r.referencia||'').trim()}||${String(r.talla||'').trim()}`.toUpperCase()
        if(k && !map.has(k)) map.set(k,r)
      }
      let final=Array.from(map.values())
      // muestra MBR si existe, si no muestra todo para no quedar en 0
      const mbr=final.filter(x=>String(x.proveedor_nombre||'').toUpperCase().includes('MBR') || String(x.proveedor_nombre||'').toUpperCase().includes('MAXIMA'))
      if(mbr.length>0) final=mbr
      setListado(final)
    }catch(e){
      setErrorMsg(e.message)
      console.error(e)
    }finally{ setLoading(false) }
  }

  const escanearAhora = async () => {
    if(!confirm('Escaneo V11: traer precio real, foto real, stock real de MBR?')) return
    try{
      setLoading(true)
      setProgress('Iniciando...')
      let offset=0, totalGuard=0, total=0, hasMore=true, intentos=0
      while(hasMore && intentos<100){
        intentos++
        setProgress(`Escaneando ${offset} (${totalGuard}/${total||'?'})`)
        const r=await fetch(`/api/scan-mbr?empresa_id=${empresaId}&offset=${offset}&limit=50&t=${Date.now()}`,{cache:'no-store'})
        const txt=await r.text()
        let j
        try{ j=JSON.parse(txt) }catch{ throw new Error(txt.slice(0,500)) }
        if(!j.ok) throw new Error(j.error||'Error escaneo')
        totalGuard+=j.guardados||0
        total=j.total||total
        hasMore=j.hasMore
        if(hasMore){ offset=j.nextOffset||offset+50; await new Promise(r=>setTimeout(r,400)) }
        else break
      }
      setProgress('')
      alert(`OK ${totalGuard}/${total} migrados precio real`)
      await cargarListado()
    }catch(e){
      alert('Error: '+e.message)
      setProgress('')
      setErrorMsg(e.message)
    }finally{ setLoading(false) }
  }

  const getCosto = (it) => {
    const v=it.precio
    if(v==null) return 0
    if(typeof v==='number') return v
    const n=parseInt(String(v).replace(/[^0-9]/g,''),10)
    return isNaN(n)?0:n
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black uppercase">CATALOGO - {empresaNombre} - {listado.length} refs</h2>
          <p className="text-xs text-gray-500">{progress||errorMsg||'Listo'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>window.open(urlCatalogo,'_blank')} className="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold">VER CATALOGO</button>
          <button onClick={escanearAhora} className="bg-orange-500 text-white px-4 py-2 rounded text-xs font-black">ESCANEAR AHORA</button>
          <button onClick={cargarListado} className="bg-black text-white px-4 py-2 rounded text-xs">ACTUALIZAR</button>
        </div>
      </div>
      {loading && <div className="text-xs">Cargando...</div>}
      <div className="bg-white border rounded overflow-auto max-h-[700px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">Foto</th><th className="p-2 text-left">Referencia</th><th className="p-2">Talla</th><th className="p-2">Precio Real</th><th className="p-2">Stock</th></tr></thead>
          <tbody>
            {listado.map((it,i)=>(
              <tr key={`${it.referencia}-${it.talla}-${i}`} className="border-t">
                <td className="p-1">{it.imagen_original ? <img src={it.imagen_original} className="h-10 w-10 object-contain" /> : '—'}</td>
                <td className="p-2 font-bold">{it.referencia}</td>
                <td className="p-2">{it.talla}</td>
                <td className="p-2 font-black text-blue-700">{getCosto(it)===0?'$0':`$${getCosto(it).toLocaleString('es-CO')}`}</td>
                <td className="p-2">{it.stock_proveedor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {listado.length===0 && !loading && <div className="p-4 text-center text-gray-400">Sin productos - dale ESCANEAR AHORA</div>}
      </div>
    </div>
  )
}
