// STOCKOS v7.8 - SCAN MAXIMA - SIN SUPABASE-JS - SIN WEBSOCKET - 0 ERRORES
const BASE = 'https://www.maxima.com.co'; // Si Maxima usa otro dominio, cambia esta linea
const PROVEEDOR = 'maxima';
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPA_URL ||!SUPA_KEY) throw new Error('FALTAN SECRETS');

async function upsertRest(rows){
  const url = `${SUPA_URL}/rest/v1/productos?on_conflict=sku`;
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
    throw new Error(`Supabase REST ${res.status} ${t.slice(0,500)}`);
  }
}

async function main(){
  let page=1;
  let all=[];
  console.log('[MAXIMA] Iniciando listado maestro - sin supabase-js');
  while(page<=50){
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    console.log(`Pagina ${page} ${url}`);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if(!r.ok){ console.log(`Fin: HTTP ${r.status}`); break; }
    const data = await r.json();
    if(!data.products?.length) break;
    for(const p of data.products){
      const imgs = (p.images||[]).map(i=>i.src).filter(Boolean);
      const vars = p.variants?.length? p.variants : [{id:p.id, price:'0', inventory_quantity:0, option1:null}];
      for(const v of vars){
        let talla = v.option1 || v.option2 || v.option3 || '';
        if(talla==='Default Title') talla='';
        const sku = `${p.handle}-${v.id}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
        all.push({
          sku,
          referencia: p.handle,
          nombre: p.title + (talla?` - ${talla}`:''),
          marca: p.vendor || 'MAXIMA',
          precio: parseFloat(v.price||0),
          stock: v.inventory_quantity?? 0,
          talla: talla || null,
          imagen: imgs[0] || '',
          imagenes: imgs,
          fotografias: imgs.join(','),
          proveedor: PROVEEDOR,
          handle: p.handle,
          url_producto: `${BASE}/products/${p.handle}`,
          disponible: true,
          product_id: p.id,
          variant_id: v.id
        });
      }
    }
    console.log(`Acumulado: ${all.length} filas`);
    if(data.products.length < 250) break;
    page++;
  }

  console.log(`TOTAL A GUARDAR: ${all.length} - Refs: ${new Set(all.map(x=>x.referencia)).size}`);
  let guardados=0;
  for(let i=0;i<all.length;i+=150){
    const chunk = all.slice(i,i+150);
    await upsertRest(chunk);
    guardados+=chunk.length;
    console.log(`Guardados ${guardados}/${all.length}`);
  }
  console.log(`LISTO CATALOGO VIRTUAL MAXIMA: ${guardados} guardados`);
}
main().catch(e=>{ console.error('FATAL', e); process.exit(1); });
