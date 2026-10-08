// V14 FINAL - AUDITADO CAPA POR CAPA - PEGA DIRECTO
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MBR_PASS = process.env.MBR_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY || !MBR_PASS) {
  throw new Error('Faltan ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / MBR_PASSWORD');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function run() {
  console.log('[MBR] V14 FINAL AUDITADO');
  
  // Fix capa 1: instalar chromium sin --with-deps para no fallar en Actions
  try { execSync('npx playwright install chromium', { stdio: 'inherit' }); } catch {}

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
  });
  
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' });

  // Fix capa 2: token race - evitar doble resolve
  let tokenResolver;
  let tokenSettled = false;
  const tokenPromise = new Promise((resolve) => {
    tokenResolver = (t) => {
      if (!tokenSettled) { tokenSettled = true; resolve(t); }
    };
  });

  page.on('response', async (r) => {
    if (r.url().includes('/api/users/token')) {
      try {
        const j = await r.json();
        if (j?.data?.token) {
          console.log('[MBR] TOKEN OK');
          tokenResolver(j.data.token);
        }
      } catch {}
    }
  });

  try {
    await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('input').first().waitFor({ timeout: 20000 });

    const inputs = page.locator('input');
    await inputs.nth(0).fill('MBR');
    await inputs.nth(1).fill('CARLSO ROJAS');
    await inputs.nth(2).fill(MBR_PASS);
    await inputs.nth(2).press('Enter');

    await page.waitForURL('**/home', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const token = await Promise.race([
      tokenPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout token no capturado')), 15000))
    ]);

    console.log('[MBR] HOME OK - token capturado');

    // Fix capa 3: fetch desde NODE con headers completos, no desde page.evaluate
    let all = [];
    for (let p = 1; p <= 10; p++) {
      try {
        const res = await fetch(`https://mbr.demachine.co/api/requests/indexMe?page=${p}&maxPerPage=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          }
        });
        if (!res.ok) {
          console.log(`[MBR] HTTP ${res.status} pag ${p} - fin`);
          break;
        }
        const j = await res.json().catch(() => null);
        const results = j?.data?.results || [];
        console.log(`[MBR] Pag ${p}: ${results.length}`);
        all = all.concat(results);
        if (results.length < 100) break;
      } catch (e) {
        console.log(`[MBR] Fetch pag ${p} error: ${e.message}`);
        break;
      }
    }

    console.log(`[MBR] TOTAL requests: ${all.length}`);
    if (all.length === 0) {
      console.log('[MBR] Sin data, saliendo OK');
      return;
    }

    // Fix capa 4: deduplicar para evitar duplicate key en Supabase
    const map = new Map();
    for (const x of all) {
      const key = `${x.code || x.product_id}-${x.size || 'UNICA'}`;
      if (!map.has(key)) map.set(key, x);
    }
    const dedup = [...map.values()];
    console.log(`[MBR] DEDUP ${all.length} -> ${dedup.length}`);

    const toInsert = dedup.map((x) => ({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV,
      referencia: String(x.code || x.product_id),
      talla: String(x.size || 'UNICA'),
      precio: Number(String(x.price).replace(/\D/g, '')) || 0,
      stock_proveedor: 1,
      fecha_escaneo: new Date().toISOString()
    }));

    // Fix capa 5: upsert sin onConflict especifico - evita error si constraint no existe
    console.log('[MBR] Upsert en Supabase...', toInsert.length);
    const { error } = await supabase.from('listado_maestro_proveedor').upsert(toInsert);
    
    if (error) {
      throw new Error(`SUPABASE ${error.message} | details: ${JSON.stringify(error.details || '')}`);
    }

    console.log(`[MBR] OK GUARDADO ${toInsert.length} registros`);

  } catch (e) {
    console.error('[MBR] FATAL', e.message);
    throw e;
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((e) => {
  console.error('[MBR] FATAL FINAL', e.stack || e.message);
  process.exit(1);
});
