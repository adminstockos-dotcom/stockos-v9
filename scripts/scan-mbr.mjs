const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMPRESA_ID = process.env.EMPRESA_ID || '676d535d-5045-41ac-9d7a-117095e75d4';
async function getConfig(){
  const r = await fetch(`${SUPA_URL}/rest/v1/proveedor_config?proveedor=eq.mbr&select=*`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }});
  const j = await r.json(); if(!j.length) throw new Error('Sin config MBR en proveedor_config'); return j[0];
}
async function upsert(table, rows, conflict){
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${conflict}`, { method:'POST', headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates'}, body:JSON.stringify(rows) });
  if(!res.ok) throw new Error(await res.text());
}
async function main(){
  const cfg = await getConfig();
  console.log(`[STOCKOS] Config MBR: ${cfg.link} ${cfg.instancia} ${cfg.usuario}`);
  // LOGIN DEMACHINE
  const loginRes = await fetch(`${cfg.link.replace(/\/$/,'')}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ instancia: cfg.instancia, usuario: cfg.usuario, password: cfg.contrasena, contrasena: cfg.contrasena }) });
  const auth = await loginRes.json().catch(async()=>({token:await loginRes.text()}));
  const token = auth.token || auth.accessToken || '';
  console.log(`Login: ${loginRes.status} token ${String(token).slice(0,20)}`);

  // INTENTA ENDPOINTS STOCK
  let productos=[];
  for(const ep of ['/api/stock','/api/inventario','/api/productos','/api/existencias','/api/articulos/listado']){
    try{
      const url = `${cfg.link.replace(/\/$/,'')}${ep}`;
      const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}`, 'x-instancia':cfg.instancia }});
      const txt = await r.text();
      if(r.ok){ const data=JSON.parse(txt); productos = Array.isArray(data)?data:[STRIPPED] if(productos.length){ console.log(`OK ${ep} ${productos.length}`); break; } }
    }catch(e){ console.log(`Fail ${ep}`); }
  }
  if(!productos.length) throw new Error('Login OK pero endpoint stock no encontrado - revisa Network en estock-mobile.demachine.co');

  const rows = productos.map(p=>({
    empresa_id: EMPRESA_ID, proveedor:'mbr', ref: p.referencia||p.codigo||String(p.id),
    sku:p.codigo||String(p.id), referencia:p.referencia||p.codigo||String(p.id),
    nombre:p.nombre||p.descripcion||'', marca:'MBR', precio:+p.precio||0, stock:parseInt(p.stock||p.cantidad||0),
    talla:p.talla||null, imagen:p.imagen||'', handle:String(p.id), disponible:true, activo:true, updated_at:new Date().toISOString()
  }));
  for(let i=0;i<rows.length;i+=150){ await upsert('proveedor_mbr_products', rows.slice(i,i+150), 'ref,talla'); console.log(`Guardados ${i+rows.slice(i,i+150).length}/${rows.length}`); }
  // GENERA CATALOGO VIRTUAL MAXIMA EN STOCKOS
  await upsert('catalogo_maxima', rows.map(r=>({ empresa_id:EMPRESA_ID, proveedor_origen:'mbr', ref:r.ref, nombre:r.nombre, precio_venta: Math.round(r.precio*1.3), stock_disponible:r.stock, activo:true })), 'ref');
  console.log(`CATALOGO MAXIMA GENERADO: ${rows.length}`);
}
main().catch(e=>{ console.error('FATAL',e); process.exit(1); });
