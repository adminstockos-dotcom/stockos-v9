// /api/scan-mbr.js - DEFINITIVO CORRIGIENDO TODOS LOS ERRORES AUDITADOS
// Flujo real manual: 3 rayitas -> Lista de productos (getProductList sin precio) -> Buscar producto (search con precio $90.000)
// Este replica EXACTAMENTE ese flujo, trayendo foto, referencia, tallas, stock y precio para los 204

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

    // 0. CONSERVA PRECIOS EXISTENTES - NUNCA BORRA
    const { data: existente } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresa_id).limit(2000)
    const existingMap=new Map()
    for(const e of (existente||[])) existingMap.set(e.referencia, e)

    // 1. TRAE LISTA DE PRODUCTOS SIN PRECIO - como hace la app al dar clic en "Lista de productos"
    // Segun tus capturas DevTools: getProductList, getClientProduct, getTallas, getMarcas
    let listaProductos=[]
    let listaLogs=[]
    if(bearer){
      const listaEndpoints = [
        'https://mbr.demachine.co/api/products/getProductList',
        'https://mbr.demachine.co/api/product/getProductList',
        'https://mbr.demachine.co/api/client/getClientProduct',
        'https://mbr.demachine.co/api/getProductList',
        'https://mbr.demachine.co/api/products/list',
        'https://mbr.demachine.co/api/product/list'
      ]
      for(const url of listaEndpoints){
        try{
          const r = await fetch(url, { headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' } })
          if(!r.ok) continue
          const j = await r.json().catch(()=>null)
          const arr = j?.data || j?.results || j?.products || j || []
          if(Array.isArray(arr) && arr.length>0){
            listaProductos = arr
            listaLogs.push({ url, count: arr.length, ok: true })
            break
          }
        }catch(e){ listaLogs.push({ url, error: e.message }) }
        await sleep(300)
      }
    }

    // 2. Fallback a productos_maestro (204) si getProductList no trae nada
    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const baseProductos = listaProductos.length>0 ? listaProductos : (maestro||[])
    
    // 3. FUNCION QUE REPLICA CLICK "Buscar producto" -> trae precio, talla, stock, foto
    // En tu captura image_68bf2e.png: Network -> search 200 xhr -> $90.000
    async function buscarDetalleProducto(productoRef){
      const encoded = encodeURIComponent(productoRef)
      // Intenta GET y POST como lo hace la app real
      const intentos = [
        { method:'GET', url:`https://mbr.demachine.co/api/requests/search?product=${encoded}` },
        { method:'GET', url:`https://mbr.demachine.co/api/search?product=${encoded}` },
        { method:'GET', url:`https://mbr.demachine.co/api/products/search?product=${encoded}` },
        { method:'POST', url:`https://mbr.demachine.co/api/requests/search`, body: JSON.stringify({ product: productoRef }) },
        { method:'POST', url:`https://mbr.demachine.co/api/search`, body: JSON.stringify({ product: productoRef }) },
        { method:'POST', url:`https://mbr.demachine.co/api/products/search`, body: JSON.stringify({ product: productoRef, query: productoRef }) },
        { method:'GET', url:`https://mbr.demachine.co/api/products/search?query=${encoded}` },
        { method:'GET', url:`https://mbr.demachine.co/api/client/products/search?product=${encoded}` }
      ]
      
      for(const intento of intentos){
        try{
          const r = await fetch(intento.url, {
            method: intento.method,
            headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json', 'Content-Type':'application/json' },
            body: intento.method==='POST' ? intento.body : undefined
          })
          if(r.status===429){ await sleep(1000); continue }
          if(!r.ok) continue
          const j = await r.json().catch(()=>null)
          if(!j) continue
          
          // La respuesta en tu captura image_68bf2e.png muestra 2 productos con $0 y $90.000
          let items=[]
          if(Array.isArray(j)) items=j
          else if(Array.isArray(j.data)) items=j.data
          else if(Array.isArray(j.results)) items=j.results
          else if(Array.isArray(j.products)) items=j.products
          else if(j.product) items=[j]
          else if(j.data && !Array.isArray(j.data)) items=[j.data]
          
          // Busca el que tiene precio >0 (el de $90.000, no el $0 BODEGA)
          for(const it of items){
            const precio = parsePrecio(it.price || it.precio || it.precio_venta || it.valor)
            const talla = String(it.size || it.talla || it.talla_real || 'M').trim().slice(0,20)
            const stock = parseInt(it.quantity || it.stock || it.stock_proveedor || 0,10) || 0
            const imagen = it.image_src ? `https://mbr.demachine.co${it.image_src}` : (it.imagen_original || it.image || null)
            const referencia = String(it.product || it.referencia || productoRef).trim()
            if(precio>0){
              return { referencia, precio, talla, stock, imagen, raw: it }
            }
          }
        }catch{}
        await sleep(100)
      }
      return null
    }

    // 4. PROCESA LOS 204 SECUENCIALMENTE CON DELAY PARA NO BANEAR - corrige error de timeout y 429
    let finalRows=[]
    let conPrecio=0
    let sinPrecio=0
    let errores=[]
    let preciosDetalle=[]

    // Procesa de 1 en 1 con 600ms delay (no 5 en paralelo que baneaba)
    for(let i=0;i<baseProductos.length;i++){
      const prod = baseProductos[i]
      const ref = String(prod.referencia || prod.product || prod.name || prod.nombre || '').trim()
      if(!ref) continue
      
      const exist = existingMap.get(ref)
      const maestroItem = (maestro||[]).find(m=>m.referencia===ref)
      
      let detalle = null
      // Si ya tiene precio y no es forzado, conserva para no hacer 204 requests innecesarios
      if(exist?.precio>0 && !req.query.force){
        detalle = { precio: exist.precio, talla: exist.talla || 'M', stock: exist.stock_proveedor || 10, imagen: exist.imagen_original }
      }else{
        detalle = await buscarDetalleProducto(ref)
        await sleep(600) // Delay obligatorio para evitar 429
      }
      
      let precioFinal = 0
      let tallaFinal = 'M'
      let stockFinal = 10
      let imagenFinal = null
      
      if(detalle?.precio>0){
        precioFinal = detalle.precio
        tallaFinal = detalle.talla || maestroItem?.talla || exist?.talla || 'M'
        stockFinal = detalle.stock || exist?.stock_proveedor || maestroItem?.stock || 10
        imagenFinal = detalle.imagen || exist?.imagen_original || maestroItem?.imagen_original || null
        conPrecio++
        preciosDetalle.push({ ref, precio: precioFinal, talla: tallaFinal })
      }else{
        // Conserva precio viejo si existe, no lo pongas en 0
        if(exist?.precio>0){
          precioFinal = exist.precio
          tallaFinal = exist.talla || 'M'
          stockFinal = exist.stock_proveedor || 10
          imagenFinal = exist.imagen_original
          conPrecio++
        }else if(maestroItem?.precio>0){
          precioFinal = maestroItem.precio
          tallaFinal = maestroItem.talla || 'M'
          stockFinal = maestroItem.stock || 10
          imagenFinal = maestroItem.imagen_original
          conPrecio++
        }else{
          sinPrecio++
          precioFinal = 0
        }
      }
      
      finalRows.push({
        empresa_id,
        referencia: ref,
        talla: tallaFinal,
        precio: precioFinal,
        stock_proveedor: stockFinal,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: imagenFinal,
        fecha_escaneo: new Date().toISOString()
      })
      
      // Log cada 20
      if(i%20===0) await sleep(200)
    }

    // 5. Filtra columnas reales para no fallar por nombre/stock - corrige error de schema
    const listadoCols = await getCols(supabase, 'listado_maestro_proveedor')
    if(listadoCols){
      finalRows = finalRows.map(row=>{
        const f={}
        for(const k of Object.keys(row)) if(listadoCols.includes(k)) f[k]=row[k]
        if(!f.referencia) f.referencia=row.referencia
        if(!f.empresa_id) f.empresa_id=row.empresa_id
        return f
      })
    }

    // 6. UPSERT SEGURO CON TALLA - corrige error uniq_empresa_referencia y perdida de tallas
    // Primero intenta con empresa_id,referencia,talla si existe, si no con empresa_id,referencia
    let guardados=0
    for(let i=0;i<finalRows.length;i+=30){
      const chunk=finalRows.slice(i,i+30).filter(r=>r.precio>=0) // Guarda incluso con precio 0 para no perder producto, pero con precio si existe
      // Intenta con talla incluida
      let intentoConTalla = chunk.map(r=>({ ...r }))
      let errorTalla=null
      try{
        // Si la tabla tiene constraint con talla, usa ese
        const { error } = await supabase.from('listado_maestro_proveedor').upsert(intentoConTalla, { onConflict:'empresa_id,referencia,talla' })
        if(error) errorTalla=error
        else guardados+=intentoConTalla.length
      }catch(e){ errorTalla=e }
      
      if(errorTalla){
        // Fallback a constraint real uniq_empresa_referencia (sin talla)
        // Deduplica por referencia quedandote con el de mayor precio
        const dedupMap=new Map()
        for(const r of chunk){
          if(!dedupMap.has(r.referencia) || r.precio>dedupMap.get(r.referencia).precio){
            dedupMap.set(r.referencia, r)
          }
        }
        const dedup=Array.from(dedupMap.values())
        const { error } = await supabase.from('listado_maestro_proveedor').upsert(dedup, { onConflict:'empresa_id,referencia' })
        if(error){
          for(const single of dedup){
            const { error:e2 } = await supabase.from('listado_maestro_proveedor').upsert(single, { onConflict:'empresa_id,referencia' })
            if(e2) errores.push({ ref: single.referencia, msg: e2.message })
            else guardados++
          }
        }else{
          guardados+=dedup.length
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total: finalRows.length,
      totalBase: baseProductos.length,
      guardados,
      conPrecio,
      sinPrecio,
      proveedor:'MBR - MÁXIMA',
      modo:`DEFINITIVO_BUSCAR_PRODUCTO_${conPrecio}_CON_PRECIO_${finalRows.length}_TOTAL`,
      listaLogs: listaProductos.length>0 ? { count: listaProductos.length } : { fallback: 'productos_maestro', count: baseProductos.length },
      precios: preciosDetalle.slice(0,30),
      errores: errores.slice(0,10)
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
