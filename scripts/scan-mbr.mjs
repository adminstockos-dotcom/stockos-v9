// STOCKOS v9 - SCAN REAL 2000+ - CORREGIDO PARA TU TABLA NUEVA
const BASE = 'https://www.mbr.com.co'; // para MAXIMA cambia a https://www.maxima.com.co
const PROVEEDOR = 'mbr'; // cambia a 'maxima' si escaneas maxima
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMPRESA_ID = process.env.EMPRESA_ID || '676d535d-5045-41ac-9d7a-117095e75d4';
if(!SUPA_URL ||!SUPA_KEY) throw new Error('FALTAN SECRETS SUPABASE_URL / SERVICE_ROLE_KEY');

async function upsertRest(table, rows, conflict){
  const url = `${SUPA_URL}/rest/v1/${table}?on_conflict=${conflict}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  });
  if(!res.ok){
    const t = await res.text();
    throw new Error(`Supabase REST ${res.status} ${table} ${t.slice(0,800)}`);
  }
}

async function main(){
  let page=1;
  let all=[];
  console.log(`[${PROVEEDOR.toUpperCase()}] Iniciando scan REAL sin filtro stock`);
  while(page<=50){
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    console.log(`Pagina ${page} ${url}`);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (STOCKOS v9)' } });
    if(!r.ok){ console.log(`Fin HTTP ${r.status}`); break; }
    const data = await r.json();
    if(!data.products?.length) break;
    for(const p of data.products){
      const imgs = (p.images||[]).map(i=>i.src).filter(Boolean);
      const vars = p.variants?.length? p.variants : [{id:p.id, price:'0', inventory_quantity:0, option1:null}];
      for(const v of vars){
        let talla = v.option1 || v.option2 || v.option3 || '';
        if(talla==='Default Title') talla='';
        // sku limpio y unico
        const sku = `${p.handle}-${v.id}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
        all.push({
          empresa_id: EMPRESA_ID,
          proveedor: PROVEEDOR,
          ref: p.handle,
          sku: sku,
          referencia: p.handle,
          nombre: p.title + (talla?` - ${talla}`:''),
          marca: p.vendor || PROVEEDOR.toUpperCase(),
          precio: parseFloat(v.price||0),
          stock: v.inventory_quantity??0,
          talla: talla || null,
          imagen: imgs[0] || '',
          imagenes: imgs,
          fotografias: imgs.join(','),
          handle: p.handle,
          url_producto: `${BASE}/products/${p.handle}`,
          product_id: String(p.id),
          variant_id: String(v.id),
          disponible: true,
          activo: true,
          updated_at: new Date().toISOString()
        });
      }
    }
    console.log(`Acumulado: ${all.length} filas`);
    if(data.products.length < 250) break;
    page++;
    await new Promise(x=>setTimeout(x,400));
  }

  console.log(`TOTAL A GUARDAR: ${all.length}`);

  // TABLA NUEVA QUE CREASTE
  const TABLE = 'proveedor_mbr_products';
  let guardados=0;
  for(let i=0;i<all.length;i+=150){
    const chunk = all.slice(i,i+150);
    await upsertRest(TABLE, chunk, 'ref,talla');
    guardados+=chunk.length;
    console.log(`Guardados ${guardados}/${all.length} en ${TABLE}`);
  }
  console.log(`LISTO: ${guardados} guardados en ${TABLE}`);
}
main().catch(e=>{ console.error('FATAL', e); process.exit(1); });
