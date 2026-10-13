// api/scan-mbr.js - FIX para traer precios de MBR
// Reemplaza tu archivo actual en /api/scan-mbr.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY)

export default async function handler(req, res){
  try{
    const empresa_id = req.query.empresa_id
    if(!empresa_id) return res.status(400).json({ok:false, error:'empresa_id requerido'})

    // 1. Traer productos de MBR maestro global (donde están las 200 refs)
    const { data: productos, error } = await supabase.from('productos_maestro').select('*').limit(1000)
    if(error) throw error

    // 2. Traer precios ya editados manualmente para no pisarlos con 0
    const { data: existentes } = await supabase.from('listado_maestro_proveedor').select('referencia,talla,precio').eq('empresa_id', empresa_id)
    const mapaPrecios = {}
    if(existentes){ existentes.forEach(e=>{ if(e.precio>0) mapaPrecios[`${e.referencia}::${e.talla}`]=e.precio }) }

    let guardados = 0
    for(const p of productos){
      let precioReal = Number(
        p.precio || p.precio_costo || p.precio_venta || p.precio_original || p.datos_raw?.precio || p.datos_raw?.price || 0
      )
      // Si maestro tiene 0 pero ya tenías precio manual, conserva manual
      const key = `${p.referencia}::${p.talla||'M'}`
      if(precioReal===0 && mapaPrecios[key]) precioReal = mapaPrecios[key]

      const payload = {
        empresa_id,
        proveedor_nombre: 'MBR - MÁXIMA',
        referencia: p.referencia,
        talla: p.talla || 'M',
        precio: precioReal,
        stock_proveedor: p.stock || p.stock_proveedor || 10,
        imagen_original: p.imagen_original || p.imagen || p.datos_raw?.imagen,
        imagen_sin_fondo: p.imagen_sin_fondo,
        fecha_escaneo: new Date().toISOString()
      }
      const { error: upErr } = await supabase.from('listado_maestro_proveedor').upsert(payload, {onConflict: 'empresa_id,referencia,talla'})
      if(!upErr) guardados++
    }

    return res.json({ok:true, total: productos.length, guardados, proveedor: 'MBR - MÁXIMA', nota: 'Si guardados con precio 0, edita precio manual en TabCatalogo - ahora es editable'})
  }catch(e){
    console.error(e)
    return res.status(500).json({ok:false, error: e.message})
  }
}
