import fs from 'fs';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BASE = 'https://estock-mobile.demachine.co';
const USER = 'CARLSO ROJAS';
const PASS = 'CARLOS2026';

async function main(){
  console.log('Login MBR...');
  let r = await fetch(`${BASE}/api/login`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({usuario:USER, password:PASS})
  });
  let txt = await r.text();
  console.log('Login status', r.status, txt.slice(0,200));
  
  let token = null;
  try { const j = JSON.parse(txt); token = j.token || j.access_token || j.accessToken; } catch {}
  if(!token) throw new Error('No token MBR');

  const endpoints = ['/api/productos','/api/articulos','/api/productos/listado','/api/catalogo','/api/stock','/api/v1/productos'];
  let productos = [];
  for(const ep of endpoints){
    console.log(`Probando ${ep}...`);
    r = await fetch(`${BASE}${ep}`, { headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'} });
    txt = await r.text();
    console.log(`  status ${r.status} len ${txt.length}`);
    if(r.ok){
      try {
        const data = JSON.parse(txt);
        productos = Array.isArray(data) ? data : (data.productos || data.items || data.data || []);
        if(productos.length > 0){ console.log(`OK ${ep} ${productos.length}`); break; }
      } catch {}
    }
  }
  console.log(`Total productos: ${productos.length}`);
  for(const p of productos.slice(0,5000)){
    const sku = p.codigo || p.sku || p.referencia || p.id || '';
    if(!sku) continue;
    const payload = { proveedor:'mbr', sku: String(sku), nombre: p.nombre || p.descripcion || p.producto || 'SIN NOMBRE', descripcion: p.descripcion || null, precio: parseFloat(p.precio || p.precio1 || 0) || 0, stock: parseInt(p.stock || p.existencia || 0) || 0, categoria: p.categoria || p.grupo || null, marca: p.marca || null, raw: p };
    await fetch(`${SUPABASE_URL}/rest/v1/productos_maestro`,{ method:'POST', headers:{'apikey': SUPABASE_KEY, 'Authorization':`Bearer ${SUPABASE_KEY}`, 'Content-Type':'application/json', 'Prefer':'resolution=merge-duplicates'}, body: JSON.stringify(payload) });
  }
  console.log('Done');
}
main().catch(e=>{ console.error(e); process.exit(1); });
