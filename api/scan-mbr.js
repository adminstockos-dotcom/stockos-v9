// /api/scan-mbr.js - STOCKOS V9 FINAL - MBR precio real $65k directo de indexMe
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN en Vercel'})
    const empresa_id = req.query.empresa_id // opcional
    const maxPerPage = 100
    let page = 1, totalPages = 1, total = 0, guardadosMaestro = 0, guardadosListado = 0
    let errores = []

    // Traer todas las paginas de MBR
    const allResults = []
    do{
      const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=${maxPerPage}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } })
      const txt = await r.text()
      if(!r.ok){
        if(r.status===401) return res.status(401).json({ok:false, error:'MBR 401 - TOKEN EXPIRADO', hint:'Renovar token en Network > indexMe > Authorization', body: txt.slice(0,300)})
        throw new Error(`MBR API ${r.status}: ${txt.slice(0,400)}`)
      }
      let j; try{ j = JSON.parse(txt) }catch{ throw new Error('MBR no JSON: '+txt.slice(0,300)) }
      const data = j.data || j
      totalPages = data.info?.pages || 1
      const results = data.results || []
      allResults.push(...results)
      page++
      if(page>50) break
    }while(page<=totalPages)

    total = allResults.length

    // 1) Guardar en productos_maestro con precio real
    for(const r of allResults){
      const ref = (r.product || '').trim().slice(0,250)
      if(!ref) continue
      const payload = {
        referencia: ref,
        nombre: r.product,
        precio: parseInt(r.price,10) || 0,
        stock: parseInt(r.quantity,10) || 10,
        talla: r.size || 'M',
        marca: r.brand,
        codigo: r.code,
        color: r.color,
        product_id: r.product_id,
        warehouse: r.warehouse,
        mbr_id: r.id,
        imagen: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_original: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        precio_costo: parseInt(r.price,10) || 0,
        precio_venta: parseInt(r.price,10) || 0,
        updated_at: new Date().toISOString()
      }
      // intenta upsert, si falla ignora columna por columna
      let { error } = await supabase.from('productos_maestro').upsert(payload, { onConflict: 'referencia' })
      if(error){
        // fallback sin columnas nuevas
        const simple = { referencia: ref, precio: payload.precio, stock: payload.stock, talla: payload.talla, marca: payload.marca, imagen_original: payload.imagen_original, updated_at: payload.updated_at }
        const { error: e2 } = await supabase.from('productos_maestro').upsert(simple, { onConflict: 'referencia' })
        if(!e2) guardadosMaestro++; else errores.push(e2.message)
      }else{
        guardadosMaestro++
      }
    }

    // 2) Si hay empresa_id, copiar a listado_maestro_proveedor (evita 400 usando insert simple)
    if(empresa_id){
      for(const r of allResults){
        const ref = (r.product || '').trim().slice(0,250)
        const payload = {
          empresa_id: empresa_id,
          referencia: ref,
          talla: r.size || 'M',
          precio: parseInt(r.price,10) || 0,
          stock_proveedor: parseInt(r.quantity,10) || 10,
          proveedor_nombre: 'MBR - MÁXIMA',
          imagen_original: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
          fecha_escaneo: new Date().toISOString()
        }
        const { error } = await supabase.from('listado_maestro_proveedor').upsert(payload, { onConflict: 'empresa_id,referencia,talla' })
        if(!error) guardadosListado++
        else{
          // si falla el onConflict, prueba insert sin conflicto
          const { error: e2 } = await supabase.from('listado_maestro_proveedor').insert(payload)
          if(!e2) guardadosListado++; else errores.push(e2.message.slice(0,200))
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total,
      guardados: guardadosMaestro,
      guardadosListado,
      proveedor:'MBR - MÁXIMA',
      precio_ejemplo: allResults[0]?.price,
      producto_ejemplo: allResults[0]?.product,
      totalPages
    })
  }catch(e){
    console.error(e)
    return res.status(500).json({ok:false, error: e.message})
  }
}
