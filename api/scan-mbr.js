// /api/scan-mbr.js - FIX DEFINITIVO - trae TODOS y guarda 207
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res){
  try{
    const bearer = process.env.MBR_BEARER_TOKEN
    if(!bearer) return res.status(500).json({ok:false, error:'Falta MBR_BEARER_TOKEN'})
    const empresa_id = req.query.empresa_id || req.query.empresaId || null
    
    const allResults = []
    let page = 1
    const maxPerPage = 100
    let totalPages = 1
    
    // LOOP TODAS LAS PAGINAS
    while(true){
      const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=${maxPerPage}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } })
      const txt = await r.text()
      if(!r.ok){
        if(r.status===401) return res.status(401).json({ok:false, error:'TOKEN MBR EXPIRADO - renovar', body: txt.slice(0,200)})
        throw new Error(`MBR ${r.status}: ${txt.slice(0,300)}`)
      }
      const j = JSON.parse(txt)
      const data = j.data || j
      totalPages = data.info?.pages || data.pages || 1
      const results = data.results || j.results || []
      if(results.length===0) break
      allResults.push(...results)
      if(page >= totalPages) break
      page++
      if(page>10) break // seguridad
    }

    let guardadosListado = 0
    let guardadosMaestro = 0
    let errores = []

    // Guardar
    for(const r of allResults){
      const refFull = (r.product || '').trim()
      if(!refFull) continue
      const precio = parseInt(r.price,10) || 65000
      const stock = parseInt(r.quantity,10) || 1
      const talla = r.size || 'M'
      const img = r.image_src ? `https://mbr.demachine.co${r.image_src}` : null

      // 1) productos_maestro - MINIMO para no fallar
      try{
        const p1 = {
          referencia: refFull.slice(0,250),
          nombre: refFull.slice(0,250),
          precio: precio,
          stock: stock,
          talla: talla,
          imagen_original: img,
          updated_at: new Date().toISOString()
        }
        const { error } = await supabase.from('productos_maestro').upsert(p1, { onConflict: 'referencia' })
        if(!error) guardadosMaestro++
      }catch(e){}

      // 2) listado_maestro_proveedor - ESTE es el que usa tu tabla
      if(empresa_id){
        try{
          const p2 = {
            empresa_id: empresa_id,
            referencia: refFull.slice(0,250),
            talla: talla,
            precio: precio,
            stock_proveedor: stock,
            proveedor_nombre: 'MBR - MÁXIMA',
            imagen_original: img,
            fecha_escaneo: new Date().toISOString()
          }
          // intenta upsert
          let { error } = await supabase.from('listado_maestro_proveedor').upsert(p2, { onConflict: 'empresa_id,referencia,talla' })
          if(error){
            // fallback: delete + insert si el constraint es distinto
            await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresa_id).eq('referencia', p2.referencia).eq('talla', talla)
            const { error: e2 } = await supabase.from('listado_maestro_proveedor').insert(p2)
            if(!e2) guardadosListado++
            else errores.push(e2.message.slice(0,100))
          } else {
            guardadosListado++
          }
        }catch(e){ errores.push(String(e).slice(0,100)) }
      }
    }

    return res.status(200).json({
      ok:true,
      total: allResults.length,
      guardados: guardadosListado || guardadosMaestro,
      guardadosListado,
      guardadosMaestro,
      proveedor:'MBR - MÁXIMA',
      totalPages,
      precio_ejemplo: allResults[0]?.price,
      producto_ejemplo: allResults[0]?.product,
      errores: errores.slice(0,3)
    })
  }catch(e){
    console.error(e)
    return res.status(500).json({ok:false, error: e.message})
  }
}
