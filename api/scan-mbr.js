// api/scan-mbr.js - FIX v2: trae precio desde detalle "Buscar producto" de mbr.demachine.co
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY)

function extractPriceFromText(text){
  if(!text) return 0
  // Busca patrones $ 123.456 o 123456 COP
  const patterns = [
    /precio[^0-9]*([\d\.,]+)/i,
    /\$\s*([\d\.,]+)/,
    /price[^0-9]*([\d\.,]+)/i,
    /"precio"\s*:\s*"?([\d\.]+)"?/i,
    /"price"\s*:\s*"?([\d\.]+)"?/i,
    /"precio_venta"\s*:\s*([\d\.]+)/i
  ]
  for(const re of patterns){
    const m = text.match(re)
    if(m){
      const num = Number(String(m[1]).replace(/\./g,'').replace(/,/g,'').replace(/[^0-9]/g,''))
      if(num>1000 && num<1000000) return num
      const num2 = Number(String(m[1]).replace(',', '.'))
      if(num2>1000) return Math.round(num2)
    }
  }
  return 0
}

async function fetchPriceFromMBR(producto){
  try{
    // Intenta sacar ID del producto de la imagen: product_2486
    const img = producto.imagen_original || producto.imagen || ''
    const idMatch = img.match(/product_(\d+)/)
    const id = idMatch ? idMatch[1] : null
    if(!id) return 0

    // Prueba varios endpoints comunes de MBR
    const urls = [
      `https://mbr.demachine.co/api/products/${id}`,
      `https://mbr.demachine.co/api/product/${id}`,
      `https://mbr.demachine.co/api/listproducts/${id}`,
      `https://mbr.demachine.co/product/${id}`,
      `https://mbr.demachine.co/api/productos/${id}`,
    ]

    for(const url of urls){
      try{
        const r = await fetch(url, { headers: { 'User-Agent': 'StockOS-Scanner' } })
        if(!r.ok) continue
        const text = await r.text()
        let json
        try{ json = JSON.parse(text) }catch{}
        if(json){
          const p = json.precio || json.price || json.precio_venta || json.data?.precio || json.product?.precio || json.product?.price || 0
          if(p>0) return Number(p)
          // busca en todo el json
          const precioTxt = extractPriceFromText(text)
          if(precioTxt>0) return precioTxt
        } else {
          const precioTxt = extractPriceFromText(text)
          if(precioTxt>0) return precioTxt
        }
      }catch{}
    }
    return 0
  }catch{ return 0 }
}

export default async function handler(req, res){
  try{
    const empresa_id = req.query.empresa_id
    if(!empresa_id) return res.status(400).json({ok:false, error:'empresa_id requerido'})

    const { data: productos, error } = await supabase.from('productos_maestro').select('*').limit(300)
    if(error) throw error

    const { data: existentes } = await supabase.from('listado_maestro_proveedor').select('referencia,talla,precio').eq('empresa_id', empresa_id)
    const mapaPrecios = {}
    if(existentes){ existentes.forEach(e=>{ if(e.precio>0) mapaPrecios[`${e.referencia}::${e.talla}`]=e.precio }) }

    let guardados = 0
    let conPrecioMBR = 0
    let sinPrecio = 0

    for(const p of productos){
      let precioReal = Number(p.precio || p.precio_costo || p.precio_venta || 0)

      // Si no tiene precio, intenta traerlo de MBR detalle
      if(precioReal===0){
        const precioMBR = await fetchPriceFromMBR(p)
        if(precioMBR>0){
          precioReal = precioMBR
          conPrecioMBR++
          // Actualiza también productos_maestro para que quede guardado
          try{ await supabase.from('productos_maestro').update({precio: precioMBR}).eq('id', p.id) }catch{}
        } else {
          const key = `${p.referencia}::${p.talla||'M'}`
          if(mapaPrecios[key]){ precioReal = mapaPrecios[key] } else { sinPrecio++ }
        }
      }

      const payload = {
        empresa_id,
        proveedor_nombre: 'MBR - MÁXIMA',
        referencia: p.referencia,
        talla: p.talla || 'M',
        precio: precioReal,
        stock_proveedor: p.stock || p.stock_proveedor || 10,
        imagen_original: p.imagen_original,
        imagen_sin_fondo: p.imagen_sin_fondo,
        fecha_escaneo: new Date().toISOString()
      }
      const { error: upErr } = await supabase.from('listado_maestro_proveedor').upsert(payload, {onConflict: 'empresa_id,referencia,talla'})
      if(!upErr) guardados++
      // Pequeña pausa para no saturar MBR
      await new Promise(r=>setTimeout(r, 150))
    }

    return res.json({ok:true, total: productos.length, guardados, conPrecioMBR, sinPrecio, proveedor: 'MBR - MÁXIMA', nota: sinPrecio>0 ? `Quedaron ${sinPrecio} sin precio MBR, edítalos manual en TabCatalogo` : 'Todos con precio MBR'})
  }catch(e){
    console.error(e)
    return res.status(500).json({ok:false, error: e.message})
  }
}
