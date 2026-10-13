#!/usr/bin/env node
// DEBUG FIX - log completo
import { createClient } from '@supabase/supabase-js'

console.log('--- DEBUG ENV ---')
console.log('SUPABASE_URL exists?', !!process.env.SUPABASE_URL)
console.log('SERVICE_KEY exists?', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('MBR_BEARER_TOKEN exists?', !!process.env.MBR_BEARER_TOKEN, 'len', (process.env.MBR_BEARER_TOKEN||'').length)

let bearer = (process.env.MBR_BEARER_TOKEN||'').trim().replace(/^Bearer\s+/i,'').replace(/["'\s]/g,'')
if(!bearer || bearer.length < 20){
  console.error('❌ MBR_BEARER_TOKEN vacio o corto - revisa GitHub Secrets')
  process.exit(1)
}
console.log('🔑 Bearer OK len', bearer.length, 'start', bearer.slice(0,20))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})

async function fetchPage(page){
  const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=100`
  console.log(`🔍 Fetch ${url}`)
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' } })
  const txt = await res.text()
  console.log(`Status ${res.status} body ${txt.slice(0,500)}`)
  if(!res.ok) throw new Error(`MBR API ${res.status}: ${txt.slice(0,500)}`)
  return JSON.parse(txt).data
}

async function main(){
  let page=1, pages=1, total=0
  do{
    const data = await fetchPage(page)
    pages = data.info?.pages || 1
    const results = data.results || []
    console.log(`Page ${page}/${pages} ${results.length} items`)
    if(results.length){
      const upserts = results.map(r=>({
        referencia: r.product?.trim(),
        nombre: r.product,
        precio: parseInt(r.price,10),
        stock: parseInt(r.quantity,10)||1,
        talla: r.size,
        color: r.color,
        marca: r.brand,
        codigo: r.code,
        product_id: r.product_id,
        mbr_id: r.id,
        imagen: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_original: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_sin_fondo: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        updated_at: new Date().toISOString()
      }))
      // Upsert con manejo de error detallado
      const { error } = await supabase.from('productos_maestro').upsert(upserts, {onConflict:'referencia'})
      if(error){
        console.error('productos_maestro error', error.message, error.details)
        // intenta solo los campos basicos
        const basic = upserts.map(u=>({ referencia: u.referencia, nombre: u.nombre, precio: u.precio, stock: u.stock, updated_at: u.updated_at }))
        const { error: e2 } = await supabase.from('productos_maestro').upsert(basic, {onConflict:'referencia'})
        if(e2){ console.error('basic also fail', e2); throw e2 }
        else console.log('✅ basic upsert ok')
      } else {
        console.log(`✅ upsert ${results[0].product} $${results[0].price}`)
      }
      total+=results.length
    }
    page++
  }while(page<=pages)
  console.log(`🎉 LISTO ${total} productos`)
}
main().catch(e=>{ console.error('💥', e); process.exit(1) })
