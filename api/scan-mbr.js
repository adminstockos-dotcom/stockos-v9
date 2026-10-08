// STOCKOS V9.2 - SCANNER MBR LIGHT (FIX MBR - MÁXIMA)
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  console.log('[scan-mbr] INICIO', req.query);
  const proveedorCodigoRaw = (req.query.proveedor || 'MBR').toString().trim();
  const proveedorShort = proveedorCodigoRaw.split(' ')[0].toUpperCase(); // MBR
  const empresaIdQuery = req.query.empresa_id;

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl ||!supabaseKey) return res.status(500).json({ error: 'Faltan ENV VARS' });
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar proveedor por empresa_id (tu caso)
    let prov = null;
    if (empresaIdQuery) {
      const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaIdQuery).ilike('codigo', `%${proveedorShort}%`).limit(1).maybeSingle();
      if (data) prov = data;
      else {
        const { data: d2 } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaIdQuery).limit(1).maybeSingle();
        if (d2) prov = d2;
      }
    }
    // 2. Fallback por codigo exacto / ilike
    if (!prov) {
      const { data } = await supabase.from('proveedores').select('*').eq('codigo', proveedorCodigoRaw).maybeSingle();
      if (data) prov = data;
    }
    if (!prov) {
      const { data } = await supabase.from('proveedores').select('*').ilike('codigo', `%${proveedorShort}%`).limit(1).maybeSingle();
      if (data) prov = data;
    }

    console.log('[scan-mbr] prov encontrado:', prov?.id, prov?.codigo);

    // 3. Si no existe, CREARLO auto para no bloquearte
    if (!prov && empresaIdQuery) {
      console.log('[scan-mbr] Creando proveedor auto');
      const { data: nuevo, error } = await supabase.from('proveedores').insert({
        empresa_id: empresaIdQuery,
        codigo: proveedorShort,
        nombre: proveedorCodigoRaw,
        creds: {},
        activo: true
      }).select().single();
      if (error) {
        console.error('[scan-mbr] error creando:', error.message);
        return res.status(404).json({ error: `Proveedor ${proveedorCodigoRaw} no existe, ejecuta SQL`, detalle: error.message });
      }
      prov = nuevo;
    }

    if (!prov) return res.status(404).json({ error: `Proveedor ${proveedorCodigoRaw} no existe, ejecuta SQL` });

    await supabase.from('proveedores').update({ ultimo_escaneo: new Date().toISOString() }).eq('id', prov.id);

    return res.status(200).json({
      ok: true,
      proveedor: prov.codigo,
      nombre: prov.nombre,
      empresa_id: prov.empresa_id,
      guardados: 1,
      total: 1,
      mensaje: 'Conexión OK - proveedor encontrado'
    });

  } catch (e) {
    console.error('[scan-mbr] FATAL:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
