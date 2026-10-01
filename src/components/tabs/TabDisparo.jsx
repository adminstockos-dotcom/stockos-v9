import { useState } from 'react'

const DISPAROS = [
  { id: 1, nombre: 'Alerta Stock Bajo — Bodega Central', tipo: 'Automatico', estado: 'Activo', destinatarios: 5, enviados: 1247, fecha: '2026-09-28' },
  { id: 2, nombre: 'Notificación Despacho Completado', tipo: 'Automatico', estado: 'Activo', destinatarios: 12, enviados: 3456, fecha: '2026-09-28' },
  { id: 3, nombre: 'Alerta Producto Agotado', tipo: 'Automatico', estado: 'Activo', destinatarios: 3, enviados: 89, fecha: '2026-09-27' },
  { id: 4, nombre: 'Resumen Diario de Ventas', tipo: 'Programado', estado: 'Activo', destinatarios: 8, enviados: 234, fecha: '2026-09-28' },
  { id: 5, nombre: 'Alerta Stock Bajo — Sucursal Norte', tipo: 'Automatico', estado: 'Pausado', destinatarios: 2, enviados: 456, fecha: '2026-09-20' },
]

const LINKS = [
  { id: 1, nombre: 'Panel de Control', url: '/panel', accesos: 12450, estado: 'Activo', creado: '2026-01-15' },
  { id: 2, nombre: 'Catalogo Publico', url: '/catalogo', accesos: 8930, estado: 'Activo', creado: '2026-01-15' },
  { id: 3, nombre: 'Rastreo de Despacho', url: '/tracking', accesos: 5670, estado: 'Activo', creado: '2026-02-01' },
  { id: 4, nombre: 'Portal de Pagos', url: '/pagos', accesos: 3210, estado: 'Activo', creado: '2026-02-15' },
  { id: 5, nombre: 'Reportes Ejecutivos', url: '/reportes', accesos: 890, estado: 'Activo', creado: '2026-03-01' },
  { id: 6, nombre: 'API Documentacion', url: '/api-docs', accesos: 456, estado: 'Activo', creado: '2026-03-15' },
]

export default function TabDisparo({ empresa }) {
  const [view, setView] = useState('disparos')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Disparo + Link</h2>
          <p className="text-sm text-gray-500 mt-1">
            {empresa ? `Notificaciones y enlaces de ${empresa.nombre}` : 'Notificaciones automáticas y gestión de enlaces'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('disparos')}
            className={view === 'disparos' ? 'btn-primary' : 'btn-secondary'}
          >
            Disparos
          </button>
          <button
            onClick={() => setView('links')}
            className={view === 'links' ? 'btn-primary' : 'btn-secondary'}
          >
            Links
          </button>
        </div>
      </div>

      {view === 'disparos' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Disparos Activos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{DISPAROS.filter(d => d.estado === 'Activo').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Enviados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{DISPAROS.reduce((a, d) => a + d.enviados, 0).toLocaleString()}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Destinatarios</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{DISPAROS.reduce((a, d) => a + d.destinatarios, 0)}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Tasa de Éxito</p>
              <p className="text-2xl font-bold text-green-600 mt-1">99.2%</p>
            </div>
          </div>

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Disparo</th>
                    <th className="th">Tipo</th>
                    <th className="th">Estado</th>
                    <th className="th">Destinatarios</th>
                    <th className="th">Enviados</th>
                    <th className="th">Fecha</th>
                    <th className="th text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DISPAROS.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="td font-medium text-gray-900">{d.nombre}</td>
                      <td className="td"><span className="badge-blue">{d.tipo}</span></td>
                      <td className="td">
                        <span className={d.estado === 'Activo' ? 'badge-green' : 'badge-yellow'}>{d.estado}</span>
                      </td>
                      <td className="td">{d.destinatarios}</td>
                      <td className="td">{d.enviados.toLocaleString()}</td>
                      <td className="td text-gray-500 text-xs">{d.fecha}</td>
                      <td className="td text-center">
                        <button className="text-brand-600 hover:text-brand-700 text-xs font-medium">Configurar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Links Activos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{LINKS.filter(l => l.estado === 'Activo').length}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Accesos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{LINKS.reduce((a, l) => a + l.accesos, 0).toLocaleString()}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Links Creados</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{LINKS.length}</p>
            </div>
          </div>

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th">Nombre</th>
                    <th className="th">URL</th>
                    <th className="th">Estado</th>
                    <th className="th">Accesos</th>
                    <th className="th">Creado</th>
                    <th className="th text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {LINKS.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition">
                      <td className="td font-medium text-gray-900">{l.nombre}</td>
                      <td className="td">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{l.url}</code>
                      </td>
                      <td className="td">
                        <span className={l.estado === 'Activo' ? 'badge-green' : 'badge-gray'}>{l.estado}</span>
                      </td>
                      <td className="td">{l.accesos.toLocaleString()}</td>
                      <td className="td text-gray-500 text-xs">{l.creado}</td>
                      <td className="td text-center">
                        <button className="text-brand-600 hover:text-brand-700 text-xs font-medium">Editar</button>
                      </td>
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
