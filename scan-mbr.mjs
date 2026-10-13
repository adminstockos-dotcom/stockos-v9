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
  console.log('login status',r.status,'cookie',c.length);
  return c;
}

function parsePrecio(html){
  const ms=[...html.matchAll(/\$\s*([\d\.\,]+)/g)];
  for(const m of ms){
    const n=parseInt(m[1].replace(/[^\d]/g,''),10);
    if(n>=10000 && n<=500000) return n;
  }
  const m2=html.match(/"precio"\s*:\s*"?(\d+)"?/i);
  if(m2){
    const n=parseInt(m2[1],10);
    if(n>=10000) return n;
  }
  return 0;
}

async function getPrecio(ref, cookie){
  const urls=[
    `${BASE}/request?product=${encodeURIComponent(ref)}`,
    `${BASE}/api/productos?search=${encodeURIComponent(ref)}`,
    `${BASE}/?search=${encodeURIComponent(ref)}`
  ];
  for(const url of urls){
    try{
      const txt=await (await fetch(url,{headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie}})).text();
      const p=parsePrecio(txt);
      if(p>0) return p;
    }catch{}
  }
  return 0;
}

const cookie=await login();

console.log('Trayendo productos de Shopify MBR...');
const shopifyRes=await fetch('https://www.mbr.com.co/products.json?limit=250&page=1');
const shopData=await shopifyRes.json();
console.log('Shopify:',shopData.products?.length||0);

let out=[];
let sinPrecio=[];

for(const p of (shopData.products||[])){
  const v=p.variants?.[0];
  const ref=(v?.sku||p.handle||'').toUpperCase();
  let precio=parseFloat(v?.price||0);
  if(!precio){
    precio=await getPrecio(ref, cookie);
    if(precio>0) console.log(ref,'->',precio);
  }
  if(!precio){
    sinPrecio.push(ref);
    console.log(ref,'SIN PRECIO - se deja 0 (no inventado)');
  }
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
  await new Promise(r=>setTimeout(r,350));
}

for(let i=0;i<out.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
}

console.log('=== LISTO ===');
console.log('Total:',out.length);
console.log('Con precio:',out.filter(x=>x.precio>0).length);
console.log('Sin precio (no inventado):',sinPrecio.length);
if(sinPrecio.length) console.log(sinPrecio.join(', '));
