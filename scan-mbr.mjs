#!/usr/bin/env node
// ULTRA FIX - sin dependencias npm, solo fetch nativo
// Trae $65000 / $90000 real desde MBR
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
let BEARER = (process.env.MBR_BEARER_TOKEN||'').trim()
BEARER = BEARER.replace(/^Bearer\s+/i,'').replace(/^["']|["']$/g,'').trim()

console.log('=== DEBUG ===')
console.log('SUPA_URL:', SUPA_URL ? SUPA_URL.slice(0,30)+'...' : 'FALTA')
console.log('SERVICE_KEY len:', (SUPA_KEY||'').length)
console.log('BEARER len:', BEARER.length, 'preview:', BEARER.slice(0,25))

if(!SUPA_URL || !SUPA_KEY){ console.error('Falta SUPABASE_URL o SERVICE_ROLE'); process.exit(1) }
if(!BEARER || BEARER.length < 20){ console.error('MBR_BEARER_TOKEN vacio - revisa Secrets'); process.exit(1) }

async function fetchMBR(page){
  const url = `https://mbr.demachine.co/api/requests/indexMe?page=${page}&maxPerPage=100`
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${BEARER}`, 'Accept': 'application/json' } })
  const txt = await r.text()
  if(!r.ok){
    console.error(`MBR ERROR ${r.status}: ${txt.slice(0,800)}`)
    if(r.status===401) console.error('TOKEN EXPIRADO: ve a mbr.demachine.co > F12 > Network > indexMe > Authorization y copia de nuevo a GitHub Secrets MBR_BEARER_TOKEN')
    throw new Error(`MBR ${r.status}`)
  }
  const j = JSON.parse(txt)
  return j.data
}

async function upsertSupa(table, rows, onConflict){
  const url = `${SUPA_URL}/rest/v1/${table}?on_conflict=${onConflict}`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  })
  const txt = await r.text()
  if(!r.ok){
    console.error(`SUPA ${table} ERROR ${r.status}: ${txt.slice(0,800)}`)
    throw new Error(`Supabase ${table} ${r.status}`)
  }
  return true
}

async function main(){
  let page=1, pages=1, total=0
  do{
    const data = await fetchMBR(page)
    pages = data.info?.pages || 1
    const results = data.results || []
    console.log(`\n📄 Page ${page}/${pages} - ${results.length} items - total MBR ${data.info?.count}`)
    if(results.length){
      console.log(`Ejemplo: ${results[0].product} -> $${results[0].price} ${results[0].size}`)
      const rows = results.map(r=>({
        referencia: (r.product||'').trim(),
        nombre: r.product,
        precio: parseInt(r.price,10)||0,
        stock: parseInt(r.quantity,10)||1,
        talla: r.size,
        color: r.color,
        marca: r.brand,
        codigo: r.code,
        product_id: r.product_id,
        mbr_id: String(r.id),
        imagen: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_original: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_sin_fondo: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        updated_at: new Date().toISOString()
      })).filter(x=>x.referencia)

      // divide en lotes de 50 para no saturar
      for(let i=0;i<rows.length;i+=50){
        const chunk = rows.slice(i,i+50)
        await upsertSupa('productos_maestro', chunk, 'referencia')
        console.log(`✅ Upsert ${chunk.length} -> ${chunk[0].referencia} $${chunk[0].precio}`)
      }
      total+=rows.length
    }
    page++
  }while(page<=pages)
  console.log(`\n🎉 FINAL OK - ${total} productos sincronizados con precio real MBR`)
}
main().catch(e=>{ console.error('💥 FATAL', e); process.exit(1) })
