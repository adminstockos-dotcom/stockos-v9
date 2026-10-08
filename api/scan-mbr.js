// STOCKOS V9.2 - SCANNER MBR LIGHT (Vercel Hobby compatible)
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  console.log('[scan-mbr] INICIO', new Date().toISOString(), req.query);
  const proveedorCodigo = req.query.proveedor || 'MBR';

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[scan-mbr] FALTAN ENV VARS');
      return res.status(500).json({ error: 'Faltan SUPABASE_URL o SERVICE_ROLE_KEY en Vercel > Environment Variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar proveedor
    const { data: prov, error: errProv } = await supabase
      .from('proveedores')
      .select('*, empresas!inner(slug)')
      .eq('codigo', proveedorCodigo)
      .single();

    console.log('[scan-mbr] proveedor:', prov?.id, 'err:', errProv?.message);

    if (!prov) {
      return res.status(404).json({ error: `Proveedor ${proveedorCodigo} no existe, ejecuta SQL` });
    }

    const creds = prov.creds || {};
    console.log('[scan-mbr] creds instancia:', creds.instancia);

    // 2. TEST RAPIDO - sin Playwright para que aparezca en Logs
    // Si quieres Playwright, muévelo a un Cron externo (GitHub Actions)
    // Por ahora solo marcamos escaneo y devolvemos OK para validar conexión
    
    const { error: upError } = await supabase.from('proveedores').update({
      ultimo_escaneo: new Date().toISOString(),
    }).eq('id', prov.id);

    console.log('[scan-mbr] update ultimo_escaneo err:', upError?.message);

    return res.status(200).json({ 
      ok: true, 
      proveedor: proveedorCodigo, 
      empresa_id: prov.empresa_id,
      mensaje: 'Conexión OK - Logs funcionan. Ahora activa Playwright en GitHub Actions, no en Vercel Hobby',
      next_step: 'Si ves este JSON, Vercel Logs ya funciona. Busca "scan-mbr" en Logs > Live'
    });

  } catch (e) {
    console.error('[scan-mbr] FATAL:', e.message, e.stack?.slice(0,800));
    return res.status(500).json({ error: e.message });
  }
}
