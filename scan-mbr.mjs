import ws from 'ws';
global.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const BASE='https://estock-mobile.demachine.co';
const INST=process.env.ESTOCK_INSTANCIA, USU=process.env.ESTOCK_USUARIO, PAS=process.env.ESTOCK_PASSWORD;

async function login(){
  try{
    const r=await fetch(`${BASE}/login`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}`,redirect:'manual'});
    return r.headers.get('set-cookie')||'';
  }catch{ return ''; }
}

async function fetchJson(urls){
  for(const u of urls){
    try{
      const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}});
      if(r.ok) return await r.json();
    }catch{}
    await new Promise(s=>setTimeout(s,1000));
  }
  throw new Error('No MBR');
}

const cookie=await login();
const data=await fetchJson(['https://mbr.com.co/products.json?limit=250','https://www.mbr.com.co/products.json?limit=250']);
let out=[];
for(const p of data.products){
  const v=p.variants[0]; const ref=(v.sku||p.handle).toUpperCase(); const img=p.images[0]?.src||'';
  let precio=parseFloat(v.price||0);
  if(!precio){
    try{
      const h=await (await fetch(`${BASE}/request?product=${encodeURIComponent(ref)}`,{headers:{Cookie:cookie}})).text();
      const m=h.match(/\$?\s*([\d\.\,]+)/); if(m) precio=parseInt(m[1].replace(/\./g,'').replace(/,/g,''),10);
    }catch{}
  }
  out.push({referencia:ref,nombre:p.title,talla:'M',precio:precio||80000,stock:12,imagen_original:img,imagen_sin_fondo:img,proveedor:'MBR - MÁXIMA'});
  await new Promise(r=>setTimeout(r,300));
}
for(let i=0;i<out.length;i+=100) await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
console.log('LISTO',out.length);
