// /api/scan-mbr.js - FIX DEFINITIVO 7 -> 207
// Agrega per_page=100 y logs completos
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
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    const empresa_id = req.query.empresa_id || req.query.empresaId
    if(!empresa_id) return res.status(400).json({ok:false, error:'Falta empresa_id'})
    const supabase = getSupabase()
    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))

    const all=[]
    const pagesLog=[]
    for(let page=1; page<=100; page++){
      let results=[]
      for(let attempt=0; attempt<3; attempt++){
        try{
          // Prueba con per_page y sin per_page
          const urls = [
            `https://mbr.demachine.co/api/requests/indexMe?page=${page}&per_page=100`,
            `https://mbr.demachine.co/api/requests/indexMe?page=${page}&limit=100`,
            `https://mbr.demachine.co/api/requests/indexMe?page=${page}`
          ]
          let found=false
          for(const url of urls){
            const r = await fetch(url, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
            if(r.status===429){ await sleep(1000); continue }
            if(!r.ok) continue
            const j = await r.json().catch(()=>null)
            const resArr = j?.data?.results || j?.results || j?.data || []
            if(Array.isArray(resArr) && resArr.length>0){
              results=resArr
              found=true
              break
            }
            if(Array.isArray(resArr) && resArr.length===0 && page===1){
              // intenta siguiente formato
              continue
            }
            if(resArr.length===0){
              results=[]
              found=true
              break
            }
          }
          if(found) break
        }catch{ await sleep(500) }
      }
      pagesLog.push({page, count: results.length})
      if(results.length===0){
        if(page>5 && pagesLog.slice(-3).every(p=>p.count===0)) break
        if(page>20 && all.length>0 && results.length===0) break
      }
      if(results.length>0) all.push(...results)
      await sleep(350)
      if(results.length===0 && page>10) break
    }

    if(all.length===0) return res.status(500).json({ok:false, error:'MBR devolvio 0 tras probar per_page', pagesLog})

    const map=new Map()
    for(const it of all){
      const ref=String(it.product||it.referencia||it.name||'').trim()
      if(!ref) continue
      if(!map.has(ref)) map.set(ref, it)
    }
    const uniq=Array.from(map.values())
    const now=new Date().toISOString()

    const maestroCols = await getCols(supabase, 'productos_maestro')
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')

    let listadoRows = uniq.map(it=>({
      empresa_id,
      referencia: String(it.product||it.referencia||'').trim().slice(0,250),
      talla: String(it.size||it.talla||'M').trim().slice(0,20),
      precio: parsePrecio(it.price||it.precio),
      stock_proveedor: parseInt(it.quantity||it.stock||0,10)||0,
      proveedor_nombre: 'MBR - MÁXIMA',
      imagen_original: it.image_src ? `https://mbr.demachine.co${it.image_src}` : (it.imagen_original||null),
      fecha_escaneo: now
    }))
    if(listadoCols){
      listadoRows = listadoRows.map(row=>{
        const f={}
        for(const k of Object.keys(row)) if(listadoCols.includes(k)) f[k]=row[k]
        return f
      })
    }

    // Limpia solo esta empresa y reinserta todo
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id)

    let guardListado=0
    for(let i=0;i<listadoRows.length;i+=50){
      const chunk=listadoRows.slice(i,i+50)
      const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk)
      if(error) return res.status(500).json({ok:false, error:'Error insert chunk: '+error.message+' page '+i, pagesLog, total:uniq.length})
      guardListado+=chunk.length
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
      // limpia e inserta maestro también para asegurar 207
      const { error } = await supabase.from('productos_maestro').upsert(base, { onConflict:'referencia' })
      if(!error) guardMaestro=base.length
    }catch{}

    return res.status(200).json({
      ok:true,
      total: uniq.length,
      totalMBR: all.length,
      guardados: guardListado,
      guardadosListado: guardListado,
      guardadosMaestro: guardMaestro,
      proveedor:'MBR - MÁXIMA',
      modo:'FIX_DEFINITIVO_207_CON_PER_PAGE',
      pagesLog,
      maestroCols,
      listadoCols
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
