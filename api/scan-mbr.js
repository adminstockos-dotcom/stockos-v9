// /api/scan-mbr.js - V5 FIX DEFINITIVO - SIN .catch() - AUDITADO
import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL o KEY en Vercel env')
  return createClient(url, key)
}
function parsePrecio(v){
  if(v==null||v==='') return 0
  const n = parseInt(String(v).replace(/[^0-9]/g,''),10)
  return isNaN(n)?0:n
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

async function fetchWithRetry(url, opts, retries=3){
  for(let i=0;i<retries;i++){
    try{
      const r = await fetch(url, opts)
      if(r.status===429){
        await sleep(1000*(i+1)*2)
        continue
      }
      return r
    }catch(e){
      if(i===retries-1) throw e
      await sleep(800*(i+1))
    }
  }
  return null
}

export default async function handler(req,res){
  const t0=Date.now()
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN en Vercel env'})
    let empresa_id = req.query.empresa_id || req.query.empresaId
    const offset = Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit||'20',10)||20))
    const supabase = getSupabase()
    if(!empresa_id){
      if(req.headers['x-vercel-cron']){
        const { data } = await supabase.from('listado_maestro_proveedor').select('empresa_id').limit(200)
        const empresas = [...new Set((data||[]).map(d=>d.empresa_id))].filter(Boolean)
        if(empresas.length===0){
          return res.status(400).json({ok:false, error:'Cron sin empresas - haz escaneo manual primero'})
        }
        empresa_id = empresas[0]
      }else{
        return res.status(400).json({ok:false, error:'Falta empresa_id en query'})
      }
    }
    const empresaActual=empresa_id

    let allMbrItems=[]
    let page=1
    let maxPerPage=500
    let hasMorePages=true
    while(hasMorePages && page<=5){
      if(Date.now()-t0>45000) break
      const url=`https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=${maxPerPage}`
      const r = await fetchWithRetry(url,{headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'}},3)
      if(!r || !r.ok){
        if(page===1){
          return res.status(500).json({ok:false, error:`MBR indexMe fallo pagina ${page} status ${r?.status||'sin respuesta'} - revisa MBR_BEARER_TOKEN`})
        }
        break
      }
      let j=null
      try{ j=await r.json() }catch{ j=null }
      const arr=j?.data?.results||j?.data||j?.results||[]
      if(!Array.isArray(arr) || arr.length===0){
        hasMorePages=false
        break
      }
      allMbrItems=[...allMbrItems,...arr]
      if(arr.length < maxPerPage) hasMorePages=false
      else page++
      await sleep(200)
    }

    if(!allMbrItems.length){
      return res.status(500).json({ok:false, error:'MBR indexMe devolvio 0 productos'})
    }

    const map = new Map()
    for(const it of allMbrItems){
      const refRaw = String(it.product||it.referencia||it.nombre||'').trim()
      if(!refRaw) continue
      const ref = refRaw
      const tallaRaw = String(it.size||it.talla||it.talla_text||'').trim() || 'M'
      const talla = tallaRaw.slice(0,30)
      const key = `${ref}||${talla}`.toUpperCase()
      const precio = parsePrecio(it.price||it.precio||it.precio_venta||it.precio_mayorista)
      if(precio===0) continue
      let imagen=null
      if(it.image_src){
        const src = String(it.image_src).trim()
        if(src.startsWith('http')) imagen=src
        else if(src.startsWith('//')) imagen=`https:${src}`
        else if(src.startsWith('/')) imagen=`https://mbr.demachine.co${src}`
        else imagen=`https://mbr.demachine.co/${src}`
      } else if(it.imagen_original) imagen=it.imagen_original
      else if(it.image) imagen=it.image

      const stockRaw = it.quantity ?? it.stock ?? it.stockBodega ?? it.cantidad ?? 0
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
        const prev = map.get(key)
        prev.stock_proveedor = (prev.stock_proveedor||0) + (stock||0)
        if(precio>0) prev.precio = Math.max(prev.precio, precio)
        if(imagen && !prev.imagen_original) prev.imagen_original = imagen
      }
    }

    const allRows = Array.from(map.values()).sort((a,b)=> a.referencia.localeCompare(b.referencia))
    const total = allRows.length
    const sliceRows = allRows.slice(offset, offset+limit)
    const hasMore = offset+limit < total
    const nextOffset = hasMore ? offset+limit : null

    let guardados=0
    let errores=[]
    for(let i=0;i<sliceRows.length;i+=10){
      if(Date.now()-t0>52000) break
      const chunk=sliceRows.slice(i,i+10)
      try{
        const res1 = await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:'empresa_id,referencia,talla'})
        if(res1.error) throw res1.error
        guardados+=chunk.length
      }catch(e){
        try{
          const res2 = await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:'empresa_id,referencia'})
          if(res2.error) throw res2.error
          guardados+=chunk.length
        }catch(e2){
          for(const s of chunk){
            try{
              const r1 = await supabase.from('listado_maestro_proveedor').upsert(s,{onConflict:'empresa_id,referencia,talla'})
              if(r1.error) throw r1.error
              guardados++
            }catch{
              try{
                const r2 = await supabase.from('listado_maestro_proveedor').upsert(s,{onConflict:'empresa_id,referencia'})
                if(!r2.error) guardados++
                else errores.push(r2.error.message)
              }catch(err){
                errores.push(err.message)
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total,
      guardados,
      conPrecio: sliceRows.filter(r=>r.precio>0).length,
      conFoto: sliceRows.filter(r=>r.imagen_original).length,
      offset,nextOffset,hasMore,
      proveedor:'MBR - MÁXIMA',
      modo:`V5_FIX_CATCH_${guardados}_OFFSET_${offset}_TOTAL_${total}`,
      tiempo_ms:Date.now()-t0,
      sample: sliceRows.slice(0,3).map(r=>`${r.referencia} $${r.precio} T:${r.talla} S:${r.stock_proveedor}`),
      errores: errores.slice(0,2)
    })
  }catch(e){
    return res.status(500).json({ok:false,error:e.message,stack:e.stack?.slice(0,800)})
  }
}
