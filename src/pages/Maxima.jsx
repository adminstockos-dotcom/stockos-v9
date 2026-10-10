import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Maxima(){
  const [cfg, setCfg] = useState({ link:'https://estock-mobile.demachine.co/', instancia:'MBR', usuario:'CARLSO ROJAS', contrasena:'CARLSO2026' })
  const [status, setStatus] = useState('')
  const [productos, setProductos] = useState(0)

  useEffect(()=>{ loadConfig(); loadCount() },[])

  async function loadConfig(){
    const { data } = await supabase.from('proveedor_config').select('*').eq('proveedor','mbr').single()
    if(data) setCfg(data)
  }
  async function loadCount(){
    const { count } = await supabase.from('proveedor_mbr_products').select('*',{count:'exact', head:true})
    setProductos(count||0)
  }

  async function guardarConfig(){
    setStatus('Guardando...')
    const { error } = await supabase.from('proveedor_config').upsert({ proveedor:'mbr', ...cfg, activo:true, updated_at: new Date().toISOString() }, { onConflict:'proveedor' })
    setStatus(error ? 'Error: '+error.message : 'Config MBR guardada ✓')
  }

  async function escanearAhora(){
    setStatus('Lanzando escaneo MBR...')
    const res = await fetch(`https://api.github.com/repos/adminstockos-dotcom/stockos-v9/actions/workflows/scan-mbr.yml/dispatches`, {
      method:'POST',
      headers:{ Authorization:`Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ ref:'main' })
    })
    setStatus(res.ok ? 'ESCANEAR AHORA lanzado ✓ Revisa Actions en 2 min' : 'Error GitHub: '+res.status)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">MAXIMA - Proveedor MBR</h1>
      <p className="text-sm text-gray-500 mb-4">Productos actuales: {productos} | Auto scan 8:30am y 2:30pm Bogotá</p>

      <div className="grid gap-3 bg-gray-50 p-4 rounded border">
        <label>LINK: <input className="border p-2 w-full" value={cfg.link} onChange={e=>setCfg({...cfg, link:e.target.value})} /></label>
        <label>INSTANCIA: <input className="border p-2 w-full" value={cfg.instancia} onChange={e=>setCfg({...cfg, instancia:e.target.value})} /></label>
        <label>USUARIO: <input className="border p-2 w-full" value={cfg.usuario} onChange={e=>setCfg({...cfg, usuario:e.target.value})} /></label>
        <label>CONTRASEÑA: <input type="password" className="border p-2 w-full" value={cfg.contrasena} onChange={e=>setCfg({...cfg, contrasena:e.target.value})} /></label>
        <div className="flex gap-2">
          <button onClick={guardarConfig} className="bg-black text-white px-4 py-2 rounded">Guardar Config MBR</button>
          <button onClick={escanearAhora} className="bg-green-600 text-white px-6 py-2 rounded font-bold">ESCANEAR AHORA</button>
        </div>
        <div className="text-sm font-mono mt-2">{status}</div>
      </div>
    </div>
  )
}
