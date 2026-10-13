import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl ||!supabaseKey) {
      return res.status(500).json({ error: 'Faltan secrets SUPABASE' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    let all = [];
    let page = 1;

    console.log('Iniciando scan MBR desde Vercel...');

    while (true) {
      const url = `https://www.mbr.com.co/products.json?limit=250&page=${page}`;
      console.log(`[MBR] Pagina ${page}`);

      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!r.ok) {
        console.log(`Fin en pagina ${page} - status ${r.status}`);
        break;
      }

      const d = await r.json();
      if (!d.products || d.products.length === 0) break;

      for (const p of d.products) {
        const v = p.variants?.[0];
        all.push({
          sku: (v?.sku && v.sku.trim()!== '')? v.sku : (p.handle || `mbr-${p.id}`),
          nombre: p.title,
          marca: p.vendor || 'MBR',
          precio: parseFloat(v?.price || 0),
          stock: v?.inventory_quantity?? 0,
          url_producto: `https://www.mbr.com.co/products/${p.handle}`,
          imagen: p.images?.[0]?.src || '',
          proveedor: 'mbr',
          handle: p.handle
        });
      }

      console.log(`Acumulados: ${all.length}`);
      if (d.products.length < 250) break;
      page++;
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`TOTAL ENCONTRADOS: ${all.length}`);

    // Guardar en Supabase en chunks
    let saved = 0;
    for (let i = 0; i < all.length; i += 200) {
      const chunk = all.slice(i, i + 200);
      const { error } = await supabase.from('productos').upsert(chunk, { onConflict: 'sku' });
      if (!error) saved += chunk.length;
      else {
        console.error('Error upsert:', error.message);
        // intento sin onConflict
        const { error: err2 } = await supabase.from('productos').upsert(chunk);
        if (!err2) saved += chunk.length;
      }
    }

    console.log(`Guardados: ${saved}/${all.length}`);
    return res.status(200).json({ ok: true, total: all.length, guardados: saved });

  } catch (e) {
    console.error('Error fatal:', e);
    return res.status(500).json({ error: e.message });
  }
}
