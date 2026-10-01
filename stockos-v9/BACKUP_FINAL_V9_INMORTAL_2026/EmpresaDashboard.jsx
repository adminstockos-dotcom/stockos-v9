import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LogoStockOS from '../components/LogoStockOS'
import LinkMaestroDisplay from '../components/LinkMaestroDisplay'
import EscanerDiarioP123 from './EscanerDiarioP123.jsx'
import CampanasIA from './CampanasIA.jsx'

const KEY_USERS = 'stockos_users_vc512'
const KEY_CARGOS = 'stockos_cargos_vc512'
const KEY_INIT = 'stockos_vc512_init_done'

const safeParse = (k, fb) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fb
  } catch {
    return fb
  }
}

const CARGOS_DEFAULT = [
  { nombre: 'Administrador', fijo: true, core: true },
  { nombre: 'Supervisor de Pedidos', fijo: true, core: true },
  { nombre: 'Responsable de Caja', fijo: true, core: true },
  { nombre: 'Mensajeros / Patinadores', fijo: true, core: true },
  { nombre: 'Asesor Comercial Mayorista', fijo: false },
  { nombre: 'Vendedor Externo / Viajero', fijo: false },
  { nombre: 'E-commerce / Marketplace', fijo: false },
  { nombre: 'Logística y Aduanas', fijo: false },
  { nombre: 'Servicio al Cliente / Postventa', fijo: false },
  { nombre: 'Marketing y Publicación', fijo: false },
  { nombre: 'Auxiliar de Bodega', fijo: false },
]

