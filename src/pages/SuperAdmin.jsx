import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function SuperAdmin({ user, onLogout }){
  const navigate = useNavigate()
  const [empresas,setEmpresas]=useState([])
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [form,setForm]=useState({nombre:'', slug:'', encargado:'', telefono:'', logo_url:'', estado:'pendiente'})

  const cargar=async()=>{
    setLoading(true)
    const {data: emps} = await supabase.from('empresas').select('*').order('created_at',{ascending:false})
    setEmpresas(emps||[])
    setLoading(false)
  }
  useEffect(()=>{ cargar() },[])

  const crearEmpresa=async(e)=>{
    e.preventDefault()
    const {error}=await supabase.from('empresas').insert({
      nombre:form.nombre,
      slug:form.slug.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
      encargado:form.encargado,
      telefono:form.telefono,
      logo_url:form.logo_url, logo:form.logo_url, imagen_url:form.logo_url,
      estado:form.estado
    })
    if(error) alert(error.message)
    else { setShowModal(false); setForm({nombre:'', slug:'', encargado:'', telefono:'', logo_url:'', estado:'pendiente'}); cargar() }
  }

  const cambiarEstado=async(id,nuevo)=>{
    await supabase.from('empresas').update({estado:nuevo}).eq('id',id)
    setEmpresas(prev=>prev.map(e=>e.id===id?{...e,estado:nuevo}:e))
  }

  const verPanel=(emp)=> navigate(`/empresa/${emp.id}/panel`)

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="h-16 bg-[#0E2A4D] flex items-center justify-between px-4">
        <img src="/assets/stockos_logo_oficial_clean.png" alt="STOCKOS" className="h-10 w-auto object-contain" onError={e=>e.target.src='/logo-stockos-oficial.png'} />
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="hidden md:inline">Super Admin: {user?.email||''}</span>
          <button onClick={onLogout} className="bg-white/20 px-3 py-1 rounded-full">Salir</button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border p-4 flex justify-between items-center">
          <div><h2 className="font-black text-sm">Crear Empresa</h2><p className="text-xs text-gray-500">Registra nueva empresa</p></div>
          <button onClick={()=>setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-black">+ Nueva Empresa</button>
        </div>

        <div>
          <h2 className="font-black text-sm">Empresas Registradas</h2>
          <p className="text-xs text-gray-500 mb-3">{empresas.length} empresas</p>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-6 text-xs font-black bg-gray-50 p-3 text-gray-500">
              <span>LOGO</span><span>EMPRESA</span><span>ENCARGADO</span><span>ESTADO</span><span className="col-span-2">ACCIONES</span>
            </div>
            {loading? <div className="p-4 text-xs">Cargando...</div> :
              empresas.map(emp=>{
                const logoReal = emp.logo_url || emp.logo || emp.imagen_url
                return(
                <div key={emp.id} className="grid grid-cols-6 p-3 border-t items-center text-xs">
                  <div>{logoReal? <img src={logoReal} className="h-9 w-9 rounded-full object-cover border"/> : <div className="h-9 w-9 bg-black text-white rounded-full flex items-center justify-center font-black">{emp.nombre?.[0]?.toUpperCase()}</div>}</div>
                  <div><div className="font-black">{emp.nombre}</div><div className="text-gray-500">{emp.slug}</div></div>
                  <div className="truncate">{emp.encargado||'—'}<div className="text-gray-400">{emp.telefono||''}</div></div>
                  <div>
                    <select value={emp.estado||'pendiente'} onChange={e=>cambiarEstado(emp.id,e.target.value)} className="px-2 py-1 rounded-full font-black border bg-yellow-100 text-yellow-700">
                      <option value="pendiente">pendiente</option>
                      <option value="aprobada">aprobada</option>
                      <option value="suspendida">suspendida</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <button onClick={()=>verPanel(emp)} className="bg-[#0E2A4D] text-white px-3 py-1.5 rounded font-black">Ver Panel</button>
                    <button onClick={()=>window.open(`/m/${emp.slug}`,'_blank')} className="bg-white border px-2 py-1.5 rounded">Catálogo</button>
                    <button onClick={async()=>{if(confirm(`¿Borrar ${emp.nombre}?`)){await supabase.from('empresas').delete().eq('id',emp.id); cargar()}}} className="text-red-500 px-2 py-1.5">Borrar</button>
                  </div>
                </div>
              )})
            }
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <form onSubmit={crearEmpresa} onClick={e=>e.stopPropagation()} className="bg-white rounded-xl p-5 w-full max-w-md space-y-3">
            <h3 className="font-black text-sm">Nueva Empresa</h3>
            <input placeholder="Nombre empresa" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value, slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})} className="w-full border p-2 rounded text-xs" required/>
            <input placeholder="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} className="w-full border p-2 rounded text-xs" required/>
            <input placeholder="Email encargado" value={form.encargado} onChange={e=>setForm({...form,encargado:e.target.value})} className="w-full border p-2 rounded text-xs"/>
            <input placeholder="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} className="w-full border p-2 rounded text-xs"/>
            <input placeholder="URL Logo" value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} className="w-full border p-2 rounded text-xs"/>
            <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} className="w-full border p-2 rounded text-xs"><option value="pendiente">pendiente</option><option value="aprobada">aprobada</option></select>
            <div className="flex gap-2"><button type="button" onClick={()=>setShowModal(false)} className="flex-1 border py-2 rounded text-xs">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-black">Crear</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
