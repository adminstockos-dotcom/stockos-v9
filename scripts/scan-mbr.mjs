// V9.10 FIX - Headers correctos
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function getToken(){
  const r = await fetch('https://mbr.demachine.co/api/users/token',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({company:'MBR', name:'CARLSO ROJAS', password:PASS})
  });
  const j = await r.json();
  if(!j.success) throw new Error('Token fail '+JSON.stringify(j));
  return j.data.token;
}

async function run(){
  console.log('[MBR] V9.10 FIX CATALOGO');
  const token = await getToken();
  console.log('[MBR] Token OK');
  
  let page=1, all=[];
  while(true){
    const url = `https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`;
    console.log(`[MBR] Fetch ${url}`);
    const res = await fetch(url, { 
      headers:{
        'Authorization':`Bearer ${token}`,
        'Accept':'application/json',
        'Content-Type':'application/json'
      }
    });
    const txt = await res.text();
    if(txt.startsWith('<!DOCTYPE')){
      throw new Error('Sesion expirada, HTML recibido: ' + txt.slice(0,200));
    }
    const json = JSON.parse(txt);
    const data = json.data || [];
    if(!data.length) break;
    all.push(...data);
    console.log(`[MBR] page ${page} -> ${data.length} total ${all.length}`);
    if(data.length < 500) break;
    page++;
    if(page>10) break;
  }

  console.log(`[MBR] TOTAL ${all.length}`);
  await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
  const toInsert = all.map(p=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: (p.code ? `${p.code} - ` : '') + (p.name || `ID-${p.id}`),
    talla: 'UNICA',
    precio: p.precioventa || 0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));
  const { error } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
  if(error) throw error;
  console.log(`[MBR] OK ${toInsert.length} GUARDADOS`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e.message); process.exit(1); });
