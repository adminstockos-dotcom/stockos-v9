import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl ||!supabaseKey) {
      return res.status(500).json({ ok: false, error: "Falta SUPABASE_URL o SERVICE_ROLE_KEY" })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const BASE = 'https://estock-mobile.demachine.co'
    const form = new URLSearchParams()
    form.append('instancia', 'MBR')
    form.append('usuario', 'CARLSO ROJAS')
    form.append('contrasena', 'CARLSO2026')

    const loginRes = await fetch(`${BASE}/`, {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const cookies = loginRes.headers.get('set-cookie') || ''
    const listRes = await fetch(`${BASE}/list-products`, {
      headers: { Cookie: cookies },
    })

    const html = await listRes.text()
    const productos = []
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gs
    let m
    while ((m = rowRegex.exec(html))!== null) {
      const cols = [...m[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(c => c[1].replace(/<[^>]+>/g,'').trim())
      if (cols.length >= 2 && cols[0]) {
        productos.push({
          empresa_id: '676d535d-5045-41ac-9d7a-117095e75d49',
          referencia: cols[0],
          nombre: cols[1],
          stock: parseInt(cols[2]) || 0,
          actualizado_en: new Date().toISOString(),
        })
      }
    }

    if (productos.length > 0) {
      const { error } = await supabase.from('proveedor_mbr_productos').upsert(productos, { onConflict: 'empresa_id,referencia' })
      if (error) throw error
    }

    return res.status(200).json({ ok: true, total: productos.length, login_status: loginRes.status, list_status: listRes.status })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
