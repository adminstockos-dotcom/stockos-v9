import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(){
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

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
    if (cols.length >= 2) {
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
    await supabase.from('proveedor_mbr_productos').upsert(productos, { onConflict: 'empresa_id,referencia' })
  }

  return Response.json({ ok: true, total: productos.length, login: loginRes.status, lista: listRes.status })
}
