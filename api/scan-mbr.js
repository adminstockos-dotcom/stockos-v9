// stockos-v9/api/scan-mbr.js - FIX: copia los 170 de productos_maestro a tu empresa
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res){
  try{
    const empresa_id = req.query.empresa_id || '676d535d-5045-41ac-9d7a-117095e75d4'
    const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: maestro, error } = await supabase.from('productos_maestro').select('*').limit(500)
    if(error) throw error
    if(!maestro || maestro.length === 0) return res.status(200).json({ ok: true, total: 0, msg: 'productos_maestro vacío' })

    const rows = maestro
      .filter(p => p.referencia) // evita null que rompe el índice único
      .map(p => ({
        empresa_id,
        proveedor_nombre: 'MBR - MÁXIMA',
        referencia: p.referencia,
        talla: p.talla || 'M',
        precio: p.precio,
        stock_proveedor: p.stock || 10,
        fecha_escaneo: new Date().toISOString(),
        imagen_original: p.imagen_original,
        imagen_sin_fondo: p.imagen_sin_fondo
      }))

    const { error: upErr } = await supabase.from('listado_maestro_proveedor').upsert(rows, { onConflict: 'empresa_id,referencia' })
    if(upErr) throw upErr

    return res.status(200).json({ ok: true, total: maestro.length, guardados: rows.length, proveedor: 'MBR - MÁXIMA' })
  }catch(e){
    console.error(e)
    return res.status(500).json({ ok: false, error: e.message })
  }
}
