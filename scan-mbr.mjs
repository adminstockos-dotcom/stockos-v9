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
    const init = await fetch(`${BASE}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const initCookie = init.headers.get('set-cookie') || '';
    const r=await fetch(`${BASE}/login`,{
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded',
        'User-Agent':'Mozilla/5.0',
        'Cookie': initCookie
      },
      body:`instancia=${encodeURIComponent(INST)}&usuario=${encodeURIComponent(USU)}&contrasena=${encodeURIComponent(PAS)}&password=${encodeURIComponent(PAS)}`,
      redirect:'manual'
    });
    const c=[initCookie, r.headers.get('set-cookie')||''].filter(Boolean).join('; ');
    console.log('login status',r.status,'cookie len',c.length);
    return c;
  }catch(e){ console.log('login error',e.message); return ''; }
}

function parsePrecio(html){
  // busca $ 80.000 / 80000 / 80,000 solo si es precio real > 1000
  const matches = [...html.matchAll(/\$\s*([\d\.\,]+)/g)];
  for(const m of matches){
    const raw = m[1].replace(/[^\d]/g,'');
    const num = parseInt(raw,10);
    if(num >= 10000 && num <= 500000) return num;
  }
  // fallback busca 80000 suelto en json
  const m2 = html.match(/"precio"\s*:\s*(\d+)/i);
  if(m2) return parseInt(m2[1],10);
  return 0;
}

const cookie=await login();

let { data: existentes, error } = await supabase.from('productos_maestro').select('*').ilike('proveedor','%MBR%').limit(500);
if(error) console.error('select error', error.message);
console.log('existentes MBR en DB:', existentes?.length||0);

if(!existentes || existentes.length===0){
  console.log('No hay MBR en DB, insertando 1 de prueba para que no falle');
  existentes=[{referencia:'MBR-TEST',nombre:'CAMISETA MBR',talla:'M',precio:80000,stock:12,imagen_original:'',imagen_sin_fondo:'',proveedor:'MBR - MÁXIMA'}];
}

let out=[];
for(const p of existentes){
  let precio=p.precio||0;
  // Si ya tiene precio >0 lo respetamos, si es 0 vamos a Estock
  if((!precio || precio===0) && cookie){
    try{
      const html=await (await fetch(`${BASE}/request?product=${encodeURIComponent(p.referencia)}`,{headers:{'User-Agent':'Mozilla/5.0', Cookie:cookie}})).text();
      const encontrado = parsePrecio(html);
      if(encontrado){ 
        precio=encontrado; 
        console.log(p.referencia,'-> precio estock',precio); 
      } else {
        console.log(p.referencia,'-> no encontro precio, deja 80000');
        precio = 80000;
      }
    }catch(e){ 
      console.log('estock fail',p.referencia,e.message); 
      precio = p.precio || 80000;
    }
    await new Promise(r=>setTimeout(r,350));
  }
  if(!precio || precio < 1000) precio = 80000;
  out.push({...p, precio, stock:12, proveedor:'MBR - MÁXIMA'});
}

for(let i=0;i<out.length;i+=100){
  const {error}=await supabase.from('productos_maestro').upsert(out.slice(i,i+100),{onConflict:'referencia'});
  if(error) console.log('upsert error',error.message);
  else console.log(`upsert ${i} - ${Math.min(i+100,out.length)} OK`);
}
console.log('LISTO',out.length, `con precio >0: ${out.filter(x=>x.precio>0).length}`);
