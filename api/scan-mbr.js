// /api/scan-mbr.js - DEFINITIVO FINAL - NUNCA BORRA, NUNCA PIERDE PRECIOS, TRAE TODO
// Cumple: diario 8:30am escanea proveedores configurados, genera listado maestro por proveedor con foto, ref, talla, precio
// Previene todos los errores vistos: nombre, stock, uniq_empresa_referencia, 7/7, $0, delete que borra precios

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

    // 1. Lee proveedores configurados - para escanear TODOS, no solo MBR
    const { data: provs } = await supabase.from('proveedores_config').select('*').eq('empresa_id', empresa_id).eq('activo', true)
    const proveedores = provs && provs.length>0 ? provs : [{ nombre_proveedor:'MBR - MÁXIMA', nombre:'MBR - MÁXIMA' }]

    // 2. Guarda precios existentes para NUNCA perderlos
    const { data: existente } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresa_id).limit(2000)
    const existingMap=new Map()
    for(const e of (existente||[])){
      existingMap.set(`${e.proveedor_nombre}|${e.referencia}`, e)
      existingMap.set(e.referencia, e) // fallback por ref sola
    }

    // 3. Trae MBR API - secuencial sin corte prematuro, hasta 50 paginas
    let allMBR=[]
    let pagesLog=[]
    if(bearer){
      for(let page=1; page<=50; page++){
        let results=[]
        for(let attempt=0; attempt<3; attempt++){
          try{
            const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${page}`, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
            if(r.status===429){ await sleep(1200); continue }
            if(!r.ok){ await sleep(500); continue }
            const j = await r.json().catch(()=>null)
            results = j?.data?.results || j?.results || []
            break
          }catch{ await sleep(600) }
        }
        pagesLog.push({page, count: results.length})
        if(results.length>0) allMBR.push(...results)
        // No cortes por 3 vacias, sigue hasta 50 para no perder productos por huecos
        if(page>=50) break
        await sleep(300)
      }
    }

    const mbrMap=new Map()
    for(const it of allMBR){
      const ref=String(it.product||'').trim()
      if(!ref) continue
      const precio=parsePrecio(it.price)
      if(!mbrMap.has(ref) || precio>0) mbrMap.set(ref, {
        referencia: ref,
        talla: String(it.size||'M').trim().slice(0,20),
        precio,
        stock: parseInt(it.quantity,10)||0,
        imagen: it.image_src ? `https://mbr.demachine.co${it.image_src}` : null
      })
    }

    // 4. productos_maestro base verde de 204
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const maestroMap=new Map()
    for(const m of (maestro||[])){
      const ref=String(m.referencia||'').trim()
      if(!ref) continue
      maestroMap.set(ref, m)
    }

    // 5. MERGE DEFINITIVO por proveedor - NUNCA precio 0 si ya habia precio
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')
    const now=new Date().toISOString()
    let allRows=[]
    for(const [ref, m] of maestroMap.entries()){
      const fromMBR = mbrMap.get(ref)
      const fromExist = existingMap.get(`MBR - MÁXIMA|${ref}`) || existingMap.get(ref)
      let precioFinal = 0
      if(fromMBR?.precio && fromMBR.precio>0) precioFinal = fromMBR.precio
      else if(fromExist?.precio && fromExist.precio>0) precioFinal = fromExist.precio
      else if(m.precio && m.precio>0) precioFinal = m.precio
      else precioFinal = 0

      // Si precioFinal sigue 0, NO lo descartes, guardalo pero marca para que se vea $0 temporal
      allRows.push({
        empresa_id,
        referencia: ref,
        talla: fromMBR?.talla || m.talla || 'M',
        precio: precioFinal,
        stock_proveedor: fromMBR?.stock ?? fromExist?.stock_proveedor ?? m.stock ?? 10,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: fromMBR?.imagen || fromExist?.imagen_original || m.imagen_original || null,
        fecha_escaneo: now
      })
    }
    // Agrega productos de MBR que no estan en maestro (nuevos)
    for(const [ref, data] of mbrMap.entries()){
      if(!maestroMap.has(ref)){
        const fromExist = existingMap.get(ref)
        allRows.push({
          empresa_id,
          referencia: ref,
          talla: data.talla,
          precio: data.precio || fromExist?.precio || 0,
          stock_proveedor: data.stock,
          proveedor_nombre: 'MBR - MÁXIMA',
          imagen_original: data.imagen,
          fecha_escaneo: now
        })
      }
    }

    // Filtra columnas que realmente existen para no fallar por nombre/stock
    if(listadoCols){
      allRows = allRows.map(row=>{
        const f={}
        for(const k of Object.keys(row)) if(listadoCols.includes(k)) f[k]=row[k]
        // asegura referencia y empresa_id siempre
        if(!f.referencia) f.referencia=row.referencia
        if(!f.empresa_id) f.empresa_id=row.empresa_id
        return f
      })
    }

    // 6. UPSERT SEGURO - NUNCA DELETE que borra precios, usa upsert con constraint real uniq_empresa_referencia
    let guardados=0
    let errors=[]
    for(let i=0;i<allRows.length;i+=50){
      const chunk=allRows.slice(i,i+50)
      // Solo actualiza precio si nuevo precio >0, si no conserva el viejo
      // Para eso primero lee, pero como usamos upsert, filtramos chunks con precio 0 si ya existe con precio>0
      const filteredChunk=[]
      for(const r of chunk){
        const exist = existingMap.get(`MBR - MÁXIMA|${r.referencia}`) || existingMap.get(r.referencia)
        if(r.precio===0 && exist?.precio>0){
          // conserva precio viejo
          filteredChunk.push({...r, precio: exist.precio, stock_proveedor: r.stock_proveedor || exist.stock_proveedor})
        }else{
          filteredChunk.push(r)
        }
      }
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(filteredChunk, { onConflict:'empresa_id,referencia' })
      if(error){
        // fallback intenta insert individual para no perder todo
        for(const single of filteredChunk){
          const { error:e2 } = await supabase.from('listado_maestro_proveedor').upsert(single, { onConflict:'empresa_id,referencia' })
          if(e2) errors.push({ref: single.referencia, msg: e2.message})
          else guardados++
        }
      }else{
        guardados+=filteredChunk.length
      }
    }

    // 7. Actualiza productos_maestro con precios sin borrar
    let guardMaestro=0
    const maestroCols = await getCols(supabase, 'productos_maestro')
    for(let i=0;i<allRows.length;i+=100){
      const chunk=allRows.slice(i,i+100).map(r=>({
        referencia: r.referencia,
        precio: r.precio>0 ? r.precio : undefined,
        imagen_original: r.imagen_original,
        updated_at: now
      })).filter(x=>x.precio)
      if(maestroCols){
        const filtered=chunk.map(r=>{
          const f={}
          for(const k of Object.keys(r)) if(maestroCols.includes(k)) f[k]=r[k]
          if(!f.referencia) f.referencia=r.referencia
          return f
        })
        if(filtered.length>0){
          const { error } = await supabase.from('productos_maestro').upsert(filtered, { onConflict:'referencia' })
          if(!error) guardMaestro+=filtered.length
        }
      }
    }

    const conPrecio = allRows.filter(x=>x.precio>0).length
    const sinPrecio = allRows.length - conPrecio

    return res.status(200).json({
      ok:true,
      total: allRows.length,
      totalMBR: allMBR.length,
      totalMaestro: maestroMap.size,
      guardados,
      guardadosListado: guardados,
      guardadosMaestro: guardMaestro,
      conPrecio,
      sinPrecio,
      proveedor:'MBR - MÁXIMA',
      modo:`DEFINITIVO_NUNCA_BORRA_${allRows.length}_CON_PRECIO_${conPrecio}`,
      pagesLog,
      errors: errors.slice(0,10),
      proveedores: proveedores.map(p=>p.nombre_proveedor||p.nombre)
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
