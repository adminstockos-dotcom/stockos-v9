#!/usr/bin/env node
// scan-mbr.mjs FINAL v3 - trae precio real $65000/$90000 desde MBR Stock
// Usa MBR_BEARER_TOKEN si existe, si no intenta login con MBR_USER/MBR_PASS
import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://mbr.demachine.co/api/requests/indexMe'
const LOGIN_URLS = [
  'https://mbr.demachine.co/api/login',
  'https://mbr.demachine.co/api/auth/login',
  'https://mbr.demachine.co/api/users/login',
  'https://mbr.demachine.co/login'
]

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})

async function getBearer(){
  let bearer = process.env.MBR_BEARER_TOKEN
  if(bearer && bearer.length > 20){
    console.log('🔑 Usando MBR_BEARER_TOKEN existente')
    return bearer.replace('Bearer ','').trim()
  }
  
  // Intenta login automático
  const user = process.env.MBR_USER
  const pass = process.env.MBR_PASS
  if(!user || !pass){
    console.error('❌ Falta MBR_BEARER_TOKEN y también MBR_USER/MBR_PASS')
    console.error('👉 Ve a GitHub > Settings > Secrets > Actions y agrega:')
    console.error('   MBR_BEARER_TOKEN = tu token de mbr.demachine.co (copia de DevTools > Network > indexMe > Authorization)')
    console.error('   O MBR_USER y MBR_PASS para login automático')
    process.exit(1)
  }
  
  console.log(`🔐 Intentando login automático con ${user}`)
  for(const loginUrl of LOGIN_URLS){
    try{
      console.log(` Probando ${loginUrl}`)
      const r = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, email: user, user, pass })
      })
      const text = await r.text()
      console.log(`  Status ${r.status}: ${text.slice(0,300)}`)
      if(r.ok){
        try{
          const j = JSON.parse(text)
          const token = j.token || j.access_token || j.bearer || j.data?.token
          if(token){
            console.log('✅ Login OK, token obtenido')
            return token
          }
        }catch{}
      }
    }catch(e){ console.log(`  Error ${e.message}`) }
  }
  
  console.error('❌ No se pudo hacer login automático, usa MBR_BEARER_TOKEN manual')
  process.exit(1)
}

async function fetchPage(bearer, page, maxPerPage=100){
  const url = `${API_BASE}?page=${page}&maxPerPage=${maxPerPage}`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' }
  })
  if(!res.ok){ 
    const txt = await res.text()
    if(res.status===401){
      console.error('❌ Bearer expirado - renueva el token en GitHub Secrets')
    }
    throw new Error(`API ${res.status}: ${txt.slice(0,500)}`) 
  }
  const json = await res.json()
  return json.data
}

async function main(){
  const bearer = await getBearer()
  console.log('🔍 MBR API:', API_BASE)
  let page=1, pages=1, total=0
  do{
    const data = await fetchPage(bearer, page, 100)
    pages = data.info?.pages || 1
    const results = data.results || []
    console.log(`📄 Page ${page}/${pages} - ${results.length} productos - Total MBR: ${data.info?.count}`)
    
    if(results.length){
      const upserts = results.map(r=>({
        referencia: r.product?.trim(),
        nombre: r.product,
        precio: parseInt(r.price,10), // ESTE ES EL $65000 / $90000 REAL
        stock: parseInt(r.quantity,10) || 1,
        talla: r.size,
        color: r.color,
        marca: r.brand,
        codigo: r.code,
        product_id: r.product_id,
        warehouse: r.warehouse,
        username: r.username,
        mbr_id: r.id,
        imagen: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        imagen_original: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null,
        updated_at: new Date().toISOString()
      }))
      
      let { error } = await supabase.from('productos_maestro').upsert(upserts, {onConflict:'referencia'})
      if(error){
        console.log('productos_maestro upsert falló, probando requests:', error.message)
        const { error: e2 } = await supabase.from('requests').upsert(
          results.map(r=>({
            id: r.id,
            product: r.product,
            product_id: r.product_id,
            price: parseInt(r.price,10),
            brand: r.brand,
            code: r.code,
            color: r.color,
            size: r.size,
            quantity: parseInt(r.quantity,10),
            warehouse: r.warehouse,
            username: r.username,
            status: r.status,
            created_at: r.created_at,
            image_src: r.image_src ? `https://mbr.demachine.co${r.image_src}` : null
          })), {onConflict:'id'}
        )
        if(e2) throw e2
      }
      total += results.length
      console.log(`✅ ${results[0].product} $${results[0].price} x${results.length}`)
    }
    page++
  }while(page<=pages)
  console.log(`\n🎉 LISTO - ${total} productos con precio real MBR sincronizados`)
}

main().catch(e=>{ console.error('💥', e.message); process.exit(1) })
