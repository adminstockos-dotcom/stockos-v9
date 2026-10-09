// V9.9 FINAL CATALOGO REAL MBR
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
  return j.data.token;
}

async function run(){
  console.log('[MBR] V9.9 CATALOGO REAL');
  const token = await getToken();
  
  let page=1, all=[];
  while(true){
    const url = `https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`;
    console.log(`[MBR] Fetch ${url}`);
    const res = await fetch(url, { headers:{'Authorization':`Bearer ${token}`}});
    const json = await res.json();
    const data = json.data || [];
    if(!data.length) break;
    all.push(...data);
    console.log(`[MBR] page ${page} -> ${data.length} (total ${all.length})`);
    if(data.length < 500) break;
    page++;
  }

  console.log(`[MBR] TOTAL PRODUCTOS CATALOGO: ${all.length}`);
  console.log('[MBR] Sample:', all.slice(0,2));

  // Guardar en Supabase
  await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);

  const toInsert = all.map(p=>({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: (p.code ? `${p.code} - ` : '') + (p.name || `ID-${p.id}`),
    talla: 'UNICA',
    precio: p.precioventa || p.preciopormayor || 0,
    stock_proveedor: 10, // el catálogo general no expone stock por API, se asume disponible
    fecha_escaneo: new Date().toISOString()
  }));

  const { error } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
  if(error) throw error;
  console.log(`[MBR] OK INSERTADOS ${toInsert.length} EN SUPABASE`);
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
