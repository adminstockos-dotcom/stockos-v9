// V9.23 FINAL 2778 - Inserta cada 20 páginas para no saturar DNS
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = process.env.MBR_PASSWORD;
const EMPRESA_ID = '676d535d-5045-41ac-9d7a-117095e75d4';
const PROV = 'MBR - MÁXIMA';

const supabase = createClient(SB_URL, SB_KEY);

async function getToken() {
  const r = await fetch('https://mbr.demachine.co/api/users/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'MBR', name: 'CARLSO ROJAS', password: PASS })
  });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j));
  return j.data.token;
}

async function run() {
  console.log('[MBR] V9.23 INCREMENTAL 2778');
  let token = await getToken();
  console.log('[MBR] Token OK');

  console.log('[MBR] Borrando al inicio cuando DNS está limpio...');
  // Borra al inicio, no al final
  try{
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', EMPRESA_ID).eq('proveedor_nombre', PROV);
    console.log('[MBR] Borrado OK');
  }catch(e){
    console.log('[MBR] Borrado error pero continúo:', e.message);
  }

  let totalInsertado = 0;
  let buffer = [];
  let page = 1;

  while(page <= 200){
    if(page % 30 === 0){ token = await getToken(); console.log('[MBR] Token refresh'); }

    const r = await fetch(`https://mbr.demachine.co/api/products?page=${page}&maxPerPage=500`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' }
    });
    const json = JSON.parse(await r.text());
    const data = json.data || [];
    if(!data.length) break;

    const chunk = data.map(p=>({
      empresa_id: EMPRESA_ID,
      proveedor_nombre: PROV,
      referencia: `${(p.code||'').toString().slice(0,30)} ${(p.name||'').toString().slice(0,100)}`.trim() || 'SIN_REF',
      talla: 'UNICA',
      precio: Math.max(0, parseInt(p.precioventa)||0),
      stock_proveedor: 10,
      fecha_escaneo: new Date().toISOString()
    }));

    buffer.push(...chunk);
    console.log(`[MBR] pag ${page} -> buffer ${buffer.length} total acum ${totalInsertado + buffer.length}`);

    // cada 20 páginas = 400 productos, insertar
    if(buffer.length >= 400 || data.length < 20){
      console.log(`[MBR] Insertando ${buffer.length} ahora que DNS aún vive...`);
      for(let i=0;i<buffer.length;i+=50){
        const c = buffer.slice(i,i+50);
        let ok=false;
        for(let retry=0; retry<3 && !ok; retry++){
          try{
            const { error } = await supabase.from('listado_maestro_proveedor').insert(c);
            if(error) throw error;
            ok=true;
          }catch(e){
            console.log(`[MBR] retry insert ${e.message} ${retry+1}`);
            await new Promise(r=>setTimeout(r, 2000));
          }
        }
        if(!ok) throw new Error('Insert fallo');
      }
      totalInsertado += buffer.length;
      console.log(`[MBR] TOTAL INSERTADO ${totalInsertado}`);
      buffer = [];
      await new Promise(r=>setTimeout(r, 1000)); // deja respirar DNS
    }

    if(data.length < 20) break;
    page++;
    await new Promise(r=>setTimeout(r, 120));
  }

  console.log(`[MBR] FIN VERDE DEFINITIVO ${totalInsertado} PRODUCTOS`);
}
run().catch(e=>{ console.error('[MBR] FATAL', e); process.exit(1); });
