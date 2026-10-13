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
  try{
    const initRes = await fetch(`${BASE}/`, {headers:{'User-Agent':'Mozilla/5.0'}});
    const initHtml = await initRes.text();
    const initC = initRes.headers.get('set-cookie')||'';
    console.log('GET / status',initRes.status,'len',initHtml.length);

    const r = await fetch(`${BASE}/login`,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0','Cookie':initC},
      body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}&password=${encodeURIComponent(PAS)}`,
      redirect:'manual'
    });
    const setC = r.headers.get('set-cookie')||'';
    const c=[initC, setC].filter(Boolean).join('; ');
    const txt = await r.text();
    console.log('POST /login status',r.status,'cookie len',c.length,'location',r.headers.get('location')||'no');
    console.log('login body preview:',txt.slice(0,500));
    return c;
  }catch(e){ console.log('login error',e.message); return ''; }
}

function parsePrecio(html){
  if(!html) return 0;
  try{
    const s=typeof html==='string'?html:JSON.stringify(html);
    let m=s.match(/"precio[^"]*"\s*:\s*"?([\d\.\,]+)"?/i);
    if(m){ let n=parseInt(m[1].replace(/[^\d]/g,''),10); if(n>=5000) return n; }
    const ms=[...s.matchAll(/\$\s*([\d\.\,]+)/g)];
    for(const mm of ms){ let n=parseInt(mm[1].replace(/[^\d]/g,''),10); if(n>=10000 && n<=600000) return n; }
  }catch{}
  return 0;
}

const cookie=await login();

let {data:todos} = await supabase.from('productos_maestro').select('*').limit(1000);
console.log('Productos en DB:',todos?.length||0);

let updates=[];
let sinPrecio=[];

for(let idx=0; idx<todos.length; idx++){
  const p=todos[idx];
  let precio=p.precio||0;
  if(!precio || precio===0){
    try{
      const url=`${BASE}/request?product=${encodeURIComponent(p.referencia)}`;
      const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie}});
      const txt=await res.text();
      const found=parsePrecio(txt);
      if(idx<2) console.log(`DEBUG ${p.referencia} status ${res.status} len ${txt.length} preview ${txt.slice(0,300)} found ${found}`);
      if(found>0){ precio=found; console.log(p.referencia,'->',precio); }
    }catch(e){ console.log('fail',p.referencia,e.message); }
    await new Promise(r=>setTimeout(r,300));
  }
  if(!precio) sinPrecio.push(p.referencia);
  else updates.push({referencia:p.referencia, precio:precio, stock:12});
}

console.log(`Para actualizar: ${updates.length}`);

for(let i=0;i<updates.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(updates.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
  else console.log(`upsert ${i}-${i+100} OK`);
}

console.log('=== LISTO ===');
console.log('Total:',todos.length,'Con precio:',updates.length,'Sin precio:',sinPrecio.length);
