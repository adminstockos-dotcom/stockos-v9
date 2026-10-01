import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import InfraTable from '../components/InfraTable.jsx'
import CrearEmpresa from '../components/CrearEmpresa.jsx'
import EmpresasTable from '../components/EmpresasTable.jsx'
import { useEmpresas } from '../hooks/useEmpresas.js'

export default function SuperAdmin({ user, onLogout }) {
  const navigate = useNavigate()
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas()
  const [showForm, setShowForm] = useState(false)

  const handleCrear = (data) => {
    addEmpresa({ ...data, estado: 'En espera', logo: data.logo || null })
    setShowForm(false)
  }

  const handleVerPanel = (id) => {
    navigate(`/empresa/${id}/panel`)
  }

  const handleAprobar = (id) => {
    updateEmpresa(id, { estado: 'Aprobada' })
  }

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar esta empresa?')) {
      deleteEmpresa(id)
    }
  }

  const handleEstadoChange = (id, estado) => {
    updateEmpresa(id, { estado })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={onLogout} />

      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* ARRIBA: Tabla Infra Sistema */}
        <section>
          <InfraTable />
        </section>

        {/* ABAJO: Crear Empresa */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Crear Empresa</h2>
              <p className="text-sm text-gray-500 mt-0.5">Registra una nueva empresa en el sistema</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Empresa
            </button>
          </div>

          {showForm && <CrearEmpresa onSubmit={handleCrear} onCancel={() => setShowForm(false)} />}
        </section>

        {/* Lista de Empresas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Empresas Registradas</h2>
              <p className="text-sm text-gray-500 mt-0.5">{empresas.length} empresas en el sistema</p>
            </div>
          </div>

          <EmpresasTable
            empresas={empresas}
            onVerPanel={handleVerPanel}
            onAprobar={handleAprobar}
            onDelete={handleDelete}
            onEstadoChange={handleEstadoChange}
          />
        </section>
      </main>
    </div>
  )
}
