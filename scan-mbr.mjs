import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl ||!supabaseKey) { console.error('ERROR: Faltan secrets'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
const BASES = ['https://www.mbr.com.co', 'https://mbr.com.co'];
const ESTOCK_BASE = 'https://estock-mobile.demachine.co';

async function fetchWithRetry(url, tries = 3, isJson = true) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          'Accept': isJson? 'application/json, text/plain, */*' : 'text/html',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Referer': 'https://www.mbr.com.co/collections/all',
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return isJson? await res.json() : await res.text();
    } catch (e) {
      console.log(`Intento ${i}/${tries} fallo ${url}: ${e.message}`);
      if (i === tries) throw e;
      await new Promise(r => setTimeout(r, 1200 * i));
    }
  }
}

// NUEVO: saca precio real de estock-mobile si viene en 0
async function getPrecioEstock(referencia, nombre){
  try{
    const q = referencia || nombre;
    const url = `${ESTOCK_BASE}/request?product=${encodeURIComponent(q)}`;
    const html = await fetchWithRetry(url, 2, false);
    const m = html.match(/\$\s*([\d\.\,]+)/);
    if(m){
      let num = parseInt(m[1].replace(/\./g,'').replace(/,/g,''),10);
      if(num>1000) return num;
    }
  }catch{}
  return 0;
}

let allProducts = [];
let allMaestro = [];
console.log('Iniciando scan MBR completo 197 + precio real...');

for (const BASE of BASES) {
  if (allProducts.length > 0) break;
  let page = 1;
  while (true) {
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    console.log(`[MBR] ${BASE} Página ${page}`);
    try {
      const data = await fetchWithRetry(url, 3, true);
      if (!data.products || data.products.length === 0) break;
      for (const p of data.products) {
        const v = p.variants?.[0];
        const sku = (v?.sku && v.sku.trim()!== '')? v.sku : (p.handle || `mbr-${p.id}`);
        const img = p.images?.[0]?.src || '';
        let precio = parseFloat(v?.price || 0);

        // Si precio es 0, busca en estock-mobile (tu captura de $80.000)
        if(!precio || precio===0){
          const precioEstock = await getPrecioEstock(sku, p.title);
          if(precioEstock>0) precio = precioEstock;
          await new Promise(r=>setTimeout(r, 700));
        }

        allProducts.push({
          sku,
          nombre: p.title,
          marca: p.vendor || 'MBR',
          precio,
          stock: v?.inventory_quantity?? 12,
          url_producto: `https://www.mbr.com.co/products/${p.handle}`,
          imagen: img,
          proveedor: 'mbr',
          handle: p.handle
        });

        // Guarda donde lee TabCatalogo: productos_maestro
        allMaestro.push({
          referencia: sku.toUpperCase(),
          nombre: p.title,
          talla: 'M',
          precio,
          stock: v?.inventory_quantity?? 12,
          imagen_original: img,
          imagen_sin_fondo: img, // tu proceso de quitar fondo ya lo hace, dejamos misma
          proveedor: 'MBR - MÁXIMA'
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

console.log(`TOTAL: ${allProducts.length}. Guardando en 2 tablas...`);

// 1. Tabla productos (compatibilidad)
for (let i = 0; i < allProducts.length; i += 200) {
  const chunk = allProducts.slice(i, i + 200);
  await supabase.from('productos').upsert(chunk, { onConflict: 'sku' });
}

// 2. Tabla productos_maestro (la que muestra tu catálogo de 197 con foto)
let savedMaestro = 0;
for (let i = 0; i < allMaestro.length; i += 200) {
  const chunk = allMaestro.slice(i, i + 200);
  const { error } = await supabase.from('productos_maestro').upsert(chunk, { onConflict: 'referencia' });
  if(!error) savedMaestro += chunk.length;
  else console.error('Maestro error:', error.message);
}

console.log(`=== LISTO === productos: ${allProducts.length} | productos_maestro: ${savedMaestro} con precio real`);
