// /api/scan-mbr.js - DEFINITIVO RAPIDO SIN TIMEOUT - CORRIGE FUNCTION_INVOCATION_TIMEOUT
// Tu error: 204 productos x 8 URLs x 600ms = 2 minutos > Vercel 60s -> 504
// Fix: usa maxPerPage=500 para traer los 204 con precio en 1 SOLA LLAMADA, como hace estock-mobile

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

    // 0. Precios existentes para nunca borrar
    const { data: existente } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresa_id).limit(2000)
    const existingMap=new Map()
    for(const e of (existente||[])) existingMap.set(e.referencia, e)

    // 1. TRAE TODO EN 1 LLAMADA CON maxPerPage=500 - como viste en DevTools indexMe?page=1&maxPerPage=10
    let allProducts=[]
    let origen='ninguno'
    
    if(bearer){
      const endpointsRapidos = [
        `https://mbr.demachine.co/api/requests/indexMe?page=1&maxPerPage=500`,
        `https://mbr.demachine.co/api/requests/indexMe?page=1&per_page=500`,
        `https://mbr.demachine.co/api/requests/indexMe?page=1&limit=500`,
        `https://mbr.demachine.co/api/products/getProductList?maxPerPage=500`,
        `https://mbr.demachine.co/api/product/getProductList?maxPerPage=500`,
        `https://mbr.demachine.co/api/client/getClientProduct?maxPerPage=500`,
        `https://mbr.demachine.co/api/getProductList?maxPerPage=500`,
        `https://mbr.demachine.co/api/requests/indexMe?page=1&maxPerPage=200`,
      ]
      
      for(const url of endpointsRapidos){
        try{
          const r = await fetch(url, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
          if(!r.ok) continue
          const j = await r.json().catch(()=>null)
          let arr=[]
          if(Array.isArray(j)) arr=j
          else if(Array.isArray(j?.data)) arr=j.data
          else if(Array.isArray(j?.data?.results)) arr=j.data.results
          else if(Array.isArray(j?.results)) arr=j.results
          else if(Array.isArray(j?.products)) arr=j.products
          
          if(arr.length>=7){ // al menos los 7 que ya tenias
            allProducts=arr
            origen=url
            break
          }
        }catch{}
      }
    }

    // 2. Fallback a maestro 204 si API solo trae 7
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const baseCount = allProducts.length
    if(allProducts.length < 50 && maestro && maestro.length>0){
      // Merge: usa maestro como base y sobreescribe precio con lo que trajo MBR
      const mbrMap=new Map()
      for(const p of allProducts){
        const ref=String(p.product||p.referencia||'').trim()
        if(ref) mbrMap.set(ref, p)
      }
      const merged=[]
      for(const m of maestro){
        const ref=String(m.referencia||'').trim()
        if(!ref) continue
        const fromMBR = mbrMap.get(ref)
        const fromExist = existingMap.get(ref)
        const precio = parsePrecio(fromMBR?.price || fromMBR?.precio) || fromExist?.precio || m.precio || 0
        if(precio>0 || fromExist || m.precio){
          merged.push({
            product: ref,
            referencia: ref,
            size: fromMBR?.size || m.talla || fromExist?.talla || 'M',
            price: precio || fromExist?.precio || m.precio || 0,
            quantity: fromMBR?.quantity || fromExist?.stock_proveedor || m.stock || 10,
            image_src: fromMBR?.image_src ? fromMBR.image_src : (fromExist?.imagen_original?.replace('https://mbr.demachine.co','') || m.imagen_original?.replace('https://mbr.demachine.co','') || null),
            imagen_original: fromMBR ? (fromMBR.image_src ? `https://mbr.demachine.co${fromMBR.image_src}` : null) : (fromExist?.imagen_original || m.imagen_original)
          })
        }
      }
      allProducts=merged
      if(origen==='ninguno') origen='maestro+MBR_merge'
    }

    // 3. Prepara filas con foto, ref, talla, precio, stock - NUNCA borra, solo upsert
    const now=new Date().toISOString()
    let rows=[]
    for(const it of allProducts){
      const ref=String(it.referencia || it.product || '').trim()
      if(!ref) continue
      const precio = parsePrecio(it.price || it.precio)
      const exist = existingMap.get(ref)
      // Si precio es 0 pero ya existia con precio, conserva el viejo
      const precioFinal = precio>0 ? precio : (exist?.precio>0 ? exist.precio : 0)
      if(precioFinal===0 && !exist) continue // si nunca tuvo precio, no lo guardes con 0
      
      rows.push({
        empresa_id,
        referencia: ref,
        talla: String(it.size || it.talla || exist?.talla || 'M').trim().slice(0,20),
        precio: precioFinal,
        stock_proveedor: parseInt(it.quantity || it.stock || exist?.stock_proveedor || 10,10)||10,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: it.imagen_original || (it.image_src ? `https://mbr.demachine.co${it.image_src}` : null) || exist?.imagen_original || null,
        fecha_escaneo: now
      })
    }

    // Deduplica por referencia quedandote con mayor precio
    const dedupMap=new Map()
    for(const r of rows){
      if(!dedupMap.has(r.referencia) || r.precio>dedupMap.get(r.referencia).precio){
        dedupMap.set(r.referencia, r)
      }
    }
    const finalRows=Array.from(dedupMap.values())

    // 4. UPSERT RAPIDO - sin delete que borra todo
    let guardados=0
    let errores=[]
    for(let i=0;i<finalRows.length;i+=50){
      const chunk=finalRows.slice(i,i+50)
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(chunk, { onConflict:'empresa_id,referencia' })
      if(error){
        for(const single of chunk){
          const { error:e2 } = await supabase.from('listado_maestro_proveedor').upsert(single, { onConflict:'empresa_id,referencia' })
          if(e2) errores.push({ ref: single.referencia, msg: e2.message })
          else guardados++
        }
      }else{
        guardados+=chunk.length
      }
    }

    const conPrecio = finalRows.filter(r=>r.precio>0).length

    return res.status(200).json({
      ok:true,
      total: finalRows.length,
      totalMBR: baseCount,
      guardados,
      conPrecio,
      sinPrecio: finalRows.length - conPrecio,
      proveedor:'MBR - MÁXIMA',
      modo:`RAPIDO_SIN_TIMEOUT_${finalRows.length}_CON_PRECIO_${conPrecio}_ORIGEN_${origen}`,
      origen
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
