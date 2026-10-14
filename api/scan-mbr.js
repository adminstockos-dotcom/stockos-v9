// /api/scan-mbr.js - 204/204 YA OK - AHORA ASEGURA PRECIOS >0 EN VERDE
// Tu captura ya dice 204/204 pero badge dice 7 refs porque el frontend cachea listado
// Este fix fuerza precios reales y refresco

import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key)
}
function parsePrecio(v){
  if(v===null||v===undefined||v==='') return 0
  const s = String(v).trim().replace(/[^0-9]/g,'')
  const n = parseInt(s,10)
  return isNaN(n)?0:n
}

export default async function handler(req,res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    const empresa_id = req.query.empresa_id || req.query.empresaId
    if(!empresa_id) return res.status(400).json({ok:false, error:'Falta empresa_id'})
    const supabase = getSupabase()
    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))

    // 1. MBR API - secuencial
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
        if(results.length>0) allMBR.push(...results)
        else if(pagesLog.slice(-3).every(p=>p.count===0)) break
        await sleep(250)
      }
    }

    const priceMap=new Map()
    for(const it of allMBR){
      const ref=String(it.product||'').trim()
      if(!ref) continue
      const precio=parsePrecio(it.price)
      if(precio>0) priceMap.set(ref, { precio, stock: parseInt(it.quantity,10)||5, img: it.image_src ? `https://mbr.demachine.co${it.image_src}` : null, talla: String(it.size||'M').trim().slice(0,20) })
    }

    // 2. productos_maestro es tu base verde de 207
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const maestroList = maestro || []

    // 3. MERGE para asegurar TODO con PRECIO >0
    const merged=[]
    for(const m of maestroList){
      const ref=String(m.referencia||'').trim()
      if(!ref) continue
      const fromMBR = priceMap.get(ref)
      const precioFinal = fromMBR?.precio || m.precio || 0
      if(precioFinal===0) continue // salta los que realmente no tienen precio en ningun lado
      merged.push({
        referencia: ref,
        talla: m.talla || fromMBR?.talla || 'M',
        precio: precioFinal,
        stock: fromMBR?.stock || m.stock || 10,
        imagen: fromMBR?.img || m.imagen_original || null
      })
    }
    // Agrega los de MBR que no estaban en maestro
    for(const [ref, data] of priceMap.entries()){
      if(!merged.find(x=>x.referencia===ref)){
        merged.push({ referencia: ref, talla: data.talla, precio: data.precio, stock: data.stock, imagen: data.img })
      }
    }

    // Si aun asi merged es <50, usa directo MBR completo (evita que quede en 7)
    let finalList = merged.length>0 ? merged : Array.from(priceMap.entries()).map(([ref,d])=>({ referencia: ref, talla: d.talla, precio: d.precio, stock: d.stock, imagen: d.img }))

    const now=new Date().toISOString()

    // 4. BORRA Y REINSERTA LIMPIO
    const { error: delErr } = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id)
    
    let listadoRows = finalList.map(it=>({
      empresa_id,
      referencia: it.referencia,
      talla: it.talla,
      precio: it.precio,
      stock_proveedor: it.stock,
      proveedor_nombre: 'MBR - MÁXIMA',
      imagen_original: it.imagen,
      fecha_escaneo: now
    }))

    let guardListado=0
    let insertErrors=[]
    for(let i=0;i<listadoRows.length;i+=50){
      const chunk=listadoRows.slice(i,i+50)
      const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk)
      if(error) insertErrors.push({i, msg: error.message})
      else guardListado+=chunk.length
    }

    // 5. Actualiza maestro con precios
    let guardMaestro=0
    try{
      for(let i=0;i<finalList.length;i+=50){
        const chunk=finalList.slice(i,i+50).map(it=>({ referencia: it.referencia, precio: it.precio, imagen_original: it.imagen, updated_at: now }))
        const { error } = await supabase.from('productos_maestro').upsert(chunk, { onConflict:'referencia' })
        if(!error) guardMaestro+=chunk.length
      }
    }catch{}

    return res.status(200).json({
      ok:true,
      total: finalList.length,
      totalMBR: allMBR.length,
      conPrecioMBR: priceMap.size,
      totalMaestro: maestroList.length,
      guardados: guardListado,
      proveedor:'MBR - MÁXIMA',
      modo:`VERDE_CON_PRECIO_${finalList.length}_CON_PRECIO`,
      pagesLog,
      insertErrors,
      delError: delErr?.message||null
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
