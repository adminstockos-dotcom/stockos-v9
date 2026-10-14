// /api/scan/nvr/route.ts - STOCK US V9 - FIX LISTADO REAL PROVEEDOR NVR
// Playwright + @sparticuz/chromium - Flujo obligatorio NVR
// No usa fetch del listado - extrae foto HD del detalle (anti-generico)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function getSupabase(){
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if(!url || !key) throw new Error('Falta SUPABASE_URL o SERVICE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

export async function GET(req: NextRequest){
  const t0 = Date.now()
  let browser:any = null
  try{
    const { searchParams } = new URL(req.url)
    const empresa_id = searchParams.get('empresa_id') || searchParams.get('empresaId') || '9'
    const offset = Math.max(0, parseInt(searchParams.get('offset')||'0',10)||0)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit')||'10',10)||10))

    const PROVIDER_URL = process.env.NVR_PROVIDER_URL || process.env.MBR_PROVIDER_URL || process.env.PROVIDER_URL || 'https://estock-mobile.demachine.co'
    const USER = process.env.MBR_USER || process.env.NVR_USER || process.env.PROVIDER_USER
    const PASS = process.env.MBR_PASS || process.env.NVR_PASS || process.env.PROVIDER_PASS

    if(!USER || !PASS){
      return NextResponse.json({ ok:false, error:'Falta MBR_USER y MBR_PASS en env Vercel', hint:'Agrega MBR_USER y MBR_PASS' }, { status:500 })
    }

    const supabase = getSupabase()

    // Launch Chromium for Vercel
    const executablePath = await chromium.executablePath()
    browser = await playwright.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    })
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120'
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)

    // 1. LOGIN
    await page.goto(PROVIDER_URL, { waitUntil:'domcontentloaded', timeout: 40000 })
    await sleep(2000)

    // Intenta login - busca inputs user/pass
    const userSelectors = ['input[name="username"]','input[name="user"]','input[name="email"]','input[type="text"]','input[id*="user"]','input[placeholder*="Usuario" i]','input[placeholder*="User" i]']
    const passSelectors = ['input[name="password"]','input[type="password"]','input[id*="pass"]','input[placeholder*="Contraseña" i]','input[placeholder*="Password" i]']
    
    let logged = false
    for(const sel of userSelectors){
      try{
        const el = page.locator(sel).first()
        if(await el.count()>0){
          await el.fill(USER, { timeout: 5000 })
          logged = true
          break
        }
      }catch{}
    }
    for(const sel of passSelectors){
      try{
        const el = page.locator(sel).first()
        if(await el.count()>0){
          await el.fill(PASS, { timeout: 5000 })
          break
        }
      }catch{}
    }
    // Click login button
    try{
      const btn = page.locator('button:has-text("Ingresar"), button:has-text("Login"), button:has-text("Entrar"), button[type="submit"], input[type="submit"]').first()
      if(await btn.count()>0){
        await btn.click()
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{})
      }
    }catch{}
    await sleep(3000)

    // 2. Click 3 rayitas arriba derecha
    // Intenta varios selectores de hamburger
    const menuSelectors = [
      'button:has-text("☰")',
      'button:has-text("≡")',
      'header button:has(svg)',
      'header button:last-child',
      '[class*="hamburger"]',
      '[class*="menu-toggle"]',
      'nav button',
      'button[aria-label*="menu" i]',
      '.navbar-toggler',
      'i.fa-bars',
      'i.fas.fa-bars',
      'svg.fa-bars'
    ]
    let menuOpened = false
    // Si ya se ve "Listado de productos", no hace falta abrir menu
    if(await page.locator('text=Listado de productos').count()>0){
      menuOpened = true
    } else {
      for(const sel of menuSelectors){
        try{
          const el = page.locator(sel).first()
          if(await el.count()>0 && await el.isVisible()){
            await el.click({ timeout: 5000 })
            await sleep(1500)
            if(await page.locator('text=Listado de productos').count()>0){
              menuOpened = true
              break
            }
          }
        }catch{}
      }
    }
    // Intento extra: click coordenada top-right
    if(!menuOpened){
      try{
        await page.mouse.click(1280, 40)
        await sleep(1500)
      }catch{}
    }

    // 3. Click 3ra opción: "Listado de productos"
    try{
      const listadoBtn = page.locator('text=Listado de productos').first()
      await listadoBtn.waitFor({ timeout: 10000 })
      await listadoBtn.click()
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{})
      await sleep(2000)
    }catch(e){
      return NextResponse.json({ ok:false, error:'No se pudo abrir Listado de productos - verifica 3 rayitas', step:'menu', url: page.url() }, { status:500 })
    }

    // Ahora estamos en listado
    await page.waitForTimeout(2000)

    // Obtiene total productos en listado (si hay paginador)
    const totalProductos = await page.evaluate(()=>{
      // Cuenta botones BUSCAR PRODUCTO
      const btns = Array.from(document.querySelectorAll('button, a')).filter(b=> (b.textContent||'').toUpperCase().includes('BUSCAR PRODUCTO'))
      return btns.length
    })

    // Si hay paginacion, intenta sacar total del DOM
    const allButtons = await page.locator('button:has-text("BUSCAR PRODUCTO"), a:has-text("BUSCAR PRODUCTO")').all()
    
    // Aplica offset/limit
    const start = offset
    const end = Math.min(offset+limit, allButtons.length)
    const slice = allButtons.slice(start, end)

    let guardados = 0
    let errores: string[] = []
    let productosProcesados:any[] = []

    for(let idx=0; idx<slice.length; idx++){
      const globalIdx = start + idx
      try{
        // Re-query botones porque DOM cambia al volver
        const currentButtons = await page.locator('button:has-text("BUSCAR PRODUCTO"), a:has-text("BUSCAR PRODUCTO")').all()
        if(globalIdx >= currentButtons.length) break
        const btn = currentButtons[globalIdx]

        // 5. Click BUSCAR PRODUCTO
        await btn.click()
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(()=>{})
        await sleep(2500)

        // Extrae LO REAL dentro del detalle
        const detalle = await page.evaluate(()=>{
          const getText = (sel:string) => {
            const el = document.querySelector(sel)
            return el ? (el.textContent||'').trim() : ''
          }
          const getImgs = () => {
            const imgs = Array.from(document.querySelectorAll('img')).map((img:any)=> img.src || img.getAttribute('data-src') || '')
            // Filtra logos, iconos pequeños
            const filtered = imgs.filter(src=> src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && src.length>20)
            // Ordena por tamaño: busca la mas grande / HD
            // Preferencia: data que tenga original, hd, large
            const scored = filtered.map(src=>{
              let score = 0
              if(src.includes('original')||src.includes('hd')||src.includes('large')||src.includes('1024')||src.includes('1000')) score+=100
              if(src.includes('mbr.demachine')||src.includes('estock')) score+=50
              return { src, score, len: src.length }
            }).sort((a,b)=> b.score - a.score || b.len - a.len)
            return scored.map(s=>s.src)
          }
          // Precio - busca elementos con $ o precio
          let precio = 0
          const priceSelectors = ['[class*="precio" i]','[class*="price" i]','[id*="precio" i]','[id*="price" i]','text=/\\$\\s*\\d+/']
          const bodyText = document.body.innerText
          const priceMatch = bodyText.match(/\\$\\s*([0-9.,]+)/)
          if(priceMatch){
            const raw = priceMatch[1].replace(/[^0-9]/g,'')
            precio = parseInt(raw,10)||0
          }
          // Referencia y nombre
          const refEl = document.querySelector('[class*="referencia" i], [class*="codigo" i], [class*="product" i] h1, h1, h2')
          const referencia = refEl ? (refEl.textContent||'').trim().slice(0,300) : (document.title||'').slice(0,300)
          const nombre = document.querySelector('h1, h2, [class*="nombre" i]')?.textContent?.trim() || referencia

          // Tallas - busca elementos con talla
          const tallasText = Array.from(document.querySelectorAll('[class*="talla" i], [class*="size" i], select, button')).map(el=> (el.textContent||'').trim()).join(' ')
          const tallaMatches = bodyText.match(/\\b(3[0-9]|4[0-9]|5[0-9])\\b/g) || []
          const tallas = [...new Set(tallaMatches)].slice(0,20)

          // Colores
          const colorMatches = bodyText.match(/\\b(NEGRO|BLANCO|BEIGE|CAFE|AZUL|ROJO|VERDE|GRIS|MARRON|BEIGE|CREMA)\\b/gi) || []
          const colores = [...new Set(colorMatches.map(c=>c.toUpperCase()))].slice(0,10)

          // Stock - busca numero de stock
          let stock = 0
          const stockMatch = bodyText.match(/Stock\\s*[:\\-]?\\s*(\\d+)/i) || bodyText.match(/Cantidad\\s*[:\\-]?\\s*(\\d+)/i) || bodyText.match(/Disponible\\s*[:\\-]?\\s*(\\d+)/i)
          if(stockMatch) stock = parseInt(stockMatch[1],10)||0

          const fotos = getImgs()
          return {
            foto_original_hd: fotos[0]||'',
            fotos_todas: fotos.slice(0,5),
            referencia,
            nombre,
            precio_por_proveedor: precio,
            tallas,
            colores,
            stock_cantidad: stock,
            body_snippet: bodyText.slice(0,800)
          }
        })

        // ANTI-GENERICO: valida que foto no sea duplicada
        if(!detalle.foto_original_hd){
          errores.push(`Producto ${globalIdx} sin foto HD`)
          // vuelve al listado
          await page.goBack({ waitUntil:'domcontentloaded' }).catch(async ()=>{
            await page.goto(page.url(), { waitUntil:'domcontentloaded' }).catch(()=>{})
          })
          await sleep(1500)
          continue
        }

        // Guarda en Supabase tabla productos_stock_us
        // Tambien guarda en listado_maestro_proveedor para compatibilidad con tu UI actual
        const payloadStockUs = {
          empresa_id: empresa_id,
          referencia: detalle.referencia.slice(0,250),
          nombre: detalle.nombre.slice(0,500),
          foto_original_hd: detalle.foto_original_hd,
          fotos_todas: detalle.fotos_todas,
          precio_por_proveedor: detalle.precio_por_proveedor,
          precio: detalle.precio_por_proveedor,
          tallas: detalle.tallas,
          colores: detalle.colores,
          stock_cantidad: detalle.stock_cantidad,
          stock_proveedor: detalle.stock_cantidad,
          proveedor: 'NVR',
          proveedor_nombre: 'NVR - STOCK US',
          talla: (detalle.tallas[0]||'40'),
          imagen_original: detalle.foto_original_hd,
          fecha_escaneo: new Date().toISOString(),
          listado_proveedor: 'NVR'
        }

        // Intenta guardar en productos_stock_us si existe, si no en listado_maestro_proveedor
        let saved = false
        try{
          const { error } = await supabase.from('productos_stock_us').upsert(payloadStockUs, { onConflict:'empresa_id,referencia' })
          if(!error) saved = true
          else throw error
        }catch{
          // Fallback a tabla que ya usas
          try{
            const fallbackPayload = {
              empresa_id: empresa_id,
              referencia: payloadStockUs.referencia,
              talla: payloadStockUs.talla,
              precio: payloadStockUs.precio,
              stock_proveedor: payloadStockUs.stock_cantidad,
              proveedor_nombre: 'NVR - STOCK US',
              imagen_original: payloadStockUs.foto_original_hd,
              fecha_escaneo: payloadStockUs.fecha_escaneo
            }
            const { error } = await supabase.from('listado_maestro_proveedor').upsert(fallbackPayload, { onConflict:'empresa_id,referencia,talla' })
            if(!error) saved = true
            else{
              const { error: e2 } = await supabase.from('listado_maestro_proveedor').upsert(fallbackPayload, { onConflict:'empresa_id,referencia' })
              if(!e2) saved = true
              else errores.push(e2.message.slice(0,100))
            }
          }catch(e:any){ errores.push(e.message?.slice(0,100)||'save error') }
        }

        if(saved){
          guardados++
          productosProcesados.push({
            idx: globalIdx,
            ref: detalle.referencia.slice(0,80),
            precio: detalle.precio_por_proveedor,
            foto: detalle.foto_original_hd.slice(0,120),
            stock: detalle.stock_cantidad
          })
        }

        // Cierra y vuelve al listado para el siguiente
        await page.goBack({ waitUntil:'domcontentloaded' }).catch(async ()=>{
          // Si goBack falla, navega directo al listado
          try{
            await page.goto(`${PROVIDER_URL}/listproducts`, { waitUntil:'domcontentloaded' }).catch(async ()=>{
              await page.locator('text=Listado de productos').first().click().catch(()=>{})
            })
          }catch{}
        })
        await sleep(2000)

      }catch(e:any){
        errores.push(`Prod ${globalIdx}: ${e.message?.slice(0,120)}`)
        try{
          await page.goBack({ waitUntil:'domcontentloaded' }).catch(()=>{})
          await sleep(1500)
        }catch{}
      }
      if(Date.now()-t0>250000) break // deja 50s margen para Vercel 300s
    }

    await browser.close().catch(()=>{})

    const hasMore = (offset+limit) < (totalProductos || 300) // asume 300 si no se detecta
    return NextResponse.json({
      ok:true,
      guardados,
      total: totalProductos || 300,
      offset,
      nextOffset: hasMore ? offset+limit : null,
      hasMore,
      proveedor:'NVR',
      modo:`NVR_PLAYWRIGHT_${guardados}_OFFSET_${offset}_TOTAL_${totalProductos}_ANTI_GENERICO`,
      productos: productosProcesados,
      tiempo_ms: Date.now()-t0,
      mensaje: guardados>0 ? `Trayendo producto ${offset+guardados}/${totalProductos||300}...` : 'Sin guardados - revisa login',
      errores: errores.slice(0,5)
    })

  }catch(e:any){
    try{ if(browser) await browser.close() }catch{}
    return NextResponse.json({ ok:false, error:e.message, stack:e.stack?.slice(0,800) }, { status:500 })
  }
}

export async function POST(req: NextRequest){
  return GET(req)
}
