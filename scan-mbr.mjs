// /api/scan-mbr.js - V12 FINAL - Parte del deploy que mas cerca estuvo + extrae marca/color/tipo
import { createClient } from '@supabase/supabase-js'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL o KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}
function parsePrecio(v){
  if(v==null||v==='') return 0
  let s=String(v).trim().replace(/[^0-9.,]/g,'')
  if(!s) return 0
  if(s.includes('.') && s.includes(',')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',', '.')
    else s=s.replace(/,/g,'')
    s=s.split('.')[0]
  } else if(s.includes(',')){
    const parts=s.split(',')
    if(parts.length===2 && parts[1].length===3) s=parts.join('')
    else if(parts[1] && parts[1].length<=2) s=parts[0]
    else s=s.replace(/,/g,'')
  } else if(s.includes('.')){
    const parts=s.split('.')
    if(parts.length===2 && parts[1].length===3) s=parts.join('')
    else if(parts.length>2) s=s.replace(/\./g,'')
    else if(parts.length===2 && parts[1].length<=2) s=parts[0]
  }
  const n=parseInt(s.replace(/[^0-9]/g,''),10)
  return isNaN(n)?0:n
}
function limpiarRef(ref){
  if(!ref) return ''
  let r=String(ref).trim()
  r=r.replace(/^MBR[-\s]*[A-Z0-9-]*\s+/i,'').trim()
  r=r.replace(/^MBR[-\s]*[A-Z0-9-]+$/i,'').trim()
  r=r.replace(/\s*[-–]\s*MBR[-\s]*[A-Z0-9-]*.*$/i,'').trim()
  r=r.replace(/\s+MBR[-\s]*[A-Z0-9-]*.*$/i,'').trim()
  r=r.replace(/-+$/,'').trim()
  r=r.replace(/\s+/g,' ').trim()
  return r
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }
async function fetchWithRetry(url, opts, retries=4){
  for(let i=0;i<retries;i++){
    try{
      const r=await fetch(url, opts)
      if(r.status===429){ await sleep(1200*(i+1)); continue }
      if(r.status>=500 && i<retries-1){ await sleep(800*(i+1)); continue }
      return r
    }catch(e){ if(i===retries-1) throw e; await sleep(800*(i+1)) }
  }
  return null
}
export default async function handler(req,res){
  const t0=Date.now()
  try{
    const bearer=process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    let empresa_id=req.query.empresa_id||req.query.empresaId||null
    if(empresa_id) empresa_id=String(empresa_id).trim()
    const offset=Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit=Math.min(100, Math.max(1, parseInt(req.query.limit||'50',10)||50))
    const supabase=getSupabase()

    let allMbrItems=[]
    let page=1
    while(page<=15){
      if(Date.now()-t0>55000) break
      const r=await fetchWithRetry(`https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=500`,{headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'}},4)
      if(!r){ if(page===1) return res.status(500).json({ok:false, error:'MBR sin respuesta'}); break }
      if(!r.ok){ if(r.status===429){ await sleep(2000); continue } if(page===1) return res.status(500).json({ok:false, error:`MBR fallo ${r.status}`}); break }
      let j=null; try{ j=await r.json() }catch{ j=null }
      let arr=[]
      if(j){
        if(Array.isArray(j)) arr=j
        else if(Array.isArray(j.data?.results)) arr=j.data.results
        else if(Array.isArray(j.data)) arr=j.data
        else if(Array.isArray(j.results)) arr=j.results
      }
      if(!arr.length) break
      allMbrItems=[...allMbrItems,...arr]
      if(arr.length<500) break
      page++; await sleep(200)
    }
    if(!allMbrItems.length) return res.status(500).json({ok:false, error:'MBR devolvio 0'})

    const mbrMap=new Map()
    const mbrMapByRef=new Map()
    for(const it of allMbrItems){
      const raw=String(it.product||it.referencia||it.nombre||it.title||'').trim()
      if(!raw) continue
      const limpia=limpiarRef(raw).toUpperCase()
      if(!limpia) continue
      const tallaRaw=String(it.size||it.talla||it.talla_text||it.talla_num||'').trim()||'40'
      const talla=tallaRaw.slice(0,30)
      const key=`${limpia}||${talla.toUpperCase()}`
      const precio=parsePrecio(it.price||it.precio||it.precio_venta||it.precio_mayorista||it.valor)
      if(precio<=0) continue
      let imagen=null
      const imgSrc=it.image_src||it.imagen_original||it.image||it.imagen||it.foto||''
      if(imgSrc){
        const src=String(imgSrc).trim()
        if(src){
          if(src.startsWith('http://')||src.startsWith('https://')) imagen=src
          else if(src.startsWith('//')) imagen=`https:${src}`
          else if(src.startsWith('data:image')) imagen=src
          else if(src.startsWith('/')) imagen=`https://mbr.demachine.co${src}`
          else imagen=`https://mbr.demachine.co/${src}`
        }
      }
      const stockRaw=it.quantity??it.stock??it.stockBodega??it.cantidad??it.disponible
      let stock=0
      if(stockRaw!=null && String(stockRaw).trim()!==''){
        const parsed=parseInt(String(stockRaw).replace(/[^0-9-]/g,''),10)
        stock=isNaN(parsed)?0:Math.max(0,parsed)
      }
      const marca=it.brand||it.marca||String(raw).split(' ')[0]||'MBR'
      const color=it.color||it.color_original||it.color_text||''
      const tipo=it.category||it.categoria||it.tipo||it.tipo_producto||it.genero||''
      const ex=mbrMap.get(key)
      if(!ex || (imagen && !ex.imagen) || (stock>ex.stock)){
        mbrMap.set(key,{precio, imagen, talla, stock, raw, limpia, marca, color, tipo})
      }
      const exRef=mbrMapByRef.get(limpia)
      if(!exRef || (imagen && !exRef.imagen) || (stock>exRef.stock)){
        mbrMapByRef.set(limpia,{precio, imagen, talla, stock, raw, limpia, marca, color, tipo})
      }
    }

    let empresasIds=[]
    if(empresa_id) empresasIds=[empresa_id]
    else{
      try{
        let from=0; const set=new Set()
        while(from<10000){
          const { data }=await supabase.from('listado_maestro_proveedor').select('empresa_id').range(from, from+999)
          if(!data||!data.length) break
          data.forEach(d=>{ const id=String(d.empresa_id||'').trim(); if(id) set.add(id) })
          if(data.length<1000) break
          from+=1000
        }
        empresasIds=Array.from(set)
      }catch{}
      if(empresasIds.length===0) empresasIds=['9']
    }

    let existentesMap=new Map()
    for(const empId of empresasIds){
      let from=0
      while(from<10000){
        try{
          const { data }=await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empId).range(from, from+999)
          if(!data||!data.length) break
          for(const r of data){
            const k=`${String(r.empresa_id).trim()}||${String(r.referencia).trim()}||${String(r.talla).trim()}`.toUpperCase()
            if(!existentesMap.has(k)) existentesMap.set(k,r)
          }
          if(data.length<1000) break
          from+=1000
          if(Date.now()-t0>54000) break
        }catch{ break }
      }
    }
    const existentes=Array.from(existentesMap.values())

    let rowsActualizar=[]
    let noMatch=0, nuevos=0
    for(const ex of existentes){
      const refLimpia=limpiarRef(ex.referencia).toUpperCase()
      if(!refLimpia){ noMatch++; continue }
      const tallaEx=String(ex.talla||'40').trim().toUpperCase()
      let mbr=mbrMap.get(`${refLimpia}||${tallaEx}`) || mbrMapByRef.get(refLimpia)
      if(!mbr){ noMatch++; continue }
      rowsActualizar.push({
        empresa_id: String(ex.empresa_id).trim(),
        referencia: String(ex.referencia).trim(),
        talla: String(mbr.talla||ex.talla||'40').trim(),
        precio: mbr.precio,
        stock_proveedor: mbr.stock,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: mbr.imagen || ex.imagen_original || null,
        marca: mbr.marca || ex.marca || null,
        color: mbr.color || ex.color || null,
        tipo_producto: mbr.tipo || ex.tipo_producto || null,
        fecha_escaneo: new Date().toISOString()
      })
    }
    const existentesKeys=new Set(existentes.map(ex=>`${String(ex.empresa_id).trim()}||${limpiarRef(ex.referencia).toUpperCase()}||${String(ex.talla||'40').trim().toUpperCase()}`.toUpperCase()))
    for(const d of mbrMap.values()){
      for(const empId of empresasIds){
        const k=`${empId}||${d.limpia}||${String(d.talla).trim().toUpperCase()}`.toUpperCase()
        if(!existentesKeys.has(k)){
          rowsActualizar.push({
            empresa_id: empId,
            referencia: d.raw,
            talla: d.talla,
            precio: d.precio,
            stock_proveedor: d.stock,
            proveedor_nombre: 'MBR - MÁXIMA',
            imagen_original: d.imagen,
            marca: d.marca,
            color: d.color,
            tipo_producto: d.tipo,
            fecha_escaneo: new Date().toISOString()
          })
          if(empId===empresasIds[0]) nuevos++
        }
      }
    }
    if(rowsActualizar.length===0){
      const target=empresa_id||empresasIds[0]||'9'
      for(const d of mbrMap.values()){
        rowsActualizar.push({
          empresa_id: target,
          referencia: d.raw,
          talla: d.talla,
          precio: d.precio,
          stock_proveedor: d.stock,
          proveedor_nombre: 'MBR - MÁXIMA',
          imagen_original: d.imagen,
          marca: d.marca,
          color: d.color,
          tipo_producto: d.tipo,
          fecha_escaneo: new Date().toISOString()
        })
      }
    }

    const total=rowsActualizar.length
    const sliceRows=rowsActualizar.slice(offset, offset+limit)
    const hasMore=offset+limit<total
    const nextOffset=hasMore?offset+limit:null

    let guardados=0, errores=[]
    for(let i=0;i<sliceRows.length;i+=10){
      if(Date.now()-t0>54000) break
      const chunk=sliceRows.slice(i,i+10)
      let saved=false
      for(const conflict of ['empresa_id,referencia,talla','empresa_id,referencia']){
        try{
          const r1=await supabase.from('listado_maestro_proveedor').upsert(chunk,{onConflict:conflict})
          if(!r1.error){ guardados+=chunk.length; saved=true; break }
          throw r1.error
        }catch{ continue }
      }
      if(!saved){
        for(const s of chunk){
          for(const conflict of ['empresa_id,referencia,talla','empresa_id,referencia']){
            try{
              const rr=await supabase.from('listado_maestro_proveedor').upsert(s,{onConflict:conflict})
              if(!rr.error){ guardados++; saved=true; break }
            }catch{}
          }
          if(!saved){
            try{
              const simple={ empresa_id:s.empresa_id, referencia:s.referencia, talla:s.talla, precio:s.precio, stock_proveedor:s.stock_proveedor, proveedor_nombre:s.proveedor_nombre, imagen_original:s.imagen_original, fecha_escaneo:s.fecha_escaneo }
              const rr=await supabase.from('listado_maestro_proveedor').upsert(simple,{onConflict:conflict})
              if(!rr.error) guardados++
            }catch{}
          }
        }
      }
    }

    return res.status(200).json({
      ok:true, total, guardados, nuevos, noMatch,
      conPrecio: sliceRows.filter(r=>r.precio>0).length,
      conFoto: sliceRows.filter(r=>r.imagen_original).length,
      offset, nextOffset, hasMore,
      proveedor:'MBR - MÁXIMA',
      modo:`V12_FINAL_${guardados}_TOTAL_${total}_NUEVOS_${nuevos}_NOMATCH_${noMatch}_CON_MARCA_COLOR_TIPO`,
      tiempo_ms:Date.now()-t0,
      sample: sliceRows.slice(0,5).map(r=>`${r.marca||''} ${limpiarRef(r.referencia)} $${r.precio} T:${r.talla} Color:${r.color||''} Tipo:${r.tipo_producto||''}`),
      errores: errores.slice(0,3)
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
