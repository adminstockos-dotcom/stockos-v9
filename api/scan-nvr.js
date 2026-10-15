
// api/scan-nvr.js - VERCEL FUNCTION para Vite - Flujo NVR real
// Login -> 3 rayitas -> Listado de productos -> BUSCAR PRODUCTO por cada uno -> foto HD unica
import { createClient } from '@supabase/supabase-js'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL o KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

export default async function handler(req,res){
  const t0=Date.now()
  let browser=null
  try{
    const empresa_id = (req.query.empresa_id || req.query.empresaId || '9').toString()
    const offset = Math.max(0, parseInt(req.query.offset||'0',10)||0)
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit||'5',10)||5))

    const PROVIDER_URL = process.env.NVR_PROVIDER_URL || process.env.MBR_PROVIDER_URL || 'https://estock-mobile.demachine.co'
    const USER = process.env.MBR_USER || process.env.NVR_USER
    const PASS = process.env.MBR_PASS || process.env.NVR_PASS

    if(!USER || !PASS) return res.status(500).json({ ok:false, error:'Falta MBR_USER y MBR_PASS en Vercel env' })

    const supabase=getSupabase()
    const executablePath = await chromium.executablePath()
    browser = await playwright.launch({ args: chromium.args, executablePath, headless: true })
    const context = await browser.newContext({ viewport:{width:1366,height:900} })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)

    await page.goto(PROVIDER_URL, { waitUntil:'domcontentloaded', timeout:40000 })
    await sleep(2000)

    // login
    for(const sel of ['input[name="username"]','input[name="user"]','input[name="email"]','input[type="text"]']){
      try{ const el=page.locator(sel).first(); if(await el.count()>0){ await el.fill(USER); break } }catch{}
    }
    for(const sel of ['input[name="password"]','input[type="password"]']){
      try{ const el=page.locator(sel).first(); if(await el.count()>0){ await el.fill(PASS); break } }catch{}
    }
    try{ const btn=page.locator('button:has-text("Ingresar"), button:has-text("Login"), button[type="submit"]').first(); if(await btn.count()>0){ await btn.click(); await page.waitForLoadState('networkidle',{timeout:20000}).catch(()=>{}) } }catch{}
    await sleep(3000)

    // 3 rayitas y Listado de productos
    if(await page.locator('text=Listado de productos').count()==0){
      for(const sel of ['header button:has(svg)','header button:last-child','.navbar-toggler','button:has-text("☰")']){
        try{ const el=page.locator(sel).first(); if(await el.count()>0){ await el.click(); await sleep(1200); if(await page.locator('text=Listado de productos').count()>0) break } }catch{}
      }
    }
    try{ await page.locator('text=Listado de productos').first().click({timeout:10000}); await page.waitForLoadState('networkidle',{timeout:20000}).catch(()=>{}); await sleep(2000) }catch(e){ return res.status(500).json({ ok:false, error:'No abre Listado de productos', url: page.url() }) }

    const buttons = await page.locator('button:has-text("BUSCAR PRODUCTO"), a:has-text("BUSCAR PRODUCTO")').all()
    const total = buttons.length || 300
    const start = offset
    const end = Math.min(offset+limit, buttons.length)
    let guardados=0, errores=[], productos=[]

    for(let idx=start; idx<end; idx++){
      try{
        const curBtns = await page.locator('button:has-text("BUSCAR PRODUCTO"), a:has-text("BUSCAR PRODUCTO")').all()
        if(idx>=curBtns.length) break
        await curBtns[idx].click()
        await page.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>{})
        await sleep(2500)

        const detalle = await page.evaluate(()=>{
          const bodyText=document.body.innerText
          const priceMatch=bodyText.match(/\$\s*([0-9.,]+)/)
          let precio=0; if(priceMatch){ const raw=priceMatch[1].replace(/[^0-9]/g,''); precio=parseInt(raw,10)||0 }
          const refEl=document.querySelector('h1, h2, [class*="referencia" i]')
          const referencia=refEl? (refEl.textContent||'').trim().slice(0,250) : document.title.slice(0,250)
          const nombre=document.querySelector('h1')?.textContent?.trim()||referencia
          const imgs=Array.from(document.querySelectorAll('img')).map((i)=>i.src||'').filter(s=>s.startsWith('http')&&!s.includes('logo')).map(s=>({src:s,score:(s.includes('original')||s.includes('hd')?100:0)+s.length})).sort((a,b)=>b.score-a.score).map(o=>o.src)
          const tallas=[...new Set((bodyText.match(/\b(3[0-9]|4[0-9])\b/g)||[]))].slice(0,10)
          let stock=0; const m=bodyText.match(/Stock\s*[:\-]?\s*(\d+)/i); if(m) stock=parseInt(m[1],10)||0
          return { foto_original_hd: imgs[0]||'', referencia, nombre, precio_por_proveedor: precio, tallas, stock_cantidad: stock }
        })

        if(!detalle.foto_original_hd){ await page.goBack().catch(()=>{}); await sleep(1500); continue }

        const payload={
          empresa_id, referencia: detalle.referencia, talla: detalle.tallas[0]||'40',
          precio: detalle.precio_por_proveedor, stock_proveedor: detalle.stock_cantidad,
          proveedor_nombre:'NVR - STOCK US', imagen_original: detalle.foto_original_hd,
          fecha_escaneo: new Date().toISOString()
        }
        try{
          const { error } = await supabase.from('listado_maestro_proveedor').upsert(payload,{onConflict:'empresa_id,referencia,talla'})
          if(!error){ guardados++; productos.push({ ref: detalle.referencia.slice(0,60), precio: detalle.precio_por_proveedor, foto: detalle.foto_original_hd.slice(0,80) }) }
          else{ const { error:e2 }=await supabase.from('listado_maestro_proveedor').upsert(payload,{onConflict:'empresa_id,referencia'}); if(!e2) guardados++ }
        }catch(e){ errores.push(e.message?.slice(0,80)) }

        await page.goBack({waitUntil:'domcontentloaded'}).catch(async()=>{ await page.goto(PROVIDER_URL).catch(()=>{}) })
        await sleep(2000)
      }catch(e){ errores.push(e.message?.slice(0,80)); try{ await page.goBack().catch(()=>{}); await sleep(1000) }catch{} }
      if(Date.now()-t0>250000) break
    }

    await browser.close().catch(()=>{})
    const hasMore = (offset+limit) < total
    return res.status(200).json({ ok:true, guardados, total, offset, nextOffset: hasMore? offset+limit : null, hasMore, proveedor:'NVR', modo:`NVR_PLAYWRIGHT_${guardados}`, productos, mensaje:`Trayendo producto ${offset+guardados}/${total}...`, tiempo_ms: Date.now()-t0, errores: errores.slice(0,3) })

  }catch(e){ try{ if(browser) await browser.close() }catch{}; return res.status(500).json({ ok:false, error:e.message }) }
}
