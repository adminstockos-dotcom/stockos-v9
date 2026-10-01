import { useState } from 'react'

const DESPACHOS = [
  { id: 1, numero: 'DES-2026-001', cliente: 'Comercial Andina S.A.', estado: 'En ruta', fecha: '2026-09-28', productos: 12, total: 1250000, conductor: 'Pedro Gonzalez' },
  { id: 2, numero: 'DES-2026-002', cliente: 'Distribuidora El Roble', estado: 'Entregado', fecha: '2026-09-27', productos: 8, total: 890000, conductor: 'Juan Perez' },
  { id: 3, numero: 'DES-2026-003', cliente: 'Logistica Sur Ltda.', estado: 'Preparando', fecha: '2026-09-28', productos: 15, total: 2100000, conductor: '—' },
  { id: 4, numero: 'DES-2026-004', cliente: 'Tecnologia Aplicada', estado: 'En ruta', fecha: '2026-09-28', productos: 6, total: 567000, conductor: 'Maria Lopez' },
  { id: 5, numero: 'DES-2026-005', cliente: 'Ferreteria Central', estado: 'Entregado', fecha: '2026-09-26', productos: 20, total: 3450000, conductor: 'Carlos Ruiz' },
  { id: 6, numero: 'DES-2026-006', cliente: 'Constructora Norte', estado: 'Preparando', fecha: '2026-09-28', productos: 25, total: 5670000, conductor: '—' },
]

const CRM = [
  { id: 1, cliente: 'Comercial Andina S.A.', ultimoContacto: '2026-09-28', estado: 'Activo', valor: 12500000, probabilidad: '85%' },
  { id: 2, cliente: 'Distribuidora El Roble', ultimoContacto: '2026-09-27', estado: 'Activo', valor: 8900000, probabilidad: '70%' },
  { id: 3, cliente: 'Importadora Pacifico', ultimoContacto: '2026-09-20', estado: 'Inactivo', valor: 0, probabilidad: '15%' },
  { id: 4, cliente: 'Logistica Sur Ltda.', ultimoContacto: '2026-09-28', estado: 'Activo', valor: 15600000, probabilidad: '90%' },
  { id: 5, cliente: 'Alimentos del Valle', ultimoContacto: '2026-09-15', estado: 'Potencial', valor: 4500000, probabilidad: '45%' },
]

const PAGOS = [
  { id: 1, numero: 'PAY-2026-001', cliente: 'Comercial Andina S.A.', monto: 1250000, estado: 'Pagado', fecha: '2026-09-28', metodo: 'Transferencia' },
  { id: 2, numero: 'PAY-2026-002', cliente: 'Distribuidora El Roble', monto: 890000, estado: 'Pagado', fecha: '2026-09-27', metodo: 'Tarjeta' },
  { id: 3, numero: 'PAY-2026-003', cliente: 'Logistica Sur Ltda.', monto: 2100000, estado: 'Pendiente', fecha: '2026-09-28', metodo: 'Transferencia' },
  { id: 4, numero: 'PAY-2026-004', cliente: 'Tecnologia Aplicada', monto: 567000, estado: 'Pagado', fecha: '2026-09-28', metodo: 'Tarjeta' },
  { id: 5, numero: 'PAY-2026-005', cliente: 'Ferreteria Central', monto: 3450000, estado: 'Pagado', fecha: '2026-09-26', metodo: 'Transferencia' },
  { id: 6, numero: 'PAY-2026-006', cliente: 'Constructora Norte', monto: 5670000, estado: 'Pendiente', fecha: '2026-09-28', metodo: 'Cheque' },
]

export default function TabDespachos({ empresa }) {
  const [view, setView] = useState('despachos')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Despachos + CRM + Pagos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresa ? `Gestión de despachos, CRM y pagos de ${empresa.nombre}` : 'Gestión de despachos, relaciones con clientes y pagos'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('despachos')} className={view === 'despachos' ? 'btn-primary' : 'btn-secondary'}>Despachos</button>
          <button onClick={() => setView('crm')} className={view === 'crm' ? 'btn-primary' : 'btn-secondary'}>CRM</button>
          <button onClick={() => setView('pagos')} className={view === 'pagos' ? 'btn-primary' : 'btn-secondary'}>Pagos</button>
        </div>
      </div>

      {view === 'despachos' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">En Ruta</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{DESPACHOS.filter(d => d.estado === 'En ruta').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Preparando</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{DESPACHOS.filter(d => d.estado === 'Preparando').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Entregados</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{DESPACHOS.filter(d => d.estado === 'Entregado').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Despachos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{DESPACHOS.length}</p>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Número</th>
                    <th className="th">Cliente</th>
                    <th className="th">Estado</th>
                    <th className="th">Productos</th>
                    <th className="th">Total</th>
                    <th className="th">Conductor</th>
                    <th className="th">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DESPACHOS.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="td font-mono text-xs font-medium">{d.numero}</td>
                      <td className="td font-medium text-gray-900">{d.cliente}</td>
                      <td className="td">
                        <span className={d.estado === 'Entregado' ? 'badge-green' : d.estado === 'En ruta' ? 'badge-blue' : 'badge-yellow'}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="td">{d.productos}</td>
                      <td className="td font-medium">${d.total.toLocaleString('es-CL')}</td>
                      <td className="td text-gray-500">{d.conductor}</td>
                      <td className="td text-gray-500 text-xs">{d.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'crm' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Clientes Activos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{CRM.filter(c => c.estado === 'Activo').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Valor Pipeline</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">${CRM.reduce((a, c) => a + c.valor, 0).toLocaleString('es-CL')}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Potenciales</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{CRM.filter(c => c.estado === 'Potencial').length}</p>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Cliente</th>
                    <th className="th">Estado</th>
                    <th className="th">Último Contacto</th>
                    <th className="th">Valor</th>
                    <th className="th">Probabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CRM.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="td font-medium text-gray-900">{c.cliente}</td>
                      <td className="td">
                        <span className={c.estado === 'Activo' ? 'badge-green' : c.estado === 'Potencial' ? 'badge-yellow' : 'badge-gray'}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="td text-gray-500 text-xs">{c.ultimoContacto}</td>
                      <td className="td font-medium">${c.valor.toLocaleString('es-CL')}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: c.probabilidad }} />
                          </div>
                          <span className="text-xs text-gray-500">{c.probabilidad}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'pagos' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Pagados</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{PAGOS.filter(p => p.estado === 'Pagado').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{PAGOS.filter(p => p.estado === 'Pendiente').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Recaudado</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">${PAGOS.filter(p => p.estado === 'Pagado').reduce((a, p) => a + p.monto, 0).toLocaleString('es-CL')}</p>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Número</th>
                    <th className="th">Cliente</th>
                    <th className="th">Monto</th>
                    <th className="th">Estado</th>
                    <th className="th">Método</th>
                    <th className="th">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PAGOS.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="td font-mono text-xs font-medium">{p.numero}</td>
                      <td className="td font-medium text-gray-900">{p.cliente}</td>
                      <td className="td font-medium">${p.monto.toLocaleString('es-CL')}</td>
                      <td className="td">
                        <span className={p.estado === 'Pagado' ? 'badge-green' : 'badge-yellow'}>{p.estado}</span>
                      </td>
                      <td className="td"><span className="badge-blue">{p.metodo}</span></td>
                      <td className="td text-gray-500 text-xs">{p.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
