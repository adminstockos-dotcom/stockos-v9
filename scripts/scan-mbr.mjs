// V9.7 AUDITADO - SNIFF REAL DESDE Ver todos
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function run() {
  console.log('[MBR] V9.7 AUDITADO');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // SNIFF API REAL
  page.on('request', r => {
    const u = r.url();
    if (u.includes('api') || u.includes('demachine')) console.log('[MBR] REQ', r.method(), u);
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('api')) {
      try {
        const txt = await r.text();
        if (txt.length > 20 && txt.length < 15000) console.log(`[MBR] RESP ${u.slice(-100)} => ${txt.slice(0, 1500)}`);
      } catch {}
    }
  });

  await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 });

  const inputs = page.locator('input');
  await inputs.nth(0).fill('MBR');
  await inputs.nth(1).fill('CARLSO ROJAS');
  await inputs.nth(2).fill(PASS);
  await page.waitForTimeout(500);
  await inputs.nth(2).press('Enter');
  await page.waitForTimeout(3000);

  const btn = page.locator('button:has-text("Ingresar")').first();
  if (await btn.count()) await btn.click().catch(()=>{});

  await page.waitForURL('**/home', { timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log('[MBR] HOME OK:', page.url());
  console.log('[MBR] HOME TEXTO:', (await page.innerText('body')).slice(0, 2000));

  // PASO CLAVE QUE FALTABA
  console.log('[MBR] Click Ver todos...');
  const verTodos = page.locator('text=Ver todos').first();
  await verTodos.waitFor({ timeout: 10000 });
  await verTodos.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);

  console.log('[MBR] URL POST CLICK:', page.url());
  const body = await page.innerText('body');
  console.log('[MBR] BODY Ver todos:', body.slice(0, 5000));

  // Extraer del DOM real (tus logs muestran formato: 【entity-ADIDAS¦canonical_name=ADIDAS】... BODEGA - $ 85.000)
  const raw = await page.evaluate(() => document.body.innerText);
  const lines = raw.split('\n');
  console.log(`[MBR] Lineas totales: ${lines.length}`);

  // Intenta guardar lo que vea
  const items = [];
  for (let i=0;i<lines.length;i++) {
    if (lines[i].includes('BODEGA') && lines[i].includes('$')) {
      const ref = lines[i-1] || 'REF';
      const priceMatch = lines[i].match(/\$ ([\d\.]+)/);
      items.push({ ref, price: priceMatch? priceMatch[1] : '0', raw: lines[i] });
    }
  }
  console.log(`[MBR] Items detectados: ${items.length}`, items.slice(0,3));

  await browser.close();
  console.log('[MBR] FIN SNIFF - Revisa los RESP arriba para crear V9.8 final');
}

run().catch(e => { console.error('[MBR] FATAL', e); process.exit(1); });
