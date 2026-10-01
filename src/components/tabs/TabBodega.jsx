import { useState, useEffect } from 'react'

export default function TabBodega({ empresa }) {
  const empresaId = empresa?.id || window.location.pathname.split('/')[2] || '9'
  const key = `stockos_bodegas_centros_${empresaId}`

  // Keys que lee TabEscaner
  const keyBodegasEscaner = `stockos_bodegas_${empresaId}`
  const keyPistolasEscaner = `stockos_pistolas_${empresaId}`

  const [items, setItems] = useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s) } catch {}
    return [{ id: 1, letra: 'A', sucursal: 'Sucursal Central', bodega: 'Bodega Central', encargado: 'Juan Pérez', pistolas: ['Pistola 1'], estado: 'En línea', creado: new Date().toLocaleString() }]
  })
  const [form, setForm] = useState({ sucursal: '', bodega: '', encargado: '', pistolas: '' })
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items))

    // === SINCRONIZACIÓN PARA TABESCANER - No daña tu módulo ===
    // 1. Convierte tus centros a formato bodegas para escaner
    const bodegasParaEscaner = items.map((it, idx) => ({
      id: it.id,
      nombre: it.bodega, // Nombre real que creas: Bodega Norte, etc
      ciudad: it.sucursal,
      stock: 0,
      encargado: it.encargado
    }))
    localStorage.setItem(keyBodegasEscaner, JSON.stringify(bodegasParaEscaner))

    // 2. Convierte pistolas para escaner
    const pistolasParaEscaner = []
    items.forEach(it => {
      it.pistolas.forEach((pNombre, pIdx) => {
        const id = `${it.bodega.replace(/\s+/g, '_').toUpperCase()}_${pNombre.replace(/\s+/g, '_').toUpperCase()}` || `PIST-${pIdx+1}`
        // Evitar duplicados
        if(!pistolasParaEscaner.find(p=>p.id===id)){
          pistolasParaEscaner.push({
            id: id,
            nombre: pNombre,
            bodega: it.bodega,
            sucursal: it.sucursal,
            modelo: 'Zebra DS3608',
            estado: 'Conectada',
            modo: 'Entrada'
          })
        }
      })
    })
    // Si no hay pistolas, deja al menos una default
    if(pistolasParaEscaner.length === 0){
      pistolasParaEscaner.push({ id: 'PIST-001', nombre: 'Pistola 1', bodega: items[0]?.bodega || 'Bodega Central', modelo: 'Zebra DS3608', estado: 'Conectada', modo: 'Entrada' })
    }
    localStorage.setItem(keyPistolasEscaner, JSON.stringify(pistolasParaEscaner))

  }, [items, key, keyBodegasEscaner, keyPistolasEscaner])

  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const guardar = () => {
    if (!form.sucursal.trim() ||!form.bodega.trim()) { alert('Sucursal y Bodega son obligatorios'); return }
    if (editId) {
      setItems(items.map(it => it.id === editId? {...it, sucursal: form.sucursal.trim(), bodega: form.bodega.trim(), encargado: form.encargado.trim() || 'Sin asignar', pistolas: form.pistolas.split(',').map(p=>p.trim()).filter(Boolean) } : it))
      setEditId(null)
    } else {
      const nuevo = { id: Date.now(), letra: letras[items.length] || `${items.length+1}`, sucursal: form.sucursal.trim(), bodega: form.bodega.trim(), encargado: form.encargado.trim() || 'Sin asignar', pistolas: form.pistolas.split(',').map(p=>p.trim()).filter(Boolean), estado: 'En línea', creado: new Date().toLocaleString() }
      setItems([...items, nuevo])
    }
    setForm({ sucursal: '', bodega: '', encargado: '', pistolas: '' })
  }
  const editar = (it) => { setEditId(it.id); setForm({ sucursal: it.sucursal, bodega: it.bodega, encargado: it.encargado, pistolas: it.pistolas.join(', ') }) }
  const eliminar = (id) => { if(!confirm('¿Eliminar?')) return; setItems(items.filter(i => i.id!== id)); setEditId(null) }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bodegas y Centros</h2>
        <p className="text-sm text-gray-500">{empresa?.nombre || `Empresa ${empresaId}`} — {items.length} centro(s)
          <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold">Alimenta a Escaner automáticamente</span>
        </p>
      </div>
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-3">{editId? 'Editar' : '+ Crear Centro'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={form.sucursal} onChange={e=>setForm({...form, sucursal: e.target.value})} placeholder="Sucursal" className="border rounded-lg px-3 py-2 text-sm" />
          <input value={form.bodega} onChange={e=>setForm({...form, bodega: e.target.value})} placeholder="Bodega - Ej: Bodega Norte" className="border-2 border-black rounded-lg px-3 py-2 text-sm font-bold bg-yellow-50" />
          <input value={form.encargado} onChange={e=>setForm({...form, encargado: e.target.value})} placeholder="Encargado" className="border rounded-lg px-3 py-2 text-sm" />
          <input value={form.pistolas} onChange={e=>setForm({...form, pistolas: e.target.value})} placeholder="Pistolas (P1, P2)" className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={guardar} className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-lg text-sm font-bold">{editId? 'Guardar' : 'Crear'}</button>
          {editId && <button onClick={()=>{setEditId(null); setForm({sucursal:'',bodega:'',encargado:'',pistolas:''})}} className="border px-4 py-2.5 rounded-lg text-sm">Cancelar</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(it => (
          <div key={it.id} className="bg-white border rounded-xl p-5">
            <div className="flex justify-between"><span className="text-2xl font-bold text-gray-300">{it.letra}</span><span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold">{it.estado}</span></div>
            <h4 className="font-bold text-sm mt-2">{it.sucursal}</h4><p className="text-xs text-gray-500 font-black">{it.bodega}</p>
            <div className="mt-3 text-xs space-y-1 border-t pt-3"><p><span className="text-gray-400">Encargado:</span> <b>{it.encargado}</b></p><p><span className="text-gray-400">Pistolas:</span> {it.pistolas.join(', ') || 'Sin configurar'}</p><p className="text-[10px] text-gray-400">{it.creado}</p></div>
            <div className="flex gap-2 mt-3"><button onClick={()=>editar(it)} className="flex-1 border rounded-lg py-1.5 text-xs">Editar</button><button onClick={()=>eliminar(it.id)} className="flex-1 border border-red-200 text-red-600 rounded-lg py-1.5 text-xs">Eliminar</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}