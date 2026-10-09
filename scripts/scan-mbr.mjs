// V9.8 FINAL - API DIRECTA MBR
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

async function tryEndpoints(token) {
  const endpoints = [
    '/api/products',
    '/api/products/index',
    '/api/products/list',
    '/api/products/catalog',
    '/api/products/all',
    '/api/stock',
    '/api/stocks',
    '/api/inventory',
    '/api/inventories',
    '/api/warehouse/products',
    '/api/catalog',
    '/api/products/indexMe',
    '/api/products/available',
    '/api/requests/products', // prueba
  ];
  
  for (const ep of endpoints) {
    const url = `https://mbr.demachine.co${ep}?page=1&maxPerPage=500`;
    console.log(`[MBR] PROBANDO ${url}`);
    try {
      const r = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const txt = await r.text();
      console.log(`[MBR] ${ep} -> ${r.status} ${txt.slice(0,800)}`);
      if (txt.includes('"product"') && txt.length > 1000) {
        return { url, data: JSON.parse(txt) };
      }
    } catch(e){ console.log(`[MBR] ${ep} ERR ${e.message}`) }
  }
  return null;
}

async function run() {
  console.log('[MBR] V9.8 FINAL');
  const token = await getToken();
  console.log('[MBR] Token OK:', token.slice(0,20)+'...');

  // 1. Probar endpoints
  const found = await tryEndpoints(token);
  
  if (found) {
    console.log('[MBR] ENDPOINT ENCONTRADO:', found.url);
    const results = found.data?.data?.results || found.data?.data || found.data?.results || [];
    console.log(`[MBR] Total productos: ${results.length}`);
    
    // Guardar en Supabase
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
    const toInsert = results.map(p => ({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV,
      referencia: (p.product || p.code || p.reference || '').slice(0,100),
      talla: p.size || 'UNICA',
      precio: parseInt(p.price) || 0,
      stock_proveedor: parseInt(p.quantity || p.stock || 1) || 1,
      fecha_escaneo: new Date().toISOString()
    })).filter(x=>x.referencia);

    if (toInsert.length > 0) {
      const { error } = await supabase.from('listado_maestro_proveedor').insert(toInsert);
      if (error) throw error;
      console.log(`[MBR] OK INSERTADOS ${toInsert.length}`);
    }
  } else {
    // Fallback: usa tus solicitudes como stock temporal (lo que ya tienes en el log)
    console.log('[MBR] No hay endpoint publico de catálogo, usando indexMe como fallback');
    const r = await fetch('https://mbr.demachine.co/api/requests/indexMe?page=1&maxPerPage=200', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const j = await r.json();
    const results = j.data.results || [];
    console.log(`[MBR] Fallback items: ${results.length}`, results.slice(0,2));
    
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
    const toInsert = results.map(p => ({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV,
      referencia: `${p.product} - ${p.size} - ${p.color}`.slice(0,150),
      talla: p.size || 'UNICA',
      precio: p.price || 0,
      stock_proveedor: 1,
      fecha_escaneo: new Date().toISOString()
    }));
    await supabase.from('listado_maestro_proveedor').insert(toInsert);
    console.log(`[MBR] OK Fallback ${toInsert.length}`);
  }
}

run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
