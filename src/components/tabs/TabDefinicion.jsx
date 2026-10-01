import { useState, useEffect } from 'react'

const MODULOS_CONTROL = [
  { id:'personas', label:'Personas y Roles', sub:['Usuarios','Roles','Permisos','Equipos'] },
  { id:'escaner', label:'Escaner A/B/C', sub:['Escaner A','Escaner B','Escaner C'] },
  { id:'catalogo', label:'CATALOGO PUBLICO', sub:['Productos','Categorías','Precios'] },
  { id:'campanas', label:'Campañas IA + BOT CAZA', sub:['Campañas IA','Bot Caza'] },
  { id:'disparo', label:'Disparo + Link', sub:['Notificaciones','Links'] },
  { id:'despachos', label:'Despachos + CRM + Pagos', sub:['Órdenes','CRM','Pagos'] },
  { id:'bodega', label:'Bodega Stock <5 + Pistola', sub:['Stock','Ubicaciones'] },
]

export default function TabDefinicion({ empresa }) {
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem(`empresa_${empresa?.id || 9}_logo`) || empresa?.logo || null)
  const [logoFile, setLogoFile] = useState(null)
  const [sedes, setSedes] = useState([{ nombre:'Bodega Norte', encargado:'Juan', wa:'3001234567' }])
  const [nuevaSede, setNuevaSede] = useState({ nombre:'', encargado:'', wa:'' })
  const [controles, setControles] = useState(()=>{
    const o={}; MODULOS_CONTROL.forEach(m=>{ o[m.id]={ on:true, items:{} }; m.sub.forEach(s=>o[m.id].items[s]=true) }); return o
  })

  // FIX SIN DAÑAR: TRAE DATOS DE SUPERADMIN
  const [form, setForm] = useState({
    nombre: empresa?.nombre || '',
    nit: empresa?.nit || '',
    direccion: empresa?.direccion || '',
    telefono: empresa?.telefono || '',
    email: empresa?.email || ''
  })

  useEffect(()=>{
    if(empresa){
      setForm({
        nombre: empresa.nombre || '',
        nit: empresa.nit || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email || ''
      })
      const savedLogo = localStorage.getItem(`empresa_${empresa.id}_logo`) || empresa.logo || null
      if(savedLogo) setLogoPreview(savedLogo)
    }
  },[empresa])

  const onLogo = (e) => {
    const f = e.target.files?.[0]
    if(f){
      setLogoFile(f)
      const r = new FileReader()
      r.onload = () => setLogoPreview(r.result)
      r.readAsDataURL(f)
    }
  }

  const guardar = () => {
    if(!logoFile &&!logoPreview){ alert('Sube un logo primero'); return }
    const aplicar = (base64) => {
      localStorage.setItem(`empresa_${empresa?.id || 9}_logo`, base64)
      window.dispatchEvent(new CustomEvent('logo-updated', {detail:{logo:base64}}))
      alert('Guardado y logo del header actualizado OK')
    }
    if(logoFile){
      const r = new FileReader()
      r.onload = () => aplicar(r.result)
      r.readAsDataURL(logoFile)
    } else {
      aplicar(logoPreview)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">Configuración Empresa</h1>
      <p className="text-sm text-gray-500 -mt-4">Configuración de este módulo solamente - SIN AWS</p>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Datos Empresa</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} className="border rounded-lg px-3 py-2.5 text-sm" placeholder="Nombre Empresa" />
          <input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} className="border rounded-lg px-3 py-2.5 text-sm" placeholder="NIT" />
          <input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} className="border rounded-lg px-3 py-2.5 text-sm col-span-2" placeholder="Dirección" />
          <input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} className="border rounded-lg px-3 py-2.5 text-sm" placeholder="Teléfono" />
          <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border rounded-lg px-3 py-2.5 text-sm" placeholder="Email" />
        </div>
        <div className="flex gap-3 items-center border-2 border-dashed rounded-lg p-3 bg-gray-50">
          <input type="file" accept="image/*" onChange={onLogo} className="text-sm flex-1" />
          {logoPreview? <img src={logoPreview} className="w-14 h-14 rounded-lg object-cover border-2 border-blue-200" /> : <div className="w-14 h-14 bg-white border rounded-lg flex items-center justify-center text-[10px] text-gray-400">LOGO</div>}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-sm">Sedes con Encargados</h3>
        {sedes.map((s,i)=>(
          <div key={i} className="flex justify-between items-center border rounded-lg px-3 py-2 text-sm">
            <span className="font-medium">{s.nombre}</span><span className="text-xs text-gray-500">{s.encargado} - {s.wa}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <input value={nuevaSede.nombre} onChange={e=>setNuevaSede({...nuevaSede,nombre:e.target.value})} placeholder="Nombre sede" className="border rounded-lg px-2 py-2 text-xs" />
          <input value={nuevaSede.encargado} onChange={e=>setNuevaSede({...nuevaSede,encargado:e.target.value})} placeholder="Encargado" className="border rounded-lg px-2 py-2 text-xs" />
          <input value={nuevaSede.wa} onChange={e=>setNuevaSede({...nuevaSede,wa:e.target.value})} placeholder="WhatsApp" className="border rounded-lg px-2 py-2 text-xs" />
        </div>
        <button onClick={()=>{ if(nuevaSede.nombre){ setSedes([...sedes,nuevaSede]); setNuevaSede({nombre:'',encargado:'',wa:''}) } }} className="w-full border border-dashed rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">+ Agregar Sede</button>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Técnico Interno (Solo Super Admin - Oculto al cliente) - SIN AWS - Con Switch</h3>
        {MODULOS_CONTROL.map(mod=>(
          <div key={mod.id} className="bg-white/[0.06] border border-white/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">{mod.label}</span>
              <button onClick={()=>setControles(p=>({...p,[mod.id]:{...p[mod.id],on:!p[mod.id].on}}))} className={`w-10 h-5 rounded-full p-1 ${controles[mod.id].on?'bg-blue-500':'bg-gray-600'}`}><div className={`w-3 h-3 bg-white rounded-full ${controles[mod.id].on?'translate-x-5':''} transition`}></div></button>
            </div>
            <div className="mt-3 ml-2 pl-3 border-l border-white/10 space-y-2">
              {mod.sub.map(s=>(
                <div key={s} className="flex justify-between items-center text-xs text-white/70">
                  <span>{s}</span>
                  <button onClick={()=>setControles(p=>({...p,[mod.id]:{...p[mod.id],items:{...p[mod.id].items,[s]:!p[mod.id].items[s]}}}))} className={`w-8 h-4 rounded-full p-0.5 ${controles[mod.id].items[s]?'bg-emerald-500':'bg-gray-600'}`}><div className={`w-3 h-3 bg-white rounded-full ${controles[mod.id].items[s]?'translate-x-4':''} transition`}></div></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={guardar} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">Guardar Cambios</button>
    </div>
  )
}