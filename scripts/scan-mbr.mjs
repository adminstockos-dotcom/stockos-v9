// V9.17 VERDE 2000 - BASE V9.8 + RETRY DNS
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function getToken() {
  const res = await fetch('https://mbr.demachine.co/api/users/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'MBR', name: 'CARLSO ROJAS', password: PASS })
  });
  const j = await res.json();
  if (!j.success) throw new Error('Token fail: ' + JSON.stringify(j));
  return j.data.token;
}

async function supaWithRetry(fn, label){
  for(let i=0;i<5;i++){
    try{
      const r = await fn();
      if(r.error) throw r.error;
      return r;
    }catch(e){
      console.log(`[MBR] ${label} intento ${i+1} fallo: ${e.message} - reintentando 3s...`);
      if(i===4) throw e;
      await new Promise(r=>setTimeout(r, 3000 + i*2000));
    }
  }
}

async function run() {
  console.log('[MBR] V9.17 VERDE 2000 BASE V9.8');
  const token = await getToken();
  console.log('[MBR] Token OK');

  let all = [];
  let page = 1;
  while (true) {
    const url = `https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    const json = JSON.parse(await r.text());
    const data = json.data || [];
    if (data.length === 0) break;
    all.push(...data);
    console.log(`[MBR] pag ${page} -> ${data.length} total ${all.length}`);
    if (data.length < 20 || page >= 100) break;
    page++;
  }
  console.log(`[MBR] TOTAL ${all.length}`);

  console.log('[MBR] Borrando con retry...');
  await supaWithRetry(()=>supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV), 'DELETE');

  const toInsert = all.map(p => ({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${p.code || ''} ${p.name}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: parseInt(p.precioventa) || 0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  }));

  console.log(`[MBR] Insertando ${toInsert.length} en chunks de 25 con retry...`);
  for (let i = 0; i < toInsert.length; i += 25) {
    const chunk = toInsert.slice(i, i + 25);
    await supaWithRetry(()=>supabase.from('listado_maestro_proveedor').insert(chunk), `INSERT ${i}`);
    console.log(`[MBR] chunk ${i}-${i+chunk.length} OK`);
    await new Promise(r=>setTimeout(r, 500));
  }
  console.log(`[MBR] FIN VERDE ${toInsert.length} PRODUCTOS`);
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
