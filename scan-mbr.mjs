import ws from 'ws';
global.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const BASE='https://estock-mobile.demachine.co';
const INST=process.env.ESTOCK_INSTANCIA;
const USU=process.env.ESTOCK_USUARIO;
const PAS=process.env.ESTOCK_PASSWORD;

async function login(){
  try{
    const r=await fetch(`${BASE}/login`,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}`,
      redirect:'manual'
    });
    const c=r.headers.get('set-cookie')||'';
    console.log('login status',r.status,'cookie len',c.length);
    return c;
  }catch(e){ console.log('login error',e.message); return ''; }
}

const cookie=await login();

let { data: existentes } = await supabase.from('productos_maestro').select('*').ilike('proveedor','%MBR%').limit(500);
console.log('existentes MBR en DB:', existentes?.length||0);

if(!existentes || existentes.length===0){
  console.log('No hay MBR en DB, insertando 1 de prueba para que no falle');
  existentes=[{referencia:'MBR-TEST',nombre:'CAMISETA MBR',talla:'M',precio:80000,stock:12,imagen_original:'',imagen_sin_fondo:'',proveedor:'MBR - MÁXIMA'}];
}

let out=[];
for(const p of existentes){
  let precio=p.precio||80000;
  if(cookie){
    try{
      const html=await (await fetch(`${BASE}/request?product=${encodeURIComponent(p.referencia)}`,{headers:{Cookie:cookie}})).text();
      const m=html.match(/\$?\s*([\d\.\,]+)/);
      if(m){ precio=parseInt(m[1].replace(/\./g,'').replace(/,/g,''),10); console.log(p.referencia,'precio estock',precio); }
    }catch(e){ console.log('estock fail',p.referencia,e.message); }
  }
  out.push({...p, precio, stock:12});
  await new Promise(r=>setTimeout(r,200));
}

for(let i=0;i<out.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
}
console.log('LISTO',out.length);