const MODULOS = [
  { id: 'm1', nombre: 'Personas, Roles y Organización', icon: '👥', masterLocked: true, hijos: [
    { id: 'admin', label: 'Administrador (acceso total)', desc: 'Control total del sistema', locked: true },
    { id: 'supervisor', label: 'Supervisor de Pedidos', desc: 'Gestiona y supervisa despachos', locked: false },
    { id: 'caja', label: 'Responsable de Caja', desc: 'Pagos y facturación', locked: false },
    { id: 'mensajeros', label: 'Mensajeros / Patinadores', desc: 'Entregas a domicilio', locked: false },
  ]},
  { id: 'm2', nombre: 'Escáner Diario + Compras P1/P2/P3', icon: '📊', masterLocked: false, hijos: [
    { id: 'enlaces', label: 'Enlaces por Proveedor + Escaneo 8:30AM / 2:30PM', desc: 'Gestión de proveedores y escaneo automático' },
    { id: 'detector', label: 'Detector P1/P2/P3 + Ranking', desc: 'Clasificación automática P1=Joyas P2=Medios P3=Cola' },
    { id: 'ordenes', label: 'Órdenes P1/P2/P3', desc: 'Gestión de órdenes de compra' },
    { id: 'alerta', label: 'Alerta stock bajo <5 WA', desc: 'Notificación WhatsApp' },
    { id: 'llegada', label: 'Control llegada bodega - Bodega Física Propia Multi-Sede', desc: 'Alerta de llegada multi-sede' },
    { id: 'catalogo', label: 'Alimenta catálogo virtual - Catálogo Cliente vc512', desc: 'Catálogo oficial de la empresa' },
  ]},
  { id: 'm3', nombre: 'Campañas Redes Sociales con IA', icon: '🤖', masterLocked: false, hijos: [
    { id: 'fotos', label: 'Fotos optimizadas IA', desc: 'Optimización de imágenes' },
    { id: 'precios', label: 'Precios 40%/85%', desc: 'Cálculo detal/mayorista' },
    { id: 'copy', label: 'Copy + hashtags', desc: 'Generación de texto' },
    { id: 'rrss', label: 'Publicaciones automáticas RRSS', desc: 'Instagram y Facebook' },
    { id: 'pauta', label: 'Pauta pagada', desc: 'Presupuesto aparte' },
  ]},
  { id: 'm4', nombre: 'Disparo + Link Maestro Pro', icon: '🚀', masterLocked: false, hijos: [
    { id: 'link', label: 'Link filtrable', desc: 'Link con filtros' },
    { id: 'horarios', label: 'Horarios óptimos RRSS', desc: 'Publica en horarios óptimos' },
    { id: 'grupos', label: 'Grupos propios', desc: 'Grupos de WhatsApp' },
    { id: 'comunidades', label: 'Comunidades propias', desc: 'Comunidades' },
    { id: 'gruposVenta', label: 'Grupos venta - Grupos Casa', desc: 'Grupos de venta' },
    { id: 'celular', label: 'Enlace celular empresa', desc: 'Link a WhatsApp' },
    { id: 'escanea', label: 'Escanea pedidos y compara', desc: 'Solo compara' },
    { id: 'cierra', label: 'Cierra ventas auto WA', desc: 'Cierre automático' },
    { id: 'campanas', label: 'Campañas bases datos WA', desc: 'Campañas con base' },
    { id: 'reportes', label: 'Reportes y clics', desc: 'Quién vio' },
    { id: 'promo', label: 'Link extra promo', desc: 'Link adicional' },
  ]},
  { id: 'm5', nombre: 'Despachos, guía y organización', icon: '📦', masterLocked: false, hijos: [
    { id: 'cierraVenta', label: 'Cierra venta', desc: 'Finaliza venta' },
    { id: 'organiza', label: 'Organiza pedidos por ruta', desc: 'Agrupa por zona' },
    { id: 'guia', label: 'Genera guía', desc: 'Crea guía' },
    { id: 'checklist', label: 'Checklist Mensajeros', desc: 'Listo para despachar' },
  ]},
  { id: 'm6', nombre: 'Fotos Variantes + CRM + Pagos', icon: '🏷️', masterLocked: false, hijos: [
    { id: 'tallas', label: 'Tallas (fotos variantes)', desc: 'Gestión de tallas' },
    { id: 'colores', label: 'Colores (fotos variantes)', desc: 'Gestión de colores' },
    { id: 'etiquetas', label: 'Etiquetas comerciales', desc: 'Sin código barras' },
    { id: 'crm', label: 'CRM Mayorista vs Detal', desc: '40%/85%' },
    { id: 'historial', label: 'Historial pedidos', desc: 'Registro' },
    { id: 'pagos', label: 'Pagos', desc: 'Contraentrega/Transf/Efectivo' },
  ]},
  { id: 'm7', nombre: 'Bodega Propia + Pistola + Códigos Barras', icon: '🔫', masterLocked: false, hijos: [
    { id: 'referencia', label: 'Crear referencia propia', desc: 'REF-001' },
    { id: 'tallasRef', label: 'Tallas por referencia', desc: 'Cantidades' },
    { id: 'stockReal', label: 'Stock real', desc: 'Control' },
    { id: 'barras', label: 'Código barras EAN13/CODE128', desc: 'Generación' },
    { id: 'etiquetasBarras', label: 'Imprimir etiquetas PDF', desc: 'Etiquetas' },
    { id: 'entradas', label: 'Entradas con pistola', desc: 'Lector' },
    { id: 'salidas', label: 'Salidas + Kardex', desc: 'Salida' },
    { id: 'control', label: 'Control bodega propia', desc: 'Control total' },
  ]},
]

const ROLES_CORE = [
  { id: 'admin', label: 'Administrador', icono: '👑', desc: 'Control total del sistema' },
  { id: 'supervisor', label: 'Supervisor de Pedidos', icono: '📋', desc: 'Gestiona y supervisa despachos' },
  { id: 'caja', label: 'Responsable de Caja', icono: '💰', desc: 'Pagos y facturación' },
  { id: 'mensajeros', label: 'Mensajeros / Patinadores', icono: '🛵', desc: 'Entregas a domicilio' },
]

