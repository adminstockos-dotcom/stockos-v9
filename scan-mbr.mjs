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
  const initRes = await fetch(`${BASE}/`, {headers:{'User-Agent':'Mozilla/5.0'}});
  const initC = initRes.headers.get('set-cookie')||'';
  await initRes.text();
  const r = await fetch(`${BASE}/login`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0','Cookie':initC},
    body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}&password=${encodeURIComponent(PAS)}`,
    redirect:'manual'
  });
  const cookies = r.headers.getSetCookie? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
  const c=[initC,...cookies].join('; ');
  console.log('LOGIN status',r.status,'cookies',c.length);
  return c;
}

function parsePrecio(text){
  if(!text) return 0;
  const s = typeof text === 'string'? text : JSON.stringify(text);

  // 1. Intenta JSON
  try{
    const j = JSON.parse(s);
    const str = JSON.stringify(j);
    const m = str.match(/"(precio|price|valor|precio_venta)"\s*:\s*"?([\d\.,]+)"?/i);
    if(m){
      let n = parseInt(m[2].replace(/[^\d]/g,''),10);
      if(n>=5000) return n;
    }
    // busca cualquier numero grande en el JSON
    const nums = [...str.matchAll(/(\d{5,6})/g)].map(x=>parseInt(x[1],10)).filter(n=>n>=10000 && n<=600000);
    if(nums.length) return nums[0];
  }catch{}

  // 2. Regex original + mas variantes
  let m = s.match(/"precio[^"]*"\s*:\s*"?([\d\.\,]+)"?/i);
  if(m){ let n=parseInt(m[1].replace(/[^\d]/g,''),10); if(n>=5000) return n; }

  const ms=[...s.matchAll(/\$\s*([\d\.\,]+)/g)];
  for(const mm of ms){ let n=parseInt(mm[1].replace(/[^\d]/g,''),10); if(n>=10000 && n<=600000) return n; }

  // 3. Busca en HTML: > 45000 <
  const htmlNums=[...s.matchAll(/>\s*([\d]{2,3}[\.\,][\d]{3}|\d{5,6})\s*</g)].map(x=>parseInt(x[1].replace(/[^\d]/g,''),10)).filter(n=>n>=10000 && n<=600000);
  if(htmlNums.length) return htmlNums[0];

  return 0;
}

const cookie=await login();
let {data:todos} = await supabase.from('productos_maestro').select('referencia,precio').limit(1000);
console.log('Productos en DB:',todos?.length||0);

let updates=[];
let sinPrecio=[];

for(let idx=0; idx<todos.length; idx++){
  const p=todos[idx];
  let precio=p.precio||0;
  if(!precio || precio===0){
    try{
      const url=`${BASE}/request?product=${encodeURIComponent(p.referencia)}`;
      const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json, text/html','Cookie':cookie}});
      const txt=await res.text();
      const found=parsePrecio(txt);
      if(idx<3) console.log(`DEBUG ${p.referencia} status ${res.status} len ${txt.length} found ${found} preview ${txt.slice(0,400)}`);
      if(found>0){ precio=found; console.log(p.referencia,'->',precio); }
    }catch(e){ console.log('fail',p.referencia,e.message); }
    await new Promise(r=>setTimeout(r,300));
  }
  if(!precio) sinPrecio.push(p.referencia);
  else updates.push({referencia:p.referencia, precio:precio, stock:12});
}

console.log(`Para actualizar: ${updates.length} / ${todos.length} sin: ${sinPrecio.length}`);

for(let i=0;i<updates.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(updates.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
  else console.log(`upsert ${i}-${i+100} OK`);
}
console.log('=== LISTO ===');
