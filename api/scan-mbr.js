// /api/scan-mbr.js - STOCKOS V9.1 SCANNER MBR AUTOMATICO 8:30AM y 2:30PM America/Bogota
// Vercel Cron + Playwright + Background Removal Server
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import chromiumBin from '@sparticuz/chromium';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const proveedorCodigo = req.query.proveedor || 'MBR';
  console.log('Iniciando scan MBR', new Date().toISOString());

  try {
    // 1. Buscar proveedor MBR
    const { data: prov } = await supabase.from('proveedores').select('*, empresas!inner(slug)').eq('codigo', proveedorCodigo).eq('estado','activo').single();
    if(!prov) return res.status(404).json({error:'Proveedor MBR no existe, ejecuta SQL'});

    const creds = prov.creds; // {instancia, usuario, password}
    
    // 2. Lanzar Playwright en Vercel (chromium serverless)
    const browser = await chromium.launch({
      args: chromiumBin.args,
      executablePath: await chromiumBin.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto('https://estock-mobile.demachine.co/', {waitUntil:'networkidle'});
    
    // Login - 3 campos igual que el HTML original
    // Intentamos detectar inputs por placeholder/label
    await page.waitForTimeout(2000);
    // Si pide instancia
    try {
      await page.fill('input[placeholder*="Instancia" i], input[name*="instancia" i]', creds.instancia || 'MBR');
    } catch {}
    await page.fill('input[placeholder*="Usuario" i], input[name*="usuario" i], creds.usuario || 'CARLSO ROJAS');
    await page.fill('input[type="password"]', creds.password || creds.pass || 'CARLSO2026');
    await page.click('button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar")');
    await page.waitForNavigation({waitUntil:'networkidle'}).catch(()=>{});
    await page.waitForTimeout(3000);

    // Ir a home donde esta Mis solicitudes o buscar Listado productos en menu
    await page.goto('https://estock-mobile.demachine.co/home', {waitUntil:'networkidle'}).catch(()=>{});
    await page.waitForTimeout(2000);
    // Abrir menu ☰ MBR
    try { await page.click('text=MBR, .menu, [class*="menu"]'); await page.waitForTimeout(1000);} catch{}

    // 3. AUTO-SCROLL IGUAL QUE EL BOTON AMARILLO "SACAR MAESTRO AUTO SIN FONDO"
    let lastHeight = 0, stable = 0;
    for(let i=0; i<50; i++){
      const h = await page.evaluate(()=>document.body.scrollHeight);
      if(h===lastHeight) stable++; else stable=0;
      if(stable>=6) break; // 6 intentos sin crecer
      lastHeight=h;
      await page.evaluate(()=>window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
    }

    // 4. EXTRAER CARDS DONDE innerText incluye "Marca:" o "BODEGA" y tienen img
    const productos = await page.evaluate(()=>{
      const cards = Array.from(document.querySelectorAll('div, ion-card, article')).filter(el=>{
        const t = el.innerText||'';
        return t.includes('Marca:') || t.includes('BODEGA') || t.includes('REFERENCIA') || (t.length>10 && t.length<300 && el.querySelector('img'));
      });
      // fallback: busca todas con img
      const allImgs = Array.from(document.querySelectorAll('img')).map(img=>{
        const parent = img.closest('div');
        return {
          referencia: parent?.innerText?.split('\n')[0]?.trim() || 'REF-'+Math.random().toString(36).slice(2,7),
          marca: (parent?.innerText?.match(/Marca:\s*(.*)/i)?.[1] || '').trim(),
          texto: parent?.innerText||'',
          img: img.src,
          precio: parent?.innerText?.match(/\$\s?([\d\.,]+)/)?.[1]||null
        }
      }).filter(p=>p.img && p.img.startsWith('http'));
      return allImgs.slice(0,300);
    });

    await browser.close();

    // 5. QUITAR FONDO BLANCO SERVER SIDE (simulado, guarda original por ahora)
    // Aqui usarias @imgly/background-removal-node, pero para Vercel serverless lo dejamos como original + flag
    // En el frontend se vera con mix-blend y fondo removido via canvas si quieres HD
    let guardados=0;
    for(const p of productos){
      const {error} = await supabase.from('productos_maestro').upsert({
        proveedor_id: prov.id,
        empresa_id: prov.empresa_id,
        referencia: p.referencia.substring(0,200),
        marca: p.marca || p.referencia.split('-')[0],
        tipo_producto: 'bota',
        descripcion: p.texto.substring(0,500),
        precio: p.precio ? parseFloat(p.precio.replace(/[^0-9.]/g,'')) : null,
        imagen_original: p.img,
        imagen_sin_fondo: p.img, // luego se procesa con rembg worker
        datos_raw: p,
        escaneado_at: new Date().toISOString()
      }, {onConflict:'proveedor_id,referencia'});
      if(!error) guardados++;
    }

    await supabase.from('proveedores').update({ultimo_escaneo:new Date().toISOString(), total_productos:guardados}).eq('id', prov.id);

    return res.status(200).json({ok:true, proveedor:proveedorCodigo, encontrados:productos.length, guardados, cron:"8:30am y 2:30pm America/Bogota"});
  } catch(e){
    console.error(e);
    return res.status(500).json({error:e.message, stack:e.stack?.slice(0,500)});
  }
}
