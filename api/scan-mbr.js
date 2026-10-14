// /api/scan-mbr.js - FIX UNIQ_EMPRESA_REFERENCIA
// Tu tabla listado_maestro_proveedor tiene UNIQUE(empresa_id, referencia) sin talla
// Este fix usa onConflict empresa_id,referencia y dedup por referencia
import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key)
}
function parsePrecio(v){
  const s = String(v||'').replace(/[^0-9]/g,'')
  const n = parseInt(s,10)
  return isNaN(n)?0:n
}
async function getCols(supabase, table){
  try{
    const { data } = await supabase.from(table).select('*').limit(1)
    if(!data || data.length===0) return null
    return Object.keys(data[0])
  }catch{ return null }
}

export default async function handler(req,res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    const empresa_id = req.query.empresa_id || req.query.empresaId
    if(!empresa_id) return res.status(400).json({ok:false, error:'Falta empresa_id'})
    const supabase = getSupabase()
    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))
    const fetchPageRetry = async (page, retries=3)=>{
      for(let i=0;i<retries;i++){
        try{
          const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}`, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
          if(r.status===429){ await sleep(800+i*500); continue }
          if(!r.ok){ await sleep(400); if(i===retries-1) return []; continue }
          const j = await r.json().catch(()=>null)
          return j?.data?.results || j?.results || []
        }catch{ await sleep(500) }
      }
      return []
    }
    const all=[]
    for(let b=1;b<=30;b+=5){
      const batch=[]
      for(let p=b;p<b+5&&p<=30;p++) batch.push(fetchPageRetry(p))
      const resB = await Promise.all(batch)
      let empty=0
      for(const arr of resB){ if(arr.length===0) empty++; else all.push(...arr) }
      if(empty===5 && b>1) break
      await sleep(300)
    }
    if(all.length===0) return res.status(500).json({ok:false, error:'MBR 0'})

    // DEDUP POR REFERENCIA SOLA porque tu constraint es uniq_empresa_referencia
    const map=new Map()
    for(const it of all){
      const ref=String(it.product||'').trim()
      if(!ref) continue
      map.set(ref, it) // ultimo gana
    }
    const uniq=Array.from(map.values())
    const now=new Date().toISOString()

    const maestroCols = await getCols(supabase, 'productos_maestro')
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')

    let listadoRows = uniq.map(it=>({
      empresa_id: empresa_id,
      referencia: String(it.product||'').trim().slice(0,250),
      talla: String(it.size||'M').trim().slice(0,20),
      precio: parsePrecio(it.price),
      stock_proveedor: parseInt(it.quantity,10)||0,
      proveedor_nombre: 'MBR - MÁXIMA',
      imagen_original: it.image_src ? `https://mbr.demachine.co${it.image_src}` : null,
      fecha_escaneo: now
    }))
    if(listadoCols){
      listadoRows = listadoRows.map(row=>{
        const f={}
        for(const k of Object.keys(row)) if(listadoCols.includes(k)) f[k]=row[k]
        return f
      })
    }

    let guardListado=0
    try{
      // FIX: onConflict empresa_id,referencia (tu constraint real)
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(listadoRows, { onConflict:'empresa_id,referencia' })
      if(!error) guardListado=listadoRows.length
      else{
        // fallback por si el constraint tiene otro nombre, borra e inserta
        await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id).eq('proveedor_nombre','MBR - MÁXIMA')
        const { error:e2 } = await supabase.from('listado_maestro_proveedor').insert(listadoRows)
        if(e2) throw e2
        guardListado=listadoRows.length
      }
    }catch(e){
      return res.status(500).json({ok:false, error:'Error listado: '+e.message, total: uniq.length, cols:listadoCols})
    }

    let guardMaestro=0
    try{
      let base = uniq.map(it=>({
        referencia: String(it.product||'').trim().slice(0,250),
        precio: parsePrecio(it.price),
        imagen_original: it.image_src ? `https://mbr.demachine.co${it.image_src}` : null,
        updated_at: now
      }))
      if(maestroCols){
        base = base.map(r=>{
          const f={}
          for(const k of Object.keys(r)) if(maestroCols.includes(k)) f[k]=r[k]
          if(!f.referencia) f.referencia=r.referencia
          return f
        })
      }
      const { error } = await supabase.from('productos_maestro').upsert(base, { onConflict:'referencia' })
      if(!error) guardMaestro=base.length
    }catch{}

    return res.status(200).json({
      ok:true,
      total: uniq.length,
      guardados: guardListado,
      guardadosListado: guardListado,
      guardadosMaestro: guardMaestro,
      proveedor:'MBR - MÁXIMA',
      modo:'FIX_UNIQ_EMPRESA_REFERENCIA_207',
      maestroCols,
      listadoCols
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
