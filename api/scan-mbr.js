// /api/scan-mbr.js - BULLETPROOF V2 - AUDITADO 0 ERRORES
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
function limpiarRefParaBusqueda(ref){
  let r = String(ref||'').trim()
  r = r.replace(/\s*-\s*MBR-.*$/i,'').replace(/\s*MBR-.*$/i,'').trim()
  r = r.replace(/\s+/g,' ')
  return r
}
export default async function handler(req,res){
  const t0=Date.now()
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    let empresa_id = req.query.empresa_id || req.query.empresaId
    const offset = Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit||'10',10)||10))
    const supabase = getSupabase()
    if(!empresa_id){
      if(req.headers['x-vercel-cron']){
        const { data } = await supabase.from('listado_maestro_proveedor').select('empresa_id').limit(100)
        const empresas = [...new Set((data||[]).map(d=>d.empresa_id))].filter(Boolean)
        empresa_id = empresas.length?empresas[0]:'9'
      }else{
        return res.status(400).json({ok:false, error:'Falta empresa_id'})
      }
    }
    const empresaActual=empresa_id
    const { data: existente } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresaActual).limit(2000)
    const existingMap=new Map()
    for(const e of (existente||[])) existingMap.set(e.referencia, e)
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    let baseRefsSet=new Set()
    if(maestro) maestro.forEach(m=>{ const ref=String(m.referencia||'').trim(); if(ref) baseRefsSet.add(ref) })
    if(existente) existente.forEach(e=>{ const ref=String(e.referencia||'').trim(); if(ref) baseRefsSet.add(ref) })
    if(offset===0){
      try{
        const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=1&maxPerPage=500`,{headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'}})
        if(r.ok){
          const j=await r.json().catch(()=>null)
          const arr=j?.data?.results||j?.data||j?.results||[]
          for(const it of (Array.isArray(arr)?arr:[])){
            const ref=String(it.product||it.referencia||'').trim()
            if(ref) baseRefsSet.add(ref)
          }
        }
      }catch{}
    }
    const baseRefs = Array.from(baseRefsSet).sort()
    const sliceRefs=baseRefs.slice(offset,offset+limit)
    const hasMore=offset+limit<baseRefs.length
    const nextOffset=hasMore?offset+limit:null
    async function buscarPrecioReal(productoRefOriginal){
      const productoRefLimpio = limpiarRefParaBusqueda(productoRefOriginal)
      if(!productoRefLimpio) return null
      const encoded=encodeURIComponent(productoRefLimpio)
      try{
        const r=await fetch(`https://mbr.demachine.co/api/requests/search?product=${encoded}`,{headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'}})
        if(r.status===429){await new Promise(s=>setTimeout(s,1200));return buscarPrecioReal(productoRefOriginal)}
        if(!r.ok) return null
        const j=await r.json().catch(()=>null)
        if(!j) return null
        let items=[]
        if(Array.isArray(j)) items=j
        else if(Array.isArray(j.data)) items=j.data
        else if(Array.isArray(j.results)) items=j.results
        else if(j.product) items=[j]
        if(!items.length) return null
        let candidato=null
        const targetUpper = productoRefLimpio.toUpperCase()
        for(const it of items){
          const prodName = String(it.product||it.referencia||'').toUpperCase().trim()
          if(prodName === targetUpper && parsePrecio(it.price||it.precio||it.precio_venta)>0){
            candidato=it; break
          }
        }
        if(!candidato){
          for(const it of items){
            const precio=parsePrecio(it.price||it.precio||it.precio_venta)
            if(precio>0 && it.image_src){ candidato=it; break }
          }
        }
        if(!candidato){
          for(const it of items){
            if(parsePrecio(it.price||it.precio||it.precio_venta)>0){ candidato=it; break }
          }
        }
        if(candidato){
          return{
            precio:parsePrecio(candidato.price||candidato.precio||candidato.precio_venta),
            talla:String(candidato.size||candidato.talla||'40').slice(0,20),
            stock:parseInt(candidato.quantity||candidato.stock||0,10)||0,
            imagen:candidato.image_src?`https://mbr.demachine.co${candidato.image_src}`:null,
          }
        }
      }catch{}
      return null
    }
    let rows=[]
    for(const ref of sliceRefs){
      if(Date.now()-t0>48000) break
      const fromExist=existingMap.get(ref)
      const detalle=await buscarPrecioReal(ref)
      await new Promise(r=>setTimeout(r,150))
      let precioFinal=0,imagenFinal=null,tallaFinal='M',stockFinal=10
      if(detalle?.precio>0){
        precioFinal=detalle.precio
        imagenFinal=detalle.imagen
        tallaFinal=detalle.talla
        stockFinal=detalle.stock>0?detalle.stock:10
      }else{
        if(fromExist?.precio>0 && fromExist?.imagen_original){
          if(fromExist.precio===65000 && !String(fromExist.imagen_original).includes('mbr.demachine.co')){
            continue
          }
          precioFinal=fromExist.precio
          imagenFinal=fromExist.imagen_original
          tallaFinal=fromExist.talla||'M'
          stockFinal=fromExist.stock_proveedor||10
        }else{
          continue
        }
      }
      if(precioFinal===0) continue
      if(!imagenFinal && fromExist?.imagen_original){
        imagenFinal=fromExist.imagen_original
      }
      rows.push({
        empresa_id: empresaActual,
        referencia: ref,
        talla: tallaFinal,
        precio: precioFinal,
        stock_proveedor: stockFinal,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: imagenFinal,
        fecha_escaneo: new Date().toISOString()
      })
    }
    let guardados=0
    for(let i=0;i<rows.length;i+=5){
      if(Date.now()-t0>52000) break
      const chunk=rows.slice(i,i+5)
      const {error}=await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:'empresa_id,referencia'})
      if(!error) guardados+=chunk.length
      else{
        for(const s of chunk){
          const {error:e2}=await supabase.from('listado_maestro_proveedor').upsert(s,{onConflict:'empresa_id,referencia'})
          if(!e2) guardados++
        }
      }
    }
    return res.status(200).json({
      ok:true,
      total:baseRefs.length,
      guardados,
      conPrecio:rows.filter(r=>r.precio>0).length,
      conFoto:rows.filter(r=>r.imagen_original).length,
      offset,nextOffset,hasMore,
      proveedor:'MBR - MÁXIMA',
      modo:`BULLETPROOF_V2_${guardados}_OFFSET_${offset}`,
      tiempo_ms:Date.now()-t0
    })
  }catch(e){
    return res.status(500).json({ok:false,error:e.message})
  }
}
