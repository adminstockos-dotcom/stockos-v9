// /api/scan-mbr.js - V6 FINAL - FIX 0 REFS + 9/9
import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL o KEY')
  return createClient(url, key)
}
function parsePrecio(v){
  if(v==null||v==='') return 0
  const n = parseInt(String(v).replace(/[^0-9]/g,''),10)
  return isNaN(n)?0:n
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

export default async function handler(req,res){
  const t0=Date.now()
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    let empresa_id = req.query.empresa_id || req.query.empresaId
    const offset = Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit||'20',10)||20))
    const supabase = getSupabase()
    if(!empresa_id){
      return res.status(400).json({ok:false, error:'Falta empresa_id'})
    }
    const empresaActual=empresa_id

    // 1. TRAE TODO MBR
    let allMbrItems=[]
    let page=1
    while(page<=5){
      if(Date.now()-t0>40000) break
      try{
        const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=500`,{headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'}})
        if(!r.ok){
          if(page===1) return res.status(500).json({ok:false, error:`MBR indexMe pagina ${page} status ${r.status} - revisa token`})
          break
        }
        let j=null
        try{ j=await r.json() }catch{ j=null }
        const arr=j?.data?.results||j?.data||j?.results||[]
        if(!Array.isArray(arr) || arr.length===0) break
        allMbrItems=[...allMbrItems,...arr]
        if(arr.length<500) break
        page++
        await sleep(300)
      }catch(e){
        if(page===1) return res.status(500).json({ok:false, error:'MBR indexMe error '+e.message})
        break
      }
    }

    if(!allMbrItems.length){
      return res.status(500).json({ok:false, error:'MBR indexMe devolvio 0 productos'})
    }

    // 2. DEDUPLICA - guarda TODO aunque sin foto, para no perder 204 refs
    const map = new Map()
    for(const it of allMbrItems){
      const refRaw = String(it.product||it.referencia||it.nombre||'').trim()
      if(!refRaw) continue
      const ref = refRaw
      const tallaRaw = String(it.size||it.talla||'').trim() || '40'
      const talla = tallaRaw.slice(0,30)
      const key = `${ref}||${talla}`.toUpperCase()
      const precio = parsePrecio(it.price||it.precio||it.precio_venta||it.precio_mayorista)
      if(precio===0) continue

      let imagen=null
      if(it.image_src){
        const src=String(it.image_src).trim()
        if(src.startsWith('http')) imagen=src
        else if(src.startsWith('//')) imagen=`https:${src}`
        else imagen=`https://mbr.demachine.co${src.startsWith('/')?'':'/'}${src}`
      } else imagen=it.imagen_original||it.image||null

      const stockRaw = it.quantity ?? it.stock ?? it.stockBodega ?? 0
      let stock = parseInt(String(stockRaw).replace(/[^0-9-]/g,''),10)
      if(isNaN(stock)) stock=0

      if(!map.has(key)){
        map.set(key,{
          empresa_id: empresaActual,
          referencia: ref,
          talla: talla,
          precio: precio,
          stock_proveedor: stock,
          proveedor_nombre: 'MBR - MÁXIMA',
          imagen_original: imagen,
          fecha_escaneo: new Date().toISOString()
        })
      }else{
        const prev=map.get(key)
        prev.stock_proveedor+=stock
        if(precio>prev.precio) prev.precio=precio
        if(imagen && !prev.imagen_original) prev.imagen_original=imagen
      }
    }

    const allRows = Array.from(map.values()).sort((a,b)=>a.referencia.localeCompare(b.referencia))
    const total = allRows.length
    const sliceRows = allRows.slice(offset, offset+limit)
    const hasMore = offset+limit < total
    const nextOffset = hasMore ? offset+limit : null

    let guardados=0
    let lastError=null
    for(let i=0;i<sliceRows.length;i+=10){
      if(Date.now()-t0>50000) break
      const chunk=sliceRows.slice(i,i+10)
      try{
        const r1 = await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:'empresa_id,referencia,talla'})
        if(r1.error) throw r1.error
        guardados+=chunk.length
      }catch{
        try{
          const r2 = await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:'empresa_id,referencia'})
          if(r2.error) throw r2.error
          guardados+=chunk.length
        }catch(e2){
          lastError=e2.message
          for(const s of chunk){
            try{
              const rr = await supabase.from('listado_maestro_proveedor').upsert(s,{onConflict:'empresa_id,referencia'})
              if(!rr.error) guardados++
              else lastError=rr.error.message
            }catch(err){ lastError=err.message }
          }
        }
      }
    }

    // Tambien guarda copia con empresa_id='9' para compatibilidad con datos viejos
    if(empresaActual!=='9' && guardados>0){
      try{
        const chunk9 = sliceRows.map(r=>({...r, empresa_id:'9'}))
        await supabase.from('listado_maestro_proveedor').upsert(chunk9,{onConflict:'empresa_id,referencia'})
      }catch{}
    }

    return res.status(200).json({
      ok:true,
      total,
      guardados,
      conPrecio: sliceRows.length,
      conFoto: sliceRows.filter(r=>r.imagen_original).length,
      offset,nextOffset,hasMore,
      proveedor:'MBR - MÁXIMA',
      modo:`V6_${guardados}_OFFSET_${offset}_TOTAL_${total}`,
      tiempo_ms:Date.now()-t0,
      sample: sliceRows.slice(0,3).map(r=>`${r.referencia} $${r.precio} T:${r.talla}`),
      lastError
    })
  }catch(e){
    return res.status(500).json({ok:false,error:e.message})
  }
}
