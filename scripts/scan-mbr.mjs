process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EMPRESA_ID = process.env.EMPRESA_ID || '676d535d-5045-41ac-9d7a-117095e75d4';
const BASE = 'https://estock-mobile.demachine.co';
const USER = 'CARLOS ROJAS';
const PASS = 'CARLOS2026';

async function main(){
  console.log('Login MBR...');
  let r = await fetch(`${BASE}/api/login`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({usuario: USER, password: PASS})
  });
  let txt = await r.text();
  console.log('Login status', r.status, txt.slice(0,300));
  
  let token = null;
  try { 
    const j = JSON.parse(txt);
    token = j.token || j.access_token || j.accessToken || j.data?.token;
  } catch {}
  if(!token) throw new Error('No token MBR - revisa usuario/clave');

  const endpoints = [
    '/api/productos',
    '/api/articulos',
    '/api/productos/listado',
    '/api/catalogo',
    '/api/stock',
    '/api/v1/productos',
    '/api/inventario'
  ];

  let productos = [];
  for(const ep of endpoints){
    console.log(`Probando ${ep}...`);
    r = await fetch(`${BASE}${ep}`, {
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}
    });
    txt = await r.text();
    console.log(`  status ${r.status} len ${txt.length}`);
    if(r.ok && txt.length > 10){
      try {
        const data = JSON.parse(txt);
        const arr = Array.isArray(data) ? data : (data.productos || data.items || data.data || data.result || []);
        if(arr.length > 0){
          productos = arr;
          console.log(`OK ${ep} ${productos.length}`);
          break;
        }
      } catch(e){ console.log('  parse error', e.message); }
    }
  }

  console.log(`Total productos encontrados: ${productos.length}`);
  if(productos.length === 0){
    fs.writeFileSync('mbr_raw.json', txt);
    console.log('Guardado mbr_raw.json para debug');
    return;
  }

  // Upsert
  let ok = 0;
  for(const p of productos){
    const sku = p.codigo || p.sku || p.referencia || p.cod_producto || p.id || '';
    if(!sku) continue;
    const payload = {
      empresa_id: EMPRESA_ID,
      proveedor: 'mbr',
      sku: String(sku).trim(),
      nombre: p.nombre || p.descripcion || p.producto || 'SIN NOMBRE',
      descripcion: p.descripcion || p.detalle || null,
      precio: parseFloat(p.precio || p.precio1 || p.precio_venta || 0) || 0,
      stock: parseInt(p.stock || p.existencia || p.saldo || 0) || 0,
      categoria: p.categoria || p.grupo || p.linea || null,
      marca: p.marca || null,
      raw: p
    };
    const up = await fetch(`${SUPABASE_URL}/rest/v1/productos_maestro`,{
      method:'POST',
      headers:{
        'apikey': SUPABASE_KEY,
        'Authorization':`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    if(up.ok) ok++;
  }
  console.log(`Upsert OK: ${ok}/${productos.length}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
