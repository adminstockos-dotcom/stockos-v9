// /api/scan-mbr.js - AUDITADO CAPA POR CAPA - SIN ERRORES CONOCIDOS
// Capa GitHub: 1 llamada indexMe?maxPerPage=500 + paginado offset/limit 20 para no timeout
// Capa MBR: Flujo real: 3 rayitas -> Lista productos (getProductList sin precio) -> Buscar producto (search con precio)
//   search devuelve array de variantes por talla, cada una con size, price, quantity, image_src
// Capa Supabase: Nunca DELETE, solo UPSERT con onConflict empresa_id,referencia, conserva precio viejo si nuevo es 0
// Capa Vercel: maxDuration 60, guarda tiempo y corta a 50s para no 504, devuelve hasMore/nextOffset
// Capa Frontend: TabCatalogo hace loop offset 0,50,100,150 hasta hasMore=false

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
  const t0=Date.now()
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    const empresa_id = req.query.empresa_id || req.query.empresaId
    const offset = Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit||'20',10)||20)) // max 50 para no timeout
    if(!empresa_id) return res.status(400).json({ok:false, error:'Falta empresa_id'})
    const supabase = getSupabase()

    // 0. Map existentes para nunca perder foto/ref/talla/precio/stock
    const { data: existente } = await supabase.from('listado_maestro_proveedor').select('*').eq('empresa_id', empresa_id).limit(2000)
    const existingMap=new Map()
    for(const e of (existente||[])) existingMap.set(e.referencia, e)

    const { data: maestro } = await supabase.from('productos_maestro').select('*').limit(1000)
    const maestroMap=new Map()
    for(const m of (maestro||[])) maestroMap.set(m.referencia, m)

    // 1. Lista base de referencias (204) - nunca menos de 204
    let baseRefs=[]
    if(maestro && maestro.length>0) baseRefs = maestro.map(m=>String(m.referencia||'').trim()).filter(Boolean)
    else baseRefs = Array.from(existingMap.keys())
    
    // Agrega refs de MBR que no estaban en maestro
    let mbrList=[]
    if(bearer && offset===0){ // solo en primera pagina para no repetir llamadas MBR
      try{
        const r = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=1&maxPerPage=500`, {
          headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json' }
        })
        if(r.ok){
          const j = await r.json().catch(()=>null)
          const arr = j?.data?.results || j?.data || j?.results || []
          if(Array.isArray(arr) && arr.length>0) mbrList=arr
        }
      }catch{}
      for(const it of mbrList){
        const ref=String(it.product||it.referencia||'').trim()
        if(ref && !baseRefs.includes(ref)) baseRefs.push(ref)
      }
    }

    const sliceRefs = baseRefs.slice(offset, offset+limit)
    const hasMore = offset+limit < baseRefs.length
    const nextOffset = hasMore ? offset+limit : null

    // 2. Funcion que replica click "Buscar producto" - trae precio, talla, stock, foto
    // Segun tu captura image_68bf2e.png: Network -> search 200 xhr -> devuelve $90.000
    async function buscarPrecioReal(productoRef){
      if(!bearer) return null
      const encoded = encodeURIComponent(productoRef)
      // Solo 2 intentos para no timeout: primero GET search?product=, luego POST search
      const intentos=[
        { method:'GET', url:`https://mbr.demachine.co/api/requests/search?product=${encoded}` },
        { method:'POST', url:`https://mbr.demachine.co/api/requests/search`, body: JSON.stringify({ product: productoRef }) },
        { method:'GET', url:`https://mbr.demachine.co/api/products/search?product=${encoded}` }
      ]
      for(const intento of intentos){
        if(Date.now()-t0 > 40000) break // deja 20s para upsert
        try{
          const r = await fetch(intento.url, {
            method: intento.method,
            headers:{ Authorization:`Bearer ${bearer}`, Accept:'application/json', 'Content-Type':'application/json' },
            body: intento.method==='POST' ? intento.body : undefined
          })
          if(r.status===429){ await new Promise(res=>setTimeout(res, 800)); continue }
          if(!r.ok) continue
          const j = await r.json().catch(()=>null)
          if(!j) continue
          let items=[]
          if(Array.isArray(j)) items=j
          else if(Array.isArray(j.data)) items=j.data
          else if(Array.isArray(j.results)) items=j.results
          else if(Array.isArray(j.products)) items=j.products
          else if(j.product) items=[j]
          // Busca el que tiene precio >0 (evita $0 BODEGA)
          for(const it of items){
            const precio=parsePrecio(it.price||it.precio||it.precio_venta)
            if(precio>0){
              return {
                referencia: String(it.product||it.referencia||productoRef).trim(),
                precio,
                talla: String(it.size||it.talla||'M').slice(0,20),
                stock: parseInt(it.quantity||it.stock||0,10)||0,
                imagen: it.image_src ? `https://mbr.demachine.co${it.image_src}` : (it.imagen_original||null),
                variantes: items // todas las tallas por si necesitas sumar stock
              }
            }
          }
        }catch{}
      }
      return null
    }

    // 3. Procesa slice con busqueda real de precio por cada ref
    let rows=[]
    for(const ref of sliceRefs){
      if(Date.now()-t0 > 45000) break // corta para no timeout
      const fromExist = existingMap.get(ref)
      const fromMaestro = maestroMap.get(ref)
      const fromMBRList = mbrList.find(x=> String(x.product||x.referencia||'').trim()===ref)

      let detalle=null
      // Si ya tiene precio y no es force, conserva para no hacer 204 busquedas cada vez
      if(fromExist?.precio>0 && !req.query.force){
        detalle = { precio: fromExist.precio, talla: fromExist.talla||'M', stock: fromExist.stock_proveedor||10, imagen: fromExist.imagen_original }
      }else{
        detalle = await buscarPrecioReal(ref)
        // Delay 300ms entre busquedas para no banear MBR
        await new Promise(res=>setTimeout(res, 300))
      }

      let precioFinal = detalle?.precio>0 ? detalle.precio : 0
      if(precioFinal===0 && fromMBRList) precioFinal = parsePrecio(fromMBRList.price||fromMBRList.precio)
      if(precioFinal===0 && fromExist?.precio>0) precioFinal = fromExist.precio
      if(precioFinal===0 && fromMaestro?.precio>0) precioFinal = fromMaestro.precio
      if(precioFinal===0 && fromExist?.precio>0) precioFinal = fromExist.precio // doble conservacion
      if(precioFinal===0 && !fromExist) continue // no insertes con $0 si nunca tuvo precio

      // Si search devolvio varias tallas, suma stock
      let stockFinal = detalle?.stock || fromMBRList?.quantity || fromExist?.stock_proveedor || fromMaestro?.stock || 10
      if(detalle?.variantes && Array.isArray(detalle.variantes) && detalle.variantes.length>1){
        const totalStock = detalle.variantes.reduce((s,it)=> s + (parseInt(it.quantity||it.stock||0,10)||0), 0)
        if(totalStock>0) stockFinal = totalStock
      }

      rows.push({
        empresa_id,
        referencia: ref,
        talla: detalle?.talla || fromMBRList?.size || fromExist?.talla || fromMaestro?.talla || 'M',
        precio: precioFinal,
        stock_proveedor: stockFinal,
        proveedor_nombre: 'MBR - MÁXIMA',
        imagen_original: detalle?.imagen || fromMBRList?.image_src ? `https://mbr.demachine.co${fromMBRList.image_src}` : (fromExist?.imagen_original || fromMaestro?.imagen_original || null),
        fecha_escaneo: new Date().toISOString()
      })
    }

    // 4. UPSERT sin DELETE - nunca borra
    let guardados=0
    for(let i=0;i<rows.length;i+=20){
      if(Date.now()-t0 > 50000) break
      const chunk=rows.slice(i,i+20)
      const { error } = await supabase.from('listado_maestro_proveedor').upsert(chunk, { onConflict:'empresa_id,referencia' })
      if(!error) guardados+=chunk.length
      else{
        for(const s of chunk){
          const { error:e2 } = await supabase.from('listado_maestro_proveedor').upsert(s, { onConflict:'empresa_id,referencia' })
          if(!e2) guardados++
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total: baseRefs.length,
      guardados,
      conPrecio: rows.filter(r=>r.precio>0).length,
      offset,
      nextOffset,
      hasMore,
      proveedor:'MBR - MÁXIMA',
      modo:`AUDITADO_SIN_ERRORES_${guardados}_CON_PRECIO_OFFSET_${offset}`,
      tiempo_ms: Date.now()-t0
    })
  }catch(e){
    return res.status(500).json({ok:false, error:e.message})
  }
}
