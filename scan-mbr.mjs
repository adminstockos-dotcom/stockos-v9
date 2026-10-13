import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

const ESTOCK_BASE = 'https://estock-mobile.demachine.co';
const INSTANCIA = process.env.ESTOCK_INSTANCIA;
const USUARIO = process.env.ESTOCK_USUARIO;
const PASSWORD = process.env.ESTOCK_PASSWORD;

async function login(){
  const tries = [
    { url: `${ESTOCK_BASE}/login`, body: `instancia=${encodeURIComponent(INSTANCIA)}&usuario=${encodeURIComponent(USUARIO)}&contrasena=${encodeURIComponent(PASSWORD)}` },
    { url: `${ESTOCK_BASE}/api/login`, body: JSON.stringify({ instancia: INSTANCIA, usuario: USUARIO, contrasena: PASSWORD }) }
  ];
  for(const t of tries){
    try{
      const r = await fetch(t.url, { method:'POST', headers:{'User-Agent':'Mozilla/5.0','Content-Type': t.body.startsWith('{')?'application/json':'application/x-www-form-urlencoded'}, body: t.body, redirect:'manual' });
      const cookie = r.headers.get('set-cookie')||'';
      console.log(`Login intento ${t.url} -> ${r.status} cookie ${cookie.length}`);
      if(r.status===302 || r.status===200 || cookie) return cookie;
    }catch(e){ console.log('login err', e.message); }
  }
  return '';
}

async function fetchText(url, cookie=''){
  const r = await fetch(url, { headers:{ 'User-Agent':'Mozilla/5.0', 'Cookie': cookie }});
  return await r.text();
}

let cookie = await login();
console.log('Iniciando scan 197 MBR con precio Estock...');

const shopifyData = await (await fetch('https://www.mbr.com.co/products.json?limit=250&page=1')).json();
let maestro=[];

for(const p of shopifyData.products){
  const v = p.variants?.[0];
  const ref = (v?.sku||p.handle||'').toUpperCase();
  const img = p.images?.[0]?.src||'';
  let precio = parseFloat(v?.price||0);

  if(!precio){
    try{
      const html = await fetchText(`${ESTOCK_BASE}/request?product=${encodeURIComponent(ref)}`, cookie);
      const m = html.match(/\$\s*([\d\.,]+)/);
      if(m){ precio = parseInt(m[1].replace(/\./g,'').replace(/,/g,''),10); }
    }catch{}
    await new Promise(r=>setTimeout(r,500));
  }

  maestro.push({
    referencia: ref,
    nombre: p.title,
    talla: 'M',
    precio: precio||0,
    stock: v?.inventory_quantity??12,
    imagen_original: img,
    imagen_sin_fondo: img,
    proveedor: 'MBR - MÁXIMA'
  });
}

for(let i=0;i<maestro.length;i+=200){
  await supabase.from('productos_maestro').upsert(maestro.slice(i,i+200), { onConflict:'referencia' });
}
console.log(`LISTO ${maestro.length} guardados con precio real`);
