import React, { useState, useEffect } from 'react';
const safeParse = (k, fb) => { try { const v = localStorage.getItem(k); return v? JSON.parse(v) : fb; } catch { return fb; } };
export default function EscanerDiarioP123() {
  const [proveedores, setProveedores] = useState(() => safeParse('stockos_proveedores_p_vc512', []));
  const [productos, setProductos] = useState(() => safeParse('stockos_detector_abc_vc512', [
    {id:'1', nombre:'Cargador iPhone 20W', proveedor:'P1', ventas:25, stock:3, rotacion:'A'},
    {id:'2', nombre:'Audífonos Bluetooth X10', proveedor:'P1', ventas:12, stock:8, rotacion:'B'},
    {id:'3', nombre:'Forro Silicona Universal', proveedor:'P2', ventas:2, stock:40, rotacion:'C'},
  ]));
  const [ordenes, setOrdenes] = useState(() => safeParse('stockos_ordenes_p_vc512', []));
  const [sedes, setSedes] = useState(() => safeParse('sedes_vc512', safeParse('stockos_sedes_fisicas_vc512', [])));
  const [llegadas, setLlegadas] = useState(() => safeParse('llegadas_vc512', safeParse('stockos_llegadas_bodega_vc512', [])));
  const [open, setOpen] = useState({prov:true, det:false, ord:false, alert:false, bodega:false, cat:false});
  const [modalProv, setModalProv] = useState(false);
  const [modalSede, setModalSede] = useState(false);
  const [modalOrden, setModalOrden] = useState(false);
  const [modalLlegada, setModalLlegada] = useState(false);
  const [formProv, setFormProv] = useState({nombre:'', p:'P1', whatsapp:'', tipo:'Web URL', url:''});
  const [formSede, setFormSede] = useState({nombre:'', direccion:'', cargo:'', encargado:'', whatsapp:''});
  const [formOrden, setFormOrden] = useState({proveedor:'P1', producto:'', cantidad:1, sede:''});
  const [formLlegada, setFormLlegada] = useState({sku:'', orden:'', sede:'', estado:'Esperado'});
  const [ventas, setVentas] = useState(() => safeParse('ventas_vc512', null));
  const [catalogo, setCatalogo] = useState(() => safeParse('stockos_catalogo_virtual_vc512', { productos: [] }));
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [formCatalogo, setFormCatalogo] = useState({producto:'', costo:'', precio:''});
  const cargos = safeParse('stockos_cargos_vc512', []);
  const usuarios = safeParse('stockos_users_vc512', [{nombre:'Iván Cadena'}]);
  useEffect(()=>localStorage.setItem('stockos_proveedores_p_vc512', JSON.stringify(proveedores)),[proveedores]);
  useEffect(()=>localStorage.setItem('stockos_sedes_fisicas_vc512', JSON.stringify(sedes)),[sedes]);
  const toggle = (k) => setOpen(prev => ({...prev, [k]:!prev[k]}));
  const addProv = () => {
    if(!formProv.nombre) return alert('Nombre requerido');
    setProveedores([...proveedores, {id:Date.now().toString(),...formProv, ultimoEscaneo:new Date().toLocaleString()}]);
    setModalProv(false); setFormProv({nombre:'', p:'P'+(proveedores.length+2), whatsapp:'', tipo:'Web URL', url:''});
  };
  const addSede = () => {
    if(!formSede.nombre) return alert('Nombre sede requerido');
    setSedes([...sedes, {id:Date.now().toString(),...formSede}]);
    setModalSede(false); setFormSede({nombre:'', direccion:'', cargo:'', encargado:'', whatsapp:''});
  };

  const reclasificar = () => {
    const ventasReales = safeParse('ventas_vc512', null);
    if (ventasReales && Array.isArray(ventasReales)) {
      setProductos(prev => prev.map(p => {
        const v = ventasReales.find(v => v.id === p.id);
        const ventas = v ? v.ventas : p.ventas;
        return {...p, ventas, rotacion: ventas > 15 ? 'A' : ventas >= 5 ? 'B' : 'C'};
      }));
    } else {
      setProductos(prev => prev.map(p => ({...p, rotacion: p.ventas > 15 ? 'A' : p.ventas >= 5 ? 'B' : 'C'})));
    }
    alert('Reclasificación completada');
  };

  const addOrden = () => {
    if(!formOrden.proveedor || !formOrden.producto) return alert('Proveedor y producto requeridos');
    const nueva = {id:`VC512-${formOrden.proveedor}-${String(ordenes.length+1).padStart(3,'0')}`, fecha:new Date().toISOString().split('T')[0], ...formOrden, estado:'Borrador'};
    setOrdenes([...ordenes, nueva]);
    setModalOrden(false);
    setFormOrden({proveedor:'P1', producto:'', cantidad:1, sede:''});
  };

  const enviarAlertaWA = () => {
    if (sedes.length === 0) { alert('Crea una Sede en Módulo 5 primero'); return; }
    const bajos = productos.filter(p => p.stock < 5);
    if (bajos.length === 0) { alert('No hay productos con stock bajo'); return; }
    const lista = bajos.map(p => `• ${p.nombre} (${p.rotacion}) - Stock: ${p.stock}`).join('\n');
    const msg = `🚨 STOCK BAJO BODEGA PROPIA vc512:\n${lista}\n\nProveedor: ${bajos[0].proveedor}\nOrdenar YA`;
    const wa = sedes[0].whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/56${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const addLlegada = () => {
    if(!formLlegada.sku || !formLlegada.orden) return alert('SKU y Orden requeridos');
    setLlegadas([...llegadas, {id:Date.now().toString(), fecha:new Date().toISOString().split('T')[0], ...formLlegada}]);
    setModalLlegada(false);
    setFormLlegada({sku:'', orden:'', sede:'', estado:'Esperado'});
  };

  const addCatalogo = () => {
    if(!formCatalogo.producto || !formCatalogo.costo || !formCatalogo.precio) return alert('Todos los campos requeridos');
    const costo = parseFloat(formCatalogo.costo);
    const precio = parseFloat(formCatalogo.precio);
    const margen = ((precio - costo) / costo * 100).toFixed(1);
    setCatalogo(prev => ({...prev, productos: [...prev.productos, {id:Date.now().toString(), ...formCatalogo, costo, precio, margen, fecha:new Date().toISOString()}]}));
    setModalCatalogo(false);
    setFormCatalogo({producto:'', costo:'', precio:''});
    alert(`Producto añadido al catálogo. Margen: ${margen}%`);
  };
  const Card = ({id, title, subtitle, children}) => (
    <div className="border rounded-lg bg-white shadow-sm mb-4">
      <div className="p-4 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div onClick={()=>toggle(id)} className="cursor-pointer flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>toggle(id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">{open[id]? '▲ Cerrar' : '▼ Ver'}</button>
        </div>
      </div>
      {open[id] && <div className="p-4 border-t">{children}</div>}
    </div>
  );
  return (
    <div className="p-2 md:p-4 space-y-4">
      <h2 className="text-lg md:text-xl font-bold mb-1">📊 Escáner Diario + Compras P1/P2/P3</h2>
      <p className="text-xs text-gray-500 mb-4">P=Proveedor (P1,P2,P3...) | A/B/C=Rotación Producto | Click en ▼ Ver para expandir</p>
      <Card id="prov" title="1. Enlaces por Proveedor + Escaneo 8:30AM / 2:30PM" subtitle="P1,P2,P3 son proveedores - gestión infinita - escaneo automático">
        <div className="flex justify-between mb-3">
          <span className="text-xs bg-green-100 px-2 py-1 rounded">⏰ Auto 8:30AM / 2:30PM Activo - Próximo: Hoy 2:30PM</span>
          <button onClick={()=>setModalProv(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">+ Nuevo Proveedor P</button>
        </div>
        <table className="w-full text-xs border">
          <thead><tr className="bg-gray-100"><th className="p-2 border">P</th><th className="p-2 border">Nombre Proveedor</th><th className="p-2 border">WhatsApp</th><th className="p-2 border">Tipo Enlace</th><th className="p-2 border">URL</th><th className="p-2 border">Acción</th></tr></thead>
          <tbody>{proveedores.map(p=><tr key={p.id}><td className="p-2 border font-bold text-blue-600">{p.p}</td><td className="p-2 border">{p.nombre}</td><td className="p-2 border">{p.whatsapp}</td><td className="p-2 border">{p.tipo}</td><td className="p-2 border"><a href={p.url} target="_blank" className="text-blue-500 underline">{p.url?.slice(0,30)}</a></td><td className="p-2 border"><button onClick={()=>setProveedores(proveedores.filter(x=>x.id!==p.id))} className="text-red-500">Borrar</button></td></tr>)}{proveedores.length===0 && <tr><td colSpan={6} className="text-center p-4 text-gray-400">Sin proveedores - Crea tu P1 (Proveedor 1)</td></tr>}</tbody>
        </table>
      </Card>
      <Card id="det" title="2. Detector A/B/C + Ranking por Rotación" subtitle="CORREGIDO: A=Alta rotación >15, B=Media 5-15, C=Baja <5 - Productos">
        <div className="flex gap-2 mb-3"><span className="bg-green-100 px-2 py-1 rounded text-xs">{productos.filter(p=>p.rotacion==='A').length} A Alta</span><span className="bg-yellow-100 px-2 py-1 rounded text-xs">{productos.filter(p=>p.rotacion==='B').length} B Media</span><span className="bg-red-100 px-2 py-1 rounded text-xs">{productos.filter(p=>p.rotacion==='C').length} C Baja</span><button onClick={reclasificar} className="ml-auto bg-green-600 text-white px-2 py-1 rounded text-xs">🔍 Escanear y Reclasificar A/B/C Ahora</button></div>
        <table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 border">Producto</th><th className="p-2 border">Proveedor P</th><th className="p-2 border">Ventas 30d</th><th className="p-2 border">Stock</th><th className="p-2 border">A/B/C</th><th className="p-2 border">Ranking</th></tr></thead>
        <tbody>{productos.map(pr=><tr key={pr.id}><td className="p-2 border">{pr.nombre}</td><td className="p-2 border font-bold text-blue-600">{pr.proveedor}</td><td className="p-2 border">{pr.ventas}</td><td className={`p-2 border ${pr.stock<5?'text-red-600 font-bold':''}`}>{pr.stock}</td><td className="p-2 border"><span className={`px-2 py-1 rounded text-xs ${pr.rotacion==='A'?'bg-green-100 text-green-700':pr.rotacion==='B'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{pr.rotacion}</span></td><td className="p-2 border">#{pr.id}</td></tr>)}</tbody></table>
      </Card>
      <Card id="ord" title="3. Órdenes P1/P2/P3" subtitle="Órdenes por proveedor P1, P2, P3 - con productos A/B/C">
        <button onClick={()=>setModalOrden(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm mb-3">+ Nueva Orden a Proveedor P</button>
        <table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 border">ID Orden</th><th className="p-2 border">Proveedor</th><th className="p-2 border">Productos A/B/C</th><th className="p-2 border">Estado</th></tr></thead><tbody><tr><td colSpan={4} className="text-center p-4 text-gray-400">Sin órdenes - Crea orden a P1 con productos A</td></tr></tbody></table>
      </Card>
      <Card id="alert" title="4. Alerta stock bajo <5 WA - Bodega Física Propia" subtitle="Notificación WhatsApp para bodega propia cuando stock <5">
        <button onClick={enviarAlertaWA} className="bg-green-600 text-white px-3 py-1 rounded text-sm mb-3">📲 Enviar Alerta WA Masiva a Bodega</button>
        <table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 border">Producto</th><th className="p-2 border">A/B/C</th><th className="p-2 border">Stock</th><th className="p-2 border">Sede</th><th className="p-2 border">Proveedor P</th></tr></thead>
        <tbody>{productos.filter(p=>p.stock<5).map(pr=><tr key={pr.id} className="bg-red-50"><td className="p-2 border">{pr.nombre}</td><td className="p-2 border">{pr.rotacion}</td><td className="p-2 border font-bold text-red-600">{pr.stock}</td><td className="p-2 border">Bodega Principal</td><td className="p-2 border">{pr.proveedor}</td></tr>)}</tbody></table>
      </Card>
      <Card id="bodega" title="5. Control llegada bodega - Bodega Física Propia Multi-Sede" subtitle="Crear sedes y enlazar con cargos y encargados de M1 para notificaciones">
        <div className="flex gap-2 mb-3">
          <button onClick={()=>setModalSede(true)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">+ Nueva Sede / Bodega</button>
          <button onClick={()=>setModalLlegada(true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">+ Registrar Llegada de P</button>
        </div>
        <p className="text-xs font-bold">Sedes Físicas Propias (enlazadas a M1):</p>
        <table className="w-full text-xs border mb-3"><thead><tr className="bg-gray-100"><th className="p-2 border">Sede</th><th className="p-2 border">Dirección</th><th className="p-2 border">Cargo M1</th><th className="p-2 border">Encargado M1</th><th className="p-2 border">WhatsApp</th><th className="p-2 border">Acción</th></tr></thead>
        <tbody>{sedes.map(s=><tr key={s.id}><td className="p-2 border">{s.nombre}</td><td className="p-2 border">{s.direccion}</td><td className="p-2 border">{s.cargo}</td><td className="p-2 border">{s.encargado}</td><td className="p-2 border">{s.whatsapp}</td><td className="p-2 border"><button onClick={()=>setSedes(sedes.filter(x=>x.id!==s.id))} className="text-red-500">Borrar</button></td></tr>)}{sedes.length===0 && <tr><td colSpan={6} className="text-center p-2 text-gray-400">Sin sedes - Crea Bodega Principal Cali enlazada a cargo y encargado</td></tr>}</tbody></table>
        <p className="text-xs font-bold">Llegadas de Proveedores P a Sedes:</p>
        <table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 border">Fecha</th><th className="p-2 border">Orden P</th><th className="p-2 border">Sede Destino</th><th className="p-2 border">Estado</th></tr></thead><tbody><tr><td colSpan={4} className="text-center p-2 text-gray-400">Sin llegadas</td></tr></tbody></table>
      </Card>
      <Card id="cat" title="6. Alimenta catálogo virtual - Catálogo Cliente vc512" subtitle="Catálogo oficial de la empresa - link para copiar y ver">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded border">
          <p className="font-bold text-sm">Catálogo Oficial Virtualclass512</p>
          <div className="flex gap-2 mt-2">
            <input value="https://vc512.stockos/inv" readOnly className="border px-2 py-1 rounded text-sm w-64" />
            <button onClick={()=>{navigator.clipboard.writeText('https://vc512.stockos/inv'); alert('Link copiado!');}} className="bg-gray-800 text-white px-3 py-1 rounded text-xs">Copiar</button>
            <button onClick={()=>window.open('https://vc512.stockos/inv','_blank')} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Abrir</button>
          </div>
          <button onClick={()=>window.open('/inv/vc512','_blank')} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm">🔗 Ver Catálogo Virtual</button>
          <p className="text-xs text-gray-600 mt-2">Última: {new Date().toLocaleString()} - {catalogo.productos?.length || 0} productos</p>
          <button onClick={()=>setModalCatalogo(true)} className="mt-2 bg-purple-600 text-white px-3 py-1 rounded text-xs">+ Añadir a Catálogo vc512</button>
          {catalogo.productos && catalogo.productos.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 border">Producto</th><th className="p-2 border">Costo</th><th className="p-2 border">Precio</th><th className="p-2 border">Margen</th></tr></thead>
                <tbody>{catalogo.productos.map(p=><tr key={p.id}><td className="p-2 border">{p.producto}</td><td className="p-2 border">${p.costo}</td><td className="p-2 border">${p.precio}</td><td className="p-2 border text-green-600 font-bold">{p.margen}%</td></tr>)}</tbody></table>
            </div>
          )}
        </div>
      </Card>

      {modalProv && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded w-96 space-y-3"><h3 className="font-bold">+ Nuevo Proveedor P</h3><input placeholder="Nombre proveedor* Ej: China Import" value={formProv.nombre} onChange={e=>setFormProv({...formProv, nombre:e.target.value})} className="border w-full p-2 rounded text-sm" /><div className="flex gap-2"><select value={formProv.p} onChange={e=>setFormProv({...formProv, p:e.target.value})} className="border p-2 rounded text-sm"><option>P1</option><option>P2</option><option>P3</option><option>P4</option><option>P5</option><option>P6</option><option>P7</option><option>P8</option><option>P9</option><option>P10</option></select><input placeholder="WhatsApp*" value={formProv.whatsapp} onChange={e=>setFormProv({...formProv, whatsapp:e.target.value})} className="border flex-1 p-2 rounded text-sm" /></div><select value={formProv.tipo} onChange={e=>setFormProv({...formProv, tipo:e.target.value})} className="border w-full p-2 rounded text-sm"><option>Web URL</option><option>Google Drive</option><option>Excel Online</option><option>API JSON</option><option>WhatsApp Catalog</option><option>Instagram Shop</option><option>Otro</option></select><input placeholder="URL*" value={formProv.url} onChange={e=>setFormProv({...formProv, url:e.target.value})} className="border w-full p-2 rounded text-sm" /><div className="flex gap-2"><button onClick={addProv} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">Crear {formProv.p}</button><button onClick={()=>setModalProv(false)} className="bg-gray-200 px-4 py-2 rounded flex-1">Cancelar</button></div></div></div>}

      {modalSede && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded w-96 space-y-3"><h3 className="font-bold">+ Nueva Sede Física Propia</h3><input placeholder="Nombre sede* Ej: Bodega Principal Cali" value={formSede.nombre} onChange={e=>setFormSede({...formSede, nombre:e.target.value})} className="border w-full p-2 rounded text-sm" /><input placeholder="Dirección" value={formSede.direccion} onChange={e=>setFormSede({...formSede, direccion:e.target.value})} className="border w-full p-2 rounded text-sm" /><select value={formSede.cargo} onChange={e=>setFormSede({...formSede, cargo:e.target.value})} className="border w-full p-2 rounded text-sm"><option value="">Cargo M1 (de Personas)</option>{cargos.map((c,i)=><option key={i} value={c.nombre||c}>{c.nombre||c}</option>)}</select><select value={formSede.encargado} onChange={e=>setFormSede({...formSede, encargado:e.target.value})} className="border w-full p-2 rounded text-sm"><option value="">Encargado M1 (usuario)</option>{usuarios.map((u,i)=><option key={i} value={u.nombre}>{u.nombre}</option>)}</select><input placeholder="WhatsApp encargado" value={formSede.whatsapp} onChange={e=>setFormSede({...formSede, whatsapp:e.target.value})} className="border w-full p-2 rounded text-sm" /><div className="flex gap-2"><button onClick={addSede} className="bg-purple-600 text-white px-4 py-2 rounded flex-1">Crear Sede</button><button onClick={()=>setModalSede(false)} className="bg-gray-200 px-4 py-2 rounded flex-1">Cancelar</button></div></div></div>}

      {modalOrden && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded w-96 space-y-3"><h3 className="font-bold">+ Nueva Orden a Proveedor P</h3><select value={formOrden.proveedor} onChange={e=>setFormOrden({...formOrden, proveedor:e.target.value})} className="border w-full p-2 rounded text-sm"><option value="">Seleccione proveedor</option>{proveedores.map(p=><option key={p.id} value={p.p}>{p.p} - {p.nombre}</option>)}</select><input placeholder="Producto*" value={formOrden.producto} onChange={e=>setFormOrden({...formOrden, producto:e.target.value})} className="border w-full p-2 rounded text-sm" /><input type="number" placeholder="Cantidad" value={formOrden.cantidad} onChange={e=>setFormOrden({...formOrden, cantidad:parseInt(e.target.value)||1})} className="border w-full p-2 rounded text-sm" /><select value={formOrden.sede} onChange={e=>setFormOrden({...formOrden, sede:e.target.value})} className="border w-full p-2 rounded text-sm"><option value="">Sede destino</option>{sedes.map(s=><option key={s.id} value={s.nombre}>{s.nombre}</option>)}</select><div className="flex gap-2"><button onClick={addOrden} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">Crear Orden</button><button onClick={()=>setModalOrden(false)} className="bg-gray-200 px-4 py-2 rounded flex-1">Cancelar</button></div></div></div>}

      {modalLlegada && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded w-96 space-y-3"><h3 className="font-bold">+ Registrar Llegada de P</h3><input placeholder="SKU / Código barras (lector pistola)" value={formLlegada.sku} onChange={e=>setFormLlegada({...formLlegada, sku:e.target.value})} className="border w-full p-2 rounded text-sm" /><input placeholder="Orden P (ej: VC512-P1-001)" value={formLlegada.orden} onChange={e=>setFormLlegada({...formLlegada, orden:e.target.value})} className="border w-full p-2 rounded text-sm" /><select value={formLlegada.sede} onChange={e=>setFormLlegada({...formLlegada, sede:e.target.value})} className="border w-full p-2 rounded text-sm"><option value="">Sede destino</option>{sedes.map(s=><option key={s.id} value={s.nombre}>{s.nombre}</option>)}</select><select value={formLlegada.estado} onChange={e=>setFormLlegada({...formLlegada, estado:e.target.value})} className="border w-full p-2 rounded text-sm"><option>Esperado</option><option>Llegó parcial</option><option>Llegó completo</option><option>Con novedad</option></select><div className="flex gap-2"><button onClick={addLlegada} className="bg-green-600 text-white px-4 py-2 rounded flex-1">Registrar</button><button onClick={()=>setModalLlegada(false)} className="bg-gray-200 px-4 py-2 rounded flex-1">Cancelar</button></div></div></div>}

      {modalCatalogo && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded w-96 space-y-3"><h3 className="font-bold">Añadir a Catálogo vc512</h3><input placeholder="Nombre producto*" value={formCatalogo.producto} onChange={e=>setFormCatalogo({...formCatalogo, producto:e.target.value})} className="border w-full p-2 rounded text-sm" /><input type="number" placeholder="Costo P1*" value={formCatalogo.costo} onChange={e=>setFormCatalogo({...formCatalogo, costo:e.target.value})} className="border w-full p-2 rounded text-sm" /><input type="number" placeholder="Precio Venta vc512*" value={formCatalogo.precio} onChange={e=>setFormCatalogo({...formCatalogo, precio:e.target.value})} className="border w-full p-2 rounded text-sm" /><p className="text-xs text-gray-500">Margen se calcula automáticamente</p><div className="flex gap-2"><button onClick={addCatalogo} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">Añadir al Catálogo</button><button onClick={()=>setModalCatalogo(false)} className="bg-gray-200 px-4 py-2 rounded flex-1">Cancelar</button></div></div></div>}
    </div>
  );
}