function Switch({ checked, onChange, disabled = false, size = 'normal' }) {
  const sizes = {
    normal: { w: 'w-10', h: 'h-6', dot: 'w-4', translate: 'translate-x-5' },
    large: { w: 'w-14', h: 'h-8', dot: 'w-6', translate: 'translate-x-7' },
  }
  const s = sizes[size] || sizes.normal

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex ${s.w} ${s.h} items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block ${s.dot} h-4 transform rounded-full bg-white transition-transform ${
        checked ? s.translate : 'translate-x-1'
      }`} />
    </button>
  )
}

function Modulo1({ subdomain, users, agregar, actualizar, resetPass, cargos, agregarCargo, borrarUsuario, borrarCargo }) {
  const [showModal, setShowModal] = useState(false)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', whatsapp: '', cargo: '', email: '', pass: '' })
  const [nuevoCargo, setNuevoCargo] = useState({ nombre: '', descripcion: '', permisos: [] })

  const toggleRol = (rolId) => {
    const rol = ROLES_CORE.find((r) => r.id === rolId)
    const user = users.find((u) => u.cargo === rol.label)
    if (user) {
      actualizar(user.id, { activo: !user.activo })
    }
  }

  const crearUsuario = (e) => {
    e.preventDefault()
    if (!nuevo.nombre || !nuevo.whatsapp || !nuevo.cargo) return
    const digits = nuevo.whatsapp.replace(/\D/g, '')
    if (digits.length < 7) { alert('WhatsApp debe tener mínimo 7 dígitos'); return }
    const usuarioAuto = nuevo.nombre.toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000)
    agregar({
      nombre: nuevo.nombre,
      whatsapp: nuevo.whatsapp,
      cargo: nuevo.cargo,
      email: nuevo.email || null,
      pass: nuevo.pass || `vc512${Math.floor(Math.random() * 1000)}`,
      usuario: usuarioAuto,
      fijo: false,
      protegido: false,
      borrable: true,
    })
    setNuevo({ nombre: '', whatsapp: '', cargo: '', email: '', pass: '' })
    setShowModal(false)
  }

  const crearCargo = (e) => {
    e.preventDefault()
    if (!nuevoCargo.nombre) return
    agregarCargo({ nombre: nuevoCargo.nombre, descripcion: nuevoCargo.descripcion, permisos: nuevoCargo.permisos, fijo: false })
    setNuevoCargo({ nombre: '', descripcion: '', permisos: [] })
    setShowCargoModal(false)
  }

  if (!users || users.length === 0) {
    return <div className="card text-center py-8"><p className="text-gray-500">Cargando usuarios...</p></div>
  }

  return (
    <div className="space-y-6 w-full">
      {/* Cards de roles CORE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES_CORE.map((rol) => {
          const user = users.find((u) => u.cargo === rol.label)
          const isActive = user?.activo ?? true
          return (
            <div key={rol.id} className={`border rounded-xl p-4 text-center ${isActive ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
              <p className="text-3xl mb-2">{rol.icono}</p>
              <h4 className="font-semibold text-gray-900 text-sm">{rol.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{rol.desc}</p>
              <div className="mt-3 flex justify-center">
                <Switch checked={isActive} onChange={() => toggleRol(rol.id)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Cargos personalizados */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Cargos personalizados de {subdomain}</h3>
          <button onClick={() => setShowCargoModal(true)} className="btn-primary text-sm">+ Nuevo Cargo</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cargos.filter((c) => !c.core).map((cargo) => (
            <span key={cargo.nombre} className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
              {cargo.nombre}
              <button type="button" onClick={() => borrarCargo(cargo.nombre)} className="text-red-500 hover:text-red-700 font-bold">×</button>
            </span>
          ))}
          {cargos.filter((c) => !c.core).length === 0 && <p className="text-sm text-gray-400">Sin cargos personalizados</p>}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Usuarios de {subdomain}</h3>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Nuevo Usuario</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">Nombre</th>
              <th className="th">WhatsApp</th>
              <th className="th">Cargo</th>
              <th className="th">Email</th>
              <th className="th">Activo</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="td font-medium">{u.nombre}</td>
                <td className="td">
                  <input
                    className={`text-xs border rounded px-2 py-1 w-32 ${['admin', 'supervisor', 'caja', 'mensajero1'].includes(u.whatsapp) ? 'border-red-300 bg-red-50' : ''}`}
                    value={['admin', 'supervisor', 'caja', 'mensajero1'].includes(u.whatsapp) ? '' : u.whatsapp}
                    placeholder="3xx xxx xxxx"
                    onChange={(e) => actualizar(u.id, { whatsapp: e.target.value })}
                  />
                </td>
                <td className="td">
                  <select value={u.cargo} onChange={(e) => actualizar(u.id, { cargo: e.target.value })} className="text-xs border rounded px-2 py-1">
                    <option value="">-- Seleccione --</option>
                    {cargos.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </td>
                <td className="td text-xs text-gray-500">{u.email || '—'}</td>
                <td className="td"><Switch checked={u.activo} onChange={() => actualizar(u.id, { activo: !u.activo })} /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => { const newPass = prompt('Nueva contraseña:'); if (newPass) resetPass(u.id, newPass) }} className="text-blue-600 text-xs">Reset Pass</button>
                    {u.borrable !== false && u.nombre !== 'Iván Cadena' ? (
                      <button
                        type="button"
                        onClick={() => borrarUsuario(u.id, u.nombre)}
                        className="p-1.5 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-600 hover:text-white cursor-pointer"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    ) : (
                      <span className="p-1.5 text-gray-300 border rounded cursor-not-allowed" title="Protegido">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Usuario - FULLSCREEN ANTI-AUTOFILL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Nuevo Usuario</h3>
            <form onSubmit={crearUsuario} autoComplete="off" data-form-type="other" className="space-y-6">
              <input type="text" name="prevent_autofill" style={{ display: 'none' }} autoComplete="off" />
              <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} autoComplete="new-password" />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">Nombre completo*</label>
                  <input className="input" name="nombre_completo_stockos" autoComplete="off" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="label">WhatsApp*</label>
                  <input className="input" name="whatsapp_stockos" type="tel" inputMode="numeric" autoComplete="off" placeholder="+57 300 123 4567" value={nuevo.whatsapp} onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">Cargo / Rol*</label>
                  <div className="text-[10px] text-gray-400 mb-1">{cargos.length} cargos cargados</div>
                  <div className="flex gap-2">
                    <select className="input flex-1" name="cargo_stockos" required value={nuevo.cargo} onChange={(e) => setNuevo({ ...nuevo, cargo: e.target.value })}>
                      <option value="">-- Seleccione cargo --</option>
                      {cargos.map((cargo) => <option key={cargo.nombre} value={cargo.nombre}>{cargo.nombre}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowCargoModal(true)} className="btn-secondary text-sm whitespace-nowrap">+ Crear Nuevo Cargo</button>
                  </div>
                </div>
                <div>
                  <label className="label">Email corporativo (opcional)</label>
                  <input className="input" name="correo_corp_stockos" type="text" autoComplete="off" data-lpignore="true" data-form-type="other" placeholder="opcional - si tiene correo corporativo" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Contraseña temporal (opcional)</label>
                <input className="input" type="password" autoComplete="new-password" placeholder="Si no pone, se auto genera vc512 + número" value={nuevo.pass} onChange={(e) => setNuevo({ ...nuevo, pass: e.target.value })} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-primary flex-1 justify-center py-3">Crear Usuario</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-8">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cargo */}
      {showCargoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nuevo Cargo</h3>
            <form onSubmit={crearCargo} autoComplete="off" className="space-y-4">
              <div>
                <label className="label">Nombre cargo</label>
                <input className="input" value={nuevoCargo.nombre} onChange={(e) => setNuevoCargo({ ...nuevoCargo, nombre: e.target.value })} required />
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input" value={nuevoCargo.descripcion} onChange={(e) => setNuevoCargo({ ...nuevoCargo, descripcion: e.target.value })} />
              </div>
              <div>
                <label className="label">Permisos (módulos)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {MODULOS.map((mod) => (
                    <label key={mod.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={nuevoCargo.permisos.includes(mod.id)} onChange={(e) => {
                        if (e.target.checked) setNuevoCargo({ ...nuevoCargo, permisos: [...nuevoCargo.permisos, mod.id] })
                        else setNuevoCargo({ ...nuevoCargo, permisos: nuevoCargo.permisos.filter((p) => p !== mod.id) })
                      }} className="h-4 w-4 rounded border-gray-300" />
                      <span>{mod.icon} {mod.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1 justify-center">Crear Cargo</button>
                <button type="button" onClick={() => setShowCargoModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmpresaDashboard() {
  const { subdomain: rawSub } = useParams()
  const navigate = useNavigate()
  const sub = rawSub?.toLowerCase().trim()
  const [empresa, setEmpresa] = useState(null)
  const [config, setConfig] = useState(null)
  const [moduloActivo, setModuloActivo] = useState('m1')
  const [users, setUsers] = useState(null)
  const [cargos, setCargos] = useState([])

  // Anti-resiembra definitiva
  useEffect(() => {
    const initDone = localStorage.getItem(KEY_INIT)
    let usersRaw = safeParse(KEY_USERS, null)

    if (!initDone) {
      // Primera vez en la vida del navegador
      if (!usersRaw || usersRaw.length === 0) {
        usersRaw = [
          { id: 'u_ivan', nombre: 'Iván Cadena', whatsapp: '3017919560', cargo: 'Administrador / Gerencia', email: '', activo: true, protegido: true },
        ]
      }
      localStorage.setItem(KEY_USERS, JSON.stringify(usersRaw))
      localStorage.setItem(KEY_INIT, 'true')
      setUsers(usersRaw)
    } else {
      // Ya inicializado: RESPETAR LO QUE HAY, aunque sea solo 1 usuario
      if (usersRaw) setUsers(usersRaw)
    }

    // CARGOS: 4 CORE fijos SIEMPRE ON + 7 personalizados
    let cargosRaw = safeParse(KEY_CARGOS, null)
    if (!cargosRaw) {
      localStorage.setItem(KEY_CARGOS, JSON.stringify(CARGOS_DEFAULT))
      setCargos(CARGOS_DEFAULT)
    } else {
      setCargos(cargosRaw)
    }
  }, [])

  const agregar = (user) => setUsers((prev) => [...prev, { ...user, id: `u${Date.now()}`, activo: true }])
  const actualizar = (id, updates) => setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u))
  const resetPass = (id, newPass) => setUsers((prev) => prev.map((u) => u.id === id ? { ...u, pass: newPass } : u))
  const agregarCargo = (cargo) => setCargos((prev) => [...prev, cargo])

  const borrarUsuario = (id, nombre) => {
    if (nombre === 'Iván Cadena') { alert('Iván es Admin principal protegido'); return }
    if (!confirm('¿Eliminar a ' + nombre + '?')) return
    setUsers((prev) => {
      const n = prev.filter((u) => u.id !== id)
      localStorage.setItem(KEY_USERS, JSON.stringify(n))
      return n
    })
  }

  const borrarCargo = (nombreCargo) => {
    if (!confirm('¿Eliminar cargo "' + nombreCargo + '"?')) return
    setCargos((prev) => {
      const n = prev.filter((c) => c.nombre !== nombreCargo)
      localStorage.setItem(KEY_CARGOS, JSON.stringify(n))
      return n
    })
  }

  useEffect(() => {
    const empresas = safeParse('stockos_empresas', [])
    const emp = empresas.find((e) => e.subdomain.toLowerCase() === sub)
    if (!emp) {
      setEmpresa(null)
      return
    }
    setEmpresa(emp)

    const savedConfig = safeParse(`stockos_config_${sub}`, null)
    if (savedConfig) {
      setConfig(savedConfig)
    } else {
      const defaultConfig = { modulos: {} }
      MODULOS.forEach((m) => {
        defaultConfig.modulos[m.id] = { master: true, hijos: {} }
        m.hijos.forEach((h) => { defaultConfig.modulos[m.id].hijos[h.id] = true })
      })
      setConfig(defaultConfig)
      localStorage.setItem(`stockos_config_${sub}`, JSON.stringify(defaultConfig))
    }
  }, [sub])

  const guardar = (nuevaConfig) => {
    setConfig(nuevaConfig)
    localStorage.setItem(`stockos_config_${sub}`, JSON.stringify(nuevaConfig))
  }

  const toggleMaster = (modId) => {
    if (!config) return
    const mod = MODULOS.find((m) => m.id === modId)
    if (mod?.masterLocked) return
    const nuevaConfig = { ...config }
    const nuevoMaster = !config.modulos[modId].master
    nuevaConfig.modulos[modId].master = nuevoMaster
    if (!nuevoMaster) {
      Object.keys(nuevaConfig.modulos[modId].hijos).forEach((hijoId) => {
        nuevaConfig.modulos[modId].hijos[hijoId] = false
      })
    }
    guardar(nuevaConfig)
  }

  const toggleHijo = (modId, hijoId) => {
    if (!config) return
    const nuevaConfig = { ...config }
    nuevaConfig.modulos[modId].hijos[hijoId] = !config.modulos[modId].hijos[hijoId]
    guardar(nuevaConfig)
  }

  const crearEmpresaModelo = () => {
    const empresas = safeParse('stockos_empresas', [])
    const nueva = {
      id: Date.now(),
      nombreEmpresa: 'Virtualclass512',
      nombreContacto: 'Ivn cadena',
      whatsappContacto: '+57 301 791 9560',
      email: 'virtualclass512@gmail.com',
      subdomain: 'vc512',
      estado: 'aprobado',
      fechaCreacion: new Date().toISOString(),
    }
    const updated = [...empresas, nueva]
    localStorage.setItem('stockos_empresas', JSON.stringify(updated))
    window.location.reload()
  }

  if (!empresa) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card text-center max-w-sm">
          <p className="text-4xl mb-3">❌</p>
          <h3 className="font-semibold text-gray-900 mb-2">Empresa no encontrada</h3>
          <p className="text-sm text-gray-500 mb-4">El subdomain "{sub}" no existe en el sistema.</p>
          <button onClick={crearEmpresaModelo} className="btn-primary">Crear Empresa Modelo VC512</button>
        </div>
      </div>
    )
  }

  if (!users) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card text-center max-w-sm">
          <p className="text-4xl mb-3">⏳</p>
          <h3 className="font-semibold text-gray-900 mb-2">Cargando vc512...</h3>
          <p className="text-sm text-gray-500">Preparando tu espacio de trabajo</p>
        </div>
      </div>
    )
  }

  const moduloActual = MODULOS.find((m) => m.id === moduloActivo)
  const modConfig = config?.modulos[moduloActivo] || { master: true, hijos: {} }
  const usuarioActual = users.find((u) => u.activo) || users[0]

  try {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="flex">
          {/* COLUMNA IZQUIERDA */}
          <div className="w-80 bg-white border-r min-h-screen p-4 flex flex-col">
            <div className="mb-4"><LogoStockOS height={48} /></div>
            <div className="mb-4">
              <h2 className="font-bold text-gray-900">{empresa.nombreEmpresa}</h2>
              <p className="text-xs text-gray-500">{empresa.subdomain}</p>
            </div>
            <div className="mb-4"><LinkMaestroDisplay subdomain={empresa.subdomain} /></div>
            <nav className="flex-1 space-y-1">
              {MODULOS.map((mod) => {
                const isActive = moduloActivo === mod.id
                const isMasterOn = config?.modulos[mod.id]?.master ?? true
                return (
                  <button key={mod.id} onClick={() => setModuloActivo(mod.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    } ${!isMasterOn ? 'opacity-50' : ''}`}>
                    <span className="text-xl">{mod.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{mod.nombre}</p>
                      {mod.masterLocked && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">CORE FIJO</span>}
                    </div>
                    <Switch checked={isMasterOn} onChange={() => toggleMaster(mod.id)} disabled={mod.masterLocked} />
                  </button>
                )
              })}
            </nav>
            <button onClick={() => { localStorage.removeItem('isSuperAdmin'); navigate('/login') }}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 text-left">
              Cerrar sesión
            </button>
          </div>

          {/* COLUMNA CENTRO */}
          <div className="flex-1 p-2 md:p-6 overflow-auto w-full">
            <div className="w-full max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{moduloActual.icon}</span>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{moduloActual.nombre}</h1>
                    <p className="text-sm text-gray-500">{modConfig.master ? 'Módulo activo' : 'Módulo desactivado'}</p>
                  </div>
                </div>
                {usuarioActual && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Usuario actual</p>
                    <p className="text-sm font-medium text-gray-900">{usuarioActual.nombre} ({usuarioActual.cargo})</p>
                  </div>
                )}
              </div>

              {!modConfig.master ? (
                <div className="card text-center py-12">
                  <p className="text-4xl mb-3">🔒</p>
                  <h3 className="font-semibold text-gray-900 mb-2">Módulo desactivado</h3>
                  <p className="text-sm text-gray-500 mb-4">Activa el switch maestro en la lista izquierda.</p>
                  {!moduloActual.masterLocked && <button onClick={() => toggleMaster(moduloActivo)} className="btn-primary">Activar Módulo</button>}
                </div>
              ) : moduloActivo === 'm1' ? (
                <Modulo1 subdomain={empresa.subdomain} users={users} agregar={agregar} actualizar={actualizar}
                  resetPass={resetPass} cargos={cargos} agregarCargo={agregarCargo}
                  borrarUsuario={borrarUsuario} borrarCargo={borrarCargo} />
              ) : moduloActivo === 'm3' ? (
                <CampanasIA />
              ) : (
                <div className="mt-4">
                  <EscanerDiarioP123 />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error render:', error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card text-center max-w-sm">
          <p className="text-4xl mb-3">⚠️</p>
          <h3 className="font-semibold text-gray-900 mb-2">Recargando...</h3>
          <p className="text-sm text-gray-500">Hubo un error. Recarga la página.</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Recargar</button>
        </div>
      </div>
    )
  }
}
