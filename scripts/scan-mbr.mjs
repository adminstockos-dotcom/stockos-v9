// STOCKOS V9.3 - SCANNER MBR REAL - DEMACHINE
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MBR_PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV_NOMBRE = 'MBR - MÁXIMA';

if (!SUPABASE_URL ||!SUPABASE_KEY ||!MBR_PASS) {
  console.error('Faltan secrets: SUPABASE_URL / SERVICE_ROLE / MBR_PASSWORD');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('[MBR] Iniciando...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://estock-mobile.demachine.co/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Login - 3 selectores con fallback
    const inputs = page.locator('input');
    const count = await inputs.count();
    console.log('[MBR] inputs encontrados:', count);

    if (count >= 3) {
      await inputs.nth(0).fill('MBR');
      await inputs.nth(1).fill('CARLSO ROJAS');
      await inputs.nth(2).fill(MBR_PASS);
    } else {
      await page.getByPlaceholder(/instancia/i).fill('MBR').catch(()=>{});
      await page.getByPlaceholder(/usuario/i).fill('CARLSO ROJAS').catch(()=>{});
      await page.locator('input[type="password"]').fill(MBR_PASS);
    }

    await page.getByRole('button', { name: /ingresar|entrar|login|acceder/i }).click().catch(async () => {
      await page.locator('button[type="submit"]').click();
    });

    await page.waitForTimeout(8000);
    console.log('[MBR] URL despues login:', page.url());

    // Esperar contenido
    await page.waitForTimeout(5000);

    const extracted = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.slice(0, 4000);
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const parsed = [];
      rows.forEach(tr => {
        const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (tds.length >= 3 && tds[0]) {
          parsed.push({ raw: tds });
        }
      });
      return { html, parsed, totalRows: rows.length };
    });

    console.log('[MBR] HTML sample:', extracted.html.slice(0, 500));
    console.log('[MBR] totalRows tabla:', extracted.totalRows);
    console.log('[MBR] parsed sample:', JSON.stringify(extracted.parsed.slice(0,5)));

    if (!extracted.parsed.length) {
      throw new Error('No se encontraron filas en tabla - revisa HTML sample arriba');
    }

    // Mapeo: asumimos Ref | Talla | Precio | Stock - si tu tabla es distinta lo ajustamos con el log
    const toInsert = extracted.parsed.map(r => {
      const ref = r.raw[0] || '';
      const talla = r.raw[1] || 'UNICA';
      const precioStr = r.raw[2] || '0';
      const stockStr = r.raw[3] || r.raw[2] || '0';
      return {
        empresa_id: '676d535d-5045-41ac-9d7a-117095e75d4',
        proveedor_nombre: 'MBR - MÁXIMA',
        referencia: ref,
        talla: talla,
        precio: parseInt(precioStr.replace(/[^0-9]/g,'')) || 0,
        stock_proveedor: parseInt(stockStr.replace(/[^0-9]/g,'')) || 0,
        fecha_escaneo: new Date().toISOString()
      };
    }).filter(x => x.referencia);

    console.log(`[MBR] Insertando ${toInsert.length} refs reales...`);

    const { error: delErr } = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV_NOMBRE);
    if (delErr) console.error('Error delete:', delErr.message);

    const { error: insErr } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
    if (insErr) throw insErr;

    await supabase.from('proveedores').update({ ultimo_escaneo: new Date().toISOString() }).eq('empresa_id', EMPRESA_ID).ilike('codigo','%MBR%');

    console.log(`[MBR] OK ${toInsert.length} guardados`);
  } catch (e) {
    console.error('[MBR] FATAL:', e.message);
    throw e;
  } finally {
    await browser.close();
  }
}

run();
