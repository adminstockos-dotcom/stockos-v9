// /api/scan-mbr.js - FIX BRUTO 207 refs - ignora pages, recorre 30 paginas
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
    
    // FUERZA BRUTA: recorre 30 paginas de 10 en 10 = 300 productos max
    // asi trae los 207 aunque el API diga pages=1
    for(let page=1; page<=30; page++){
      const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=100`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } })
      const txt = await r.text()
      if(!r.ok){
        if(r.status===401) return res.status(401).json({ok:false, error:'TOKEN 401', body: txt.slice(0,200)})
        break
      }
      let j
      try{ j = JSON.parse(txt) }catch{ break }
      const data = j.data || j
      const results = data.results || []
      if(results.length===0) break
      allResults.push(...results)
      // si esta pagina trajo menos de 10, ya no hay mas
      if(results.length < 10) break
    }

    if(allResults.length===0) return res.status(500).json({ok:false, error:'MBR devolvio 0 productos'})

    let guardadosListado = 0
    let guardadosMaestro = 0

    for(const r of allResults){
      const refFull = String(r.product || '').trim()
      if(!refFull) continue
      const precio = parseInt(r.price,10) || 65000
      const stock = parseInt(r.quantity,10) || 1
      const talla = r.size || 'M'
      const img = r.image_src ? `https://mbr.demachine.co${r.image_src}` : null

      // productos_maestro minimo
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

      // listado por empresa
      if(empresa_id){
        try{
          // upsert simple sin onConflict para evitar 400
          const { data: existente } = await supabase.from('listado_maestro_proveedor')
            .select('id').eq('empresa_id', empresa_id).eq('referencia', refFull.slice(0,250)).eq('talla', talla).limit(1).maybeSingle()
          
          if(existente){
            await supabase.from('listado_maestro_proveedor').update({
              precio: precio,
              stock_proveedor: stock,
              imagen_original: img,
              fecha_escaneo: new Date().toISOString()
            }).eq('id', existente.id)
          } else {
            await supabase.from('listado_maestro_proveedor').insert({
              empresa_id: empresa_id,
              referencia: refFull.slice(0,250),
              talla: talla,
              precio: precio,
              stock_proveedor: stock,
              proveedor_nombre: 'MBR - MÁXIMA',
              imagen_original: img,
              fecha_escaneo: new Date().toISOString()
            })
          }
          guardadosListado++
        }catch(e){
          // ultimo intento upsert
          try{
            await supabase.from('listado_maestro_proveedor').upsert({
              empresa_id: empresa_id,
              referencia: refFull.slice(0,250),
              talla: talla,
              precio: precio,
              stock_proveedor: stock,
              proveedor_nombre: 'MBR - MÁXIMA',
              imagen_original: img,
              fecha_escaneo: new Date().toISOString()
            }, { onConflict: 'empresa_id,referencia,talla' })
            guardadosListado++
          }catch{}
        }
      }
    }

    return res.status(200).json({
      ok:true,
      total: allResults.length,
      guardados: guardadosListado,
      guardadosListado,
      guardadosMaestro,
      proveedor:'MBR - MÁXIMA',
      ejemplo: allResults[0]?.product + ' $' + allResults[0]?.price
    })
  }catch(e){
    return res.status(500).json({ok:false, error: e.message})
  }
}
