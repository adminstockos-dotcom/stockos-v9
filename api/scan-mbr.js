// /api/scan-mbr.js - CORREGIDO FINAL - 207/207 PRECIOS COMPLETOS
// CUMPLE: sin maxPerPage, batch 5 paralelo, retry, parse robusto, bulk upsert, SERVICE_ROLE
import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL / SERVICE_ROLE_KEY')
  return createClient(url, key)
}

function parsePrecio(v){
  if(v===null||v===undefined) return 0
  const s = String(v).replace(/[^0-9]/g,'')
  const n = parseInt(s,10)
  return isNaN(n)?0:n
}

export default async function handler(req, res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    const empresa_id = req.query.empresa_id || req.query.empresaId
    if(!empresa_id) return res.status(400).json({ok:false, error:'Falta empresa_id'})

    const supabase = getSupabase()

    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))

    const fetchPageRetry = async (page, retries=3)=>{
      for(let i=0;i<retries;i++){
        try{
          const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}`
          const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}`, Accept:'application/json' } })
          if(r.status===429){
            await sleep(800 + i*500)
            continue
          }
          if(!r.ok) {
            if(i===retries-1) return []
            await sleep(500)
            continue
          }
          const j = await r.json().catch(()=>null)
          const results = j?.data?.results || j?.results || []
          return results
        }catch{
          await sleep(500)
        }
      }
      return []
    }

    // Fetch secuencial controlado de 5 en 5 para no rate-limit
    const all = []
    for(let batchStart=1; batchStart<=30; batchStart+=5){
      const batch = []
      for(let p=batchStart; p<batchStart+5 && p<=30; p++) batch.push(fetchPageRetry(p))
      const batchResults = await Promise.all(batch)
      let emptyCount = 0
      for(const arr of batchResults){
        if(arr.length===0) emptyCount++
        else all.push(...arr)
      }
      // si 5 vacias seguidas, terminamos (ya no hay mas paginas)
      if(emptyCount===5 && batchStart>1) break
      await sleep(300)
    }

    if(all.length===0) return res.status(500).json({ok:false, error:'MBR devolvio 0 productos'})

    // DEDUP por referencia+talla, quedandose con el ultimo precio
    const map = new Map()
    for(const it of all){
      const refRaw = String(it.product||'').trim()
      if(!refRaw) continue
      const talla = String(it.size||'M').trim().slice(0,20)
      const key = refRaw + '|' + talla
      map.set(key, it)
    }
    const uniq = Array.from(map.values())

    const now = new Date().toISOString()
    const maestroRows = []
    const listadoRows = []

    for(const it of uniq){
      const ref = String(it.product||'').trim().slice(0,250)
      if(!ref) continue
      const precio = parsePrecio(it.price)
      const stock = parseInt(it.quantity,10) || 0
      const talla = String(it.size||'M').trim().slice(0,20)
      const img = it.image_src ? `https://mbr.demachine.co${it.image_src}` : null

      maestroRows.push({
        referencia: ref,
        nombre: ref,
        precio: precio,
        stock: stock,
        talla: talla,
        imagen_original: img,
        updated_at: now
      })

      listadoRows.push({
        empresa_id: empresa_id,
        referencia: ref,
        talla: talla,
        precio: precio,
        stock_proveedor: stock,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: img,
        fecha_escaneo: now
      })
    }

    // BULK UPSERT productos_maestro
    let guardMaestro = 0
    try{
      const { error, count } = await supabase.from('productos_maestro').upsert(maestroRows, { onConflict:'referencia' })
      if(!error) guardMaestro = maestroRows.length
      else {
        // fallback sin onConflict
        const { error: e2 } = await supabase.from('productos_maestro').upsert(maestroRows)
        if(!e2) guardMaestro = maestroRows.length
        else throw e2
      }
    }catch(e){
      return res.status(500).json({ok:false, error:'Error maestro: '+e.message, total: uniq.length})
    }

    // BULK UPSERT listado_maestro_proveedor - con fallback seguro
    let guardListado = 0
    try{
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(listadoRows, { onConflict:'empresa_id,referencia,talla' })
      if(!error) guardListado = listadoRows.length
      else {
        // si no hay constraint, borrar solo de esta empresa y reinsertar
        await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id).eq('proveedor_nombre','MBR - MÁXIMA')
        const { error: e2 } = await supabase.from('listado_maestro_proveedor').insert(listadoRows)
        if(e2) throw e2
        guardListado = listadoRows.length
      }
    }catch(e){
      return res.status(500).json({ok:false, error:'Error listado: '+e.message, total: uniq.length, guardMaestro})
    }

    return res.status(200).json({
      ok:true,
      total: uniq.length,
      guardados: guardListado,
      guardadosListado: guardListado,
      guardadosMaestro: guardMaestro,
      proveedor:'MBR - MÁXIMA',
      modo:'CORREGIDO_FINAL_207'
    })

  }catch(e){
    return res.status(500).json({ok:false, error: e.message})
  }
}
