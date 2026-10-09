// V9.11 BULLETPROOF - FIX FETCH FAILED SUPABASE
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;

if(!URL || !KEY || !PASS){
  console.error('[MBR] ENV FALTAN', {hasURL:!!URL, hasKEY:!!KEY, hasPASS:!!PASS});
  throw new Error('Faltan ENV');
}

const supabase = createClient(URL, KEY, { 
  auth:{persistSession:false},
  global:{ fetch: (url, opts) => fetch(url, {...opts, signal: undefined}) } // fix abort en actions
});

const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function getToken(){
  const r = await fetch('https://mbr.demachine.co/api/users/token',{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify({company:'MBR', name:'CARLSO ROJAS', password:PASS})
  });
  const j = await r.json();
  if(!j.success) throw new Error('Token '+JSON.stringify(j));
  return j.data.token;
}

async function run(){
  console.log('[MBR] V9.11 BULLETPROOF');
  const token = await getToken();
  console.log('[MBR] Token OK');

  let all=[];
  for(let p=1;p<=5;p++){
    const res = await fetch(`https://mbr.demachine.co/api/products?page=${p}&maxPerPage=500`,{
      headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json'}
    });
    const txt = await res.text();
    if(txt.startsWith('<!DOCTYPE')) break;
    const j = JSON.parse(txt);
    const data = j.data || [];
    console.log(`[MBR] pag ${p}: ${data.length}`);
    all.push(...data);
    if(data.length<500) break;
  }
  console.log(`[MBR] TOTAL CATALOGO ${all.length}`);

  if(all.length===0) throw new Error('Catalogo vacio');

  console.log('[MBR] Borrando viejo en chunks...');
  // borrado seguro sin fetch grande
  const del = await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
  if(del.error) console.log('[MBR] DEL WARN', del.error.message);
  else console.log('[MBR] Borrado OK');

  const toInsert = all.map(pr=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${pr.code||''} ${pr.name}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: Number(pr.precioventa)||0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));

  console.log(`[MBR] Insertando ${toInsert.length} en bloques de 50...`);
  for(let i=0;i<toInsert.length;i+=50){
    const chunk = toInsert.slice(i,i+50);
    const ins = await supabase.from('listado_maestro_proveedor').insert(chunk);
    if(ins.error) throw new Error(`INSERT CHUNK ${i} FAIL: ${ins.error.message}`);
    console.log(`[MBR] chunk ${i}-${i+chunk.length} OK`);
  }
  console.log(`[MBR] FIN OK ${toInsert.length} GUARDADOS`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e.message, e.stack?.slice(0,500)); process.exit(1); });
