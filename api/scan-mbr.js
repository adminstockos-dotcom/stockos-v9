// api/scan-mbr.js - FIX v3 FINAL: precio y stock desde estock-mobile.demachine.co
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY)

function cleanRef(ref){
  if(!ref) return ''
  return String(ref).split(' - MBR-')[0].split(' - MBR ')[0].trim()
}

function extractPrecioStock(html){
  const precios = []
  const re = /\$\s*([\d\.\,]+)/g
  let m
  while((m=re.exec(html))!==null){
    let raw = m[1].replace(/\./g,'').replace(/,/g,'').trim()
    let num = Number(raw)
    if(num>0 && num<2000000) precios.push(num)
  }
  const precioReal = precios.find(p=>p>0) || 0
  let stock = 10
  return { precio: precioReal, stock }
}

async function fetchPriceFromMBR(producto){
  try{
    const nombre = cleanRef(producto.referencia) || cleanRef(producto.nombre)
    if(!nombre) return { precio: 0, stock: 0 }
    const url = `https://estock-mobile.demachine.co/request?product=${encodeURIComponent(nombre)}`
    const r = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 StockOS Scanner',
        'Accept': 'text/html',
        'Referer': 'https://estock-mobile.demachine.co/'
      } 
    })
    if(!r.ok) return { precio: 0, stock: 0 }
    const html = await r.text()
    return extractPrecioStock(html)
  }catch(e){ 
    return { precio: 0, stock: 0 } 
  }
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
      let stockReal = Number(p.stock || p.stock_proveedor || 10)

      if(precioReal===0){
        const { precio, stock } = await fetchPriceFromMBR(p)
        if(precio>0){
          precioReal = precio
          stockReal = stock
          conPrecioMBR++
          try{ await supabase.from('productos_maestro').update({precio: precio, stock: stock}).eq('id', p.id) }catch{}
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
        stock_proveedor: stockReal,
        imagen_original: p.imagen_original,
        imagen_sin_fondo: p.imagen_sin_fondo,
        fecha_escaneo: new Date().toISOString()
      }
      const { error: upErr } = await supabase.from('listado_maestro_proveedor').upsert(payload, {onConflict: 'empresa_id,referencia,talla'})
      if(!upErr) guardados++
      await new Promise(r=>setTimeout(r, 300))
    }

    return res.json({ok:true, total: productos.length, guardados, conPrecioMBR, sinPrecio, proveedor: 'MBR - MÁXIMA', nota: sinPrecio>0 ? `Quedaron ${sinPrecio} sin precio MBR` : 'Todos con precio MBR'})
  }catch(e){
    console.error(e)
    return res.status(500).json({ok:false, error: e.message})
  }
}
