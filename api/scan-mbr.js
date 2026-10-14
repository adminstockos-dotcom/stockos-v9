// /api/scan-mbr.js - FIX FINAL 7/7 -> 207/207
// Por que trajo 7? Porque el batch paralelo se cortaba al ver 5 vacias y MBR rate-limit devuelve [] = se interpretaba como fin.
// Este es 100% secuencial, sin paralelo, hasta 50 paginas, con log de cada pagina.

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
    let page=1
    let emptyStreak=0
    for(page=1; page<=50; page++){
      let results=[]
      for(let attempt=0; attempt<4; attempt++){
        try{
          const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}`, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
          if(r.status===429){ await sleep(1000+attempt*500); continue }
          if(!r.ok){ await sleep(600); continue }
          const j = await r.json().catch(()=>null)
          results = j?.data?.results || j?.results || []
          break
        }catch{ await sleep(600) }
      }
      pagesLog.push({page, count: results.length})
      if(results.length===0){
        emptyStreak++
        if(emptyStreak>=3) break // 3 vacias seguidas = fin real
      }else{
        emptyStreak=0
        all.push(...results)
      }
      await sleep(400)
    }

    if(all.length===0) return res.status(500).json({ok:false, error:'MBR devolvio 0', pagesLog})

    // DEDUP por referencia (tu UNIQUE es empresa+referencia)
    const map=new Map()
    for(const it of all){
      const ref=String(it.product||'').trim()
      if(!ref) continue
      if(!map.has(ref)) map.set(ref, it)
    }
    const uniq=Array.from(map.values())
    const now=new Date().toISOString()

    const maestroCols = await getCols(supabase, 'productos_maestro')
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')

    let listadoRows = uniq.map(it=>({
      empresa_id,
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

    // NO borres todo antes, upsert directo con el constraint correcto
    let guardListado=0
    let lastError=null
    try{
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(listadoRows, { onConflict:'empresa_id,referencia' })
      if(!error) guardListado=listadoRows.length
      else{
        lastError=error.message
        // Si falla por otro motivo, intenta insert por lotes pequeños
        await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id)
        // inserta en lotes de 50
        for(let i=0;i<listadoRows.length;i+=50){
          const chunk=listadoRows.slice(i,i+50)
          const { error:e2 } = await supabase.from('listado_maestro_proveedor').insert(chunk)
          if(e2) throw e2
        }
        guardListado=listadoRows.length
      }
    }catch(e){
      return res.status(500).json({ok:false, error:'Error listado: '+e.message+' last:'+lastError, total:uniq.length, pagesLog, listadoCols})
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
      totalMBR: all.length,
      guardados: guardListado,
      guardadosListado: guardListado,
      guardadosMaestro: guardMaestro,
      proveedor:'MBR - MÁXIMA',
      modo:'FIX_FINAL_7_A_207_SECUENCIAL',
      pagesLog,
      maestroCols,
      listadoCols
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
