import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Maxima(){
  const [cfg, setCfg] = useState({
    link:'https://estock-mobile.demachine.co/',
    instancia:'MBR',
    usuario:'CARLSO ROJAS',
    contrasena:'CARLSO2026'
  })
  const [status, setStatus] = useState('')
  const [productos, setProductos] = useState(0)

  useEffect(()=>{ loadConfig(); loadCount() },[])

  async function loadConfig(){
    try{
      const { data } = await supabase.from('proveedor_config').select('*').eq('proveedor','mbr').maybeSingle()
      if(data) setCfg(data)
    }catch{}
  }

  async function loadCount(){
    try{
      const { count } = await supabase.from('proveedor_mbr_products').select('*',{count:'exact', head:true})
      setProductos(count||0)
    }catch{ setProductos(0) }
  }

  async function guardarConfig(){
    setStatus('Guardando...')
    try{
      const { error } = await supabase.from('proveedor_config').upsert({
        proveedor:'mbr',
        link: cfg.link,
        instancia: cfg.instancia,
        usuario: cfg.usuario,
        contrasena: cfg.contrasena,
        activo:true,
        updated_at: new Date().toISOString()
      }, { onConflict:'proveedor' })
      setStatus(error? 'Error: '+error.message : 'Config MBR guardada ✓ Lista para ESCANEAR AHORA')
    }catch(e){ setStatus('Error: '+e.message) }
  }

  async function escanearAhora(){
    setStatus('Lanzando escaneo MBR...')
    try{
      const token = import.meta.env.VITE_GITHUB_TOKEN
      if(!token){ setStatus('Falta VITE_GITHUB_TOKEN en Vercel Env'); return }
      const res = await fetch(`https://api.github.com/repos/adminstockos-dotcom/stockos-v9/actions/workflows/scan-mbr.yml/dispatches`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ ref:'main' })
      })
      setStatus(res.ok? 'ESCANEAR AHORA lanzado ✓ Revisa Actions > 2 min - Auto 8:30am y 2:30pm Bogotá activo' : 'Error GitHub: '+res.status+' - Verifica token')
    }catch(e){ setStatus('Error: '+e.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">MAXIMA - Proveedor MBR</h1>
      <p className="text-sm text-gray-500 mb-4">Productos actuales: {productos} | Auto scan 8:30am y 2:30pm Bogotá</p>

      <div className="grid gap-3 bg-gray-50 p-4 rounded border">
        <label className="text-sm font-bold">LINK:
          <input className="border p-2 w-full mt-1" value={cfg.link} onChange={e=>setCfg({...cfg, link:e.target.value})} />
        </label>
        <label className="text-sm font-bold">INSTANCIA:
          <input className="border p-2 w-full mt-1" value={cfg.instancia} onChange={e=>setCfg({...cfg, instancia:e.target.value})} />
        </label>
        <label className="text-sm font-bold">USUARIO:
          <input className="border p-2 w-full mt-1" value={cfg.usuario} onChange={e=>setCfg({...cfg, usuario:e.target.value})} />
        </label>
        <label className="text-sm font-bold">CONTRASEÑA:
          <input type="password" className="border p-2 w-full mt-1" value={cfg.contrasena} onChange={e=>setCfg({...cfg, contrasena:e.target.value})} />
        </label>
        <div className="flex gap-2 mt-2">
          <button onClick={guardarConfig} className="bg-black text-white px-4 py-2 rounded">Guardar Config MBR</button>
          <button onClick={escanearAhora} className="bg-green-600 text-white px-6 py-2 rounded font-bold">ESCANEAR AHORA</button>
        </div>
        <div className="text-sm font-mono mt-2 bg-white p-2 rounded border min-h-">{status}</div>
      </div>
    </div>
  )
}
