// STOCKOS V9.5 - FIX LOGIN
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MBR_PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV_NOMBRE = 'MBR - MÁXIMA';

async function run() {
  console.log('[MBR] V9.5 Iniciando...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('input', { timeout: 15000 });
    const count = await page.locator('input').count();
    console.log('[MBR] inputs:', count);

    // Llenado robusto con click previo
    await page.locator('input').nth(0).click();
    await page.locator('input').nth(0).fill('MBR');
    await page.locator('input').nth(1).click();
    await page.locator('input').nth(1).fill('CARLSO ROJAS');
    await page.locator('input').nth(2).click();
    await page.locator('input').nth(2).fill(MBR_PASS);

    await page.waitForTimeout(1000);

    // Dos metodos de login - Enter y boton
    await page.locator('input').nth(2).press('Enter');
    await page.waitForTimeout(2000);

    const loginBtn = page.locator('button').filter({ hasText: /ingresar|entrar/i }).first();
    if (await loginBtn.count() > 0) {
      await loginBtn.click({ force: true }).catch(()=>{});
    }

    // Esperar a salir de /login
    await page.waitForFunction(() =>!window.location.href.includes('/login'), { timeout: 30000 }).catch(() => {
      console.log('[MBR] Aun en login, texto pagina:', page.url());
    });

    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{});
    await page.waitForTimeout(5000);
    console.log('[MBR] URL despues login:', page.url());

    if (page.url().includes('/login')) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
      console.log('[MBR] ERROR LOGIN - body:', bodyText);
      throw new Error('Login fallido - sigue en /login. Revisa MBR_PASSWORD secret y usuario CARLSO ROJAS');
    }

    // Ahora buscar tabla
    console.log('[MBR] Buscando modulo stock...');
    for (const sel of ['text=Stock', 'text=Existencias', 'text=Consulta', 'text=Inventario']) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.click().catch(()=>{});
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.waitForSelector('tbody tr, table tbody tr,.q-table tr', { timeout: 45000 });

    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      ).filter(r => r.length >= 2 && r[0]);
    });

    console.log(`[MBR] totalRows: ${rows.length}`);
    console.log(`[MBR] sample:`, rows.slice(0,2));

    if (!rows.length) throw new Error('Tabla vacia');

    const toInsert = rows.map(r => ({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV_NOMBRE,
      referencia: r[0],
      talla: r[1] || 'UNICA',
      precio: parseInt((r[2]||'0').replace(/\D/g,'')) || 0,
      stock_proveedor: parseInt((r[3]||r[2]||'0').replace(/\D/g,'')) || 0,
      fecha_escaneo: new Date().toISOString()
    })).filter(x => x.referencia);

    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV_NOMBRE);
    const { error } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
    if (error) throw error;

    console.log(`[MBR] OK ${toInsert.length}`);
  } finally {
    await browser.close();
  }
}
run().catch(e => { console.error('[MBR] FATAL', e.message); process.exit(1); });
