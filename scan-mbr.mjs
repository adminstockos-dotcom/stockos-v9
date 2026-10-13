process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
  const r = await fetch(`${BASE}/login`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0','Cookie':initC},
    body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}&password=${encodeURIComponent(PAS)}`,
    redirect:'manual'
  });
  const c=[initC, r.headers.get('set-cookie')||''].filter(Boolean).join('; ');
  console.log('login',r.status,'cookie len',c.length);
  return c;
}

function parsePrecio(html){
  const ms=[...html.matchAll(/\$\s*([\d\.\,]+)/g)];
  for(const m of ms){
    const n=parseInt(m[1].replace(/[^\d]/g,''),10);
    if(n>=10000 && n<=500000) return n;
  }
  const m2=html.match(/"precio"\s*:\s*(\d+)/i);
  if(m2){
    const n=parseInt(m2[1],10);
    if(n>=10000) return n;
  }
  return 0;
}

const cookie=await login();
console.log('Trayendo Shopify MBR...');
const shopRes=await fetch('https://www.mbr.com.co/products.json?limit=250&page=1');
const shopData=await shopRes.json();
console.log('Shopify productos:',shopData.products?.length||0);

let out=[];
let sinPrecio=[];

for(const p of (shopData.products||[])){
  const v=p.variants?.[0];
  const ref=(v?.sku||p.handle||'').toUpperCase();
  let precio=parseFloat(v?.price||0);
  if(!precio && cookie){
    try{
      const urls=[
        `${BASE}/request?product=${encodeURIComponent(ref)}`,
        `${BASE}/api/productos?search=${encodeURIComponent(ref)}`,
        `${BASE}/?search=${encodeURIComponent(ref)}`
      ];
      for(const url of urls){
        const txt=await (await fetch(url,{headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie}})).text();
        const found=parsePrecio(txt);
        if(found>0){ precio=found; console.log(ref,'->',precio); break; }
      }
    }catch(e){ console.log('fail',ref,e.message); }
    await new Promise(r=>setTimeout(r,400));
  }
  if(!precio) sinPrecio.push(ref);
  out.push({
    referencia:ref,
    nombre:p.title,
    talla:'M',
    precio:precio||0,
    stock:12,
    imagen_original:p.images?.[0]?.src||'',
    imagen_sin_fondo:p.images?.[0]?.src||'',
    proveedor:'MBR - MÁXIMA'
  });
}

for(let i=0;i<out.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
  else console.log(`upsert ${i}-${Math.min(i+100,out.length)} OK`);
}

console.log('=== LISTO ===');
console.log('Total:',out.length,'Con precio:',out.filter(x=>x.precio>0).length,'Sin precio:',sinPrecio.length);
if(sinPrecio.length) console.log('SIN PRECIO:',sinPrecio.join(', '));
