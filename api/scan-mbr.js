// STOCKOS V9.3 - SCANNER MBR FINAL
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  console.log('[scan-mbr] INICIO', req.query);
  const proveedorNombre = (req.query.proveedor || 'MBR - MÁXIMA').toString().trim();
  const proveedorShort = proveedorNombre.split(' ')[0].toUpperCase(); // MBR
  const empresaId = req.query.empresa_id || '676d535d-5045-41ac-9d7a-117095e75d4';

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Buscar proveedor
    let { data: prov } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).ilike('codigo', `%${proveedorShort}%`).limit(1).maybeSingle();
    if (!prov) {
      const { data: d2 } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).limit(1).maybeSingle();
      prov = d2;
    }
    if (!prov) {
      const { data: nuevo } = await supabase.from('proveedores').insert({
        empresa_id: empresaId,
        codigo: proveedorShort,
        nombre: proveedorNombre,
        creds: { instancia: 'MBR', usuario: 'CARLSO ROJAS' },
        activo: true
      }).select().single();
      prov = nuevo;
    }

    if (!prov) return res.status(404).json({ error: `Proveedor ${proveedorNombre} no existe` });

    // 2. AQUÍ VA EL SCRAPER REAL DE DEMACHINE - por ahora MOCK para validar catálogo
    const mockData = [
      { empresa_id: empresaId, proveedor_nombre: proveedorNombre, referencia: 'DM-001', talla: 'M', precio: 85000, stock_proveedor: 12, fecha_escaneo: new Date().toISOString() },
      { empresa_id: empresaId, proveedor_nombre: proveedorNombre, referencia: 'DM-002', talla: 'L', precio: 92000, stock_proveedor: 5, fecha_escaneo: new Date().toISOString() },
      { empresa_id: empresaId, proveedor_nombre: proveedorNombre, referencia: 'DM-003', talla: 'S', precio: 78000, stock_proveedor: 20, fecha_escaneo: new Date().toISOString() },
    ];

    // 3. Guardar en listado maestro (esto es lo que te faltaba)
    await supabase.from('listado_maestro_proveedor').delete().eq('empresa_id', empresaId).eq('proveedor_nombre', proveedorNombre);
    const { error: insErr } = await supabase.from('listado_maestro_proveedor').insert(mockData);
    if (insErr) throw new Error(insErr.message);

    await supabase.from('proveedores').update({ ultimo_escaneo: new Date().toISOString() }).eq('id', prov.id);

    console.log('[scan-mbr] OK guardados', mockData.length);

    return res.status(200).json({
      ok: true,
      proveedor: prov.codigo,
      nombre: proveedorNombre,
      empresa_id: empresaId,
      guardados: mockData.length,
      total: mockData.length,
      mensaje: 'Catálogo actualizado'
    });

  } catch (e) {
    console.error('[scan-mbr] FATAL', e.message);
    return res.status(500).json({ error: e.message });
  }
}
