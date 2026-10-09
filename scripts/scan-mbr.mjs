import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE='https://www.mbr.com.co';
let all=[];
for(let page=1;page<=50;page++){
  const r=await fetch(`${BASE}/products.json?limit=250&page=${page}`,{headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok) break;
  const d=await r.json();
  if(!d.products.length) break;
  for(const p of d.products){
    const imgs=(p.images||[]).map(i=>i.src);
    for(const v of (p.variants||[{id:p.id,price:0,inventory_quantity:0}])){
      let t=v.option1||''; if(t==='Default Title') t='';
      all.push({
        sku:`${p.handle}-${v.id}`.toLowerCase(),
        referencia:p.handle,
        nombre:p.title+(t?` - ${t}`:''),
        marca:p.vendor||'MBR',
        precio:parseFloat(v.price||0),
        stock:v.inventory_quantity||0,
        talla:t||null,
        imagen:imgs[0]||'',
        imagenes:imgs,
        fotografias:imgs.join(','),
        proveedor:'mbr',
        handle:p.handle,
        url_producto:`${BASE}/products/${p.handle}`,
        disponible:true
      });
    }
  }
  if(d.products.length<250) break;
}
let g=0;
for(let i=0;i<all.length;i+=150){
  const c=all.slice(i,i+150);
  const {error}=await supabase.from('productos').upsert(c,{onConflict:'sku'});
  if(!error) g+=c.length;
}
console.log(`LISTO: ${g} guardados - ${new Set(all.map(x=>x.referencia)).size} refs`);
