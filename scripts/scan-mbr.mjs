// V10 FINAL - NO FALLA + GUARDA EN SUPABASE
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function run() {
  console.log('[MBR] V10 FINAL');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let token = null;

  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/users/token')) {
      try { const j = await r.json(); token = j?.data?.token; console.log('[MBR] TOKEN OK'); } catch {}
    }
    if (u.includes('/api/requests/indexMe')) {
      try { const txt = await r.text(); console.log(`[MBR] indexMe ${u.slice(-60)} => ${txt.slice(0, 400)}`); } catch {}
    }
  });

  try {
    await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 });

    const inp = page.locator('input');
    await inp.nth(0).fill('MBR');
    await inp.nth(1).fill('CARLSO ROJAS');
    await inp.nth(2).fill(PASS);
    await page.waitForTimeout(800);
    await inp.nth(2).press('Enter');
    await page.waitForTimeout(3500);

    const btn = page.locator('button:has-text("Ingresar")').first();
    if (await btn.count()) await btn.click().catch(()=>{});

    await page.waitForURL('**/home', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log('[MBR] HOME OK:', page.url());

    // Capturar con token todas las solicitudes (tu rol patinador no tiene /stock)
    const allRequests = await page.evaluate(async (tkn) => {
      const headers = { 'Authorization': `Bearer ${tkn}` };
      let results = []; let p = 1;
      while (p <= 10) {
        const url = `https://mbr.demachine.co/api/requests/indexMe?page=${p}&maxPerPage=100`;
        const res = await fetch(url, { headers });
        if (!res.ok) break;
        const j = await res.json();
        const r = j?.data?.results || [];
        results = results.concat(r);
        if (r.length < 100) break;
        p++;
      }
      return results;
    }, token);

    console.log(`[MBR] TOTAL requests capturados: ${allRequests.length}`);
    if (allRequests.length === 0) {
      console.log('[MBR] No hay solicitudes, saliendo sin error');
      return;
    }

    // Mapear a tu tabla listado_maestro_proveedor - solo columnas seguras
    const toInsert = allRequests.map(x => ({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV,
      referencia: String(x.code || x.product_id),
      talla: String(x.size || 'UNICA'),
      precio: parseInt(String(x.price).replace(/\D/g,'')) || 0,
      stock_proveedor: 1,
      fecha_escaneo: new Date().toISOString()
    }));

    console.log('[MBR] Insertando...', toInsert.length);
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
    const { error } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
    if (error) throw error;

    console.log(`[MBR] OK GUARDADO ${toInsert.length} en Supabase`);

  } catch (e) {
    console.error('[MBR] FATAL', e.message);
    throw e;
  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error('[MBR] FATAL FINAL', e.message); process.exit(1); });
