// /api/scan-mbr.js - CORRECCION REAL 207 - sin maxPerPage, paginacion 10 en 10
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    const empresa_id = req.query.empresa_id || null
    
    const allResults = []
    
    // MBR por defecto devuelve 10 por pagina. NO mandar maxPerPage, solo page
    for(let page=1; page<=50; page++){
      const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } })
      const txt = await r.text()
      if(!r.ok) break
      const j = JSON.parse(txt)
      const data = j.data || j
      const results = data.results || []
      if(results.length===0) break
      allResults.push(...results)
      const info = data.info || {}
      const totalPages = info.pages || info.total_pages || 30
      // si ya llegamos a la ultima pagina reportada y la pagina trajo menos de 10, parar
      if(page >= totalPages && results.length < 10) break
      if(allResults.length >= 300) break
      if(results.length < 10 && page > 1) {
        // puede ser ultima pagina
        if(page >= totalPages) break
      }
    }

    if(allResults.length===0) return res.status(500).json({ok:false, error:'MBR 0 resultados'})

    let guardadosListado = 0
    let guardadosMaestro = 0

    for(const r of allResults){
      const refFull = String(r.product || '').trim()
      if(!refFull) continue
      const precio = parseInt(r.price,10) || 0
      const stock = parseInt(r.quantity,10) || 1
      const talla = r.size || 'M'
      const img = r.image_src ? `https://mbr.demachine.co${r.image_src}` : null

      try{
        await supabase.from('productos_maestro').upsert({
          referencia: refFull.slice(0,250),
          nombre: refFull.slice(0,250),
          precio: precio,
          stock: stock,
          talla: talla,
          imagen_original: img,
          updated_at: new Date().toISOString()
        }, { onConflict: 'referencia' })
        guardadosMaestro++
      }catch{}

      if(empresa_id){
        try{
          const { data: ex } = await supabase.from('listado_maestro_proveedor')
            .select('id').eq('empresa_id', empresa_id).eq('referencia', refFull.slice(0,250)).eq('talla', talla).maybeSingle()
          if(ex){
            await supabase.from('listado_maestro_proveedor').update({
              precio: precio, stock_proveedor: stock, imagen_original: img, fecha_escaneo: new Date().toISOString()
            }).eq('id', ex.id)
          } else {
            await supabase.from('listado_maestro_proveedor').insert({
              empresa_id, referencia: refFull.slice(0,250), talla, precio, stock_proveedor: stock,
              proveedor_nombre: 'MBR - MÁXIMA', imagen_original: img, fecha_escaneo: new Date().toISOString()
            })
          }
          guardadosListado++
        }catch{
          try{
            await supabase.from('listado_maestro_proveedor').upsert({
              empresa_id, referencia: refFull.slice(0,250), talla, precio, stock_proveedor: stock,
              proveedor_nombre: 'MBR - MÁXIMA', imagen_original: img, fecha_escaneo: new Date().toISOString()
            }, { onConflict: 'empresa_id,referencia,talla' })
            guardadosListado++
          }catch{}
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total: allResults.length,
      guardados: guardadosListado || guardadosMaestro,
      guardadosListado,
      guardadosMaestro,
      proveedor:'MBR - MÁXIMA'
    })
  }catch(e){
    return res.status(500).json({ok:false, error: e.message})
  }
}
