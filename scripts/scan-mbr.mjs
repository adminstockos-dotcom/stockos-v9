// STOCKOS V9.3 - SCANNER MBR REAL - DEMACHINE - FIXED V9.4
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MBR_PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV_NOMBRE = 'MBR - MÁXIMA';

if (!SUPABASE_URL ||!SUPABASE_KEY ||!MBR_PASS) {
  console.error('Faltan secrets');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('[MBR] Iniciando...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const count = await page.locator('input').count();
    console.log('[MBR] inputs encontrados:', count);

    if (count >= 3) {
      await page.locator('input').nth(0).fill('MBR');
      await page.locator('input').nth(1).fill('CARLSO ROJAS');
      await page.locator('input').nth(2).fill(MBR_PASS);
    } else {
      await page.getByPlaceholder(/instancia/i).fill('MBR').catch(()=>{});
      await page.getByPlaceholder(/usuario/i).fill('CARLSO ROJAS').catch(()=>{});
      await page.locator('input[type="password"]').fill(MBR_PASS);
    }

    await page.getByRole('button', { name: /ingresar|entrar|login|acceder/i }).click().catch(async () => {
      await page.locator('button[type="submit"]').click();
    });

    // Espera login real
    await page.waitForURL(/home|dashboard|main|stock/i, { timeout: 30000 }).catch(()=>{});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(()=>{});
    console.log('[MBR] URL despues login:', page.url());

    // --- FIX: Navegar al modulo de existencias ---
    // Demachine normalmente usa /stock, /existencia, /consulta
    const posibles = [
      'https://estock-mobile.demachine.co/stock',
      'https://estock-mobile.demachine.co/existencias',
      'https://estock-mobile.demachine.co/consulta',
      'https://estock-mobile.demachine.co/inventario',
      'https://estock-mobile.demachine.co/home'
    ];
    for (const url of posibles) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(()=>{});
      await page.waitForTimeout(3000);
      const hasTable = await page.locator('table,.q-table, [class*="table"]').count();
      if (hasTable > 0) {
        console.log('[MBR] Modulo encontrado en:', url);
        break;
      }
      // Intenta click en menu que diga Stock / Existencias
      await page.getByText(/stock|existencias|consulta|inventario/i).first().click({ timeout: 3000 }).catch(()=>{});
      await page.waitForTimeout(2000);
    }

    // Esperar que cargue la tabla de verdad
    console.log('[MBR] Esperando tabla real...');
    await page.waitForSelector('table tbody tr, tbody tr,.q-tr', { timeout: 45000 });

    const extracted = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.slice(0, 4000);
      const rows = Array.from(document.querySelectorAll('table tbody tr,.q-table tbody tr, tbody tr'));
      const parsed = [];
      rows.forEach(tr => {
        if (tr.innerText.trim().length < 5) return;
        const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (tds.length >= 2 && tds[0]) {
          parsed.push({ raw: tds });
        }
      });
      return { html, parsed, totalRows: rows.length };
    });

    console.log('[MBR] HTML sample:', extracted.html.slice(0, 800));
    console.log('[MBR] totalRows tabla:', extracted.totalRows);
    console.log('[MBR] parsed sample:', JSON.stringify(extracted.parsed.slice(0,5)));

    if (!extracted.parsed.length) throw new Error('No se encontraron filas en tabla - revisa HTML sample arriba');

    const toInsert = extracted.parsed.map(r => {
      const ref = r.raw[0] || '';
      const talla = r.raw[1] || 'UNICA';
      const precioStr = r.raw[2] || '0';
      const stockStr = r.raw[3] || r.raw[2] || '0';
      return {
        empresa_id: EMPRESA_ID,
        proveedor_nombre: PROV_NOMBRE,
        referencia: ref,
        talla: talla,
        precio: parseInt(precioStr.replace(/[^0-9]/g,'')) || 0,
        stock_proveedor: parseInt(stockStr.replace(/[^0-9]/g,'')) || 0,
        fecha_escaneo: new Date().toISOString()
      };
    }).filter(x => x.referencia && x.referencia.length > 2);

    console.log(`[MBR] Insertando ${toInsert.length} refs reales...`);
    const { error: delErr } = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV_NOMBRE);
    if (delErr) console.error('Error delete:', delErr.message);

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
      if (insErr) throw insErr;
      await supabase.from('proveedores').update({ ultimo_escaneo: new Date().toISOString() }).eq('empresa_id', EMPRESA_ID).ilike('codigo','%MBR%');
      console.log(`[MBR] OK ${toInsert.length} guardados`);
    }
  } catch (e) {
    console.error('[MBR] FATAL:', e.message);
    throw e;
  } finally {
    await browser.close();
  }
}
run();
