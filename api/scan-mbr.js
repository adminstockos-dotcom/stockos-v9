// /api/scan-mbr.js - FINAL QUE TRAE TODO EN VERDE CON PRECIO
// Analiza archivo que traia todo en verde (productos_maestro fallback) + archivo que trae precios (MBR API)
// Merge: productos_maestro = 207 refs base, MBR API = precios actualizados

import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key)
}
function parsePrecio(v){
  if(v===null||v===undefined) return 0
  const s = String(v).replace(/[^0-9]/g,'')
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

    // 1. TRAE MBR API (precios frescos, aunque sean 7 o 207)
    let allMBR=[]
    let pagesLog=[]
    if(bearer){
      for(let page=1; page<=50; page++){
        let results=[]
        for(let attempt=0; attempt<3; attempt++){
          try{
            const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}`, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
            if(r.status===429){ await sleep(1000); continue }
            if(!r.ok){ await sleep(400); continue }
            const j = await r.json().catch(()=>null)
            results = j?.data?.results || j?.results || []
            break
          }catch{ await sleep(500) }
        }
        pagesLog.push({page, count: results.length})
        if(results.length===0){
          if(pagesLog.slice(-3).every(p=>p.count===0)) break
        }else{
          allMBR.push(...results)
        }
        await sleep(300)
        if(results.length===0 && page>3 && allMBR.length>0) break
      }
    }

    const priceMap=new Map()
    for(const it of allMBR){
      const ref=String(it.product||'').trim()
      if(!ref) continue
      priceMap.set(ref, {
        precio: parsePrecio(it.price),
        stock: parseInt(it.quantity,10)||0,
        img: it.image_src ? `https://mbr.demachine.co${it.image_src}` : null,
        talla: String(it.size||'M').trim().slice(0,20)
      })
    }

    // 2. TRAE productos_maestro (este es el que traia TODO EN VERDE aunque sin precio)
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const maestroList = maestro || []
    
    // 3. MERGE: base 207 de maestro + precios de MBR
    const mergedMap=new Map()
    for(const m of maestroList){
      const ref=String(m.referencia||'').trim()
      if(!ref) continue
      const fromMBR = priceMap.get(ref)
      mergedMap.set(ref, {
        referencia: ref,
        talla: m.talla || fromMBR?.talla || 'M',
        precio: fromMBR?.precio || m.precio || 0,
        stock: fromMBR?.stock || m.stock || 10,
        imagen: fromMBR?.img || m.imagen_original || null
      })
    }
    // Agrega productos nuevos que solo estan en MBR y no en maestro
    for(const [ref, data] of priceMap.entries()){
      if(!mergedMap.has(ref)){
        mergedMap.set(ref, {
          referencia: ref,
          talla: data.talla,
          precio: data.precio,
          stock: data.stock,
          imagen: data.img
        })
      }
    }

    const uniq=Array.from(mergedMap.values())
    const now=new Date().toISOString()
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')
    const maestroCols = await getCols(supabase, 'productos_maestro')

    // 4. PREPARA listado_maestro_proveedor con TODO + PRECIO
    let listadoRows = uniq.map(it=>({
      empresa_id,
      referencia: it.referencia,
      talla: it.talla,
      precio: it.precio,
      stock_proveedor: it.stock,
      proveedor_nombre: 'MBR - MÁXIMA',
      imagen_original: it.imagen,
      fecha_escaneo: now
    }))
    if(listadoCols){
      listadoRows = listadoRows.map(row=>{
        const f={}
        for(const k of Object.keys(row)) if(listadoCols.includes(k)) f[k]=row[k]
        return f
      })
    }

    // Borra e inserta en lotes para evitar duplicate key
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id)

    let guardListado=0
    for(let i=0;i<listadoRows.length;i+=50){
      const chunk=listadoRows.slice(i,i+50)
      const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk)
      if(error) return res.status(500).json({ok:false, error:'Insert '+i+': '+error.message, pagesLog, total:uniq.length})
      guardListado+=chunk.length
    }

    // 5. Actualiza productos_maestro con precios frescos de MBR
    let guardMaestro=0
    try{
      let base = uniq.map(it=>({
        referencia: it.referencia,
        precio: it.precio,
        imagen_original: it.imagen,
        updated_at: now,
        stock: it.stock,
        talla: it.talla
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

    const conPrecio = uniq.filter(u=>u.precio>0).length
    const sinPrecio = uniq.length - conPrecio

    return res.status(200).json({
      ok:true,
      total: uniq.length,
      totalMBR: allMBR.length,
      totalMaestro: maestroList.length,
      conPrecio,
      sinPrecio,
      guardados: guardListado,
      guardadosListado: guardListado,
      guardadosMaestro: guardMaestro,
      proveedor:'MBR - MÁXIMA',
      modo:`FINAL_VERDE_CON_PRECIO_${uniq.length}_PRECIO_${conPrecio}`,
      pagesLog,
      listadoCols,
      maestroCols
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
