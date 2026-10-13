import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan secrets'); process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
const BASES = ['https://www.mbr.com.co', 'https://mbr.com.co'];

async function fetchWithRetry(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.mbr.com.co/collections/all',
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.log(`Intento ${i}/${tries} fallo ${url}: ${e.message}`);
      if (i === tries) throw e;
      await new Promise(r => setTimeout(r, 1500 * i));
    }
  }
}

let allProducts = [];
console.log('Iniciando scan MBR completo...');

for (const BASE of BASES) {
  if (allProducts.length > 0) break;
  let page = 1;
  while (true) {
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    console.log(`[MBR] ${BASE} Página ${page}`);
    try {
      const data = await fetchWithRetry(url);
      if (!data.products || data.products.length === 0) break;
      for (const p of data.products) {
        const v = p.variants?.[0];
        allProducts.push({
          sku: (v?.sku && v.sku.trim() !== '') ? v.sku : (p.handle || `mbr-${p.id}`),
          nombre: p.title,
          marca: p.vendor || 'MBR',
          precio: parseFloat(v?.price || 0),
          stock: v?.inventory_quantity ?? 0,
          url_producto: `https://www.mbr.com.co/products/${p.handle}`,
          imagen: p.images?.[0]?.src || '',
          proveedor: 'mbr',
          handle: p.handle
        });
      }
      console.log(` -> Acumulados: ${allProducts.length}`);
      if (data.products.length < 250) break;
      page++;
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`Error ${BASE} pag ${page}: ${e.message}`);
      break;
    }
  }
}

console.log(`TOTAL: ${allProducts.length}. Guardando...`);
let saved = 0;
for (let i = 0; i < allProducts.length; i += 200) {
  const chunk = allProducts.slice(i, i + 200);
  const { error } = await supabase.from('productos').upsert(chunk, { onConflict: 'sku' });
  if (error) {
    const { error: err2 } = await supabase.from('productos').upsert(chunk);
    if (!err2) saved += chunk.length;
    else console.error(err2.message);
  } else {
    saved += chunk.length;
  }
}
console.log(`=== LISTO === Guardados: ${saved}/${allProducts.length}`);
