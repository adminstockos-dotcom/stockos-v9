// V9.8 VERDE + TODOS LOS PRODUCTOS
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

async function getToken() {
  const res = await fetch('https://mbr.demachine.co/api/users/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: 'MBR',
      name: 'CARLSO ROJAS',
      password: PASS
    })
  });
  const j = await res.json();
  if (!j.success) throw new Error('Token fail: ' + JSON.stringify(j));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.16 VERDE BASE V9.8 + PAGINADO');
  const token = await getToken();
  console.log('[MBR] Token OK:', token.slice(0,20)+'...');

  let all = [];
  let page = 1;
  while (true) {
    const url = `https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`;
    console.log(`[MBR] Fetch pag ${page}`);
    const r = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const txt = await r.text();
    if (txt.startsWith('<!DOCTYPE')) break;
    const json = JSON.parse(txt);
    const data = json.data || [];
    console.log(`[MBR] pag ${page} -> ${data.length} total ${all.length + data.length}`);
    if (data.length === 0) break;
    all.push(...data);
    if (data.length < 20) break;
    page++;
    if (page > 100) break;
  }

  console.log(`[MBR] TOTAL CATALOGO ${all.length}`);
  
  // MISMO BORRADO QUE V9.8 VERDE
  await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);

  const toInsert = all.map(p => ({
    empresa_id: EMPRESA_ID,
    proveedor_nombre: PROV,
    referencia: `${p.code || ''} ${p.name || p.product || ''}`.trim().slice(0,150),
    talla: 'UNICA',
    precio: parseInt(p.precioventa || p.price) || 0,
    stock_proveedor: 10,
    fecha_escaneo: new Date().toISOString()
  })).filter(x=>x.referencia);

  console.log(`[MBR] A insertar ${toInsert.length}`);

  // MISMO INSERT QUE V9.8 VERDE pero en bloques de 50 para no romper
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await supabase.from('listado_maestro_proveedor').insert(chunk);
    if (error) throw error;
    console.log(`[MBR] chunk ${i}-${i+chunk.length} OK`);
  }

  console.log(`[MBR] OK VERDE ${toInsert.length} PRODUCTOS`);
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
