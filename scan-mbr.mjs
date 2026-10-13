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
  }catch(e){ console.log('login error',e.message); return ''; }
}

function parsePrecio(html){
  if(!html) return 0;
  try{
    if(typeof html!=='string') html=JSON.stringify(html);
    let m=html.match(/"precio(?:_final)?"\s*:\s*"?(\d+[\d\.,]*)"?/i);
    if(m){ let n=parseInt(m[1].replace(/[^\d]/g,''),10); if(n>=5000) return n; }
    const ms=[...html.matchAll(/\$\s*([\d\.\,]+)/g)];
    for(const mm of ms){ let n=parseInt(mm[1].replace(/[^\d]/g,''),10); if(n>=10000 && n<=500000) return n; }
  }catch{}
  return 0;
}

const cookie=await login();

let {data:todos} = await supabase.from('productos_maestro').select('*').limit(1000);
console.log('Productos en DB:',todos?.length||0);

if(!todos || todos.length===0){
  console.log('Tabla vacia, no hay nada que actualizar');
  process.exit(0);
}

let out=[];
let sinPrecio=[];

for(const p of todos){
  let precio=p.precio||0;
  if((!precio || precio===0) && cookie){
    try{
      const txt=await (await fetch(`${BASE}/request?product=${encodeURIComponent(p.referencia)}`,{headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie}})).text();
      const found=parsePrecio(txt);
      if(found>0){ precio=found; console.log(p.referencia,'->',precio); }
    }catch(e){ console.log('fail',p.referencia,e.message); }
    await new Promise(r=>setTimeout(r,300));
  }
  if(!precio) sinPrecio.push(p.referencia);
  out.push({...p, precio:precio||0, stock:12, proveedor:'MBR - MÁXIMA'});
}

for(let i=0;i<out.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
  else console.log(`upsert ${i}-${Math.min(i+100,out.length)} OK`);
}

console.log('=== LISTO ===');
console.log('Total:',out.length,'Con precio:',out.filter(x=>x.precio>0).length,'Sin precio:',sinPrecio.length);
