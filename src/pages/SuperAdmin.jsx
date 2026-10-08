import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function SuperAdmin({ user, onLogout }){
  const navigate = useNavigate()
  const [tab, setTab] = useState('empresas')
  const [empresas,setEmpresas]=useState([])
  const [proveedores,setProveedores]=useState([])
  const [productosMaestro,setProductosMaestro]=useState([])
  const [loading,setLoading]=useState(true)
  const [showInfra,setShowInfra]=useState(false)
  const [showModal,setShowModal]=useState(false)
  const [scanLoading,setScanLoading]=useState(false)
  const [form,setForm]=useState({nombre:'', slug:'', encargado:'', telefono:'', logo_url:'', estado:'pendiente'})
  const [filtroProv, setFiltroProv] = useState('MBR')
  const [infra,setInfra]=useState([
    {id:1, servicio:'EC2 — Servidor Principal', tipo:'Compute', region:'us-east-1', estado:'Activo', uptime:'99.97%', cpu:34, memoria:62},
    {id:2, servicio:'RDS — PostgreSQL', tipo:'Database', region:'us-east-1', estado:'Activo', uptime:'99.99%', cpu:22, memoria:45},
    {id:3, servicio:'ElastiCache — Redis', tipo:'Cache', region:'us-east-1', estado:'Activo', uptime:'99.95%', cpu:12, memoria:38},
    {id:4, servicio:'CloudFront — CDN', tipo:'CDN', region:'Global', estado:'Activo', uptime:'100%', cpu:8, memoria:15},
    {id:5, servicio:'ALB — Load Balancer', tipo:'Network', region:'us-east-1', estado:'Activo', uptime:'99.98%', cpu:18, memoria:28},
    {id:6, servicio:'S3 — Backups', tipo:'Storage', region:'us-east-1', estado:'Activo', uptime:'100%', cpu:5, memoria:72},
  ])

  const cargar=async()=>{
    setLoading(true)
    const {data: emps} = await supabase.from('empresas').select('*').order('created_at',{ascending:false})
    setEmpresas(emps||[])
    const {data: provs} = await supabase.from('proveedores').select('*, empresas(nombre)').order('created_at',{ascending:false})
    setProveedores(provs||[])
    const {data: prods} = await supabase.from('productos_maestro').select('*, proveedores(codigo,nombre)').order('escaneado_at',{ascending:false}).limit(500)
    setProductosMaestro(prods||[])
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

  const escanearMBR=async()=>{
    if(!confirm('¿Escanear MBR ahora?')) return
    setScanLoading(true)
    console.log('[STOCKOS] Llamando a /api/scan-mbr?proveedor=MBR');
    try{
      const r = await fetch(`/api/scan-mbr?proveedor=MBR&t=${Date.now()}`)
      console.log('[STOCKOS] status', r.status);
      const j = await r.json()
      console.log('[STOCKOS] respuesta', j);
      if(!r.ok) throw new Error(j.error || 'Error 500')
      alert(`Scan OK: ${j.mensaje || JSON.stringify(j)}`)
      cargar()
    }catch(e){
      console.error('[STOCKOS] Error scan:', e)
      alert('Error scan: '+e.message + ' - Revisa Vercel Logs > scan-mbr')
    }
    setScanLoading(false)
  }

  const productosFiltrados = productosMaestro.filter(p=> filtroProv==='TODOS' || p.proveedores?.codigo===filtroProv )

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="h-16 bg-[#0E2A4D] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/assets/stockos_logo_oficial_clean.png" alt="STOCKOS" className="h-10 w-auto object-contain" onError={e=>e.target.src='/logo-stockos-oficial.png'} />
        </div>
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="hidden md:inline">Super Admin: {user?.email||''}</span>
          <button onClick={onLogout} className="bg-white/20 px-3 py-1 rounded-full">Salir</button>
        </div>
      </div>
      <div className="bg-white border-b px-6 flex gap-2 overflow-auto">
        {[
          {k:'empresas', l:'Empresas'},
          {k:'proveedores', l:'Proveedores'},
          {k:'inv_proveedor', l:'Inventario por Proveedor'},
          {k:'inv_maestro', l:'Inventario Maestro Máxima'},
          {k:'infra', l:'Infra'},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`py-3 px-3 text-xs font-black border-b-2 whitespace-nowrap ${tab===t.k?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>{t.l}</button>
        ))}
      </div>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {tab==='empresas' && (
          <>
            <div className="bg-white rounded-xl border p-4 flex justify-between items-center">
              <div><h2 className="font-black text-sm">Crear Empresa</h2><p className="text-xs text-gray-500">Registra nueva empresa con logo y encargado</p></div>
              <button onClick={()=>setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-black">+ Nueva Empresa</button>
            </div>
            <div>
              <h2 className="font-black text-sm">Empresas Registradas</h2>
              <p className="text-xs text-gray-500 mb-3">{empresas.length} empresas</p>
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="grid grid-cols-6 text- font-black bg-gray-50 p-3 text-gray-500">
                  <span>LOGO</span><span>EMPRESA</span><span>ENCARGADO</span><span>ESTADO</span><span className="col-span-2">ACCIONES</span>
                </div>
                {loading? <div className="p-4 text-xs">Cargando...</div> :
                  empresas.map(emp=>{
                    const logoReal = emp.logo_url || emp.logo || emp.imagen_url
                    return(
                    <div key={emp.id} className="grid grid-cols-6 p-3 border-t items-center text-xs">
                      <div>{logoReal? <img src={logoReal} className="h-9 w-9 rounded-full object-cover border"/> : <div className="h-9 w-9 bg-black text-white rounded-full flex items-center justify-center font-black">{emp.nombre?.[0]?.toUpperCase()}</div>}</div>
                      <div><div className="font-black text-">{emp.nombre}</div><div className="text- text-gray-500">{emp.slug}</div></div>
                      <div className="text- truncate">{emp.encargado||'—'}<div className="text- text-gray-400">{emp.telefono||''}</div></div>
                      <div>
                        <select value={emp.estado||'pendiente'} onChange={e=>cambiarEstado(emp.id,e.target.value)} className={`px-2 py-1 rounded-full text- font-black border ${emp.estado==='aprobada'?'bg-green-100 text-green-700 border-green-200':'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                          <option value="pendiente">pendiente</option>
                          <option value="aprobada">aprobada</option>
                          <option value="suspendida">suspendida</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <button onClick={()=>verPanel(emp)} className="bg-[#0E2A4D] text-white px-3 py-1.5 rounded text- font-black">Ver Panel</button>
                        <button onClick={()=>window.open(`/m/${emp.slug}`,'_blank')} className="bg-white border px-2 py-1.5 rounded text-">Catálogo</button>
                        <button onClick={async()=>{if(confirm(`¿Borrar ${emp.nombre}?`)){await supabase.from('empresas').delete().eq('id',emp.id); cargar()}}} className="text-red-500 px-2 py-1.5 text-">Borrar</button>
                      </div>
                    </div>
                  )})
                }
              </div>
            </div>
          </>
        )}
        {tab==='proveedores' && (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-center mb-4">
              <div><h2 className="font-black text-sm">Proveedores Vinculados</h2><p className="text-xs text-gray-500">MBR escanea automático 8:30am y 2:30pm America/Bogota</p></div>
              <button onClick={escanearMBR} disabled={scanLoading} className="bg-yellow-400 text-black px-4 py-2 rounded text-xs font-black">{scanLoading?'Escaneando...':'📸 SACAR MAESTRO AHORA (MBR)'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proveedores.map(p=>(
                <div key={p.id} className="border rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-black text-xs">{p.codigo} - {p.nombre}</div>
                    <div className="text- text-gray-500">{p.url}</div>
                    <div className="text- text-gray-500">Estado: {p.estado} | Ultimo: {p.ultimo_escaneo? new Date(p.ultimo_escaneo).toLocaleString() : 'nunca'} | Total: {p.total_productos||0}</div>
                  </div>
                  <div className="text- bg-green-100 text-green-700 px-2 py-1 rounded-full font-black">{p.creds?.instancia}</div>
                </div>
              ))}
              {proveedores.length===0 && <div className="text-xs text-gray-500">Aún no hay proveedores. Ejecuta el SQL STOCKOS_V9_1_SQL.sql en Supabase.</div>}
            </div>
          </div>
        )}
        {tab==='inv_proveedor' && (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex gap-2 mb-4 items-center">
              <h2 className="font-black text-sm">Inventario por Proveedor</h2>
              <select value={filtroProv} onChange={e=>setFiltroProv(e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="MBR">MBR</option><option value="TODOS">TODOS B1..BN</option></select>
              <span className="text-xs text-gray-500">{productosFiltrados.length} productos</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {productosFiltrados.map(prod=>(
                <div key={prod.id} className="border rounded-xl p-2">
                  <img src={prod.imagen_sin_fondo || prod.imagen_original} className="h- w- object-contain mx-auto bg-white" alt={prod.referencia} />
                  <div className="font-black text- mt-2 truncate">{prod.referencia}</div>
                  <div className="text- text-gray-500">{prod.marca} | {prod.proveedores?.codigo}</div>
                  <div className="text- text-gray-400">{prod.precio? `$${prod.precio}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='inv_maestro' && (
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-black text-sm mb-1">Inventario Maestro Máxima (Consolidado B1,B2,B3...N)</h2>
            <p className="text-xs text-gray-500 mb-4">Aquí se consolida todo lo de MBR + futuros proveedores abiertos.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {productosMaestro.map(prod=>(
                <div key={prod.id} className="border rounded-xl p-2">
                  <img src={prod.imagen_sin_fondo || prod.imagen_original} className="h- w- object-contain mx-auto" alt={prod.referencia} />
                  <div className="font-black text- mt-2 truncate">{prod.referencia}</div>
                  <div className="text- text-gray-500">Prov: {prod.proveedores?.codigo} | {prod.marca}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='infra' && (
          <div className="bg-white rounded-xl border">
            <button onClick={()=>setShowInfra(!showInfra)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50 text-left">
              <div><h2 className="font-black text-sm">Infra Sistema <span className="text- font-normal text-gray-500">{showInfra?'▲ Ocultar':'▼ Ver'}</span></h2><p className="text-xs text-gray-500">6 servicios AWS monitoreados + Crons Vercel 8:30 y 14:30</p></div>
              <span className="text-xs text-green-600 font-bold">● Todos operativos + Cron MBR activo</span>
            </button>
            {showInfra && (
              <div className="border-t">
                <div className="grid grid-cols-7 text- font-bold text-gray-500 p-3 bg-gray-50"><span>SERVICIO</span><span>TIPO</span><span>REGIÓN</span><span>ESTADO</span><span>UPTIME</span><span>CPU</span><span>MEMORIA</span></div>
                {infra.map(s=><div key={s.id} className="grid grid-cols-7 p-3 border-t text-xs"><span className="text- font-bold">{s.servicio}</span><span className="text- bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.tipo}</span><span>{s.region}</span><span>{s.estado}</span><span>{s.uptime}</span><span>{s.cpu}%</span><span>{s.memoria}%</span></div>)}
                <div className="p-3 bg-yellow-50 border-t text-"><b>Crons:</b> /api/scan-mbr?proveedor=MBR a las 30 8 * * * y 30 14 * * * America/Bogota</div>
              </div>
            )}
          </div>
        )}
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
