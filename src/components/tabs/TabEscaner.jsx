import { useState, useMemo, useEffect } from 'react'

const TIPOS_MEDIDA = {
  Ropa: ['S','M','L','XL','XXL'],
  'Calzado Dama': ['35','36','37','38','39','5','5.5','6','6.5','7','7.5','8'],
  'Calzado Hombre': ['40','41','42','43','44','45'],
  Otro: ['UNICA']
}

const DATA_EJEMPLO = {
  'Bodega Principal Cali|REF-001|M': { stock: 15, entradas: 20, salidas: 5, devoluciones: 0 },
  'Bodega Principal Cali|REF-001|L': { stock: 8, entradas: 10, salidas: 2, devoluciones: 0 },
}
const BODEGAS_EJEMPLO = [
  { id: 1, nombre: 'Bodega Principal Cali', ciudad: 'Cali', stock: 35 },
  { id: 2, nombre: 'Centro Norte', ciudad: 'Bogota', stock: 5 },
]
const LOGS_EJEMPLO = [{ id: 1, fecha: new Date().toISOString(), tipo: 'Entrada', producto: 'REF-001-M-0001', referencia: 'REF-001', espec: 'M', bodega: 'Bodega Principal Cali', pistola: 'PIST-001', motivo: '' }]

export default function TabEscaner({ empresa }) {
  const empresaId = empresa?.id || window.location.pathname.split('/')[2] || '9'
  const esReal = Number(empresaId) === 21 || empresa?.nombre?.toUpperCase().includes('MAXIMA')

  const [bodegas, setBodegas] = useState(() => {
    try {
      const saved = localStorage.getItem(`stockos_bodegas_${empresaId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if(parsed.length > 0) return parsed
      }
    } catch {}
    return esReal? [{ id: 1, nombre: 'Bodega Norte', ciudad: 'Cali', stock: 0 }] : BODEGAS_EJEMPLO
  })

  const [scanners, setScanners] = useState(() => {
    try {
      const saved = localStorage.getItem(`stockos_pistolas_${empresaId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if(parsed.length > 0) return parsed
      }
    } catch {}
    return [
      { id: 'PIST-001', nombre: 'Pistola Principal', modelo: 'Zebra DS3608', estado: 'Conectada', modo: 'Entrada' },
      { id: 'PIST-002', nombre: 'Pistola Norte', modelo: 'Honeywell 1470g', estado: 'Conectada', modo: 'Salida' },
    ]
  })

  const [referencias, setReferencias] = useState(() => {
    try {
      const saved = localStorage.getItem(`stockos_refs_${empresaId}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      { id: 'REF-001', tipo: 'Ropa', especificaciones: ['S','M','L','XL'] },
      { id: 'REF-002', tipo: 'Calzado Dama', especificaciones: ['35','36','37','38'] },
      { id: 'REF-003', tipo: 'Calzado Hombre', especificaciones: ['40','41','42','43'] },
    ]
  })
  const [inventario, setInventario] = useState(() => {
    try {
      const saved = localStorage.getItem(`stockos_inventario_${empresaId}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return esReal? {} : DATA_EJEMPLO
  })
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`stockos_logs_${empresaId}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return esReal? [] : LOGS_EJEMPLO
  })

  const [prefijo, setPrefijo] = useState('REF-001')
  const [especSel, setEspecSel] = useState('M')
  const [bodegaSel, setBodegaSel] = useState(bodegas[0]?.nombre || 'Bodega Norte')
  const [pistolaSel, setPistolaSel] = useState(scanners[0]?.id || 'PIST-001')
  const [consecutivo, setConsecutivo] = useState(1)
  const [motivoDevo, setMotivoDevo] = useState('')
  const [nuevaEspec, setNuevaEspec] = useState('')
  const [nuevaRef, setNuevaRef] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState('Ropa')
  const [openBodega, setOpenBodega] = useState(true)
  const [openPistola, setOpenPistola] = useState(true)
  const [openDetalle, setOpenDetalle] = useState(true)

  // Persistencia
  useEffect(() => { localStorage.setItem(`stockos_bodegas_${empresaId}`, JSON.stringify(bodegas)) }, [bodegas, empresaId])
  useEffect(() => { localStorage.setItem(`stockos_pistolas_${empresaId}`, JSON.stringify(scanners)) }, [scanners, empresaId])
  useEffect(() => { localStorage.setItem(`stockos_refs_${empresaId}`, JSON.stringify(referencias)) }, [referencias, empresaId])
  useEffect(() => { localStorage.setItem(`stockos_inventario_${empresaId}`, JSON.stringify(inventario)) }, [inventario, empresaId])
  useEffect(() => { localStorage.setItem(`stockos_logs_${empresaId}`, JSON.stringify(logs)) }, [logs, empresaId])

  // === LEE EN VIVO LO QUE CREAS EN TABBODEGA ===
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const b = localStorage.getItem(`stockos_bodegas_${empresaId}`)
        if (b) {
          const parsed = JSON.parse(b)
          if (parsed.length > 0 && JSON.stringify(parsed)!== JSON.stringify(bodegas)) {
            setBodegas(parsed)
          }
        }
        const p = localStorage.getItem(`stockos_pistolas_${empresaId}`)
        if (p) {
          const parsed = JSON.parse(p)
          if (parsed.length > 0 && JSON.stringify(parsed)!== JSON.stringify(scanners)) {
            setScanners(parsed)
          }
        }
      } catch {}
    }, 800)
    return () => clearInterval(id)
  }, [bodegas, scanners, empresaId])

  useEffect(() => {
    const refDeEseTipo = referencias.find(r => r.tipo === nuevoTipo)
    if (refDeEseTipo) {
      setPrefijo(refDeEseTipo.id)
      setEspecSel(refDeEseTipo.especificaciones[0])
    } else {
      setEspecSel(TIPOS_MEDIDA[nuevoTipo][0])
    }
  }, [nuevoTipo])

  useEffect(() => {
    if (!bodegas.find(b => b.nombre === bodegaSel) && bodegas[0]) setBodegaSel(bodegas[0].nombre)
  }, [bodegas, bodegaSel])

  useEffect(() => {
    if (!scanners.find(s => s.id === pistolaSel) && scanners[0]) setPistolaSel(scanners[0].id)
  }, [scanners, pistolaSel])

  const barcode = `${prefijo}-${especSel}-${String(consecutivo).padStart(4, '0')}`
  const scannerActual = scanners.find(s=>s.id===pistolaSel) || scanners[0]
  const refActual = referencias.find(r=>r.id===prefijo)

  const resetCero = () => {
    if(!confirm(`¿RESET TOTAL A CERO de ${empresa?.nombre}?`)) return
    setInventario({}); setLogs([]); setConsecutivo(1)
  }

  const addReferencia = () => {
    if(!nuevaRef.trim()) return alert('Escribe Ej: MAXIMA DAMA')
    const id = nuevaRef.trim().toUpperCase()
    if(referencias.some(r=>r.id===id)) return alert('Ya existe')
    const specs = TIPOS_MEDIDA[nuevoTipo]
    setReferencias(prev=>[...prev, {id, tipo: nuevoTipo, especificaciones: specs}])
    setPrefijo(id); setEspecSel(specs[0]); setNuevaRef('')
  }
  const addEspecificacion = () => {
    if(!nuevaEspec.trim() ||!refActual) return
    setReferencias(prev=>prev.map(r=> r.id===prefijo? {...r, especificaciones:[...r.especificaciones, nuevaEspec.trim()]}:r))
    setEspecSel(nuevaEspec.trim()); setNuevaEspec('')
  }
  const escanearAhora = () => {
    if(scannerActual.modo==='Devolucion' &&!motivoDevo.trim()) return alert('Motivo obligatorio')
    const key = `${bodegaSel}|${prefijo}|${especSel}`
    const tipo = scannerActual.modo
    const log = { id: Date.now(), fecha: new Date().toISOString(), tipo, producto: barcode, referencia: prefijo, espec: especSel, bodega: bodegaSel, pistola: pistolaSel, motivo: tipo==='Devolucion'?motivoDevo:'' }
    setLogs(prev=>[log,...prev])
    setInventario(prev=>{
      const cur = prev[key] || {stock:0, entradas:0, salidas:0, devoluciones:0}
      if(tipo==='Entrada') return {...prev, [key]:{...cur, stock:cur.stock+1, entradas:cur.entradas+1}}
      if(tipo==='Devolucion') return {...prev, [key]:{...cur, stock:cur.stock+1, devoluciones:cur.devoluciones+1}}
      return {...prev, [key]:{...cur, stock:Math.max(0,cur.stock-1), salidas:cur.salidas+1}}
    })
    setConsecutivo(c=>c+1)
  }

  const exportExcel = () => {
    const csv = ['Bodega,Ref,Tipo,Espec,Entradas,Salidas,Devoluciones,Stock',...Object.entries(inventario).map(([k,v])=>{const [b,r,e]=k.split('|'); const t=referencias.find(x=>x.id===r)?.tipo||''; return `${b},${r},${t},${e},${v.entradas},${v.salidas},${v.devoluciones},${v.stock}`})].join('\n')
    const blob = new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`stockos_${prefijo}_${empresaId}.csv`; a.click()
  }
  const imprimirEtiqueta = () => {
    const w=window.open('','','width=400,height=300'); w.document.write(`<html><body style="text-align:center;font-family:monospace"><h2>${barcode}</h2><img src="https://barcodeapi.org/api/128/${barcode}" style="width:100%"/><p>${refActual?.tipo} | ${bodegaSel}</p><script>window.print();setTimeout(()=>window.close(),500)</script></body></html>`); w.document.close()
  }
  const imprimirBarras = (cantidad = 1) => {
    const w = window.open('', '', 'width=500,height=700')
    let etiquetas = ''
    for(let i=0;i<cantidad;i++){
      etiquetas += `<div style="border:1px dashed #999; padding:12px 8px; margin:8px; text-align:center; page-break-inside:avoid;"><div style="font-family:monospace; font-weight:900; font-size:14px;">${barcode}</div><img src="https://barcodeapi.org/api/128/${barcode}" style="width:90%; height:50px; object-fit:contain; margin:6px 0;" /><div style="font-size:9px;">${refActual?.tipo} | ${bodegaSel} | ${prefijo}-${especSel}</div></div>`
    }
    w.document.write(`<html><head><title>Barras ${barcode} x${cantidad}</title><style>body{font-family:monospace; margin:0; padding:10px;} @media print { @page { margin:5mm; } }</style></head><body><div style="display:grid; grid-template-columns:1fr 1fr; gap:2px;">${etiquetas}</div><script>window.onload=()=>{window.print(); setTimeout(()=>window.close(),800)}</script></body></html>`)
    w.document.close()
  }

  const informe = useMemo(()=>{
    const detalle = Object.entries(inventario).map(([k,v])=>{ const [bodega,ref,espec]=k.split('|'); return {bodega,ref,espec,...v} })
    return {
      total: logs.length, entradas: logs.filter(l=>l.tipo==='Entrada').length, salidas: logs.filter(l=>l.tipo==='Salida').length, devoluciones: logs.filter(l=>l.tipo==='Devolucion').length,
      totalStock: detalle.reduce((a,c)=>a+c.stock,0), detalle,
      porBodega: bodegas.map(b=>({...b, entradas: detalle.filter(d=>d.bodega===b.nombre).reduce((a,c)=>a+c.entradas,0), salidas: detalle.filter(d=>d.bodega===b.nombre).reduce((a,c)=>a+c.salidas,0), stock: detalle.filter(d=>d.bodega===b.nombre).reduce((a,c)=>a+c.stock,0)})),
      porPistola: scanners.map(s=>({...s, entradas: logs.filter(l=>l.pistola===s.id && l.tipo==='Entrada').length, salidas: logs.filter(l=>l.pistola===s.id && l.tipo==='Salida').length, devoluciones: logs.filter(l=>l.pistola===s.id && l.tipo==='Devolucion').length })),
    }
  },[logs,inventario,bodegas,scanners])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">🏭 Escáner - {empresa?.nombre} {esReal? <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded">REAL - EN CERO</span> : <span className="bg-gray-400 text-white text-[10px] px-2 py-1 rounded">Empresa {empresaId}</span>}</h2>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-green-600 text-white px-3 py-2 rounded font-bold text-xs">📊 Excel</button>
          <button onClick={()=>window.print()} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-xs">📄 PDF</button>
          <button onClick={resetCero} className="bg-red-600 text-white px-4 py-2 rounded font-black text-xs">🗑️ RESET A CERO</button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-[11px]">🔗 Conectado a TabBodega: {bodegas.length} bodega(s) / {scanners.length} pistola(s) | Bodega actual: <b>{bodegaSel}</b> | Pistola: <b>{pistolaSel}</b></div>

      <div className="bg-white p-4 rounded-lg shadow border grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="border rounded p-2 space-y-2 bg-gray-50">
            <div className="text-[10px] font-black">CREAR NUEVA REFERENCIA + TIPO DE MEDIDA</div>
            <div className="flex gap-2"><input value={nuevaRef} onChange={e=>setNuevaRef(e.target.value)} placeholder="Ej: MAXIMA DAMA" className="border p-2 rounded text-xs flex-1"/><select value={nuevoTipo} onChange={e=>setNuevoTipo(e.target.value)} className="border p-2 rounded text-xs font-bold bg-white">{Object.keys(TIPOS_MEDIDA).map(t=><option key={t} value={t}>{t}</option>)}</select><button onClick={addReferencia} className="bg-black text-white px-3 rounded text-xs font-black">+ CREAR</button></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={prefijo} onChange={e=>setPrefijo(e.target.value)} className="border p-2 rounded font-mono text-sm font-bold">{referencias.map(r=><option key={r.id} value={r.id}>{r.id} [{r.tipo}]</option>)}</select>
            <select value={especSel} onChange={e=>setEspecSel(e.target.value)} className="border-2 border-black p-2 rounded font-bold text-sm bg-yellow-50">{(refActual?.especificaciones || []).map(es=><option key={es} value={es}>{es}</option>)}</select>
          </div>
          <div className="flex gap-2"><input value={nuevaEspec} onChange={e=>setNuevaEspec(e.target.value)} placeholder={`Nueva espec para ${refActual?.tipo}`} className="border p-2 rounded text-xs flex-1"/><button onClick={addEspecificacion} className="bg-gray-800 text-white px-3 rounded text-xs">+ Espec</button></div>
          <div className="bg-white border-2 border-dashed p-3 rounded text-center space-y-2">
            <div className="font-mono text-xl font-black">{barcode}</div>
            <img src={`https://barcodeapi.org/api/128/${barcode}`} alt="barcode" className="mx-auto h-16 object-contain"/>
            <div className="text-[9px]">{refActual?.tipo || nuevoTipo} | {bodegaSel} | {scannerActual?.modo}</div>
            <button onClick={imprimirEtiqueta} className="w-full bg-gray-900 text-white py-1 rounded text-xs font-bold">🖨️ Imprimir Etiqueta</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black">PISTOLA (creada en Bodegas y Centros)</div>
          <select value={pistolaSel} onChange={e=>setPistolaSel(e.target.value)} className="w-full border p-2 rounded text-sm font-mono bg-gray-50">{scanners.map(s=><option key={s.id} value={s.id}>{s.id} - {s.nombre} [{s.modo}] - {s.bodega}</option>)}</select>
          <div className="text-[10px] font-black">BODEGA REAL (creada en Bodegas y Centros)</div>
          <select value={bodegaSel} onChange={e=>setBodegaSel(e.target.value)} className="w-full border-2 border-black p-2 rounded text-sm font-bold bg-yellow-50">{bodegas.map(b=><option key={b.id} value={b.nombre}>{b.nombre} - {b.ciudad}</option>)}</select>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={()=>setScanners(p=>p.map(s=>s.id===pistolaSel?{...s,modo:'Entrada'}:s))} className={`py-3 rounded font-black text-xs ${scannerActual?.modo==='Entrada'?'bg-green-600 text-white':'bg-gray-200'}`}>ENTRADA</button>
            <button onClick={()=>setScanners(p=>p.map(s=>s.id===pistolaSel?{...s,modo:'Salida'}:s))} className={`py-3 rounded font-black text-xs ${scannerActual?.modo==='Salida'?'bg-red-600 text-white':'bg-gray-200'}`}>SALIDA</button>
            <button onClick={()=>setScanners(p=>p.map(s=>s.id===pistolaSel?{...s,modo:'Devolucion'}:s))} className={`py-3 rounded font-black text-xs ${scannerActual?.modo==='Devolucion'?'bg-yellow-400':'bg-gray-200'}`}>DEVOLUCIÓN</button>
          </div>
          {scannerActual?.modo==='Devolucion' && <input placeholder="Motivo devolución" value={motivoDevo} onChange={e=>setMotivoDevo(e.target.value)} className="w-full border-2 border-yellow-400 p-2 rounded text-sm"/>}
          <button onClick={escanearAhora} className="w-full bg-black text-white py-3 rounded font-black">📡 ESCANEAR {prefijo} {especSel}</button>
          <div className="border-2 border-black rounded-lg p-2 bg-yellow-50 space-y-2 mt-2">
            <div className="text-[10px] font-black text-center">🖨️ IMPRIMIR CÓDIGO DE BARRAS - {barcode}</div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>imprimirBarras(1)} className="bg-white border-2 border-black py-2 rounded font-black text-[11px]">BARRAS x1</button>
              <button onClick={()=>imprimirBarras(6)} className="bg-white border-2 border-black py-2 rounded font-black text-[11px]">BARRAS x6</button>
              <button onClick={()=>imprimirBarras(12)} className="bg-black text-white py-2 rounded font-black text-[11px]">BARRAS x12</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>imprimirBarras(24)} className="bg-blue-600 text-white py-1.5 rounded font-bold text-[10px]">📄 HOJA x24</button>
              <button onClick={()=>imprimirBarras(50)} className="bg-green-600 text-white py-1.5 rounded font-bold text-[10px]">📦 ROLLO x50</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border-t-4 border-black overflow-hidden">
        <div className="p-4"><h3 className="font-black text-sm">📊 CONSOLIDADO TOTAL - {esReal? 'MÁXIMA IMPORTADORES REAL EN CERO' : 'EJEMPLO'}</h3><div className="grid grid-cols-5 gap-3 mt-3"><div className="bg-black text-white p-3 rounded"><div className="text-[10px]">STOCK REAL</div><div className="text-2xl font-black">{informe.totalStock}</div></div><div className="bg-gray-50 p-3 rounded border"><div className="text-[10px]">TOTAL MOV</div><div className="text-2xl font-black">{informe.total}</div></div><div className="bg-green-50 p-3 rounded border"><div className="text-[10px]">ENTRADAS</div><div className="text-2xl font-black text-green-600">{informe.entradas}</div></div><div className="bg-red-50 p-3 rounded border"><div className="text-[10px]">SALIDAS</div><div className="text-2xl font-black text-red-600">{informe.salidas}</div></div><div className="bg-yellow-50 p-3 rounded border"><div className="text-[10px]">DEVOLUCIONES</div><div className="text-2xl font-black text-yellow-600">{informe.devoluciones}</div></div></div></div>
        <div className="border-t"><button onClick={()=>setOpenDetalle(!openDetalle)} className="w-full flex justify-between p-4 bg-black text-white font-bold text-sm"><span>📋 DETALLE POR REFERENCIA + ESPECIFICACIÓN + BODEGA - FULL ANCHO</span><span>{openDetalle?'▲':'▼'}</span></button>{openDetalle && <table className="w-full text-xs"><thead><tr className="bg-gray-100 text-[11px]"><th className="p-3 text-left">Bodega</th><th className="p-3 text-left">Ref</th><th className="p-3">Tipo</th><th className="p-3">Espec</th><th className="p-3 text-green-600">Ent</th><th className="p-3 text-red-600">Sal</th><th className="p-3">Stock</th></tr></thead><tbody>{informe.detalle.length===0?<tr><td colSpan={7} className="p-4 text-center text-gray-400">Sin movimientos - {bodegaSel} en cero listo para escanear</td></tr>:informe.detalle.map((d,i)=>{ const ref=referencias.find(r=>r.id===d.ref); return <tr key={i} className="border-t"><td className="p-3 font-bold">{d.bodega}</td><td className="p-3 font-mono font-bold">{d.ref}</td><td className="p-3 text-[10px]">{ref?.tipo}</td><td className="p-3 text-center font-bold bg-gray-50">{d.espec}</td><td className="p-3 text-center text-green-600">{d.entradas}</td><td className="p-3 text-center text-red-600">{d.salidas}</td><td className="p-3 text-center font-black">{d.stock}</td></tr>})}</tbody></table>}</div>
        <div className="border-t"><button onClick={()=>setOpenBodega(!openBodega)} className="w-full flex justify-between p-4 bg-gray-100 font-bold text-sm"><span>📦 POR BODEGA - FULL ANCHO</span><span>{openBodega?'▲':'▼'}</span></button>{openBodega && <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-[11px]"><th className="p-3 text-left">Bodega</th><th className="p-3">Stock</th><th className="p-3 text-green-600">Ent</th><th className="p-3 text-red-600">Sal</th></tr></thead><tbody>{informe.porBodega.map(b=><tr key={b.nombre} className="border-t"><td className="p-3 font-bold">{b.nombre}</td><td className="p-3 text-center font-black">{b.stock}</td><td className="p-3 text-center text-green-600 font-bold">{b.entradas}</td><td className="p-3 text-center text-red-600 font-bold">{b.salidas}</td></tr>)}</tbody></table>}</div>
        <div className="border-t"><button onClick={()=>setOpenPistola(!openPistola)} className="w-full flex justify-between p-4 bg-gray-100 font-bold text-sm"><span>🔫 POR PISTOLA INDIVIDUAL - FULL ANCHO</span><span>{openPistola?'▲':'▼'}</span></button>{openPistola && <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-[11px]"><th className="p-3 text-left">ID Pistola</th><th className="p-3">Bodega</th><th className="p-3 text-green-600">Ent</th><th className="p-3 text-red-600">Sal</th><th className="p-3 text-yellow-600">Dev</th></tr></thead><tbody>{informe.porPistola.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono font-black">{p.id}</td><td className="p-3 text-xs">{p.bodega}</td><td className="p-3 text-center text-green-600 font-bold">{p.entradas}</td><td className="p-3 text-center text-red-600 font-bold">{p.salidas}</td><td className="p-3 text-center text-yellow-600 font-bold">{p.devoluciones}</td></tr>)}</tbody></table>}</div>
      </div>
    </div>
  )
}