import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(){
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: proveedores } = await supabase
    .from('proveedores_config')
    .select('*')
    .eq('activo', true)
  
  return Response.json({ok:true, total_proveedores: proveedores?.length, proveedores})
}
