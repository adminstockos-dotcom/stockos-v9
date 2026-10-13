// scan-mbr.mjs - VERSION FINAL - 2000+ SIN FILTRO STOCK - SIN ERRORES
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl ||!supabaseKey) {
  console.error('ERROR: Faltan secrets SUPABASE_URL / SERVICE_ROLE_KEY en GitHub Actions');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BASE = 'https://www.mbr.com.co';

let page = 1;
let allProducts = [];

console.log('Iniciando scan MBR completo...');

while (true) {
  const url = `${BASE}/products.json?limit=250&page=${page}`;
  console.log(`[MBR] Página ${page} -> ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      console.log(`Fin por status ${res.status}`);
      break;
    }
    const data = await res.json();
    if (!data.products || data.products.length === 0) {
      console.log('No más productos');
      break;
    }

    for (const p of data.products) {
      const v = p.variants?.[0];
      allProducts.push({
        sku: (v?.sku && v.sku.trim()!== '')? v.sku : (p.handle || `mbr-${p.id}`),
        nombre: p.title,
        marca: p.vendor || 'MBR',
        precio: parseFloat(v?.price || 0),
        stock: v?.inventory_quantity?? 0,
        url_producto: `${BASE}/products/${p.handle}`,
        imagen: p.images?.[0]?.src || '',
        proveedor: 'mbr',
        handle: p.handle
      });
    }

    console.log(` -> Acumulados: ${allProducts.length}`);
    if (data.products.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 400));
  } catch (e) {
    console.error(`Error página ${page}:`, e.message);
    break;
  }
}

console.log(`TOTAL ENCONTRADOS: ${allProducts.length}. Guardando en lotes de 200...`);

let saved = 0;
for (let i = 0; i < allProducts.length; i += 200) {
  const chunk = allProducts.slice(i, i + 200);
  const { error } = await supabase.from('productos').upsert(chunk, { onConflict: 'sku' });
  if (error) {
    const { error: err2 } = await supabase.from('productos').upsert(chunk);
    if (err2) console.error(`Error lote ${i/200+1}:`, err2.message);
    else saved += chunk.length;
  } else {
    saved += chunk.length;
    console.log(`Lote ${i/200+1} OK (${saved}/${allProducts.length})`);
  }
}

console.log(`\n=== LISTO ===`);
console.log(`Productos MBR guardados: ${saved} / ${allProducts.length}`);
