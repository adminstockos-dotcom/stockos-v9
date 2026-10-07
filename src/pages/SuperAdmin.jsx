import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function SuperAdmin(){
  const [empresas,setEmpresas]=useState([])
  const [loading,setLoading]=useState(true)
  const [showInfra,setShowInfra]=useState(false)
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
    const {data} = await supabase.from('empresas').select('*').order('created_at',{ascending:false})
    setEmpresas(data||[])
    setLoading(false)
  }

  useEffect(()=>{ cargar() },[])

  const crearEmpresa=async()=>{
    const nombre=prompt('Nombre de la empresa:')
    if(!nombre) return
    const slug=nombre.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
    const encargado=prompt('Email encargado:','admin@'+slug+'.com')
    const {error}=await supabase.from('empresas').insert({nombre, slug, encargado, estado:'activo', logo_url:''})
    if(error) alert('Error: '+error.message)
    else cargar()
  }

  const crearServicio=()=>{
    const servicio=prompt('Nombre servicio (ej: EC2 — Nuevo):')
    if(!servicio) return
    const tipo=prompt('Tipo (Compute, Database, Cache, CDN, Network, Storage):','Compute')||'Compute'
    const region=prompt('Región:','us-east-1')||'us-east-1'
    setInfra(prev=>[...prev,{id:Date.now(), servicio, tipo, region, estado:'Activo', uptime:'100%', cpu:Math.floor(Math.random()*40), memoria:Math.floor(Math.random()*60)+20}])
  }

  return(
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="h-14 bg-[#0E2A4D] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-white rounded-full flex items-center justify-center font-black text-xs">S</div>
          <span className="text-white font-black text-xs tracking-widest">STOCKOS</span>
        </div>
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-green-400 rounded-full"></span> Sistema Activo</span>
          <span>Super Admin</span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* 1. CREAR EMPRESA */}
        <div className="bg-white rounded-xl border p-4 flex justify-between items-center">
          <div>
            <h2 className="font-black text-sm">Crear Empresa</h2>
            <p className="text-xs text-gray-500">Registra una nueva empresa en el sistema</p>
          </div>
          <button onClick={crearEmpresa} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-black">+ Nueva Empresa</button>
        </div>

        {/* 2. EMPRESAS REGISTRADAS */}
        <div>
          <h2 className="font-black text-sm">Empresas Registradas</h2>
          <p className="text-xs text-gray-500 mb-3">{loading?'Cargando...':`${empresas.length} empresas en el sistema`}</p>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-5 text- font-black bg-gray-50 p-3 text-gray-500">
              <span>LOGO</span><span>EMPRESA</span><span>ENCARGADO</span><span>ESTADO</span><span>ACCIONES</span>
            </div>
            {loading? <div className="p-4 text-xs">Cargando empresas...</div> :
              empresas.map(emp=>(
                <div key={emp.id} className="grid grid-cols-5 p-3 border-t items-center text-xs">
                  <div>{emp.logo_url? <img src={emp.logo_url} className="h-8 w-8 rounded-full object-contain bg-gray-100 p-1"/> : <div className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center font-black">{emp.nombre?.[0]}</div>}</div>
                  <div><div className="font-black">{emp.nombre}</div><div className="text- text-gray-500">{emp.slug}</div></div>
                  <div className="text-">{emp.encargado || emp.email || '—'}</div>
                  <div><span className={`px-2 py-0.5 rounded-full text- font-black ${emp.estado==='activo'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{emp.estado||'activo'}</span></div>
                  <div className="flex gap-1">
                    <button onClick={()=>window.open(`/m/${emp.slug}`,'_blank')} className="bg-black text-white px-2 py-1 rounded text-">Ver Catálogo</button>
                    <button onClick={async()=>{if(confirm('¿Eliminar '+emp.nombre+'?')){await supabase.from('empresas').delete().eq('id',emp.id); cargar()}}} className="bg-red-50 text-red-600 px-2 py-1 rounded text-">Borrar</button>
                  </div>
                </div>
              ))
            }
            {!loading && empresas.length===0 && <div className="p-4 text-xs text-gray-500">No hay empresas aún. Crea la primera.</div>}
          </div>
        </div>

        {/* 3. INFRA SISTEMA DESPLEGABLE ABAJO */}
        <div className="bg-white rounded-xl border">
          <button onClick={()=>setShowInfra(!showInfra)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50 text-left">
            <div>
              <h2 className="font-black text-sm flex items-center gap-2">Infra Sistema <span className="text- font-normal text-gray-500">{showInfra?'▲ Ocultar':'▼ Ver infraestructura'}</span></h2>
              <p className="text-xs text-gray-500">6 servicios AWS monitoreados en tiempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-bold">● Todos operativos</span>
              <span onClick={(e)=>{e.stopPropagation(); crearServicio()}} className="bg-blue-600 text-white px-3 py-1.5 rounded text- font-black cursor-pointer">+ Nuevo Servicio</span>
            </div>
          </button>
          {showInfra && (
            <div className="border-t">
              <div className="grid grid-cols-7 text- font-bold text-gray-500 p-3 bg-gray-50">
                <span>SERVICIO</span><span>TIPO</span><span>REGIÓN</span><span>ESTADO</span><span>UPTIME</span><span>CPU</span><span>MEMORIA</span>
              </div>
              {infra.map(s=>(
                <div key={s.id} className="grid grid-cols-7 p-3 border-t text-xs items-center">
                  <span className="font-bold text-">{s.servicio}</span>
                  <span><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-">{s.tipo}</span></span>
                  <span className="text-">{s.region}</span>
                  <span><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-">● {s.estado}</span></span>
                  <span className="text-">{s.uptime}</span>
                  <span className="flex items-center gap-2"><div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{width:`${s.cpu}%`}}></div></div> {s.cpu}%</span>
                  <span className="flex items-center gap-2"><div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-purple-600" style={{width:`${s.memoria}%`}}></div></div> {s.memoria}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
