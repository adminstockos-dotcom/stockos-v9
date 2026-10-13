import ws from 'ws';
global.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const BASE='https://estock-mobile.demachine.co';
const INST=process.env.ESTOCK_INSTANCIA || 'MBR';
const USU=process.env.ESTOCK_USUARIO;
const PAS=process.env.ESTOCK_PASSWORD;

async function login(){
  const init = await fetch(`${BASE}/`, {headers:{'User-Agent':'Mozilla/5.0'}});
  const initC = init.headers.get('set-cookie')||'';
  const r=await fetch(`${BASE}/login`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0','Cookie':initC},
    body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}&password=${encodeURIComponent(PAS)}`,
    redirect:'manual'
  });
  const c=[initC, r.headers.get('set-cookie')||''].filter(Boolean).join('; ');
  console.log('login',r.status,'cookie',c.length);
  return c;
}

function extraePrecio(html, json){
  // 1. $ 80.000
  let m=[...html.matchAll(/\$\s*([\d\.\,]+)/g)];
  for(let x of m){
    let n=parseInt(x[1].replace(/[^\d]/g,''),10);
    if(n>=10000 && n<=500000) return n;
  }
  // 2. JSON "precio":80000
  try{
    if(json){
      let j=typeof json==='string'?JSON.parse(json):json;
      if(j.precio) return parseInt(j.precio,10);
      if(j.price) return parseInt(j.price,10);
      if(j.data?.[0]?.precio) return parseInt(j.data[0].precio,10);
    }
  }catch{}
  let m2=html.match(/"precio"\s*:\s*"?(\d+)"?/i);
  if(m2) return parseInt(m2[1],10);
  return 0;
}

async function getPrecioEstock(ref, cookie){
  const rutas=[
    `${BASE}/request?product=${encodeURIComponent(ref)}`,
    `${BASE}/api/productos?search=${encodeURIComponent(ref)}`,
    `${BASE}/api/buscar?q=${encodeURIComponent(ref)}`,
    `${BASE}/buscar?term=${encodeURIComponent(ref)}`,
    `${BASE}/?search=${encodeURIComponent(ref)}`,
    `${BASE}/api/stock?producto=${encodeURIComponent(ref)}`
  ];
  for(let url of rutas){
    try{
      const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Cookie':cookie,'Referer':BASE+'/','Accept':'*/*'}});
      const txt=await res.text();
      const precio=extraePrecio(txt, txt);
      if(precio>0){
        console.log(ref,'encontrado en',url,'->',precio);
        return precio;
      }
    }catch(e){}
    await new Promise(r=>setTimeout(r,200));
  }
  return 0;
}

const cookie=await login();

let {data:shop} = await (async()=>{
  try{
    let r=await fetch('https://www.mbr.com.co/products.json?limit=250&page=1');
    return {data:await r.json()};
  }catch{ return {data:{products:[]}} }
})();

if(!shop.products || shop.products.length===0){
  let {data:exist}=await supabase.from('productos_maestro').select('*').ilike('proveedor','%MBR%').limit(500);
  console.log('Shopify fallo, usando DB:',exist?.length||0);
  shop={products:[]};
}

let out=[];
for(let p of (shop.products||[])){
  let v=p.variants[0];
  let ref=(v.sku||p.handle).toUpperCase();
  let precio=parseFloat(v.price||0);
  if(!precio){
    precio=await getPrecioEstock(ref, cookie);
  }
  // ULTIMO INTENTO: si sigue 0, busca por nombre
  if(!precio){
    precio=await getPrecioEstock(p.title, cookie);
  }
  if(!precio){
    console.log(ref,'*** SIN PRECIO ESTOCK, SE QUEDA 0 - REVISAR MANUAL ***');
  }
  out.push({
    referencia:ref,
    nombre:p.title,
    talla:'M',
    precio:precio, // si es 0 lo veras en logs, pero intentara todas las rutas
    stock:12,
    imagen_original:p.images[0]?.src||'',
    imagen_sin_fondo:p.images[0]?.src||'',
    proveedor:'MBR - MÁXIMA'
  });
  await new Promise(r=>setTimeout(r,300));
}

for(let i=0;i<out.length;i+=100){
  let {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert err',error.message);
}
console.log('LISTO total',out.length,'con precio',out.filter(x=>x.precio>0).length,'en 0',out.filter(x=>x.precio===0).length);
